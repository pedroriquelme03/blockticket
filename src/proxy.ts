import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Mantém a sessão do Supabase Auth atualizada nos cookies (necessário para o
// painel admin). Só roda nas rotas configuradas no matcher.
// (No Next 16 a convenção "middleware" virou "proxy".)
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
