import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const sale = StoreRepository.getSaleById(params.id);
    if (!sale) {
      return NextResponse.json({ error: 'Venta no encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ sale });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
