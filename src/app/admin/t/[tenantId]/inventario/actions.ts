"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseBRLToCents } from "@/lib/admin-helpers";

// ---- helpers de parsing --------------------------------------------------
function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}
function dateOrNull(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v || null;
}
function weekdays(fd: FormData): number[] {
  const days = fd.getAll("weekdays").map((d) => Number(d));
  const valid = days.filter((d) => d >= 0 && d <= 6);
  return valid.length ? valid : [0, 1, 2, 3, 4, 5, 6]; // vazio = todos os dias
}
function slugify(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ---- Produtos ------------------------------------------------------------
export async function createProductAction(formData: FormData) {
  const tenantId = str(formData, "tenant_id");
  const name = str(formData, "name");
  const slug = slugify(str(formData, "slug") || name);
  if (!tenantId || !name) throw new Error("Dados incompletos");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      tenant_id: tenantId,
      name,
      slug,
      type: str(formData, "type") || "ticket",
      description: str(formData, "description") || null,
      requires_session: false,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/t/${tenantId}/inventario`);
  redirect(`/admin/t/${tenantId}/inventario/${data.id}`);
}

export async function deleteProductAction(formData: FormData) {
  const tenantId = str(formData, "tenant_id");
  const id = str(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantId}/inventario`);
  redirect(`/admin/t/${tenantId}/inventario`);
}

// ---- Variantes (tipos de ingresso) ---------------------------------------
export async function createVariantAction(formData: FormData) {
  const tenantId = str(formData, "tenant_id");
  const productId = str(formData, "product_id");
  const name = str(formData, "name");
  const cents = parseBRLToCents(str(formData, "price"));
  if (!name || Number.isNaN(cents)) throw new Error("Nome e preço obrigatórios");

  const supabase = await createClient();
  const { error } = await supabase.from("product_variants").insert({
    tenant_id: tenantId,
    product_id: productId,
    name,
    base_price_cents: cents,
    sort_order: Number(str(formData, "sort_order")) || 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantId}/inventario/${productId}`);
}

export async function deleteVariantAction(formData: FormData) {
  const tenantId = str(formData, "tenant_id");
  const productId = str(formData, "product_id");
  const id = str(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.from("product_variants").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantId}/inventario/${productId}`);
}

// ---- Tarifas por dia (rate rules) ----------------------------------------
export async function createRateRuleAction(formData: FormData) {
  const tenantId = str(formData, "tenant_id");
  const productId = str(formData, "product_id");
  const variantId = str(formData, "variant_id") || null;
  const cents = parseBRLToCents(str(formData, "price"));
  if (Number.isNaN(cents)) throw new Error("Preço inválido");

  const supabase = await createClient();
  const { error } = await supabase.from("rate_rules").insert({
    tenant_id: tenantId,
    product_id: productId,
    variant_id: variantId,
    weekdays: weekdays(formData),
    valid_from: dateOrNull(formData, "valid_from"),
    valid_to: dateOrNull(formData, "valid_to"),
    price_cents: cents,
    priority: Number(str(formData, "priority")) || 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantId}/inventario/${productId}`);
}

export async function deleteRateRuleAction(formData: FormData) {
  const tenantId = str(formData, "tenant_id");
  const productId = str(formData, "product_id");
  const id = str(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.from("rate_rules").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantId}/inventario/${productId}`);
}

// ---- Disponibilidade (capacidade por dia) --------------------------------
export async function createAvailabilityRuleAction(formData: FormData) {
  const tenantId = str(formData, "tenant_id");
  const productId = str(formData, "product_id");
  const capacity = Number(str(formData, "capacity"));
  if (!Number.isInteger(capacity) || capacity < 0) {
    throw new Error("Capacidade inválida");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("availability_rules").insert({
    tenant_id: tenantId,
    product_id: productId,
    weekdays: weekdays(formData),
    valid_from: dateOrNull(formData, "valid_from"),
    valid_to: dateOrNull(formData, "valid_to"),
    session_times: [],
    capacity,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantId}/inventario/${productId}`);
}

export async function deleteAvailabilityRuleAction(formData: FormData) {
  const tenantId = str(formData, "tenant_id");
  const productId = str(formData, "product_id");
  const id = str(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.from("availability_rules").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantId}/inventario/${productId}`);
}
