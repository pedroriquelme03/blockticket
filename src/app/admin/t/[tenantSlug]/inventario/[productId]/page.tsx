import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminTenant } from "@/lib/auth";
import { formatBRL, formatDateBR } from "@/lib/format";
import { WEEKDAY_LABELS, formatWeekdays } from "@/lib/admin-helpers";
import {
  createVariantAction,
  deleteVariantAction,
  createRateRuleAction,
  deleteRateRuleAction,
  createAvailabilityRuleAction,
  deleteAvailabilityRuleAction,
} from "../actions";

export const dynamic = "force-dynamic";

// Checkboxes de dias da semana reutilizadas nos formulários.
function WeekdayChecks() {
  return (
    <div className="flex flex-wrap gap-2">
      {WEEKDAY_LABELS.map((label, i) => (
        <label
          key={i}
          className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
        >
          <input type="checkbox" name="weekdays" value={i} defaultChecked />
          {label}
        </label>
      ))}
    </div>
  );
}

export default async function ProductEditPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; productId: string }>;
}) {
  const { tenantSlug, productId } = await params;
  const tenant = await getAdminTenant(tenantSlug);
  if (!tenant) notFound();
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, name, slug, type, is_active")
    .eq("id", productId)
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!product) notFound();

  const [{ data: variants }, { data: rates }, { data: avail }] =
    await Promise.all([
      supabase
        .from("product_variants")
        .select("id, name, base_price_cents, sort_order")
        .eq("product_id", productId)
        .order("sort_order"),
      supabase
        .from("rate_rules")
        .select("id, variant_id, weekdays, valid_from, valid_to, price_cents, priority")
        .eq("product_id", productId)
        .order("priority", { ascending: false }),
      supabase
        .from("availability_rules")
        .select("id, weekdays, valid_from, valid_to, capacity")
        .eq("product_id", productId),
    ]);

  const variantName = (id: string | null) =>
    id ? variants?.find((v) => v.id === id)?.name ?? "—" : "Todas";

  const hidden = (
    <>
      <input type="hidden" name="tenant_id" value={tenant.id} />
      <input type="hidden" name="tenant_slug" value={tenantSlug} />
      <input type="hidden" name="product_id" value={productId} />
    </>
  );

  const period = (from: string | null, to: string | null) => {
    if (!from && !to) return "Sempre";
    if (from && to) return `${formatDateBR(from)} – ${formatDateBR(to)}`;
    if (from) return `A partir de ${formatDateBR(from)}`;
    return `Até ${formatDateBR(to!)}`;
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/admin/t/${tenantSlug}/inventario`}
          className="text-sm text-blue-600"
        >
          ← Produtos
        </Link>
        <h2 className="mt-2 text-xl font-bold">{product.name}</h2>
      </div>

      {/* ---- Variantes -------------------------------------------------- */}
      <section>
        <h3 className="mb-2 font-semibold">Tipos de ingresso (variantes)</h3>
        <p className="mb-3 text-sm text-slate-500">
          Cada tipo tem um preço-base. As tarifas por dia (abaixo) sobrescrevem
          esse preço em datas específicas.
        </p>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Preço-base</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(variants ?? []).length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-center text-slate-400">
                    Nenhuma variante.
                  </td>
                </tr>
              ) : (
                (variants ?? []).map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-2">{v.name}</td>
                    <td className="px-4 py-2">{formatBRL(v.base_price_cents)}</td>
                    <td className="px-4 py-2 text-right">
                      <form action={deleteVariantAction}>
                        {hidden}
                        <input type="hidden" name="id" value={v.id} />
                        <button className="text-xs text-red-600 hover:underline">
                          Remover
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
          action={createVariantAction}
          className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          {hidden}
          <div>
            <label className="block text-xs text-slate-500">Nome</label>
            <input
              name="name"
              required
              placeholder="Adulto"
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Preço-base (R$)</label>
            <input
              name="price"
              required
              placeholder="120,00"
              className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Adicionar variante
          </button>
        </form>
      </section>

      {/* ---- Tarifas por dia ------------------------------------------- */}
      <section>
        <h3 className="mb-2 font-semibold">Tarifas por dia</h3>
        <p className="mb-3 text-sm text-slate-500">
          Defina preços por dia da semana e/ou período (temporada). A regra de
          maior prioridade vence; sem regra, vale o preço-base da variante.
        </p>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Variante</th>
                <th className="px-4 py-2 font-medium">Dias</th>
                <th className="px-4 py-2 font-medium">Período</th>
                <th className="px-4 py-2 font-medium">Preço</th>
                <th className="px-4 py-2 font-medium">Prior.</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(rates ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-slate-400">
                    Nenhuma tarifa. Sem regras, vale o preço-base.
                  </td>
                </tr>
              ) : (
                (rates ?? []).map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2">{variantName(r.variant_id)}</td>
                    <td className="px-4 py-2">{formatWeekdays(r.weekdays)}</td>
                    <td className="px-4 py-2">{period(r.valid_from, r.valid_to)}</td>
                    <td className="px-4 py-2 font-medium">
                      {formatBRL(r.price_cents)}
                    </td>
                    <td className="px-4 py-2">{r.priority}</td>
                    <td className="px-4 py-2 text-right">
                      <form action={deleteRateRuleAction}>
                        {hidden}
                        <input type="hidden" name="id" value={r.id} />
                        <button className="text-xs text-red-600 hover:underline">
                          Remover
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
          action={createRateRuleAction}
          className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          {hidden}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-slate-500">Variante</label>
              <select
                name="variant_id"
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {(variants ?? []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500">Preço (R$)</label>
              <input
                name="price"
                required
                placeholder="150,00"
                className="mt-1 w-28 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500">De</label>
              <input
                type="date"
                name="valid_from"
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500">Até</label>
              <input
                type="date"
                name="valid_to"
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500">Prioridade</label>
              <input
                name="priority"
                type="number"
                defaultValue={0}
                className="mt-1 w-20 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500">Dias da semana</label>
            <div className="mt-1">
              <WeekdayChecks />
            </div>
          </div>
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Adicionar tarifa
          </button>
        </form>
      </section>

      {/* ---- Disponibilidade ------------------------------------------- */}
      <section>
        <h3 className="mb-2 font-semibold">Disponibilidade (capacidade)</h3>
        <p className="mb-3 text-sm text-slate-500">
          Quantas vagas por dia. Sem nenhuma regra, o produto não fica
          disponível para venda.
        </p>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Dias</th>
                <th className="px-4 py-2 font-medium">Período</th>
                <th className="px-4 py-2 font-medium">Capacidade</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(avail ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-slate-400">
                    Nenhuma regra de disponibilidade.
                  </td>
                </tr>
              ) : (
                (avail ?? []).map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2">{formatWeekdays(a.weekdays)}</td>
                    <td className="px-4 py-2">{period(a.valid_from, a.valid_to)}</td>
                    <td className="px-4 py-2">{a.capacity}</td>
                    <td className="px-4 py-2 text-right">
                      <form action={deleteAvailabilityRuleAction}>
                        {hidden}
                        <input type="hidden" name="id" value={a.id} />
                        <button className="text-xs text-red-600 hover:underline">
                          Remover
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
          action={createAvailabilityRuleAction}
          className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          {hidden}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-slate-500">Capacidade</label>
              <input
                name="capacity"
                type="number"
                required
                placeholder="500"
                className="mt-1 w-28 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500">De</label>
              <input
                type="date"
                name="valid_from"
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500">Até</label>
              <input
                type="date"
                name="valid_to"
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500">Dias da semana</label>
            <div className="mt-1">
              <WeekdayChecks />
            </div>
          </div>
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Adicionar disponibilidade
          </button>
        </form>
      </section>
    </div>
  );
}
