import "server-only";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { ensureDatabase, getPool } from "./database";
import { slugify } from "./format";
import type { ProductPayload } from "./store-types";
import { removeUpload } from "./uploads";

async function uniqueSlug(
  connection: Awaited<ReturnType<ReturnType<typeof getPool>["getConnection"]>>,
  name: string,
) {
  const base = slugify(name);
  let slug = base;
  let suffix = 2;

  while (true) {
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM products WHERE slug = ? LIMIT 1",
      [slug],
    );

    if (rows.length === 0) {
      return slug;
    }

    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

function cleanLink(value: string) {
  const link = value.trim();

  if (!link) {
    return "";
  }

  if (link.startsWith("/") && !link.startsWith("//")) {
    return link.slice(0, 255);
  }

  if (/^https:\/\//.test(link)) {
    return link.slice(0, 255);
  }

  throw new Error("O link do banner deve começar com / ou https://.");
}

export async function persistProduct(
  payload: ProductPayload & { id?: number; newImagePaths: string[] },
) {
  await ensureDatabase();
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();
    let productId = payload.id ?? 0;

    if (productId) {
      const [existing] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM products WHERE id = ? LIMIT 1",
        [productId],
      );

      if (!existing[0]) {
        throw new Error("Tênis não encontrado.");
      }

      const [images] = await connection.query<RowDataPacket[]>(
        "SELECT id, path FROM product_images WHERE product_id = ?",
        [productId],
      );
      const removed = new Set(payload.removedImageIds);
      const remaining = images.filter((image) => !removed.has(Number(image.id)));

      if (remaining.length + payload.newImagePaths.length === 0) {
        throw new Error("Envie ao menos uma foto do modelo.");
      }

      await connection.query(
        `UPDATE products
         SET name = ?, description = ?, price = ?, sale_price = ?, supply_type = ?, active = ?
         WHERE id = ?`,
        [
          payload.name,
          payload.description,
          payload.price,
          payload.salePrice,
          payload.supplyType,
          payload.active ? 1 : 0,
          productId,
        ],
      );
      await connection.query("DELETE FROM product_colors WHERE product_id = ?", [productId]);

      for (const image of images) {
        if (removed.has(Number(image.id))) {
          await connection.query("DELETE FROM product_images WHERE id = ? AND product_id = ?", [
            image.id,
            productId,
          ]);
        }
      }
    } else {
      if (payload.newImagePaths.length === 0) {
        throw new Error("Envie ao menos uma foto do modelo.");
      }

      const slug = await uniqueSlug(connection, payload.name);
      const [created] = await connection.query<ResultSetHeader>(
        `INSERT INTO products (name, slug, description, price, sale_price, supply_type, active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.name,
          slug,
          payload.description,
          payload.price,
          payload.salePrice,
          payload.supplyType,
          payload.active ? 1 : 0,
        ],
      );
      productId = created.insertId;
    }

    for (const color of payload.colors) {
      const [created] = await connection.query<ResultSetHeader>(
        `INSERT INTO product_colors (product_id, name, hex) VALUES (?, ?, ?)`,
        [productId, color.name, color.hex],
      );

      for (const size of color.sizes) {
        await connection.query(
          `INSERT INTO product_sizes (color_id, size_label, stock_qty) VALUES (?, ?, ?)`,
          [created.insertId, size.label, size.stockQty],
        );
      }
    }

    const [sortRows] = await connection.query<RowDataPacket[]>(
      "SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM product_images WHERE product_id = ?",
      [productId],
    );
    const sortStart = Number(sortRows[0]?.max_sort ?? -1) + 1;

    for (const [index, imagePath] of payload.newImagePaths.entries()) {
      await connection.query(
        `INSERT INTO product_images (product_id, path, sort_order) VALUES (?, ?, ?)`,
        [productId, imagePath, sortStart + index],
      );
    }

    await connection.commit();
    return productId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteRemovedImages(paths: string[]) {
  await Promise.all(paths.map((imagePath) => removeUpload(imagePath)));
}

export async function collectRemovedImages(productId: number, removedIds: number[]) {
  if (!productId || removedIds.length === 0) {
    return [];
  }

  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT path FROM product_images WHERE product_id = ? AND id IN (${removedIds.map(() => "?").join(", ")})`,
    [productId, ...removedIds],
  );

  return rows.map((row) => String(row.path));
}

export async function deleteProduct(id: number) {
  await ensureDatabase();
  const [images] = await getPool().query<RowDataPacket[]>(
    "SELECT path FROM product_images WHERE product_id = ?",
    [id],
  );
  await getPool().query("DELETE FROM products WHERE id = ?", [id]);
  await Promise.all(images.map((image) => removeUpload(String(image.path))));
}

export async function updateStock(entries: { id: number; stockQty: number }[]) {
  await ensureDatabase();
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    for (const entry of entries) {
      if (!Number.isInteger(entry.stockQty) || entry.stockQty < 0 || entry.stockQty > 9999) {
        throw new Error("Informe quantidades entre 0 e 9999.");
      }

      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT p.supply_type
         FROM product_sizes s
         JOIN product_colors c ON c.id = s.color_id
         JOIN products p ON p.id = c.product_id
         WHERE s.id = ?
         FOR UPDATE`,
        [entry.id],
      );

      if (rows[0]?.supply_type !== "estoque") {
        continue;
      }

      await connection.query("UPDATE product_sizes SET stock_qty = ? WHERE id = ?", [
        entry.stockQty,
        entry.id,
      ]);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function saveWhatsapp(number: string) {
  const digits = number.replace(/\D/g, "");

  if (digits && (digits.length < 10 || digits.length > 13)) {
    throw new Error("Informe o WhatsApp da loja com DDD.");
  }

  await ensureDatabase();
  await getPool().query(
    `INSERT INTO settings (setting_key, setting_value)
     VALUES ('whatsapp_number', ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [digits],
  );
}

export async function createBanner(input: {
  title: string;
  subtitle: string;
  linkUrl: string;
  imageDesktop: string;
  imageMobile: string;
}) {
  const title = input.title.trim();

  if (title.length < 2) {
    throw new Error("Informe o título do banner.");
  }

  await ensureDatabase();
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM banners",
  );
  await getPool().query(
    `INSERT INTO banners
      (title, subtitle, link_url, image_desktop, image_mobile, active, sort_order)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [
      title.slice(0, 160),
      input.subtitle.trim().slice(0, 255),
      cleanLink(input.linkUrl),
      input.imageDesktop,
      input.imageMobile,
      Number(rows[0]?.next_order ?? 1),
    ],
  );
}

export async function updateBanner(input: {
  id: number;
  title: string;
  subtitle: string;
  linkUrl: string;
  active: boolean;
  imageDesktop?: string;
  imageMobile?: string;
}) {
  const title = input.title.trim();

  if (title.length < 2) {
    throw new Error("Informe o título do banner.");
  }

  await ensureDatabase();
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT image_desktop, image_mobile FROM banners WHERE id = ? LIMIT 1",
    [input.id],
  );
  const current = rows[0];

  if (!current) {
    throw new Error("Banner não encontrado.");
  }

  await getPool().query(
    `UPDATE banners
     SET title = ?, subtitle = ?, link_url = ?, active = ?, image_desktop = ?, image_mobile = ?
     WHERE id = ?`,
    [
      title.slice(0, 160),
      input.subtitle.trim().slice(0, 255),
      cleanLink(input.linkUrl),
      input.active ? 1 : 0,
      input.imageDesktop ?? current.image_desktop,
      input.imageMobile ?? current.image_mobile,
      input.id,
    ],
  );

  return {
    previousDesktop: input.imageDesktop ? String(current.image_desktop) : null,
    previousMobile: input.imageMobile ? String(current.image_mobile) : null,
  };
}

export async function deleteBanner(id: number) {
  await ensureDatabase();
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT image_desktop, image_mobile FROM banners WHERE id = ? LIMIT 1",
    [id],
  );
  await getPool().query("DELETE FROM banners WHERE id = ?", [id]);
  const banner = rows[0];

  if (banner) {
    await removeUpload(String(banner.image_desktop));
    await removeUpload(String(banner.image_mobile));
  }
}
