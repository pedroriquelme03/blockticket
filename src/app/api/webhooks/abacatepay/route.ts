import { NextResponse } from "next/server";
import {
  settlePaidCharge,
  settleRefundedCharge,
} from "@/lib/services/orders";

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

  const event = (body.event ?? "").toLowerCase();
  const data = body.data ?? {};
  const orderId = data.metadata?.orderId ?? data.externalId;
  const status = (data.status ?? "").toUpperCase();

  const isPaid =
    event.endsWith(".completed") ||
    status === "PAID" ||
    event.includes("paid");
  const isRefunded =
    event.includes("refund") || status === "REFUNDED";
  const isDisputed =
    event.includes("disput") ||
    event.includes("chargeback") ||
    status === "DISPUTED" ||
    status === "CHARGEBACK";

  if (orderId && data.id) {
    try {
      if (isPaid) {
        await settlePaidCharge(orderId, data.id, body);
      } else if (isRefunded) {
        await settleRefundedCharge(orderId, data.id, body, "refunded");
      } else if (isDisputed) {
        await settleRefundedCharge(orderId, data.id, body, "chargeback");
      }
    } catch (e) {
      console.error("[abacatepay webhook]", e);
      return NextResponse.json({ error: "processing failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
