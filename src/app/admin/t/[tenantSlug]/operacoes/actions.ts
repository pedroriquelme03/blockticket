"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendOrderTicketsEmail } from "@/lib/services/orders";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export async function checkInTicketAction(formData: FormData) {
  const tenantId = str(formData, "tenant_id");
  const tenantSlug = str(formData, "tenant_slug");
  const code = str(formData, "code").replace(/-/g, "").toLowerCase();
  if (!code) return { ok: false as const, error: "empty" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in_ticket", {
    p_tenant: tenantId,
    p_code: code,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/admin/t/${tenantSlug}/operacoes`);
  return data as {
    ok: boolean;
    error?: string;
    ticket?: {
      code: string;
      status: string;
      visit_date: string | null;
      session_time: string | null;
      customer_name: string | null;
      customer_email: string | null;
      order_id: string;
    };
  };
}

export async function cancelOrderAction(formData: FormData) {
  const tenantSlug = str(formData, "tenant_slug");
  const orderId = str(formData, "order_id");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_order", { p_order: orderId });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/operacoes`);
  revalidatePath(`/admin/t/${tenantSlug}/operacoes/${orderId}`);
}

export async function resendTicketsAction(formData: FormData) {
  const tenantSlug = str(formData, "tenant_slug");
  const orderId = str(formData, "order_id");
  await sendOrderTicketsEmail(orderId);
  revalidatePath(`/admin/t/${tenantSlug}/operacoes/${orderId}`);
}
