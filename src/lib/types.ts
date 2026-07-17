// Tipos de domínio usados pela camada de serviços/UI. Espelham o schema.
// (Para tipos gerados automaticamente: `supabase gen types typescript`.)

export type ProductType = "ticket" | "table_reservation" | "package";

export type OrderStatus =
  | "draft"
  | "pending_payment"
  | "paid"
  | "partially_paid"
  | "cancelled"
  | "expired"
  | "refunded";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  type: ProductType;
  slug: string;
  name: string;
  description: string | null;
  images: string[];
  requires_session: boolean;
  is_active: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  base_price_cents: number;
  currency: string;
  sort_order: number;
}

export interface OrderItem {
  id: string;
  product_name: string | null;
  variant_name: string | null;
  visit_date: string | null;
  session_time: string | null;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
}

export interface Order {
  id: string;
  tenant_id: string;
  status: OrderStatus;
  customer_name: string | null;
  customer_email: string | null;
  total_cents: number;
  paid_cents: number;
  hold_expires_at: string | null;
  created_at: string;
}

export interface Ticket {
  code: string;
  status: string;
  visit_date: string | null;
  session_time: string | null;
}

// Payload de um item enviado ao RPC create_order_with_hold.
export interface CartItemInput {
  product_id: string;
  variant_id: string;
  visit_date: string;
  session_time?: string | null;
  quantity: number;
}
