"use client";

import { useActionState } from "react";
import { checkInTicketAction } from "./actions";

type CheckInState = Awaited<ReturnType<typeof checkInTicketAction>> | null;

async function runCheckIn(
  _prev: CheckInState,
  formData: FormData
): Promise<CheckInState> {
  return checkInTicketAction(formData);
}

export function CheckInForm({
  tenantId,
  tenantSlug,
}: {
  tenantId: string;
  tenantSlug: string;
}) {
  const [state, action, pending] = useActionState(runCheckIn, null);

  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="tenant_id" value={tenantId} />
        <input type="hidden" name="tenant_slug" value={tenantSlug} />
        <div className="min-w-[240px] flex-1">
          <label className="block text-xs text-slate-500">
            Código do ingresso (QR ou digitado)
          </label>
          <input
            name="code"
            required
            autoFocus
            autoComplete="off"
            placeholder="Cole ou digite o código"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Validando…" : "Validar"}
        </button>
      </form>

      {state && (
        <div
          className={`rounded-lg border p-4 ${
            state.ok
              ? "border-green-200 bg-green-50 text-green-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {state.ok ? (
            <>
              <p className="font-semibold">Check-in OK</p>
              <p className="mt-1 text-sm">
                {state.ticket?.customer_name ?? "Cliente"} ·{" "}
                <span className="font-mono">{state.ticket?.code}</span>
              </p>
              {state.ticket?.visit_date && (
                <p className="text-sm text-green-800">
                  Visita: {state.ticket.visit_date}
                  {state.ticket.session_time
                    ? ` · ${String(state.ticket.session_time).slice(0, 5)}`
                    : ""}
                </p>
              )}
            </>
          ) : (
            <p className="font-semibold">
              {state.error === "not_found"
                ? "Ingresso não encontrado"
                : state.error === "already_used"
                  ? "Ingresso já utilizado"
                  : state.error === "cancelled"
                    ? "Ingresso cancelado"
                    : state.error === "empty"
                      ? "Informe o código"
                      : state.error ?? "Falha na validação"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
