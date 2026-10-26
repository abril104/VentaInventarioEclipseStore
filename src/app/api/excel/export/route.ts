import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';
import { ExcelExporterService } from '@/lib/excel/exporter';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sales';

    let buffer: Buffer;
    let fileName = '';

    if (type === 'inventory') {
      const products = StoreRepository.getProducts();
      buffer = ExcelExporterService.exportInventoryReport(products);
      fileName = `Inventario_EclipseStore_${new Date().toISOString().slice(0, 10)}.xlsx`;
    } else if (type === 'movements') {
      const movements = StoreRepository.getInventoryMovements({ limit: 1000 });
      buffer = ExcelExporterService.exportMovementsReport(movements);
      fileName = `Kardex_EclipseStore_${new Date().toISOString().slice(0, 10)}.xlsx`;
    } else if (type === 'customers') {
      const customers = StoreRepository.getCustomers();
      buffer = ExcelExporterService.exportCustomersReport(customers);
      fileName = `Clientes_EclipseStore_${new Date().toISOString().slice(0, 10)}.xlsx`;
    } else {
      const sales = StoreRepository.getSales({ limit: 1000 });
      buffer = ExcelExporterService.exportSalesReport(sales);
      fileName = `Ventas_EclipseStore_${new Date().toISOString().slice(0, 10)}.xlsx`;
    }

    return new Response(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
