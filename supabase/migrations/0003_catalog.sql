-- =============================================================================
-- 0003 — Catálogo: produtos e variantes
-- =============================================================================
-- Produto = item vendável (ingresso, reserva de mesa, pacote).
-- Variante = tipo de bilhete/preço base (Adulto, Criança, Meia...).
-- Preço em CENTAVOS (integer) para evitar imprecisão de ponto flutuante.

create type public.product_type as enum ('ticket','table_reservation','package');

-- -----------------------------------------------------------------------------
-- Produtos
-- -----------------------------------------------------------------------------
create table public.products (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  type              public.product_type not null default 'ticket',
  slug              text not null,                       -- rota amigável na loja
  name              text not null,
  description       text,
  images            jsonb not null default '[]'::jsonb,  -- URLs no Storage
  -- Precisa escolher horário/sessão? (false = produto de dia inteiro)
  requires_session  boolean not null default false,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (tenant_id, slug)
);

create index products_tenant_active_idx
  on public.products (tenant_id) where is_active;

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Variantes (tipos de bilhete com preço base próprio)
-- -----------------------------------------------------------------------------
create table public.product_variants (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  product_id        uuid not null references public.products(id) on delete cascade,
  name              text not null,                       -- Adulto, Criança, Meia
  base_price_cents  integer not null check (base_price_cents >= 0),
  currency          char(3) not null default 'BRL',
  is_active         boolean not null default true,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index product_variants_product_idx
  on public.product_variants (product_id);

create trigger trg_product_variants_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();
