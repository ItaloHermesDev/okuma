"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/admin/actions";

const LINKS = [
  ["/admin", "Painel"],
  ["/admin/produtos", "Tênis"],
  ["/admin/estoque", "Estoque"],
  ["/admin/pedidos", "Pedidos"],
  ["/admin/banners", "Banners"],
];

export function AdminNav({ name }: { name: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-black/10 bg-zinc-50 px-4 md:hidden dark:border-white/10 dark:bg-black">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-9 border border-black/10 px-3 text-sm dark:border-white/15"
        >
          Menu
        </button>
        <span className="font-medium">Okuma</span>
      </div>
      {open ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-black/10 bg-zinc-50 px-4 py-6 transition-transform dark:border-white/10 dark:bg-black md:sticky md:top-0 md:z-auto md:h-dvh md:shrink-0 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Okuma</p>
        <p className="mt-1 font-medium">{name}</p>
        <nav className="mt-8 flex flex-1 flex-col gap-1 text-sm">
          {LINKS.map(([href, label]) => {
            const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-2 ${
                  active
                    ? "bg-black font-medium text-white dark:bg-white dark:text-black"
                    : "text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
                }`}
              >
                {label}
              </Link>
            );
          })}
          <Link
            href="/"
            className="mt-4 px-3 py-2 text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            Ver loja
          </Link>
        </nav>
        <form action={logout}>
          <button
            type="submit"
            className="h-10 w-full border border-black/10 text-sm font-medium dark:border-white/15"
          >
            Sair
          </button>
        </form>
      </aside>
    </>
  );
}
