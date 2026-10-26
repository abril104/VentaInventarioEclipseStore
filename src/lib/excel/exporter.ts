import * as XLSX from 'xlsx';
import { Sale, InventoryMovement, CashSession, Product, Customer } from '@/types';

export class ExcelExporterService {
  /**
   * Genera un libro Excel con el reporte de ventas
   */
  static exportSalesReport(sales: Sale[]): Buffer {
    const data = sales.map((s) => ({
      'Nº Comprobante': s.receipt_number,
      'Fecha': s.created_at,
      'Vendedor': s.seller_name || 'N/A',
      'Canal': s.channel === 'pos' ? 'Presencial (POS)' : 'WhatsApp',
      'Estado': s.status === 'completed' ? 'Completado' : 'Anulado',
      'Cliente': s.customer_name || 'Cliente Mostrador',
      'Teléfono': s.customer_phone || '',
      'Subtotal S/': s.subtotal,
      'Descuento S/': s.discount,
      'Total S/': s.total,
      'Observaciones': s.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Genera un libro Excel con el estado actual del inventario
   */
  static exportInventoryReport(products: Product[]): Buffer {
    const rows: any[] = [];

    for (const p of products) {
      if (!p.variants || p.variants.length === 0) {
        rows.push({
          'Público': p.gender.toUpperCase(),
          'Categoría': p.category_name || 'General',
          'Producto': p.name,
          'SKU': 'SIN-VARIANTE',
          'Talla': '-',
          'Color': '-',
          'Stock Actual': 0,
          'Precio Venta S/': p.base_price,
          'Costo S/': 'N/D',
          'Proveedor': 'N/D',
          'Estado': 'Sin variantes',
        });
      } else {
        for (const v of p.variants) {
          let statusText = 'Disponible';
          if (v.stock === 0) statusText = 'Agotado';
          else if (v.stock <= v.low_stock_threshold) statusText = 'Stock Bajo (<=1)';

          rows.push({
            'Público': p.gender.toUpperCase(),
            'Categoría': p.category_name || 'General',
            'Producto': p.name,
            'SKU': v.sku,
            'Talla': v.size,
            'Color': v.color,
            'Stock Actual': v.stock,
            'Precio Venta S/': v.effective_price || p.base_price,
            'Costo S/': v.cost_price ?? 'N/D',
            'Proveedor': v.supplier_name || 'N/D',
            'Estado': statusText,
          });
        }
      }
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Genera un libro Excel con los movimientos de kardex
   */
  static exportMovementsReport(movements: InventoryMovement[]): Buffer {
    const data = movements.map((m) => ({
      'Fecha': m.created_at,
      'SKU': m.variant_sku || 'N/D',
      'Producto': m.product_name || 'N/D',
      'Talla': m.size || '',
      'Color': m.color || '',
      'Tipo de Movimiento': m.type.toUpperCase(),
      'Cantidad': m.quantity,
      'Stock Anterior': m.previous_stock,
      'Stock Resultante': m.new_stock,
      'Motivo': m.reason,
      'Usuario': m.registered_by_name || 'Sistema',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kardex');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Genera un libro Excel con el directorio de clientes y su historial
   */
  static exportCustomersReport(customers: Customer[]): Buffer {
    const data = customers.map((c) => ({
      'Tipo Documento': c.doc_type,
      'Nº Documento': c.doc_number,
      'Nombre / Razón Social': c.name,
      'Teléfono': c.phone,
      'Correo': c.email || 'N/D',
      'Dirección': c.address || 'N/D',
      'Total Comprado (S/)': Number(c.total_spent.toFixed(2)),
      'Cantidad de Pedidos': c.orders_count,
      'Última Compra': c.last_purchase_at || 'Sin compras',
      'Fecha Registro': c.created_at,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}
