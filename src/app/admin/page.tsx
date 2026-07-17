import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/services/tenant";
import { formatBRL, formatDateBR } from "@/lib/format";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  pending_payment: "Aguardando pgto",
  paid: "Pago",
  partially_paid: "Parcial",
  cancelled: "Cancelado",
  expired: "Expirado",
  refunded: "Estornado",
};

export default async function AdminDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const tenant = await getCurrentTenant();
  if (!tenant) {
    return <p>Tenant não encontrado.</p>;
  }

  // Confere se o usuário é staff deste tenant (RLS também protege as queries).
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <h1 className="font-semibold text-amber-900">Sem acesso</h1>
        <p className="mt-1 text-sm text-amber-800">
          {user.email} não tem vínculo com {tenant.name}. Peça a um owner para
          adicionar você em <code>memberships</code>.
        </p>
        <div className="mt-4">
          <LogoutButton />
        </div>
      </div>
    );
  }

  const [{ data: products }, { data: orders }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, is_active")
      .eq("tenant_id", tenant.id)
      .order("name"),
    supabase
      .from("orders")
      .select("id, status, customer_name, total_cents, created_at")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tenant.name}</h1>
          <p className="text-sm text-slate-500">
            {user.email} · {membership.role}
          </p>
        </div>
        <LogoutButton />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Produtos</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(products ?? []).map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2">
                    {p.is_active ? "Ativo" : "Inativo"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Pedidos recentes</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Pedido</th>
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Data</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(orders ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Nenhum pedido ainda.
                  </td>
                </tr>
              ) : (
                (orders ?? []).map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-2 font-mono text-xs">
                      {o.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2">{o.customer_name ?? "—"}</td>
                    <td className="px-4 py-2">
                      {STATUS_LABEL[o.status] ?? o.status}
                    </td>
                    <td className="px-4 py-2">
                      {formatDateBR(o.created_at.slice(0, 10))}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {formatBRL(o.total_cents)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
