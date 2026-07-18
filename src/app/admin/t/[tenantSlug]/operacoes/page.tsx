import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminTenant } from "@/lib/auth";
import { formatBRL, formatDateBR } from "@/lib/format";
import { CheckInForm } from "./check-in-form";

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

function todayISO() {
  const n = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
}

export default async function TenantOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ tab?: string; date?: string }>;
}) {
  const { tenantSlug } = await params;
  const sp = await searchParams;
  const tab = sp.tab ?? "pedidos";
  const date = sp.date ?? todayISO();
  const tenant = await getAdminTenant(tenantSlug);
  if (!tenant) notFound();
  const supabase = await createClient();

  const tabs = [
    { key: "pedidos", label: "Pedidos" },
    { key: "checkin", label: "Check-in" },
    { key: "agenda", label: "Agenda do dia" },
  ] as const;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Operações</h2>
        <nav className="mt-3 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/admin/t/${tenantSlug}/operacoes?tab=${t.key}`}
              className={[
                "rounded-md px-3 py-1.5 text-sm",
                tab === t.key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              ].join(" ")}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {tab === "checkin" && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="mb-3 font-semibold">Validar ingresso</h3>
          <CheckInForm tenantId={tenant.id} tenantSlug={tenantSlug} />
        </div>
      )}

      {tab === "agenda" && (
        <AgendaDay
          tenantId={tenant.id}
          tenantSlug={tenantSlug}
          date={date}
          supabase={supabase}
        />
      )}

      {tab === "pedidos" && (
        <OrdersList tenantId={tenant.id} tenantSlug={tenantSlug} supabase={supabase} />
      )}
    </section>
  );
}

async function OrdersList({
  tenantId,
  tenantSlug,
  supabase,
}: {
  tenantId: string;
  tenantSlug: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, customer_name, customer_email, total_cents, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
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
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-mono text-xs">
                  <Link
                    href={`/admin/t/${tenantSlug}/operacoes/${o.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {o.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  {o.customer_name ?? "—"}
                  <span className="block text-xs text-slate-400">
                    {o.customer_email}
                  </span>
                </td>
                <td className="px-4 py-2">{STATUS_LABEL[o.status] ?? o.status}</td>
                <td className="px-4 py-2">
                  {formatDateBR(o.created_at.slice(0, 10))}
                </td>
                <td className="px-4 py-2 text-right">{formatBRL(o.total_cents)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

async function AgendaDay({
  tenantId,
  tenantSlug,
  date,
  supabase,
}: {
  tenantId: string;
  tenantSlug: string;
  date: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const { data: tickets } = await supabase
    .from("tickets")
    .select(
      "id, code, status, visit_date, session_time, order_id, orders(customer_name, customer_email)"
    )
    .eq("tenant_id", tenantId)
    .eq("visit_date", date)
    .order("session_time", { ascending: true });

  const list = tickets ?? [];
  const valid = list.filter((t) => t.status === "valid").length;
  const used = list.filter((t) => t.status === "used").length;

  return (
    <div className="space-y-4">
      <form method="get" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="tab" value="agenda" />
        <div>
          <label className="block text-xs text-slate-500">Data</label>
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Filtrar
        </button>
        <p className="text-sm text-slate-500">
          {list.length} ingressos · {valid} válidos · {used} check-in
        </p>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Cliente</th>
              <th className="px-4 py-2 font-medium">Horário</th>
              <th className="px-4 py-2 font-medium">Código</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nenhuma visita nesta data.
                </td>
              </tr>
            ) : (
              list.map((t) => {
                const raw = t.orders as
                  | { customer_name: string | null; customer_email: string | null }
                  | { customer_name: string | null; customer_email: string | null }[]
                  | null;
                const order = Array.isArray(raw) ? raw[0] : raw;
                return (
                  <tr key={t.id}>
                    <td className="px-4 py-2">
                      {order?.customer_name ?? "—"}
                      <span className="block text-xs text-slate-400">
                        {order?.customer_email}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {t.session_time
                        ? String(t.session_time).slice(0, 5)
                        : "Dia inteiro"}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{t.code}</td>
                    <td className="px-4 py-2">
                      {t.status === "valid"
                        ? "Válido"
                        : t.status === "used"
                          ? "Usado"
                          : "Cancelado"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/admin/t/${tenantSlug}/operacoes/${t.order_id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Pedido
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
