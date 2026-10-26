import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const customers = StoreRepository.getCustomers(search);
    return NextResponse.json({ customers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.doc_number || !body.name || !body.phone) {
      return NextResponse.json(
        { error: 'El número de documento, nombre/razón social y teléfono son obligatorios.' },
        { status: 400 }
      );
    }

    const customer = StoreRepository.upsertCustomer({
      id: body.id,
      doc_type: body.doc_type || 'DNI',
      doc_number: body.doc_number,
      name: body.name,
      phone: body.phone,
      email: body.email || null,
      address: body.address || null,
      notes: body.notes || null,
    });

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
