import { createClient } from "@/lib/supabase/server";

// Vagas restantes de um produto numa data (via RPC get_remaining).
export async function getRemaining(
  productId: string,
  visitDate: string,
  sessionTime?: string | null
): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_remaining", {
    p_product: productId,
    p_date: visitDate,
    p_session: sessionTime ?? null,
  });
  if (error) throw error;
  return data ?? 0;
}

// Preço efetivo de uma variante numa data (via RPC resolve_price_cents).
export async function resolvePrice(
  productId: string,
  variantId: string,
  visitDate: string,
  sessionTime?: string | null
): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_price_cents", {
    p_product: productId,
    p_variant: variantId,
    p_date: visitDate,
    p_session: sessionTime ?? null,
  });
  if (error) throw error;
  return data ?? 0;
}

// Preço + disponibilidade de todas as variantes numa data (para a tela do produto).
export async function getPricingForDate(
  productId: string,
  variantIds: string[],
  visitDate: string,
  sessionTime?: string | null
): Promise<{ remaining: number; prices: Record<string, number> }> {
  const [remaining, prices] = await Promise.all([
    getRemaining(productId, visitDate, sessionTime),
    Promise.all(
      variantIds.map((vid) => resolvePrice(productId, vid, visitDate, sessionTime))
    ).then((list) =>
      Object.fromEntries(variantIds.map((vid, i) => [vid, list[i]]))
    ),
  ]);
  return { remaining, prices };
}
