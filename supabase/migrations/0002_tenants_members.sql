-- =============================================================================
-- 0002 — Tenants, perfis de usuário, vínculos (memberships) e helpers de RLS
-- =============================================================================
-- Multi-tenancy desde o início: todo dado de domínio pertence a um tenant.
-- Papéis de staff (owner/admin/staff) vivem em `memberships`.
-- Cliente final NÃO precisa de membership — é apenas um usuário autenticado
-- (ou guest) que cria pedidos.

-- -----------------------------------------------------------------------------
-- Estabelecimentos (tenants). Ex.: Aquamania.
-- -----------------------------------------------------------------------------
create table public.tenants (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,                 -- subdomínio/rota da loja
  name            text not null,                        -- nome público
  legal_name      text,                                 -- razão social
  document        text,                                 -- CNPJ
  status          text not null default 'active'
                    check (status in ('active','suspended')),
  -- Identificador do recebedor no PSP (Pagar.me/AbacatePay) para split futuro.
  psp_recipient_id text,
  settings        jsonb not null default '{}'::jsonb,   -- branding, config livre
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_tenants_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Perfil do usuário (extensão 1:1 de auth.users do Supabase Auth).
-- Vale tanto para staff quanto para cliente final.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  document    text,                                     -- CPF do cliente
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Vínculo usuário <-> tenant com papel. Define quem é staff de cada loja.
-- -----------------------------------------------------------------------------
create type public.membership_role as enum ('owner','admin','staff');

create table public.memberships (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        public.membership_role not null default 'staff',
  created_at  timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index memberships_user_idx on public.memberships (user_id);

-- -----------------------------------------------------------------------------
-- Helpers de autorização usados nas policies de RLS.
-- SECURITY DEFINER: rodam como owner e ignoram RLS de `memberships`,
-- evitando recursão de policy. search_path fixo por segurança.
-- -----------------------------------------------------------------------------

-- É membro (qualquer papel) do tenant?
create or replace function public.is_tenant_member(p_tenant uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.tenant_id = p_tenant
      and m.user_id = auth.uid()
  );
$$;

-- Possui um dos papéis informados no tenant?
create or replace function public.has_tenant_role(
  p_tenant uuid,
  p_roles public.membership_role[]
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.tenant_id = p_tenant
      and m.user_id = auth.uid()
      and m.role = any(p_roles)
  );
$$;
