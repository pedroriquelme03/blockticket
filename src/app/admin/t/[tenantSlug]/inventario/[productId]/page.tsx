import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminTenant } from "@/lib/auth";
import { formatBRL, formatDateBR } from "@/lib/format";
import { WEEKDAY_LABELS, formatWeekdays } from "@/lib/admin-helpers";
import {
  updateProductAction,
  deleteProductAction,
  uploadProductImageAction,
  removeProductImageAction,
  createVariantAction,
  updateVariantAction,
  deleteVariantAction,
  reorderVariantsAction,
  createRateRuleAction,
  updateRateRuleAction,
  deleteRateRuleAction,
  createAvailabilityRuleAction,
  deleteAvailabilityRuleAction,
  createExceptionAction,
  deleteExceptionAction,
} from "../actions";

export const dynamic = "force-dynamic";

function WeekdayChecks({ selected }: { selected?: number[] }) {
  const set = selected ? new Set(selected) : null;
  return (
    <div className="flex flex-wrap gap-2">
      {WEEKDAY_LABELS.map((label, i) => (
        <label
          key={i}
          className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
        >
          <input
            type="checkbox"
            name="weekdays"
            value={i}
            defaultChecked={set ? set.has(i) : true}
          />
          {label}
        </label>
      ))}
    </div>
  );
}

function centsToBRLInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
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
    .select(
      "id, name, slug, type, description, is_active, requires_session, images"
    )
    .eq("id", productId)
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!product) notFound();

  const [{ data: variants }, { data: rates }, { data: avail }, { data: exceptions }] =
    await Promise.all([
      supabase
        .from("product_variants")
        .select("id, name, base_price_cents, sort_order, is_active")
        .eq("product_id", productId)
        .order("sort_order"),
      supabase
        .from("rate_rules")
        .select(
          "id, variant_id, weekdays, valid_from, valid_to, price_cents, priority, session_time"
        )
        .eq("product_id", productId)
        .order("priority", { ascending: false }),
      supabase
        .from("availability_rules")
        .select("id, weekdays, valid_from, valid_to, capacity, session_times")
        .eq("product_id", productId),
      supabase
        .from("availability_exceptions")
        .select("id, date, is_closed, capacity_override, note")
        .eq("product_id", productId)
        .order("date", { ascending: false }),
    ]);

  const images = Array.isArray(product.images) ? (product.images as string[]) : [];
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/admin/t/${tenantSlug}/inventario`}
            className="text-sm text-blue-600"
          >
            ← Produtos
          </Link>
          <h2 className="mt-2 text-xl font-bold">{product.name}</h2>
        </div>
        <form action={deleteProductAction}>
          <input type="hidden" name="tenant_slug" value={tenantSlug} />
          <input type="hidden" name="id" value={productId} />
          <button className="text-sm text-red-600 hover:underline">
            Excluir produto
          </button>
        </form>
      </div>

      {/* ---- Dados do produto ---------------------------------------- */}
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold">Dados do produto</h3>
        <form action={updateProductAction} className="space-y-3">
          {hidden}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-slate-500">Nome</label>
              <input
                name="name"
                required
                defaultValue={product.name}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500">Slug</label>
              <input
                name="slug"
                defaultValue={product.slug}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500">Tipo</label>
              <select
                name="type"
                defaultValue={product.type}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="ticket">Ingresso</option>
                <option value="table_reservation">Reserva de mesa</option>
                <option value="package">Pacote</option>
              </select>
            </div>
            <div className="flex flex-col justify-end gap-2 pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={product.is_active}
                />
                Ativo na loja
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="requires_session"
                  defaultChecked={product.requires_session}
                />
                Exige escolha de horário/sessão
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500">Descrição</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={product.description ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Salvar produto
          </button>
        </form>
      </section>

      {/* ---- Imagens ------------------------------------------------- */}
      <section>
        <h3 className="mb-2 font-semibold">Imagens</h3>
        <div className="mb-3 flex flex-wrap gap-3">
          {images.length === 0 && (
            <p className="text-sm text-slate-400">Nenhuma imagem.</p>
          )}
          {images.map((url) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-24 w-24 rounded-md border border-slate-200 object-cover"
              />
              <form action={removeProductImageAction} className="mt-1">
                {hidden}
                <input type="hidden" name="url" value={url} />
                <button className="text-xs text-red-600 hover:underline">
                  Remover
                </button>
              </form>
            </div>
          ))}
        </div>
        <form
          action={uploadProductImageAction}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          {hidden}
          <div>
            <label className="block text-xs text-slate-500">
              Nova imagem (até 5 MB)
            </label>
            <input
              type="file"
              name="image"
              accept="image/jpeg,image/png,image/webp,image/gif"
              required
              className="mt-1 text-sm"
            />
          </div>
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Enviar
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-400">
          Requer bucket <code>product-images</code> (migration 0015).
        </p>
      </section>

      {/* ---- Variantes ----------------------------------------------- */}
      <section>
        <h3 className="mb-2 font-semibold">Tipos de ingresso (variantes)</h3>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Ordem</th>
                <th className="px-4 py-2 font-medium">Nome / preço</th>
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
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <form action={reorderVariantsAction}>
                          {hidden}
                          <input type="hidden" name="id" value={v.id} />
                          <input type="hidden" name="direction" value="up" />
                          <button className="rounded border px-1.5 text-xs">↑</button>
                        </form>
                        <form action={reorderVariantsAction}>
                          {hidden}
                          <input type="hidden" name="id" value={v.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button className="rounded border px-1.5 text-xs">↓</button>
                        </form>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <form
                        action={updateVariantAction}
                        className="flex flex-wrap items-end gap-2"
                      >
                        {hidden}
                        <input type="hidden" name="id" value={v.id} />
                        <input
                          name="name"
                          defaultValue={v.name}
                          required
                          className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm"
                        />
                        <input
                          name="price"
                          defaultValue={centsToBRLInput(v.base_price_cents)}
                          required
                          className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                        />
                        <button className="text-xs text-blue-600 hover:underline">
                          Salvar
                        </button>
                      </form>
                    </td>
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
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Adicionar variante
          </button>
        </form>
      </section>

      {/* ---- Tarifas ------------------------------------------------- */}
      <section>
        <h3 className="mb-2 font-semibold">Tarifas por dia</h3>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Regra</th>
                <th className="px-4 py-2 font-medium">Editar</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(rates ?? []).length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-center text-slate-400">
                    Nenhuma tarifa. Sem regras, vale o preço-base.
                  </td>
                </tr>
              ) : (
                (rates ?? []).map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {variantName(r.variant_id)} · {formatWeekdays(r.weekdays)} ·{" "}
                      {period(r.valid_from, r.valid_to)} · prior. {r.priority}
                    </td>
                    <td className="px-4 py-2">
                      <form
                        action={updateRateRuleAction}
                        className="flex flex-wrap items-end gap-2"
                      >
                        {hidden}
                        <input type="hidden" name="id" value={r.id} />
                        <select
                          name="variant_id"
                          defaultValue={r.variant_id ?? ""}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        >
                          <option value="">Todas</option>
                          {(variants ?? []).map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                        <input
                          name="price"
                          defaultValue={centsToBRLInput(r.price_cents)}
                          required
                          className="w-20 rounded-md border border-slate-300 px-2 py-1 text-xs"
                        />
                        <input
                          type="date"
                          name="valid_from"
                          defaultValue={r.valid_from ?? ""}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        />
                        <input
                          type="date"
                          name="valid_to"
                          defaultValue={r.valid_to ?? ""}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        />
                        <input
                          name="priority"
                          type="number"
                          defaultValue={r.priority}
                          className="w-14 rounded-md border border-slate-300 px-2 py-1 text-xs"
                        />
                        <div className="w-full">
                          <WeekdayChecks selected={r.weekdays} />
                        </div>
                        <button className="text-xs text-blue-600 hover:underline">
                          Salvar
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-2 text-right align-top">
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
              <label className="block text-xs text-slate-500">Horário</label>
              <input
                type="time"
                name="session_time"
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
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
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Adicionar tarifa
          </button>
        </form>
      </section>

      {/* ---- Disponibilidade ----------------------------------------- */}
      <section>
        <h3 className="mb-2 font-semibold">Disponibilidade (capacidade)</h3>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Dias</th>
                <th className="px-4 py-2 font-medium">Período</th>
                <th className="px-4 py-2 font-medium">Horários</th>
                <th className="px-4 py-2 font-medium">Capacidade</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(avail ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-slate-400">
                    Nenhuma regra de disponibilidade.
                  </td>
                </tr>
              ) : (
                (avail ?? []).map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2">{formatWeekdays(a.weekdays)}</td>
                    <td className="px-4 py-2">{period(a.valid_from, a.valid_to)}</td>
                    <td className="px-4 py-2">
                      {(a.session_times ?? []).length
                        ? (a.session_times as string[])
                            .map((t) => String(t).slice(0, 5))
                            .join(", ")
                        : "Dia inteiro"}
                    </td>
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
            <div className="min-w-[200px] flex-1">
              <label className="block text-xs text-slate-500">
                Horários (ex.: 10:00, 14:00) — vazio = dia inteiro
              </label>
              <input
                name="session_times"
                placeholder="10:00, 14:00, 16:00"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Adicionar disponibilidade
          </button>
        </form>
      </section>

      {/* ---- Exceções ------------------------------------------------ */}
      <section>
        <h3 className="mb-2 font-semibold">Exceções (feriados / fechamentos)</h3>
        <p className="mb-3 text-sm text-slate-500">
          Fecha o produto numa data ou define capacidade especial.
        </p>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Data</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Nota</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(exceptions ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-slate-400">
                    Nenhuma exceção.
                  </td>
                </tr>
              ) : (
                (exceptions ?? []).map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-2">{formatDateBR(e.date)}</td>
                    <td className="px-4 py-2">
                      {e.is_closed
                        ? "Fechado"
                        : `Capacidade ${e.capacity_override ?? "—"}`}
                    </td>
                    <td className="px-4 py-2 text-slate-500">{e.note ?? "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <form action={deleteExceptionAction}>
                        {hidden}
                        <input type="hidden" name="id" value={e.id} />
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
          action={createExceptionAction}
          className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          {hidden}
          <div>
            <label className="block text-xs text-slate-500">Data</label>
            <input
              type="date"
              name="date"
              required
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_closed" defaultChecked />
            Fechado
          </label>
          <div>
            <label className="block text-xs text-slate-500">
              Capacidade especial (se não fechado)
            </label>
            <input
              name="capacity_override"
              type="number"
              className="mt-1 w-28 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Nota</label>
            <input
              name="note"
              placeholder="Feriado"
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Adicionar exceção
          </button>
        </form>
      </section>
    </div>
  );
}
