import type { OrderStatus, OrderView, Product, SupplyType } from "./store-types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  solicitado: "Solicitado",
  aguardando_pagamento: "Aguardando pagamento",
  confirmado: "Confirmado",
  em_separacao: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
  rejeitado: "Rejeitado",
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
