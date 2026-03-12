import { NextRequest } from 'next/server';
import { stackServerApp } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

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
 * Sync a Stack Auth user to the local users table.
 * Fast path: lookup by stack_auth_id.
 * Fallback: match by email (migrates existing NextAuth users lazily).
 * Creates a new user if neither found.
 */
export async function getOrCreateUser(stackUser: { id: string; primaryEmail: string | null; displayName: string | null; profileImageUrl: string | null }): Promise<string> {
  if (!stackUser.primaryEmail) {
    throw new Error('User has no email');
  }

  // Fast path: lookup by stack_auth_id
  const { data: existingByStackId } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('stack_auth_id', stackUser.id)
    .single();

  if (existingByStackId) {
    return existingByStackId.id;
  }

  // Fallback: match by email (lazy migration from NextAuth)
  const { data: existingByEmail } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', stackUser.primaryEmail)
    .single();

  if (existingByEmail) {
    // Migrate: attach stack_auth_id to existing user
    await supabaseAdmin
      .from('users')
      .update({ stack_auth_id: stackUser.id })
      .eq('id', existingByEmail.id);

    return existingByEmail.id;
  }

  // Create new user
  const { data: newUser, error } = await supabaseAdmin
    .from('users')
    .insert({
      stack_auth_id: stackUser.id,
      email: stackUser.primaryEmail,
      name: stackUser.displayName,
      avatar_url: stackUser.profileImageUrl,
    })
    .select('id')
    .single();

  if (error || !newUser) {
    throw new Error('Failed to create user');
  }

  return newUser.id;
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

  const stackUser = await stackServerApp.getUser();

  if (stackUser) {
    try {
      const userId = await getOrCreateUser(stackUser);
      return { admin: null, userId };
    } catch {
      return null;
    }
  }

  return null;
}
