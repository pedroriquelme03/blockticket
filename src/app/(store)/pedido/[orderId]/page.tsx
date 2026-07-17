import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderPublic } from "@/lib/services/orders";
import { formatBRL, formatDateBR } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const data = await getOrderPublic(orderId);
  if (!data) notFound();

  const { order, items, tickets } = data;
  const paid = order.status === "paid";

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-2xl ${
            paid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {paid ? "✓" : "…"}
        </div>
        <h1 className="mt-4 text-xl font-bold">
          {paid ? "Compra confirmada!" : "Pedido pendente"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Pedido #{order.id.slice(0, 8)} · {order.customer_name}
        </p>
        {paid && (
          <p className="mt-1 text-sm text-slate-500">
            Um e-mail de confirmação seria enviado para {order.customer_email}.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-700">Itens</h2>
        <ul className="mt-2 divide-y divide-slate-100">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between py-2 text-sm">
              <span>
                {it.quantity}× {it.product_name} · {it.variant_name}
                {it.visit_date && ` — ${formatDateBR(it.visit_date)}`}
              </span>
              <span className="font-medium">{formatBRL(it.subtotal_cents)}</span>
            </li>
          ))}
        </ul>
      </div>

      {tickets.length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-700">
            Ingressos ({tickets.length})
          </h2>
          <ul className="mt-3 space-y-2">
            {tickets.map((t) => (
              <li
                key={t.code}
                className="flex items-center justify-between rounded-md bg-slate-50 px-4 py-3"
              >
                <span className="font-mono text-sm">{t.code}</span>
                <span className="text-xs uppercase text-green-600">
                  {t.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 text-center">
        <Link href="/" className="text-sm text-blue-600">
          ← Voltar à loja
        </Link>
      </div>
    </div>
  );
}
