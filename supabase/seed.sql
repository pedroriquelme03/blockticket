-- =============================================================================
-- Seed de desenvolvimento — tenant Aquamania com catálogo de exemplo
-- =============================================================================
-- Executado por `supabase db reset`. Não cria usuários auth (faça isso pelo
-- painel/Auth); memberships podem ser adicionadas depois vinculando um user_id.

-- Tenant -----------------------------------------------------------------------
insert into public.tenants (id, slug, name, legal_name, document, status)
values (
  '00000000-0000-0000-0000-000000000001',
  'aquamania', 'Aquamania', 'Aquamania Parque Aquático LTDA', '00.000.000/0001-00', 'active'
);

-- Produto: ingresso day-use (dia inteiro) ------------------------------------
insert into public.products (id, tenant_id, type, slug, name, description, requires_session)
values (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'ticket', 'day-use', 'Ingresso Day Use',
  'Acesso a todas as atrações do parque por um dia.', false
);

-- Variantes: Adulto e Criança --------------------------------------------------
insert into public.product_variants (id, tenant_id, product_id, name, base_price_cents, sort_order)
values
  ('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','Adulto', 12000, 1),
  ('00000000-0000-0000-0000-000000000022','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','Criança', 8000, 2);

-- Disponibilidade: todos os dias, 500 vagas/dia (produto de dia inteiro) --------
insert into public.availability_rules (tenant_id, product_id, weekdays, session_times, capacity)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  '{0,1,2,3,4,5,6}', '{}', 500
);

-- Tarifa de fim de semana (sáb/dom): Adulto R$150 (sobrepõe base) --------------
insert into public.rate_rules (tenant_id, product_id, variant_id, weekdays, price_cents, priority)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000021',
  '{0,6}', 15000, 10
);
