import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    const caller = await getCurrentUser();
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    const profiles = StoreRepository.getProfiles();
    return NextResponse.json({ profiles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const caller = await getCurrentUser();
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ error: 'Solo los administradores pueden crear nuevos usuarios.' }, { status: 403 });
    }

    const body = await request.json();
    const { email, full_name, role, password } = body;

    if (!email || !full_name || !role) {
      return NextResponse.json({ error: 'Faltan datos obligatorios para el usuario.' }, { status: 400 });
    }

    const newProfile = StoreRepository.createUserWithPassword({
      email,
      fullName: full_name,
      role,
      password: password || 'admin123',
    });

    return NextResponse.json({ success: true, profile: newProfile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const caller = await getCurrentUser();
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ error: 'Solo los administradores pueden modificar usuarios.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, full_name, role, password, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido.' }, { status: 400 });
    }

    const updated = StoreRepository.updateUserFull(id, {
      fullName: full_name,
      role,
      password,
      isActive: is_active,
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
