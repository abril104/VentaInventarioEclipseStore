import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { variant_id, quantity, cost_price, supplier_id, reason, registered_by } = body;

    if (!variant_id || !quantity || !registered_by) {
      return NextResponse.json({ error: 'Faltan datos obligatorios para la entrada de inventario.' }, { status: 400 });
    }

    const updatedVariant = StoreRepository.recordInventoryEntry(
      variant_id,
      Number(quantity),
      cost_price !== undefined && cost_price !== null ? Number(cost_price) : null,
      supplier_id || null,
      reason,
      registered_by
    );

    return NextResponse.json({
      success: true,
      variant: updatedVariant,
      message: 'Entrada de mercadería registrada exitosamente.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
