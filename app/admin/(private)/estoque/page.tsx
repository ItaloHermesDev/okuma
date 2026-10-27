import Link from "next/link";
import { Suspense } from "react";
import { saveStock } from "@/app/admin/store-actions";
import { supplyLabel } from "@/lib/format";
import { getAdminCatalog } from "@/lib/store";

export const metadata = { title: "Estoque" };

export default function StockPage() {
  return (
    <Suspense fallback={<p className="px-6 py-10">Carregando estoque…</p>}>
      <Stock />
    </Suspense>
  );
}

async function Stock() {
  const products = await getAdminCatalog();
  const stocked = products.filter((product) => product.supplyType === "estoque");
  const demand = products.filter((product) => product.supplyType === "sob_demanda");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-8">
      <div>
        <h1 className="text-3xl font-semibold">Estoque</h1>
        <p className="mt-2 text-sm text-zinc-500">
          A quantidade vale para tênis de estoque. Sob demanda não baixa o saldo.
        </p>
      </div>
      <form action={saveStock} className="flex flex-col gap-4">
        {stocked.map((product) => (
          <section key={product.id} className="border border-black/10 dark:border-white/10">
            <h2 className="border-b border-black/10 px-4 py-3 font-medium dark:border-white/10">
              {product.name}
            </h2>
            {product.colors.map((color) => (
              <div key={color.id} className="px-4 py-3">
                <p className="text-sm text-zinc-500">{color.name}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  {color.sizes.map((size) => (
                    <label key={size.id} className="grid gap-1 text-sm">
                      {size.label}
                      <input
                        name={`qty-${size.id}`}
                        type="number"
                        min={0}
                        max={9999}
                        defaultValue={size.stockQty}
                        className="h-10 border border-black/10 px-3 dark:border-white/15 dark:bg-transparent"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
        {stocked.length > 0 ? (
          <button
            type="submit"
            className="h-11 w-fit bg-black px-4 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Salvar estoque
          </button>
        ) : (
          <p className="text-sm text-zinc-500">Nenhum tênis de estoque.</p>
        )}
      </form>
      <section>
        <h2 className="text-lg font-medium">Sob demanda</h2>
        <div className="mt-3 divide-y divide-black/10 border border-black/10 dark:divide-white/10 dark:border-white/10">
          {demand.map((product) => (
            <Link key={product.id} href={`/admin/produtos/${product.id}`} className="block px-4 py-3 text-sm">
              {product.name}
              <span className="ml-2 text-zinc-500">{supplyLabel(product.supplyType)}</span>
            </Link>
          ))}
          {demand.length === 0 ? <p className="px-4 py-4 text-sm text-zinc-500">Nenhum modelo sob demanda.</p> : null}
        </div>
      </section>
    </main>
  );
}
