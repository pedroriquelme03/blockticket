-- =============================================================================
-- 0014 — Gestão de membros do cliente (usado na seção Configurações)
-- =============================================================================
-- Funções SECURITY DEFINER porque precisam ler o e-mail em auth.users (não
-- exposto via PostgREST) e checam a permissão do chamador internamente.

-- Lista membros de um tenant com e-mail. Visível para membros ou platform admin.
create or replace function public.list_tenant_members(p_tenant uuid)
returns table (
  membership_id uuid,
  user_id       uuid,
  email         text,
  role          public.membership_role,
  created_at    timestamptz
)
language sql stable security definer set search_path = public as $$
  select m.id, m.user_id, u.email::text, m.role, m.created_at
  from public.memberships m
  join auth.users u on u.id = m.user_id
  where m.tenant_id = p_tenant
    and (public.is_tenant_member(p_tenant) or public.is_platform_admin())
  order by m.created_at;
$$;
grant execute on function public.list_tenant_members(uuid) to authenticated;

-- Adiciona um membro por e-mail. Requer owner/admin do tenant ou platform admin.
-- Retorna: 'added' | 'already_member' | 'user_not_found' | 'forbidden'.
create or replace function public.add_tenant_member(
  p_tenant uuid,
  p_email  text,
  p_role   public.membership_role
)
returns text language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  if not (
    public.has_tenant_role(p_tenant, array['owner','admin']::public.membership_role[])
    or public.is_platform_admin()
  ) then
    return 'forbidden';
  end if;

  select id into v_user from auth.users where lower(email) = lower(p_email) limit 1;
  if v_user is null then
    return 'user_not_found';
  end if;

  insert into public.memberships (tenant_id, user_id, role)
  values (p_tenant, v_user, p_role)
  on conflict (tenant_id, user_id) do nothing;

  if not found then
    return 'already_member';
  end if;
  return 'added';
end;
$$;
grant execute on function public.add_tenant_member(uuid, text, public.membership_role) to authenticated;
