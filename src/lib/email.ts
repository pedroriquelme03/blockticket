// E-mail transacional via Resend. Sem RESEND_API_KEY, só loga (dev).
// Docs: https://resend.com/docs/api-reference/emails/send-email

const FROM = process.env.EMAIL_FROM ?? "BlockTicket <onboarding@resend.dev>";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

async function send(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY ausente — e-mail não enviado:", params.subject, "→", params.to);
    return { ok: false, error: "email_not_configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[email] falha Resend", res.status, body);
    return { ok: false, error: body || `status_${res.status}` };
  }
  return { ok: true };
}

function qrImgUrl(code: string): string {
  const data = encodeURIComponent(code);
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${data}`;
}

export interface TicketEmailPayload {
  to: string;
  customerName: string | null;
  orderId: string;
  tenantName: string;
  tickets: { code: string; visit_date: string | null; session_time: string | null }[];
  itemsSummary: string;
}

export async function sendTicketsEmail(
  payload: TicketEmailPayload
): Promise<{ ok: boolean; error?: string }> {
  if (!payload.to) return { ok: false, error: "no_recipient" };

  const ticketsHtml = payload.tickets
    .map(
      (t) => `
      <div style="margin:16px 0;padding:16px;border:1px solid #e2e8f0;border-radius:8px;text-align:center">
        <img src="${qrImgUrl(t.code)}" alt="QR ${t.code}" width="180" height="180" />
        <p style="font-family:monospace;font-size:14px;margin:8px 0 0">${t.code}</p>
        ${t.visit_date ? `<p style="color:#64748b;font-size:13px;margin:4px 0 0">Visita: ${t.visit_date}${t.session_time ? ` · ${t.session_time.slice(0, 5)}` : ""}</p>` : ""}
      </div>`
    )
    .join("");

  return send({
    to: payload.to,
    subject: `Seus ingressos — ${payload.tenantName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
        <h1 style="font-size:20px">Olá${payload.customerName ? `, ${payload.customerName}` : ""}!</h1>
        <p>Sua compra em <strong>${payload.tenantName}</strong> está confirmada.</p>
        <p style="color:#64748b;font-size:14px">Pedido #${payload.orderId.slice(0, 8)} · ${payload.itemsSummary}</p>
        <h2 style="font-size:16px;margin-top:24px">Seus ingressos</h2>
        ${ticketsHtml}
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">Apresente o QR na entrada. Guarde este e-mail.</p>
      </div>`,
  });
}

export async function sendMemberInviteEmail(params: {
  to: string;
  tenantName: string;
  role: string;
  signupUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  return send({
    to: params.to,
    subject: `Convite para ${params.tenantName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
        <h1 style="font-size:20px">Você foi convidado</h1>
        <p>Você foi adicionado como <strong>${params.role}</strong> em <strong>${params.tenantName}</strong>.</p>
        <p>Se ainda não tem conta, crie em:</p>
        <p><a href="${params.signupUrl}">${params.signupUrl}</a></p>
      </div>`,
  });
}
