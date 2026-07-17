"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Pix {
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
}

export function PixPayment({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pix, setPix] = useState<Pix | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/payments/pix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Falha ao gerar o PIX.");
      return;
    }
    setPix(json);
  }

  // Enquanto o PIX estiver na tela, verifica o status do pedido a cada 4s.
  useEffect(() => {
    if (!pix) return;
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/orders/${orderId}/status`);
      if (!res.ok) return;
      const { status } = await res.json();
      if (status === "paid") {
        if (pollRef.current) clearInterval(pollRef.current);
        router.push(`/pedido/${orderId}`);
      }
    }, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pix, orderId, router]);

  async function copy() {
    if (!pix) return;
    await navigator.clipboard.writeText(pix.brCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!pix) {
    return (
      <div>
        <button
          onClick={generate}
          disabled={loading}
          className="w-full rounded-md bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-40"
        >
          {loading ? "Gerando PIX…" : "Pagar com PIX"}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={pix.brCodeBase64}
        alt="QR Code PIX"
        className="mx-auto h-56 w-56 rounded-lg border border-slate-200"
      />
      <p className="mt-4 text-sm text-slate-600">
        Escaneie o QR Code ou copie o código abaixo:
      </p>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 truncate rounded-md bg-slate-100 px-3 py-2 text-left text-xs">
          {pix.brCode}
        </code>
        <button
          onClick={copy}
          className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
        >
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
        Aguardando confirmação do pagamento…
      </p>
    </div>
  );
}
