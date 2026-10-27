import "server-only";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getCurrentAdmin } from "./auth";
import { publicCheckoutUrl } from "./checkout-url";
import { ensureDatabase, getPool } from "./database";
import { sellingPrice } from "./format";
import type {
  OrderItemView,
  OrderStatus,
  OrderView,
  PaymentStatus,
  SupplyType,
} from "./store-types";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "./store-types";

export type { OrderStatus } from "./store-types";

export class OrderError extends Error {}

type OrderRow = RowDataPacket & {
  id: number;
  code: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  payment_status: string | null;
  payment_event: string | null;
  total: string;
  created_at: Date | string;
  stock_held: number;
  tracking_code: string | null;
  payment_receipt: string | null;
  asaas_payment_url: string | null;
};

type ItemRow = RowDataPacket & {
  order_id: number;
  size_id: number | null;
  product_name: string;
  description: string | null;
  color_name: string;
  size_label: string;
  supply_type: SupplyType;
  unit_price: string;
  quantity: number;
  line_total: string;
};

type VariantRow = RowDataPacket & {
  size_id: number;
  size_label: string;
  stock_qty: number;
  color_name: string;
  product_id: number;
  product_name: string;
  description: string | null;
  price: string;
  sale_price: string | null;
  supply_type: SupplyType;
  active: number;
};

function orderCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let code = "OK";

  for (const byte of bytes) {
    code += alphabet[byte % alphabet.length];
  }

  return code;
}

function timestamp(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}

const ORDER_COLUMNS =
  "id, code, customer_name, customer_phone, status, payment_status, payment_event, total, created_at, stock_held, tracking_code, payment_receipt, asaas_payment_url";

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

function orderStatus(value: string): OrderStatus {
  if (value === "aguardando_pagamento") {
    return "solicitado";
  }

  if (isOrderStatus(value)) {
    return value;
  }

  return "solicitado";
}

function paymentStatus(value: string | null | undefined): PaymentStatus {
  if (value && (PAYMENT_STATUSES as readonly string[]).includes(value)) {
    return value as PaymentStatus;
  }

  return "aguardando";
}

function mapItems(rows: ItemRow[]): OrderItemView[] {
  return rows.map((row) => ({
    productName: row.product_name,
    description: row.description ?? "",
    colorName: row.color_name,
    sizeLabel: row.size_label,
    supplyType: row.supply_type,
    unitPrice: Number(row.unit_price),
    quantity: Number(row.quantity),
    lineTotal: Number(row.line_total),
  }));
}

async function attachItems(orders: OrderRow[]): Promise<OrderView[]> {
  if (orders.length === 0) {
    return [];
  }

  const ids = orders.map((order) => order.id);
  const [items] = await getPool().query<ItemRow[]>(
    `SELECT order_id, size_id, product_name, description, color_name, size_label,
            supply_type, unit_price, quantity, line_total
     FROM order_items
     WHERE order_id IN (${ids.map(() => "?").join(", ")})
     ORDER BY id`,
    ids,
  );
  const byOrder = new Map<number, ItemRow[]>();

  for (const item of items) {
    const list = byOrder.get(item.order_id) ?? [];
    list.push(item);
    byOrder.set(item.order_id, list);
  }

  return orders.map((order) => ({
    id: order.id,
    code: order.code,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    status: orderStatus(order.status),
    paymentStatus: paymentStatus(order.payment_status),
    paymentEvent: order.payment_event,
    total: Number(order.total),
    createdAt: timestamp(order.created_at),
    trackingCode: order.tracking_code ?? "",
    paymentReceipt: order.payment_receipt,
    paymentUrl: publicCheckoutUrl(order.asaas_payment_url),
    items: mapItems(byOrder.get(order.id) ?? []),
  }));
}

export async function listOrders(phone?: string) {
  if (!phone) {
    await getCurrentAdmin();
  }

  await ensureDatabase();
  const [rows] = await getPool().query<OrderRow[]>(
    `SELECT ${ORDER_COLUMNS}
     FROM orders
     ${phone ? "WHERE customer_phone = ?" : ""}
     ORDER BY id DESC
     LIMIT 100`,
    phone ? [phone] : [],
  );

  return attachItems(rows);
}

export async function getOrderByCode(code: string) {
  await ensureDatabase();
  const [rows] = await getPool().query<OrderRow[]>(
    `SELECT ${ORDER_COLUMNS}
     FROM orders WHERE code = ? LIMIT 1`,
    [code],
  );

  const [order] = await attachItems(rows);
  return order ?? null;
}

export async function phoneHasOrders(phone: string) {
  await ensureDatabase();
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT id FROM orders WHERE customer_phone = ? LIMIT 1",
    [phone],
  );

  return rows.length > 0;
}

