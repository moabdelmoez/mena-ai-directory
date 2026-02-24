import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from './supabase';

const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface AdminSession {
  adminId: string;
  email: string;
  expiresAt: number;
}

function getSigningSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is required for admin session signing');
  }
  return secret;
}

function signPayload(payload: string): string {
  return crypto.createHmac('sha256', getSigningSecret()).update(payload).digest('hex');
}

function encodeSession(session: AdminSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64');
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

function decodeSession(encoded: string): AdminSession | null {
  try {
    const dotIndex = encoded.lastIndexOf('.');
    if (dotIndex === -1) return null;

    const payload = encoded.substring(0, dotIndex);
    const signature = encoded.substring(dotIndex + 1);

    // Verify HMAC signature using timing-safe comparison
    const expectedSignature = signPayload(payload);
    if (signature.length !== expectedSignature.length) return null;
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
    if (!isValid) return null;

    return JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

export async function verifyAdminCredentials(
  email: string,
  password: string
): Promise<{ success: boolean; admin?: { id: string; email: string } }> {
  const { data: admin, error } = await supabaseAdmin
    .from('admins')
    .select('id, email, password_hash')
    .eq('email', email)
    .single();

  if (error || !admin) {
    return { success: false };
  }

  const passwordMatch = await bcrypt.compare(password, admin.password_hash);

  if (!passwordMatch) {
    return { success: false };
  }

  return {
    success: true,
    admin: { id: admin.id, email: admin.email },
  };
}

export async function createAdminSession(adminId: string, email: string): Promise<void> {
  const session: AdminSession = {
    adminId,
    email,
    expiresAt: Date.now() + SESSION_DURATION,
  };

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE);

  if (!sessionCookie) {
    return null;
  }

  const session = decodeSession(sessionCookie.value);

  if (!session || session.expiresAt < Date.now()) {
    return null;
  }

  return session;
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function requireAdmin(request: NextRequest): Promise<AdminSession | null> {
  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE);

  if (!sessionCookie) {
    return null;
  }

  const session = decodeSession(sessionCookie.value);

  if (!session || session.expiresAt < Date.now()) {
    return null;
  }

  // Verify admin still exists
  const { data: admin } = await supabaseAdmin
    .from('admins')
    .select('id')
    .eq('id', session.adminId)
    .single();

  if (!admin) {
    return null;
  }

  return session;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
