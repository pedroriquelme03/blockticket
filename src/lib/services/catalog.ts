import { createClient } from "@/lib/supabase/server";
import type { Product, ProductVariant } from "@/lib/types";

// Lista os produtos ativos de um tenant (vitrine). RLS permite leitura pública.
export async function listProducts(tenantId: string): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, tenant_id, type, slug, name, description, images, requires_session, is_active")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

// Produto + variantes ativas pelo slug.
export async function getProductBySlug(
  tenantId: string,
  slug: string
): Promise<{ product: Product; variants: ProductVariant[] } | null> {
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, tenant_id, type, slug, name, description, images, requires_session, is_active")
    .eq("tenant_id", tenantId)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!product) return null;

  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, product_id, name, base_price_cents, currency, sort_order")
    .eq("product_id", product.id)
    .eq("is_active", true)
    .order("sort_order");

  return { product, variants: variants ?? [] };
}
