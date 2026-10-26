import { NextResponse } from 'next/server';
import { ExcelInventoryService } from '@/lib/excel/importer';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const revisionPath = path.join(process.cwd(), 'data', 'INVENTARIO2311AM_con_SKU_revision.xlsx');
    const originalPath = path.join(process.cwd(), 'data', 'INVENTARIO2311AM.xlsx');

    const fileToUse = fs.existsSync(revisionPath) ? revisionPath : fs.existsSync(originalPath) ? originalPath : null;

    if (!fileToUse) {
      return NextResponse.json({ error: 'No se encontró el archivo de inventario en el servidor.' }, { status: 404 });
    }

    const buffer = fs.readFileSync(fileToUse);
    const report = ExcelInventoryService.parseAndValidateBuffer(buffer, path.basename(fileToUse));

    return NextResponse.json({ report });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const report = ExcelInventoryService.parseAndValidateBuffer(buffer, file.name);

    return NextResponse.json({ report });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
