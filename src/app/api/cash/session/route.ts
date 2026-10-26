import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';

export async function GET() {
  try {
    const session = StoreRepository.getActiveCashSession();
    if (!session) {
      return NextResponse.json({ activeSession: null, summary: null });
    }

    const summary = StoreRepository.calculateCashSessionSummary(session.id);
    const movements = StoreRepository.getCashMovements(session.id);

    return NextResponse.json({
      activeSession: session,
      summary,
      movements,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { opened_by, initial_cash, notes } = body;

    if (!opened_by) {
      return NextResponse.json({ error: 'El usuario responsable de apertura es obligatorio.' }, { status: 400 });
    }
    const initialAmount = Number(initial_cash ?? 0);
    if (isNaN(initialAmount) || initialAmount < 0) {
      return NextResponse.json({ error: 'El saldo inicial debe ser un número mayor o igual a 0.' }, { status: 400 });
    }

    const session = StoreRepository.openCashSession(opened_by, initialAmount, notes);
    return NextResponse.json({
      success: true,
      session,
      message: 'Caja principal abierta exitosamente.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
