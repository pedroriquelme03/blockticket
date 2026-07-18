import Link from "next/link";
import { getCurrentTenant } from "@/lib/services/tenant";
import { listProducts } from "@/lib/services/catalog";
import { ProductSearch } from "./product-search";

export const dynamic = "force-dynamic";

export default async function StoreHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const tenant = await getCurrentTenant();
  if (!tenant) {
    return <p className="text-slate-600">Loja não encontrada.</p>;
  }

  const products = await listProducts(tenant.id);
  const query = (q ?? "").trim().toLowerCase();
  const filtered = query
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.description ?? "").toLowerCase().includes(query)
      )
    : products;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-bold">Ingressos disponíveis</h1>
        <ProductSearch initialQuery={q ?? ""} />
      </div>

      {filtered.length === 0 ? (
        <p className="text-slate-600">
          {query
            ? "Nenhum produto encontrado para essa busca."
            : "Nenhum produto disponível no momento."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const img = Array.isArray(p.images) ? p.images[0] : null;
            return (
              <Link
                key={p.id}
                href={`/produto/${p.slug}`}
                className="block overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-slate-400 hover:shadow-sm"
              >
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt=""
                    className="aspect-[16/10] w-full object-cover"
                  />
                ) : (
                  <div className="aspect-[16/10] w-full bg-slate-100" />
                )}
                <div className="p-5">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {p.name}
                  </h2>
                  {p.description && (
                    <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                      {p.description}
                    </p>
                  )}
                  <span className="mt-4 inline-block text-sm font-medium text-blue-600">
                    Ver detalhes →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
