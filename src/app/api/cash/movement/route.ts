import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { session_id, type, amount, reason, reference, registered_by } = body;

    if (!session_id || !type || !amount || !reason) {
      return NextResponse.json({ error: 'Faltan datos obligatorios para el movimiento de caja.' }, { status: 400 });
    }

    const movement = StoreRepository.recordCashMovement(
      session_id,
      type,
      Number(amount),
      reason,
      reference,
      registered_by
    );

    return NextResponse.json({
      success: true,
      movement,
      message: 'Movimiento de caja registrado exitosamente.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
