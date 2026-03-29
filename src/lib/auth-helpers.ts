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
 * If the Stack Auth user is missing displayName or profileImageUrl,
 * try to fetch them from the OAuth provider (e.g. LinkedIn userinfo)
 * and update the Stack Auth user so future reads have the data.
 */
async function syncOAuthProfile(stackUser: {
  id: string;
  displayName: string | null;
  profileImageUrl: string | null;
  listConnectedAccounts?: () => Promise<Array<{ provider: string; getAccessToken: (opts?: { scopes?: string[] }) => Promise<{ status: string; data?: { accessToken: string } }> }>>;
  update?: (data: { displayName?: string | null; profileImageUrl?: string | null }) => Promise<void>;
}): Promise<{ displayName: string | null; profileImageUrl: string | null }> {
  // If both fields are already populated, nothing to do
  if (stackUser.displayName && stackUser.profileImageUrl) {
    return { displayName: stackUser.displayName, profileImageUrl: stackUser.profileImageUrl };
  }

  // Need the full user object with connected accounts
  if (!stackUser.listConnectedAccounts || !stackUser.update) {
    return { displayName: stackUser.displayName, profileImageUrl: stackUser.profileImageUrl };
  }

  try {
    const accounts = await stackUser.listConnectedAccounts();
    for (const account of accounts) {
      const tokenResult = await account.getAccessToken();
      if (tokenResult.status !== 'ok' || !tokenResult.data) continue;

      // Try OpenID Connect userinfo endpoint (works for LinkedIn, Google, etc.)
      const res = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenResult.data.accessToken}` },
      });

      if (!res.ok) continue;

      const profile = await res.json();
      const name = profile.name || (profile.given_name && profile.family_name ? `${profile.given_name} ${profile.family_name}` : null);
      const picture = profile.picture || null;

      if (name || picture) {
        const updates: { displayName?: string; profileImageUrl?: string } = {};
        if (!stackUser.displayName && name) updates.displayName = name;
        if (!stackUser.profileImageUrl && picture) updates.profileImageUrl = picture;

        if (Object.keys(updates).length > 0) {
          await stackUser.update(updates);
        }

        return {
          displayName: name || stackUser.displayName,
          profileImageUrl: picture || stackUser.profileImageUrl,
        };
      }
    }
  } catch {
    // Non-critical: profile sync failure shouldn't break auth
  }

  return { displayName: stackUser.displayName, profileImageUrl: stackUser.profileImageUrl };
}

/**
 * Sync a Stack Auth user to the local users table.
 * Fast path: lookup by stack_auth_id.
 * Fallback: match by email (migrates existing NextAuth users lazily).
 * Creates a new user if neither found.
 * Always syncs profile data (name, avatar) from Stack Auth.
 */
export async function getOrCreateUser(stackUser: { id: string; primaryEmail: string | null; displayName: string | null; profileImageUrl: string | null; listConnectedAccounts?: () => Promise<unknown[]>; update?: (data: Record<string, unknown>) => Promise<void> }): Promise<string> {
  if (!stackUser.primaryEmail) {
    throw new Error('User has no email');
  }

  // Sync profile from OAuth provider if missing
  const profile = await syncOAuthProfile(stackUser as Parameters<typeof syncOAuthProfile>[0]);

  // Fast path: lookup by stack_auth_id
  const { data: existingByStackId } = await supabaseAdmin
    .from('users')
    .select('id, name, avatar_url')
    .eq('stack_auth_id', stackUser.id)
    .single();

  if (existingByStackId) {
    // Sync profile data if changed
    const updates: Record<string, string | null> = {};
    if (profile.displayName && profile.displayName !== existingByStackId.name) {
      updates.name = profile.displayName;
    }
    if (profile.profileImageUrl && profile.profileImageUrl !== existingByStackId.avatar_url) {
      updates.avatar_url = profile.profileImageUrl;
    }
    if (Object.keys(updates).length > 0) {
      await supabaseAdmin.from('users').update(updates).eq('id', existingByStackId.id);
    }
    return existingByStackId.id;
  }

  // Fallback: match by email (lazy migration from NextAuth)
  const { data: existingByEmail } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', stackUser.primaryEmail)
    .single();

  if (existingByEmail) {
    // Migrate: attach stack_auth_id and sync profile
    await supabaseAdmin
      .from('users')
      .update({
        stack_auth_id: stackUser.id,
        name: profile.displayName,
        avatar_url: profile.profileImageUrl,
      })
      .eq('id', existingByEmail.id);

    return existingByEmail.id;
  }

  // Create new user
  const { data: newUser, error } = await supabaseAdmin
    .from('users')
    .insert({
      stack_auth_id: stackUser.id,
      email: stackUser.primaryEmail,
      name: profile.displayName,
      avatar_url: profile.profileImageUrl,
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
