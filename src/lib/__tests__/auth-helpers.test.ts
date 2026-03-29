import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — vi.hoisted ensures the variable is available inside factories
// ---------------------------------------------------------------------------

const { mockSupabaseFrom } = vi.hoisted(() => ({
  mockSupabaseFrom: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: mockSupabaseFrom,
  },
}));

// Mock stackServerApp (used only by requireAuth, not the functions under test)
vi.mock('@/lib/auth', () => ({
  stackServerApp: {
    getUser: vi.fn(),
  },
}));

// Mock requireAdmin (used only by requireAuth)
vi.mock('@/lib/admin-auth', () => ({
  requireAdmin: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import the units under test AFTER mocks are registered
// ---------------------------------------------------------------------------
import { getOrCreateUser, requireAuth } from '../auth-helpers';
import { requireAdmin } from '@/lib/admin-auth';
import { stackServerApp } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Supabase query-chain stub that resolves with `data`. */
function makeChain(data: unknown, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
  };
  return chain;
}

/** Build a stackUser stub with full capabilities. */
function makeStackUser(overrides: Partial<{
  id: string;
  primaryEmail: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  listConnectedAccounts: () => Promise<unknown[]>;
  update: (data: Record<string, unknown>) => Promise<void>;
}> = {}) {
  return {
    id: 'stack-user-1',
    primaryEmail: 'user@example.com',
    displayName: 'Test User',
    profileImageUrl: 'https://example.com/avatar.jpg',
    listConnectedAccounts: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Reset mocks between tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  // Reset fetch global
  vi.stubGlobal('fetch', vi.fn());
});

// ===========================================================================
// syncOAuthProfile (tested indirectly through getOrCreateUser)
// ===========================================================================

describe('syncOAuthProfile (via getOrCreateUser)', () => {
  it('skips OAuth fetch when both displayName and profileImageUrl are already set', async () => {
    const user = makeStackUser();

    // Simulate fast-path DB hit
    const chain = makeChain({ id: 'db-user-1', name: 'Test User', avatar_url: 'https://example.com/avatar.jpg' });
    mockSupabaseFrom.mockReturnValue(chain);

    await getOrCreateUser(user);

    // listConnectedAccounts should NOT be called because both fields exist
    expect(user.listConnectedAccounts).not.toHaveBeenCalled();
  });

  it('skips OAuth fetch when user object lacks listConnectedAccounts', async () => {
    const user = makeStackUser({
      displayName: null,
      profileImageUrl: null,
      listConnectedAccounts: undefined,
      update: undefined,
    });

    const chain = makeChain({ id: 'db-user-1', name: null, avatar_url: null });
    mockSupabaseFrom.mockReturnValue(chain);

    // Should not throw even though profile is incomplete
    await expect(getOrCreateUser(user)).resolves.toBe('db-user-1');
  });

  it('skips OAuth fetch when user object lacks update method', async () => {
    const user = makeStackUser({
      displayName: null,
      profileImageUrl: null,
      update: undefined,
    });

    const chain = makeChain({ id: 'db-user-1', name: null, avatar_url: null });
    mockSupabaseFrom.mockReturnValue(chain);

    await expect(getOrCreateUser(user)).resolves.toBe('db-user-1');
    // listConnectedAccounts is present but the guard should bail early
    expect(user.listConnectedAccounts).not.toHaveBeenCalled();
  });

  it('fetches LinkedIn profile when displayName is null and updates Stack Auth user', async () => {
    const mockGetAccessToken = vi.fn().mockResolvedValue({
      status: 'ok',
      data: { accessToken: 'linkedin-token' },
    });
    const user = makeStackUser({
      displayName: null,
      profileImageUrl: 'https://example.com/avatar.jpg',
      listConnectedAccounts: vi.fn().mockResolvedValue([
        { provider: 'linkedin', getAccessToken: mockGetAccessToken },
      ]),
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'Jane Doe', picture: 'https://li.cdn/pic.jpg' }),
    }));

    // DB: not found by stack_auth_id → create new user
    const selectChain = makeChain(null, { code: 'PGRST116' });
    const emailChain = makeChain(null, { code: 'PGRST116' });
    const insertChain = makeChain({ id: 'new-user-1' });

    mockSupabaseFrom
      .mockReturnValueOnce(selectChain)  // lookup by stack_auth_id
      .mockReturnValueOnce(emailChain)   // lookup by email
      .mockReturnValueOnce(insertChain); // insert new user

    await getOrCreateUser(user);

    // update should have been called with displayName only (profileImageUrl already set)
    expect(user.update).toHaveBeenCalledWith({ displayName: 'Jane Doe' });
  });

  it('fetches LinkedIn profile when profileImageUrl is null and updates Stack Auth user', async () => {
    const mockGetAccessToken = vi.fn().mockResolvedValue({
      status: 'ok',
      data: { accessToken: 'linkedin-token' },
    });
    const user = makeStackUser({
      displayName: 'Existing Name',
      profileImageUrl: null,
      listConnectedAccounts: vi.fn().mockResolvedValue([
        { provider: 'linkedin', getAccessToken: mockGetAccessToken },
      ]),
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'Existing Name', picture: 'https://li.cdn/newpic.jpg' }),
    }));

    const selectChain = makeChain(null, { code: 'PGRST116' });
    const emailChain = makeChain(null, { code: 'PGRST116' });
    const insertChain = makeChain({ id: 'new-user-2' });

    mockSupabaseFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(emailChain)
      .mockReturnValueOnce(insertChain);

    await getOrCreateUser(user);

    // update should have been called with profileImageUrl only
    expect(user.update).toHaveBeenCalledWith({ profileImageUrl: 'https://li.cdn/newpic.jpg' });
  });

  it('builds full name from given_name + family_name when name field absent', async () => {
    const mockGetAccessToken = vi.fn().mockResolvedValue({
      status: 'ok',
      data: { accessToken: 'token' },
    });
    const user = makeStackUser({
      displayName: null,
      profileImageUrl: null,
      listConnectedAccounts: vi.fn().mockResolvedValue([
        { provider: 'linkedin', getAccessToken: mockGetAccessToken },
      ]),
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ given_name: 'Alice', family_name: 'Smith' }),
    }));

    const selectChain = makeChain(null, { code: 'PGRST116' });
    const emailChain = makeChain(null, { code: 'PGRST116' });
    const insertChain = makeChain({ id: 'new-user-3' });

    mockSupabaseFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(emailChain)
      .mockReturnValueOnce(insertChain);

    await getOrCreateUser(user);

    expect(user.update).toHaveBeenCalledWith({ displayName: 'Alice Smith' });
  });

  it('handles LinkedIn API failure gracefully (non-ok response)', async () => {
    const mockGetAccessToken = vi.fn().mockResolvedValue({
      status: 'ok',
      data: { accessToken: 'token' },
    });
    const user = makeStackUser({
      displayName: null,
      profileImageUrl: null,
      listConnectedAccounts: vi.fn().mockResolvedValue([
        { provider: 'linkedin', getAccessToken: mockGetAccessToken },
      ]),
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const selectChain = makeChain(null, { code: 'PGRST116' });
    const emailChain = makeChain(null, { code: 'PGRST116' });
    const insertChain = makeChain({ id: 'new-user-4' });

    mockSupabaseFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(emailChain)
      .mockReturnValueOnce(insertChain);

    // Should not throw; auth must still complete
    await expect(getOrCreateUser(user)).resolves.toBe('new-user-4');
    // No Stack Auth update on failure
    expect(user.update).not.toHaveBeenCalled();
  });

  it('handles getAccessToken failure gracefully', async () => {
    const mockGetAccessToken = vi.fn().mockResolvedValue({ status: 'error' });
    const user = makeStackUser({
      displayName: null,
      profileImageUrl: null,
      listConnectedAccounts: vi.fn().mockResolvedValue([
        { provider: 'linkedin', getAccessToken: mockGetAccessToken },
      ]),
    });

    const selectChain = makeChain(null, { code: 'PGRST116' });
    const emailChain = makeChain(null, { code: 'PGRST116' });
    const insertChain = makeChain({ id: 'new-user-5' });

    mockSupabaseFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(emailChain)
      .mockReturnValueOnce(insertChain);

    await expect(getOrCreateUser(user)).resolves.toBe('new-user-5');
    // fetch should never be reached when token status is not 'ok'
    expect(fetch).not.toHaveBeenCalled();
    expect(user.update).not.toHaveBeenCalled();
  });

  it('handles no connected accounts gracefully', async () => {
    const user = makeStackUser({
      displayName: null,
      profileImageUrl: null,
      listConnectedAccounts: vi.fn().mockResolvedValue([]),
    });

    const selectChain = makeChain(null, { code: 'PGRST116' });
    const emailChain = makeChain(null, { code: 'PGRST116' });
    const insertChain = makeChain({ id: 'new-user-6' });

    mockSupabaseFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(emailChain)
      .mockReturnValueOnce(insertChain);

    await expect(getOrCreateUser(user)).resolves.toBe('new-user-6');
    expect(user.update).not.toHaveBeenCalled();
  });

  it('handles listConnectedAccounts throwing an error gracefully', async () => {
    const user = makeStackUser({
      displayName: null,
      profileImageUrl: null,
      listConnectedAccounts: vi.fn().mockRejectedValue(new Error('network error')),
    });

    const selectChain = makeChain(null, { code: 'PGRST116' });
    const emailChain = makeChain(null, { code: 'PGRST116' });
    const insertChain = makeChain({ id: 'new-user-7' });

    mockSupabaseFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(emailChain)
      .mockReturnValueOnce(insertChain);

    await expect(getOrCreateUser(user)).resolves.toBe('new-user-7');
  });
});

