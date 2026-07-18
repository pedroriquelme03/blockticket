import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { TENANT_SLUG, PLATFORM_DOMAIN } from "@/lib/config";
import type { Tenant } from "@/lib/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function tenantBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<Tenant | null> {
  const { data } = await supabase
    .from("tenants")
    .select("id, slug, name")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  return data ?? null;
}

async function tenantById(
  supabase: SupabaseClient,
  id: string
): Promise<Tenant | null> {
  const { data } = await supabase
    .from("tenants")
    .select("id, slug, name")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();
  return data ?? null;
}

// Resolve o tenant da loja a partir do hostname da requisição (multi-tenant por
// subdomínio, ex.: ingressos.aquamania.com.br). Ordem de resolução:
//   1. domínio exato cadastrado em tenant_domains
//   2. subdomínio da plataforma (<slug>.PLATFORM_DOMAIN)
//   3. fallback: NEXT_PUBLIC_TENANT_SLUG (dev / domínio padrão)
// Tolerante a falhas (ex.: tabela ainda não migrada) — sempre cai no fallback.
export async function getCurrentTenant(): Promise<Tenant | null> {
  const supabase = await createClient();
  const h = await headers();
  const rawHost = (h.get("x-forwarded-host") ?? h.get("host") ?? "").toLowerCase();
  const host = rawHost.split(":")[0].replace(/\.$/, "");

  if (host) {
    // 1. domínio exato
    const { data: dom } = await supabase
      .from("tenant_domains")
      .select("tenant_id")
      .eq("hostname", host)
      .maybeSingle();
    if (dom?.tenant_id) {
      const t = await tenantById(supabase, dom.tenant_id);
      if (t) return t;
    }

    // 2. subdomínio da plataforma
    if (PLATFORM_DOMAIN && host.endsWith(`.${PLATFORM_DOMAIN}`)) {
      const sub = host.slice(0, host.length - PLATFORM_DOMAIN.length - 1);
      const label = sub.split(".").pop() ?? "";
      if (label) {
        const t = await tenantBySlug(supabase, label);
        if (t) return t;
      }
    }
  }

  // 3. fallback
  return tenantBySlug(supabase, TENANT_SLUG);
}
