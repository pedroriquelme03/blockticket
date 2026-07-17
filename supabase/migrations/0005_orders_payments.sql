-- =============================================================================
-- 0005 — Pedidos, itens, pagamentos e ingressos emitidos
-- =============================================================================
-- Um pedido (order) agrupa itens e pode ter 1..N pagamentos (payments),
-- suportando pagamento parcial ou integral (paid_cents vs total_cents).
-- Valores sempre em centavos.

create type public.order_status as enum (
  'draft',            -- carrinho / em montagem
  'pending_payment',  -- reservado (hold) aguardando pagamento
  'paid',             -- pago integralmente
  'partially_paid',   -- pago em parte
  'cancelled',        -- cancelado
  'expired',          -- hold expirou sem pagamento
  'refunded'          -- estornado
);

create type public.payment_status as enum (
  'pending','processing','paid','failed','refunded','chargeback'
);

create type public.payment_method as enum ('pix','credit_card','boleto');
create type public.payment_provider as enum ('pagarme','abacatepay');

-- -----------------------------------------------------------------------------
-- Pedidos
-- -----------------------------------------------------------------------------
create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete restrict,
  -- Cliente logado (null = guest checkout, tratado por RPC/webhook no futuro).
  user_id           uuid references auth.users(id) on delete set null,
  status            public.order_status not null default 'draft',
  -- Snapshot do comprador (persistido mesmo para guest).
  customer_name     text,
  customer_email    citext,
  customer_phone    text,
  customer_document text,
  currency          char(3) not null default 'BRL',
  total_cents       integer not null default 0 check (total_cents >= 0),
  paid_cents        integer not null default 0 check (paid_cents >= 0),
  -- Enquanto pending_payment, a reserva (hold) expira aqui; libera o estoque.
  hold_expires_at   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index orders_tenant_status_idx on public.orders (tenant_id, status);
create index orders_user_idx on public.orders (user_id);

create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Itens do pedido. Guardam snapshot de nome/preço para histórico imutável.
-- -----------------------------------------------------------------------------
create table public.order_items (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete restrict,
  order_id          uuid not null references public.orders(id) on delete cascade,
  product_id        uuid not null references public.products(id) on delete restrict,
  variant_id        uuid references public.product_variants(id) on delete restrict,
  visit_date        date,
  session_time      time,
  quantity          integer not null check (quantity > 0),
  unit_price_cents  integer not null check (unit_price_cents >= 0),
  subtotal_cents    integer not null check (subtotal_cents >= 0),
  product_name      text,                                -- snapshot
  variant_name      text,                                -- snapshot
  created_at        timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);

-- -----------------------------------------------------------------------------
-- Pagamentos (1..N por pedido). O PSP é a autoridade sobre o status; o webhook
-- (service role) atualiza status e o paid_cents do pedido.
-- -----------------------------------------------------------------------------
create table public.payments (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete restrict,
  order_id            uuid not null references public.orders(id) on delete cascade,
  provider            public.payment_provider not null,
  provider_payment_id text,                              -- id da cobrança no PSP
  method              public.payment_method not null,
  status              public.payment_status not null default 'pending',
  amount_cents        integer not null check (amount_cents >= 0),
  raw                 jsonb not null default '{}'::jsonb, -- payload p/ auditoria
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

create index payments_order_idx on public.payments (order_id);

create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Ingressos emitidos após confirmação (base para QR/validação futura).
-- Mantido fino de propósito — integração com catraca fica para depois.
-- -----------------------------------------------------------------------------
create table public.tickets (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete restrict,
  order_id      uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  code          text not null unique,                    -- código/QR
  status        text not null default 'valid'
                  check (status in ('valid','used','cancelled')),
  visit_date    date,
  session_time  time,
  created_at    timestamptz not null default now()
);

create index tickets_order_idx on public.tickets (order_id);
