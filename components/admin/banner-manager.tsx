"use client";

import { useActionState } from "react";
import { saveBanner, saveNewBanner, removeBanner } from "@/app/admin/store-actions";
import type { Banner } from "@/lib/store-types";
import { ConfirmSubmit } from "./confirm-submit";

const fieldClass =
  "h-11 w-full border border-black/10 px-3 dark:border-white/15 dark:bg-transparent";

export function BannerManager({ banners }: { banners: Banner[] }) {
  const [state, action, pending] = useActionState(saveNewBanner, {});

  return (
    <div className="flex flex-col gap-8">
      <form action={action} className="grid gap-4 border border-black/10 p-5 dark:border-white/15">
        <h2 className="text-lg font-medium">Novo banner</h2>
        <p className="text-sm leading-6 text-zinc-500">
          Desktop: 1440 × 720 px. Celular: 800 × 1100 px. A imagem preenche a largura da tela e
          cerca de 70% da altura; o que passar dessa proporção é cortado.
        </p>
        <label className="grid gap-2 text-sm">
          Título
          <input name="title" required className={fieldClass} />
        </label>
        <label className="grid gap-2 text-sm">
          Texto
          <input name="subtitle" className={fieldClass} />
        </label>
        <label className="grid gap-2 text-sm">
          Link
          <input name="linkUrl" placeholder="/produtos" className={fieldClass} />
        </label>
        <label className="grid gap-2 text-sm">
          Banner desktop
          <span className="text-zinc-500">1440 × 720 px</span>
          <input name="desktop" type="file" accept="image/jpeg,image/png,image/webp" required />
        </label>
        <label className="grid gap-2 text-sm">
          Banner celular
          <span className="text-zinc-500">800 × 1100 px</span>
          <input name="mobile" type="file" accept="image/jpeg,image/png,image/webp" required />
        </label>
        {state.message ? <p className="text-sm text-red-600">{state.message}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="h-11 w-fit bg-black px-4 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          {pending ? "Publicando…" : "Publicar banner"}
        </button>
      </form>
      {banners.map((banner) => (
        <BannerCard key={banner.id} banner={banner} />
      ))}
    </div>
  );
}

function BannerCard({ banner }: { banner: Banner }) {
  const [state, action, pending] = useActionState(saveBanner, {});

  return (
    <article className="grid gap-4 border border-black/10 p-5 dark:border-white/15">
      <div className="grid gap-3 md:grid-cols-2">
        <img src={banner.imageDesktop} alt="" className="h-36 w-full object-cover" />
        <img src={banner.imageMobile} alt="" className="h-36 w-full object-cover" />
      </div>
      <form action={action} className="grid gap-3">
        <input type="hidden" name="id" value={banner.id} />
        <label className="grid gap-2 text-sm">
          Título
          <input name="title" defaultValue={banner.title} className={fieldClass} />
        </label>
        <label className="grid gap-2 text-sm">
          Texto
          <input name="subtitle" defaultValue={banner.subtitle} className={fieldClass} />
        </label>
        <label className="grid gap-2 text-sm">
          Link
          <input name="linkUrl" defaultValue={banner.linkUrl} className={fieldClass} />
        </label>
        <label className="grid gap-2 text-sm">
          Trocar desktop
          <input name="desktop" type="file" accept="image/jpeg,image/png,image/webp" />
        </label>
        <label className="grid gap-2 text-sm">
          Trocar celular
          <input name="mobile" type="file" accept="image/jpeg,image/png,image/webp" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={banner.active} />
          Ativo na vitrine
        </label>
        {state.message ? <p className="text-sm text-red-600">{state.message}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="h-11 w-fit bg-black px-4 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          {pending ? "Salvando…" : "Salvar banner"}
        </button>
      </form>
      <form action={removeBanner}>
        <input type="hidden" name="id" value={banner.id} />
        <ConfirmSubmit label="Excluir banner" message="Excluir este banner?" />
      </form>
    </article>
  );
}
