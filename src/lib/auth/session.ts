import { cookies } from 'next/headers';
import { StoreRepository } from '@/lib/db/repository';
import { UserProfile } from '@/types';

const SESSION_COOKIE_NAME = 'eclipse_user_id';

export async function getCurrentUser(): Promise<UserProfile | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (userId) {
    const profile = StoreRepository.getProfileById(userId);
    if (profile && profile.is_active) {
      return profile;
    }
  }

  return null;
}

export async function setCurrentUser(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });
}

export async function clearCurrentUser() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