// ===========================================================================
// getOrCreateUser
// ===========================================================================

describe('getOrCreateUser', () => {
  describe('throws when user has no email', () => {
    it('throws for null primaryEmail', async () => {
      const user = makeStackUser({ primaryEmail: null });
      await expect(getOrCreateUser(user)).rejects.toThrow('User has no email');
    });
  });

  describe('fast path — found by stack_auth_id', () => {
    it('returns existing user id without DB update when profile data is unchanged', async () => {
      const user = makeStackUser({
        displayName: 'Test User',
        profileImageUrl: 'https://example.com/avatar.jpg',
      });

      // DB row matches current profile exactly
      const chain = makeChain({
        id: 'db-user-1',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      });
      mockSupabaseFrom.mockReturnValue(chain);

      const result = await getOrCreateUser(user);

      expect(result).toBe('db-user-1');
      // update should NOT have been called
      expect(chain.update).not.toHaveBeenCalled();
    });

    it('updates DB when displayName has changed', async () => {
      const user = makeStackUser({ displayName: 'New Name' });

      const selectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'db-user-1', name: 'Old Name', avatar_url: 'https://example.com/avatar.jpg' },
          error: null,
        }),
      };
      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabaseFrom
        .mockReturnValueOnce(selectChain) // lookup by stack_auth_id
        .mockReturnValueOnce(updateChain); // update

      const result = await getOrCreateUser(user);

      expect(result).toBe('db-user-1');
      expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Name' }));
    });

    it('updates DB when avatar_url has changed', async () => {
      const user = makeStackUser({ profileImageUrl: 'https://example.com/new-avatar.jpg' });

      const selectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'db-user-1', name: 'Test User', avatar_url: 'https://example.com/old-avatar.jpg' },
          error: null,
        }),
      };
      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabaseFrom
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(updateChain);

      const result = await getOrCreateUser(user);

      expect(result).toBe('db-user-1');
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ avatar_url: 'https://example.com/new-avatar.jpg' })
      );
    });

    it('does not update DB when profile displayName is null', async () => {
      const user = makeStackUser({ displayName: null, profileImageUrl: null });

      const chain = makeChain({ id: 'db-user-1', name: 'Stored Name', avatar_url: 'https://stored.com/pic.jpg' });
      mockSupabaseFrom.mockReturnValue(chain);

      const result = await getOrCreateUser(user);

      expect(result).toBe('db-user-1');
      // Null profile fields should not overwrite stored values
      expect(chain.update).not.toHaveBeenCalled();
    });
  });

  describe('email fallback — lazy migration from NextAuth', () => {
    it('migrates stack_auth_id and syncs profile when found by email', async () => {
      const user = makeStackUser({
        id: 'stack-new-id',
        displayName: 'Migrated User',
        profileImageUrl: 'https://example.com/pic.jpg',
      });

      const notFoundChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };
      const emailChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'legacy-user-1' }, error: null }),
      };
      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabaseFrom
        .mockReturnValueOnce(notFoundChain) // lookup by stack_auth_id
        .mockReturnValueOnce(emailChain)    // lookup by email
        .mockReturnValueOnce(updateChain);  // update with stack_auth_id + profile

      const result = await getOrCreateUser(user);

      expect(result).toBe('legacy-user-1');
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          stack_auth_id: 'stack-new-id',
          name: 'Migrated User',
          avatar_url: 'https://example.com/pic.jpg',
        })
      );
    });

    it('migrates and uses synced profile data from OAuth when displayName was null', async () => {
      const mockGetAccessToken = vi.fn().mockResolvedValue({
        status: 'ok',
        data: { accessToken: 'token' },
      });
      const user = makeStackUser({
        id: 'stack-new-id',
        displayName: null,
        profileImageUrl: null,
        listConnectedAccounts: vi.fn().mockResolvedValue([
          { provider: 'linkedin', getAccessToken: mockGetAccessToken },
        ]),
      });

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'OAuth Name', picture: 'https://oauth.cdn/pic.jpg' }),
      }));

      const notFoundChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };
      const emailChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'legacy-user-2' }, error: null }),
      };
      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabaseFrom
        .mockReturnValueOnce(notFoundChain)
        .mockReturnValueOnce(emailChain)
        .mockReturnValueOnce(updateChain);

      const result = await getOrCreateUser(user);

      expect(result).toBe('legacy-user-2');
      // The update should carry the OAuth-fetched profile data
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'OAuth Name', avatar_url: 'https://oauth.cdn/pic.jpg' })
      );
    });
  });

  describe('new user creation', () => {
    it('creates a new user and returns its id', async () => {
      const user = makeStackUser();

      const notFoundByStack = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };
      const notFoundByEmail = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };
      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'brand-new-user-1' }, error: null }),
      };

      mockSupabaseFrom
        .mockReturnValueOnce(notFoundByStack)
        .mockReturnValueOnce(notFoundByEmail)
        .mockReturnValueOnce(insertChain);

      const result = await getOrCreateUser(user);

      expect(result).toBe('brand-new-user-1');
      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          stack_auth_id: 'stack-user-1',
          email: 'user@example.com',
          name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
        })
      );
    });

    it('uses OAuth-synced profile data when creating new user', async () => {
      const mockGetAccessToken = vi.fn().mockResolvedValue({
        status: 'ok',
        data: { accessToken: 'token' },
      });
      const user = makeStackUser({
        displayName: null,
        profileImageUrl: null,
        listConnectedAccounts: vi.fn().mockResolvedValue([
          { provider: 'linkedin', getAccessToken: mockGetAccessToken },
        ]),
      });

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'Synced Name', picture: 'https://li.cdn/pic.jpg' }),
      }));

      const notFoundByStack = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };
      const notFoundByEmail = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };
      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'brand-new-user-2' }, error: null }),
      };

      mockSupabaseFrom
        .mockReturnValueOnce(notFoundByStack)
        .mockReturnValueOnce(notFoundByEmail)
        .mockReturnValueOnce(insertChain);

      const result = await getOrCreateUser(user);

      expect(result).toBe('brand-new-user-2');
      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Synced Name', avatar_url: 'https://li.cdn/pic.jpg' })
      );
    });

    it('throws when DB insert fails', async () => {
      const user = makeStackUser();

      const notFoundByStack = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };
      const notFoundByEmail = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };
      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'duplicate key' } }),
      };

      mockSupabaseFrom
        .mockReturnValueOnce(notFoundByStack)
        .mockReturnValueOnce(notFoundByEmail)
        .mockReturnValueOnce(insertChain);

      await expect(getOrCreateUser(user)).rejects.toThrow('Failed to create user');
    });
  });

  describe('edge cases', () => {
    it('handles both displayName and avatar changing simultaneously', async () => {
      const user = makeStackUser({
        displayName: 'Brand New Name',
        profileImageUrl: 'https://example.com/brand-new.jpg',
      });

      const selectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'db-user-1', name: 'Old Name', avatar_url: 'https://example.com/old.jpg' },
          error: null,
        }),
      };
      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabaseFrom
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(updateChain);

      await getOrCreateUser(user);

      expect(updateChain.update).toHaveBeenCalledWith({
        name: 'Brand New Name',
        avatar_url: 'https://example.com/brand-new.jpg',
      });
    });

    it('does not overwrite stored avatar when synced picture is null', async () => {
      const mockGetAccessToken = vi.fn().mockResolvedValue({
        status: 'ok',
        data: { accessToken: 'token' },
      });
      const user = makeStackUser({
        displayName: null,
        profileImageUrl: null,
        listConnectedAccounts: vi.fn().mockResolvedValue([
          { provider: 'linkedin', getAccessToken: mockGetAccessToken },
        ]),
      });

      // LinkedIn returns a name but no picture
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'Only Name' }),
      }));

      const selectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'db-user-1', name: 'Only Name', avatar_url: null },
          error: null,
        }),
      };

      mockSupabaseFrom.mockReturnValue(selectChain);

      const result = await getOrCreateUser(user);

      expect(result).toBe('db-user-1');
      // name matches synced name, picture is null — no second from() call for update
      expect(mockSupabaseFrom).toHaveBeenCalledTimes(1);
    });
  });
});

