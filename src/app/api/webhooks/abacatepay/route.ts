import { NextResponse } from "next/server";
import { settlePaidCharge } from "@/lib/services/orders";

// POST /api/webhooks/abacatepay?secret=... — recebe eventos do AbacatePay.
// Docs: https://docs.abacatepay.com/pages/webhooks
// Validação MVP: secret na query string (definido no dashboard ao registrar a
// URL). Hardening futuro: validar também a assinatura HMAC-SHA256 do header
// X-Webhook-Signature.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret") ?? url.searchParams.get("webhookSecret");
  const expected = process.env.ABACATEPAY_WEBHOOK_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    event?: string;
    data?: { id?: string; status?: string; metadata?: { orderId?: string }; externalId?: string };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const event = body.event ?? "";
  const data = body.data ?? {};
  const isPaid = event.endsWith(".completed") || data.status === "PAID";
  const orderId = data.metadata?.orderId ?? data.externalId;

  // Sempre responde 200 para o AbacatePay não reenviar eventos que não tratamos.
  if (isPaid && orderId && data.id) {
    try {
      await settlePaidCharge(orderId, data.id, body);
    } catch (e) {
      // Loga e devolve 500 para o AbacatePay reenviar (falha transitória).
      console.error("[abacatepay webhook]", e);
      return NextResponse.json({ error: "processing failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
