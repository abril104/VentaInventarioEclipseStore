import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';
import { CreatePosSaleRequest } from '@/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreatePosSaleRequest;

    if (!body.session_id) {
      return NextResponse.json({ error: 'La sesión de caja es obligatoria.' }, { status: 400 });
    }
    if (!body.seller_id) {
      return NextResponse.json({ error: 'El vendedor responsable es obligatorio.' }, { status: 400 });
    }
    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'El carrito no contiene productos.' }, { status: 400 });
    }
    if (!body.payments || body.payments.length === 0) {
      return NextResponse.json({ error: 'Se debe especificar al menos un medio de pago.' }, { status: 400 });
    }

    const result = StoreRepository.executePosSale(body);

    return NextResponse.json({
      success: true,
      sale: result.sale,
      receiptNumber: result.receipt,
      message: 'Venta registrada exitosamente.',
    });
  } catch (error: any) {
    console.error('Error registrando venta POS:', error);
    return NextResponse.json({ error: error.message || 'Error procesando la venta.' }, { status: 400 });
  }
}
