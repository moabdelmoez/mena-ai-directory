import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin-auth';

interface AdminSession {
  adminId: string;
  email: string;
  expiresAt: number;
}

interface AuthResult {
  admin: AdminSession | null;
  userId: string | null;
}

/**
 * Check for admin session first, fall back to user session.
 * Returns both admin and userId — at least one will be non-null if authenticated.
 * Returns null if neither admin nor user session exists.
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult | null> {
  const admin = await requireAdmin(request);

  if (admin) {
    return { admin, userId: null };
  }

  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    return { admin: null, userId: session.user.id };
  }

  return null;
}
