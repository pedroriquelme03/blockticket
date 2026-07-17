import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderPublic } from "@/lib/services/orders";
import { formatBRL, formatDateBR } from "@/lib/format";
import { PixPayment } from "./pix-payment";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const data = await getOrderPublic(orderId);
  if (!data) notFound();

  const { order, items } = data;

  // Se já foi pago, segue direto para a confirmação.
  if (order.status === "paid") {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="text-slate-600">Este pedido já foi pago.</p>
        <Link
          href={`/pedido/${order.id}`}
          className="mt-4 inline-block text-blue-600"
        >
          Ver ingressos →
        </Link>
      </div>
    );
  }

  const expired = order.status === "expired";

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">Pagamento</h1>
      <p className="mt-1 text-sm text-slate-500">Pedido #{order.id.slice(0, 8)}</p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <ul className="divide-y divide-slate-100">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between py-3 text-sm">
              <span>
                {it.quantity}× {it.product_name} · {it.variant_name}
                {it.visit_date && (
                  <span className="text-slate-500">
                    {" "}
                    — {formatDateBR(it.visit_date)}
                  </span>
                )}
              </span>
              <span className="font-medium">{formatBRL(it.subtotal_cents)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-slate-200 pt-4">
          <span className="font-semibold">Total</span>
          <span className="text-xl font-bold">{formatBRL(order.total_cents)}</span>
        </div>
      </div>

      {expired ? (
        <p className="mt-6 text-center text-sm text-red-600">
          A reserva expirou. Volte à loja e tente novamente.
        </p>
      ) : (
        <div className="mt-6">
          <PixPayment orderId={order.id} />
          <p className="mt-3 text-center text-xs text-slate-400">
            Pagamento via PIX (AbacatePay). A confirmação é automática após o
            pagamento.
          </p>
        </div>
      )}
    </div>
  );
}
