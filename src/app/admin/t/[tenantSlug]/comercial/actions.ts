"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseBRLToCents } from "@/lib/admin-helpers";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export async function createCouponAction(formData: FormData) {
  const tenantId = str(formData, "tenant_id");
  const tenantSlug = str(formData, "tenant_slug");
  const code = str(formData, "code").toUpperCase();
  const type = str(formData, "type") === "fixed" ? "fixed" : "percent";
  const rawValue = str(formData, "value");
  const value =
    type === "fixed" ? parseBRLToCents(rawValue) : Number(rawValue);
  if (!code || !value || Number.isNaN(value) || value <= 0) {
    throw new Error("Código e valor inválidos");
  }
  if (type === "percent" && value > 100) {
    throw new Error("Percentual máximo 100");
  }

  const maxUsesRaw = str(formData, "max_uses");
  const minRaw = str(formData, "min_order");
  const supabase = await createClient();
  const { error } = await supabase.from("coupons").insert({
    tenant_id: tenantId,
    code,
    type,
    value,
    max_uses: maxUsesRaw ? Number(maxUsesRaw) : null,
    min_order_cents: minRaw ? parseBRLToCents(minRaw) : 0,
    valid_from: str(formData, "valid_from") || null,
    valid_to: str(formData, "valid_to")
      ? `${str(formData, "valid_to")}T23:59:59`
      : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/comercial`);
}

export async function toggleCouponAction(formData: FormData) {
  const tenantSlug = str(formData, "tenant_slug");
  const id = str(formData, "id");
  const isActive = str(formData, "is_active") === "true";
  const supabase = await createClient();
  const { error } = await supabase
    .from("coupons")
    .update({ is_active: !isActive })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/comercial`);
}

export async function deleteCouponAction(formData: FormData) {
  const tenantSlug = str(formData, "tenant_slug");
  const id = str(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/comercial`);
}
