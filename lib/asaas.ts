import "server-only";
import { timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkoutPageUrl } from "./checkout-url";
import {
  applyPaymentNotice,
  claimAsaasEvent,
  findOrderForPayment,
  notePaymentEvent,
  releaseAsaasEvent,
} from "./orders";
import type { OrderView, PaymentStatus } from "./store-types";

export class AsaasError extends Error {}

type AsaasFailure = {
  errors?: { description?: string }[];
};

type CheckoutCreated = AsaasFailure & {
  id?: string;
  link?: string;
};

type AsaasNotice = {
  id?: unknown;
  event?: unknown;
  checkout?: { id?: unknown; externalReference?: unknown };
  payment?: { externalReference?: unknown; checkoutSession?: unknown };
};

const PAID_EVENTS = new Set(["CHECKOUT_PAID", "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const CANCEL_EVENTS = new Set([
  "CHECKOUT_CANCELED",
  "CHECKOUT_EXPIRED",
  "PAYMENT_REPROVED_BY_RISK_ANALYSIS",
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
  "PAYMENT_DELETED",
]);
const REFUND_EVENTS = new Set(["PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED"]);

function paymentStatusForEvent(eventName: string): PaymentStatus | null {
  if (PAID_EVENTS.has(eventName)) {
    return "pago";
  }

  if (eventName === "CHECKOUT_EXPIRED") {
    return "expirado";
  }

  if (
    eventName === "PAYMENT_REPROVED_BY_RISK_ANALYSIS" ||
    eventName === "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED"
  ) {
    return "recusado";
  }

  if (CANCEL_EVENTS.has(eventName)) {
    return "cancelado";
  }

  if (eventName === "PAYMENT_REFUNDED") {
    return "estornado";
  }

  if (REFUND_EVENTS.has(eventName)) {
    return "contestado";
  }

  return null;
}

function envValue(name: string) {
  const fromProcess = process.env[name]?.trim() ?? "";

  if (fromProcess.startsWith("$aact_") || (name === "ASAAS_WEBHOOK_TOKEN" && fromProcess.length >= 32)) {
    return fromProcess;
  }

  try {
    const file = readFileSync(join(process.cwd(), ".env.local"), "utf8");

    for (const line of file.split(/\r?\n/)) {
      if (!line.startsWith(`${name}=`)) {
        continue;
      }

      let value = line.slice(name.length + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      return value.replace(/\\\$/g, "$");
    }
  } catch {
    return fromProcess;
  }

  return fromProcess;
}

function asaasConfig() {
  const production = process.env.NODE_ENV === "production";
  const key = envValue(production ? "ASAAS_PRD" : "ASAAS_SANDBOX");

  if (!key) {
    throw new AsaasError(
      production
        ? "A chave de produção do Asaas não está configurada."
        : "A chave de sandbox do Asaas não está configurada.",
    );
  }

  return {
    key,
    base: production ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3",
    site: production ? "https://www.asaas.com" : "https://sandbox.asaas.com",
  };
}

function isPublicHttps(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      host !== "localhost" &&
      host !== "127.0.0.1" &&
      !host.endsWith(".local")
    );
  } catch {
    return false;
  }
}

export const PRODUCTION_SITE = "https://okumasstore.com.br";

export function callbackBaseFor(origin: string) {
  const configured = process.env.APP_URL?.trim() ?? "";

  if (isPublicHttps(configured)) {
    return configured.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_SITE;
  }

  if (isPublicHttps(origin)) {
    return origin.replace(/\/$/, "");
  }

  return asaasConfig().site;
}

function failureMessage(payload: AsaasFailure, status: number) {
  const descriptions = (payload.errors ?? [])
    .map((error) => error.description?.trim())
    .filter((description): description is string => Boolean(description));

  return descriptions.join(" ") || `O Asaas recusou a cobrança (${status}).`;
}

function pixKeyMissing(payload: AsaasFailure) {
  return (payload.errors ?? []).some((error) =>
    (error.description ?? "").toLowerCase().includes("chave pix"),
  );
}

async function postAsaas(path: string, body: unknown) {
  const { key, base } = asaasConfig();
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Okuma",
      access_token: key,
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as CheckoutCreated;
  return { ok: response.ok, status: response.status, payload };
}

function checkoutBody(order: OrderView, base: string, billingTypes: string[]) {
  return {
    billingTypes,
    chargeTypes: ["DETACHED", "INSTALLMENT"],
    installment: { maxInstallmentCount: 10 },
    minutesToExpire: 1440,
    externalReference: order.code,
    callback: {
      successUrl: `${base}/pedidos/${order.code}?pagamento=enviado`,
      cancelUrl: `${base}/pedidos/${order.code}?pagamento=cancelado`,
      expiredUrl: `${base}/pedidos/${order.code}?pagamento=expirado`,
    },
    items: order.items.map((item) => ({
      name: `${item.productName} ${item.colorName} ${item.sizeLabel}`.slice(0, 80),
      description: item.description ? item.description.slice(0, 255) : undefined,
      quantity: item.quantity,
      value: Math.round(item.unitPrice * 100) / 100,
    })),
  };
}

export async function createStoreCheckout(order: OrderView, origin: string) {
  const base = callbackBaseFor(origin);
  let result = await postAsaas("/checkouts", checkoutBody(order, base, ["PIX", "CREDIT_CARD"]));

  if (!result.ok && pixKeyMissing(result.payload)) {
    result = await postAsaas("/checkouts", checkoutBody(order, base, ["CREDIT_CARD"]));
  }

  if (!result.ok || !result.payload.id) {
    if (result.payload.id) {
      await postAsaas(`/checkouts/${result.payload.id}/cancel`, {}).catch(() => undefined);
    }

    throw new AsaasError(failureMessage(result.payload, result.status));
  }

  const sandbox = asaasConfig().base.includes("sandbox");
  return { id: result.payload.id, link: checkoutPageUrl(result.payload.id, sandbox) };
}

export async function cancelStoreCheckout(checkoutId: string) {
  await postAsaas(`/checkouts/${checkoutId}/cancel`, {}).catch(() => undefined);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function receiveAsaasEvent(notice: AsaasNotice) {
  const eventName = text(notice.event).slice(0, 80);
  const eventId = text(notice.id);

  if (!eventId || eventId.length > 191 || !eventName) {
    return { status: 400 as const, stockChanged: false };
  }

  const claimed = await claimAsaasEvent(eventId, eventName);

  if (!claimed) {
    return { status: 200 as const, stockChanged: false };
  }

  try {
    const order = await findOrderForPayment({
      code: text(notice.payment?.externalReference) || text(notice.checkout?.externalReference),
      checkoutId: text(notice.checkout?.id) || text(notice.payment?.checkoutSession),
    });

    if (!order) {
      return { status: 200 as const, stockChanged: false };
    }

    const paymentStatus = paymentStatusForEvent(eventName);

    if (!paymentStatus) {
      await notePaymentEvent(order.id, eventName);
      return { status: 200 as const, stockChanged: false };
    }

    const result = await applyPaymentNotice(order.id, paymentStatus, eventName);
    return { status: 200 as const, stockChanged: result.stockChanged };
  } catch (error) {
    await releaseAsaasEvent(eventId);
    throw error;
  }
}

export function webhookTokenMatches(received: string | null) {
  const expected = envValue("ASAAS_WEBHOOK_TOKEN");

  if (!received || expected.length < 32 || expected.length > 255 || /\s/.test(expected)) {
    return false;
  }

  const left = Buffer.from(received);
  const right = Buffer.from(expected);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}
