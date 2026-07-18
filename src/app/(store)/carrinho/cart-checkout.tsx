"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatBRL, formatDateBR } from "@/lib/format";

export function CartCheckout() {
  const { lines, remove, clear } = useCart();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = lines.reduce(
    (s, l) => s + l.unit_price_cents * l.quantity,
    0
  );

  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) return;
    setSubmitting(true);
    setError(null);

    const items = lines.map(
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
      setError(json.error ?? "Falha ao reservar");
      setSubmitting(false);
      return;
    }
    clear();
    router.push(`/checkout/${json.orderId}`);
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-600">Seu carrinho está vazio.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-blue-600">
          ← Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {lines.map((l, i) => (
          <li key={i} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">
                {l.quantity}× {l.product_name} · {l.variant_name}
              </p>
              <p className="text-xs text-slate-500">
                {formatDateBR(l.visit_date)}
                {l.session_time
                  ? ` · ${String(l.session_time).slice(0, 5)}`
                  : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">
                {formatBRL(l.unit_price_cents * l.quantity)}
              </p>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-xs text-red-600 hover:underline"
              >
                Remover
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form
        onSubmit={checkout}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-5"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <input
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
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold">{formatBRL(total)}</p>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-40"
          >
            {submitting ? "Reservando…" : "Ir para pagamento"}
          </button>
        </div>
      </form>
    </div>
  );
}
