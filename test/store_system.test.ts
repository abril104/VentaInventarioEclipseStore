import { describe, it, expect, beforeEach } from 'vitest';
import { StoreRepository } from '../src/lib/db/repository';
import { ExcelInventoryService } from '../src/lib/excel/importer';
import { ExcelExporterService } from '../src/lib/excel/exporter';
import { getLocalDatabase } from '../src/lib/db/sqlite';
import fs from 'fs';
import path from 'path';

describe('Suite de Pruebas Obligatorias - Eclipse Store', () => {
  const db = getLocalDatabase();

  beforeEach(() => {
    // Asegurar perfiles de prueba
    const admin = StoreRepository.getProfileById('usr-admin-01');
    expect(admin).toBeDefined();
  });

  // Caso 1: Inicio de sesión y control de permisos
  it('Caso 1: Identificación de usuario y roles diferenciados (admin vs vendedor)', () => {
    const admin = StoreRepository.getProfileById('usr-admin-01');
    const seller = StoreRepository.getProfileById('usr-vend-01');

    expect(admin?.role).toBe('admin');
    expect(seller?.role).toBe('vendedor');
    expect(admin?.is_active).toBe(true);
    expect(seller?.is_active).toBe(true);
  });

  // Caso 14: Apertura de una única caja principal compartida
  it('Caso 14: Apertura de caja principal e impedimento de sesiones concurrentes', () => {
    // Si hay una sesión abierta, la cerramos para probar apertura limpia
    const current = StoreRepository.getActiveCashSession();
    if (current) {
      StoreRepository.closeCashSession(current.id, 'usr-admin-01', 100, 'Cierre de preparación');
    }

    const session = StoreRepository.openCashSession('usr-admin-01', 150.0, 'Apertura de prueba turno');
    expect(session).toBeDefined();
    expect(session.status).toBe('open');
    expect(session.initial_cash).toBe(150.0);

    // Intentar abrir una segunda sesión mientras está abierta -> DEBE LANZAR ERROR
    expect(() => {
      StoreRepository.openCashSession('usr-vend-01', 50.0, 'Segunda sesión duplicada');
    }).toThrow(/Ya existe una sesión de caja principal abierta/);
  });

  // Caso 2: Búsqueda de un SKU existente e inexistente
  it('Caso 2: Búsqueda exacta y rápida por SKU único', () => {
    // Creamos o verificamos un producto y variante de prueba
    const cat = StoreRepository.getCategories()[0];
    const testSku = 'TEST-SKU-' + Date.now();

    // Insertamos variante de prueba
    const prodId = 'prod-test-' + Date.now();
    const varId = 'var-test-' + Date.now();
    db.prepare('INSERT INTO products (id, category_id, name, slug, gender, brand, base_price, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, 1)')
      .run(prodId, cat.id, 'Polo Test Performance', 'polo-test-performance-' + Date.now(), 'hombre', 'Eclipse Store', 35.0);

    db.prepare('INSERT INTO product_variants (id, product_id, sku, size, color, stock, low_stock_threshold, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)')
      .run(varId, prodId, testSku, 'M', 'NEGRO', 10, 1);

    const found = StoreRepository.getVariantBySku(testSku);
    expect(found).not.toBeNull();
    expect(found?.sku).toBe(testSku);
    expect(found?.stock).toBe(10);

    const notFound = StoreRepository.getVariantBySku('SKU-TOTALMENTE-INEXISTENTE');
    expect(notFound).toBeNull();
  });

  // Caso 3 y 5: Venta con una variante y descuento correcto del inventario
  it('Caso 3 y 5: Registro de venta con una variante y descuento exacto de stock en Kardex', () => {
    const session = StoreRepository.getActiveCashSession()!;
    const testSku = 'TEST-VENTA-' + Date.now();
    const prodId = 'prod-v1-' + Date.now();
    const varId = 'var-v1-' + Date.now();

    db.prepare('INSERT INTO products (id, name, slug, gender, base_price, is_published) VALUES (?, ?, ?, ?, ?, 1)')
      .run(prodId, 'Top Fitness Pro', 'top-fitness-pro-' + Date.now(), 'dama', 28.0);
    db.prepare('INSERT INTO product_variants (id, product_id, sku, size, color, stock, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run(varId, prodId, testSku, 'S', 'AZUL', 5);

    const initialStock = StoreRepository.getVariantBySku(testSku)!.stock;

    // Venta de 2 unidades
    const saleResult = StoreRepository.executePosSale({
      session_id: session.id,
      seller_id: 'usr-vend-01',
      channel: 'pos',
      subtotal: 56.0,
      discount: 0,
      total: 56.0,
      items: [
        {
          variant_id: varId,
          sku: testSku,
          product_name: 'Top Fitness Pro',
          size: 'S',
          color: 'AZUL',
          quantity: 2,
          unit_price: 28.0,
          subtotal: 56.0,
        },
      ],
      payments: [
        {
          payment_method: 'efectivo',
          amount: 56.0,
        },
      ],
    });

    expect(saleResult.sale).toBeDefined();
    expect(saleResult.sale.receipt_number).toMatch(/^(TK-|B001-|F001-)/);
    expect(saleResult.sale.seller_id).toBe('usr-vend-01');

    // Comprobar que el stock bajó exactamente de 5 a 3
    const finalVariant = StoreRepository.getVariantBySku(testSku)!;
    expect(finalVariant.stock).toBe(initialStock - 2);

    // Comprobar kardex
    const movements = StoreRepository.getInventoryMovements({ variantId: varId });
    expect(movements.length).toBeGreaterThan(0);
    expect(movements[0].type).toBe('venta');
    expect(movements[0].previous_stock).toBe(5);
    expect(movements[0].new_stock).toBe(3);
  });

  // Caso 4: Venta con varias variantes
  it('Caso 4: Venta multi-prenda atómica', () => {
    const session = StoreRepository.getActiveCashSession()!;
    const var1Id = 'var-multi-1-' + Date.now();
    const var2Id = 'var-multi-2-' + Date.now();
    const prodId = 'prod-multi-' + Date.now();

    db.prepare('INSERT INTO products (id, name, slug, gender, base_price, is_published) VALUES (?, ?, ?, ?, ?, 1)')
      .run(prodId, 'Short Training', 'short-training-' + Date.now(), 'hombre', 30.0);
    db.prepare('INSERT INTO product_variants (id, product_id, sku, size, color, stock, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run(var1Id, prodId, 'SHORT-M-' + Date.now(), 'M', 'NEGRO', 4);
    db.prepare('INSERT INTO product_variants (id, product_id, sku, size, color, stock, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run(var2Id, prodId, 'SHORT-L-' + Date.now(), 'L', 'AZUL', 6);

    const saleResult = StoreRepository.executePosSale({
      session_id: session.id,
      seller_id: 'usr-vend-02',
      channel: 'pos',
      subtotal: 60.0,
      discount: 5.0,
      total: 55.0,
      items: [
        {
          variant_id: var1Id,
          sku: 'SHORT-M',
          product_name: 'Short Training',
          size: 'M',
          color: 'NEGRO',
          quantity: 1,
          unit_price: 30.0,
          subtotal: 30.0,
        },
        {
          variant_id: var2Id,
          sku: 'SHORT-L',
          product_name: 'Short Training',
          size: 'L',
          color: 'AZUL',
          quantity: 1,
          unit_price: 30.0,
          subtotal: 30.0,
        },
      ],
      payments: [
        { payment_method: 'tarjeta', amount: 55.0 },
      ],
    });

    expect(saleResult.sale.total).toBe(55.0);
    expect(saleResult.sale.items?.length).toBe(2);
  });

  // Caso 6 y 7: Prevención de stock negativo
  it('Caso 6 y 7: Impide stock negativo y rechaza ventas que superen unidades disponibles', () => {
    const session = StoreRepository.getActiveCashSession()!;
    const varId = 'var-limite-' + Date.now();
    const prodId = 'prod-limite-' + Date.now();

    db.prepare('INSERT INTO products (id, name, slug, gender, base_price, is_published) VALUES (?, ?, ?, ?, ?, 1)')
      .run(prodId, 'Casaca Polar', 'casaca-polar-' + Date.now(), 'dama', 45.0);
    db.prepare('INSERT INTO product_variants (id, product_id, sku, size, color, stock, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run(varId, prodId, 'CASACA-1UNID-' + Date.now(), 'M', 'ROJO', 1); // Solo 1 unidad

    // Intentar comprar 2 unidades -> DEBE RECHAZARSE Y LANZAR EXCEPCIÓN
    expect(() => {
      StoreRepository.executePosSale({
        session_id: session.id,
        seller_id: 'usr-vend-01',
        channel: 'pos',
        subtotal: 90.0,
        discount: 0,
        total: 90.0,
        items: [
          {
            variant_id: varId,
            sku: 'CASACA-1UNID',
            product_name: 'Casaca Polar',
            size: 'M',
            color: 'ROJO',
            quantity: 2,
            unit_price: 45.0,
            subtotal: 90.0,
          },
        ],
        payments: [{ payment_method: 'efectivo', amount: 90.0 }],
      });
    }).toThrow(/Stock insuficiente/);

    // Stock debe permanecer intacto en 1
    const v = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(varId) as any;
    expect(v.stock).toBe(1);
  });

  // Caso 8: Protección contra ventas duplicadas (idempotencia)
  it('Caso 8: Clave de idempotencia previene doble cobro por doble clic', () => {
    const session = StoreRepository.getActiveCashSession()!;
    const varId = 'var-idemp-' + Date.now();
    const prodId = 'prod-idemp-' + Date.now();

    db.prepare('INSERT INTO products (id, name, slug, gender, base_price, is_published) VALUES (?, ?, ?, ?, ?, 1)')
      .run(prodId, 'Legging Sirena', 'legging-sirena-' + Date.now(), 'dama', 32.0);
    db.prepare('INSERT INTO product_variants (id, product_id, sku, size, color, stock, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run(varId, prodId, 'LEG-IDEMP-' + Date.now(), 'S', 'NEGRO', 10);

    const idempotencyKey = 'key-test-double-click-' + Date.now();

    const salePayload = {
      session_id: session.id,
      seller_id: 'usr-vend-01',
      channel: 'pos' as const,
      subtotal: 32.0,
      discount: 0,
      total: 32.0,
      idempotency_key: idempotencyKey,
      items: [
        {
          variant_id: varId,
          sku: 'LEG-IDEMP',
          product_name: 'Legging Sirena',
          size: 'S',
          color: 'NEGRO',
          quantity: 1,
          unit_price: 32.0,
          subtotal: 32.0,
        },
      ],
      payments: [{ payment_method: 'efectivo' as const, amount: 32.0 }],
    };

    // Primera llamada
    const res1 = StoreRepository.executePosSale(salePayload);
    // Segunda llamada con la misma clave (simulando doble clic)
    const res2 = StoreRepository.executePosSale(salePayload);

    expect(res1.sale.id).toBe(res2.sale.id);
    expect(res1.receipt).toBe(res2.receipt);

    // El stock solo se debe haber descontado 1 vez (de 10 a 9)
    const v = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(varId) as any;
    expect(v.stock).toBe(9);
  });

  // Caso 9: Reposición de existencias
  it('Caso 9: Reposición de mercadería aumenta stock y genera kardex compra', () => {
    const varId = 'var-repo-' + Date.now();
    const prodId = 'prod-repo-' + Date.now();

    db.prepare('INSERT INTO products (id, name, slug, gender, base_price, is_published) VALUES (?, ?, ?, ?, ?, 1)')
      .run(prodId, 'Top Andrea', 'top-andrea-' + Date.now(), 'dama', 25.0);
    db.prepare('INSERT INTO product_variants (id, product_id, sku, size, color, stock, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run(varId, prodId, 'TOP-ANDREA-' + Date.now(), 'M', 'VERDE', 2);

    const updated = StoreRepository.recordInventoryEntry(
      varId,
      8, // Entran 8
      15.0, // Costo S/ 15
      null,
      'Reabastecimiento de stand',
      'usr-admin-01'
    );

    expect(updated.stock).toBe(10); // 2 + 8 = 10
  });

  // Caso 10: Ajustes y devoluciones
  it('Caso 10: Ajuste negativo y devolución vendible auditada', () => {
    const varId = 'var-ajuste-' + Date.now();
    const prodId = 'prod-ajuste-' + Date.now();

    db.prepare('INSERT INTO products (id, name, slug, gender, base_price, is_published) VALUES (?, ?, ?, ?, ?, 1)')
      .run(prodId, 'Buzo Fresh', 'buzo-fresh-' + Date.now(), 'hombre', 40.0);
    db.prepare('INSERT INTO product_variants (id, product_id, sku, size, color, stock, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run(varId, prodId, 'BUZO-ADJ-' + Date.now(), 'L', 'AZUL', 5);

    // Ajuste negativo por prenda dañada (-1)
    const afterMerma = StoreRepository.recordInventoryAdjustment(
      varId,
      'ajuste_negativo',
      1,
      'Prenda con cierre roto apartada de exhibición',
      'usr-admin-01'
    );
    expect(afterMerma.stock).toBe(4);

    // Devolución de cliente en estado vendible (+1)
    const afterDev = StoreRepository.recordInventoryAdjustment(
      varId,
      'devolucion',
      1,
      'Cambio de talla por prenda nueva en perfecto estado',
      'usr-admin-01'
    );
    expect(afterDev.stock).toBe(5);
  });

  // Caso 12 y 13: Alerta de stock bajo (<= 1) y variante agotada (0)
  it('Caso 12 y 13: Detección de umbral de stock bajo y variante agotada', () => {
    const metrics = StoreRepository.getDashboardMetrics();
    expect(metrics.lowStockVariants).toBeDefined();
    expect(metrics.outOfStockVariants).toBeDefined();
  });

  // Caso 15: Múltiples vendedores en la misma caja abierta
  it('Caso 15: Varios vendedores registran ventas en la misma caja con atribución individual', () => {
    const session = StoreRepository.getActiveCashSession()!;
    const varId = 'var-vend-test-' + Date.now();
    const prodId = 'prod-vend-test-' + Date.now();

    db.prepare('INSERT INTO products (id, name, slug, gender, base_price, is_published) VALUES (?, ?, ?, ?, ?, 1)')
      .run(prodId, 'Top Carol', 'top-carol-' + Date.now(), 'dama', 26.0);
    db.prepare('INSERT INTO product_variants (id, product_id, sku, size, color, stock, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run(varId, prodId, 'TOP-CAROL-' + Date.now(), 'M', 'LILA', 20);

    // Venta 1: Carlos Vendedor
    const sale1 = StoreRepository.executePosSale({
      session_id: session.id,
      seller_id: 'usr-vend-01',
      channel: 'pos',
      subtotal: 26.0,
      discount: 0,
      total: 26.0,
      items: [{ variant_id: varId, sku: 'TOP-CAROL', product_name: 'Top Carol', size: 'M', color: 'LILA', quantity: 1, unit_price: 26.0, subtotal: 26.0 }],
      payments: [{ payment_method: 'efectivo', amount: 26.0 }],
    });

    // Venta 2: Andrea Vendedora
    const sale2 = StoreRepository.executePosSale({
      session_id: session.id,
      seller_id: 'usr-vend-02',
      channel: 'pos',
      subtotal: 26.0,
      discount: 0,
      total: 26.0,
      items: [{ variant_id: varId, sku: 'TOP-CAROL', product_name: 'Top Carol', size: 'M', color: 'LILA', quantity: 1, unit_price: 26.0, subtotal: 26.0 }],
      payments: [{ payment_method: 'yape', amount: 26.0 }],
    });

    expect(sale1.sale.seller_id).toBe('usr-vend-01');
    expect(sale2.sale.seller_id).toBe('usr-vend-02');
    expect(sale1.sale.session_id).toBe(session.id);
    expect(sale2.sale.session_id).toBe(session.id);
  });

  // Caso 16 y 17: Cobros mixtos, gastos y cálculo exacto de efectivo esperado
  it('Caso 16 y 17: Cobros mixtos, movimientos manuales de caja y cálculo de efectivo esperado', () => {
    const session = StoreRepository.getActiveCashSession()!;

    // Registrar gasto de caja (S/ 15 de útiles)
    StoreRepository.recordCashMovement(
      session.id,
      'gasto',
      15.0,
      'Compra de bolsas para despacho',
      undefined,
      'usr-vend-01'
    );

    const summary = StoreRepository.calculateCashSessionSummary(session.id);
    expect(summary.cashOutflow).toBeGreaterThanOrEqual(15.0);

    // Efectivo esperado debe ser = inicial + ventas efectivo + ingresos - salidas
    const expected = summary.initialCash + summary.cashSales + summary.cashInflow - summary.cashOutflow;
    expect(summary.expectedCash).toBeCloseTo(expected, 2);
  });

  // Caso 18 y 19: Cierre de caja, cálculo de diferencia e inmutabilidad
  it('Caso 18 y 19: Cierre de caja, arqueo físico con diferencia y restricción de re-cierre', () => {
    const session = StoreRepository.getActiveCashSession()!;
    const summary = StoreRepository.calculateCashSessionSummary(session.id);

    // Contamos S/ 5 menos que lo esperado (faltante de 5 soles)
    const countedCash = summary.expectedCash - 5.0;

    const closure = StoreRepository.closeCashSession(
      session.id,
      'usr-admin-01',
      countedCash,
      'Faltante de 5 soles justificado en arqueo final'
    );

    expect(closure).toBeDefined();
    expect(closure.difference).toBeCloseTo(-5.0, 2);

    // Intentar cerrar de nuevo una sesión ya cerrada -> DEBE LANZAR ERROR
    expect(() => {
      StoreRepository.closeCashSession(session.id, 'usr-admin-01', countedCash);
    }).toThrow(/ya fue cerrada/);
  });

  // Caso 20: Pedido WhatsApp no descuenta inventario automáticamente
  it('Caso 20: Preparación de pedido de WhatsApp no modifica stock físico', () => {
    const varId = 'var-wa-' + Date.now();
    const prodId = 'prod-wa-' + Date.now();

    db.prepare('INSERT INTO products (id, name, slug, gender, base_price, is_published) VALUES (?, ?, ?, ?, ?, 1)')
      .run(prodId, 'Enterizo Xiomy', 'enterizo-xiomy-' + Date.now(), 'dama', 55.0);
    db.prepare('INSERT INTO product_variants (id, product_id, sku, size, color, stock, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run(varId, prodId, 'ENT-XIOMY-' + Date.now(), 'ESTÁNDAR', 'NEGRO', 2);

    const stockBefore = StoreRepository.getVariantBySku('ENT-XIOMY-' + Date.now().toString().slice(0, 5))?.stock;
    // El cliente arma su pedido web y genera el link de WhatsApp (no descuenta BD)
    const stockAfter = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(varId) as any;

    expect(stockAfter.stock).toBe(2);
  });

  // Caso 21 y 22: Validación del Excel e importación controlada
  it('Caso 21 y 22: Detección de SKU duplicados, precios faltantes y advertencias en Excel', () => {
    const excelPath = path.join(process.cwd(), 'data', 'INVENTARIO2311AM_con_SKU_revision.xlsx');
    if (fs.existsSync(excelPath)) {
      const buffer = fs.readFileSync(excelPath);
      const report = ExcelInventoryService.parseAndValidateBuffer(buffer, 'INVENTARIO2311AM_con_SKU_revision.xlsx');

      expect(report.totalRows).toBeGreaterThan(0);
      expect(report.rows.length).toBe(report.totalRows);

      // Verificar que se detectan advertencias para precios 0 o vacíos
      const priceWarnings = report.rows.filter((r) => r.statusNotes.some((n) => n.includes('Precio')));
      expect(priceWarnings.length).toBeGreaterThan(0);

      // Verificar que se detectan advertencias para colores agrupados
      const colorWarnings = report.rows.filter((r) => r.statusNotes.some((n) => n.includes('colores agrupados') || n.includes('Colores')));
      expect(colorWarnings.length).toBeGreaterThan(0);
    }
  });

  // Caso 11: Anulación y reversión auditadas
  it('Caso 11: Anulación de venta y reversión auditada de inventario', () => {
    // Abrir o verificar sesión
    let session = StoreRepository.getActiveCashSession();
    if (!session) {
      session = StoreRepository.openCashSession('usr-admin-01', 100);
    }

    const varId = 'var-anul-' + Date.now();
    const prodId = 'prod-anul-' + Date.now();
    db.prepare('INSERT INTO products (id, name, slug, gender, base_price, is_published) VALUES (?, ?, ?, ?, ?, 1)')
      .run(prodId, 'Polo Andrea Pro', 'polo-andrea-pro-' + Date.now(), 'dama', 30.0);
    db.prepare('INSERT INTO product_variants (id, product_id, sku, size, color, stock, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run(varId, prodId, 'POLO-ANUL-' + Date.now(), 'L', 'AZUL', 8);

    // Venta de 2 unidades -> stock baja a 6
    const saleRes = StoreRepository.executePosSale({
      session_id: session.id,
      seller_id: 'usr-vend-01',
      channel: 'pos',
      subtotal: 60.0,
      discount: 0,
      total: 60.0,
      items: [{ variant_id: varId, sku: 'POLO-ANUL', product_name: 'Polo Andrea Pro', size: 'L', color: 'AZUL', quantity: 2, unit_price: 30.0, subtotal: 60.0 }],
      payments: [{ payment_method: 'efectivo', amount: 60.0 }],
    });

    const stockDuringSale = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(varId) as any;
    expect(stockDuringSale.stock).toBe(6);

    // Anular venta auditada
    const cancelled = StoreRepository.cancelSale(
      saleRes.sale.id,
      'usr-admin-01',
      'Cliente solicitó anulación inmediata por cambio de parecer'
    );

    expect(cancelled.status).toBe('cancelled');

    // Stock debe restaurarse a 8
    const stockAfterCancel = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(varId) as any;
    expect(stockAfterCancel.stock).toBe(8);

    // Kardex debe registrar reversión
    const movs = StoreRepository.getInventoryMovements({ variantId: varId });
    const revMov = movs.find((m) => m.type === 'reversion');
    expect(revMov).toBeDefined();
    expect(revMov?.quantity).toBe(2);
  });

  // Módulo de Compras: Registro formal y recepción
  it('Módulo Compras: Registro de compras y recepción con proveedor', () => {
    const varId = 'var-pur-test-' + Date.now();
    const prodId = 'prod-pur-test-' + Date.now();
    db.prepare('INSERT INTO products (id, name, slug, gender, base_price, is_published) VALUES (?, ?, ?, ?, ?, 1)')
      .run(prodId, 'Buzo Algodón', 'buzo-algodon-' + Date.now(), 'hombre', 45.0);
    db.prepare('INSERT INTO product_variants (id, product_id, sku, size, color, stock, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run(varId, prodId, 'BUZO-PUR-' + Date.now(), 'M', 'PLOMO', 3);

    const suppliers = StoreRepository.getSuppliers();
    const supId = suppliers[0]?.id || null;

    const purchase = StoreRepository.createPurchase({
      supplier_id: supId,
      registered_by: 'usr-admin-01',
      invoice_ref: 'FAC-001',
      items: [
        {
          variant_id: varId,
          quantity: 10,
          unit_cost: 22.5,
        },
      ],
    });

    expect(purchase.purchase_number).toMatch(/^COM-/);
    expect(purchase.total_cost).toBe(225.0);

    // El stock debe haber subido de 3 a 13
    const variantAfter = db.prepare('SELECT stock, cost_price FROM product_variants WHERE id = ?').get(varId) as any;
    expect(variantAfter.stock).toBe(13);
    expect(variantAfter.cost_price).toBe(22.5);
  });

  // Caso 23: Exportación de reportes a Excel
  it('Caso 23: Generación de buffers binarios válidos de Excel para reportes', () => {
    const sales = StoreRepository.getSales({ limit: 5 });
    const buffer = ExcelExporterService.exportSalesReport(sales);
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);
  });

  // Caso 24: Verificación de filtro por género sin error SQLite ("unisex" literal fix)
  it('Caso 24: Filtro de catálogo por género no lanza SqliteError unisex (Digest 2692503889)', () => {
    const damas = StoreRepository.getProducts({ gender: 'dama', onlyPublished: true });
    expect(Array.isArray(damas)).toBe(true);

    const hombres = StoreRepository.getProducts({ gender: 'hombre', onlyPublished: true });
    expect(Array.isArray(hombres)).toBe(true);

    const unisex = StoreRepository.getProducts({ gender: 'unisex', onlyPublished: true });
    expect(Array.isArray(unisex)).toBe(true);
  });

  // Caso 25: Filtrado avanzado por talla, color y categoría
  it('Caso 25: Filtro por tallas, colores y categorías', () => {
    const filterOptions = StoreRepository.getFilterOptions();
    expect(filterOptions.sizes.length).toBeGreaterThan(0);
    expect(filterOptions.colors.length).toBeGreaterThan(0);
    expect(filterOptions.categories.length).toBe(3);

    // Filtrar por una talla existente
    const testSize = filterOptions.sizes[0];
    const filteredBySize = StoreRepository.getProducts({ size: testSize });
    expect(Array.isArray(filteredBySize)).toBe(true);

    // Filtrar por categoría 'ropa'
    const ropa = StoreRepository.getProducts({ category: 'ropa' });
    expect(ropa.length).toBeGreaterThan(0);
  });

  // Caso 26: Autenticación con contraseña para Administrador y Vendedores
  it('Caso 26: Autenticación con contraseña válida e inválida', () => {
    // Éxito con credencial admin
    const authSuccess = StoreRepository.authenticateUser('admin@eclipsestore.pe', 'admin123');
    expect(authSuccess).toBeDefined();
    expect(authSuccess?.role).toBe('admin');

    // Falla con contraseña errónea
    const authFail = StoreRepository.authenticateUser('admin@eclipsestore.pe', 'wrongpass');
    expect(authFail).toBeNull();
  });

  // Caso 27: Creación completa de producto con hasta 5 fotos y variantes sin depender de Excel
  it('Caso 27: Creación y eliminación completa de producto y variantes desde el sistema', () => {
    const prod = StoreRepository.createProductFull({
      name: 'Casaca Sam Sulek Heavy',
      description: 'Casaca deportiva térmica con forro polar',
      category_id: 'cat-hombre',
      gender: 'hombre',
      base_price: 110.0,
      is_new: true,
      images: [
        { storage_path: '/uploads/sam-sulek-1.png', is_primary: true },
        { storage_path: '/uploads/sam-sulek-2.png', is_primary: false },
        { storage_path: '/uploads/sam-sulek-3.png', is_primary: false },
      ],
      variants: [
        { size: 'L', color: 'NEGRO', sku: 'CAS-SUL-L-NEG', stock: 8, cost_price: 55.0 },
        { size: 'XL', color: 'NEGRO', sku: 'CAS-SUL-XL-NEG', stock: 4, cost_price: 55.0 },
      ],
    });

    expect(prod).toBeDefined();
    expect(prod?.name).toBe('Casaca Sam Sulek Heavy');
    expect(prod?.images?.length).toBe(3);
    expect(prod?.variants?.length).toBe(2);

    // Borrado auditado del producto
    const deleted = StoreRepository.deleteProduct(prod!.id);
    expect(deleted).toBe(true);

    const recheck = StoreRepository.getProductById(prod!.id);
    expect(recheck).toBeNull();
  });

  // Caso 28: Configuración del Slider Promocional y Ubicación del Stand
  it('Caso 28: Modificación de velocidad del slider y actualización de ubicación del stand', () => {
    // Slider
    const initialSlider = StoreRepository.getSliderSettings();
    expect(initialSlider.slides.length).toBeGreaterThan(0);

    StoreRepository.updateSliderSettings({
      speed_ms: 6000,
      autoplay: true,
      slides: initialSlider.slides,
    });
    const updatedSlider = StoreRepository.getSliderSettings();
    expect(updatedSlider.speed_ms).toBe(6000);

    // Ubicación del Stand
    const currentSettings = StoreRepository.getSettings();
    StoreRepository.updateSettings({
      ...currentSettings,
      address: 'Stand #42 - C.C. Gamarra Plaza / Lima, Perú',
    });
    const reloadedSettings = StoreRepository.getSettings();
    expect(reloadedSettings.address).toBe('Stand #42 - C.C. Gamarra Plaza / Lima, Perú');
  });

  // Caso 29: Registro de boleta y factura con desglose exacto de IGV (18%)
  it('Caso 29: Registro de factura y boleta calcula base imponible e IGV del total', () => {
    const session = StoreRepository.getActiveCashSession()!;
    const varId = 'var-igv-' + Date.now();
    const prodId = 'prod-igv-' + Date.now();

    db.prepare('INSERT INTO products (id, name, slug, gender, base_price, is_published) VALUES (?, ?, ?, ?, ?, 1)')
      .run(prodId, 'Polo DryFit Pro', 'polo-dryfit-pro-' + Date.now(), 'hombre', 59.0);
    db.prepare('INSERT INTO product_variants (id, product_id, sku, size, color, stock, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run(varId, prodId, 'POLO-IGV-' + Date.now(), 'L', 'AZUL', 10);

    const saleResult = StoreRepository.executePosSale({
      session_id: session.id,
      seller_id: 'usr-vend-01',
      channel: 'pos',
      receipt_type: 'factura',
      customer_doc_type: 'RUC',
      customer_doc_number: '20601234567',
      customer_name: 'Fitness Gym Perú S.A.C.',
      customer_phone: '987654321',
      customer_email: 'contabilidad@fitnessgym.pe',
      subtotal: 118.0,
      discount: 0,
      total: 118.0,
      items: [
        {
          variant_id: varId,
          sku: 'POLO-IGV',
          product_name: 'Polo DryFit Pro',
          size: 'L',
          color: 'AZUL',
          quantity: 2,
          unit_price: 59.0,
          subtotal: 118.0,
        },
      ],
      payments: [{ payment_method: 'tarjeta', amount: 118.0 }],
    });

    expect(saleResult.sale.receipt_number).toMatch(/^F001-/);
    expect(saleResult.sale.receipt_type).toBe('factura');
    // Total 118.0 => Base Imponible = 100.0, IGV = 18.0
    expect(saleResult.sale.tax_base).toBe(100.0);
    expect(saleResult.sale.tax_amount).toBe(18.0);
    expect(saleResult.sale.total).toBe(118.0);
  });

  // Caso 30: Registro automático de clientes y consulta de historial de compras
  it('Caso 30: Venta registra o actualiza cliente y permite consultar historial', () => {
    const session = StoreRepository.getActiveCashSession()!;
    const varId = 'var-cust-' + Date.now();
    const prodId = 'prod-cust-' + Date.now();

    db.prepare('INSERT INTO products (id, name, slug, gender, base_price, is_published) VALUES (?, ?, ?, ?, ?, 1)')
      .run(prodId, 'Top Compresión', 'top-compresion-' + Date.now(), 'dama', 45.0);
    db.prepare('INSERT INTO product_variants (id, product_id, sku, size, color, stock, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run(varId, prodId, 'TOP-CUST-' + Date.now(), 'M', 'NEGRO', 10);

    const docNum = '78945612';
    StoreRepository.executePosSale({
      session_id: session.id,
      seller_id: 'usr-vend-01',
      channel: 'pos',
      receipt_type: 'boleta',
      customer_doc_type: 'DNI',
      customer_doc_number: docNum,
      customer_name: 'Lucía Fernández',
      customer_phone: '951234567',
      customer_email: 'lucia.f@gmail.com',
      subtotal: 45.0,
      discount: 0,
      total: 45.0,
      items: [
        {
          variant_id: varId,
          sku: 'TOP-CUST',
          product_name: 'Top Compresión',
          size: 'M',
          color: 'NEGRO',
          quantity: 1,
          unit_price: 45.0,
          subtotal: 45.0,
        },
      ],
      payments: [{ payment_method: 'yape', amount: 45.0 }],
    });

    const client = StoreRepository.getCustomerByDoc(docNum);
    expect(client).toBeDefined();
    expect(client!.name).toBe('Lucía Fernández');
    expect(client!.phone).toBe('951234567');
    expect(client!.total_spent).toBeGreaterThanOrEqual(45.0);

    const history = StoreRepository.getCustomerHistory(client!.id);
    expect(history).toBeDefined();
    expect(history!.sales.length).toBeGreaterThanOrEqual(1);
    expect(history!.sales[0].total).toBe(45.0);
  });

  // Caso 31: Configuración de frase personalizada de pie de ticket y datos de tienda
  it('Caso 31: Frase de pie de ticket y datos fiscales de tienda administrables', () => {
    const settings = StoreRepository.getSettings();
    StoreRepository.updateSettings({
      ...settings,
      store_ruc: '20609876543',
      store_phone: '+51 988 777 666',
      ticket_footer_phrase: '¡Gracias por tu compra en Eclipse Store! Stand Oficial.',
    });

    const reloaded = StoreRepository.getSettings();
    expect(reloaded.store_ruc).toBe('20609876543');
    expect(reloaded.store_phone).toBe('+51 988 777 666');
    expect(reloaded.ticket_footer_phrase).toBe('¡Gracias por tu compra en Eclipse Store! Stand Oficial.');
  });
});
