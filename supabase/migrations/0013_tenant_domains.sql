-- =============================================================================
-- 0013 — Domínios por tenant (multi-tenant por hostname, estilo Planne)
-- =============================================================================
-- Cada cliente aponta um subdomínio próprio (ex.: ingressos.aquamania.com.br)
-- via DNS (CNAME) para o app. A loja resolve o tenant pelo Host da requisição.
-- Requer 0012 (is_platform_admin) aplicada antes.

create table public.tenant_domains (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  hostname   text not null unique,          -- ex.: ingressos.aquamania.com.br
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index tenant_domains_tenant_idx on public.tenant_domains (tenant_id);

alter table public.tenant_domains enable row level security;

-- Leitura pública: a loja precisa resolver host -> tenant sem login.
grant select on public.tenant_domains to anon, authenticated;
create policy tenant_domains_read on public.tenant_domains
  for select using (true);

-- Escrita: owner/admin do tenant.
create policy tenant_domains_write on public.tenant_domains
  for all
  using (public.has_tenant_role(tenant_id, array['owner','admin']::public.membership_role[]))
  with check (public.has_tenant_role(tenant_id, array['owner','admin']::public.membership_role[]));

-- Escrita: platform admin (FozDev).
create policy tenant_domains_platform_all on public.tenant_domains
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
