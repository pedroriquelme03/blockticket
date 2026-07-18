"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseBRLToCents } from "@/lib/admin-helpers";

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
  return valid.length ? valid : [0, 1, 2, 3, 4, 5, 6];
}
function slugify(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function parseSessionTimes(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.length === 5 ? `${t}:00` : t));
}

// ---- Produtos ------------------------------------------------------------
export async function createProductAction(formData: FormData) {
  const tenantId = str(formData, "tenant_id");
  const tenantSlug = str(formData, "tenant_slug");
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
      requires_session: str(formData, "requires_session") === "on",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/t/${tenantSlug}/inventario`);
  redirect(`/admin/t/${tenantSlug}/inventario/${data.id}`);
}

export async function updateProductAction(formData: FormData) {
  const tenantSlug = str(formData, "tenant_slug");
  const productId = str(formData, "product_id");
  const name = str(formData, "name");
  if (!name) throw new Error("Nome obrigatório");

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name,
      slug: slugify(str(formData, "slug") || name),
      description: str(formData, "description") || null,
      type: str(formData, "type") || "ticket",
      is_active: str(formData, "is_active") === "on",
      requires_session: str(formData, "requires_session") === "on",
    })
    .eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/inventario`);
  revalidatePath(`/admin/t/${tenantSlug}/inventario/${productId}`);
}

