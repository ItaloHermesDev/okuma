import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Purchase } from "@/components/store/purchase";
import { getPublicProduct } from "@/lib/store";

export default function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-white/60">Carregando tênis…</p>}>
      <ProductRoute params={params} />
    </Suspense>
  );
}

async function ProductRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getPublicProduct(slug);

  if (!product) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <Purchase product={product} />
    </main>
  );
}
