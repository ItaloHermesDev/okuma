import Link from "next/link";
import { Suspense } from "react";
import { formatBrl, sellingPrice, stockTotal, supplyLabel } from "@/lib/format";
import { getAdminCatalog } from "@/lib/store";

export const metadata = { title: "Tênis" };

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<p className="px-6 py-10">Carregando tênis…</p>}>
      <Products />
    </Suspense>
  );
}

async function Products() {
  const products = await getAdminCatalog();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Tênis</h1>
        <Link
          href="/admin/produtos/novo"
          className="inline-flex h-11 items-center bg-black px-4 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Novo tênis
        </Link>
      </div>
      <div className="mt-6 divide-y divide-black/10 border border-black/10 dark:divide-white/10 dark:border-white/10">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/admin/produtos/${product.id}`}
            className="flex items-center justify-between gap-4 px-4 py-4"
          >
            <span>
              <span className="block font-medium">{product.name}</span>
              <span className="text-sm text-zinc-500">
                {supplyLabel(product.supplyType)}
                {product.supplyType === "estoque" ? ` · ${stockTotal(product)} un.` : ""}
                {product.active ? "" : " · oculto"}
              </span>
            </span>
            <span>{formatBrl(sellingPrice(product.price, product.salePrice))}</span>
          </Link>
        ))}
        {products.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-500">Nenhum tênis cadastrado.</p>
        ) : null}
      </div>
    </main>
  );
}
