import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminTenant } from "@/lib/auth";
import { formatBRL, formatDateBR } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getAdminTenant(tenantSlug);
  if (!tenant) notFound();
  const supabase = await createClient();

  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("psp_recipient_id")
    .eq("id", tenant.id)
    .single();

  const { data: payments } = await supabase
    .from("payments")
    .select(
      "id, method, status, amount_cents, provider_payment_id, created_at, order_id"
    )
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const list = payments ?? [];
  const paid = list.filter((p) => p.status === "paid");
  const refunded = list.filter(
    (p) => p.status === "refunded" || p.status === "chargeback"
  );
  const received = paid.reduce((s, p) => s + p.amount_cents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Financeiro</h2>
        <p className="text-sm text-slate-500">
          Recebimentos e conciliação com o AbacatePay. Split automático usa o
          recebedor configurado em{" "}
          <Link
            href={`/admin/t/${tenantSlug}/configuracoes`}
            className="text-blue-600 hover:underline"
          >
            Configurações
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Recebido (lista recente)</p>
          <p className="mt-1 text-xl font-bold">{formatBRL(received)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Pagamentos pagos</p>
          <p className="mt-1 text-xl font-bold">{paid.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Estornos / chargebacks</p>
          <p className="mt-1 text-xl font-bold">{refunded.length}</p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <p className="font-medium">Recebedor PSP (split)</p>
        <p className="mt-1 font-mono text-slate-600">
          {tenantRow?.psp_recipient_id || "Não configurado"}
        </p>
        <p className="mt-2 text-xs text-slate-400">
          O split automático envia a parte do cliente para este ID quando a API
          do AbacatePay estiver com split habilitado na cobrança.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 font-medium">Método</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">ID PSP</th>
              <th className="px-4 py-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nenhum pagamento.
                </td>
              </tr>
            ) : (
              list.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2">
                    {formatDateBR(p.created_at.slice(0, 10))}
                  </td>
                  <td className="px-4 py-2 uppercase">{p.method}</td>
                  <td className="px-4 py-2">{p.status}</td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {p.provider_payment_id?.slice(0, 16) ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {formatBRL(p.amount_cents)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
