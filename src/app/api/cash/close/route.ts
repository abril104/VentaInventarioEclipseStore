import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { session_id, closed_by, counted_cash, notes } = body;

    if (!session_id || !closed_by || counted_cash === undefined || counted_cash === null) {
      return NextResponse.json({ error: 'Faltan datos obligatorios para cerrar la caja.' }, { status: 400 });
    }

    const countedAmount = Number(counted_cash);
    if (isNaN(countedAmount) || countedAmount < 0) {
      return NextResponse.json({ error: 'El efectivo contado debe ser un número mayor o igual a 0.' }, { status: 400 });
    }

    const closure = StoreRepository.closeCashSession(session_id, closed_by, countedAmount, notes);

    return NextResponse.json({
      success: true,
      closure,
      message: 'Caja cerrada y liquidada exitosamente.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
