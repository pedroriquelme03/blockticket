import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  const images = Array.isArray(product.images) ? product.images : [];

  const supabase = await createClient();
  const { data: availRules } = await supabase
    .from("availability_rules")
    .select("session_times")
    .eq("product_id", product.id)
    .eq("is_active", true);

  const sessionTimes = Array.from(
    new Set(
      (availRules ?? []).flatMap((r) =>
        ((r.session_times as string[]) ?? []).map((t) =>
          String(t).length >= 5 ? String(t).slice(0, 5) : String(t)
        )
      )
    )
  ).sort();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/" className="text-sm text-blue-600">
        ← Voltar
      </Link>

      {images[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={images[0]}
          alt={product.name}
          className="mt-4 aspect-[16/9] w-full rounded-lg object-cover"
        />
      )}

      <h1 className="mt-4 text-2xl font-bold">{product.name}</h1>
      {product.description && (
        <p className="mt-2 text-slate-600">{product.description}</p>
      )}

      {images.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {images.slice(1).map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt=""
              className="h-20 w-20 shrink-0 rounded-md object-cover"
            />
          ))}
        </div>
      )}

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
        <BookingForm
          product={product}
          variants={variants}
          sessionTimes={sessionTimes}
        />
      </div>
    </div>
  );
}
