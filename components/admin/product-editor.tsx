"use client";

import { useActionState, useState } from "react";
import { saveProduct } from "@/app/admin/store-actions";
import { SHOE_SIZES, type Product } from "@/lib/store-types";

type ColorDraft = {
  key: string;
  name: string;
  hex: string;
  sizes: Record<string, string>;
};

type EditorState = {
  name: string;
  description: string;
  price: string;
  salePrice: string;
  supplyType: "estoque" | "sob_demanda";
  active: boolean;
  colors: ColorDraft[];
};

function moneyToInput(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function draftFromProduct(product?: Product): EditorState {
  if (!product) {
    return {
      name: "",
      description: "",
      price: "",
      salePrice: "",
      supplyType: "estoque",
      active: true,
      colors: [
        {
          key: "cor-1",
          name: "",
          hex: "#111111",
          sizes: { "40": "1", "41": "1", "42": "1" },
        },
      ],
    };
  }

  return {
    name: product.name,
    description: product.description,
    price: moneyToInput(product.price),
    salePrice: product.salePrice != null ? moneyToInput(product.salePrice) : "",
    supplyType: product.supplyType,
    active: product.active,
    colors: product.colors.map((color) => ({
      key: `cor-${color.id}`,
      name: color.name,
      hex: color.hex,
      sizes: Object.fromEntries(color.sizes.map((size) => [size.label, String(size.stockQty)])),
    })),
  };
}

export function ProductEditor({ product }: { product?: Product }) {
  const [state, action, pending] = useActionState(saveProduct, {});
  const [draft, setDraft] = useState<EditorState>(() => draftFromProduct(product));
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const images = (product?.images ?? []).filter((image) => !removedImageIds.includes(image.id));
  const payload = JSON.stringify({
    ...draft,
    removedImageIds,
    colors: draft.colors.map((color) => ({
      name: color.name,
      hex: color.hex,
      sizes: Object.entries(color.sizes).map(([label, stockQty]) => ({
        label,
        stockQty: Number(stockQty || 0),
      })),
    })),
  });

  function updateColor(key: string, patch: Partial<ColorDraft>) {
    setDraft((current) => ({
      ...current,
      colors: current.colors.map((color) => (color.key === key ? { ...color, ...patch } : color)),
    }));
  }

  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <input type="hidden" name="payload" value={payload} />
      <section className="grid gap-4">
        <label className="grid gap-2 text-sm">
          Modelo
          <input
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            className="h-11 border border-black/10 px-3 dark:border-white/15 dark:bg-transparent"
            required
          />
        </label>
        <label className="grid gap-2 text-sm">
          Descrição
          <textarea
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            rows={4}
            className="border border-black/10 px-3 py-2 dark:border-white/15 dark:bg-transparent"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm">
            Preço
            <input
              value={draft.price}
              onChange={(event) => setDraft({ ...draft, price: event.target.value })}
              inputMode="decimal"
              placeholder="499,90"
              className="h-11 border border-black/10 px-3 dark:border-white/15 dark:bg-transparent"
              required
            />
          </label>
          <label className="grid gap-2 text-sm">
            Preço com desconto
            <input
              value={draft.salePrice}
              onChange={(event) => setDraft({ ...draft, salePrice: event.target.value })}
              inputMode="decimal"
              placeholder="Opcional"
              className="h-11 border border-black/10 px-3 dark:border-white/15 dark:bg-transparent"
            />
          </label>
        </div>
        <fieldset className="grid gap-2 text-sm">
          <legend>Disponibilidade</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={draft.supplyType === "estoque"}
              onChange={() => setDraft({ ...draft, supplyType: "estoque" })}
            />
            Estoque
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={draft.supplyType === "sob_demanda"}
              onChange={() => setDraft({ ...draft, supplyType: "sob_demanda" })}
            />
            Pedido sob demanda
          </label>
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
          />
          Publicado na loja
        </label>
      </section>
      <section className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Cores e tamanhos</h2>
          <button
            type="button"
            className="h-10 border border-black/10 px-3 text-sm dark:border-white/15"
            onClick={() =>
              setDraft({
                ...draft,
                colors: [
                  ...draft.colors,
                  {
                    key: `cor-${Date.now()}`,
                    name: "",
                    hex: "#777777",
                    sizes: { "41": draft.supplyType === "estoque" ? "1" : "0" },
                  },
                ],
              })
            }
          >
            Adicionar cor
          </button>
        </div>
        {draft.colors.map((color) => (
          <article key={color.key} className="border border-black/10 p-4 dark:border-white/15">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="grid gap-2 text-sm">
                Cor
                <input
                  value={color.name}
                  onChange={(event) => updateColor(color.key, { name: event.target.value })}
                  placeholder="Preto"
                  className="h-11 border border-black/10 px-3 dark:border-white/15 dark:bg-transparent"
                />
              </label>
              <label className="grid gap-2 text-sm">
                Amostra
                <input
                  type="color"
                  value={color.hex}
                  onChange={(event) => updateColor(color.key, { hex: event.target.value })}
                  className="h-11 w-16 border border-black/10 bg-transparent"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {SHOE_SIZES.map((size) => {
                const selected = color.sizes[size] != null;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      const sizes = { ...color.sizes };
                      if (selected) {
                        delete sizes[size];
                      } else {
                        sizes[size] = draft.supplyType === "estoque" ? "1" : "0";
                      }
                      updateColor(color.key, { sizes });
                    }}
                    className={`h-10 min-w-10 border px-2 text-sm ${
                      selected
                        ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-black/15 dark:border-white/20"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
            {draft.supplyType === "estoque" ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {Object.keys(color.sizes)
                  .sort((a, b) => Number(a) - Number(b))
                  .map((size) => (
                    <label key={size} className="grid gap-1 text-sm">
                      Estoque {size}
                      <input
                        inputMode="numeric"
                        value={color.sizes[size]}
                        onChange={(event) =>
                          updateColor(color.key, {
                            sizes: { ...color.sizes, [size]: event.target.value },
                          })
                        }
                        className="h-10 border border-black/10 px-3 dark:border-white/15 dark:bg-transparent"
                      />
                    </label>
                  ))}
              </div>
            ) : null}
            {draft.colors.length > 1 ? (
              <button
                type="button"
                className="mt-4 text-sm text-red-600"
                onClick={() =>
                  setDraft({
                    ...draft,
                    colors: draft.colors.filter((entry) => entry.key !== color.key),
                  })
                }
              >
                Remover cor
              </button>
            ) : null}
          </article>
        ))}
      </section>
      <section className="grid gap-3">
        <h2 className="text-lg font-medium">Fotos do modelo</h2>
        {images.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {images.map((image) => (
              <figure key={image.id} className="w-28">
                <img src={image.path} alt="" className="aspect-square w-full object-cover" />
                <button
                  type="button"
                  className="mt-2 text-sm text-red-600"
                  onClick={() => setRemovedImageIds([...removedImageIds, image.id])}
                >
                  Remover
                </button>
              </figure>
            ))}
          </div>
        ) : null}
        <input
          name="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="text-sm"
        />
      </section>
      {state.message ? (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-12 w-fit bg-black px-6 font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {pending ? "Salvando…" : "Salvar tênis"}
      </button>
    </form>
  );
}
