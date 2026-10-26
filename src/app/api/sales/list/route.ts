import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';

export async function GET() {
  try {
    const sales = StoreRepository.getSales({ limit: 500 });
    return NextResponse.json({ sales });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
