"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";

const LINKS = [
  ["/", "Início"],
  ["/produtos", "Tênis"],
  ["/produtos?tipo=estoque", "Estoque"],
  ["/produtos?tipo=sob_demanda", "Sob demanda"],
  ["/pedidos", "Meus pedidos"],
];

export function StoreHeader() {
  const { items } = useCart();
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/95 backdrop-blur">
      <p className="bg-[#f5c518] px-4 py-2 text-center text-[11px] font-semibold tracking-[0.14em] text-black">
        PAGAMENTO POR PIX OU CARTÃO
      </p>
      <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4">
        <form action="/produtos" className="hidden md:block">
          <input
            name="q"
            aria-label="Buscar"
            placeholder="Buscar"
            className="h-10 w-full max-w-xs border border-white/20 bg-transparent px-3 text-sm outline-none focus:border-[#f5c518]"
          />
        </form>
        <Link href="/" className="text-center text-xl font-semibold tracking-[0.35em]">
          OKUMA
        </Link>
        <div className="flex items-center justify-end gap-4 text-sm">
          <Link href="/pedidos" className="hidden sm:inline">
            Pedidos
          </Link>
          <Link href="/carrinho" className="relative font-medium">
            Carrinho
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f5c518] px-1 text-xs text-black">
              {count}
            </span>
          </Link>
        </div>
      </div>
      <form action="/produtos" className="px-4 pb-3 md:hidden">
        <input
          name="q"
          aria-label="Buscar"
          placeholder="Buscar"
          className="h-10 w-full border border-white/20 bg-transparent px-3 text-sm outline-none focus:border-[#f5c518]"
        />
      </form>
      <nav className="mx-auto flex w-full max-w-6xl gap-5 overflow-x-auto px-4 pb-3 text-sm">
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} className="shrink-0 text-white/80 hover:text-white">
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
