import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let dbInstance: Database.Database | null = null;

export function getLocalDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const isServerless = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
  let dbPath: string;

  if (isServerless) {
    const tmpDir = '/tmp';
    dbPath = path.join(tmpDir, 'eclipse_store.db');
    const bundledDbPath = path.join(process.cwd(), 'data', 'eclipse_store.db');

    if (!fs.existsSync(dbPath) && fs.existsSync(bundledDbPath)) {
      try {
        fs.copyFileSync(bundledDbPath, dbPath);
      } catch (e) {
        console.error('Error copying database to /tmp:', e);
      }
    }
  } else {
    const dbDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    dbPath = path.join(dbDir, 'eclipse_store.db');
  }

  dbInstance = new Database(dbPath);

  // Habilitar claves foráneas y modo WAL para concurrencia y velocidad
  try {
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
  } catch (e) {
    try {
      dbInstance.pragma('journal_mode = DELETE');
    } catch {}
  }

  initSchema(dbInstance);
  seedInitialData(dbInstance);

  return dbInstance;
}

function initSchema(db: Database.Database) {
  db.exec(`
    -- 1. PROFILES
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'vendedor')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 2. CATEGORIES
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      gender TEXT CHECK (gender IN ('dama', 'hombre', 'unisex')),
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 3. SUPPLIERS
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      phone TEXT,
      contact_info TEXT,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 4. PRODUCTS
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      gender TEXT CHECK (gender IN ('dama', 'hombre', 'unisex')),
      brand TEXT NOT NULL DEFAULT 'Eclipse Store',
      base_price REAL NOT NULL DEFAULT 0.0 CHECK (base_price >= 0),
      is_published INTEGER NOT NULL DEFAULT 1,
      is_new INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 5. PRODUCT_VARIANTS
    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      sku TEXT NOT NULL UNIQUE,
      size TEXT NOT NULL,
      color TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      low_stock_threshold INTEGER NOT NULL DEFAULT 1 CHECK (low_stock_threshold >= 0),
      cost_price REAL CHECK (cost_price IS NULL OR cost_price >= 0),
      price_override REAL CHECK (price_override IS NULL OR price_override >= 0),
      supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (product_id, size, color)
    );

    -- 6. PRODUCT_IMAGES
    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
      storage_path TEXT NOT NULL,
      alt_text TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 7. CASH_SESSIONS
    CREATE TABLE IF NOT EXISTS cash_sessions (
      id TEXT PRIMARY KEY,
      session_code TEXT NOT NULL UNIQUE,
      opened_by TEXT NOT NULL REFERENCES profiles(id),
      opened_at TEXT NOT NULL DEFAULT (datetime('now')),
      initial_cash REAL NOT NULL DEFAULT 0.0 CHECK (initial_cash >= 0),
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
      closed_by TEXT REFERENCES profiles(id),
      closed_at TEXT,
      notes TEXT
    );

    -- 8. SALES
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      receipt_number TEXT NOT NULL UNIQUE,
      session_id TEXT NOT NULL REFERENCES cash_sessions(id),
      seller_id TEXT NOT NULL REFERENCES profiles(id),
      channel TEXT NOT NULL DEFAULT 'pos' CHECK (channel IN ('pos', 'whatsapp')),
      status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
      subtotal REAL NOT NULL DEFAULT 0.0 CHECK (subtotal >= 0),
      discount REAL NOT NULL DEFAULT 0.0 CHECK (discount >= 0),
      total REAL NOT NULL DEFAULT 0.0 CHECK (total >= 0),
      customer_name TEXT,
      customer_phone TEXT,
      notes TEXT,
      idempotency_key TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 9. SALE_ITEMS
    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      variant_id TEXT NOT NULL REFERENCES product_variants(id),
      sku_snapshot TEXT NOT NULL,
      product_name_snapshot TEXT NOT NULL,
      size_snapshot TEXT NOT NULL,
      color_snapshot TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price REAL NOT NULL CHECK (unit_price >= 0),
      discount REAL NOT NULL DEFAULT 0.0 CHECK (discount >= 0),
      subtotal REAL NOT NULL CHECK (subtotal >= 0)
    );

    -- 10. PAYMENT_RECORDS
    CREATE TABLE IF NOT EXISTS payment_records (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL REFERENCES cash_sessions(id),
      amount REAL NOT NULL CHECK (amount > 0),
      payment_method TEXT NOT NULL CHECK (payment_method IN ('efectivo', 'yape', 'plin', 'transferencia', 'tarjeta')),
      reference TEXT,
      registered_by TEXT NOT NULL REFERENCES profiles(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 11. CASH_MOVEMENTS
    CREATE TABLE IF NOT EXISTS cash_movements (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES cash_sessions(id),
      type TEXT NOT NULL CHECK (type IN ('ingreso_extra', 'gasto', 'retiro', 'deposito', 'ajuste')),
      amount REAL NOT NULL CHECK (amount > 0),
      reason TEXT NOT NULL,
      reference TEXT,
      registered_by TEXT NOT NULL REFERENCES profiles(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 12. CASH_CLOSURES
    CREATE TABLE IF NOT EXISTS cash_closures (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL UNIQUE REFERENCES cash_sessions(id),
      closed_by TEXT NOT NULL REFERENCES profiles(id),
      expected_cash REAL NOT NULL,
      counted_cash REAL NOT NULL CHECK (counted_cash >= 0),
      difference REAL NOT NULL,
      digital_totals_json TEXT NOT NULL DEFAULT '{}',
      notes TEXT,
      closed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 13. PURCHASES & PURCHASE_ITEMS
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      purchase_number TEXT NOT NULL UNIQUE,
      supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
      registered_by TEXT NOT NULL REFERENCES profiles(id),
      invoice_ref TEXT,
      status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('pending', 'received', 'cancelled')),
      total_cost REAL NOT NULL DEFAULT 0.0 CHECK (total_cost >= 0),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      variant_id TEXT NOT NULL REFERENCES product_variants(id),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_cost REAL NOT NULL DEFAULT 0.0 CHECK (unit_cost >= 0),
      subtotal REAL NOT NULL DEFAULT 0.0 CHECK (subtotal >= 0)
    );

    -- 14. INVENTORY_MOVEMENTS (KARDEX)
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY,
      variant_id TEXT NOT NULL REFERENCES product_variants(id),
      type TEXT NOT NULL CHECK (type IN ('compra', 'venta', 'devolucion', 'ajuste_positivo', 'ajuste_negativo', 'reversion')),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      previous_stock INTEGER NOT NULL CHECK (previous_stock >= 0),
      new_stock INTEGER NOT NULL CHECK (new_stock >= 0),
      reason TEXT NOT NULL,
      reference_id TEXT,
      registered_by TEXT NOT NULL REFERENCES profiles(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 15. APP_SETTINGS
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by TEXT REFERENCES profiles(id)
    );

    -- 16. CUSTOMERS
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      doc_type TEXT NOT NULL DEFAULT 'DNI',
      doc_number TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      notes TEXT,
      total_spent REAL NOT NULL DEFAULT 0.0,
      orders_count INTEGER NOT NULL DEFAULT 0,
      last_purchase_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ÍNDICES
    CREATE INDEX IF NOT EXISTS idx_pv_sku ON product_variants(sku);
    CREATE INDEX IF NOT EXISTS idx_pv_prod ON product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_sales_sess ON sales(session_id);
    CREATE INDEX IF NOT EXISTS idx_sales_seller ON sales(seller_id);
    CREATE INDEX IF NOT EXISTS idx_inv_mov_var ON inventory_movements(variant_id);
    CREATE INDEX IF NOT EXISTS idx_customers_doc ON customers(doc_number);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
  `);

  // Migración idempotente: Columna password en profiles
  try {
    const profileCols = db.prepare('PRAGMA table_info(profiles)').all() as { name: string }[];
    if (!profileCols.some((c) => c.name === 'password')) {
      db.exec("ALTER TABLE profiles ADD COLUMN password TEXT NOT NULL DEFAULT 'admin123'");
      db.exec("UPDATE profiles SET password = 'admin123' WHERE email = 'admin@eclipsestore.pe'");
      db.exec("UPDATE profiles SET password = 'carlos123' WHERE email = 'carlos@eclipsestore.pe'");
      db.exec("UPDATE profiles SET password = 'andrea123' WHERE email = 'andrea@eclipsestore.pe'");
    }
  } catch (err) {
    console.error('Error migrating profiles password column:', err);
  }

  // Migración idempotente: Columnas en sales para boleta/factura, IGV y clientes
  try {
    const saleCols = db.prepare('PRAGMA table_info(sales)').all() as { name: string }[];
    const colNames = saleCols.map((c) => c.name);

    if (!colNames.includes('receipt_type')) {
      db.exec("ALTER TABLE sales ADD COLUMN receipt_type TEXT NOT NULL DEFAULT 'boleta'");
    }
    if (!colNames.includes('customer_doc_type')) {
      db.exec("ALTER TABLE sales ADD COLUMN customer_doc_type TEXT DEFAULT 'DNI'");
    }
    if (!colNames.includes('customer_doc_number')) {
      db.exec("ALTER TABLE sales ADD COLUMN customer_doc_number TEXT");
    }
    if (!colNames.includes('customer_email')) {
      db.exec("ALTER TABLE sales ADD COLUMN customer_email TEXT");
    }
    if (!colNames.includes('customer_address')) {
      db.exec("ALTER TABLE sales ADD COLUMN customer_address TEXT");
    }
    if (!colNames.includes('tax_base')) {
      db.exec("ALTER TABLE sales ADD COLUMN tax_base REAL NOT NULL DEFAULT 0.0");
    }
    if (!colNames.includes('tax_amount')) {
      db.exec("ALTER TABLE sales ADD COLUMN tax_amount REAL NOT NULL DEFAULT 0.0");
    }
    if (!colNames.includes('customer_id')) {
      db.exec("ALTER TABLE sales ADD COLUMN customer_id TEXT REFERENCES customers(id)");
    }
  } catch (err) {
    console.error('Error migrating sales columns:', err);
  }
}

