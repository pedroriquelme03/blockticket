import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminTenant } from "@/lib/auth";
import { formatBRL, formatDateBR } from "@/lib/format";
import {
  createCouponAction,
  toggleCouponAction,
  deleteCouponAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function ComercialPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getAdminTenant(tenantSlug);
  if (!tenant) notFound();
  const supabase = await createClient();

  const { data: coupons, error } = await supabase
    .from("coupons")
    .select(
      "id, code, type, value, max_uses, used_count, min_order_cents, valid_from, valid_to, is_active"
    )
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  const migrationPending = Boolean(error);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Comercial · Cupons</h2>
        <p className="text-sm text-slate-500">
          Cupons de desconto. Aplique no checkout da loja (campo Cupom). Canais,
          campanhas e PDV virão em seguida.
        </p>
      </div>

      {migrationPending && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Rode a migration <code>0015_operations_coupons_storage.sql</code> no
          Supabase para ativar cupons.
        </div>
      )}

      {!migrationPending && (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Código</th>
                  <th className="px-4 py-2 font-medium">Desconto</th>
                  <th className="px-4 py-2 font-medium">Usos</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(coupons ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-slate-400"
                    >
                      Nenhum cupom.
                    </td>
                  </tr>
                ) : (
                  (coupons ?? []).map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2 font-mono font-medium">
                        {c.code}
                      </td>
                      <td className="px-4 py-2">
                        {c.type === "percent"
                          ? `${c.value}%`
                          : formatBRL(c.value)}
                        {c.min_order_cents > 0 && (
                          <span className="block text-xs text-slate-400">
                            mín. {formatBRL(c.min_order_cents)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {c.used_count}
                        {c.max_uses != null ? ` / ${c.max_uses}` : ""}
                      </td>
                      <td className="px-4 py-2">
                        {c.is_active ? "Ativo" : "Inativo"}
                        {c.valid_to && (
                          <span className="block text-xs text-slate-400">
                            até {formatDateBR(c.valid_to.slice(0, 10))}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right space-x-2">
                        <form action={toggleCouponAction} className="inline">
                          <input
                            type="hidden"
                            name="tenant_slug"
                            value={tenantSlug}
                          />
                          <input type="hidden" name="id" value={c.id} />
                          <input
                            type="hidden"
                            name="is_active"
                            value={String(c.is_active)}
                          />
                          <button className="text-xs text-blue-600 hover:underline">
                            {c.is_active ? "Desativar" : "Ativar"}
                          </button>
                        </form>
                        <form action={deleteCouponAction} className="inline">
                          <input
                            type="hidden"
                            name="tenant_slug"
                            value={tenantSlug}
                          />
                          <input type="hidden" name="id" value={c.id} />
                          <button className="text-xs text-red-600 hover:underline">
                            Excluir
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <form
            action={createCouponAction}
            className="max-w-lg space-y-3 rounded-lg border border-slate-200 bg-white p-5"
          >
            <h3 className="font-semibold">Novo cupom</h3>
            <input type="hidden" name="tenant_id" value={tenant.id} />
            <input type="hidden" name="tenant_slug" value={tenantSlug} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-500">Código</label>
                <input
                  name="code"
                  required
                  placeholder="VERAO20"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">Tipo</label>
                <select
                  name="type"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="percent">Percentual (%)</option>
                  <option value="fixed">Valor fixo (R$)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500">
                  Valor (% ou R$)
                </label>
                <input
                  name="value"
                  required
                  placeholder="20 ou 50,00"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">
                  Máx. usos (opcional)
                </label>
                <input
                  name="max_uses"
                  type="number"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">
                  Pedido mínimo (R$)
                </label>
                <input
                  name="min_order"
                  placeholder="0"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">Válido de</label>
                <input
                  type="date"
                  name="valid_from"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">Válido até</label>
                <input
                  type="date"
                  name="valid_to"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Criar cupom
            </button>
          </form>
        </>
      )}
    </div>
  );
}
