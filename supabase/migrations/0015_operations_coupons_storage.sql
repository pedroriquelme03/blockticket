-- =============================================================================
-- 0015 — Operações (cancelar pedido), cupons, storage de imagens, check-in
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Cancelamento de pedido: libera estoque e cancela tickets
-- -----------------------------------------------------------------------------
create or replace function public.cancel_order(p_order uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_order record;
  v_item  record;
begin
  select * into v_order from public.orders where id = p_order for update;
  if not found then
    raise exception 'Pedido inexistente';
  end if;

  if auth.uid() is not null and not public.is_tenant_member(v_order.tenant_id) then
    raise exception 'Sem permissão';
  end if;

  if v_order.status not in ('pending_payment', 'paid', 'partially_paid') then
    raise exception 'Pedido não cancelável (status: %)', v_order.status;
  end if;

  for v_item in select * from public.order_items where order_id = p_order
  loop
    if v_order.status = 'pending_payment' then
      update public.inventory
        set reserved = greatest(reserved - v_item.quantity, 0)
      where product_id = v_item.product_id
        and visit_date = v_item.visit_date
        and session_time is not distinct from v_item.session_time;
    else
      update public.inventory
        set sold = greatest(sold - v_item.quantity, 0)
      where product_id = v_item.product_id
        and visit_date = v_item.visit_date
        and session_time is not distinct from v_item.session_time;
    end if;
  end loop;

  update public.tickets
    set status = 'cancelled'
  where order_id = p_order and status = 'valid';

  update public.orders
    set status = case
      when v_order.status = 'pending_payment' then 'cancelled'::public.order_status
      else 'refunded'::public.order_status
    end,
    hold_expires_at = null
  where id = p_order;
end;
$$;

revoke all on function public.cancel_order(uuid) from public;
grant execute on function public.cancel_order(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Check-in de ingresso por código
-- -----------------------------------------------------------------------------
create or replace function public.check_in_ticket(p_tenant uuid, p_code text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ticket record;
begin
  if auth.uid() is not null and not public.is_tenant_member(p_tenant) then
    raise exception 'Sem permissão';
  end if;

  select t.*, o.customer_name, o.customer_email
    into v_ticket
  from public.tickets t
  join public.orders o on o.id = t.order_id
  where t.tenant_id = p_tenant
    and replace(lower(t.code), '-', '') = replace(lower(trim(p_code)), '-', '')
  for update of t;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_ticket.status = 'used' then
    return jsonb_build_object(
      'ok', false,
      'error', 'already_used',
      'ticket', jsonb_build_object(
        'code', v_ticket.code,
        'status', v_ticket.status,
        'visit_date', v_ticket.visit_date,
        'session_time', v_ticket.session_time,
        'customer_name', v_ticket.customer_name
      )
    );
  end if;

  if v_ticket.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'error', 'cancelled');
  end if;

  update public.tickets set status = 'used' where id = v_ticket.id;

  return jsonb_build_object(
    'ok', true,
    'ticket', jsonb_build_object(
      'code', v_ticket.code,
      'status', 'used',
      'visit_date', v_ticket.visit_date,
      'session_time', v_ticket.session_time,
      'customer_name', v_ticket.customer_name,
      'customer_email', v_ticket.customer_email,
      'order_id', v_ticket.order_id
    )
  );
end;
$$;

grant execute on function public.check_in_ticket(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Cupons de desconto
-- -----------------------------------------------------------------------------
create type public.coupon_type as enum ('percent', 'fixed');

create table public.coupons (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  code            citext not null,
  type            public.coupon_type not null default 'percent',
  value           integer not null check (value > 0), -- % ou centavos
  max_uses        integer check (max_uses is null or max_uses > 0),
  used_count      integer not null default 0 check (used_count >= 0),
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  valid_from      timestamptz,
  valid_to        timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, code)
);

create trigger trg_coupons_updated_at
  before update on public.coupons
  for each row execute function public.set_updated_at();

alter table public.orders
  add column if not exists coupon_id uuid references public.coupons(id) on delete set null,
  add column if not exists discount_cents integer not null default 0 check (discount_cents >= 0);

alter table public.coupons enable row level security;

create policy coupons_read on public.coupons
  for select using (
    public.is_tenant_member(tenant_id)
    or (is_active and (valid_from is null or valid_from <= now())
        and (valid_to is null or valid_to >= now()))
  );

create policy coupons_write on public.coupons
  for all
  using (public.has_tenant_role(tenant_id, array['owner','admin','staff']::public.membership_role[]))
  with check (public.has_tenant_role(tenant_id, array['owner','admin','staff']::public.membership_role[]));

-- Aplica cupom e devolve desconto em centavos (não altera o pedido).
create or replace function public.validate_coupon(
  p_tenant uuid,
  p_code   text,
  p_total  integer
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_c public.coupons%rowtype;
  v_discount int;
begin
  select * into v_c
  from public.coupons
  where tenant_id = p_tenant and code = lower(trim(p_code)) and is_active;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if v_c.valid_from is not null and v_c.valid_from > now() then
    return jsonb_build_object('ok', false, 'error', 'not_started');
  end if;
  if v_c.valid_to is not null and v_c.valid_to < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if v_c.max_uses is not null and v_c.used_count >= v_c.max_uses then
    return jsonb_build_object('ok', false, 'error', 'exhausted');
  end if;
  if p_total < v_c.min_order_cents then
    return jsonb_build_object('ok', false, 'error', 'min_order');
  end if;

  if v_c.type = 'percent' then
    v_discount := least(p_total, (p_total * v_c.value) / 100);
  else
    v_discount := least(p_total, v_c.value);
  end if;

  return jsonb_build_object(
    'ok', true,
    'coupon_id', v_c.id,
    'discount_cents', v_discount,
    'code', v_c.code
  );
end;
$$;

grant execute on function public.validate_coupon(uuid, text, integer) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Storage: imagens de produto
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

create policy product_images_public_read on storage.objects
  for select using (bucket_id = 'product-images');

create policy product_images_staff_insert on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and public.is_tenant_member((storage.foldername(name))[1]::uuid)
  );

create policy product_images_staff_update on storage.objects
  for update using (
    bucket_id = 'product-images'
    and public.is_tenant_member((storage.foldername(name))[1]::uuid)
  );

create policy product_images_staff_delete on storage.objects
  for delete using (
    bucket_id = 'product-images'
    and public.is_tenant_member((storage.foldername(name))[1]::uuid)
  );
