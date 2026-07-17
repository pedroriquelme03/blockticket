import { NextResponse } from "next/server";
import { getOrderPublic } from "@/lib/services/orders";

// GET /api/orders/:orderId/status — usado pelo polling do checkout.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const data = await getOrderPublic(orderId);
  if (!data) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ status: data.order.status });
}
