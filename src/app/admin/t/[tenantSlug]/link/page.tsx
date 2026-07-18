import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminTenant } from "@/lib/auth";
import { PLATFORM_DOMAIN } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function LinkVendasPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getAdminTenant(tenantSlug);
  if (!tenant) notFound();
  const supabase = await createClient();

  const { data: domains } = await supabase
    .from("tenant_domains")
    .select("hostname, is_primary")
    .eq("tenant_id", tenant.id)
    .order("is_primary", { ascending: false });

  const primary =
    domains?.find((d) => d.is_primary)?.hostname ??
    domains?.[0]?.hostname ??
    (PLATFORM_DOMAIN ? `${tenant.slug}.${PLATFORM_DOMAIN}` : null);

  const storeUrl = primary
    ? `https://${primary}`
    : `(configure um domínio em Site)`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Link de Vendas</h2>
        <p className="text-sm text-slate-500">
          Compartilhe o link da loja em redes sociais, bio e WhatsApp.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          URL da loja
        </p>
        <p className="mt-2 break-all font-mono text-lg text-slate-900">
          {storeUrl}
        </p>
        {primary && (
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={storeUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Abrir loja
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Compre seus ingressos: ${storeUrl}`)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Compartilhar no WhatsApp
            </a>
          </div>
        )}
      </div>

      {(domains ?? []).length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Domínios cadastrados</h3>
          <ul className="space-y-1 text-sm text-slate-600">
            {(domains ?? []).map((d) => (
              <li key={d.hostname} className="font-mono">
                {d.hostname}
                {d.is_primary ? " · principal" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
