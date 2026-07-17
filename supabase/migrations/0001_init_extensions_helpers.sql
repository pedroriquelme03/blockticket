-- =============================================================================
-- 0001 — Extensões e utilitários compartilhados
-- =============================================================================
-- Base para todo o schema. Não cria tabelas de domínio ainda.

-- gen_random_uuid() para PKs e citext para e-mails case-insensitive.
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- -----------------------------------------------------------------------------
-- Trigger genérico para manter a coluna updated_at sempre atual.
-- Reutilizado por todas as tabelas que possuem updated_at.
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
