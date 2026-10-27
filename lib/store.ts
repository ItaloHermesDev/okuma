import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { RowDataPacket } from "mysql2/promise";
import { getCurrentAdmin } from "./auth";
import { ensureDatabase, getPool } from "./database";
import type { Banner, Product, ProductColor, SupplyType } from "./store-types";

type ProductRow = RowDataPacket & {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  sale_price: string | null;
  supply_type: SupplyType;
  active: number;
};

type ColorRow = RowDataPacket & {
  id: number;
  product_id: number;
  name: string;
  hex: string;
};

type SizeRow = RowDataPacket & {
  id: number;
  color_id: number;
  size_label: string;
  stock_qty: number;
};

type ImageRow = RowDataPacket & {
  id: number;
  product_id: number;
  path: string;
  sort_order: number;
};

type BannerRow = RowDataPacket & {
  id: number;
  title: string;
  subtitle: string | null;
  link_url: string | null;
  image_desktop: string;
  image_mobile: string;
  active: number;
  sort_order: number;
};

function money(value: string | null) {
  if (value == null) {
    return null;
  }

  return Number(value);
}

async function loadProducts(activeOnly: boolean): Promise<Product[]> {
  await ensureDatabase();
  const pool = getPool();
  const [products] = await pool.query<ProductRow[]>(
    `SELECT id, name, slug, description, price, sale_price, supply_type, active
     FROM products
     ${activeOnly ? "WHERE active = 1" : ""}
     ORDER BY name`,
  );

  if (products.length === 0) {
    return [];
  }

  const ids = products.map((product) => product.id);
  const marks = ids.map(() => "?").join(", ");
  const [colors] = await pool.query<ColorRow[]>(
    `SELECT id, product_id, name, hex
     FROM product_colors
     WHERE product_id IN (${marks})
     ORDER BY id`,
    ids,
  );
  const colorIds = colors.map((color) => color.id);
  const [sizes] = colorIds.length
    ? await pool.query<SizeRow[]>(
        `SELECT id, color_id, size_label, stock_qty
         FROM product_sizes
         WHERE color_id IN (${colorIds.map(() => "?").join(", ")})
         ORDER BY size_label`,
        colorIds,
      )
    : [[] as SizeRow[]];
  const [images] = await pool.query<ImageRow[]>(
    `SELECT id, product_id, path, sort_order
     FROM product_images
     WHERE product_id IN (${marks})
     ORDER BY sort_order, id`,
    ids,
  );
  const sizesByColor = new Map<number, SizeRow[]>();

  for (const size of sizes) {
    const list = sizesByColor.get(size.color_id) ?? [];
    list.push(size);
    sizesByColor.set(size.color_id, list);
  }

  const colorsByProduct = new Map<number, ProductColor[]>();

  for (const color of colors) {
    const list = colorsByProduct.get(color.product_id) ?? [];
    list.push({
      id: color.id,
      name: color.name,
      hex: color.hex,
      sizes: (sizesByColor.get(color.id) ?? [])
        .map((size) => ({
          id: size.id,
          label: size.size_label,
          stockQty: Number(size.stock_qty),
        }))
        .sort((a, b) => Number(a.label) - Number(b.label)),
    });
    colorsByProduct.set(color.product_id, list);
  }

  const imagesByProduct = new Map<number, Product["images"]>();

  for (const image of images) {
    const list = imagesByProduct.get(image.product_id) ?? [];
    list.push({
      id: image.id,
      path: image.path,
      sortOrder: image.sort_order,
    });
    imagesByProduct.set(image.product_id, list);
  }

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    price: Number(product.price),
    salePrice: money(product.sale_price),
    supplyType: product.supply_type,
    active: product.active === 1,
    colors: colorsByProduct.get(product.id) ?? [],
    images: imagesByProduct.get(product.id) ?? [],
  }));
}

export async function getPublicCatalog() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  return loadProducts(true);
}

export async function getAdminCatalog() {
  await getCurrentAdmin();
  return loadProducts(false);
}

export async function getPublicProduct(slug: string) {
  const products = await getPublicCatalog();
  return products.find((product) => product.slug === slug) ?? null;
}

export async function getAdminProduct(id: number) {
  const products = await getAdminCatalog();
  return products.find((product) => product.id === id) ?? null;
}

export async function searchPublicProducts(
  query: string,
  supply?: SupplyType,
) {
  const products = await getPublicCatalog();
  const text = query.trim().toLowerCase();

  return products.filter((product) => {
    const matchesSupply = !supply || product.supplyType === supply;
    const matchesText =
      !text ||
      product.name.toLowerCase().includes(text) ||
      product.description.toLowerCase().includes(text);

    return matchesSupply && matchesText;
  });
}

async function loadBanners(activeOnly: boolean): Promise<Banner[]> {
  await ensureDatabase();
  const [rows] = await getPool().query<BannerRow[]>(
    `SELECT id, title, subtitle, link_url, image_desktop, image_mobile, active, sort_order
     FROM banners
     ${activeOnly ? "WHERE active = 1" : ""}
     ORDER BY sort_order, id`,
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? "",
    linkUrl: row.link_url ?? "",
    imageDesktop: row.image_desktop,
    imageMobile: row.image_mobile,
    active: row.active === 1,
    sortOrder: row.sort_order,
  }));
}

export async function getActiveBanners() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  return loadBanners(true);
}

export async function getAdminBanners() {
  await getCurrentAdmin();
  return loadBanners(false);
}

async function readSettings() {
  await ensureDatabase();
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT setting_value FROM settings WHERE setting_key = 'whatsapp_number' LIMIT 1",
  );

  return { whatsapp: String(rows[0]?.setting_value ?? "") };
}

export async function getStoreSettings() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  return readSettings();
}

export async function getStoreSettingsFresh() {
  return readSettings();
}
