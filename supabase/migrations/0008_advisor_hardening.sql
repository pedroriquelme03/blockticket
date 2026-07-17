-- =============================================================================
-- 0008 — Ajustes apontados pelo linter de segurança do Supabase
-- =============================================================================

-- search_path imutável no trigger genérico (evita hijack via search_path).
alter function public.set_updated_at() set search_path = '';

-- Extensões não devem viver no schema public.
alter extension citext set schema extensions;
