import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminTenant } from "@/lib/auth";
import { formatBRL, formatDateBR } from "@/lib/format";

export const dynamic = "force-dynamic";

function todayISO() {
  const n = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
}

function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default async function RelatoriosPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { tenantSlug } = await params;
  const sp = await searchParams;
  const from = sp.from ?? daysAgoISO(30);
  const to = sp.to ?? todayISO();
  const tenant = await getAdminTenant(tenantSlug);
  if (!tenant) notFound();
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total_cents, paid_cents, created_at")
    .eq("tenant_id", tenant.id)
    .gte("created_at", `${from}T00:00:00`)
    .lte("created_at", `${to}T23:59:59`)
    .order("created_at", { ascending: false });

  const list = orders ?? [];
  const paid = list.filter((o) => o.status === "paid" || o.status === "refunded");
  const gmv = paid.reduce((s, o) => s + (o.paid_cents || o.total_cents), 0);
  const ticketMedio = paid.length ? Math.round(gmv / paid.length) : 0;
  const pending = list.filter((o) => o.status === "pending_payment").length;
  const cancelled = list.filter(
    (o) => o.status === "cancelled" || o.status === "expired"
  ).length;

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, status, visit_date")
    .eq("tenant_id", tenant.id)
    .gte("visit_date", from)
    .lte("visit_date", to);

  const ticketList = tickets ?? [];
  const used = ticketList.filter((t) => t.status === "used").length;
  const valid = ticketList.filter((t) => t.status === "valid").length;

  const csvRows = [
    ["id", "status", "total_cents", "paid_cents", "created_at"],
    ...list.map((o) => [
      o.id,
      o.status,
      String(o.total_cents),
      String(o.paid_cents),
      o.created_at,
    ]),
  ];
  const csv = csvRows.map((r) => r.join(",")).join("\n");
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Relatórios</h2>
        <p className="text-sm text-slate-500">
          Vendas e ocupação no período. Exportação CSV abaixo.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-500">De</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500">Até</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Filtrar
        </button>
        <a
          href={csvHref}
          download={`vendas-${from}-${to}.csv`}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          Exportar CSV
        </a>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Receita (pagos)", value: formatBRL(gmv) },
          { label: "Pedidos pagos", value: String(paid.length) },
          { label: "Ticket médio", value: formatBRL(ticketMedio) },
          {
            label: "Ingressos (válidos/usados)",
            value: `${valid} / ${used}`,
          },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className="mt-1 text-xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-slate-500">
        Período {formatDateBR(from)} – {formatDateBR(to)} · {pending} aguardando
        pgto · {cancelled} cancelados/expirados
      </p>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Pedido</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.slice(0, 30).map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-2 font-mono text-xs">{o.id.slice(0, 8)}</td>
                <td className="px-4 py-2">{o.status}</td>
                <td className="px-4 py-2">
                  {formatDateBR(o.created_at.slice(0, 10))}
                </td>
                <td className="px-4 py-2 text-right">{formatBRL(o.total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
