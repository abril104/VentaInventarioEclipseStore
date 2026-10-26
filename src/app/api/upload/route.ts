import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se seleccionó ningún archivo de imagen.' }, { status: 400 });
    }

    const mime = file.type;
    if (!mime.startsWith('image/')) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen válida (PNG, JPG, WEBP, etc.).' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Asegurar directorio public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Nombre único seguro
    const ext = path.extname(file.name) || '.jpg';
    const cleanFileName = `foto_${Date.now()}_${crypto.randomUUID().slice(0, 6)}${ext}`;
    const filePath = path.join(uploadDir, cleanFileName);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${cleanFileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: cleanFileName,
      message: 'Fotografía subida con éxito.',
    });
  } catch (error: any) {
    console.error('Error subiendo imagen:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
