import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPixCharge } from "@/lib/abacatepay";
import { sendTicketsEmail } from "@/lib/email";
import type { CartItemInput, Order, OrderItem, Ticket } from "@/lib/types";

interface CustomerInput {
  name?: string;
  email?: string;
  phone?: string;
  document?: string;
}

// Hold curto (10 min) reduz abuso de estoque sem pagamento.
const DEFAULT_HOLD_MINUTES = 10;

// Reserva: cria pedido + hold de estoque (RPC transacional). Roda no contexto
// do usuário (auth.uid() no RPC); guest fica com user_id null.
export async function createOrderWithHold(
  tenantId: string,
  items: CartItemInput[],
  customer: CustomerInput
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_order_with_hold", {
    p_tenant: tenantId,
    p_items: items,
    p_customer: customer,
    p_hold_minutes: DEFAULT_HOLD_MINUTES,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

// Leitura de um pedido pelo id (RPC get_order_public — id é a capability).
export async function getOrderPublic(orderId: string): Promise<{
  order: Order;
  items: OrderItem[];
  tickets: Ticket[];
} | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_order_public", {
    p_order: orderId,
  });
  if (error || !data || !data.order) return null;
  return {
    order: data.order as Order,
    items: (data.items ?? []) as OrderItem[],
    tickets: (data.tickets ?? []) as Ticket[],
  };
}

// Confirma pagamento: reserved -> sold + emite tickets (via service role).
// Idempotente: ignora se o pedido já não estiver pagável (ex.: webhook duplicado).
export async function confirmPayment(orderId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("mark_order_paid", { p_order: orderId });
  if (error && !/não pagável|inexistente/i.test(error.message)) {
    throw new Error(error.message);
  }
}

// Gera (ou reaproveita) a cobrança PIX do AbacatePay para um pedido pendente.
// Guarda a cobrança em `payments`; devolve os dados para exibir o QR.
export async function createPixForOrder(orderId: string): Promise<{
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
  chargeId: string;
}> {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, tenant_id, status, total_cents, customer_name, customer_email, customer_phone, customer_document")
    .eq("id", orderId)
    .single();

  if (!order) throw new Error("Pedido não encontrado");
  if (order.status !== "pending_payment") {
    throw new Error("Pedido não está aguardando pagamento");
  }

  // Reaproveita cobrança pendente já criada (evita duplicar no reload).
  const { data: existing } = await admin
    .from("payments")
    .select("provider_payment_id, raw, status")
    .eq("order_id", orderId)
    .eq("provider", "abacatepay")
    .in("status", ["pending", "processing"])
    .maybeSingle();

  if (existing?.raw?.brCode) {
    return {
      brCode: existing.raw.brCode,
      brCodeBase64: existing.raw.brCodeBase64,
      expiresAt: existing.raw.expiresAt,
      chargeId: existing.provider_payment_id,
    };
  }

  const { data: tenant } = await admin
    .from("tenants")
    .select("psp_recipient_id")
    .eq("id", order.tenant_id)
    .single();

  const platformFeeBps = Number(process.env.PLATFORM_FEE_BPS ?? "0");
  const platformFeeCents =
    platformFeeBps > 0
      ? Math.round((order.total_cents * platformFeeBps) / 10000)
      : undefined;

  const charge = await createPixCharge({
    amountCents: order.total_cents,
    description: `Pedido ${order.id.slice(0, 8)}`,
    externalId: order.id,
    metadata: { orderId: order.id },
    recipientId: tenant?.psp_recipient_id,
    platformFeeCents,
  });

  await admin.from("payments").insert({
    tenant_id: order.tenant_id,
    order_id: order.id,
    provider: "abacatepay",
    provider_payment_id: charge.id,
    method: "pix",
    status: "pending",
    amount_cents: order.total_cents,
    raw: charge,
  });

  return {
    brCode: charge.brCode,
    brCodeBase64: charge.brCodeBase64,
    expiresAt: charge.expiresAt,
    chargeId: charge.id,
  };
}

// Marca o pagamento como pago a partir de um webhook e confirma o pedido.
export async function settlePaidCharge(
  orderId: string,
  chargeId: string,
  payload: unknown
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("payments")
    .update({ status: "paid", raw: payload as object })
    .eq("provider", "abacatepay")
    .eq("provider_payment_id", chargeId);
  await confirmPayment(orderId);
  await sendOrderTicketsEmail(orderId).catch((e) =>
    console.error("[email tickets]", e)
  );
}

// Estorno / chargeback via webhook.
export async function settleRefundedCharge(
  orderId: string,
  chargeId: string,
  payload: unknown,
  kind: "refunded" | "chargeback"
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("payments")
    .update({
      status: kind === "chargeback" ? "chargeback" : "refunded",
      raw: payload as object,
    })
    .eq("provider", "abacatepay")
    .eq("provider_payment_id", chargeId);

  const { data: order } = await admin
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();

  if (order && order.status === "paid") {
    await admin.rpc("cancel_order", { p_order: orderId });
  }
}

export async function sendOrderTicketsEmail(orderId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, tenant_id, customer_name, customer_email, status")
    .eq("id", orderId)
    .single();
  if (!order?.customer_email || order.status !== "paid") return;

  const [{ data: tenant }, { data: items }, { data: tickets }] = await Promise.all([
    admin.from("tenants").select("name").eq("id", order.tenant_id).single(),
    admin
      .from("order_items")
      .select("quantity, product_name, variant_name")
      .eq("order_id", orderId),
    admin
      .from("tickets")
      .select("code, visit_date, session_time")
      .eq("order_id", orderId)
      .eq("status", "valid"),
  ]);

  const itemsSummary = (items ?? [])
    .map((i) => `${i.quantity}× ${i.product_name ?? ""} ${i.variant_name ?? ""}`.trim())
    .join(", ");

  await sendTicketsEmail({
    to: order.customer_email,
    customerName: order.customer_name,
    orderId: order.id,
    tenantName: tenant?.name ?? "BlockTicket",
    tickets: tickets ?? [],
    itemsSummary,
  });
}
