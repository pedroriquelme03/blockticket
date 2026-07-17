import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentTenant } from "@/lib/services/tenant";
import { getProductBySlug } from "@/lib/services/catalog";
import { BookingForm } from "./booking-form";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();

  const data = await getProductBySlug(tenant.id, slug);
  if (!data) notFound();

  const { product, variants } = data;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/" className="text-sm text-blue-600">
        ← Voltar
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{product.name}</h1>
      {product.description && (
        <p className="mt-2 text-slate-600">{product.description}</p>
      )}

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
        <BookingForm product={product} variants={variants} />
      </div>
    </div>
  );
}
