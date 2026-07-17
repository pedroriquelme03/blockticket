import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";

// Client com service role — SÓ no servidor, em operações confiáveis
// (ex.: confirmar pagamento simulando o webhook do PSP). Ignora RLS, por isso
// jamais deve ser importado em código que rode no browser.
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ausente. Preencha no .env.local para confirmar pagamentos."
    );
  }
  return createSupabaseClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
