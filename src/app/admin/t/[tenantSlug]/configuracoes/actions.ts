"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

// Dados do estabelecimento (nome, razão social, CNPJ).
export async function updateEstabelecimentoAction(formData: FormData) {
  const tenantId = str(formData, "tenant_id");
  const tenantSlug = str(formData, "tenant_slug");
  const name = str(formData, "name");
  if (!name) throw new Error("Nome é obrigatório");

  const supabase = await createClient();
  const { error } = await supabase
    .from("tenants")
    .update({
      name,
      legal_name: str(formData, "legal_name") || null,
      document: str(formData, "document") || null,
    })
    .eq("id", tenantId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/configuracoes`);
}

// Configuração de pagamento (recebedor do split no PSP).
export async function updatePagamentoAction(formData: FormData) {
  const tenantId = str(formData, "tenant_id");
  const tenantSlug = str(formData, "tenant_slug");
  const supabase = await createClient();
  const { error } = await supabase
    .from("tenants")
    .update({ psp_recipient_id: str(formData, "psp_recipient_id") || null })
    .eq("id", tenantId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/configuracoes`);
}

// Adiciona um membro por e-mail (via RPC). Redireciona com o status na query.
export async function addMemberAction(formData: FormData) {
  const tenantId = str(formData, "tenant_id");
  const tenantSlug = str(formData, "tenant_slug");
  const email = str(formData, "email");
  const role = str(formData, "role") || "staff";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_tenant_member", {
    p_tenant: tenantId,
    p_email: email,
    p_role: role,
  });
  const status = error ? "error" : (data as string);
  revalidatePath(`/admin/t/${tenantSlug}/configuracoes`);
  redirect(`/admin/t/${tenantSlug}/configuracoes?membro=${status}`);
}

export async function updateMemberRoleAction(formData: FormData) {
  const tenantSlug = str(formData, "tenant_slug");
  const membershipId = str(formData, "membership_id");
  const role = str(formData, "role");
  const supabase = await createClient();
  const { error } = await supabase
    .from("memberships")
    .update({ role })
    .eq("id", membershipId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/configuracoes`);
}

export async function removeMemberAction(formData: FormData) {
  const tenantSlug = str(formData, "tenant_slug");
  const membershipId = str(formData, "membership_id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("memberships")
    .delete()
    .eq("id", membershipId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/t/${tenantSlug}/configuracoes`);
}
