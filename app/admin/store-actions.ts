"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { databaseError } from "@/lib/database";
import { OrderError, setOrderStatus, setOrderTracking } from "@/lib/orders";
import {
  collectRemovedImages,
  createBanner,
  deleteBanner,
  deleteProduct,
  deleteRemovedImages,
  persistProduct,
  saveWhatsapp,
  updateBanner,
  updateStock,
} from "@/lib/products";
import { removeUpload, saveUpload } from "@/lib/uploads";
import type { OrderStatus } from "@/lib/store-types";
import { parseProductPayload } from "@/lib/validators";

type FormState = { message?: string };

function filesFrom(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .filter((file): file is File => file instanceof File && file.size > 0);
}

export async function saveProduct(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await getCurrentAdmin();

  let raw: unknown;

  try {
    raw = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { message: "Não foi possível ler o cadastro." };
  }

  const parsed = parseProductPayload(raw);

  if ("error" in parsed) {
    return { message: parsed.error };
  }

  const id = Number(formData.get("id") || 0) || undefined;
  const files = filesFrom(formData, "photos");

  if (files.length > 8) {
    return { message: "Envie no máximo 8 fotos por vez." };
  }

  const paths: string[] = [];

  try {
    for (const file of files) {
      paths.push(await saveUpload(file, "products"));
    }

    const removed = id
      ? await collectRemovedImages(id, parsed.data.removedImageIds)
      : [];
    await persistProduct({ ...parsed.data, id, newImagePaths: paths });
    await deleteRemovedImages(removed);
  } catch (error) {
    await Promise.all(paths.map((path) => removeUpload(path)));
    return {
      message: error instanceof Error ? error.message : "Não foi possível salvar o tênis.",
    };
  }

  updateTag("catalog");
  redirect("/admin/produtos");
}

export async function removeProduct(formData: FormData) {
  await getCurrentAdmin();
  await deleteProduct(Number(formData.get("id")));
  updateTag("catalog");
  redirect("/admin/produtos");
}

export async function saveStock(formData: FormData) {
  await getCurrentAdmin();
  const entries = [...formData.entries()]
    .filter(([key]) => key.startsWith("qty-"))
    .map(([key, value]) => ({
      id: Number(key.slice(4)),
      stockQty: Number(value),
    }));

  try {
    await updateStock(entries);
  } catch (error) {
    throw databaseError(error);
  }

  updateTag("catalog");
  redirect("/admin/estoque");
}

export async function saveOrderStatus(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await getCurrentAdmin();
  const id = Number(formData.get("id"));

  try {
    await setOrderStatus(id, String(formData.get("status")) as OrderStatus);
  } catch (error) {
    return {
      message: error instanceof OrderError ? error.message : databaseError(error).message,
    };
  }

  updateTag("catalog");
  redirect(`/admin/pedidos/${id}`);
}

export async function decideOrder(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await getCurrentAdmin();
  const id = Number(formData.get("id"));
  const decision = String(formData.get("decision") ?? "");
  const status: OrderStatus | null =
    decision === "confirmar" ? "confirmado" : decision === "rejeitar" ? "rejeitado" : null;

  if (!status || !Number.isInteger(id) || id <= 0) {
    return { message: "Não foi possível atualizar o pedido." };
  }

  try {
    await setOrderStatus(id, status);
  } catch (error) {
    return {
      message: error instanceof OrderError ? error.message : databaseError(error).message,
    };
  }

  updateTag("catalog");
  redirect(formData.get("back") === "lista" ? "/admin/pedidos" : `/admin/pedidos/${id}`);
}

export async function saveOrderTracking(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await getCurrentAdmin();
  const id = Number(formData.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return { message: "Pedido não encontrado." };
  }

  try {
    await setOrderTracking(id, String(formData.get("tracking") ?? ""));
  } catch (error) {
    return {
      message: error instanceof OrderError ? error.message : databaseError(error).message,
    };
  }

  redirect(`/admin/pedidos/${id}`);
}

export async function saveStoreWhatsapp(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await getCurrentAdmin();

  try {
    await saveWhatsapp(String(formData.get("whatsapp") ?? ""));
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Não foi possível salvar o WhatsApp.",
    };
  }

  updateTag("catalog");
  redirect("/admin");
}

export async function saveNewBanner(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await getCurrentAdmin();
  const desktop = formData.get("desktop");
  const mobile = formData.get("mobile");

  if (!(desktop instanceof File) || desktop.size === 0 || !(mobile instanceof File) || mobile.size === 0) {
    return { message: "Envie o banner de desktop e o de celular." };
  }

  const paths: string[] = [];

  try {
    paths.push(await saveUpload(desktop, "banners"));
    paths.push(await saveUpload(mobile, "banners"));
    await createBanner({
      title: String(formData.get("title") ?? ""),
      subtitle: String(formData.get("subtitle") ?? ""),
      linkUrl: String(formData.get("linkUrl") ?? ""),
      imageDesktop: paths[0],
      imageMobile: paths[1],
    });
  } catch (error) {
    await Promise.all(paths.map((path) => removeUpload(path)));
    return {
      message: error instanceof Error ? error.message : "Não foi possível salvar o banner.",
    };
  }

  updateTag("catalog");
  redirect("/admin/banners");
}

export async function saveBanner(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await getCurrentAdmin();
  const desktop = formData.get("desktop");
  const mobile = formData.get("mobile");
  const paths: string[] = [];

  try {
    const imageDesktop =
      desktop instanceof File && desktop.size > 0 ? await saveUpload(desktop, "banners") : undefined;
    if (imageDesktop) {
      paths.push(imageDesktop);
    }

    const imageMobile =
      mobile instanceof File && mobile.size > 0 ? await saveUpload(mobile, "banners") : undefined;
    if (imageMobile) {
      paths.push(imageMobile);
    }

    const previous = await updateBanner({
      id: Number(formData.get("id")),
      title: String(formData.get("title") ?? ""),
      subtitle: String(formData.get("subtitle") ?? ""),
      linkUrl: String(formData.get("linkUrl") ?? ""),
      active: formData.get("active") === "on",
      imageDesktop,
      imageMobile,
    });

    if (previous.previousDesktop) {
      await removeUpload(previous.previousDesktop);
    }

    if (previous.previousMobile) {
      await removeUpload(previous.previousMobile);
    }
  } catch (error) {
    await Promise.all(paths.map((path) => removeUpload(path)));
    return {
      message: error instanceof Error ? error.message : "Não foi possível salvar o banner.",
    };
  }

  updateTag("catalog");
  redirect("/admin/banners");
}

export async function removeBanner(formData: FormData) {
  await getCurrentAdmin();
  await deleteBanner(Number(formData.get("id")));
  updateTag("catalog");
  redirect("/admin/banners");
}
