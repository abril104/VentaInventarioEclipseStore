import * as XLSX from 'xlsx';
import { StoreRepository } from '@/lib/db/repository';
import { getLocalDatabase } from '@/lib/db/sqlite';
import crypto from 'crypto';

export interface ExcelRowParsed {
  rowNumber: number;
  sku: string;
  gender: 'dama' | 'hombre' | 'unisex';
  productName: string;
  size: string;
  color: string;
  quantity: number | null;
  price: number | null;
  supplier: string | null;
  statusNotes: string[];
  hasWarnings: boolean;
  hasErrors: boolean;
  canImport: boolean;
}

export interface ExcelImportReport {
  fileName: string;
  sheetUsed: string;
  totalRows: number;
  validRowsCount: number;
  warningRowsCount: number;
  errorRowsCount: number;
  rows: ExcelRowParsed[];
}

export class ExcelInventoryService {
  /**
   * Inspecciona y valida el buffer del archivo Excel antes de importar.
   */
  static parseAndValidateBuffer(fileBuffer: Buffer, fileName: string): ExcelImportReport {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Seleccionar la mejor hoja: 'Base sistema' si existe, o 'Hoja1'
    let sheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes('base')) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });

    if (!rawData || rawData.length < 2) {
      throw new Error(`La hoja "${sheetName}" del Excel está vacía o no tiene suficientes datos.`);
    }

    const rows: ExcelRowParsed[] = [];
    const seenSkus = new Set<string>();

    // Si es 'Base sistema', la fila 0 son encabezados:
    // ['SKU provisional', 'Público', 'Producto', 'Talla', 'Color registrado', 'Cantidad', 'Precio S/', 'Proveedor', 'Foto / ruta', 'Estado de revisión', 'Fila origen']
    const isBaseSistema = sheetName.toLowerCase().includes('base');
    const startRowIndex = isBaseSistema ? 1 : 2; // En Hoja1 la fila 1 es título, fila 2 es cabecera

    for (let i = startRowIndex; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0 || !row.some((cell: any) => cell !== null && cell !== '')) {
        continue; // fila vacía
      }

      let sku = '';
      let genderStr = '';
      let productName = '';
      let size = '';
      let color = '';
      let quantityRaw: any = null;
      let priceRaw: any = null;
      let supplierRaw: any = null;

      if (isBaseSistema) {
        sku = String(row[0] || '').trim();
        genderStr = String(row[1] || '').trim();
        productName = String(row[2] || '').trim();
        size = String(row[3] || '').trim();
        color = String(row[4] || '').trim();
        quantityRaw = row[5];
        priceRaw = row[6];
        supplierRaw = row[7];
      } else {
        // Formato Hoja1 original
        productName = String(row[1] || '').trim();
        size = String(row[2] || '').trim();
        color = String(row[3] || '').trim();
        quantityRaw = row[4];
        priceRaw = row[5];
        supplierRaw = row[6];
        sku = String(row[8] || '').trim(); // Si tuviera columna SKU provisional
      }

      if (!productName) {
        continue;
      }

      // Inferir género
      let gender: 'dama' | 'hombre' | 'unisex' = 'dama';
      const gLower = genderStr.toLowerCase();
      if (gLower.includes('hombre') || gLower.includes('varon')) {
        gender = 'hombre';
      } else if (gLower.includes('unisex')) {
        gender = 'unisex';
      } else if (gLower.includes('dama') || gLower.includes('mujer')) {
        gender = 'dama';
      } else {
        // Intentar inferir de SKU o categoría
        if (sku.startsWith('HOM')) gender = 'hombre';
        else if (sku.startsWith('DAM')) gender = 'dama';
      }

      // Normalizar número de cantidad
      let quantity: number | null = null;
      if (quantityRaw !== null && quantityRaw !== undefined && quantityRaw !== '') {
        const parsed = parseInt(String(quantityRaw).trim(), 10);
        if (!isNaN(parsed)) {
          quantity = parsed;
        }
      }

      // Normalizar precio
      let price: number | null = null;
      if (priceRaw !== null && priceRaw !== undefined && priceRaw !== '') {
        const parsed = parseFloat(String(priceRaw).replace(/S\/?/gi, '').trim());
        if (!isNaN(parsed)) {
          price = parsed;
        }
      }

      const supplier = supplierRaw ? String(supplierRaw).trim() : null;

      // Autogenerar SKU legible si no existe
      if (!sku) {
        const prefix = gender === 'hombre' ? 'HOM' : gender === 'dama' ? 'DAM' : 'UNI';
        sku = `${prefix}-${String(i).padStart(3, '0')}-01`;
      }

      // Validaciones y Flags
      const statusNotes: string[] = [];
      let hasErrors = false;
      let hasWarnings = false;

      // 1. Detección de SKU duplicado
      if (seenSkus.has(sku.toUpperCase())) {
        statusNotes.push(`SKU duplicado detectado: ${sku}`);
        hasErrors = true;
      } else {
        seenSkus.add(sku.toUpperCase());
      }

      // 2. Validación de Precio
      if (price === null) {
        statusNotes.push('Precio faltante (vacío en Excel)');
        hasWarnings = true;
      } else if (price === 0) {
        statusNotes.push('Precio S/ 0.00: confirmar si es muestra o dato pendiente');
        hasWarnings = true;
      }

      // 3. Validación de Cantidad
      if (quantity === null) {
        statusNotes.push('Cantidad no especificada');
        hasWarnings = true;
      } else if (quantity === 0) {
        statusNotes.push('Stock registrado en 0 (agotado)');
        hasWarnings = true;
      }

      // 4. Detección de colores agrupados
      const colorUpper = color.toUpperCase();
      if (colorUpper.includes(' Y ') || colorUpper.includes(',') || colorUpper.includes('VARIADO')) {
        statusNotes.push('Colores agrupados en una sola fila (separar si se requiere control por color)');
        hasWarnings = true;
      }

      // 5. Detección de tallas agrupadas
      const sizeUpper = size.toUpperCase();
      if (sizeUpper.includes(' Y ') || sizeUpper.includes(',') || sizeUpper.includes('/')) {
        statusNotes.push('Múltiples tallas agrupadas en una fila (debe desglosarse en variantes)');
        hasWarnings = true;
      }

      if (!size) {
        size = 'ESTÁNDAR';
        statusNotes.push('Talla no especificada (se asignó ESTÁNDAR)');
      }
      if (!color) {
        color = 'ÚNICO';
        statusNotes.push('Color no especificado (se asignó ÚNICO)');
      }

      const canImport = !hasErrors;

      rows.push({
        rowNumber: i + 1,
        sku,
        gender,
        productName,
        size,
        color,
        quantity,
        price,
        supplier,
        statusNotes,
        hasWarnings,
        hasErrors,
        canImport,
      });
    }

    const warningRowsCount = rows.filter((r) => r.hasWarnings && !r.hasErrors).length;
    const errorRowsCount = rows.filter((r) => r.hasErrors).length;
    const validRowsCount = rows.filter((r) => r.canImport && !r.hasWarnings).length;

    return {
      fileName,
      sheetUsed: sheetName,
      totalRows: rows.length,
      validRowsCount,
      warningRowsCount,
      errorRowsCount,
      rows,
    };
  }

  /**
   * Ejecuta la importación a la base de datos de forma atómica y segura.
   */
  static executeImport(rowsToImport: ExcelRowParsed[], registeredBy: string): { importedCount: number; errors: string[] } {
    const db = getLocalDatabase();
    const errors: string[] = [];
    let importedCount = 0;

    const tx = db.transaction(() => {
      for (const row of rowsToImport) {
        if (!row.canImport) {
          errors.push(`Fila ${row.rowNumber} (${row.sku}): Saltada por tener errores.`);
          continue;
        }

        try {
          // 1. Obtener o crear proveedor
          let supplierId: string | null = null;
          if (row.supplier) {
            const supplier = StoreRepository.getOrCreateSupplier(row.supplier);
            supplierId = supplier.id;
          }

          // 2. Determinar categoría
          const categorySlug = row.gender === 'hombre' ? 'ropa-deportiva-hombre' : 'ropa-deportiva-dama';
          const cat = db.prepare('SELECT id FROM categories WHERE slug = ?').get(categorySlug) as any;
          const categoryId = cat ? cat.id : null;

          // 3. Obtener o crear producto
          const productSlug = row.productName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

          let product = db.prepare('SELECT id FROM products WHERE slug = ?').get(productSlug) as any;
          let productId = product ? product.id : null;

          const basePrice = row.price !== null ? row.price : 0.0;

          if (!productId) {
            productId = 'prod-' + crypto.randomUUID().slice(0, 8);
            db.prepare(`
              INSERT INTO products (id, category_id, name, slug, gender, brand, base_price, is_published)
              VALUES (?, ?, ?, ?, ?, 'Eclipse Store', ?, 1)
            `).run(productId, categoryId, row.productName, productSlug, row.gender, basePrice);
          } else {
            // Si el producto existe pero tenía base_price 0 y la fila actual tiene precio mayor, actualizarlo
            if (basePrice > 0) {
              db.prepare('UPDATE products SET base_price = ? WHERE id = ? AND base_price = 0').run(basePrice, productId);
            }
          }

          // 4. Crear o actualizar la variante
          const existingVariant = db.prepare('SELECT id, stock FROM product_variants WHERE sku = ?').get(row.sku) as any;
          const initialStock = row.quantity !== null && row.quantity >= 0 ? row.quantity : 0;

          if (existingVariant) {
            // Actualizar variante existente
            db.prepare(`
              UPDATE product_variants
              SET size = ?, color = ?, supplier_id = COALESCE(?, supplier_id),
                  price_override = ?, updated_at = datetime('now')
              WHERE id = ?
            `).run(row.size, row.color, supplierId, row.price, existingVariant.id);
          } else {
            const variantId = 'var-' + crypto.randomUUID().slice(0, 8);
            db.prepare(`
              INSERT INTO product_variants (
                id, product_id, sku, size, color, stock, low_stock_threshold, price_override, supplier_id, is_active
              ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 1)
            `).run(variantId, productId, row.sku, row.size, row.color, initialStock, row.price, supplierId);

            // Registrar movimiento de kardex inicial
            if (initialStock > 0) {
              const movId = 'kmov-' + crypto.randomUUID().slice(0, 8);
              db.prepare(`
                INSERT INTO inventory_movements (
                  id, variant_id, type, quantity, previous_stock, new_stock, reason, registered_by
                ) VALUES (?, ?, 'ajuste_positivo', ?, 0, ?, 'Carga inicial desde Excel', ?)
              `).run(movId, variantId, initialStock, initialStock, registeredBy);
            }
          }

          importedCount++;
        } catch (err: any) {
          errors.push(`Error en fila ${row.rowNumber} (${row.sku}): ${err.message}`);
        }
      }
    });

    tx();
    return { importedCount, errors };
  }
}
