"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { placeOrder } from "@/app/(loja)/actions";
import { formatBrl, supplyLabel } from "@/lib/format";
import { useCart } from "./cart-provider";

export function CartView() {
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  function submit(formData: FormData) {
    formData.set(
      "items",
      JSON.stringify(items.map((item) => ({ sizeId: item.sizeId, quantity: item.quantity }))),
    );
    startTransition(async () => {
      const result = await placeOrder(formData);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      clearCart();
      window.location.assign(result.paymentUrl);
    });
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-semibold">Carrinho</h1>
        <p className="mt-4 text-white/70">Seu carrinho está vazio.</p>
        <Link href="/produtos" className="mt-6 inline-block text-[#f5c518]">
          Ver tênis
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1.4fr_0.8fr]">
      <section>
        <h1 className="text-3xl font-semibold">Carrinho</h1>
        <ul className="mt-6 divide-y divide-white/10">
          {items.map((item) => (
            <li key={item.sizeId} className="flex gap-4 py-5">
              <div className="h-24 w-24 shrink-0 bg-zinc-900">
                {item.image ? (
                  <img src={item.image} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/produtos/${item.slug}`} className="font-medium">
                  {item.name}
                </Link>
                <p className="mt-1 text-sm text-white/60">
                  {item.colorName} · {item.sizeLabel} · {supplyLabel(item.supplyType)}
                </p>
                {item.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-white/50">{item.description}</p>
                ) : null}
                <div className="mt-3 flex items-center gap-3">
                  <label className="text-sm text-white/50" htmlFor={`qty-${item.sizeId}`}>
                    Qtd
                  </label>
                  <select
                    id={`qty-${item.sizeId}`}
                    value={item.quantity}
                    onChange={(event) => updateQuantity(item.sizeId, Number(event.target.value))}
                    className="h-9 border border-white/20 bg-black px-2"
                  >
                    {Array.from({ length: item.maxQty }, (_, index) => index + 1).map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeItem(item.sizeId)}
                    className="text-sm text-white/50"
                  >
                    Remover
                  </button>
                </div>
              </div>
              <p className="font-medium">{formatBrl(item.unitPrice * item.quantity)}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="h-fit border border-white/10 p-5">
        <h2 className="text-lg font-medium">Pagar pedido</h2>
        <p className="mt-2 text-sm leading-6 text-white/60">
          O pagamento abre a página do Asaas com Pix, crédito à vista e crédito parcelado em até 10
          vezes. O débito não está disponível nesta conta.
        </p>
        <p className="mt-4 text-2xl font-semibold">{formatBrl(total)}</p>
        <p className="mt-1 text-xs text-white/40">
          O total definitivo usa o preço atual da loja.
        </p>
        <form action={submit} className="mt-6 flex flex-col gap-3">
          <label className="text-sm" htmlFor="name">
            Nome
          </label>
          <input
            id="name"
            name="name"
            required
            className="h-11 border border-white/20 bg-transparent px-3 outline-none focus:border-[#f5c518]"
          />
          <label className="text-sm" htmlFor="phone">
            WhatsApp
          </label>
          <input
            id="phone"
            name="phone"
            required
            inputMode="tel"
            placeholder="11999999999"
            className="h-11 border border-white/20 bg-transparent px-3 outline-none focus:border-[#f5c518]"
          />
          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="mt-2 h-12 bg-[#f5c518] font-semibold text-black disabled:opacity-60"
          >
            {pending ? "Abrindo pagamento…" : "Pagar com Pix ou cartão"}
          </button>
        </form>
      </section>
    </div>
  );
}
