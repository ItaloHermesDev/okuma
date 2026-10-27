import { Suspense } from "react";
import Link from "next/link";
import { IdentifyForm } from "@/components/store/identify-form";
import { OrderSummary } from "@/components/store/order-summary";
import { PaymentReceiptForm } from "@/components/store/payment-receipt-form";
import { orderMessage, whatsappHref } from "@/lib/format";
import { getOrderByCode } from "@/lib/orders";
import { getStoreSettings } from "@/lib/store";

const RETURN_NOTES: Record<string, string> = {
  enviado:
    "Se o pagamento foi concluído, esta página muda para confirmado quando o Asaas enviar a confirmação. A chegada nesta tela não marca o pedido como pago.",
  cancelado: "O pagamento foi interrompido. Se o link ainda estiver válido, use Pagar agora.",
  expirado: "O link de pagamento expirou. Se o pedido seguir aguardando, fale com a loja.",
};

export default function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ pagamento?: string }>;
}) {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-white/60">Carregando pedido…</p>}>
      <OrderRoute params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function OrderRoute({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ pagamento?: string }>;
}) {
  const { code } = await params;
  const { pagamento } = await searchParams;
  const returnNote = pagamento ? RETURN_NOTES[pagamento] : undefined;
  const [order, settings] = await Promise.all([
    getOrderByCode(code),
    getStoreSettings(),
  ]);

  if (!order) {
    return (
      <main className="px-4 py-16">
        <h1 className="mb-6 text-center text-3xl font-semibold">Pedido não encontrado</h1>
        <IdentifyForm
          code={code}
          hint="Esse código não está na loja. Confira o código ou busque pelo WhatsApp da compra."
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/pedidos" className="text-sm text-white/50">
        Meus pedidos
      </Link>
      <h1 className="mb-2 mt-4 text-3xl font-semibold">Pedido {order.code}</h1>
      <p className="mb-6 text-sm text-white/60">
        O andamento abaixo é o status salvo do pedido. Ele muda quando o Asaas confirma o pagamento
        e quando a loja atualiza a entrega.
      </p>
      {returnNote ? <p className="mb-6 text-sm text-[#f5c518]">{returnNote}</p> : null}
      <OrderSummary
        order={order}
        whatsappUrl={whatsappHref(settings.whatsapp, orderMessage(order))}
      />
      <PaymentReceiptForm
        code={order.code}
        receipt={order.paymentReceipt}
        locked={
          order.status === "cancelado" ||
          order.status === "rejeitado" ||
          order.status === "entregue"
        }
      />
    </main>
  );
}
