-- =============================================================================
-- 0011 — Leitura pública de um pedido pelo id (capability token = UUID)
-- =============================================================================
-- Permite a loja mostrar resumo/tickets a guest sem service role e sem abrir RLS.

create or replace function public.get_order_public(p_order uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'order', to_jsonb(o) - 'user_id',
    'items', coalesce((
      select jsonb_agg(to_jsonb(oi) order by oi.created_at)
      from public.order_items oi where oi.order_id = o.id
    ), '[]'::jsonb),
    'tickets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', t.code, 'status', t.status,
        'visit_date', t.visit_date, 'session_time', t.session_time))
      from public.tickets t where t.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.id = p_order;
$$;

grant execute on function public.get_order_public(uuid) to anon, authenticated;
