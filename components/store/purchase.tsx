"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { sellingPrice, supplyLabel } from "@/lib/format";
import type { Product } from "@/lib/store-types";
import { useCart } from "./cart-provider";
import { PriceTag } from "./price";

export function Purchase({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [colorId, setColorId] = useState(product.colors[0]?.id ?? 0);
  const color = product.colors.find((entry) => entry.id === colorId) ?? product.colors[0];
  const [sizeId, setSizeId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [image, setImage] = useState(product.images[0]?.path ?? "");
  const [added, setAdded] = useState(false);
  const size = color?.sizes.find((entry) => entry.id === sizeId) ?? null;
  const maxQty = product.supplyType === "estoque" ? (size?.stockQty ?? 0) : 10;
  const unitPrice = sellingPrice(product.price, product.salePrice);
  const canAdd = Boolean(size) && maxQty > 0;

  const availableLabel = useMemo(() => {
    if (!size) {
      return "Escolha um tamanho";
    }

    if (product.supplyType === "sob_demanda") {
      return "Adicionar ao carrinho";
    }

    return size.stockQty > 0 ? "Adicionar ao carrinho" : "Sem estoque neste tamanho";
  }, [product.supplyType, size]);

  function addToCart() {
    if (!color || !size || !canAdd) {
      return;
    }

    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      image: product.images[0]?.path ?? null,
      colorId: color.id,
      colorName: color.name,
      sizeId: size.id,
      sizeLabel: size.label,
      unitPrice,
      quantity: Math.min(quantity, maxQty),
      supplyType: product.supplyType,
      maxQty,
    });
    setAdded(true);
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <div className="aspect-square bg-zinc-900">
          {image ? (
            <img src={image} alt={product.name} className="h-full w-full object-cover" />
          ) : null}
        </div>
        {product.images.length > 1 ? (
          <div className="mt-3 flex gap-2">
            {product.images.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setImage(item.path)}
                className={`h-16 w-16 overflow-hidden border ${image === item.path ? "border-[#f5c518]" : "border-white/15"}`}
              >
                <img src={item.path} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#f5c518]">
          {supplyLabel(product.supplyType)}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{product.name}</h1>
        <div className="mt-4">
          <PriceTag price={product.price} salePrice={product.salePrice} size="lg" />
        </div>
        {product.description ? (
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">{product.description}</p>
        ) : null}
        <fieldset className="mt-8">
          <legend className="text-sm text-white/60">Cor</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.colors.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setColorId(entry.id);
                  setSizeId(null);
                  setQuantity(1);
                  setAdded(false);
                }}
                className={`flex items-center gap-2 border px-3 py-2 text-sm ${
                  entry.id === color?.id ? "border-[#f5c518]" : "border-white/15"
                }`}
              >
                <span
                  className="h-4 w-4 rounded-full border border-white/30"
                  style={{ backgroundColor: entry.hex }}
                />
                {entry.name}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-6">
          <legend className="text-sm text-white/60">Tamanho</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {color?.sizes.map((entry) => {
              const disabled = product.supplyType === "estoque" && entry.stockQty === 0;
              return (
                <button
                  key={entry.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setSizeId(entry.id);
                    setQuantity(1);
                    setAdded(false);
                  }}
                  className={`h-11 min-w-11 border px-3 text-sm disabled:cursor-not-allowed disabled:text-white/25 ${
                    entry.id === sizeId ? "border-[#f5c518] text-[#f5c518]" : "border-white/15"
                  }`}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>
          {product.supplyType === "estoque" && size ? (
            <p className="mt-2 text-sm text-white/50">{size.stockQty} em estoque</p>
          ) : null}
        </fieldset>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="text-sm text-white/60" htmlFor="quantidade">
            Quantidade
          </label>
          <select
            id="quantidade"
            value={quantity}
            disabled={!canAdd}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="h-11 border border-white/20 bg-black px-3"
          >
            {Array.from({ length: Math.max(maxQty, 1) }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={addToCart}
          disabled={!canAdd}
          className="mt-6 h-12 w-full bg-[#f5c518] px-5 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
        >
          {availableLabel}
        </button>
        {added ? (
          <p className="mt-4 text-sm">
            Adicionado ao carrinho.{" "}
            <Link href="/carrinho" className="text-[#f5c518]">
              Ver carrinho
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
