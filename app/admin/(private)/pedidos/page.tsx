import Link from "next/link";
import { Suspense } from "react";
import { OrderDecision } from "@/components/admin/order-decision";
import { OrderStatusPill, PaymentStatusPill } from "@/components/order-progress";
import { formatBrl, formatDate, formatPhone } from "@/lib/format";
import { listOrders } from "@/lib/orders";

export const metadata = { title: "Pedidos" };

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<p className="px-6 py-10">Carregando pedidos…</p>}>
      <Orders />
    </Suspense>
  );
}

async function Orders() {
  const orders = await listOrders();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <h1 className="text-3xl font-semibold">Pedidos</h1>
      <div className="mt-6 divide-y divide-black/10 border border-black/10 dark:divide-white/10 dark:border-white/10">
        {orders.map((order) => (
          <div key={order.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
            <Link href={`/admin/pedidos/${order.id}`} className="min-w-0">
              <span className="block font-medium">
                {order.code} · {order.customerName}
              </span>
              <span className="mt-2 flex flex-wrap gap-2">
                <OrderStatusPill status={order.status} />
                <PaymentStatusPill status={order.paymentStatus} />
              </span>
              <span className="mt-1 block text-sm text-zinc-500">
                {formatPhone(order.customerPhone)} · {formatDate(order.createdAt)} · {formatBrl(order.total)}
                {order.paymentReceipt ? " · Comprovante enviado" : ""}
                {order.trackingCode ? ` · Rastreio ${order.trackingCode}` : ""}
              </span>
            </Link>
            {order.status === "solicitado" ? (
              <OrderDecision orderId={order.id} back="lista" />
            ) : null}
          </div>
        ))}
        {orders.length === 0 ? <p className="px-4 py-6 text-sm text-zinc-500">Nenhum pedido.</p> : null}
      </div>
    </main>
  );
}
