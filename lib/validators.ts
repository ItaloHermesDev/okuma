import { parseMoney } from "./format";
import {
  SHOE_SIZES,
  type ProductPayload,
  type SupplyType,
} from "./store-types";

const SIZE_SET = new Set<string>(SHOE_SIZES);

function isSupplyType(value: unknown): value is SupplyType {
  return value === "estoque" || value === "sob_demanda";
}

export function parseProductPayload(
  value: unknown,
): { data: ProductPayload } | { error: string } {
  if (!value || typeof value !== "object") {
    return { error: "Não foi possível ler o cadastro do tênis." };
  }

  const input = value as Record<string, unknown>;
  const name = String(input.name ?? "").trim();
  const description = String(input.description ?? "").trim();
  const price = parseMoney(String(input.price ?? ""));
  const saleRaw = String(input.salePrice ?? "").trim();
  const salePrice = saleRaw ? parseMoney(saleRaw) : null;

  if (name.length < 2 || name.length > 160) {
    return { error: "Informe o modelo com pelo menos 2 caracteres." };
  }

  if (description.length > 4000) {
    return { error: "A descrição passou de 4000 caracteres." };
  }

  if (price == null || price <= 0 || price > 999999) {
    return { error: "Informe um preço válido." };
  }

  if (saleRaw && (salePrice == null || salePrice <= 0)) {
    return { error: "Informe um preço com desconto válido." };
  }

  if (salePrice != null && salePrice >= price) {
    return { error: "O preço com desconto precisa ser menor que o preço." };
  }

  if (!isSupplyType(input.supplyType)) {
    return { error: "Escolha se o tênis é estoque ou sob demanda." };
  }

  if (!Array.isArray(input.colors) || input.colors.length === 0) {
    return { error: "Cadastre ao menos uma cor." };
  }

  if (input.colors.length > 8) {
    return { error: "Cadastre no máximo 8 cores." };
  }

  const colors = [];

  for (const entry of input.colors) {
    if (!entry || typeof entry !== "object") {
      return { error: "Há uma cor incompleta." };
    }

    const color = entry as Record<string, unknown>;
    const colorName = String(color.name ?? "").trim();
    const hex = String(color.hex ?? "").trim();

    if (colorName.length < 2 || colorName.length > 40) {
      return { error: "Informe o nome de cada cor." };
    }

    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
      return { error: `A cor ${colorName} está com uma cor inválida.` };
    }

    if (!Array.isArray(color.sizes) || color.sizes.length === 0) {
      return { error: `Escolha os tamanhos de ${colorName}.` };
    }

    const sizes = [];
    const seen = new Set<string>();

    for (const sizeEntry of color.sizes) {
      if (!sizeEntry || typeof sizeEntry !== "object") {
        return { error: `Há um tamanho inválido em ${colorName}.` };
      }

      const size = sizeEntry as Record<string, unknown>;
      const label = String(size.label ?? "");
      const stockQty = Number(size.stockQty ?? 0);

      if (!SIZE_SET.has(label) || seen.has(label)) {
        return { error: `Tamanho inválido em ${colorName}.` };
      }

      if (!Number.isInteger(stockQty) || stockQty < 0 || stockQty > 9999) {
        return { error: `Quantidade inválida para ${colorName} ${label}.` };
      }

      seen.add(label);
      sizes.push({
        label,
        stockQty: input.supplyType === "sob_demanda" ? 0 : stockQty,
      });
    }

    colors.push({
      name: colorName,
      hex: hex.toLowerCase(),
      sizes,
    });
  }

  const removedImageIds = Array.isArray(input.removedImageIds)
    ? input.removedImageIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    : [];

  return {
    data: {
      name,
      description,
      price,
      salePrice,
      supplyType: input.supplyType,
      active: input.active !== false,
      colors,
      removedImageIds,
    },
  };
}
