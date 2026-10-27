import { Suspense } from "react";
import { ProductCard } from "@/components/store/product-card";
import { searchPublicProducts } from "@/lib/store";
import type { SupplyType } from "@/lib/store-types";

export const metadata = { title: "Tênis" };

export default function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string }>;
}) {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-white/60">Carregando tênis…</p>}>
      <Catalog searchParams={searchParams} />
    </Suspense>
  );
}

async function Catalog({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string }>;
}) {
  const params = await searchParams;
  const supply = params.tipo === "estoque" || params.tipo === "sob_demanda" ? params.tipo : undefined;
  const products = await searchPublicProducts(params.q ?? "", supply as SupplyType | undefined);
  const title = supply === "estoque" ? "Estoque" : supply === "sob_demanda" ? "Sob demanda" : "Tênis";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold">{title}</h1>
      {params.q ? <p className="mt-2 text-white/60">Busca por “{params.q}”</p> : null}
      {products.length === 0 ? (
        <p className="mt-8 text-white/60">Nenhum tênis encontrado.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
