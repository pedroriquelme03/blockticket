import Link from "next/link";
import { getCurrentTenant } from "@/lib/services/tenant";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getCurrentTenant();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold text-slate-900">
            {tenant?.name ?? "Blockticket"}
          </Link>
          <span className="text-sm text-slate-500">Ingressos & Reservas</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-slate-400">
        Powered by Blockticket · FozDev
      </footer>
    </div>
  );
}
