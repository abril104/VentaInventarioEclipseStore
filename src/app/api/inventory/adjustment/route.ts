import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { variant_id, type, quantity, reason, registered_by } = body;

    if (!variant_id || !type || !quantity || !reason || !registered_by) {
      return NextResponse.json({ error: 'Faltan campos obligatorios para el ajuste de inventario.' }, { status: 400 });
    }

    const updatedVariant = StoreRepository.recordInventoryAdjustment(
      variant_id,
      type,
      Number(quantity),
      reason,
      registered_by
    );

    return NextResponse.json({
      success: true,
      variant: updatedVariant,
      message: 'Ajuste de inventario procesado exitosamente.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
