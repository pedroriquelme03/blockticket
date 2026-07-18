import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminTenant } from "@/lib/auth";
import { createDomainAction, deleteDomainAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function DomainsPage({
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
    .select("id, hostname, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-1 text-lg font-semibold">Domínios da loja</h2>
        <p className="mb-3 text-sm text-slate-500">
          Aponte um subdomínio do site do cliente para o Blockticket (ex.:{" "}
          <code>ingressos.aquamania.com.br</code>). A loja é servida
          automaticamente pelo domínio configurado.
        </p>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Domínio</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(domains ?? []).length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-4 text-center text-slate-400">
                    Nenhum domínio cadastrado.
                  </td>
                </tr>
              ) : (
                (domains ?? []).map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-2 font-mono">{d.hostname}</td>
                    <td className="px-4 py-2 text-right">
                      <form action={deleteDomainAction}>
                        <input type="hidden" name="tenant_id" value={tenant.id} />
                        <input type="hidden" name="tenant_slug" value={tenantSlug} />
                        <input type="hidden" name="id" value={d.id} />
                        <button className="text-xs text-red-600 hover:underline">
                          Remover
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <form
          action={createDomainAction}
          className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          <input type="hidden" name="tenant_id" value={tenant.id} />
          <input type="hidden" name="tenant_slug" value={tenantSlug} />
          <div className="flex-1">
            <label className="block text-xs text-slate-500">Domínio</label>
            <input
              name="hostname"
              required
              placeholder="ingressos.aquamania.com.br"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Adicionar domínio
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
        <h3 className="font-semibold">Como configurar o DNS</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            Cadastre o domínio acima (ex.:{" "}
            <code>ingressos.aquamania.com.br</code>).
          </li>
          <li>
            No provedor de DNS do domínio do cliente, crie um registro{" "}
            <strong>CNAME</strong> apontando o subdomínio para{" "}
            <code>cname.vercel-dns.com</code>.
          </li>
          <li>
            Adicione o mesmo domínio no projeto da Vercel (Settings → Domains)
            para emitir o certificado SSL.
          </li>
        </ol>
      </section>
    </div>
  );
}
