"use client";

import { useActionState } from "react";
import { saveStoreWhatsapp } from "@/app/admin/store-actions";

export function WhatsappForm({ whatsapp }: { whatsapp: string }) {
  const [state, action, pending] = useActionState(saveStoreWhatsapp, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="grid gap-2 text-sm" htmlFor="whatsapp">
        WhatsApp da loja
        <input
          id="whatsapp"
          name="whatsapp"
          defaultValue={whatsapp}
          placeholder="11999999999"
          className="h-11 border border-black/10 px-3 dark:border-white/15 dark:bg-transparent"
        />
      </label>
      {state.message ? <p className="text-sm text-red-600">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 w-fit bg-black px-4 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        {pending ? "Salvando…" : "Salvar WhatsApp"}
      </button>
    </form>
  );
}
