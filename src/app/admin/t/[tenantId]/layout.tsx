import Link from "next/link";
import { getTenantAccess } from "@/lib/auth";
import { LogoutButton } from "../../logout-button";

export const dynamic = "force-dynamic";

export default async function TenantAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const { tenant, isPlatform, role, allowed } = await getTenantAccess(tenantId);

  if (!allowed || !tenant) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h1 className="font-semibold text-red-900">Sem acesso</h1>
        <p className="mt-1 text-sm text-red-800">
          Você não tem permissão para gerenciar este cliente.
        </p>
        <Link href="/admin" className="mt-4 inline-block text-sm text-blue-600">
          ← Voltar
        </Link>
      </div>
    );
  }

  const base = `/admin/t/${tenantId}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {isPlatform && (
            <Link href="/admin" className="text-xs text-blue-600">
              ← Todos os clientes
            </Link>
          )}
          <h1 className="text-2xl font-bold">{tenant.name}</h1>
          <p className="text-xs text-slate-500">
            {isPlatform ? "acesso plataforma" : role}
          </p>
        </div>
        <LogoutButton />
      </div>

      <nav className="flex gap-1 border-b border-slate-200 text-sm">
        <Link href={base} className="px-4 py-2 text-slate-600 hover:text-slate-900">
          Visão geral
        </Link>
        <Link
          href={`${base}/produtos`}
          className="px-4 py-2 text-slate-600 hover:text-slate-900"
        >
          Produtos & Tarifas
        </Link>
        <Link
          href={`${base}/pedidos`}
          className="px-4 py-2 text-slate-600 hover:text-slate-900"
        >
          Pedidos
        </Link>
      </nav>

      <div>{children}</div>
    </div>
  );
}
