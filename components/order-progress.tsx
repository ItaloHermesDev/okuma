import type { ReactNode } from "react";
import {
  paymentEventLabel,
  paymentStatusDetail,
  paymentStatusLabel,
  statusLabel,
} from "@/lib/format";
import type { OrderStatus, PaymentStatus } from "@/lib/store-types";

const FLOW: OrderStatus[] = [
  "solicitado",
  "confirmado",
  "em_separacao",
  "enviado",
  "entregue",
];

const ORDER_NOTE: Record<OrderStatus, string> = {
  solicitado: "A loja recebeu o pedido.",
  confirmado: "A loja confirmou e segue com o pedido.",
  em_separacao: "Os pares estão sendo separados.",
  enviado: "O pedido está a caminho.",
  entregue: "A entrega foi concluída.",
  cancelado: "Este pedido foi encerrado.",
  rejeitado: "A loja não aceitou este pedido.",
};

const ORDER_COLOR: Record<OrderStatus, { dot: string; line: string; text: string; pill: string; ring: string }> = {
  solicitado: {
    dot: "bg-amber-400",
    line: "bg-amber-400",
    text: "text-amber-200",
    pill: "bg-amber-400/15 text-amber-200 ring-amber-400/60",
    ring: "ring-amber-400/50",
  },
  confirmado: {
    dot: "bg-sky-400",
    line: "bg-sky-400",
    text: "text-sky-200",
    pill: "bg-sky-400/15 text-sky-200 ring-sky-400/60",
    ring: "ring-sky-400/50",
  },
  em_separacao: {
    dot: "bg-violet-400",
    line: "bg-violet-400",
    text: "text-violet-200",
    pill: "bg-violet-400/15 text-violet-200 ring-violet-400/60",
    ring: "ring-violet-400/50",
  },
  enviado: {
    dot: "bg-cyan-400",
    line: "bg-cyan-400",
    text: "text-cyan-200",
    pill: "bg-cyan-400/15 text-cyan-200 ring-cyan-400/60",
    ring: "ring-cyan-400/50",
  },
  entregue: {
    dot: "bg-emerald-400",
    line: "bg-emerald-400",
    text: "text-emerald-200",
    pill: "bg-emerald-400/15 text-emerald-200 ring-emerald-400/60",
    ring: "ring-emerald-400/50",
  },
  cancelado: {
    dot: "bg-rose-500",
    line: "bg-rose-500",
    text: "text-rose-200",
    pill: "bg-rose-500/15 text-rose-200 ring-rose-500/60",
    ring: "ring-rose-500/50",
  },
  rejeitado: {
    dot: "bg-rose-500",
    line: "bg-rose-500",
    text: "text-rose-200",
    pill: "bg-rose-500/15 text-rose-200 ring-rose-500/60",
    ring: "ring-rose-500/50",
  },
};

const PAYMENT_COLOR: Record<PaymentStatus, { dot: string; pill: string; panel: string }> = {
  aguardando: {
    dot: "bg-amber-400",
    pill: "bg-amber-400/15 text-amber-200 ring-amber-400/60",
    panel: "border-amber-400/50 bg-amber-400/10",
  },
  pago: {
    dot: "bg-emerald-400",
    pill: "bg-emerald-400/15 text-emerald-200 ring-emerald-400/60",
    panel: "border-emerald-400/50 bg-emerald-400/10",
  },
  recusado: {
    dot: "bg-rose-500",
    pill: "bg-rose-500/15 text-rose-200 ring-rose-500/60",
    panel: "border-rose-500/50 bg-rose-500/10",
  },
  expirado: {
    dot: "bg-orange-400",
    pill: "bg-orange-400/15 text-orange-200 ring-orange-400/60",
    panel: "border-orange-400/50 bg-orange-400/10",
  },
  cancelado: {
    dot: "bg-rose-500",
    pill: "bg-rose-500/15 text-rose-200 ring-rose-500/60",
    panel: "border-rose-500/50 bg-rose-500/10",
  },
  estornado: {
    dot: "bg-fuchsia-400",
    pill: "bg-fuchsia-400/15 text-fuchsia-200 ring-fuchsia-400/60",
    panel: "border-fuchsia-400/50 bg-fuchsia-400/10",
  },
  contestado: {
    dot: "bg-orange-500",
    pill: "bg-orange-500/15 text-orange-200 ring-orange-500/60",
    panel: "border-orange-500/50 bg-orange-500/10",
  },
};

function flowFor(status: OrderStatus): OrderStatus[] {
  if (status === "cancelado" || status === "rejeitado") {
    return ["solicitado", status];
  }

  return [...FLOW];
}

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  const tone = ORDER_COLOR[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone.pill}`}>
      <span className={`size-1.5 rounded-full ${tone.dot}`} />
      {statusLabel(status)}
    </span>
  );
}

export function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  const tone = PAYMENT_COLOR[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone.pill}`}>
      <span className={`size-1.5 rounded-full ${tone.dot}`} />
      {paymentStatusLabel(status)}
    </span>
  );
}

export function OrderTimeline({ status }: { status: OrderStatus }) {
  const steps = flowFor(status);
  const current = steps.indexOf(status);

  return (
    <ol>
      {steps.map((step, index) => {
        const tone = ORDER_COLOR[step];
        const done = index < current;
        const active = index === current;
        const reached = done || active;

        return (
          <li key={step} className="flex gap-3">
            <div className="flex w-4 shrink-0 flex-col items-center">
              <span
                className={`size-4 shrink-0 rounded-full ${
                  active
                    ? `${tone.dot} ring-4 ${tone.ring}`
                    : reached
                      ? tone.dot
                      : "bg-zinc-900 ring-2 ring-white/30"
                }`}
              />
              {index < steps.length - 1 ? (
                <span className={`-mt-1 w-[3px] flex-1 ${done ? tone.line : "bg-white/25"}`} />
              ) : null}
            </div>
            <div className={index < steps.length - 1 ? "pb-5" : ""}>
              <p className={`text-sm font-semibold ${reached ? tone.text : "text-white/35"}`}>
                {statusLabel(step)}
                {active ? <span className="ml-2 text-xs font-medium tracking-wide uppercase">Agora</span> : null}
              </p>
              <p className={`mt-0.5 text-xs leading-5 ${reached ? "text-white/60" : "text-white/30"}`}>
                {ORDER_NOTE[step]}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function PaymentStatusCard({
  status,
  event,
  children,
}: {
  status: PaymentStatus;
  event?: string | null;
  children?: ReactNode;
}) {
  const tone = PAYMENT_COLOR[status];

  return (
    <section className={`border p-4 ${tone.panel}`}>
      <p className="text-xs tracking-wide text-white/50 uppercase">Pagamento</p>
      <p className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${tone.pill}`}>
        <span className={`size-2.5 rounded-full ${tone.dot}`} />
        {paymentStatusLabel(status)}
      </p>
      <p className="mt-3 text-sm leading-6 text-white/75">{paymentStatusDetail(status)}</p>
      <p className="mt-2 text-sm text-white/55">
        Último aviso do Asaas: {event ? paymentEventLabel(event) : "nenhum aviso ainda"}
      </p>
      {children}
    </section>
  );
}
