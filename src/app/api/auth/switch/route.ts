import { NextResponse } from 'next/server';
import { getCurrentUser, setCurrentUser, clearCurrentUser } from '@/lib/auth/session';
import { StoreRepository } from '@/lib/db/repository';

export async function GET() {
  const user = await getCurrentUser();
  const allProfiles = StoreRepository.getProfiles();
  return NextResponse.json({ user, profiles: allProfiles });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'ID de usuario requerido.' }, { status: 400 });
    }

    const profile = StoreRepository.getProfileById(user_id);
    if (!profile) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    await setCurrentUser(user_id);
    return NextResponse.json({ success: true, user: profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  await clearCurrentUser();
  return NextResponse.json({ success: true });
}
