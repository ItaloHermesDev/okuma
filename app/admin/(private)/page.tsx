import { Suspense } from "react";
import { headers } from "next/headers";
import Link from "next/link";
import { WhatsappForm } from "@/components/admin/whatsapp-form";
import { PRODUCTION_SITE } from "@/lib/asaas";
import { getCurrentAdmin, getDatabaseStatus } from "@/lib/auth";
import { formatBrl, formatDate, statusLabel } from "@/lib/format";
import { getShopOverview, listOrders } from "@/lib/orders";
import { getStoreSettingsFresh } from "@/lib/store";

export const metadata = { title: "Painel" };

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="px-6 py-10 text-zinc-500">Carregando painel…</p>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const [admin, database, overview, orders, settings, headerList] = await Promise.all([
    getCurrentAdmin(),
    getDatabaseStatus(),
    getShopOverview(),
    listOrders(),
    getStoreSettingsFresh(),
    headers(),
  ]);
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3003";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const webhookUrl = `${PRODUCTION_SITE}/api/asaas/webhook`;
  const localWebhook = `${proto}://${host}/api/asaas/webhook`;
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim() ?? "";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <div>
        <h1 className="text-3xl font-semibold">Painel</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {admin.email} · {database.name} · {database.version}
        </p>
      </div>
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="border border-black/10 p-4 dark:border-white/10">
          <p className="text-sm text-zinc-500">Tênis ativos</p>
          <p className="mt-2 text-3xl font-semibold">{overview.products}</p>
        </article>
        <article className="border border-black/10 p-4 dark:border-white/10">
          <p className="text-sm text-zinc-500">Pedidos em aberto</p>
          <p className="mt-2 text-3xl font-semibold">{overview.openOrders}</p>
        </article>
        <article className="border border-black/10 p-4 dark:border-white/10">
          <p className="text-sm text-zinc-500">Tamanhos sem estoque</p>
          <p className="mt-2 text-3xl font-semibold">{overview.missing}</p>
        </article>
      </section>
      <section className="border border-black/10 p-5 dark:border-white/10">
        <h2 className="text-lg font-medium">Webhook do Asaas</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Cadastre esta URL no painel de produção do Asaas, em Integrações, Webhooks. O sandbox
          precisa do mesmo caminho em um endereço público. Depois do pagamento o cliente volta
          para {PRODUCTION_SITE}/pedidos/CÓDIGO.
        </p>
        <p className="mt-4 text-sm font-medium">URL de produção</p>
        <p className="mt-1 break-all text-sm">{webhookUrl}</p>
        {localWebhook === webhookUrl ? null : (
          <p className="mt-2 break-all text-sm text-zinc-500">Este ambiente: {localWebhook}</p>
        )}
        <p className="mt-4 text-sm font-medium">Token de autenticação</p>
        <p className="mt-1 break-all text-sm">
          {webhookToken || "Defina ASAAS_WEBHOOK_TOKEN no ambiente. Não use a chave da API."}
        </p>
        <p className="mt-4 text-sm leading-6 text-zinc-500">
          Eventos: CHECKOUT_PAID, CHECKOUT_CANCELED, CHECKOUT_EXPIRED, PAYMENT_CONFIRMED,
          PAYMENT_RECEIVED, PAYMENT_REFUNDED. O header enviado pelo Asaas é asaas-access-token.
        </p>
      </section>
      <section className="border border-black/10 p-5 dark:border-white/10">
        <h2 className="text-lg font-medium">WhatsApp de atendimento</h2>
        <p className="mt-2 text-sm text-zinc-500">
          O pagamento acontece no Asaas. Este número continua no botão de conversa da loja.
        </p>
        <div className="mt-4">
          <WhatsappForm whatsapp={settings.whatsapp} />
        </div>
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Pedidos recentes</h2>
          <Link href="/admin/pedidos" className="text-sm">
            Ver todos
          </Link>
        </div>
        <div className="divide-y divide-black/10 border border-black/10 dark:divide-white/10 dark:border-white/10">
          {orders.slice(0, 6).map((order) => (
            <Link
              key={order.id}
              href={`/admin/pedidos/${order.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span>
                {order.code} · {order.customerName}
                <span className="mt-1 block text-zinc-500">
                  {statusLabel(order.status)} · {formatDate(order.createdAt)}
                </span>
              </span>
              <span>{formatBrl(order.total)}</span>
            </Link>
          ))}
          {orders.length === 0 ? <p className="px-4 py-6 text-sm text-zinc-500">Nenhum pedido.</p> : null}
        </div>
      </section>
    </main>
  );
}
