import { NextResponse } from "next/server";
import { createPixForOrder } from "@/lib/services/orders";

// POST /api/payments/pix — gera (ou reaproveita) a cobrança PIX do pedido.
export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json({ error: "orderId ausente" }, { status: 400 });
    }
    const pix = await createPixForOrder(orderId);
    return NextResponse.json(pix);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao gerar PIX";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
