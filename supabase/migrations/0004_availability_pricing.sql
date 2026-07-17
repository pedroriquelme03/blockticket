-- =============================================================================
-- 0004 — Disponibilidade, tarifação e estoque (inventory)
-- =============================================================================
-- Separação intencional em 3 camadas:
--   1. REGRAS recorrentes (availability_rules, rate_rules) — o que "deveria"
--      estar disponível e por qual preço, por dia da semana / temporada / horário.
--   2. EXCEÇÕES pontuais (availability_exceptions) — feriados, fechamento, lotação
--      especial em uma data específica.
--   3. ESTOQUE materializado (inventory) — contador real por data/horário, fonte
--      da verdade para concorrência (será travado com FOR UPDATE na reserva).
-- Convenção de dia da semana = extract(dow): 0=domingo ... 6=sábado.

-- -----------------------------------------------------------------------------
-- Regras de disponibilidade (capacidade recorrente)
-- -----------------------------------------------------------------------------
create table public.availability_rules (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  product_id     uuid not null references public.products(id) on delete cascade,
  weekdays       smallint[] not null default '{0,1,2,3,4,5,6}',  -- dias aplicáveis
  valid_from     date,                                  -- início da temporada (null = sempre)
  valid_to       date,                                  -- fim da temporada (null = sempre)
  session_times  time[] not null default '{}',          -- vazio = produto de dia inteiro
  capacity       integer not null check (capacity >= 0),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index availability_rules_product_idx
  on public.availability_rules (product_id) where is_active;

create trigger trg_availability_rules_updated_at
  before update on public.availability_rules
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Regras de tarifação (preço por dia da semana / temporada / horário)
-- Sobrescrevem o base_price_cents da variante quando casam.
-- Conflitos resolvidos por `priority` (maior vence); em empate, regra mais
-- específica (variante/horário definidos) vence — ver 0007.
-- -----------------------------------------------------------------------------
create table public.rate_rules (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  product_id   uuid not null references public.products(id) on delete cascade,
  variant_id   uuid references public.product_variants(id) on delete cascade, -- null = todas
  weekdays     smallint[] not null default '{0,1,2,3,4,5,6}',
  valid_from   date,
  valid_to     date,
  session_time time,                                    -- null = qualquer horário
  price_cents  integer not null check (price_cents >= 0),
  priority     int not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index rate_rules_product_idx
  on public.rate_rules (product_id) where is_active;

create trigger trg_rate_rules_updated_at
  before update on public.rate_rules
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Exceções de disponibilidade (fechamento ou capacidade especial numa data)
-- product_id null = aplica a todos os produtos do tenant (ex.: feriado geral).
-- -----------------------------------------------------------------------------
create table public.availability_exceptions (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  product_id        uuid references public.products(id) on delete cascade,
  date              date not null,
  is_closed         boolean not null default true,      -- fechado nessa data?
  capacity_override integer check (capacity_override >= 0), -- ou capacidade especial
  note              text,
  created_at        timestamptz not null default now()
);

create index availability_exceptions_lookup_idx
  on public.availability_exceptions (tenant_id, date);

-- -----------------------------------------------------------------------------
-- Estoque materializado por slot (data + horário opcional).
-- Criado sob demanda (lazy) na primeira reserva. Fonte da verdade para
-- concorrência: a reserva trava a linha (SELECT ... FOR UPDATE).
--   remaining = capacity - reserved - sold
-- -----------------------------------------------------------------------------
create table public.inventory (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  product_id   uuid not null references public.products(id) on delete cascade,
  visit_date   date not null,
  session_time time,                                    -- null = dia inteiro
  capacity     integer not null check (capacity >= 0),
  reserved     integer not null default 0 check (reserved >= 0),  -- hold temporário
  sold         integer not null default 0 check (sold >= 0),      -- pago/confirmado
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (reserved + sold <= capacity)
);

-- Unicidade do slot tratando session_time nulo (dia inteiro) separadamente.
create unique index inventory_slot_time_uidx
  on public.inventory (product_id, visit_date, session_time)
  where session_time is not null;

create unique index inventory_slot_allday_uidx
  on public.inventory (product_id, visit_date)
  where session_time is null;

create trigger trg_inventory_updated_at
  before update on public.inventory
  for each row execute function public.set_updated_at();
