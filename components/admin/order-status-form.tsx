"use client";

import { useActionState } from "react";
import { saveOrderStatus } from "@/app/admin/store-actions";
import { statusLabel } from "@/lib/format";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/store-types";

export function OrderStatusForm({
  orderId,
  status,
}: {
  orderId: number;
  status: OrderStatus;
}) {
  const [state, action, pending] = useActionState(saveOrderStatus, {});

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={orderId} />
      <label className="grid gap-2 text-sm">
        Status
        <select
          name="status"
          defaultValue={status}
          className="h-11 border border-black/10 bg-white px-3 dark:border-white/15 dark:bg-black"
        >
          {ORDER_STATUSES.map((item) => (
            <option key={item} value={item}>
              {statusLabel(item)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="h-11 bg-black px-4 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        {pending ? "Salvando…" : "Atualizar status"}
      </button>
      {state.message ? <p className="text-sm text-red-600">{state.message}</p> : null}
    </form>
  );
}
