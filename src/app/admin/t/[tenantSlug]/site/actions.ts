"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Normaliza um hostname digitado (remove protocolo, caminho, porta, www opcional).
function normalizeHost(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:.*$/, "")
    .replace(/\.$/, "");
}

export async function createDomainAction(formData: FormData) {
  const tenantId = String(formData.get("tenant_id") ?? "");
  const hostname = normalizeHost(String(formData.get("hostname") ?? ""));
  if (!tenantId || !hostname || !hostname.includes(".")) {
    throw new Error("Informe um domínio válido (ex.: ingressos.aquamania.com.br)");
  }

  const tenantSlug = String(formData.get("tenant_slug") ?? "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("tenant_domains")
    .insert({ tenant_id: tenantId, hostname });
  if (error) {
    if (error.code === "23505") throw new Error("Este domínio já está cadastrado.");
    throw new Error(error.message);
  }
  revalidatePath(`/admin/t/${tenantSlug}/site`);
}

export async function deleteDomainAction(formData: FormData) {
  const tenantSlug = String(formData.get("tenant_slug") ?? "");
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("tenant_domains").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/site`);
}
