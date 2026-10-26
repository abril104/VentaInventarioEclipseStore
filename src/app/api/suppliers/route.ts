import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';

export async function GET() {
  try {
    const suppliers = StoreRepository.getSuppliers();
    return NextResponse.json({ suppliers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del proveedor es obligatorio.' }, { status: 400 });
    }

    const supplier = StoreRepository.getOrCreateSupplier(name);
    return NextResponse.json({ success: true, supplier });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
