import Link from "next/link";
import { getCurrentTenant } from "@/lib/services/tenant";
import { CartProvider } from "@/lib/cart";
import { CartLink } from "./cart-link";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getCurrentTenant();

  return (
    <CartProvider>
      <div className="min-h-screen">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
            <Link href="/" className="text-lg font-bold text-slate-900">
              {tenant?.name ?? "Blockticket"}
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <CartLink />
              <span className="hidden text-slate-500 sm:inline">
                Ingressos & Reservas
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-slate-400">
          Powered by Blockticket · FozDev
        </footer>
      </div>
    </CartProvider>
  );
}
