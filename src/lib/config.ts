// Configuração central. No MVP a loja é single-tenant (Aquamania), mas o slug
// vem de env para já suportar multi-tenant (subdomínio/rota por tenant depois).
export const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? "aquamania";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
