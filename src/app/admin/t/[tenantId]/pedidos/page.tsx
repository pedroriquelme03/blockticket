import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatDateBR } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  pending_payment: "Aguardando pgto",
  paid: "Pago",
  partially_paid: "Parcial",
  cancelled: "Cancelado",
  expired: "Expirado",
  refunded: "Estornado",
};

export default async function TenantOrdersPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, customer_name, customer_email, total_cents, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Pedidos</h2>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Pedido</th>
              <th className="px-4 py-2 font-medium">Cliente</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(orders ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nenhum pedido ainda.
                </td>
              </tr>
            ) : (
              (orders ?? []).map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2 font-mono text-xs">
                    {o.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-2">
                    {o.customer_name ?? "—"}
                    <span className="block text-xs text-slate-400">
                      {o.customer_email}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {STATUS_LABEL[o.status] ?? o.status}
                  </td>
                  <td className="px-4 py-2">
                    {formatDateBR(o.created_at.slice(0, 10))}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {formatBRL(o.total_cents)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
