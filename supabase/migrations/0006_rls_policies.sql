-- =============================================================================
-- 0006 — Row Level Security (RLS) em todas as tabelas
-- =============================================================================
-- Princípios:
--   * RLS ligado em TODAS as tabelas de domínio (default-deny).
--   * Catálogo público (tenants ativos, produtos/variantes/regras ativas) é
--     legível por anon/authenticated para a vitrine.
--   * Escrita no catálogo: apenas staff do tenant (owner/admin/staff).
--   * Pedidos: cliente enxerga/gerencia os próprios; staff enxerga os do tenant.
--   * Pagamentos/tickets: escrita reservada ao service role (webhook/RPC);
--     clientes só leem os próprios.
-- No Supabase, anon/authenticated já têm GRANT nas tabelas do schema public;
-- é a RLS que efetivamente restringe. Grants extras não são necessários.

-- Habilita RLS -----------------------------------------------------------------
alter table public.tenants                 enable row level security;
alter table public.profiles                enable row level security;
alter table public.memberships             enable row level security;
alter table public.products                enable row level security;
alter table public.product_variants        enable row level security;
alter table public.availability_rules      enable row level security;
alter table public.rate_rules              enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.inventory               enable row level security;
alter table public.orders                  enable row level security;
alter table public.order_items             enable row level security;
alter table public.payments                enable row level security;
alter table public.tickets                 enable row level security;

-- TENANTS ----------------------------------------------------------------------
create policy tenants_public_read on public.tenants
  for select using (status = 'active' or public.is_tenant_member(id));

create policy tenants_admin_update on public.tenants
  for update using (public.has_tenant_role(id, array['owner','admin']::public.membership_role[]))
  with check    (public.has_tenant_role(id, array['owner','admin']::public.membership_role[]));

-- INSERT de tenant (provisionamento) fica com o service role — sem policy.

-- PROFILES ---------------------------------------------------------------------
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());
create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- MEMBERSHIPS ------------------------------------------------------------------
create policy memberships_read on public.memberships
  for select using (public.is_tenant_member(tenant_id));
create policy memberships_manage on public.memberships
  for all
  using (public.has_tenant_role(tenant_id, array['owner','admin']::public.membership_role[]))
  with check (public.has_tenant_role(tenant_id, array['owner','admin']::public.membership_role[]));

-- Helper de escrita no catálogo (qualquer staff do tenant).
-- Usado nas policies abaixo via has_tenant_role(..., {owner,admin,staff}).

-- PRODUCTS ---------------------------------------------------------------------
create policy products_read on public.products
  for select using (is_active or public.is_tenant_member(tenant_id));
create policy products_write on public.products
  for all
  using (public.has_tenant_role(tenant_id, array['owner','admin','staff']::public.membership_role[]))
  with check (public.has_tenant_role(tenant_id, array['owner','admin','staff']::public.membership_role[]));

-- PRODUCT_VARIANTS -------------------------------------------------------------
create policy product_variants_read on public.product_variants
  for select using (is_active or public.is_tenant_member(tenant_id));
create policy product_variants_write on public.product_variants
  for all
  using (public.has_tenant_role(tenant_id, array['owner','admin','staff']::public.membership_role[]))
  with check (public.has_tenant_role(tenant_id, array['owner','admin','staff']::public.membership_role[]));

-- AVAILABILITY_RULES -----------------------------------------------------------
create policy availability_rules_read on public.availability_rules
  for select using (is_active or public.is_tenant_member(tenant_id));
create policy availability_rules_write on public.availability_rules
  for all
  using (public.has_tenant_role(tenant_id, array['owner','admin','staff']::public.membership_role[]))
  with check (public.has_tenant_role(tenant_id, array['owner','admin','staff']::public.membership_role[]));

-- RATE_RULES -------------------------------------------------------------------
create policy rate_rules_read on public.rate_rules
  for select using (is_active or public.is_tenant_member(tenant_id));
create policy rate_rules_write on public.rate_rules
  for all
  using (public.has_tenant_role(tenant_id, array['owner','admin','staff']::public.membership_role[]))
  with check (public.has_tenant_role(tenant_id, array['owner','admin','staff']::public.membership_role[]));

-- AVAILABILITY_EXCEPTIONS ------------------------------------------------------
create policy availability_exceptions_read on public.availability_exceptions
  for select using (true);  -- datas de fechamento são informação pública
create policy availability_exceptions_write on public.availability_exceptions
  for all
  using (public.has_tenant_role(tenant_id, array['owner','admin','staff']::public.membership_role[]))
  with check (public.has_tenant_role(tenant_id, array['owner','admin','staff']::public.membership_role[]));

-- INVENTORY --------------------------------------------------------------------
-- Leitura pública (mostrar vagas restantes). Escrita direta só de staff;
-- a reserva transacional do cliente passará por RPC SECURITY DEFINER (passo 3).
create policy inventory_read on public.inventory
  for select using (true);
create policy inventory_staff_write on public.inventory
  for all
  using (public.has_tenant_role(tenant_id, array['owner','admin','staff']::public.membership_role[]))
  with check (public.has_tenant_role(tenant_id, array['owner','admin','staff']::public.membership_role[]));

-- ORDERS -----------------------------------------------------------------------
-- Cliente vê/gerencia os próprios; staff vê/gerencia os do tenant.
create policy orders_read on public.orders
  for select using (
    (user_id is not null and user_id = auth.uid())
    or public.is_tenant_member(tenant_id)
  );
create policy orders_insert on public.orders
  for insert with check (
    user_id = auth.uid()                                  -- cliente logado cria o próprio
    or public.is_tenant_member(tenant_id)                 -- ou staff (PDV)
  );
create policy orders_update on public.orders
  for update using (
    (user_id is not null and user_id = auth.uid())
    or public.is_tenant_member(tenant_id)
  ) with check (
    (user_id is not null and user_id = auth.uid())
    or public.is_tenant_member(tenant_id)
  );

-- ORDER_ITEMS ------------------------------------------------------------------
-- Herdam a autorização do pedido pai.
create policy order_items_read on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and ((o.user_id is not null and o.user_id = auth.uid())
             or public.is_tenant_member(o.tenant_id))
    )
  );
create policy order_items_write on public.order_items
  for all using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and ((o.user_id is not null and o.user_id = auth.uid())
             or public.is_tenant_member(o.tenant_id))
    )
  ) with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and ((o.user_id is not null and o.user_id = auth.uid())
             or public.is_tenant_member(o.tenant_id))
    )
  );

-- PAYMENTS ---------------------------------------------------------------------
-- Somente leitura para cliente (do próprio pedido) e staff. Escrita: service role.
create policy payments_read on public.payments
  for select using (
    public.is_tenant_member(tenant_id)
    or exists (
      select 1 from public.orders o
      where o.id = payments.order_id
        and o.user_id is not null and o.user_id = auth.uid()
    )
  );

-- TICKETS ----------------------------------------------------------------------
create policy tickets_read on public.tickets
  for select using (
    public.is_tenant_member(tenant_id)
    or exists (
      select 1 from public.orders o
      where o.id = tickets.order_id
        and o.user_id is not null and o.user_id = auth.uid()
    )
  );
-- Validação/uso do ticket (status) por staff; emissão via RPC/service role.
create policy tickets_staff_update on public.tickets
  for update using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));