function seedInitialData(db: Database.Database) {
  // 1. Seed Profiles
  const countProfiles = db.prepare('SELECT COUNT(*) as count FROM profiles').get() as { count: number };
  if (countProfiles.count === 0) {
    const insertProfile = db.prepare(`
      INSERT INTO profiles (id, email, full_name, role, is_active)
      VALUES (?, ?, ?, ?, 1)
    `);

    insertProfile.run('usr-admin-01', 'admin@eclipsestore.pe', 'Administrador Eclipse', 'admin');
    insertProfile.run('usr-vend-01', 'carlos@eclipsestore.pe', 'Carlos Vendedor', 'vendedor');
    insertProfile.run('usr-vend-02', 'andrea@eclipsestore.pe', 'Andrea Vendedora', 'vendedor');
  }

  // 2. Seed Default Settings
  const countSettings = db.prepare('SELECT COUNT(*) as count FROM app_settings').get() as { count: number };
  if (countSettings.count === 0) {
    const insertSetting = db.prepare(`
      INSERT INTO app_settings (key, value)
      VALUES (?, ?)
    `);

    insertSetting.run('store_config', JSON.stringify({
      store_name: 'Eclipse Store',
      tagline: 'Ropa Deportiva & Fitness para Hombre y Mujer',
      whatsapp_number: '',
      whatsapp_message_template: '¡Hola Eclipse Store! Deseo realizar el siguiente pedido desde el catálogo web:\n\n{items}\nTotal estimado: S/ {total}',
      currency: 'PEN',
      currency_symbol: 'S/',
      address: 'Stand Comercial - Lima, Perú',
      low_stock_alert_threshold: 1,
    }));
  }

  // Verificar o inicializar slider_config
  const sliderSetting = db.prepare("SELECT value FROM app_settings WHERE key = 'slider_config'").get() as any;
  if (!sliderSetting) {
    db.prepare("INSERT INTO app_settings (key, value) VALUES ('slider_config', ?)").run(JSON.stringify({
      speed_ms: 5000,
      autoplay: true,
      slides: [
        {
          id: 'slide-1',
          title: 'NUEVA COLECCIÓN ATHLETIC 2026',
          subtitle: 'Prendas de alta compresión y estilo fitness diseñadas para alto rendimiento.',
          badge: 'COLECCIÓN OFICIAL',
          button_text: 'Ver Catálogo',
          link_url: '#productos',
          bg_color: '#000000',
          image_url: ''
        },
        {
          id: 'slide-2',
          title: 'VISÍTANOS EN NUESTRO STAND FÍSICO',
          subtitle: 'Pruébate las prendas y retira al instante con atención personalizada.',
          badge: 'STAND OFICIAL',
          button_text: 'Ver Stand y Horarios',
          link_url: '#footer',
          bg_color: '#171717',
          image_url: ''
        },
        {
          id: 'slide-3',
          title: 'PEDIDOS DIRECTOS POR WHATSAPP',
          subtitle: 'Envíos a todo el Perú en Soles (PEN). Consulta disponibilidad en tiempo real.',
          badge: 'ENVÍOS SEGUROS',
          button_text: 'Hacer Pedido',
          link_url: '#productos',
          bg_color: '#0A0A0A',
          image_url: ''
        }
      ]
    }));
  }

  // 3. Seed Default Categories
  const countCategories = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (countCategories.count === 0) {
    const insertCat = db.prepare(`
      INSERT INTO categories (id, name, slug, gender, description, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    insertCat.run('cat-dama', 'Ropa Deportiva Dama', 'ropa-deportiva-dama', 'dama', 'Prendas deportivas, tops, enterizos y leggings para mujer');
    insertCat.run('cat-hombre', 'Ropa Deportiva Hombre', 'ropa-deportiva-hombre', 'hombre', 'Polos, poleras, casacas, shorts y buzos para hombre');
    insertCat.run('cat-accesorios', 'Accesorios Deportivos', 'accesorios-deportivos', 'unisex', 'Accesorios y complementos deportivos');
  }
}
