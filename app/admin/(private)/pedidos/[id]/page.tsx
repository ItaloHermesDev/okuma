import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OrderDecision } from "@/components/admin/order-decision";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { TrackingForm } from "@/components/admin/tracking-form";
import { formatBrl, formatDate, formatPhone, supplyLabel } from "@/lib/format";
import { listOrders } from "@/lib/orders";

export default function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="px-6 py-10">Carregando pedido…</p>}>
      <Order params={params} />
    </Suspense>
  );
}

async function Order({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orders = await listOrders();
  const order = orders.find((item) => item.id === Number(id));

  if (!order) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
      <Link href="/admin/pedidos" className="text-sm text-zinc-500">
        Voltar aos pedidos
      </Link>
      <div>
        <p className="text-sm text-zinc-500">{formatDate(order.createdAt)}</p>
        <h1 className="mt-1 text-3xl font-semibold">{order.code}</h1>
        <p className="mt-2">
          {order.customerName} · {formatPhone(order.customerPhone)}
        </p>
      </div>
      {order.items.some((item) => item.supplyType === "estoque") ? (
        <p className="text-sm text-zinc-500">
          {order.status === "rejeitado" || order.status === "cancelado"
            ? "As peças de estoque deste pedido voltaram para o estoque."
            : "As peças de estoque já foram descontadas na entrada do pedido."}
        </p>
      ) : (
        <p className="text-sm text-zinc-500">Pedido sob demanda. Não há baixa de estoque.</p>
      )}
      {order.status === "solicitado" || order.status === "aguardando_pagamento" ? (
        <OrderDecision
          orderId={order.id}
          awaitPayment={order.status === "solicitado"}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <OrderStatusForm orderId={order.id} status={order.status} />
          {order.status !== "rejeitado" &&
          order.status !== "cancelado" &&
          order.status !== "entregue" ? (
            <OrderDecision orderId={order.id} confirm={false} />
          ) : null}
        </div>
      )}
      {order.paymentUrl &&
      (order.status === "aguardando_pagamento" || order.status === "solicitado") ? (
        <p className="text-sm">
          Link de pagamento:{" "}
          <a href={order.paymentUrl} target="_blank" rel="noreferrer" className="break-all">
            {order.paymentUrl}
          </a>
        </p>
      ) : null}
      {order.status === "rejeitado" || order.status === "cancelado" ? null : (
        <TrackingForm orderId={order.id} trackingCode={order.trackingCode} />
      )}
      <section className="border border-black/10 p-4 dark:border-white/15">
        <h2 className="text-lg font-medium">Comprovante de pagamento</h2>
        {order.paymentReceipt ? (
          <div className="mt-3">
            {/\.(jpe?g|png|webp)$/i.test(order.paymentReceipt) ? (
              <img
                src={order.paymentReceipt}
                alt="Comprovante de pagamento"
                className="max-h-80 w-full object-contain"
              />
            ) : (
              <a href={order.paymentReceipt} target="_blank" rel="noreferrer" className="text-sm">
                Abrir comprovante
              </a>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">O cliente ainda não enviou o comprovante.</p>
        )}
      </section>
      <ul className="divide-y divide-black/10 border border-black/10 dark:divide-white/10 dark:border-white/10">
        {order.items.map((item, index) => (
          <li key={`${item.productName}-${index}`} className="px-4 py-4 text-sm">
            <p className="font-medium">
              {item.quantity}x {item.productName}
            </p>
            <p className="mt-1 text-zinc-500">
              {item.colorName} · {item.sizeLabel} · {supplyLabel(item.supplyType)} · {formatBrl(item.lineTotal)}
            </p>
            {item.description ? <p className="mt-2">{item.description}</p> : null}
          </li>
        ))}
      </ul>
      <p className="text-xl font-semibold">Total {formatBrl(order.total)}</p>
    </main>
  );
}
