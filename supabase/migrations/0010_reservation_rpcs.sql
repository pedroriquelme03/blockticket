-- =============================================================================
-- 0010 — RPCs do fluxo mínimo: reservar (hold) / confirmar / expirar
-- =============================================================================
-- Caminho de escrita seguro do cliente. SECURITY DEFINER: valida tudo no
-- servidor (tenant, produto, preço, capacidade) e trava o estoque por slot.

-- Cria o pedido e segura o estoque atomicamente (FOR UPDATE por slot).
create or replace function public.create_order_with_hold(
  p_tenant       uuid,
  p_items        jsonb,                 -- [{product_id, variant_id, visit_date, session_time, quantity}]
  p_customer     jsonb default '{}'::jsonb,
  p_hold_minutes int  default 15
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_order     uuid;
  v_item      jsonb;
  v_product   uuid;
  v_variant   uuid;
  v_date      date;
  v_session   time;
  v_qty       int;
  v_price     int;
  v_total     int := 0;
  v_cap       int;
  v_remaining int;
  v_inv       uuid;
  v_pname     text;
  v_vname     text;
  v_ptenant   uuid;
begin
  perform 1 from public.tenants where id = p_tenant and status = 'active';
  if not found then
    raise exception 'Tenant inválido ou inativo';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Carrinho vazio';
  end if;

  insert into public.orders (
    tenant_id, user_id, status,
    customer_name, customer_email, customer_phone, customer_document,
    hold_expires_at
  ) values (
    p_tenant, auth.uid(), 'pending_payment',
    p_customer->>'name', nullif(p_customer->>'email',''),
    p_customer->>'phone', p_customer->>'document',
    now() + make_interval(mins => p_hold_minutes)
  ) returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product := (v_item->>'product_id')::uuid;
    v_variant := nullif(v_item->>'variant_id','')::uuid;
    v_date    := (v_item->>'visit_date')::date;
    v_session := nullif(v_item->>'session_time','')::time;
    v_qty     := (v_item->>'quantity')::int;

    if v_qty is null or v_qty <= 0 then
      raise exception 'Quantidade inválida';
    end if;

    select tenant_id, name into v_ptenant, v_pname
    from public.products where id = v_product and is_active;
    if v_ptenant is null or v_ptenant <> p_tenant then
      raise exception 'Produto inválido para este tenant';
    end if;

    select name into v_vname from public.product_variants where id = v_variant;

    v_price := public.resolve_price_cents(v_product, v_variant, v_date, v_session);
    if v_price is null then
      raise exception 'Preço não encontrado para o item';
    end if;

    -- Garante e trava a linha de estoque do slot.
    select id into v_inv from public.inventory
     where product_id = v_product and visit_date = v_date
       and session_time is not distinct from v_session
     for update;

    if not found then
      v_cap := public.get_slot_capacity(v_product, v_date, v_session);
      if v_cap <= 0 then
        raise exception 'Sem disponibilidade em %', v_date;
      end if;
      begin
        insert into public.inventory (tenant_id, product_id, visit_date, session_time, capacity)
        values (p_tenant, v_product, v_date, v_session, v_cap)
        returning id into v_inv;
      exception when unique_violation then
        select id into v_inv from public.inventory
         where product_id = v_product and visit_date = v_date
           and session_time is not distinct from v_session
         for update;
      end;
    end if;

    select capacity - reserved - sold into v_remaining
    from public.inventory where id = v_inv;

    if v_remaining < v_qty then
      raise exception 'Vagas insuficientes (restam %) em %', v_remaining, v_date;
    end if;

    update public.inventory set reserved = reserved + v_qty where id = v_inv;

    insert into public.order_items (
      tenant_id, order_id, product_id, variant_id, visit_date, session_time,
      quantity, unit_price_cents, subtotal_cents, product_name, variant_name
    ) values (
      p_tenant, v_order, v_product, v_variant, v_date, v_session,
      v_qty, v_price, v_price * v_qty, v_pname, v_vname
    );

    v_total := v_total + v_price * v_qty;
  end loop;

  update public.orders set total_cents = v_total where id = v_order;
  return v_order;
end;
$$;

grant execute on function public.create_order_with_hold(uuid, jsonb, jsonb, int) to anon, authenticated;

-- Confirma pagamento: reserved -> sold + emite tickets. Só service_role (webhook).
create or replace function public.mark_order_paid(p_order uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_item record;
begin
  update public.orders
    set status = 'paid', paid_cents = total_cents, hold_expires_at = null
  where id = p_order and status in ('pending_payment','partially_paid');
  if not found then
    raise exception 'Pedido inexistente ou não pagável';
  end if;

  for v_item in select * from public.order_items where order_id = p_order
  loop
    update public.inventory
      set reserved = greatest(reserved - v_item.quantity, 0),
          sold     = sold + v_item.quantity
    where product_id = v_item.product_id
      and visit_date = v_item.visit_date
      and session_time is not distinct from v_item.session_time;

    insert into public.tickets (tenant_id, order_id, order_item_id, code, visit_date, session_time)
    select v_item.tenant_id, p_order, v_item.id,
           replace(gen_random_uuid()::text, '-', ''), v_item.visit_date, v_item.session_time
    from generate_series(1, v_item.quantity);
  end loop;
end;
$$;

revoke all on function public.mark_order_paid(uuid) from public;
grant execute on function public.mark_order_paid(uuid) to service_role;

-- Libera holds expirados (agendar via cron/edge function).
create or replace function public.expire_holds()
returns integer
language plpgsql security definer set search_path = public
as $$
declare v_item record; v_count int := 0;
begin
  for v_item in
    select oi.* from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.status = 'pending_payment' and o.hold_expires_at < now()
  loop
    update public.inventory
      set reserved = greatest(reserved - v_item.quantity, 0)
    where product_id = v_item.product_id
      and visit_date = v_item.visit_date
      and session_time is not distinct from v_item.session_time;
  end loop;

  update public.orders set status = 'expired'
  where status = 'pending_payment' and hold_expires_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_holds() from public;
grant execute on function public.expire_holds() to service_role;
