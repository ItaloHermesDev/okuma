"use client";

import { useActionState } from "react";
import { identifyCustomer } from "@/app/(loja)/actions";

export function IdentifyForm({ hint, code = "" }: { hint: string; code?: string }) {
  const [state, action, pending] = useActionState(identifyCustomer, {});

  return (
    <form action={action} className="mx-auto flex w-full max-w-md flex-col gap-4">
      <p className="text-sm leading-6 text-white/70">{hint}</p>
      <label className="grid gap-2 text-sm" htmlFor="code">
        Código do pedido
        <input
          id="code"
          name="code"
          defaultValue={code}
          placeholder="OKXXXXXX"
          className="h-11 border border-white/20 bg-transparent px-3 uppercase outline-none focus:border-[#f5c518]"
        />
      </label>
      <label className="grid gap-2 text-sm" htmlFor="phone">
        Ou o WhatsApp usado na compra
        <input
          id="phone"
          name="phone"
          inputMode="tel"
          placeholder="11999999999"
          className="h-11 border border-white/20 bg-transparent px-3 outline-none focus:border-[#f5c518]"
        />
      </label>
      {state.message ? (
        <p className="text-sm text-red-400" role="alert">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 bg-[#f5c518] font-semibold text-black disabled:opacity-60"
      >
        {pending ? "Buscando…" : "Acompanhar no site"}
      </button>
    </form>
  );
}
