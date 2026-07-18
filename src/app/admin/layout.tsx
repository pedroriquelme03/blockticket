import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="font-bold text-white">
            Blockticket · Admin
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
