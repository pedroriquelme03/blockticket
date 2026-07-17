import { createClient } from "@/lib/supabase/server";
import { TENANT_SLUG } from "@/lib/config";
import type { Tenant } from "@/lib/types";

// Resolve o tenant da loja. No MVP é sempre o slug do env (Aquamania).
// Quando for multi-tenant por subdomínio, este ponto passa a ler o host.
export async function getCurrentTenant(): Promise<Tenant | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("id, slug, name")
    .eq("slug", TENANT_SLUG)
    .eq("status", "active")
    .single();

  if (error) return null;
  return data;
}
