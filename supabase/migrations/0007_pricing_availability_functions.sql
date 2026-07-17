-- =============================================================================
-- 0007 — Funções de leitura de preço e disponibilidade
-- =============================================================================
-- Definem a SEMÂNTICA de como as regras (0004) são interpretadas. São de leitura
-- e seguras para expor a anon/authenticated. A reserva transacional (escrita
-- com trava de estoque) virá no passo 3, reutilizando get_slot_capacity().

-- -----------------------------------------------------------------------------
-- Preço efetivo de uma variante numa data/horário.
-- Ordem de resolução: rate_rule com maior priority; empate -> regra mais
-- específica (variante e horário definidos); fallback -> base_price_cents.
-- -----------------------------------------------------------------------------
create or replace function public.resolve_price_cents(
  p_product uuid,
  p_variant uuid,
  p_date    date,
  p_session time default null
) returns integer
language sql stable security definer set search_path = public
as $$
  with dow as (select extract(dow from p_date)::smallint as d)
  select coalesce(
    (
      select rr.price_cents
      from public.rate_rules rr, dow
      where rr.product_id = p_product
        and rr.is_active
        and (rr.variant_id is null or rr.variant_id = p_variant)
        and dow.d = any(rr.weekdays)
        and (rr.valid_from is null or p_date >= rr.valid_from)
        and (rr.valid_to   is null or p_date <= rr.valid_to)
        and (rr.session_time is null or rr.session_time = p_session)
      order by rr.priority desc,
               (rr.variant_id is not null) desc,   -- variante específica vence
               (rr.session_time is not null) desc  -- horário específico vence
      limit 1
    ),
    (select v.base_price_cents from public.product_variants v where v.id = p_variant)
  );
$$;

-- -----------------------------------------------------------------------------
-- Capacidade total de um slot (data + horário opcional), já considerando
-- exceções (fechamento / capacidade especial) e regras de disponibilidade.
-- Retorna 0 se fechado ou sem regra aplicável.
-- -----------------------------------------------------------------------------
create or replace function public.get_slot_capacity(
  p_product uuid,
  p_date    date,
  p_session time default null
) returns integer
language plpgsql stable security definer set search_path = public
as $$
declare
  v_tenant   uuid;
  v_closed   boolean;
  v_override integer;
  v_cap      integer;
  v_dow      smallint := extract(dow from p_date)::smallint;
begin
  select tenant_id into v_tenant from public.products where id = p_product;
  if v_tenant is null then
    return 0;
  end if;

  -- Exceções da data (específicas do produto ou gerais do tenant).
  select bool_or(e.is_closed), max(e.capacity_override)
    into v_closed, v_override
  from public.availability_exceptions e
  where e.tenant_id = v_tenant
    and e.date = p_date
    and (e.product_id is null or e.product_id = p_product);

  if coalesce(v_closed, false) then
    return 0;
  end if;
  if v_override is not null then
    return v_override;
  end if;

  -- Regra de disponibilidade aplicável (maior capacidade em caso de sobreposição).
  select max(ar.capacity) into v_cap
  from public.availability_rules ar
  where ar.product_id = p_product
    and ar.is_active
    and v_dow = any(ar.weekdays)
    and (ar.valid_from is null or p_date >= ar.valid_from)
    and (ar.valid_to   is null or p_date <= ar.valid_to)
    and (
      (p_session is null and cardinality(ar.session_times) = 0)
      or (p_session is not null and p_session = any(ar.session_times))
    );

  return coalesce(v_cap, 0);
end;
$$;

-- -----------------------------------------------------------------------------
-- Vagas restantes = capacidade - (reservado + vendido no inventory).
-- Se ainda não existe linha de inventory para o slot, restante = capacidade.
-- -----------------------------------------------------------------------------
create or replace function public.get_remaining(
  p_product uuid,
  p_date    date,
  p_session time default null
) returns integer
language sql stable security definer set search_path = public
as $$
  select public.get_slot_capacity(p_product, p_date, p_session)
       - coalesce((
           select i.reserved + i.sold
           from public.inventory i
           where i.product_id = p_product
             and i.visit_date = p_date
             and i.session_time is not distinct from p_session
         ), 0);
$$;

-- Exposição das funções de leitura para a vitrine.
grant execute on function public.resolve_price_cents(uuid, uuid, date, time) to anon, authenticated;
grant execute on function public.get_slot_capacity(uuid, date, time)        to anon, authenticated;
grant execute on function public.get_remaining(uuid, date, time)            to anon, authenticated;
