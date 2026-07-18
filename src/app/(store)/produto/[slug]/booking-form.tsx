"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, formatDateBR } from "@/lib/format";
import type { Product, ProductVariant } from "@/lib/types";
import { useCart } from "@/lib/cart";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISO(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function todayISO() {
  const n = new Date();
  return toISO(n.getFullYear(), n.getMonth(), n.getDate());
}
function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toISO(d.getFullYear(), d.getMonth(), d.getDate());
}

function Calendar({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const [selY, selM] = value.split("-").map(Number);
  const [view, setView] = useState({ y: selY, m: selM - 1 });
  const today = todayISO();
  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  function shift(delta: number) {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  }

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          className="h-8 w-8 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
          aria-label="Mês anterior"
        >
          ‹
        </button>
        <span className="text-sm font-semibold capitalize text-slate-800">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={() => shift(1)}
          className="h-8 w-8 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
          aria-label="Próximo mês"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`b${i}`} />;
          const iso = toISO(view.y, view.m, day);
          const isPast = iso < today;
          const isSelected = iso === value;
          return (
            <button
              key={iso}
              type="button"
              disabled={isPast}
              onClick={() => onChange(iso)}
              className={[
                "aspect-square rounded-md text-sm transition",
                isSelected
                  ? "bg-blue-600 font-semibold text-white"
                  : isPast
                    ? "cursor-not-allowed text-slate-300"
                    : "text-slate-700 hover:bg-blue-50",
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BookingForm({
  product,
  variants,
  sessionTimes = [],
}: {
  product: Product;
  variants: ProductVariant[];
  sessionTimes?: string[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const needsSession = product.requires_session && sessionTimes.length > 0;

  const [date, setDate] = useState(tomorrowISO());
  const [session, setSession] = useState<string | null>(
    needsSession ? sessionTimes[0] ?? null : null
  );
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [remaining, setRemaining] = useState<number | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { add: addToCart } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    async function load() {
      const sessionParam = needsSession ? session : null;
      const [{ data: rem }, priceResults] = await Promise.all([
        supabase.rpc("get_remaining", {
          p_product: product.id,
          p_date: date,
          p_session: sessionParam,
        }),
        Promise.all(
          variants.map((v) =>
            supabase.rpc("resolve_price_cents", {
              p_product: product.id,
              p_variant: v.id,
              p_date: date,
              p_session: sessionParam,
            })
          )
        ),
      ]);
      if (!active) return;
      setRemaining(rem ?? 0);
      setPrices(
        Object.fromEntries(variants.map((v, i) => [v.id, priceResults[i].data ?? 0]))
      );
      setLoading(false);
    }
    load().catch((e) => {
      if (active) {
        setError(e.message);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [date, session, needsSession, product.id, variants, supabase]);

  const totalQty = Object.values(qty).reduce((a, b) => a + (b || 0), 0);
  const totalCents = variants.reduce(
    (sum, v) => sum + (prices[v.id] ?? 0) * (qty[v.id] ?? 0),
    0
  );
  const priceValues = variants
    .map((v) => prices[v.id])
    .filter((p): p is number => typeof p === "number" && p > 0);
  const fromPrice = priceValues.length ? Math.min(...priceValues) : 0;
  const soldOut = remaining !== null && remaining <= 0;

  function setVariantQty(id: string, value: number) {
    setQty((q) => ({ ...q, [id]: Math.max(0, value) }));
  }

  function buildItems() {
    return variants
      .filter((v) => (qty[v.id] ?? 0) > 0)
      .map((v) => ({
        product_id: product.id,
        variant_id: v.id,
        visit_date: date,
        session_time: needsSession ? session : null,
        quantity: qty[v.id],
        product_name: product.name,
        variant_name: v.name,
        unit_price_cents: prices[v.id] ?? 0,
      }));
  }

  function handleAddToCart() {
    setError(null);
    if (needsSession && !session) {
      setError("Selecione um horário.");
      return;
    }
    if (totalQty === 0) {
      setError("Selecione ao menos 1 ingresso.");
      return;
    }
    for (const line of buildItems()) addToCart(line);
    setQty({});
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (needsSession && !session) {
      setError("Selecione um horário.");
      return;
    }
    if (totalQty === 0) {
      setError("Selecione ao menos 1 ingresso.");
      return;
    }
    setSubmitting(true);

    const items = buildItems().map(
      ({ product_id, variant_id, visit_date, session_time, quantity }) => ({
        product_id,
        variant_id,
        visit_date,
        session_time,
        quantity,
      })
    );

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, customer: { name, email } }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Falha ao reservar.");
      setSubmitting(false);
      return;
    }
    router.push(`/checkout/${json.orderId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Data da visita
        </label>
        <Calendar value={date} onChange={setDate} />

        <div className="mt-3 flex items-center justify-between rounded-md bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium capitalize text-slate-800">
              {formatDateBR(date)}
            </p>
            <p className="text-xs text-slate-500">
              {loading
                ? "Verificando…"
                : soldOut
                  ? "Esgotado para esta data"
                  : `${remaining} vagas disponíveis`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">a partir de</p>
            <p className="text-lg font-bold text-slate-900">
              {loading ? "—" : formatBRL(fromPrice)}
            </p>
          </div>
        </div>
      </div>

      {needsSession && (
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Horário
          </label>
          <div className="flex flex-wrap gap-2">
            {sessionTimes.map((t) => {
              const label = t.slice(0, 5);
              const selected = session === t || session === label;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSession(t.length === 5 ? `${t}:00` : t)}
                  className={[
                    "rounded-md border px-3 py-2 text-sm",
                    selected
                      ? "border-blue-600 bg-blue-50 font-semibold text-blue-700"
                      : "border-slate-300 text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {variants.map((v) => (
          <div
            key={v.id}
            className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3"
          >
            <div>
              <p className="font-medium text-slate-800">{v.name}</p>
              <p className="text-sm text-slate-500">
                {loading ? "—" : formatBRL(prices[v.id] ?? 0)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVariantQty(v.id, (qty[v.id] ?? 0) - 1)}
                className="h-8 w-8 rounded-md border border-slate-300 text-lg leading-none"
              >
                −
              </button>
              <span className="w-8 text-center">{qty[v.id] ?? 0}</span>
              <button
                type="button"
                onClick={() => setVariantQty(v.id, (qty[v.id] ?? 0) + 1)}
                disabled={soldOut}
                className="h-8 w-8 rounded-md border border-slate-300 text-lg leading-none disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          required
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2"
        />
        <input
          type="email"
          required
          placeholder="Seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Total ({totalQty} ingressos)</p>
          <p className="text-xl font-bold">{formatBRL(totalCents)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={soldOut || totalQty === 0}
            className="rounded-md border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40"
          >
            {added ? "Adicionado!" : "Adicionar ao carrinho"}
          </button>
          <button
            type="submit"
            disabled={submitting || soldOut || totalQty === 0}
            className="rounded-md bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40"
          >
            {submitting ? "Reservando…" : "Reservar agora"}
          </button>
        </div>
      </div>
    </form>
  );
}
