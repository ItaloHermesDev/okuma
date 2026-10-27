"use client";

import { useActionState } from "react";
import { decideOrder } from "@/app/admin/store-actions";

export function OrderDecision({
  orderId,
  back = "detalhe",
  confirm = true,
}: {
  orderId: number;
  back?: "lista" | "detalhe";
  confirm?: boolean;
}) {
  const [state, action, pending] = useActionState(decideOrder, {});

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={orderId} />
      <input type="hidden" name="back" value={back} />
      {confirm ? (
        <button
          type="submit"
          name="decision"
          value="confirmar"
          disabled={pending}
          className="h-11 bg-black px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
        >
          {pending ? "Salvando…" : "Confirmar"}
        </button>
      ) : null}
      <button
        type="submit"
        name="decision"
        value="rejeitar"
        disabled={pending}
        className="h-11 border border-red-600 px-4 text-sm font-medium text-red-600 disabled:opacity-60"
      >
        Rejeitar
      </button>
      {state.message ? <p className="text-sm text-red-600">{state.message}</p> : null}
    </form>
  );
}
