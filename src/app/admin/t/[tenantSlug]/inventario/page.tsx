import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminTenant } from "@/lib/auth";
import { createProductAction } from "./actions";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  ticket: "Ingresso",
  table_reservation: "Reserva de mesa",
  package: "Pacote",
};

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getAdminTenant(tenantSlug);
  if (!tenant) notFound();
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, type, is_active")
    .eq("tenant_id", tenant.id)
    .order("name");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Produtos</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(products ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    Nenhum produto ainda. Crie o primeiro abaixo.
                  </td>
                </tr>
              ) : (
                (products ?? []).map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 font-medium">{p.name}</td>
                    <td className="px-4 py-2 text-slate-500">
                      {TYPE_LABEL[p.type] ?? p.type}
                    </td>
                    <td className="px-4 py-2">
                      {p.is_active ? "Ativo" : "Inativo"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/admin/t/${tenantSlug}/inventario/${p.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        Editar →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="max-w-md">
        <h2 className="mb-3 text-lg font-semibold">Novo produto</h2>
        <form
          action={createProductAction}
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-5"
        >
          <input type="hidden" name="tenant_id" value={tenant.id} />
          <input type="hidden" name="tenant_slug" value={tenantSlug} />
          <div>
            <label className="block text-sm font-medium text-slate-700">Nome</label>
            <input
              name="name"
              required
              placeholder="Ingresso Day Use"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Slug (opcional)
            </label>
            <input
              name="slug"
              placeholder="day-use"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Tipo</label>
            <select
              name="type"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="ticket">Ingresso</option>
              <option value="table_reservation">Reserva de mesa</option>
              <option value="package">Pacote</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Descrição
            </label>
            <textarea
              name="description"
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="requires_session" />
            Exige escolha de horário/sessão
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800"
          >
            Criar produto
          </button>
        </form>
      </section>
    </div>
  );
}
