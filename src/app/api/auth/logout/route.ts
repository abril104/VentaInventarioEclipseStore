import { NextResponse } from 'next/server';
import { clearCurrentUser } from '@/lib/auth/session';

export async function POST() {
  try {
    await clearCurrentUser();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
