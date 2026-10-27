import Link from "next/link";
import { whatsappHref } from "@/lib/format";

export function StoreFooter({ whatsapp }: { whatsapp: string }) {
  const href = whatsapp ? whatsappHref(whatsapp, "Olá, vim pelo site da Okuma.") : null;

  return (
    <>
      <footer className="mt-auto border-t border-white/10">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <p className="text-lg font-semibold tracking-[0.25em]">OKUMA</p>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Tênis em estoque e sob demanda. O pagamento é feito no site, por Pix ou cartão.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/produtos">Tênis</Link>
            <Link href="/pedidos">Meus pedidos</Link>
            <Link href="/carrinho">Carrinho</Link>
          </div>
          <div className="text-sm text-white/60">
            {href ? (
              <a href={href} target="_blank" rel="noreferrer">
                Falar no WhatsApp
              </a>
            ) : (
              <p>WhatsApp da loja ainda não configurado.</p>
            )}
            <p className="mt-4">
              <Link href="/admin" className="text-white/40">
                Admin
              </Link>
            </p>
          </div>
        </div>
      </footer>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
          className="fixed bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-2xl text-white shadow-lg"
        >
          W
        </a>
      ) : null}
    </>
  );
}
