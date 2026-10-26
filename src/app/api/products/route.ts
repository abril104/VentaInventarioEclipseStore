import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, category_id, gender, base_price, is_new, is_published, images, variants } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del producto es obligatorio.' }, { status: 400 });
    }

    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return NextResponse.json({ error: 'Debe ingresar al menos una variante con talla y color.' }, { status: 400 });
    }

    const newProduct = StoreRepository.createProductFull({
      name,
      description,
      category_id,
      gender: gender || 'dama',
      base_price: parseFloat(base_price) || 0,
      is_new: Boolean(is_new),
      is_published: is_published !== false,
      images: images || [],
      variants,
    });

    return NextResponse.json({
      success: true,
      message: 'Prenda registrada exitosamente.',
      product: newProduct,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
