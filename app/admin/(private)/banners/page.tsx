import { Suspense } from "react";
import { BannerManager } from "@/components/admin/banner-manager";
import { getAdminBanners } from "@/lib/store";

export const metadata = { title: "Banners" };

export default function BannersPage() {
  return (
    <Suspense fallback={<p className="px-6 py-10">Carregando banners…</p>}>
      <Banners />
    </Suspense>
  );
}

async function Banners() {
  const banners = await getAdminBanners();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="mb-2 text-3xl font-semibold">Banners</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Cada promoção usa uma imagem para desktop e outra para celular.
      </p>
      <BannerManager banners={banners} />
    </main>
  );
}
