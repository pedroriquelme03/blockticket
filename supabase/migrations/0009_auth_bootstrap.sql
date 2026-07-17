-- =============================================================================
-- 0009 — Bootstrap de usuários: profile automático + admin de bootstrap
-- =============================================================================
-- Ao surgir um usuário no Supabase Auth (ex.: 1º login via magic link),
-- cria o profile e, se o e-mail casar com tenants.settings->>'bootstrap_admin_email',
-- concede papel owner naquele tenant. Assim o admin é provisionado sem senha.

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;

  insert into public.memberships (tenant_id, user_id, role)
  select t.id, new.id, 'owner'::public.membership_role
  from public.tenants t
  where lower(t.settings->>'bootstrap_admin_email') = lower(new.email)
  on conflict (tenant_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin de bootstrap da Aquamania.
update public.tenants
set settings = jsonb_set(settings, '{bootstrap_admin_email}', '"pedroriquelmefoz@gmail.com"'::jsonb)
where id = '00000000-0000-0000-0000-000000000001';