export async function createOrder(input: {
  name: string;
  phone: string;
  items: { sizeId: number; quantity: number }[];
}) {
  const merged = new Map<number, number>();

  for (const item of input.items) {
    if (!Number.isInteger(item.sizeId) || item.sizeId <= 0) {
      throw new OrderError("Há um item inválido no carrinho.");
    }

    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) {
      throw new OrderError("A quantidade de cada tênis deve ficar entre 1 e 10.");
    }

    merged.set(item.sizeId, (merged.get(item.sizeId) ?? 0) + item.quantity);
  }

  if (merged.size === 0 || merged.size > 20) {
    throw new OrderError("Monte o carrinho com até 20 itens.");
  }

  await ensureDatabase();
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();
    const lines: Array<{
      productId: number;
      sizeId: number;
      productName: string;
      description: string;
      colorName: string;
      sizeLabel: string;
      supplyType: SupplyType;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
    }> = [];
    let holdsStock = false;

    for (const [sizeId, quantity] of merged) {
      const [locked] = await connection.query<RowDataPacket[]>(
        "SELECT id, stock_qty FROM product_sizes WHERE id = ? FOR UPDATE",
        [sizeId],
      );

      if (!locked[0]) {
        throw new OrderError("Um dos tênis do carrinho não está mais disponível.");
      }

      const [variants] = await connection.query<VariantRow[]>(
        `SELECT s.id AS size_id, s.size_label, s.stock_qty, c.name AS color_name,
                p.id AS product_id, p.name AS product_name, p.description, p.price,
                p.sale_price, p.supply_type, p.active
         FROM product_sizes s
         JOIN product_colors c ON c.id = s.color_id
         JOIN products p ON p.id = c.product_id
         WHERE s.id = ?
         LIMIT 1`,
        [sizeId],
      );
      const variant = variants[0];

      if (!variant || variant.active !== 1) {
        throw new OrderError("Um dos tênis do carrinho não está mais disponível.");
      }

      const unitPrice = sellingPrice(
        Number(variant.price),
        variant.sale_price == null ? null : Number(variant.sale_price),
      );

      if (variant.supply_type === "estoque") {
        if (Number(locked[0].stock_qty) < quantity) {
          throw new OrderError(
            `${variant.product_name} ${variant.color_name} ${variant.size_label} não tem estoque suficiente.`,
          );
        }

        await connection.query(
          "UPDATE product_sizes SET stock_qty = stock_qty - ? WHERE id = ?",
          [quantity, sizeId],
        );
        holdsStock = true;
      }

      lines.push({
        productId: variant.product_id,
        sizeId,
        productName: variant.product_name,
        description: variant.description ?? "",
        colorName: variant.color_name,
        sizeLabel: variant.size_label,
        supplyType: variant.supply_type,
        unitPrice,
        quantity,
        lineTotal: Math.round(unitPrice * quantity * 100) / 100,
      });
    }

    const total = Math.round(lines.reduce((sum, line) => sum + line.lineTotal, 0) * 100) / 100;
    let orderId = 0;
    let code = "";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      code = orderCode();

      try {
        const [created] = await connection.query<ResultSetHeader>(
          `INSERT INTO orders
            (code, customer_name, customer_phone, status, payment_status, total, stock_held)
           VALUES (?, ?, ?, 'solicitado', 'aguardando', ?, ?)`,
          [code, input.name, input.phone, total, holdsStock ? 1 : 0],
        );
        orderId = created.insertId;
        break;
      } catch (error) {
        const duplicate =
          typeof error === "object" &&
          error != null &&
          "code" in error &&
          error.code === "ER_DUP_ENTRY";

        if (!duplicate || attempt === 4) {
          throw error;
        }
      }
    }

    for (const line of lines) {
      await connection.query(
        `INSERT INTO order_items
          (order_id, product_id, size_id, product_name, description, color_name, size_label,
           supply_type, unit_price, quantity, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          line.productId,
          line.sizeId,
          line.productName,
          line.description,
          line.colorName,
          line.sizeLabel,
          line.supplyType,
          line.unitPrice,
          line.quantity,
          line.lineTotal,
        ],
      );
    }

    await connection.commit();

    return {
      id: orderId,
      code,
      customerName: input.name,
      customerPhone: input.phone,
      status: "solicitado" as const,
      paymentStatus: "aguardando" as const,
      paymentEvent: null,
      total,
      createdAt: new Date().toISOString(),
      trackingCode: "",
      paymentReceipt: null,
      paymentUrl: null,
      items: lines.map((line) => ({
        productName: line.productName,
        description: line.description,
        colorName: line.colorName,
        sizeLabel: line.sizeLabel,
        supplyType: line.supplyType,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
      })),
    } satisfies OrderView;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function changeStock(
  connection: Awaited<ReturnType<ReturnType<typeof getPool>["getConnection"]>>,
  orderId: number,
  direction: "restore" | "hold",
) {
  const [items] = await connection.query<RowDataPacket[]>(
    `SELECT size_id, quantity, supply_type, product_name, color_name, size_label
     FROM order_items WHERE order_id = ?`,
    [orderId],
  );

  for (const item of items) {
    if (item.supply_type !== "estoque" || item.size_id == null) {
      if (direction === "hold" && item.supply_type === "estoque") {
        throw new OrderError(
          "Não foi possível reabrir o pedido porque um tamanho não existe mais.",
        );
      }
      continue;
    }

    const [sizes] = await connection.query<RowDataPacket[]>(
      "SELECT stock_qty FROM product_sizes WHERE id = ? FOR UPDATE",
      [item.size_id],
    );

    if (!sizes[0]) {
      if (direction === "hold") {
        throw new OrderError(
          "Não foi possível reabrir o pedido porque um tamanho não existe mais.",
        );
      }
      continue;
    }

    if (direction === "hold" && Number(sizes[0].stock_qty) < Number(item.quantity)) {
      throw new OrderError(
        `${item.product_name} ${item.color_name} ${item.size_label} não tem estoque para reabrir o pedido.`,
      );
    }

    await connection.query(
      `UPDATE product_sizes SET stock_qty = stock_qty ${direction === "hold" ? "-" : "+"} ? WHERE id = ?`,
      [item.quantity, item.size_id],
    );
  }
}

export async function setOrderStatus(orderId: number, status: OrderStatus) {
  if (!ORDER_STATUSES.includes(status)) {
    throw new OrderError("Status inválido.");
  }

  await ensureDatabase();
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<OrderRow[]>(
      `SELECT ${ORDER_COLUMNS}
       FROM orders WHERE id = ? FOR UPDATE`,
      [orderId],
    );
    const order = rows[0];

    if (!order) {
      throw new OrderError("Pedido não encontrado.");
    }

    const storedStatus = order.status === "aguardando_pagamento" ? "solicitado" : order.status;

    if (!isOrderStatus(storedStatus)) {
      throw new OrderError("Status inválido.");
    }

    if (storedStatus !== status) {
      const releasesStock = (value: OrderStatus) =>
        value === "cancelado" || value === "rejeitado";
      const wasReleased = releasesStock(storedStatus);
      const willRelease = releasesStock(status);
      const [stockItems] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM order_items WHERE order_id = ? AND supply_type = 'estoque' LIMIT 1",
        [orderId],
      );
      const hasStock = stockItems.length > 0;

      if (!wasReleased && willRelease && order.stock_held === 1) {
        await changeStock(connection, orderId, "restore");
        await connection.query("UPDATE orders SET stock_held = 0 WHERE id = ?", [orderId]);
      }

      if (wasReleased && !willRelease && hasStock && order.stock_held === 0) {
        await changeStock(connection, orderId, "hold");
        await connection.query("UPDATE orders SET stock_held = 1 WHERE id = ?", [orderId]);
      }

      await connection.query("UPDATE orders SET status = ? WHERE id = ?", [status, orderId]);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function saveAsaasCheckout(orderId: number, checkoutId: string, paymentUrl: string) {
  await ensureDatabase();
  await getPool().query(
    "UPDATE orders SET asaas_checkout_id = ?, asaas_payment_url = ? WHERE id = ?",
    [checkoutId, paymentUrl, orderId],
  );
}

export async function findOrderForPayment(reference: { code?: string; checkoutId?: string }) {
  await ensureDatabase();

  if (reference.code) {
    const byCode = await getOrderByCode(reference.code);

    if (byCode) {
      return byCode;
    }
  }

  if (!reference.checkoutId) {
    return null;
  }

  const [rows] = await getPool().query<OrderRow[]>(
    `SELECT ${ORDER_COLUMNS}
     FROM orders WHERE asaas_checkout_id = ? LIMIT 1`,
    [reference.checkoutId],
  );
  const [order] = await attachItems(rows);
  return order ?? null;
}

export async function claimAsaasEvent(id: string, eventName: string) {
  await ensureDatabase();

  try {
    await getPool().query("INSERT INTO asaas_events (id, event_name) VALUES (?, ?)", [
      id,
      eventName,
    ]);
    return true;
  } catch (error) {
    const duplicate =
      typeof error === "object" &&
      error != null &&
      "code" in error &&
      error.code === "ER_DUP_ENTRY";

    if (duplicate) {
      return false;
    }

    throw error;
  }
}

export async function releaseAsaasEvent(id: string) {
  await getPool().query("DELETE FROM asaas_events WHERE id = ?", [id]);
}

function allowsPaymentChange(current: PaymentStatus, incoming: PaymentStatus) {
  if (current === incoming) {
    return true;
  }

  if (current === "estornado" || current === "contestado") {
    return false;
  }

  if (current === "pago" && incoming !== "estornado" && incoming !== "contestado") {
    return false;
  }

  return true;
}

function fulfillmentAfterPayment(
  status: string,
  payment: PaymentStatus,
  currentPayment: PaymentStatus,
): OrderStatus | null {
  const waiting = status === "solicitado" || status === "aguardando_pagamento";

  if (payment === "pago" && waiting) {
    return "confirmado";
  }

  if (payment === "pago" && status === "cancelado" && currentPayment !== "pago") {
    return "confirmado";
  }

  if (
    (payment === "cancelado" || payment === "expirado" || payment === "recusado") &&
    waiting
  ) {
    return "cancelado";
  }

  if (
    (payment === "estornado" || payment === "contestado") &&
    (waiting || status === "confirmado")
  ) {
    return "cancelado";
  }

  return null;
}

export async function notePaymentEvent(orderId: number, eventName: string) {
  await ensureDatabase();
  await getPool().query("UPDATE orders SET payment_event = ? WHERE id = ?", [
    eventName.slice(0, 80),
    orderId,
  ]);
}

export async function applyPaymentNotice(
  orderId: number,
  nextPayment: PaymentStatus,
  eventName: string,
) {
  await ensureDatabase();
  const [rows] = await getPool().query<OrderRow[]>(
    "SELECT id, status, payment_status FROM orders WHERE id = ? LIMIT 1",
    [orderId],
  );
  const row = rows[0];

  if (!row) {
    return { stockChanged: false };
  }

  const currentPayment = paymentStatus(row.payment_status);

  if (!allowsPaymentChange(currentPayment, nextPayment)) {
    return { stockChanged: false };
  }

  await getPool().query(
    "UPDATE orders SET payment_status = ?, payment_event = ? WHERE id = ?",
    [nextPayment, eventName.slice(0, 80), orderId],
  );

  const nextStatus = fulfillmentAfterPayment(row.status, nextPayment, currentPayment);
  const changesFulfillment = Boolean(nextStatus && nextStatus !== orderStatus(row.status));

  if (changesFulfillment && nextStatus) {
    await setOrderStatus(orderId, nextStatus);
  }

  return {
    stockChanged:
      changesFulfillment && (nextStatus === "cancelado" || row.status === "cancelado"),
  };
}

export async function setOrderTracking(orderId: number, trackingCode: string) {
  await getCurrentAdmin();
  const value = trackingCode.trim();

  if (value.length > 80) {
    throw new OrderError("O rastreio deve ter no máximo 80 caracteres.");
  }

  await ensureDatabase();
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT id FROM orders WHERE id = ? LIMIT 1",
    [orderId],
  );

  if (!rows[0]) {
    throw new OrderError("Pedido não encontrado.");
  }

  await getPool().query("UPDATE orders SET tracking_code = ? WHERE id = ?", [
    value || null,
    orderId,
  ]);
}

export async function setPaymentReceipt(orderId: number, publicPath: string) {
  await ensureDatabase();
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT payment_receipt FROM orders WHERE id = ? LIMIT 1",
    [orderId],
  );

  if (!rows[0]) {
    throw new OrderError("Pedido não encontrado.");
  }

  const previous = String(rows[0].payment_receipt ?? "");
  await getPool().query("UPDATE orders SET payment_receipt = ? WHERE id = ?", [
    publicPath,
    orderId,
  ]);

  return previous && previous !== publicPath ? previous : null;
}

export async function getShopOverview() {
  await getCurrentAdmin();
  await ensureDatabase();
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM products WHERE active = 1) AS products,
       (SELECT COUNT(*) FROM orders WHERE status NOT IN ('entregue', 'cancelado', 'rejeitado')) AS open_orders,
       (SELECT COUNT(*)
        FROM product_sizes s
        JOIN product_colors c ON c.id = s.color_id
        JOIN products p ON p.id = c.product_id
        WHERE p.supply_type = 'estoque' AND p.active = 1 AND s.stock_qty = 0) AS missing`,
  );
  const row = rows[0];

  return {
    products: Number(row?.products ?? 0),
    openOrders: Number(row?.open_orders ?? 0),
    missing: Number(row?.missing ?? 0),
  };
}
