import Link from "next/link";
import { getCurrentTenant } from "@/lib/services/tenant";
import { listProducts } from "@/lib/services/catalog";

export const dynamic = "force-dynamic";

export default async function StoreHome() {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    return <p className="text-slate-600">Loja não encontrada.</p>;
  }

  const products = await listProducts(tenant.id);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Ingressos disponíveis</h1>
      {products.length === 0 ? (
        <p className="text-slate-600">Nenhum produto disponível no momento.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/produto/${p.slug}`}
              className="block rounded-lg border border-slate-200 bg-white p-5 transition hover:border-slate-400 hover:shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900">{p.name}</h2>
              {p.description && (
                <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                  {p.description}
                </p>
              )}
              <span className="mt-4 inline-block text-sm font-medium text-blue-600">
                Ver detalhes →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
