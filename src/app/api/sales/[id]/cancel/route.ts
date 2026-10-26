import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { cancelled_by, reason } = body;

    if (!cancelled_by || !reason) {
      return NextResponse.json({ error: 'El usuario responsable y el motivo son obligatorios.' }, { status: 400 });
    }

    const cancelledSale = StoreRepository.cancelSale(id, cancelled_by, reason);

    return NextResponse.json({
      success: true,
      sale: cancelledSale,
      message: 'Venta anulada y stock devuelto al inventario exitosamente.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
