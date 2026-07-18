-- =============================================================================
-- 0012 — Camada de plataforma (super-admin FozDev)
-- =============================================================================
-- Dois níveis de admin:
--   * platform admin (equipe FozDev): acesso a TODOS os tenants.
--   * staff do tenant (owner/admin/staff): acesso só ao próprio tenant (RLS já
--     existente em 0006).
-- Platform admins são semeados por e-mail (bootstrap no 1o login).

-- E-mails que viram platform admin automaticamente no 1o login.
create table public.platform_admin_emails (
  email      text primary key,
  created_at timestamptz not null default now()
);
insert into public.platform_admin_emails (email) values
  ('pedroriquelmefoz@gmail.com'),
  ('admin@fozdev.com.br')
on conflict do nothing;

-- Platform admins (por user_id).
create table public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;
grant execute on function public.is_platform_admin() to authenticated;

-- Trigger de bootstrap: profile + owner do tenant (bootstrap) + platform admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;

  insert into public.memberships (tenant_id, user_id, role)
  select t.id, new.id, 'owner'::public.membership_role
  from public.tenants t
  where lower(t.settings->>'bootstrap_admin_email') = lower(new.email)
  on conflict (tenant_id, user_id) do nothing;

  insert into public.platform_admins (user_id)
  select new.id from public.platform_admin_emails pae
  where pae.email = lower(new.email)
  on conflict do nothing;

  return new;
end;
$$;

-- Função de trigger não deve ser chamável via API (PostgREST).
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Promove admins de bootstrap que já tenham usuário.
insert into public.platform_admins (user_id)
select u.id from auth.users u
join public.platform_admin_emails pae on pae.email = lower(u.email)
on conflict do nothing;

-- RLS das tabelas de plataforma.
alter table public.platform_admins       enable row level security;
alter table public.platform_admin_emails enable row level security;
create policy platform_admins_read on public.platform_admins
  for select using (public.is_platform_admin());
create policy platform_admin_emails_read on public.platform_admin_emails
  for select using (public.is_platform_admin());

-- Policies aditivas: platform admin tem acesso total a todas as tabelas.
create policy tenants_platform_all on public.tenants for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy memberships_platform_all on public.memberships for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy products_platform_all on public.products for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy product_variants_platform_all on public.product_variants for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy availability_rules_platform_all on public.availability_rules for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy rate_rules_platform_all on public.rate_rules for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy availability_exceptions_platform_all on public.availability_exceptions for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy inventory_platform_all on public.inventory for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy orders_platform_all on public.orders for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy order_items_platform_all on public.order_items for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy payments_platform_all on public.payments for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy tickets_platform_all on public.tickets for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());
