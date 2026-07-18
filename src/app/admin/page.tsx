import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { LogoutButton } from "./logout-button";
import { createTenantAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminRoot() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: platform } = await supabase.rpc("is_platform_admin");

  // --- Usuário comum (staff de cliente): manda para o painel do seu tenant. ---
  if (!platform) {
    const { data: memberships } = await supabase
      .from("memberships")
      .select("tenant_id, tenants(slug)")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      return (
        <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h1 className="font-semibold text-amber-900">Sem acesso</h1>
          <p className="mt-1 text-sm text-amber-800">
            {user.email} ainda não está vinculado a nenhum cliente.
          </p>
          <div className="mt-4">
            <LogoutButton />
          </div>
        </div>
        </div>
      );
    }
    const rel = (memberships[0] as { tenants: { slug: string } | { slug: string }[] })
      .tenants;
    const t = Array.isArray(rel) ? rel[0] : rel;
    redirect(`/admin/t/${t.slug}`);
  }

  // --- Platform admin (FozDev): visão de todos os clientes. ---
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, slug, name, status")
    .order("name");

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-slate-500">{user.email} · plataforma</p>
        </div>
        <LogoutButton />
      </div>

      <section>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">Slug</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(tenants ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    Nenhum cliente cadastrado.
                  </td>
                </tr>
              ) : (
                (tenants ?? []).map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-2 font-medium">{t.name}</td>
                    <td className="px-4 py-2 text-slate-500">{t.slug}</td>
                    <td className="px-4 py-2">{t.status}</td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/admin/t/${t.slug}`}
                        className="text-blue-600 hover:underline"
                      >
                        Acessar painel →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="max-w-md">
        <h2 className="mb-3 text-lg font-semibold">Novo cliente</h2>
        <form
          action={createTenantAction}
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-5"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Nome
            </label>
            <input
              name="name"
              required
              placeholder="Aquamania"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Slug (rota da loja)
            </label>
            <input
              name="slug"
              required
              placeholder="aquamania"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              E-mail do admin do cliente
            </label>
            <input
              name="email"
              type="email"
              placeholder="dono@cliente.com"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
            <p className="mt-1 text-xs text-slate-500">
              Vira owner do cliente automaticamente no 1º login.
            </p>
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800"
          >
            Criar cliente
          </button>
        </form>
      </section>
    </div>
  );
}
