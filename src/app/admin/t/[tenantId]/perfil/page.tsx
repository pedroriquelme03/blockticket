import { getTenantAccess } from "@/lib/auth";
import { LogoutButton } from "@/app/admin/logout-button";

export const dynamic = "force-dynamic";

export default async function PerfilPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const { user, isPlatform, role } = await getTenantAccess(tenantId);

  const rows = [
    { label: "E-mail", value: user?.email ?? "—" },
    {
      label: "Acesso",
      value: isPlatform ? "Administrador da plataforma (FozDev)" : (role ?? "—"),
    },
  ];

  return (
    <div className="max-w-lg">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-2xl">👤</span>
        <h2 className="text-xl font-bold">Perfil</h2>
      </div>
      <p className="text-sm text-slate-600">Seus dados e sessão.</p>

      <div className="mt-6 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between px-4 py-3 text-sm">
            <span className="text-slate-500">{r.label}</span>
            <span className="font-medium text-slate-800">{r.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <LogoutButton />
      </div>
    </div>
  );
}