// ===========================================================================
// requireAuth
// ===========================================================================

describe('requireAuth', () => {
  const mockRequest = {} as import('next/server').NextRequest;

  it('returns admin session when admin is authenticated', async () => {
    const adminSession = { adminId: 'admin-1', email: 'admin@example.com', expiresAt: Date.now() + 10000 };
    vi.mocked(requireAdmin).mockResolvedValue(adminSession);

    const result = await requireAuth(mockRequest);

    expect(result).toEqual({ admin: adminSession, userId: null });
    // stackServerApp.getUser should NOT have been called
    expect(stackServerApp.getUser).not.toHaveBeenCalled();
  });

  it('returns userId when Stack Auth user is authenticated', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);
    vi.mocked(stackServerApp.getUser).mockResolvedValue({
      id: 'stack-user-1',
      primaryEmail: 'user@example.com',
      displayName: 'Test User',
      profileImageUrl: 'https://example.com/avatar.jpg',
    } as never);

    const chain = makeChain({ id: 'db-user-1', name: 'Test User', avatar_url: 'https://example.com/avatar.jpg' });
    mockSupabaseFrom.mockReturnValue(chain);

    const result = await requireAuth(mockRequest);

    expect(result).toEqual({ admin: null, userId: 'db-user-1' });
  });

  it('returns null when neither admin nor Stack Auth user is present', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);
    vi.mocked(stackServerApp.getUser).mockResolvedValue(null as never);

    const result = await requireAuth(mockRequest);

    expect(result).toBeNull();
  });

  it('returns null when getOrCreateUser throws (e.g. user has no email)', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);
    vi.mocked(stackServerApp.getUser).mockResolvedValue({
      id: 'stack-user-1',
      primaryEmail: null,
      displayName: 'No Email',
      profileImageUrl: null,
    } as never);

    const result = await requireAuth(mockRequest);

    expect(result).toBeNull();
  });
});
