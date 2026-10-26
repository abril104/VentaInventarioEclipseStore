import { NextResponse } from 'next/server';
import { ExcelInventoryService, ExcelRowParsed } from '@/lib/excel/importer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rows, registered_by } = body as { rows: ExcelRowParsed[]; registered_by: string };

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No se enviaron filas para importar.' }, { status: 400 });
    }
    if (!registered_by) {
      return NextResponse.json({ error: 'El usuario responsable es obligatorio.' }, { status: 400 });
    }

    const result = ExcelInventoryService.executeImport(rows, registered_by);

    return NextResponse.json({
      success: true,
      importedCount: result.importedCount,
      errors: result.errors,
      message: `Se importaron ${result.importedCount} variantes al inventario correctamente.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
