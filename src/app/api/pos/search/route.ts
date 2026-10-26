import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    const variants = StoreRepository.searchVariantsForPos(query);
    return NextResponse.json({ variants });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
