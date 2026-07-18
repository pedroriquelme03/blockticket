import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Usuário logado (ou null).
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Exige login; redireciona para /admin/login se não houver sessão.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

// É admin da plataforma (equipe FozDev)?
export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_platform_admin");
  return data === true;
}

export type TenantRole = "owner" | "admin" | "staff" | "platform";

// Resolve um tenant pelo slug (para as páginas do painel obterem o id/UUID).
// O acesso é garantido pelo layout (getTenantAccess) + RLS.
export async function getAdminTenant(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  return data ?? null;
}

// Contexto de acesso a um tenant pelo SLUG (usado nas rotas /admin/t/[tenantSlug]).
// Resolve o tenant pelo slug e devolve também o id (UUID) para uso no banco.
// Garante que o usuário é platform admin ou membro; senão allowed=false (RLS também protege).
export async function getTenantAccess(slug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, slug, name, settings")
    .eq("slug", slug)
    .maybeSingle();

  const { data: platform } = await supabase.rpc("is_platform_admin");
  const isPlatform = platform === true;

  let membershipRole: string | null = null;
  if (tenant) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("tenant_id", tenant.id)
      .eq("user_id", user.id)
      .maybeSingle();
    membershipRole = membership?.role ?? null;
  }

  const role: TenantRole | null = isPlatform
    ? "platform"
    : (membershipRole as TenantRole | null);

  return {
    user,
    tenant,
    isPlatform,
    role,
    allowed: Boolean(tenant) && (isPlatform || membershipRole !== null),
  };
}
