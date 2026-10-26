import { getLocalDatabase } from './sqlite';
import {
  Product,
  ProductVariant,
  Category,
  Supplier,
  CashSession,
  CashMovement,
  CashClosure,
  Sale,
  SaleItem,
  PaymentRecord,
  InventoryMovement,
  CreatePosSaleRequest,
  UserProfile,
  Customer,
} from '@/types';
import crypto from 'crypto';

export class StoreRepository {
  private static getDb() {
    return getLocalDatabase();
  }

  // ==========================================
  // USUARIOS Y PERFILES
  // ==========================================
  static getProfiles(): UserProfile[] {
    const db = this.getDb();
    const rows = db.prepare('SELECT * FROM profiles ORDER BY full_name ASC').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      full_name: r.full_name,
      role: r.role,
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  static getProfileById(id: string): UserProfile | null {
    const db = this.getDb();
    const r = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      email: r.email,
      full_name: r.full_name,
      role: r.role,
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  static createProfile(email: string, fullName: string, role: 'admin' | 'vendedor'): UserProfile {
    const db = this.getDb();
    const id = 'usr-' + crypto.randomUUID().slice(0, 8);
    db.prepare(`
      INSERT INTO profiles (id, email, full_name, role, is_active)
      VALUES (?, ?, ?, ?, 1)
    `).run(id, email, fullName, role);
    return this.getProfileById(id)!;
  }

  // ==========================================
  // CATEGORÍAS Y PROVEEDORES
  // ==========================================
  static getCategories(): Category[] {
    const db = this.getDb();
    const rows = db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY name ASC').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      gender: r.gender,
      description: r.description,
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
    }));
  }

  static getSuppliers(): Supplier[] {
    const db = this.getDb();
    const rows = db.prepare('SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name ASC').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      contact_info: r.contact_info,
      notes: r.notes,
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
    }));
  }

  static getOrCreateSupplier(name: string): Supplier {
    const cleanName = name.trim();
    const db = this.getDb();
    const existing = db.prepare('SELECT * FROM suppliers WHERE LOWER(name) = LOWER(?)').get(cleanName) as any;
    if (existing) {
      return {
        id: existing.id,
        name: existing.name,
        phone: existing.phone,
        contact_info: existing.contact_info,
        notes: existing.notes,
        is_active: Boolean(existing.is_active),
        created_at: existing.created_at,
      };
    }
    const id = 'sup-' + crypto.randomUUID().slice(0, 8);
    db.prepare('INSERT INTO suppliers (id, name, is_active) VALUES (?, ?, 1)').run(id, cleanName);
    return this.getOrCreateSupplier(cleanName);
  }

  // ==========================================
  // PRODUCTOS Y VARIANTES
  // ==========================================
  static getProducts(params?: {
    search?: string;
    gender?: string;
    categoryId?: string;
    category?: string;
    size?: string;
    color?: string;
    onlyPublished?: boolean;
    inStockOnly?: boolean;
  }): Product[] {
    const db = this.getDb();
    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const queryParams: any[] = [];

    if (params?.onlyPublished) {
      query += ' AND p.is_published = 1';
    }
    if (params?.gender && params.gender !== 'todos') {
      const g = params.gender.toLowerCase().trim();
      if (g === 'dama' || g === 'mujer' || g === 'mujeres' || g === 'women') {
        query += " AND (p.gender = 'dama' OR p.gender = 'mujer' OR p.gender = 'unisex')";
      } else if (g === 'hombre' || g === 'hombres' || g === 'men') {
        query += " AND (p.gender = 'hombre' OR p.gender = 'unisex')";
      } else if (g === 'unisex') {
        query += " AND p.gender = 'unisex'";
      } else {
        query += " AND p.gender = ?";
        queryParams.push(params.gender);
      }
    }
    if (params?.categoryId) {
      query += ' AND p.category_id = ?';
      queryParams.push(params.categoryId);
    }
    if (params?.category && params.category !== 'todos') {
      const cat = params.category.toLowerCase().trim();
      if (cat === 'ropa') {
        query += " AND (c.slug LIKE '%ropa%' OR c.id = 'cat-dama' OR c.id = 'cat-hombre' OR p.category_id IS NULL OR c.slug IS NULL)";
      } else if (cat === 'accesorios' || cat === 'accesorio') {
        query += " AND (c.slug LIKE '%accesorio%' OR c.id = 'cat-accesorios')";
      } else {
        query += ' AND (c.id = ? OR c.slug = ?)';
        queryParams.push(params.category, params.category);
      }
    }
    if (params?.size && params.size !== 'todas' && params.size !== 'todos') {
      query += ` AND EXISTS (
        SELECT 1 FROM product_variants v_sub 
        WHERE v_sub.product_id = p.id AND v_sub.is_active = 1 
        AND UPPER(TRIM(v_sub.size)) = UPPER(TRIM(?))
      )`;
      queryParams.push(params.size);
    }
    if (params?.color && params.color !== 'todos' && params.color !== 'todas') {
      query += ` AND EXISTS (
        SELECT 1 FROM product_variants v_sub 
        WHERE v_sub.product_id = p.id AND v_sub.is_active = 1 
        AND UPPER(v_sub.color) LIKE UPPER(?)
      )`;
      queryParams.push(`%${params.color}%`);
    }
    if (params?.search) {
      query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      queryParams.push(`%${params.search}%`, `%${params.search}%`);
    }

    query += ' ORDER BY p.name ASC';
    const products = db.prepare(query).all(...queryParams) as any[];

    // Enriquecer con variantes e imágenes
    const variantStmt = db.prepare(`
      SELECT v.*, s.name as supplier_name
      FROM product_variants v
      LEFT JOIN suppliers s ON v.supplier_id = s.id
      WHERE v.product_id = ? AND v.is_active = 1
      ORDER BY v.size ASC, v.color ASC
    `);

    const imageStmt = db.prepare(`
      SELECT * FROM product_images
      WHERE product_id = ?
      ORDER BY is_primary DESC, display_order ASC
    `);

    return products
      .map((p) => {
        const variants = (variantStmt.all(p.id) as any[]).map((v) => ({
          id: v.id,
          product_id: v.product_id,
          product_name: p.name,
          product_slug: p.slug,
          sku: v.sku,
          size: v.size,
          color: v.color,
          stock: v.stock,
          low_stock_threshold: v.low_stock_threshold,
          cost_price: v.cost_price,
          price_override: v.price_override,
          effective_price: v.price_override ?? p.base_price,
          supplier_id: v.supplier_id,
          supplier_name: v.supplier_name,
          is_active: Boolean(v.is_active),
          created_at: v.created_at,
          updated_at: v.updated_at,
        }));

        const images = (imageStmt.all(p.id) as any[]).map((img) => ({
          id: img.id,
          product_id: img.product_id,
          variant_id: img.variant_id,
          storage_path: img.storage_path,
          alt_text: img.alt_text,
          display_order: img.display_order,
          is_primary: Boolean(img.is_primary),
          created_at: img.created_at,
        }));

        const primaryImage = images.find((i) => i.is_primary)?.storage_path || images[0]?.storage_path || undefined;

        return {
          id: p.id,
          category_id: p.category_id,
          category_name: p.category_name,
          name: p.name,
          slug: p.slug,
          description: p.description,
          gender: p.gender,
          brand: p.brand,
          base_price: p.base_price,
          is_published: Boolean(p.is_published),
          is_new: Boolean(p.is_new),
          created_at: p.created_at,
          updated_at: p.updated_at,
          variants,
          images,
          primary_image: primaryImage,
        };
      })
      .filter((p) => {
        if (!params?.inStockOnly) return true;
        const totalStock = p.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
        return totalStock > 0;
      });
  }

  static getFilterOptions(): {
    sizes: string[];
    colors: string[];
    categories: { id: string; name: string }[];
    genders: { id: string; name: string }[];
  } {
    const db = this.getDb();
    const rawSizes = db.prepare(`
      SELECT DISTINCT UPPER(TRIM(size)) as size 
      FROM product_variants 
      WHERE is_active = 1 AND size IS NOT NULL AND TRIM(size) != ''
      ORDER BY size ASC
    `).all() as { size: string }[];

    // Tallas ordenadas inteligentemente
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ESTÁNDAR', 'ESTANDAR'];
    const sortedSizes = rawSizes
      .map((r) => r.size)
      .sort((a, b) => {
        const idxA = sizeOrder.indexOf(a);
        const idxB = sizeOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

    const rawColors = db.prepare(`
      SELECT DISTINCT UPPER(TRIM(color)) as color 
      FROM product_variants 
      WHERE is_active = 1 AND color IS NOT NULL AND TRIM(color) != ''
      ORDER BY color ASC
    `).all() as { color: string }[];

    // Limpieza de colores (remover comas accidentales)
    const cleanColorsSet = new Set<string>();
    for (const r of rawColors) {
      const clean = r.color.replace(/,$/, '').trim();
      if (clean) cleanColorsSet.add(clean);
    }

    return {
      sizes: sortedSizes,
      colors: Array.from(cleanColorsSet),
      categories: [
        { id: 'todos', name: 'Todas las Categorías' },
        { id: 'ropa', name: 'Ropa' },
        { id: 'accesorios', name: 'Accesorios' },
      ],
      genders: [
        { id: 'todos', name: 'Todos' },
        { id: 'dama', name: 'Mujeres' },
        { id: 'hombre', name: 'Hombres' },
      ],
    };
  }

  static getProductBySlug(slug: string): Product | null {
    const db = this.getDb();
    const p = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ?
    `).get(slug) as any;

    if (!p) return null;

    const variants = (db.prepare(`
      SELECT v.*, s.name as supplier_name
      FROM product_variants v
      LEFT JOIN suppliers s ON v.supplier_id = s.id
      WHERE v.product_id = ? AND v.is_active = 1
      ORDER BY v.size ASC, v.color ASC
    `).all(p.id) as any[]).map((v) => ({
      id: v.id,
      product_id: v.product_id,
      product_name: p.name,
      product_slug: p.slug,
      sku: v.sku,
      size: v.size,
      color: v.color,
      stock: v.stock,
      low_stock_threshold: v.low_stock_threshold,
      cost_price: v.cost_price,
      price_override: v.price_override,
      effective_price: v.price_override ?? p.base_price,
      supplier_id: v.supplier_id,
      supplier_name: v.supplier_name,
      is_active: Boolean(v.is_active),
      created_at: v.created_at,
      updated_at: v.updated_at,
    }));

    const images = (db.prepare(`
      SELECT * FROM product_images
      WHERE product_id = ?
      ORDER BY is_primary DESC, display_order ASC
    `).all(p.id) as any[]).map((img) => ({
      id: img.id,
      product_id: img.product_id,
      variant_id: img.variant_id,
      storage_path: img.storage_path,
      alt_text: img.alt_text,
      display_order: img.display_order,
      is_primary: Boolean(img.is_primary),
      created_at: img.created_at,
    }));

    return {
      id: p.id,
      category_id: p.category_id,
      category_name: p.category_name,
      name: p.name,
      slug: p.slug,
      description: p.description,
      gender: p.gender,
      brand: p.brand,
      base_price: p.base_price,
      is_published: Boolean(p.is_published),
      is_new: Boolean(p.is_new),
      created_at: p.created_at,
      updated_at: p.updated_at,
      variants,
      images,
      primary_image: images.find((i) => i.is_primary)?.storage_path || images[0]?.storage_path,
    };
  }

  static getProductById(id: string): Product | null {
    const db = this.getDb();
    const p = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id) as any;

    if (!p) return null;

    const variants = (db.prepare(`
      SELECT v.*, s.name as supplier_name
      FROM product_variants v
      LEFT JOIN suppliers s ON v.supplier_id = s.id
      WHERE v.product_id = ? AND v.is_active = 1
      ORDER BY v.size ASC, v.color ASC
    `).all(p.id) as any[]).map((v) => ({
      id: v.id,
      product_id: v.product_id,
      product_name: p.name,
      product_slug: p.slug,
      sku: v.sku,
      size: v.size,
      color: v.color,
      stock: v.stock,
      low_stock_threshold: v.low_stock_threshold,
      cost_price: v.cost_price,
      price_override: v.price_override,
      effective_price: v.price_override ?? p.base_price,
      supplier_id: v.supplier_id,
      supplier_name: v.supplier_name,
      is_active: Boolean(v.is_active),
      created_at: v.created_at,
      updated_at: v.updated_at,
    }));

    const images = (db.prepare(`
      SELECT * FROM product_images
      WHERE product_id = ?
      ORDER BY is_primary DESC, display_order ASC
    `).all(p.id) as any[]).map((img) => ({
      id: img.id,
      product_id: img.product_id,
      variant_id: img.variant_id,
      storage_path: img.storage_path,
      alt_text: img.alt_text,
      display_order: img.display_order,
      is_primary: Boolean(img.is_primary),
      created_at: img.created_at,
    }));

    return {
      id: p.id,
      category_id: p.category_id,
      category_name: p.category_name,
      name: p.name,
      slug: p.slug,
      description: p.description,
      gender: p.gender,
      brand: p.brand,
      base_price: p.base_price,
      is_published: Boolean(p.is_published),
      is_new: Boolean(p.is_new),
      created_at: p.created_at,
      updated_at: p.updated_at,
      variants,
      images,
      primary_image: images.find((i) => i.is_primary)?.storage_path || images[0]?.storage_path,
    };
  }

  // ==========================================
  // BÚSQUEDA RÁPIDA DE SKU Y VARIANTES PARA POS
  // ==========================================
  static searchVariantsForPos(query?: string): ProductVariant[] {
    const db = this.getDb();
    const clean = (query || '').trim();

    if (!clean) {
      const rows = db.prepare(`
        SELECT 
          v.*, 
          p.name as product_name, 
          p.slug as product_slug, 
          p.base_price as product_base_price,
          s.name as supplier_name,
          (
            SELECT storage_path FROM product_images 
            WHERE product_id = p.id AND (variant_id = v.id OR is_primary = 1) 
            ORDER BY is_primary DESC LIMIT 1
          ) as primary_image
        FROM product_variants v
        JOIN products p ON v.product_id = p.id
        LEFT JOIN suppliers s ON v.supplier_id = s.id
        WHERE v.is_active = 1
        ORDER BY p.name ASC, v.size ASC, v.color ASC
      `).all() as any[];

      return rows.map((r) => ({
        id: r.id,
        product_id: r.product_id,
        product_name: r.product_name,
        product_slug: r.product_slug,
        sku: r.sku,
        size: r.size,
        color: r.color,
        stock: r.stock,
        low_stock_threshold: r.low_stock_threshold,
        cost_price: r.cost_price,
        price_override: r.price_override,
        effective_price: r.price_override ?? r.product_base_price ?? 0,
        supplier_id: r.supplier_id,
        supplier_name: r.supplier_name,
        is_active: Boolean(r.is_active),
        created_at: r.created_at,
        updated_at: r.updated_at,
        primary_image: r.primary_image || undefined,
      }));
    }

    const rows = db.prepare(`
      SELECT 
        v.*, 
        p.name as product_name, 
        p.slug as product_slug, 
        p.base_price as product_base_price,
        s.name as supplier_name,
        (
          SELECT storage_path FROM product_images 
          WHERE product_id = p.id AND (variant_id = v.id OR is_primary = 1) 
          ORDER BY is_primary DESC LIMIT 1
        ) as primary_image
      FROM product_variants v
      JOIN products p ON v.product_id = p.id
      LEFT JOIN suppliers s ON v.supplier_id = s.id
      WHERE v.is_active = 1
        AND (
          v.sku LIKE ? 
          OR p.name LIKE ? 
          OR v.color LIKE ?
          OR v.size LIKE ?
        )
      ORDER BY 
        CASE WHEN v.sku = ? THEN 1
             WHEN v.sku LIKE ? THEN 2
             ELSE 3 END,
        p.name ASC
      LIMIT 25
    `).all(`%${clean}%`, `%${clean}%`, `%${clean}%`, `%${clean}%`, clean, `${clean}%`) as any[];

    return rows.map((r) => ({
      id: r.id,
      product_id: r.product_id,
      product_name: r.product_name,
      product_slug: r.product_slug,
      sku: r.sku,
      size: r.size,
      color: r.color,
      stock: r.stock,
      low_stock_threshold: r.low_stock_threshold,
      cost_price: r.cost_price,
      price_override: r.price_override,
      effective_price: r.price_override ?? r.product_base_price,
      supplier_id: r.supplier_id,
      supplier_name: r.supplier_name,
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
      updated_at: r.updated_at,
      primary_image: r.primary_image || undefined,
    }));
  }

  static getVariantBySku(sku: string): ProductVariant | null {
    const db = this.getDb();
    const r = db.prepare(`
      SELECT 
        v.*, 
        p.name as product_name, 
        p.slug as product_slug, 
        p.base_price as product_base_price,
        s.name as supplier_name,
        (
          SELECT storage_path FROM product_images 
          WHERE product_id = p.id AND (variant_id = v.id OR is_primary = 1) 
          ORDER BY is_primary DESC LIMIT 1
        ) as primary_image
      FROM product_variants v
      JOIN products p ON v.product_id = p.id
      LEFT JOIN suppliers s ON v.supplier_id = s.id
      WHERE UPPER(v.sku) = UPPER(?) AND v.is_active = 1
    `).get(sku.trim()) as any;

    if (!r) return null;

    return {
      id: r.id,
      product_id: r.product_id,
      product_name: r.product_name,
      product_slug: r.product_slug,
      sku: r.sku,
      size: r.size,
      color: r.color,
      stock: r.stock,
      low_stock_threshold: r.low_stock_threshold,
      cost_price: r.cost_price,
      price_override: r.price_override,
      effective_price: r.price_override ?? r.product_base_price,
      supplier_id: r.supplier_id,
      supplier_name: r.supplier_name,
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
      updated_at: r.updated_at,
      primary_image: r.primary_image || undefined,
    };
  }

  // ==========================================
  // CAJA PRINCIPAL COMPARTIDA
  // ==========================================
  static getActiveCashSession(): CashSession | null {
    const db = this.getDb();
    const r = db.prepare(`
      SELECT cs.*, p.full_name as opened_by_name
      FROM cash_sessions cs
      LEFT JOIN profiles p ON cs.opened_by = p.id
      WHERE cs.status = 'open'
      ORDER BY cs.opened_at DESC
      LIMIT 1
    `).get() as any;

    if (!r) return null;

    return {
      id: r.id,
      session_code: r.session_code,
      opened_by: r.opened_by,
      opened_by_name: r.opened_by_name,
      opened_at: r.opened_at,
      initial_cash: r.initial_cash,
      status: r.status,
      closed_by: r.closed_by,
      closed_at: r.closed_at,
      notes: r.notes,
    };
  }

  static openCashSession(openedBy: string, initialCash: number, notes?: string): CashSession {
    const db = this.getDb();
    const existing = this.getActiveCashSession();
    if (existing) {
      throw new Error(`Ya existe una sesión de caja principal abierta (${existing.session_code}). Debe cerrarse antes de abrir otra.`);
    }

    if (initialCash < 0) {
      throw new Error('El saldo inicial de efectivo no puede ser negativo.');
    }

    const id = 'sess-' + crypto.randomUUID().slice(0, 8);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const sessionCode = `CAJA-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;

    db.prepare(`
      INSERT INTO cash_sessions (id, session_code, opened_by, initial_cash, status, notes)
      VALUES (?, ?, ?, ?, 'open', ?)
    `).run(id, sessionCode, openedBy, initialCash, notes || null);

    return this.getActiveCashSession()!;
  }

  static recordCashMovement(
    sessionId: string,
    type: 'ingreso_extra' | 'gasto' | 'retiro' | 'deposito' | 'ajuste',
    amount: number,
    reason: string,
    reference?: string,
    registeredBy?: string
  ): CashMovement {
    const db = this.getDb();
    if (amount <= 0) {
      throw new Error('El monto del movimiento debe ser mayor a 0.');
    }
    if (!reason || reason.trim().length === 0) {
      throw new Error('El motivo del movimiento de caja es obligatorio.');
    }

    const session = db.prepare('SELECT * FROM cash_sessions WHERE id = ?').get(sessionId) as any;
    if (!session || session.status !== 'open') {
      throw new Error('No se pueden registrar movimientos en una sesión de caja cerrada o inexistente.');
    }

    const id = 'mov-' + crypto.randomUUID().slice(0, 8);
    const userId = registeredBy || session.opened_by;

    db.prepare(`
      INSERT INTO cash_movements (id, session_id, type, amount, reason, reference, registered_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, sessionId, type, amount, reason.trim(), reference || null, userId);

    return {
      id,
      session_id: sessionId,
      type,
      amount,
      reason: reason.trim(),
      reference,
      registered_by: userId,
      created_at: new Date().toISOString(),
    };
  }

  static getCashMovements(sessionId: string): CashMovement[] {
    const db = this.getDb();
    const rows = db.prepare(`
      SELECT cm.*, p.full_name as registered_by_name
      FROM cash_movements cm
      LEFT JOIN profiles p ON cm.registered_by = p.id
      WHERE cm.session_id = ?
      ORDER BY cm.created_at ASC
    `).all(sessionId) as any[];

    return rows.map((r) => ({
      id: r.id,
      session_id: r.session_id,
      type: r.type,
      amount: r.amount,
      reason: r.reason,
      reference: r.reference,
      registered_by: r.registered_by,
      registered_by_name: r.registered_by_name,
      created_at: r.created_at,
    }));
  }

  static calculateCashSessionSummary(sessionId: string) {
    const db = this.getDb();
    const session = db.prepare('SELECT * FROM cash_sessions WHERE id = ?').get(sessionId) as any;
    if (!session) {
      throw new Error('Sesión de caja no encontrada.');
    }

    const initialCash = Number(session.initial_cash || 0);

    // Ventas en efectivo
    const cashSalesRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payment_records
      WHERE session_id = ? AND payment_method = 'efectivo'
    `).get(sessionId) as { total: number };
    const cashSales = Number(cashSalesRow.total || 0);

    // Movimientos manuales: Entradas de efectivo (ingreso_extra, deposito)
    const inflowRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM cash_movements
      WHERE session_id = ? AND type IN ('ingreso_extra', 'deposito')
    `).get(sessionId) as { total: number };
    const cashInflow = Number(inflowRow.total || 0);

    // Movimientos manuales: Salidas de efectivo (gasto, retiro)
    const outflowRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM cash_movements
      WHERE session_id = ? AND type IN ('gasto', 'retiro')
    `).get(sessionId) as { total: number };
    const cashOutflow = Number(outflowRow.total || 0);

    // Total de efectivo físico esperado en el cajón
    const expectedCash = initialCash + cashSales + cashInflow - cashOutflow;

    // Medios de pago digitales
    const digitalRows = db.prepare(`
      SELECT payment_method, COALESCE(SUM(amount), 0) as total
      FROM payment_records
      WHERE session_id = ? AND payment_method != 'efectivo'
      GROUP BY payment_method
    `).all(sessionId) as { payment_method: string; total: number }[];

    const digitalTotals = {
      yape: 0,
      plin: 0,
      tarjeta: 0,
      transferencia: 0,
    };

    for (const row of digitalRows) {
      if (row.payment_method in digitalTotals) {
        (digitalTotals as any)[row.payment_method] = Number(row.total);
      }
    }

    // Ventas totales y operaciones
    const salesSummary = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
      FROM sales
      WHERE session_id = ? AND status = 'completed'
    `).get(sessionId) as { count: number; total: number };

    return {
      sessionId,
      sessionCode: session.session_code,
      status: session.status,
      openedAt: session.opened_at,
      initialCash,
      cashSales,
      cashInflow,
      cashOutflow,
      expectedCash,
      digitalTotals,
      totalSalesAmount: Number(salesSummary.total || 0),
      totalSalesCount: Number(salesSummary.count || 0),
    };
  }

  static closeCashSession(sessionId: string, closedBy: string, countedCash: number, notes?: string): CashClosure {
    const db = this.getDb();
    if (countedCash < 0) {
      throw new Error('El efectivo contado no puede ser negativo.');
    }

    const session = db.prepare('SELECT * FROM cash_sessions WHERE id = ?').get(sessionId) as any;
    if (!session) {
      throw new Error('Sesión de caja no encontrada.');
    }
    if (session.status === 'closed') {
      throw new Error('Esta sesión de caja ya fue cerrada y no se puede modificar.');
    }

    const summary = this.calculateCashSessionSummary(sessionId);
    const difference = countedCash - summary.expectedCash;
    const closureId = 'cls-' + crypto.randomUUID().slice(0, 8);
    const closedAt = new Date().toISOString();

    const tx = db.transaction(() => {
      // 1. Marcar sesión como cerrada
      db.prepare(`
        UPDATE cash_sessions
        SET status = 'closed', closed_by = ?, closed_at = ?, notes = ?
        WHERE id = ?
      `).run(closedBy, closedAt, notes || session.notes || null, sessionId);

      // 2. Insertar registro de cierre inmutable
      db.prepare(`
        INSERT INTO cash_closures (
          id, session_id, closed_by, expected_cash, counted_cash, difference, digital_totals_json, notes, closed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        closureId,
        sessionId,
        closedBy,
        summary.expectedCash,
        countedCash,
        difference,
        JSON.stringify(summary.digitalTotals),
        notes || null,
        closedAt
      );
    });

    tx();

    return {
      id: closureId,
      session_id: sessionId,
      closed_by: closedBy,
      expected_cash: summary.expectedCash,
      counted_cash: countedCash,
      difference,
      digital_totals_json: summary.digitalTotals,
      notes,
      closed_at: closedAt,
    };
  }

  // ==========================================
  // PUNTO DE VENTA (POS) - TRANSACCIÓN ATÓMICA
  // ==========================================
  static executePosSale(payload: CreatePosSaleRequest): { sale: Sale; receipt: string } {
    const db = this.getDb();

    // 1. Idempotencia: si ya existe una venta con esta clave, retornarla de inmediato
    if (payload.idempotency_key) {
      const existing = db.prepare('SELECT * FROM sales WHERE idempotency_key = ?').get(payload.idempotency_key) as any;
      if (existing) {
        return {
          sale: this.getSaleById(existing.id)!,
          receipt: existing.receipt_number,
        };
      }
    }

    // 2. Validar que la caja principal esté abierta
    const session = db.prepare('SELECT * FROM cash_sessions WHERE id = ?').get(payload.session_id) as any;
    if (!session || session.status !== 'open') {
      throw new Error('La caja principal se encuentra cerrada o no existe. Debe abrirse una sesión de caja antes de vender.');
    }

    // 3. Validar pagos vs total
    const totalPayments = payload.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    if (Math.abs(totalPayments - payload.total) > 0.05) {
      throw new Error(`El total de los medios de pago (S/ ${totalPayments.toFixed(2)}) no coincide con el total de la venta (S/ ${payload.total.toFixed(2)}).`);
    }

    if (!payload.items || payload.items.length === 0) {
      throw new Error('El carrito de venta está vacío.');
    }

    const saleId = 'sale-' + crypto.randomUUID().slice(0, 10);
    const receiptType = payload.receipt_type || 'boleta';
    const taxBase = Number((payload.total / 1.18).toFixed(2));
    const taxAmount = Number((payload.total - taxBase).toFixed(2));

    // Numeración correlativa formal por tipo de comprobante
    const countTypeRow = db.prepare('SELECT COUNT(*) as count FROM sales WHERE receipt_type = ?').get(receiptType) as any;
    const nextSeq = (countTypeRow?.count || 0) + 1;
    const prefix = receiptType === 'factura' ? 'F001' : receiptType === 'boleta' ? 'B001' : 'TK01';
    const receiptNumber = `${prefix}-${String(nextSeq).padStart(6, '0')}`;

    const tx = db.transaction(() => {
      // 4. Validar stock de cada variante ANTES de descontar y asegurar que stock >= cantidad
      for (const item of payload.items) {
        if (item.quantity <= 0) {
          throw new Error(`Cantidad inválida para SKU ${item.sku}. Debe ser mayor a 0.`);
        }

        const variant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(item.variant_id) as any;
        if (!variant) {
          throw new Error(`Variante no encontrada: ${item.sku}`);
        }

        if (variant.stock < item.quantity) {
          throw new Error(
            `Stock insuficiente para "${item.product_name}" (SKU: ${item.sku}, Talla: ${item.size}, Color: ${item.color}). Disponible: ${variant.stock}, Solicitado: ${item.quantity}. No se permite stock negativo.`
          );
        }
      }

      // 4.1. Registro o actualización automática del Cliente / Empresa
      let customerId: string | null = null;
      if (payload.customer_doc_number && payload.customer_doc_number.trim()) {
        const docClean = payload.customer_doc_number.trim();
        const existingCust = db.prepare('SELECT * FROM customers WHERE doc_number = ?').get(docClean) as any;
        if (existingCust) {
          customerId = existingCust.id;
          db.prepare(`
            UPDATE customers SET
              name = COALESCE(?, name),
              phone = COALESCE(?, phone),
              email = COALESCE(?, email),
              address = COALESCE(?, address),
              total_spent = total_spent + ?,
              orders_count = orders_count + 1,
              last_purchase_at = datetime('now'),
              updated_at = datetime('now')
            WHERE id = ?
          `).run(
            payload.customer_name?.trim() || null,
            payload.customer_phone?.trim() || null,
            payload.customer_email?.trim() || null,
            payload.customer_address?.trim() || null,
            payload.total,
            customerId
          );
        } else {
          customerId = 'cust-' + crypto.randomUUID().slice(0, 8);
          db.prepare(`
            INSERT INTO customers (
              id, doc_type, doc_number, name, phone, email, address, total_spent, orders_count, last_purchase_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
          `).run(
            customerId,
            payload.customer_doc_type || (receiptType === 'factura' ? 'RUC' : 'DNI'),
            docClean,
            payload.customer_name?.trim() || (receiptType === 'factura' ? 'Empresa sin Razón Social' : 'Cliente Varios'),
            payload.customer_phone?.trim() || '',
            payload.customer_email?.trim() || null,
            payload.customer_address?.trim() || null,
            payload.total
          );
        }
      }

      // 5. Insertar venta con desglose tributario IGV (18%) y datos de cliente
      db.prepare(`
        INSERT INTO sales (
          id, receipt_number, receipt_type, session_id, seller_id, channel, status,
          subtotal, discount, total, tax_base, tax_amount, customer_id,
          customer_doc_type, customer_doc_number, customer_name, customer_phone, customer_email, customer_address,
          notes, idempotency_key
        ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        saleId,
        receiptNumber,
        receiptType,
        payload.session_id,
        payload.seller_id,
        payload.channel,
        payload.subtotal,
        payload.discount || 0,
        payload.total,
        taxBase,
        taxAmount,
        customerId,
        payload.customer_doc_type || (receiptType === 'factura' ? 'RUC' : 'DNI'),
        payload.customer_doc_number?.trim() || null,
        payload.customer_name?.trim() || null,
        payload.customer_phone?.trim() || null,
        payload.customer_email?.trim() || null,
        payload.customer_address?.trim() || null,
        payload.notes?.trim() || null,
        payload.idempotency_key || null
      );

      // 6. Descontar stock, insertar sale_items y registrar kardex
      for (const item of payload.items) {
        const variant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(item.variant_id) as any;
        const previousStock = variant.stock;
        const newStock = previousStock - item.quantity;

        // Descuento de stock
        db.prepare(`
          UPDATE product_variants
          SET stock = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(newStock, item.variant_id);

        // Detalle inmutable
        const itemId = 'item-' + crypto.randomUUID().slice(0, 8);
        db.prepare(`
          INSERT INTO sale_items (
            id, sale_id, variant_id, sku_snapshot, product_name_snapshot,
            size_snapshot, color_snapshot, quantity, unit_price, discount, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          itemId,
          saleId,
          item.variant_id,
          item.sku,
          item.product_name,
          item.size,
          item.color,
          item.quantity,
          item.unit_price,
          item.discount || 0,
          item.subtotal
        );

        // Kardex inmutable
        const movId = 'kmov-' + crypto.randomUUID().slice(0, 8);
        db.prepare(`
          INSERT INTO inventory_movements (
            id, variant_id, type, quantity, previous_stock, new_stock,
            reason, reference_id, registered_by
          ) VALUES (?, ?, 'venta', ?, ?, ?, ?, ?, ?)
        `).run(
          movId,
          item.variant_id,
          item.quantity,
          previousStock,
          newStock,
          `Venta POS #${receiptNumber}`,
          saleId,
          payload.seller_id
        );
      }

      // 7. Insertar cobros (admite pagos mixtos)
      for (const p of payload.payments) {
        if (p.amount > 0) {
          const payId = 'pay-' + crypto.randomUUID().slice(0, 8);
          db.prepare(`
            INSERT INTO payment_records (
              id, sale_id, session_id, amount, payment_method, reference, registered_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(payId, saleId, payload.session_id, p.amount, p.payment_method, p.reference || null, payload.seller_id);
        }
      }
    });

    tx();

    return {
      sale: this.getSaleById(saleId)!,
      receipt: receiptNumber,
    };
  }

  static getSaleById(saleId: string): Sale | null {
    const db = this.getDb();
    const r = db.prepare(`
      SELECT s.*, p.full_name as seller_name
      FROM sales s
      LEFT JOIN profiles p ON s.seller_id = p.id
      WHERE s.id = ?
    `).get(saleId) as any;

    if (!r) return null;

    const items = (db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId) as any[]).map((it) => ({
      id: it.id,
      sale_id: it.sale_id,
      variant_id: it.variant_id,
      sku_snapshot: it.sku_snapshot,
      product_name_snapshot: it.product_name_snapshot,
      size_snapshot: it.size_snapshot,
      color_snapshot: it.color_snapshot,
      quantity: it.quantity,
      unit_price: it.unit_price,
      discount: it.discount,
      subtotal: it.subtotal,
    }));

    const payments = (db.prepare('SELECT * FROM payment_records WHERE sale_id = ?').all(saleId) as any[]).map((pay) => ({
      id: pay.id,
      sale_id: pay.sale_id,
      session_id: pay.session_id,
      amount: pay.amount,
      payment_method: pay.payment_method,
      reference: pay.reference,
      registered_by: pay.registered_by,
      created_at: pay.created_at,
    }));

    return {
      id: r.id,
      receipt_number: r.receipt_number,
      receipt_type: r.receipt_type || 'boleta',
      session_id: r.session_id,
      seller_id: r.seller_id,
      seller_name: r.seller_name,
      channel: r.channel,
      status: r.status,
      subtotal: Number(r.subtotal),
      discount: Number(r.discount),
      total: Number(r.total),
      tax_base: r.tax_base ? Number(r.tax_base) : Number((r.total / 1.18).toFixed(2)),
      tax_amount: r.tax_amount ? Number(r.tax_amount) : Number((r.total - (r.total / 1.18)).toFixed(2)),
      customer_id: r.customer_id,
      customer_doc_type: r.customer_doc_type,
      customer_doc_number: r.customer_doc_number,
      customer_name: r.customer_name,
      customer_phone: r.customer_phone,
      customer_email: r.customer_email,
      customer_address: r.customer_address,
      notes: r.notes,
      idempotency_key: r.idempotency_key,
      created_at: r.created_at,
      items,
      payments,
    };
  }

  static getSales(params?: { limit?: number; sellerId?: string; channel?: string; dateFrom?: string; dateTo?: string }): Sale[] {
    const db = this.getDb();
    let query = `
      SELECT s.*, p.full_name as seller_name
      FROM sales s
      LEFT JOIN profiles p ON s.seller_id = p.id
      WHERE 1=1
    `;
    const qParams: any[] = [];

    if (params?.sellerId) {
      query += ' AND s.seller_id = ?';
      qParams.push(params.sellerId);
    }
    if (params?.channel) {
      query += ' AND s.channel = ?';
      qParams.push(params.channel);
    }
    if (params?.dateFrom) {
      query += ' AND s.created_at >= ?';
      qParams.push(params.dateFrom);
    }
    if (params?.dateTo) {
      query += ' AND s.created_at <= ?';
      qParams.push(params.dateTo);
    }

    query += ' ORDER BY s.created_at DESC';
    if (params?.limit) {
      query += ` LIMIT ${params.limit}`;
    }

    const rows = db.prepare(query).all(...qParams) as any[];
    return rows.map((r) => ({
      id: r.id,
      receipt_number: r.receipt_number,
      receipt_type: r.receipt_type || 'boleta',
      session_id: r.session_id,
      seller_id: r.seller_id,
      seller_name: r.seller_name,
      channel: r.channel,
      status: r.status,
      subtotal: Number(r.subtotal),
      discount: Number(r.discount),
      total: Number(r.total),
      tax_base: r.tax_base ? Number(r.tax_base) : Number((r.total / 1.18).toFixed(2)),
      tax_amount: r.tax_amount ? Number(r.tax_amount) : Number((r.total - (r.total / 1.18)).toFixed(2)),
      customer_id: r.customer_id,
      customer_doc_type: r.customer_doc_type,
      customer_doc_number: r.customer_doc_number,
      customer_name: r.customer_name,
      customer_phone: r.customer_phone,
      customer_email: r.customer_email,
      customer_address: r.customer_address,
      notes: r.notes,
      idempotency_key: r.idempotency_key,
      created_at: r.created_at,
    }));
  }

  // ==========================================
  // ANULACIÓN Y REVERSIÓN AUDITADA DE VENTA
  // ==========================================
  static cancelSale(saleId: string, cancelledBy: string, reason: string): Sale {
    const db = this.getDb();
    if (!reason || reason.trim().length === 0) {
      throw new Error('El motivo de anulación de la venta es obligatorio.');
    }

    const sale = this.getSaleById(saleId);
    if (!sale) {
      throw new Error('Venta no encontrada.');
    }
    if (sale.status === 'cancelled') {
      throw new Error('Esta venta ya fue anulada previamente.');
    }

    const tx = db.transaction(() => {
      // 1. Marcar venta como anulada
      const updatedNotes = (sale.notes ? sale.notes + ' | ' : '') + `[ANULADA por ${cancelledBy}: ${reason.trim()}]`;
      db.prepare(`
        UPDATE sales
        SET status = 'cancelled', notes = ?
        WHERE id = ?
      `).run(updatedNotes, saleId);

      // 2. Revertir inventario de cada artículo
      for (const item of sale.items || []) {
        const variant = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(item.variant_id) as any;
        if (variant) {
          const prevStock = variant.stock;
          const newStock = prevStock + item.quantity;

          db.prepare("UPDATE product_variants SET stock = ?, updated_at = datetime('now') WHERE id = ?")
            .run(newStock, item.variant_id);

          const movId = 'kmov-' + crypto.randomUUID().slice(0, 8);
          db.prepare(`
            INSERT INTO inventory_movements (
              id, variant_id, type, quantity, previous_stock, new_stock, reason, reference_id, registered_by
            ) VALUES (?, ?, 'reversion', ?, ?, ?, ?, ?, ?)
          `).run(
            movId,
            item.variant_id,
            item.quantity,
            prevStock,
            newStock,
            `Anulación de venta #${sale.receipt_number}: ${reason.trim()}`,
            saleId,
            cancelledBy
          );
        }
      }
    });

    tx();
    return this.getSaleById(saleId)!;
  }

  // ==========================================
  // COMPRAS Y REPOSICIONES DE MERCADERÍA
  // ==========================================
  static getPurchases(limit: number = 100): any[] {
    const db = this.getDb();
    const rows = db.prepare(`
      SELECT 
        p.*, 
        s.name as supplier_name,
        pr.full_name as registered_by_name
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN profiles pr ON p.registered_by = pr.id
      ORDER BY p.created_at DESC
      LIMIT ?
    `).all(limit) as any[];

    const itemStmt = db.prepare(`
      SELECT 
        pi.*, 
        pv.sku, 
        p.name as product_name,
        pv.size,
        pv.color
      FROM purchase_items pi
      JOIN product_variants pv ON pi.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      WHERE pi.purchase_id = ?
    `);

    return rows.map((r) => ({
      ...r,
      items: itemStmt.all(r.id),
    }));
  }

  static createPurchase(payload: {
    supplier_id?: string | null;
    registered_by: string;
    invoice_ref?: string;
    notes?: string;
    items: { variant_id: string; quantity: number; unit_cost: number }[];
  }) {
    const db = this.getDb();
    if (!payload.items || payload.items.length === 0) {
      throw new Error('Debe especificar al menos una prenda en la compra.');
    }

    const purchaseId = 'pur-' + crypto.randomUUID().slice(0, 8);
    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const purchaseNumber = `COM-${dateCode}-${Math.floor(1000 + Math.random() * 9000)}`;

    const totalCost = payload.items.reduce((sum, it) => sum + it.quantity * it.unit_cost, 0);

    const tx = db.transaction(() => {
      // 1. Cabecera de compra
      db.prepare(`
        INSERT INTO purchases (id, purchase_number, supplier_id, registered_by, invoice_ref, status, total_cost, notes)
        VALUES (?, ?, ?, ?, ?, 'received', ?, ?)
      `).run(
        purchaseId,
        purchaseNumber,
        payload.supplier_id || null,
        payload.registered_by,
        payload.invoice_ref || null,
        totalCost,
        payload.notes || null
      );

      // 2. Detalle de ítems, incremento de stock y kardex compra
      for (const item of payload.items) {
        if (item.quantity <= 0) {
          throw new Error('La cantidad comprada debe ser mayor a 0.');
        }

        const variant = db.prepare('SELECT stock, sku FROM product_variants WHERE id = ?').get(item.variant_id) as any;
        if (!variant) {
          throw new Error(`Variante no encontrada: ${item.variant_id}`);
        }

        const prevStock = variant.stock;
        const newStock = prevStock + item.quantity;
        const subtotal = item.quantity * item.unit_cost;

        // Actualizar stock y costo unitario
        db.prepare(`
          UPDATE product_variants
          SET stock = ?,
              cost_price = ?,
              supplier_id = COALESCE(?, supplier_id),
              updated_at = datetime('now')
          WHERE id = ?
        `).run(newStock, item.unit_cost, payload.supplier_id || null, item.variant_id);

        // Insertar ítem de compra
        const itemId = 'pitem-' + crypto.randomUUID().slice(0, 8);
        db.prepare(`
          INSERT INTO purchase_items (id, purchase_id, variant_id, quantity, unit_cost, subtotal)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(itemId, purchaseId, item.variant_id, item.quantity, item.unit_cost, subtotal);

        // Kardex compra
        const movId = 'kmov-' + crypto.randomUUID().slice(0, 8);
        db.prepare(`
          INSERT INTO inventory_movements (
            id, variant_id, type, quantity, previous_stock, new_stock, reason, reference_id, registered_by
          ) VALUES (?, ?, 'compra', ?, ?, ?, ?, ?, ?)
        `).run(
          movId,
          item.variant_id,
          item.quantity,
          prevStock,
          newStock,
          `Compra / Reposición #${purchaseNumber}`,
          purchaseId,
          payload.registered_by
        );
      }
    });

    tx();

    return {
      id: purchaseId,
      purchase_number: purchaseNumber,
      total_cost: totalCost,
    };
  }

  // ==========================================
  // INVENTARIO, ENTRADAS Y AJUSTES
  // ==========================================
  static recordInventoryEntry(
    variantId: string,
    quantity: number,
    costPrice: number | null,
    supplierId: string | null,
    reason: string,
    registeredBy: string
  ): ProductVariant {
    const db = this.getDb();
    if (quantity <= 0) {
      throw new Error('La cantidad a ingresar debe ser mayor a 0.');
    }

    const variant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(variantId) as any;
    if (!variant) {
      throw new Error('Variante no encontrada.');
    }

    const previousStock = variant.stock;
    const newStock = previousStock + quantity;

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE product_variants
        SET stock = ?,
            cost_price = COALESCE(?, cost_price),
            supplier_id = COALESCE(?, supplier_id),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(newStock, costPrice, supplierId, variantId);

      const movId = 'kmov-' + crypto.randomUUID().slice(0, 8);
      db.prepare(`
        INSERT INTO inventory_movements (
          id, variant_id, type, quantity, previous_stock, new_stock, reason, registered_by
        ) VALUES (?, ?, 'compra', ?, ?, ?, ?, ?)
      `).run(movId, variantId, quantity, previousStock, newStock, reason || 'Entrada / Reposición de mercadería', registeredBy);
    });

    tx();
    return this.getVariantBySku(variant.sku)!;
  }

  static recordInventoryAdjustment(
    variantId: string,
    type: 'ajuste_positivo' | 'ajuste_negativo' | 'devolucion',
    quantity: number,
    reason: string,
    registeredBy: string
  ): ProductVariant {
    const db = this.getDb();
    if (quantity <= 0) {
      throw new Error('La cantidad para el ajuste debe ser mayor a 0.');
    }
    if (!reason || reason.trim().length === 0) {
      throw new Error('El motivo del ajuste de inventario es obligatorio.');
    }

    const variant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(variantId) as any;
    if (!variant) {
      throw new Error('Variante no encontrada.');
    }

    const previousStock = variant.stock;
    let newStock = previousStock;

    if (type === 'ajuste_positivo' || type === 'devolucion') {
      newStock = previousStock + quantity;
    } else if (type === 'ajuste_negativo') {
      if (previousStock < quantity) {
        throw new Error(`No se puede realizar ajuste negativo de ${quantity} unidades: stock actual es ${previousStock}. No se permite stock negativo.`);
      }
      newStock = previousStock - quantity;
    }

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE product_variants
        SET stock = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(newStock, variantId);

      const movId = 'kmov-' + crypto.randomUUID().slice(0, 8);
      db.prepare(`
        INSERT INTO inventory_movements (
          id, variant_id, type, quantity, previous_stock, new_stock, reason, registered_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(movId, variantId, type, quantity, previousStock, newStock, reason.trim(), registeredBy);
    });

    tx();
    return this.getVariantBySku(variant.sku)!;
  }

  static getInventoryMovements(params?: { variantId?: string; limit?: number }): InventoryMovement[] {
    const db = this.getDb();
    let query = `
      SELECT 
        im.*, 
        pv.sku as variant_sku,
        pv.size as size,
        pv.color as color,
        p.name as product_name,
        pr.full_name as registered_by_name
      FROM inventory_movements im
      JOIN product_variants pv ON im.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN profiles pr ON im.registered_by = pr.id
      WHERE 1=1
    `;
    const qParams: any[] = [];

    if (params?.variantId) {
      query += ' AND im.variant_id = ?';
      qParams.push(params.variantId);
    }

    query += ' ORDER BY im.created_at DESC, im.rowid DESC';
    if (params?.limit) {
      query += ` LIMIT ${params.limit}`;
    }

    const rows = db.prepare(query).all(...qParams) as any[];
    return rows.map((r) => ({
      id: r.id,
      variant_id: r.variant_id,
      variant_sku: r.variant_sku,
      product_name: r.product_name,
      size: r.size,
      color: r.color,
      type: r.type,
      quantity: r.quantity,
      previous_stock: r.previous_stock,
      new_stock: r.new_stock,
      reason: r.reason,
      reference_id: r.reference_id,
      registered_by: r.registered_by,
      registered_by_name: r.registered_by_name,
      created_at: r.created_at,
    }));
  }

  // ==========================================
  // DASHBOARD Y REPORTES COMERCIALES
  // ==========================================
  static getDashboardMetrics() {
    const db = this.getDb();

    // Productos y variantes
    const activeProducts = (db.prepare('SELECT COUNT(*) as count FROM products WHERE is_published = 1').get() as any).count;
    const totalVariants = (db.prepare('SELECT COUNT(*) as count FROM product_variants WHERE is_active = 1').get() as any).count;
    const availableUnits = (db.prepare('SELECT COALESCE(SUM(stock), 0) as total FROM product_variants WHERE is_active = 1').get() as any).total;
    const lowStockVariants = (db.prepare('SELECT COUNT(*) as count FROM product_variants WHERE is_active = 1 AND stock <= low_stock_threshold AND stock > 0').get() as any).count;
    const outOfStockVariants = (db.prepare('SELECT COUNT(*) as count FROM product_variants WHERE is_active = 1 AND stock = 0').get() as any).count;

    // Ventas de hoy
    const today = new Date().toISOString().slice(0, 10);
    const todaySales = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
      FROM sales
      WHERE status = 'completed' AND created_at >= date('now', 'start of day')
    `).get() as any;

    // Ventas por Vendedor
    const salesBySeller = db.prepare(`
      SELECT p.full_name as seller_name, COUNT(s.id) as sales_count, COALESCE(SUM(s.total), 0) as total_amount
      FROM sales s
      JOIN profiles p ON s.seller_id = p.id
      WHERE s.status = 'completed'
      GROUP BY p.id
      ORDER BY total_amount DESC
    `).all() as any[];

    // Ventas por Canal
    const salesByChannel = db.prepare(`
      SELECT channel, COUNT(*) as count, COALESCE(SUM(total), 0) as total
      FROM sales
      WHERE status = 'completed'
      GROUP BY channel
    `).all() as any[];

    // Ventas por Medio de Pago
    const salesByPaymentMethod = db.prepare(`
      SELECT payment_method, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM payment_records
      GROUP BY payment_method
      ORDER BY total DESC
    `).all() as any[];

    // Productos más vendidos
    const topProducts = db.prepare(`
      SELECT 
        si.product_name_snapshot as product_name,
        si.sku_snapshot as sku,
        si.size_snapshot as size,
        si.color_snapshot as color,
        SUM(si.quantity) as total_sold,
        SUM(si.subtotal) as total_revenue
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status = 'completed'
      GROUP BY si.sku_snapshot
      ORDER BY total_sold DESC
      LIMIT 10
    `).all() as any[];

    // Sesión de caja actual
    const activeSession = this.getActiveCashSession();
    const sessionSummary = activeSession ? this.calculateCashSessionSummary(activeSession.id) : null;

    return {
      activeProducts,
      totalVariants,
      availableUnits,
      lowStockVariants,
      outOfStockVariants,
      todaySalesCount: todaySales.count,
      todaySalesTotal: todaySales.total,
      salesBySeller,
      salesByChannel,
      salesByPaymentMethod,
      topProducts,
      activeSession,
      sessionSummary,
    };
  }

  // ==========================================
  // CONFIGURACIÓN DE LA APLICACIÓN
  // ==========================================
  static getSettings(): Record<string, any> {
    const db = this.getDb();
    const defaults = {
      store_name: 'Eclipse Store',
      tagline: 'Ropa Deportiva & Fitness para Hombre y Mujer',
      whatsapp_number: '51961339776',
      whatsapp_message_template: '¡Hola Eclipse Store! Deseo realizar el siguiente pedido desde el catálogo web:\n\n{items}\nTotal estimado: S/ {total}',
      currency: 'PEN',
      currency_symbol: 'S/',
      address: 'Stand #42 - C.C. Gamarra Plaza / Lima, Perú',
      store_phone: '+51 961 339 776',
      store_email: 'contacto@eclipsestore.pe',
      store_ruc: '20608912345',
      ticket_footer_phrase: '¡Gracias por entrenar con Eclipse Store! Cambios válidos dentro de los 7 días con etiqueta intacta y comprobante.',
      low_stock_alert_threshold: 1,
    };

    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'store_config'").get() as any;
    if (!row) {
      return defaults;
    }
    try {
      const parsed = JSON.parse(row.value);
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  }

  static updateSettings(settings: Record<string, any>, updatedBy?: string) {
    const db = this.getDb();
    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at, updated_by)
      VALUES ('store_config', ?, datetime('now'), ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = datetime('now'),
        updated_by = excluded.updated_by
    `).run(JSON.stringify(settings), updatedBy || null);
  }

  // ==========================================
  // ACTUALIZACIÓN DE PRECIOS, FOTOGRAFÍAS Y DATOS
  // ==========================================
  static updateProductPrice(productId: string, basePrice: number) {
    const db = this.getDb();
    if (basePrice < 0) {
      throw new Error('El precio base no puede ser negativo.');
    }
    db.prepare(`
      UPDATE products
      SET base_price = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(basePrice, productId);
  }

  static updateVariantPrice(variantId: string, priceOverride: number | null) {
    const db = this.getDb();
    if (priceOverride !== null && priceOverride < 0) {
      throw new Error('El precio de la variante no puede ser negativo.');
    }
    db.prepare(`
      UPDATE product_variants
      SET price_override = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(priceOverride, variantId);
  }

  static updateProductImage(productId: string, imageUrl: string, altText?: string) {
    const db = this.getDb();
    const cleanUrl = imageUrl.trim();
    if (!cleanUrl) {
      // Si la URL viene vacía, eliminar imagen principal existente
      db.prepare('DELETE FROM product_images WHERE product_id = ? AND is_primary = 1').run(productId);
      return;
    }

    const existing = db.prepare('SELECT id FROM product_images WHERE product_id = ? AND is_primary = 1').get(productId) as any;
    if (existing) {
      db.prepare(`
        UPDATE product_images
        SET storage_path = ?, alt_text = ?
        WHERE id = ?
      `).run(cleanUrl, altText || null, existing.id);
    } else {
      const imgId = 'img-' + crypto.randomUUID().slice(0, 8);
      db.prepare(`
        INSERT INTO product_images (id, product_id, storage_path, alt_text, display_order, is_primary)
        VALUES (?, ?, ?, ?, 0, 1)
      `).run(imgId, productId, cleanUrl, altText || null);
    }
  }

  static updateProductDetails(
    productId: string,
    data: {
      name?: string;
      basePrice?: number;
      gender?: 'dama' | 'hombre' | 'unisex';
      isPublished?: boolean;
      imageUrl?: string;
    }
  ) {
    const db = this.getDb();
    const tx = db.transaction(() => {
      if (data.name !== undefined || data.basePrice !== undefined || data.gender !== undefined || data.isPublished !== undefined) {
        db.prepare(`
          UPDATE products
          SET name = COALESCE(?, name),
              base_price = COALESCE(?, base_price),
              gender = COALESCE(?, gender),
              is_published = COALESCE(?, is_published),
              updated_at = datetime('now')
          WHERE id = ?
        `).run(
          data.name || null,
          data.basePrice !== undefined ? data.basePrice : null,
          data.gender || null,
          data.isPublished !== undefined ? (data.isPublished ? 1 : 0) : null,
          productId
        );
      }

      if (data.imageUrl !== undefined) {
        this.updateProductImage(productId, data.imageUrl, data.name);
      }
    });

    tx();
  }

  // ==========================================
  // GESTIÓN DE SLIDER PROMOCIONAL
  // ==========================================
  static getSliderSettings(): { speed_ms: number; autoplay: boolean; slides: any[] } {
    const db = this.getDb();
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'slider_config'").get() as any;
    if (!row) {
      return {
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
          }
        ]
      };
    }
    return JSON.parse(row.value);
  }

  static updateSliderSettings(config: { speed_ms: number; autoplay: boolean; slides: any[] }) {
    const db = this.getDb();
    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('slider_config', ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = datetime('now')
    `).run(JSON.stringify(config));
  }

  // ==========================================
  // CRUD COMPLETO DE PRODUCTOS Y MÚLTIPLES FOTOS (1 A 5)
  // ==========================================
  static setProductImages(productId: string, images: { storage_path: string; alt_text?: string; is_primary?: boolean }[]) {
    const db = this.getDb();
    db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);

    const insertImg = db.prepare(`
      INSERT INTO product_images (id, product_id, storage_path, alt_text, display_order, is_primary)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    images.slice(0, 5).forEach((img, idx) => {
      if (!img.storage_path || !img.storage_path.trim()) return;
      const imgId = 'img-' + crypto.randomUUID().slice(0, 8);
      insertImg.run(
        imgId,
        productId,
        img.storage_path.trim(),
        img.alt_text || null,
        idx,
        img.is_primary ? 1 : (idx === 0 ? 1 : 0)
      );
    });
  }

  static getProductImages(productId: string) {
    const db = this.getDb();
    return db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order ASC').all(productId) as any[];
  }

  static createProductFull(data: {
    name: string;
    description?: string;
    category_id?: string;
    gender: 'dama' | 'hombre' | 'unisex';
    base_price: number;
    is_new?: boolean;
    is_published?: boolean;
    images?: { storage_path: string; alt_text?: string; is_primary?: boolean }[];
    variants: {
      size: string;
      color: string;
      sku?: string;
      stock: number;
      cost_price?: number;
      price_override?: number;
      supplier_id?: string;
    }[];
  }) {
    const db = this.getDb();
    const productId = 'prod-' + crypto.randomUUID().slice(0, 8);
    const slugBase = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const slug = (slugBase || 'prenda') + '-' + Date.now().toString().slice(-4);

    const runTx = db.transaction(() => {
      // 1. Insert product
      db.prepare(`
        INSERT INTO products (id, category_id, name, slug, description, gender, brand, base_price, is_published, is_new)
        VALUES (?, ?, ?, ?, ?, ?, 'Eclipse Store', ?, ?, ?)
      `).run(
        productId,
        data.category_id || null,
        data.name.trim(),
        slug,
        data.description || null,
        data.gender,
        Math.max(0, data.base_price || 0),
        data.is_published === false ? 0 : 1,
        data.is_new ? 1 : 0
      );

      // 2. Insert up to 5 photos
      if (data.images && data.images.length > 0) {
        const insertImg = db.prepare(`
          INSERT INTO product_images (id, product_id, storage_path, alt_text, display_order, is_primary)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        data.images.slice(0, 5).forEach((img, idx) => {
          if (!img.storage_path || !img.storage_path.trim()) return;
          insertImg.run(
            'img-' + crypto.randomUUID().slice(0, 8),
            productId,
            img.storage_path.trim(),
            img.alt_text || null,
            idx,
            img.is_primary ? 1 : (idx === 0 ? 1 : 0)
          );
        });
      }

      // 3. Insert variants
      const insertVar = db.prepare(`
        INSERT INTO product_variants (id, product_id, sku, size, color, stock, low_stock_threshold, cost_price, price_override, supplier_id, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 1)
      `);

      const insertMov = db.prepare(`
        INSERT INTO inventory_movements (id, variant_id, type, quantity, previous_stock, new_stock, reason, reference_id, registered_by)
        VALUES (?, ?, 'ajuste_positivo', ?, 0, ?, 'Alta inicial de prenda en sistema', ?, 'usr-admin-01')
      `);

      for (const v of data.variants) {
        const variantId = 'var-' + crypto.randomUUID().slice(0, 8);
        const namePart = data.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'ROPA';
        const colPart = (v.color || 'VAR').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
        const sizePart = (v.size || 'U').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase();
        const defaultSku = `${namePart}-${colPart}-${sizePart}-${Date.now().toString().slice(-3)}`;
        const cleanSku = (v.sku && v.sku.trim()) ? v.sku.toUpperCase().trim() : defaultSku;
        const initialStock = Math.max(0, v.stock || 0);

        insertVar.run(
          variantId,
          productId,
          cleanSku,
          (v.size || 'ESTÁNDAR').toUpperCase().trim(),
          (v.color || 'NEGRO').toUpperCase().trim(),
          initialStock,
          v.cost_price ?? null,
          v.price_override ?? null,
          v.supplier_id || null
        );

        if (initialStock > 0) {
          insertMov.run(
            'mov-' + crypto.randomUUID().slice(0, 8),
            variantId,
            initialStock,
            initialStock,
            productId
          );
        }
      }
    });

    runTx();
    return this.getProductById(productId);
  }

  static deleteProduct(productId: string) {
    const db = this.getDb();
    const runTx = db.transaction(() => {
      // 1. Obtener variantes para limpiar movimientos o anular
      const variants = db.prepare('SELECT id FROM product_variants WHERE product_id = ?').all(productId) as { id: string }[];
      for (const v of variants) {
        db.prepare('DELETE FROM inventory_movements WHERE variant_id = ?').run(v.id);
      }
      db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
      db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(productId);
      db.prepare('DELETE FROM products WHERE id = ?').run(productId);
    });
    runTx();
    return true;
  }

  // ==========================================
  // AUTENTICACIÓN Y SEGURIDAD DE USUARIOS
  // ==========================================
  static authenticateUser(email: string, passwordAttempt: string) {
    const db = this.getDb();
    const user = db.prepare(`
      SELECT * FROM profiles
      WHERE LOWER(email) = LOWER(?) AND is_active = 1
    `).get(email.trim()) as any;

    if (!user) return null;
    if (user.password && user.password !== passwordAttempt.trim()) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      isActive: Boolean(user.is_active)
    };
  }

  static updateUserPassword(userId: string, newPassword: string) {
    const db = this.getDb();
    db.prepare(`
      UPDATE profiles
      SET password = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newPassword.trim(), userId);
  }

  static updateUserFull(userId: string, data: { fullName: string; role: 'admin' | 'vendedor'; password?: string; isActive?: boolean }) {
    const db = this.getDb();
    let query = "UPDATE profiles SET full_name = ?, role = ?, updated_at = datetime('now')";
    const params: any[] = [data.fullName, data.role];

    if (data.password && data.password.trim()) {
      query += ', password = ?';
      params.push(data.password.trim());
    }
    if (data.isActive !== undefined) {
      query += ', is_active = ?';
      params.push(data.isActive ? 1 : 0);
    }
    query += ' WHERE id = ?';
    params.push(userId);

    db.prepare(query).run(...params);
    return this.getProfileById(userId);
  }

  static createUserWithPassword(data: { fullName: string; email: string; role: 'admin' | 'vendedor'; password?: string }) {
    const db = this.getDb();
    const id = 'usr-' + crypto.randomUUID().slice(0, 8);
    const pwd = data.password && data.password.trim() ? data.password.trim() : 'admin123';
    db.prepare(`
      INSERT INTO profiles (id, email, full_name, role, password, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(id, data.email.trim().toLowerCase(), data.fullName.trim(), data.role, pwd);
    return this.getProfileById(id);
  }

  // ==========================================
  // CLIENTES Y EMPRESAS
  // ==========================================
  static getCustomerByDoc(docNumber: string): Customer | null {
    const db = this.getDb();
    const row = db.prepare('SELECT * FROM customers WHERE doc_number = ?').get(docNumber.trim()) as any;
    if (!row) return null;
    return {
      ...row,
      total_spent: Number(row.total_spent || 0),
      orders_count: Number(row.orders_count || 0),
    };
  }

  static getCustomers(search?: string): Customer[] {
    const db = this.getDb();
    let query = 'SELECT * FROM customers';
    const params: any[] = [];
    if (search && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      query += ' WHERE LOWER(name) LIKE ? OR doc_number LIKE ? OR phone LIKE ? OR LOWER(email) LIKE ?';
      params.push(s, s, s, s);
    }
    query += ' ORDER BY updated_at DESC';
    return (db.prepare(query).all(...params) as any[]).map((c) => ({
      ...c,
      total_spent: Number(c.total_spent || 0),
      orders_count: Number(c.orders_count || 0),
    }));
  }

  static getCustomerHistory(customerId: string): { customer: Customer; sales: Sale[] } | null {
    const db = this.getDb();
    const custRow = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as any;
    if (!custRow) return null;

    const customer: Customer = {
      ...custRow,
      total_spent: Number(custRow.total_spent || 0),
      orders_count: Number(custRow.orders_count || 0),
    };

    const salesRows = db.prepare(`
      SELECT s.*, p.full_name as seller_name
      FROM sales s
      LEFT JOIN profiles p ON s.seller_id = p.id
      WHERE s.customer_id = ? OR s.customer_doc_number = ?
      ORDER BY s.created_at DESC
    `).all(customerId, customer.doc_number) as any[];

    const sales: Sale[] = salesRows.map((s) => {
      const items = (db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(s.id) as any[]).map((it) => ({
        ...it,
        unit_price: Number(it.unit_price),
        discount: Number(it.discount),
        subtotal: Number(it.subtotal),
      }));
      return {
        ...s,
        subtotal: Number(s.subtotal),
        discount: Number(s.discount),
        total: Number(s.total),
        tax_base: s.tax_base ? Number(s.tax_base) : Number((s.total / 1.18).toFixed(2)),
        tax_amount: s.tax_amount ? Number(s.tax_amount) : Number((s.total - (s.total / 1.18)).toFixed(2)),
        items,
      };
    });

    return { customer, sales };
  }

  static upsertCustomer(data: {
    id?: string;
    doc_type: string;
    doc_number: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    notes?: string;
  }): Customer {
    const db = this.getDb();
    const docClean = data.doc_number.trim();
    const existing = db.prepare('SELECT * FROM customers WHERE doc_number = ?').get(docClean) as any;

    if (existing) {
      db.prepare(`
        UPDATE customers SET
          doc_type = ?,
          name = ?,
          phone = ?,
          email = ?,
          address = ?,
          notes = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        data.doc_type,
        data.name.trim(),
        data.phone.trim(),
        data.email?.trim() || null,
        data.address?.trim() || null,
        data.notes?.trim() || null,
        existing.id
      );
      return this.getCustomerByDoc(docClean)!;
    } else {
      const newId = data.id || ('cust-' + crypto.randomUUID().slice(0, 8));
      db.prepare(`
        INSERT INTO customers (
          id, doc_type, doc_number, name, phone, email, address, notes, total_spent, orders_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.0, 0)
      `).run(
        newId,
        data.doc_type,
        docClean,
        data.name.trim(),
        data.phone.trim(),
        data.email?.trim() || null,
        data.address?.trim() || null,
        data.notes?.trim() || null
      );
      return this.getCustomerByDoc(docClean)!;
    }
  }

  static deleteCustomer(id: string) {
    const db = this.getDb();
    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
  }
}
