import { NextResponse } from 'next/server';
import { StoreRepository } from '@/lib/db/repository';
import { setCurrentUser } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Por favor ingresa tu correo electrónico y contraseña.' },
        { status: 400 }
      );
    }

    const user = StoreRepository.authenticateUser(email, password);

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas. Verifica tu correo y contraseña.' },
        { status: 401 }
      );
    }

    // Establecer cookie de sesión
    await setCurrentUser(user.id);

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
