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

// Contexto de acesso a um tenant. Garante que o usuário é platform admin ou
// membro do tenant; caso contrário retorna allowed=false (a RLS também protege).
export async function getTenantAccess(tenantId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const [{ data: platform }, { data: tenant }, { data: membership }] =
    await Promise.all([
      supabase.rpc("is_platform_admin"),
      supabase
        .from("tenants")
        .select("id, slug, name, settings")
        .eq("id", tenantId)
        .maybeSingle(),
      supabase
        .from("memberships")
        .select("role")
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const isPlatform = platform === true;
  const role: TenantRole | null = isPlatform
    ? "platform"
    : (membership?.role as TenantRole | undefined) ?? null;

  return {
    user,
    tenant,
    isPlatform,
    role,
    allowed: Boolean(tenant) && (isPlatform || Boolean(membership)),
  };
}
