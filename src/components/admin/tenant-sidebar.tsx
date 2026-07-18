"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { TENANT_SECTIONS, PROFILE_SECTION } from "@/lib/admin-sections";

export function TenantSidebar({
  tenantSlug,
  tenantName,
  subtitle,
  isPlatform,
}: {
  tenantSlug: string;
  tenantName: string;
  subtitle: string;
  isPlatform: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const base = `/admin/t/${tenantSlug}`;

  const isActive = (key: string) => {
    const href = `${base}/${key}`;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const item = (key: string, label: string, icon: string, ready: boolean) => (
    <Link
      key={key}
      href={`${base}/${key}`}
      onClick={() => setOpen(false)}
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

  const nav = (
    <div className="space-y-4">
      <div>
        {isPlatform && (
          <Link href="/admin" className="text-xs text-blue-600">
            ← Todos os clientes
          </Link>
        )}
        <Link href={base} className="mt-1 block" onClick={() => setOpen(false)}>
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
  );

  return (
    <>
      <div className="flex items-center justify-between lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium"
        >
          Menu
        </button>
        <span className="truncate text-sm font-semibold">{tenantName}</span>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 overflow-y-auto bg-white p-4 shadow-xl">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-slate-500"
              >
                Fechar
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-4">{nav}</div>
      </aside>
    </>
  );
}
