import mysql from "mysql2/promise";
import { hashPassword } from "./password.mjs";

const CREATE_ADMINS_TABLE = `
  CREATE TABLE IF NOT EXISTS admins (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY admins_email_unique (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

const STORE_TABLES = [
  `
    CREATE TABLE IF NOT EXISTS products (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(160) NOT NULL,
      slug VARCHAR(180) NOT NULL,
      description TEXT NULL,
      price DECIMAL(10,2) NOT NULL,
      sale_price DECIMAL(10,2) NULL,
      supply_type ENUM('estoque', 'sob_demanda') NOT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY products_slug_unique (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS product_colors (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      product_id INT UNSIGNED NOT NULL,
      name VARCHAR(80) NOT NULL,
      hex CHAR(7) NOT NULL,
      PRIMARY KEY (id),
      KEY product_colors_product_id (product_id),
      CONSTRAINT product_colors_product_fk FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS product_images (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      product_id INT UNSIGNED NOT NULL,
      path VARCHAR(255) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      PRIMARY KEY (id),
      KEY product_images_product_id (product_id),
      CONSTRAINT product_images_product_fk FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS product_sizes (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      color_id INT UNSIGNED NOT NULL,
      size_label VARCHAR(8) NOT NULL,
      stock_qty INT UNSIGNED NOT NULL DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY product_sizes_color_size (color_id, size_label),
      CONSTRAINT product_sizes_color_fk FOREIGN KEY (color_id) REFERENCES product_colors (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS banners (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      title VARCHAR(160) NOT NULL,
      subtitle VARCHAR(255) NULL,
      link_url VARCHAR(255) NULL,
      image_desktop VARCHAR(255) NOT NULL,
      image_mobile VARCHAR(255) NOT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS orders (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      code VARCHAR(16) NOT NULL,
      customer_name VARCHAR(120) NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      status ENUM('solicitado', 'aguardando_pagamento', 'confirmado', 'em_separacao', 'enviado', 'entregue', 'cancelado', 'rejeitado') NOT NULL DEFAULT 'solicitado',
      payment_status ENUM('aguardando', 'pago', 'recusado', 'expirado', 'cancelado', 'estornado', 'contestado') NOT NULL DEFAULT 'aguardando',
      payment_event VARCHAR(80) NULL,
      total DECIMAL(10,2) NOT NULL,
      stock_held TINYINT(1) NOT NULL DEFAULT 0,
      tracking_code VARCHAR(80) NULL,
      payment_receipt VARCHAR(255) NULL,
      asaas_checkout_id VARCHAR(64) NULL,
      asaas_payment_url VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY orders_code_unique (code),
      KEY orders_phone (customer_phone),
      KEY orders_asaas_checkout (asaas_checkout_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS order_items (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_id INT UNSIGNED NOT NULL,
      product_id INT UNSIGNED NULL,
      size_id INT UNSIGNED NULL,
      product_name VARCHAR(160) NOT NULL,
      description TEXT NULL,
      color_name VARCHAR(80) NOT NULL,
      size_label VARCHAR(8) NOT NULL,
      supply_type ENUM('estoque', 'sob_demanda') NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      quantity INT UNSIGNED NOT NULL,
      line_total DECIMAL(10,2) NOT NULL,
      PRIMARY KEY (id),
      KEY order_items_order_id (order_id),
      CONSTRAINT order_items_order_fk FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
      CONSTRAINT order_items_product_fk FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS asaas_events (
      id VARCHAR(191) NOT NULL,
      event_name VARCHAR(80) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS settings (
      setting_key VARCHAR(64) NOT NULL,
      setting_value VARCHAR(255) NOT NULL,
      PRIMARY KEY (setting_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
];

function config() {
  const database = process.env.DB_NAME || "okuma";

  if (!/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error("DB_NAME inválido.");
  }

  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD ?? "",
    database,
  };
}

let pool;
let ready;

export function getPool() {
  if (!pool) {
    const { database, ...connection } = config();
    pool = mysql.createPool({
      ...connection,
      database,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }

  return pool;
}

export async function closePool() {
  if (!pool) {
    return;
  }

  const current = pool;
  pool = undefined;
  await current.end();
}

export function ensureDatabase() {
  if (!ready) {
    ready = setup().catch((error) => {
      ready = undefined;
      throw error;
    });
  }

  return ready;
}

async function seedStore(db) {
  const whatsapp = (process.env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
  const [settings] = await db.query(
    "SELECT setting_key FROM settings WHERE setting_key = 'whatsapp_number' LIMIT 1",
  );

  if (settings.length === 0) {
    await db.query(
      "INSERT INTO settings (setting_key, setting_value) VALUES ('whatsapp_number', ?)",
      [whatsapp],
    );
  }

  const [seeded] = await db.query(
    "SELECT setting_key FROM settings WHERE setting_key = 'store_seeded' LIMIT 1",
  );

  if (seeded.length > 0) {
    return;
  }

  const [existingProducts] = await db.query("SELECT id FROM products LIMIT 1");

  if (existingProducts.length > 0) {
    await db.query(
      "INSERT INTO settings (setting_key, setting_value) VALUES ('store_seeded', '1')",
    );
    return;
  }

  await insertProduct(db, {
    name: "Court Classic",
    slug: "court-classic",
    description:
      "Silhueta baixa, cabedal leve e solado estável para usar o dia inteiro.",
    price: 499.9,
    salePrice: 449.9,
    supplyType: "estoque",
    image: "/demo/court.svg",
    colors: [
      {
        name: "Preto",
        hex: "#111111",
        sizes: [
          ["38", 4],
          ["39", 4],
          ["40", 5],
          ["41", 5],
          ["42", 3],
        ],
      },
      {
        name: "Branco",
        hex: "#f4f4f4",
        sizes: [
          ["39", 2],
          ["40", 2],
          ["41", 2],
          ["42", 1],
        ],
      },
    ],
  });
  await insertProduct(db, {
    name: "Runner Night",
    slug: "runner-night",
    description:
      "Modelo feito sob demanda. O prazo de produção é combinado no WhatsApp depois do pedido.",
    price: 629,
    salePrice: null,
    supplyType: "sob_demanda",
    image: "/demo/runner.svg",
    colors: [
      {
        name: "Azul",
        hex: "#1d4e89",
        sizes: [
          ["39", 0],
          ["40", 0],
          ["41", 0],
          ["42", 0],
          ["43", 0],
          ["44", 0],
        ],
      },
      {
        name: "Cinza",
        hex: "#9aa0a6",
        sizes: [
          ["40", 0],
          ["41", 0],
          ["42", 0],
          ["43", 0],
        ],
      },
    ],
  });

  await db.query(
    `INSERT INTO banners
      (title, subtitle, link_url, image_desktop, image_mobile, active, sort_order)
     VALUES
      (?, ?, ?, ?, ?, 1, 1),
      (?, ?, ?, ?, ?, 1, 2)`,
    [
      "NOVA COLEÇÃO",
      "Estoque pronto para sair hoje",
      "/produtos?tipo=estoque",
      "/demo/banner-desktop.svg",
      "/demo/banner-mobile.svg",
      "SOB DEMANDA",
      "Escolha o modelo e combine o prazo no WhatsApp",
      "/produtos?tipo=sob_demanda",
      "/demo/banner-demand-desktop.svg",
      "/demo/banner-demand-mobile.svg",
    ],
  );
  await db.query(
    "INSERT INTO settings (setting_key, setting_value) VALUES ('store_seeded', '1')",
  );
}

async function insertProduct(db, product) {
  const [created] = await db.query(
    `INSERT INTO products (name, slug, description, price, sale_price, supply_type, active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [
      product.name,
      product.slug,
      product.description,
      product.price,
      product.salePrice,
      product.supplyType,
    ],
  );

  await db.query(
    "INSERT INTO product_images (product_id, path, sort_order) VALUES (?, ?, 0)",
    [created.insertId, product.image],
  );

  for (const color of product.colors) {
    const [colorRow] = await db.query(
      "INSERT INTO product_colors (product_id, name, hex) VALUES (?, ?, ?)",
      [created.insertId, color.name, color.hex],
    );

    for (const [label, qty] of color.sizes) {
      await db.query(
        "INSERT INTO product_sizes (color_id, size_label, stock_qty) VALUES (?, ?, ?)",
        [colorRow.insertId, label, qty],
      );
    }
  }

  return created.insertId;
}

async function setup() {
  const cfg = config();
  const connection = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.end();

  const db = getPool();
  await db.query(CREATE_ADMINS_TABLE);

  for (const statement of STORE_TABLES) {
    await db.query(statement);
  }

  const [primaryColumn] = await db.query(
    `SELECT COLUMN_NAME AS name
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'product_colors'
       AND COLUMN_NAME = 'is_primary'`,
  );

  if (primaryColumn.length > 0) {
    await db.query("ALTER TABLE product_colors DROP COLUMN is_primary");
  }

  const [statusColumn] = await db.query(
    `SELECT COLUMN_TYPE AS type
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'orders'
       AND COLUMN_NAME = 'status'`,
  );

  if (statusColumn[0] && !String(statusColumn[0].type).includes("aguardando_pagamento")) {
    await db.query(
      `ALTER TABLE orders
       MODIFY status ENUM('solicitado', 'aguardando_pagamento', 'confirmado', 'em_separacao', 'enviado', 'entregue', 'cancelado', 'rejeitado')
       NOT NULL DEFAULT 'solicitado'`,
    );
  }

  const [paymentColumn] = await db.query(
    `SELECT COLUMN_NAME AS name
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'orders'
       AND COLUMN_NAME = 'payment_status'`,
  );

  if (paymentColumn.length === 0) {
    await db.query(
      `ALTER TABLE orders
       ADD COLUMN payment_status ENUM('aguardando', 'pago', 'recusado', 'expirado', 'cancelado', 'estornado', 'contestado')
       NOT NULL DEFAULT 'aguardando' AFTER status,
       ADD COLUMN payment_event VARCHAR(80) NULL AFTER payment_status`,
    );
    await db.query(
      `UPDATE orders
       SET payment_status = 'pago'
       WHERE status IN ('confirmado', 'em_separacao', 'enviado', 'entregue')`,
    );
    await db.query(
      `UPDATE orders
       SET payment_status = 'cancelado'
       WHERE status IN ('cancelado', 'rejeitado')`,
    );
  }

  await db.query(
    `UPDATE orders SET status = 'solicitado' WHERE status = 'aguardando_pagamento'`,
  );

  for (const [column, definition] of [
    ["tracking_code", "tracking_code VARCHAR(80) NULL"],
    ["payment_receipt", "payment_receipt VARCHAR(255) NULL"],
    ["asaas_checkout_id", "asaas_checkout_id VARCHAR(64) NULL"],
    ["asaas_payment_url", "asaas_payment_url VARCHAR(255) NULL"],
  ]) {
    const [existing] = await db.query(
      `SELECT COLUMN_NAME AS name
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'orders'
         AND COLUMN_NAME = ?`,
      [column],
    );

    if (existing.length === 0) {
      await db.query(`ALTER TABLE orders ADD COLUMN ${definition}`);
    }
  }

  const [checkoutIndex] = await db.query(
    `SELECT INDEX_NAME AS name
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'orders'
       AND INDEX_NAME = 'orders_asaas_checkout'`,
  );

  if (checkoutIndex.length === 0) {
    await db.query("ALTER TABLE orders ADD KEY orders_asaas_checkout (asaas_checkout_id)");
  }

  await seedStore(db);

  const email = (process.env.ADMIN_EMAIL || "admin@okuma.local")
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const [rows] = await db.query(
    "SELECT id FROM admins WHERE email = ? LIMIT 1",
    [email],
  );

  if (rows.length === 0) {
    await db.query(
      "INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)",
      ["Administrador", email, await hashPassword(password)],
    );
  }
}
