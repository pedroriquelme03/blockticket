import Link from "next/link";
import { getTenantAccess } from "@/lib/auth";
import { TenantSidebar } from "@/components/admin/tenant-sidebar";

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
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h1 className="font-semibold text-red-900">Sem acesso</h1>
          <p className="mt-1 text-sm text-red-800">
            Você não tem permissão para gerenciar este cliente.
          </p>
          <Link href="/admin" className="mt-4 inline-block text-sm text-blue-600">
            ← Voltar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
      <TenantSidebar
        tenantId={tenantId}
        tenantName={tenant.name}
        subtitle={isPlatform ? "acesso plataforma" : (role ?? "")}
        isPlatform={isPlatform}
      />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
