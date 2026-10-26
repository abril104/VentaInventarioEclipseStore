import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';

export async function GET() {
  try {
    const purchases = StoreRepository.getPurchases();
    return NextResponse.json({ purchases });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { supplier_id, registered_by, invoice_ref, notes, items } = body;

    if (!registered_by || !items || items.length === 0) {
      return NextResponse.json({ error: 'Faltan datos obligatorios para registrar la compra.' }, { status: 400 });
    }

    const purchase = StoreRepository.createPurchase({
      supplier_id: supplier_id || null,
      registered_by,
      invoice_ref: invoice_ref || undefined,
      notes: notes || undefined,
      items,
    });

    return NextResponse.json({
      success: true,
      purchase,
      message: 'Compra registrada y stock actualizado en Kardex exitosamente.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