export async function deleteProductAction(formData: FormData) {
  const tenantSlug = str(formData, "tenant_slug");
  const id = str(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/inventario`);
  redirect(`/admin/t/${tenantSlug}/inventario`);
}

export async function uploadProductImageAction(formData: FormData) {
  const tenantId = str(formData, "tenant_id");
  const tenantSlug = str(formData, "tenant_slug");
  const productId = str(formData, "product_id");
  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) throw new Error("Selecione uma imagem");
  if (file.size > 5 * 1024 * 1024) throw new Error("Imagem até 5 MB");

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${tenantId}/${productId}/${Date.now()}.${ext}`;
  const supabase = await createClient();

  const { error: upErr } = await supabase.storage
    .from("product-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) throw new Error(upErr.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from("product-images").getPublicUrl(path);

  const { data: product } = await supabase
    .from("products")
    .select("images")
    .eq("id", productId)
    .single();
  const images = Array.isArray(product?.images) ? [...product.images] : [];
  images.push(publicUrl);

  const { error } = await supabase
    .from("products")
    .update({ images })
    .eq("id", productId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/t/${tenantSlug}/inventario/${productId}`);
}

export async function removeProductImageAction(formData: FormData) {
  const tenantSlug = str(formData, "tenant_slug");
  const productId = str(formData, "product_id");
  const url = str(formData, "url");
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("images")
    .eq("id", productId)
    .single();
  const images = (Array.isArray(product?.images) ? product.images : []).filter(
    (u: string) => u !== url
  );
  const { error } = await supabase
    .from("products")
    .update({ images })
    .eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/inventario/${productId}`);
}

// ---- Variantes -----------------------------------------------------------
export async function createVariantAction(formData: FormData) {
  const tenantId = str(formData, "tenant_id");
  const tenantSlug = str(formData, "tenant_slug");
  const productId = str(formData, "product_id");
  const name = str(formData, "name");
  const cents = parseBRLToCents(str(formData, "price"));
  if (!name || Number.isNaN(cents)) throw new Error("Nome e preço obrigatórios");

  const supabase = await createClient();
  const { count } = await supabase
    .from("product_variants")
    .select("*", { count: "exact", head: true })
    .eq("product_id", productId);

  const { error } = await supabase.from("product_variants").insert({
    tenant_id: tenantId,
    product_id: productId,
    name,
    base_price_cents: cents,
    sort_order: Number(str(formData, "sort_order")) || (count ?? 0),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/inventario/${productId}`);
}

export async function updateVariantAction(formData: FormData) {
  const tenantSlug = str(formData, "tenant_slug");
  const productId = str(formData, "product_id");
  const id = str(formData, "id");
  const name = str(formData, "name");
  const cents = parseBRLToCents(str(formData, "price"));
  if (!name || Number.isNaN(cents)) throw new Error("Nome e preço obrigatórios");

  const supabase = await createClient();
  const { error } = await supabase
    .from("product_variants")
    .update({
      name,
      base_price_cents: cents,
      is_active: str(formData, "is_active") !== "off",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/inventario/${productId}`);
}

export async function reorderVariantsAction(formData: FormData) {
  const tenantSlug = str(formData, "tenant_slug");
  const productId = str(formData, "product_id");
  const id = str(formData, "id");
  const direction = str(formData, "direction"); // up | down
  const supabase = await createClient();

  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, sort_order")
    .eq("product_id", productId)
    .order("sort_order");
  if (!variants?.length) return;

  const idx = variants.findIndex((v) => v.id === id);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapWith < 0 || swapWith >= variants.length) return;

  const a = variants[idx];
  const b = variants[swapWith];
  await Promise.all([
    supabase
      .from("product_variants")
      .update({ sort_order: b.sort_order })
      .eq("id", a.id),
    supabase
      .from("product_variants")
      .update({ sort_order: a.sort_order })
      .eq("id", b.id),
  ]);
  revalidatePath(`/admin/t/${tenantSlug}/inventario/${productId}`);
}

export async function deleteVariantAction(formData: FormData) {
  const tenantSlug = str(formData, "tenant_slug");
  const productId = str(formData, "product_id");
  const id = str(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.from("product_variants").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/inventario/${productId}`);
}

// ---- Tarifas -------------------------------------------------------------
export async function createRateRuleAction(formData: FormData) {
  const tenantId = str(formData, "tenant_id");
  const tenantSlug = str(formData, "tenant_slug");
  const productId = str(formData, "product_id");
  const variantId = str(formData, "variant_id") || null;
  const cents = parseBRLToCents(str(formData, "price"));
  if (Number.isNaN(cents)) throw new Error("Preço inválido");
  const sessionTime = str(formData, "session_time") || null;

  const supabase = await createClient();
  const { error } = await supabase.from("rate_rules").insert({
    tenant_id: tenantId,
    product_id: productId,
    variant_id: variantId,
    weekdays: weekdays(formData),
    valid_from: dateOrNull(formData, "valid_from"),
    valid_to: dateOrNull(formData, "valid_to"),
    session_time: sessionTime ? (sessionTime.length === 5 ? `${sessionTime}:00` : sessionTime) : null,
    price_cents: cents,
    priority: Number(str(formData, "priority")) || 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/inventario/${productId}`);
}

export async function updateRateRuleAction(formData: FormData) {
  const tenantSlug = str(formData, "tenant_slug");
  const productId = str(formData, "product_id");
  const id = str(formData, "id");
  const cents = parseBRLToCents(str(formData, "price"));
  if (Number.isNaN(cents)) throw new Error("Preço inválido");

  const supabase = await createClient();
  const { error } = await supabase
    .from("rate_rules")
    .update({
      variant_id: str(formData, "variant_id") || null,
      weekdays: weekdays(formData),
      valid_from: dateOrNull(formData, "valid_from"),
      valid_to: dateOrNull(formData, "valid_to"),
      price_cents: cents,
      priority: Number(str(formData, "priority")) || 0,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/inventario/${productId}`);
}

export async function deleteRateRuleAction(formData: FormData) {
  const tenantSlug = str(formData, "tenant_slug");
  const productId = str(formData, "product_id");
  const id = str(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.from("rate_rules").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/inventario/${productId}`);
}

// ---- Disponibilidade -----------------------------------------------------
export async function createAvailabilityRuleAction(formData: FormData) {
  const tenantId = str(formData, "tenant_id");
  const tenantSlug = str(formData, "tenant_slug");
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
    session_times: parseSessionTimes(str(formData, "session_times")),
    capacity,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/inventario/${productId}`);
}

export async function updateAvailabilityRuleAction(formData: FormData) {
  const tenantSlug = str(formData, "tenant_slug");
  const productId = str(formData, "product_id");
  const id = str(formData, "id");
  const capacity = Number(str(formData, "capacity"));
  if (!Number.isInteger(capacity) || capacity < 0) {
    throw new Error("Capacidade inválida");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("availability_rules")
    .update({
      weekdays: weekdays(formData),
      valid_from: dateOrNull(formData, "valid_from"),
      valid_to: dateOrNull(formData, "valid_to"),
      session_times: parseSessionTimes(str(formData, "session_times")),
      capacity,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/inventario/${productId}`);
}

export async function deleteAvailabilityRuleAction(formData: FormData) {
  const tenantSlug = str(formData, "tenant_slug");
  const productId = str(formData, "product_id");
  const id = str(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.from("availability_rules").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/inventario/${productId}`);
}

// ---- Exceções ------------------------------------------------------------
export async function createExceptionAction(formData: FormData) {
  const tenantId = str(formData, "tenant_id");
  const tenantSlug = str(formData, "tenant_slug");
  const productId = str(formData, "product_id");
  const date = str(formData, "date");
  if (!date) throw new Error("Data obrigatória");

  const isClosed = str(formData, "is_closed") === "on";
  const capRaw = str(formData, "capacity_override");
  const capacity_override = capRaw ? Number(capRaw) : null;

  const supabase = await createClient();
  const { error } = await supabase.from("availability_exceptions").insert({
    tenant_id: tenantId,
    product_id: productId,
    date,
    is_closed: isClosed,
    capacity_override: isClosed ? null : capacity_override,
    note: str(formData, "note") || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/inventario/${productId}`);
}

export async function deleteExceptionAction(formData: FormData) {
  const tenantSlug = str(formData, "tenant_slug");
  const productId = str(formData, "product_id");
  const id = str(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("availability_exceptions")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/inventario/${productId}`);
}
