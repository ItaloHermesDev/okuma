import type { OrderStatus, OrderView, PaymentStatus, Product, SupplyType } from "./store-types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  solicitado: "Solicitado",
  confirmado: "Confirmado",
  em_separacao: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
  rejeitado: "Rejeitado",
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  aguardando: "Aguardando",
  pago: "Pago",
  recusado: "Recusado",
  expirado: "Expirado",
  cancelado: "Cancelado",
  estornado: "Estornado",
  contestado: "Contestado",
};

const PAYMENT_STATUS_DETAIL: Record<PaymentStatus, string> = {
  aguardando: "O Asaas ainda não confirmou este pagamento.",
  pago: "O Asaas confirmou o pagamento.",
  recusado: "O Asaas recusou a tentativa de pagamento.",
  expirado: "O prazo do checkout acabou sem pagamento.",
  cancelado: "O checkout ou a cobrança foi cancelado no Asaas.",
  estornado: "O valor pago foi estornado.",
  contestado: "O pagamento do cartão foi contestado.",
};

const PAYMENT_EVENT_LABEL: Record<string, string> = {
  CHECKOUT_CREATED: "Checkout criado",
  CHECKOUT_PAID: "Checkout pago",
  CHECKOUT_CANCELED: "Checkout cancelado",
  CHECKOUT_EXPIRED: "Checkout expirado",
  PAYMENT_CONFIRMED: "Pagamento confirmado",
  PAYMENT_RECEIVED: "Pagamento recebido",
  PAYMENT_REFUNDED: "Pagamento estornado",
  PAYMENT_CHARGEBACK_REQUESTED: "Chargeback solicitado",
  PAYMENT_REPROVED_BY_RISK_ANALYSIS: "Recusado na análise de risco",
  PAYMENT_CREDIT_CARD_CAPTURE_REFUSED: "Captura do cartão recusada",
  PAYMENT_DELETED: "Cobrança removida",
};

export function formatBrl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function sellingPrice(price: number, salePrice: number | null) {
  if (salePrice != null && salePrice > 0 && salePrice < price) {
    return salePrice;
  }

  return price;
}

export function discountPercent(price: number, salePrice: number | null) {
  const current = sellingPrice(price, salePrice);

  if (current >= price || price <= 0) {
    return null;
  }

  return Math.round((1 - current / price) * 100);
}

export function supplyLabel(supplyType: SupplyType) {
  return supplyType === "estoque" ? "Estoque" : "Sob demanda";
}

export function statusLabel(status: OrderStatus) {
  return STATUS_LABEL[status];
}

export function paymentStatusLabel(status: PaymentStatus) {
  return PAYMENT_STATUS_LABEL[status];
}

export function paymentStatusDetail(status: PaymentStatus) {
  return PAYMENT_STATUS_DETAIL[status];
}

export function paymentEventLabel(event: string) {
  return PAYMENT_EVENT_LABEL[event] ?? event.replaceAll("_", " ").toLowerCase();
}

export function coverImage(product: Product) {
  return product.images[0]?.path ?? null;
}

export function stockTotal(product: Product) {
  return product.colors.reduce(
    (sum, color) =>
      sum + color.sizes.reduce((sizeSum, size) => sizeSum + size.stockQty, 0),
    0,
  );
}

export function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }

  return digits;
}

export function formatPhone(digits: string) {
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return digits;
}

export function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function slugify(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 160);

  return slug || "tenis";
}

export function parseMoney(value: string) {
  const raw = value.trim();

  if (!raw) {
    return null;
  }

  const normalized = raw.includes(",")
    ? raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
    : raw.replace(/\s/g, "");
  const amount = Number(normalized);

  if (!Number.isFinite(amount)) {
    return null;
  }

  return Math.round(amount * 100) / 100;
}

export function whatsappHref(storeNumber: string, text: string) {
  let digits = storeNumber.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  if (!digits.startsWith("55") && digits.length <= 11) {
    digits = `55${digits}`;
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function orderMessage(
  order: Pick<OrderView, "code" | "customerName" | "customerPhone" | "total" | "items">,
) {
  const lines = [
    `*Okuma — pedido ${order.code}*`,
    `Cliente: ${order.customerName}`,
    `WhatsApp: ${formatPhone(order.customerPhone)}`,
    "",
  ];

  order.items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.productName}`,
      `Cor: ${item.colorName}`,
      `Tamanho: ${item.sizeLabel}`,
      `Tipo: ${supplyLabel(item.supplyType)}`,
      `Qtd: ${item.quantity}`,
      `Valor: ${formatBrl(item.lineTotal)}`,
    );

    if (item.description) {
      lines.push(`Descrição: ${item.description}`);
    }

    lines.push("");
  });

  lines.push(`*Total: ${formatBrl(order.total)}*`, "", "O pagamento é feito no site, por Pix ou cartão.");
  return lines.join("\n");
}
