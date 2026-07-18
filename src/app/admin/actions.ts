"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/auth";

// Cria um novo cliente (tenant). Só platform admin. O e-mail informado vira
// owner do tenant automaticamente no 1o login (bootstrap via trigger).
export async function createTenantAction(formData: FormData) {
  if (!(await isPlatformAdmin())) {
    throw new Error("Sem permissão");
  }

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!name || !slug) {
    throw new Error("Nome e slug são obrigatórios");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tenants").insert({
    name,
    slug,
    settings: email ? { bootstrap_admin_email: email } : {},
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  redirect(`/admin/t/${slug}`);
}
