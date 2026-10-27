import Link from "next/link";
import { coverImage, supplyLabel } from "@/lib/format";
import type { Product } from "@/lib/store-types";
import { PriceTag } from "./price";

export function ProductCard({ product }: { product: Product }) {
  const image = coverImage(product);

  return (
    <Link href={`/produtos/${product.slug}`} className="group block">
      <article>
        <div className="relative aspect-square overflow-hidden bg-zinc-900">
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="h-full w-full bg-zinc-800" />
          )}
          <span className="absolute left-3 top-3 bg-black/80 px-2 py-1 text-[11px] uppercase tracking-wide text-[#f5c518]">
            {supplyLabel(product.supplyType)}
          </span>
        </div>
        <div className="space-y-2 py-4">
          <h2 className="text-base font-medium">{product.name}</h2>
          {product.colors.length > 0 ? (
            <p className="flex items-center gap-2 text-sm text-white/60">
              {product.colors.map((color) => (
                <span
                  key={color.id}
                  title={color.name}
                  className="inline-block h-3 w-3 rounded-full border border-white/30"
                  style={{ backgroundColor: color.hex }}
                />
              ))}
              {product.colors.map((color) => color.name).join(" · ")}
            </p>
          ) : null}
          <PriceTag price={product.price} salePrice={product.salePrice} />
        </div>
      </article>
    </Link>
  );
}
