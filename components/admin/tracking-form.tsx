"use client";

import { useActionState } from "react";
import { saveOrderTracking } from "@/app/admin/store-actions";

export function TrackingForm({
  orderId,
  trackingCode,
}: {
  orderId: number;
  trackingCode: string;
}) {
  const [state, action, pending] = useActionState(saveOrderTracking, {});

  return (
    <form action={action} className="grid gap-3 border border-black/10 p-4 dark:border-white/15">
      <h2 className="text-lg font-medium">Rastreio</h2>
      <p className="text-sm text-zinc-500">O cliente acompanha este código na página do pedido.</p>
      <input type="hidden" name="id" value={orderId} />
      <label className="grid gap-2 text-sm" htmlFor="tracking">
        Número de rastreio
        <input
          id="tracking"
          name="tracking"
          defaultValue={trackingCode}
          maxLength={80}
          placeholder="Código da transportadora"
          className="h-11 border border-black/10 px-3 dark:border-white/15 dark:bg-transparent"
        />
      </label>
      {state.message ? <p className="text-sm text-red-600">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 w-fit bg-black px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {pending ? "Salvando…" : "Salvar rastreio"}
      </button>
    </form>
  );
}
