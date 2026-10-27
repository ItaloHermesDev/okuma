"use server";

import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { AsaasError, cancelStoreCheckout, createStoreCheckout } from "@/lib/asaas";
import { setCustomerPhone } from "@/lib/customer";
import { databaseError } from "@/lib/database";
import { normalizePhone } from "@/lib/format";
import {
  createOrder,
  getOrderByCode,
  OrderError,
  phoneHasOrders,
  saveAsaasCheckout,
  setOrderStatus,
  setPaymentReceipt,
} from "@/lib/orders";
import { removeUpload, saveUpload } from "@/lib/uploads";

export async function placeOrder(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));

  if (name.length < 2 || name.length > 120) {
    return { ok: false as const, message: "Informe seu nome." };
  }

  if (phone.length < 10 || phone.length > 11) {
    return { ok: false as const, message: "Informe seu WhatsApp com DDD." };
  }

  let items: { sizeId: number; quantity: number }[] = [];

  try {
    const parsed = JSON.parse(String(formData.get("items") ?? "[]")) as unknown;

    if (!Array.isArray(parsed)) {
      return { ok: false as const, message: "Não foi possível ler o carrinho." };
    }

    items = parsed.map((item) => {
      const entry = item as { sizeId?: number; quantity?: number };
      return { sizeId: Number(entry.sizeId), quantity: Number(entry.quantity) };
    });
  } catch {
    return { ok: false as const, message: "Não foi possível ler o carrinho." };
  }

  let orderId = 0;
  let checkoutId = "";

  try {
    const order = await createOrder({ name, phone, items });
    orderId = order.id;
    await setCustomerPhone(phone);
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3003";
    const proto = headerList.get("x-forwarded-proto") ?? "http";
    const checkout = await createStoreCheckout(order, `${proto}://${host}`);
    checkoutId = checkout.id;
    await saveAsaasCheckout(order.id, checkout.id, checkout.link);
    updateTag("catalog");

    return {
      ok: true as const,
      code: order.code,
      paymentUrl: checkout.link,
    };
  } catch (error) {
    if (checkoutId) {
      await cancelStoreCheckout(checkoutId);
    }

    if (orderId) {
      await setOrderStatus(orderId, "cancelado").catch(() => undefined);
      updateTag("catalog");
    }

    return {
      ok: false as const,
      message:
        error instanceof OrderError || error instanceof AsaasError
          ? error.message
          : databaseError(error).message,
    };
  }
}

export async function identifyCustomer(
  _state: { message?: string },
  formData: FormData,
): Promise<{ message?: string }> {
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));

  if (code) {
    const order = await getOrderByCode(code);

    if (!order) {
      return { message: "Nenhum pedido com esse código." };
    }

    await setCustomerPhone(order.customerPhone);
    redirect(`/pedidos/${order.code}`);
  }

  if (phone.length < 10 || phone.length > 11) {
    return { message: "Informe o código do pedido ou o WhatsApp com DDD." };
  }

  if (!(await phoneHasOrders(phone))) {
    return { message: "Nenhum pedido encontrado para este WhatsApp." };
  }

  await setCustomerPhone(phone);
  redirect("/pedidos");
}

export async function sendPaymentReceipt(
  _state: { message?: string },
  formData: FormData,
): Promise<{ message?: string }> {
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  const order = await getOrderByCode(code);

  if (!order) {
    return { message: "Pedido não encontrado." };
  }

  if (
    order.status === "cancelado" ||
    order.status === "rejeitado" ||
    order.status === "entregue"
  ) {
    return { message: "Este pedido não aceita mais comprovante." };
  }

  const file = formData.get("receipt");

  if (!(file instanceof File) || file.size === 0) {
    return { message: "Envie o comprovante do pagamento." };
  }

  let saved = "";

  try {
    saved = await saveUpload(file, "receipts", { pdf: true });
    const previous = await setPaymentReceipt(order.id, saved);

    if (previous) {
      await removeUpload(previous);
    }
  } catch (error) {
    if (saved) {
      await removeUpload(saved);
    }

    return {
      message:
        error instanceof OrderError || error instanceof Error
          ? error.message
          : databaseError(error).message,
    };
  }

  redirect(`/pedidos/${order.code}`);
}
