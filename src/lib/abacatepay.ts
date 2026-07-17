// Cliente da API do AbacatePay (PIX transparente). SÓ no servidor.
// Docs: https://docs.abacatepay.com/pages/transparents/create
const BASE_URL = "https://api.abacatepay.com/v2";

function apiKey(): string {
  const key = process.env.ABACATEPAY_API_KEY;
  if (!key) {
    throw new Error("ABACATEPAY_API_KEY ausente. Configure no .env.local.");
  }
  return key;
}

export interface PixCharge {
  id: string; // pix_char_...
  amount: number; // centavos
  status: string; // PENDING | PAID | ...
  brCode: string; // copia e cola
  brCodeBase64: string; // imagem do QR (data URL)
  expiresAt: string;
}

interface CreatePixParams {
  amountCents: number;
  description?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
  customer?: { name: string; email: string; taxId: string; cellphone: string };
  expiresIn?: number; // segundos
}

// Cria uma cobrança PIX com valor inline (sem pré-cadastrar produtos).
export async function createPixCharge(params: CreatePixParams): Promise<PixCharge> {
  const res = await fetch(`${BASE_URL}/transparents/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      method: "PIX",
      data: {
        amount: params.amountCents,
        description: params.description,
        expiresIn: params.expiresIn ?? 3600,
        externalId: params.externalId,
        metadata: params.metadata,
        ...(params.customer ? { customer: params.customer } : {}),
      },
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || `AbacatePay respondeu ${res.status}`);
  }
  return json.data as PixCharge;
}
