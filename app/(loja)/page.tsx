import Link from "next/link";
import { BannerCarousel } from "@/components/store/banners";
import { ProductCard } from "@/components/store/product-card";
import { getActiveBanners, getPublicCatalog } from "@/lib/store";

const NOTES = [
  ["Estoque", "Pares prontos, separados depois da confirmação do pagamento."],
  ["Sob demanda", "O modelo entra em produção depois que o pagamento é confirmado."],
  ["Pagamento", "Pix, crédito à vista ou crédito parcelado em até 10 vezes."],
  ["Pedidos", "O status fica em Meus pedidos e muda quando o pagamento é confirmado."],
];

export default async function HomePage() {
  const [banners, products] = await Promise.all([getActiveBanners(), getPublicCatalog()]);

  return (
    <main>
      <BannerCarousel banners={banners} />
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {NOTES.map(([title, text]) => (
          <article key={title}>
            <h2 className="text-sm font-semibold tracking-[0.14em] text-[#f5c518]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">{text}</p>
          </article>
        ))}
      </section>
      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-3xl font-semibold">Destaques</h2>
          <Link href="/produtos" className="text-sm text-[#f5c518]">
            Ver tudo
          </Link>
        </div>
        {products.length === 0 ? (
          <p className="text-white/60">Nenhum tênis publicado ainda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
