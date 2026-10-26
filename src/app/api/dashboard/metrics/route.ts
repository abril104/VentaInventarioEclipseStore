import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';

export async function GET() {
  try {
    const metrics = StoreRepository.getDashboardMetrics();
    return NextResponse.json({ metrics });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
