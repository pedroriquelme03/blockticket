import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Client para Server Components e Route Handlers. Carrega a sessão do usuário
// a partir dos cookies (contexto anon quando não há login). Respeita RLS.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Chamado de um Server Component: ignorável quando há middleware
          // cuidando do refresh da sessão.
        }
      },
    },
  });
}
