import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const product = StoreRepository.getProductById(id);
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const { base_price, name, gender, is_published, image_url, images } = body;

    StoreRepository.updateProductDetails(id, {
      name,
      basePrice: base_price !== undefined ? parseFloat(base_price) : undefined,
      gender,
      isPublished: is_published,
      imageUrl: image_url,
    });

    // Si se enviaron múltiples imágenes (1 a 5)
    if (images && Array.isArray(images)) {
      StoreRepository.setProductImages(id, images);
    }

    const updated = StoreRepository.getProductById(id);
    return NextResponse.json({
      success: true,
      message: 'Prenda actualizada correctamente.',
      product: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    StoreRepository.deleteProduct(id);
    return NextResponse.json({
      success: true,
      message: 'Prenda eliminada exitosamente del sistema.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
