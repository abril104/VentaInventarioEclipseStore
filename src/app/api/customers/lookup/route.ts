import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const doc = searchParams.get('doc');
    if (!doc || !doc.trim()) {
      return NextResponse.json({ customer: null });
    }

    const customer = StoreRepository.getCustomerByDoc(doc.trim());
    return NextResponse.json({ customer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
