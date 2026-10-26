import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { price_override } = body;

    const parsedPrice = price_override !== undefined && price_override !== null && price_override !== ''
      ? parseFloat(price_override)
      : null;

    StoreRepository.updateVariantPrice(id, parsedPrice);

    return NextResponse.json({
      success: true,
      message: 'Precio de variante actualizado correctamente.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
