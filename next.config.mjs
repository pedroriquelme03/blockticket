/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fixa a raiz do projeto (há outro lockfile na home do usuário).
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;
