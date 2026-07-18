import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminTenant } from "@/lib/auth";
import { formatBRL } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TenantDashboard({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getAdminTenant(tenantSlug);
  if (!tenant) notFound();

  const supabase = await createClient();

  const [{ count: productCount }, { count: orderCount }, { data: paidAgg }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id),
      supabase
        .from("orders")
        .select("paid_cents")
        .eq("tenant_id", tenant.id)
        .eq("status", "paid"),
    ]);

  const revenue = (paidAgg ?? []).reduce(
    (sum, o) => sum + (o.paid_cents ?? 0),
    0
  );

  const cards = [
    { label: "Produtos", value: String(productCount ?? 0) },
    { label: "Pedidos", value: String(orderCount ?? 0) },
    { label: "Receita (paga)", value: formatBRL(revenue) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-slate-200 bg-white p-5"
          >
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Link
          href={`/admin/t/${tenantSlug}/inventario`}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Gerenciar produtos e tarifas
        </Link>
        <Link
          href={`/admin/t/${tenantSlug}/operacoes`}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Ver pedidos
        </Link>
      </div>
    </div>
  );
}
