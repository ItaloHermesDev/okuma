import Link from "next/link";
import { formatBrl, formatDate, formatPhone, statusLabel, supplyLabel } from "@/lib/format";
import type { OrderStatus, OrderView } from "@/lib/store-types";

const STEPS: OrderStatus[] = [
  "solicitado",
  "aguardando_pagamento",
  "confirmado",
  "em_separacao",
  "enviado",
  "entregue",
];

export function OrderSummary({
  order,
  whatsappUrl,
}: {
  order: OrderView;
  whatsappUrl?: string | null;
}) {
  const current = STEPS.indexOf(order.status);

  return (
    <article className="border border-white/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/pedidos/${order.code}`} className="text-sm text-white/50">
            {order.code}
          </Link>
          <h2 className="mt-1 text-xl font-semibold">{statusLabel(order.status)}</h2>
          <p className="mt-1 text-sm text-white/50">{formatDate(order.createdAt)}</p>
        </div>
        <p className="text-xl font-semibold">{formatBrl(order.total)}</p>
      </div>
      {order.status === "cancelado" || order.status === "rejeitado" ? (
        <p className="mt-5 text-sm text-red-400">
          {order.status === "rejeitado"
            ? "A loja rejeitou este pedido."
            : "Este pedido foi cancelado."}
        </p>
      ) : (
        <ol className="mt-5 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step} className={index <= current ? "text-[#f5c518]" : "text-white/35"}>
              <span
                className={`mb-2 block h-1 ${index <= current ? "bg-[#f5c518]" : "bg-white/15"}`}
              />
              {statusLabel(step)}
            </li>
          ))}
        </ol>
      )}
      <ul className="mt-5 space-y-4">
        {order.items.map((item, index) => (
          <li key={`${item.productName}-${item.sizeLabel}-${index}`} className="text-sm leading-6">
            <p className="font-medium">
              {item.quantity}x {item.productName}
            </p>
            <p className="text-white/60">
              {item.colorName} · tamanho {item.sizeLabel} · {supplyLabel(item.supplyType)} ·{" "}
              {formatBrl(item.lineTotal)}
            </p>
            {item.description ? <p className="text-white/50">{item.description}</p> : null}
          </li>
        ))}
      </ul>
      {order.trackingCode ? (
        <p className="mt-5 text-sm">
          Rastreio: <span className="font-semibold">{order.trackingCode}</span>
        </p>
      ) : null}
      <p className="mt-4 text-sm text-white/50">
        {order.customerName} · {formatPhone(order.customerPhone)}
      </p>
      {order.paymentUrl &&
      (order.status === "aguardando_pagamento" || order.status === "solicitado") ? (
        <a
          href={order.paymentUrl}
          className="mt-5 inline-flex h-11 items-center bg-[#f5c518] px-4 font-semibold text-black"
        >
          Pagar agora
        </a>
      ) : null}
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex h-11 items-center border border-white/20 px-4 text-sm"
        >
          Falar com a loja
        </a>
      ) : null}
    </article>
  );
}
