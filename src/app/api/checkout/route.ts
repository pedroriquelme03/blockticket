import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/services/tenant";
import { createOrderWithHold } from "@/lib/services/orders";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { CartItemInput } from "@/lib/types";

// POST /api/checkout — cria o pedido e segura o estoque (hold).
// Body: { items: CartItemInput[], customer: { name, email, phone?, document? } }
export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    const limited = rateLimit(`checkout:${ip}`, 8, 15 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Muitas reservas. Tente em ${limited.retryAfterSec}s.` },
        { status: 429 }
      );
    }

    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: "Tenant inválido" }, { status: 400 });
    }

    const body = await request.json();
    const items = (body.items ?? []) as CartItemInput[];
    const customer = body.customer ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });
    }

    // Limite por item e por carrinho (mitiga hold abusivo).
    const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    if (totalQty > 20) {
      return NextResponse.json(
        { error: "Limite de 20 ingressos por reserva." },
        { status: 400 }
      );
    }

    const orderId = await createOrderWithHold(tenant.id, items, customer);
    return NextResponse.json({ orderId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao reservar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
