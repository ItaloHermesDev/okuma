import Link from "next/link";
import { OrderTimeline, PaymentStatusCard } from "@/components/order-progress";
import { formatBrl, formatDate, formatPhone, supplyLabel } from "@/lib/format";
import type { OrderView } from "@/lib/store-types";

export function OrderSummary({
  order,
  whatsappUrl,
}: {
  order: OrderView;
  whatsappUrl?: string | null;
}) {
  return (
    <article className="border border-white/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/pedidos/${order.code}`} className="text-xl font-semibold">
            {order.code}
          </Link>
          <p className="mt-1 text-sm text-white/50">{formatDate(order.createdAt)}</p>
        </div>
        <p className="text-xl font-semibold">{formatBrl(order.total)}</p>
      </div>
      <div className="mt-5 grid items-start gap-3 sm:grid-cols-2">
        <PaymentStatusCard status={order.paymentStatus} event={order.paymentEvent} />
        <section className="border border-white/10 p-4">
          <p className="text-xs tracking-wide text-white/40 uppercase">Andamento</p>
          <div className="mt-4">
            <OrderTimeline status={order.status} />
          </div>
        </section>
      </div>
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
      order.paymentStatus === "aguardando" &&
      order.status !== "cancelado" &&
      order.status !== "rejeitado" &&
      order.status !== "entregue" ? (
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
