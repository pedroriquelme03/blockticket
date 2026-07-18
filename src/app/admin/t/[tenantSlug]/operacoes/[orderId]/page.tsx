import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminTenant } from "@/lib/auth";
import { formatBRL, formatDateBR } from "@/lib/format";
import { cancelOrderAction, resendTicketsAction } from "../actions";

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

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; orderId: string }>;
}) {
  const { tenantSlug, orderId } = await params;
  const tenant = await getAdminTenant(tenantSlug);
  if (!tenant) notFound();
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, status, customer_name, customer_email, customer_phone, customer_document, total_cents, paid_cents, hold_expires_at, created_at"
    )
    .eq("id", orderId)
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!order) notFound();

  const [{ data: items }, { data: payments }, { data: tickets }] =
    await Promise.all([
      supabase
        .from("order_items")
        .select(
          "id, product_name, variant_name, visit_date, session_time, quantity, unit_price_cents, subtotal_cents"
        )
        .eq("order_id", orderId),
      supabase
        .from("payments")
        .select("id, provider, method, status, amount_cents, provider_payment_id, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false }),
      supabase
        .from("tickets")
        .select("id, code, status, visit_date, session_time")
        .eq("order_id", orderId)
        .order("created_at"),
    ]);

  const canCancel = ["pending_payment", "paid", "partially_paid"].includes(
    order.status
  );
  const canResend = order.status === "paid" && (tickets?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/t/${tenantSlug}/operacoes`}
          className="text-sm text-blue-600"
        >
          ← Pedidos
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">
              Pedido #{order.id.slice(0, 8)}
            </h2>
            <p className="text-sm text-slate-500">
              {STATUS_LABEL[order.status] ?? order.status} ·{" "}
              {formatDateBR(order.created_at.slice(0, 10))}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canResend && (
              <form action={resendTicketsAction}>
                <input type="hidden" name="tenant_slug" value={tenantSlug} />
                <input type="hidden" name="order_id" value={orderId} />
                <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                  Reenviar ingressos
                </button>
              </form>
            )}
            {canCancel && (
              <form action={cancelOrderAction}>
                <input type="hidden" name="tenant_slug" value={tenantSlug} />
                <input type="hidden" name="order_id" value={orderId} />
                <button
                  className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                  formAction={cancelOrderAction}
                >
                  Cancelar / estornar
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="font-semibold">Cliente</h3>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Nome</dt>
            <dd>{order.customer_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">E-mail</dt>
            <dd>{order.customer_email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Telefone</dt>
            <dd>{order.customer_phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Documento</dt>
            <dd>{order.customer_document ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 font-semibold">
          Itens
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {(items ?? []).map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-2">
                  {it.quantity}× {it.product_name} · {it.variant_name}
                  {it.visit_date && (
                    <span className="block text-xs text-slate-400">
                      {formatDateBR(it.visit_date)}
                      {it.session_time
                        ? ` · ${String(it.session_time).slice(0, 5)}`
                        : ""}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {formatBRL(it.subtotal_cents)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50">
              <td className="px-4 py-2 font-medium">Total</td>
              <td className="px-4 py-2 text-right font-bold">
                {formatBRL(order.total_cents)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 font-semibold">
          Pagamentos
        </div>
        {(payments ?? []).length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-400">Nenhum pagamento.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {(payments ?? []).map((p) => (
              <li key={p.id} className="flex justify-between px-4 py-3">
                <span>
                  {p.method.toUpperCase()} · {p.status}
                  <span className="block font-mono text-xs text-slate-400">
                    {p.provider_payment_id}
                  </span>
                </span>
                <span className="font-medium">{formatBRL(p.amount_cents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 font-semibold">
          Ingressos ({tickets?.length ?? 0})
        </div>
        {(tickets ?? []).length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-400">
            Nenhum ingresso emitido.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {(tickets ?? []).map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=64x64&data=${encodeURIComponent(t.code)}`}
                    alt=""
                    width={48}
                    height={48}
                    className="rounded border border-slate-100"
                  />
                  <span className="font-mono text-xs">{t.code}</span>
                </div>
                <span className="text-xs uppercase text-slate-500">
                  {t.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
