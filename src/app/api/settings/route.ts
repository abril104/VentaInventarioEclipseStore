import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    const settings = StoreRepository.getSettings();
    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();

    const current = StoreRepository.getSettings();
    const updated = { ...current, ...body };

    StoreRepository.updateSettings(updated, user?.id || 'usr-admin-01');
    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
