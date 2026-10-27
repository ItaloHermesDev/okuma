import { Suspense } from "react";
import { IdentifyForm } from "@/components/store/identify-form";
import { OrderSummary } from "@/components/store/order-summary";
import { getCustomerPhone } from "@/lib/customer";
import { orderMessage, whatsappHref } from "@/lib/format";
import { listOrders } from "@/lib/orders";
import { getStoreSettings } from "@/lib/store";

export const metadata = { title: "Meus pedidos" };

export default function OrdersPage() {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-white/60">Carregando pedidos…</p>}>
      <Orders />
    </Suspense>
  );
}

async function Orders() {
  const phone = await getCustomerPhone();

  if (!phone) {
    return (
      <main className="px-4 py-16">
        <h1 className="mb-6 text-center text-3xl font-semibold">Meus pedidos</h1>
        <IdentifyForm hint="Os pedidos ficam salvos na loja. Informe o código ou o WhatsApp da compra para ver o status aqui." />
      </main>
    );
  }

  const [orders, settings] = await Promise.all([listOrders(phone), getStoreSettings()]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10">
      <h1 className="text-3xl font-semibold">Meus pedidos</h1>
      <p className="text-sm leading-6 text-white/60">
        Cada pedido mostra o pagamento, vindo do Asaas, e o andamento, atualizado pela loja.
      </p>
      {orders.length === 0 ? (
        <div className="mt-4">
          <p className="mb-6 text-white/60">Nenhum pedido encontrado para este WhatsApp.</p>
          <IdentifyForm hint="Busque por outro código ou por outro WhatsApp." />
        </div>
      ) : (
        orders.map((order) => (
          <OrderSummary
            key={order.id}
            order={order}
            whatsappUrl={whatsappHref(settings.whatsapp, orderMessage(order))}
          />
        ))
      )}
    </main>
  );
}
