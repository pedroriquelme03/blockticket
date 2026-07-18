"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TENANT_SECTIONS, PROFILE_SECTION } from "@/lib/admin-sections";

export function TenantSidebar({
  tenantId,
  tenantName,
  subtitle,
  isPlatform,
}: {
  tenantId: string;
  tenantName: string;
  subtitle: string;
  isPlatform: boolean;
}) {
  const pathname = usePathname();
  const base = `/admin/t/${tenantId}`;

  const isActive = (key: string) => {
    const href = `${base}/${key}`;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const item = (key: string, label: string, icon: string, ready: boolean) => (
    <Link
      key={key}
      href={`${base}/${key}`}
      className={[
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
        isActive(key)
          ? "bg-slate-900 font-medium text-white"
          : "text-slate-600 hover:bg-slate-100",
      ].join(" ")}
    >
      <span className="text-base">{icon}</span>
      <span className="flex-1">{label}</span>
      {!ready && (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-400">
          em breve
        </span>
      )}
    </Link>
  );

  return (
    <aside className="w-56 shrink-0">
      <div className="sticky top-4 space-y-4">
        <div>
          {isPlatform && (
            <Link href="/admin" className="text-xs text-blue-600">
              ← Todos os clientes
            </Link>
          )}
          <Link href={base} className="mt-1 block">
            <h1 className="truncate text-lg font-bold text-slate-900">
              {tenantName}
            </h1>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </Link>
        </div>

        <nav className="space-y-0.5">
          {TENANT_SECTIONS.map((s) => item(s.key, s.label, s.icon, s.ready))}
        </nav>

        <div className="space-y-0.5 border-t border-slate-200 pt-3">
          {item(
            PROFILE_SECTION.key,
            PROFILE_SECTION.label,
            PROFILE_SECTION.icon,
            PROFILE_SECTION.ready
          )}
        </div>
      </div>
    </aside>
  );
}
