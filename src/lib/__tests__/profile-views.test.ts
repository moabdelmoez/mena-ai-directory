import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockSupabaseFrom } = vi.hoisted(() => ({
  mockSupabaseFrom: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: mockSupabaseFrom,
  },
}));

import { deriveSource, logProfileView, getInsightsStats, getInsightsViewers } from '../profile-views';

function makeChain(data: unknown, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data, error }),
    order: vi.fn().mockResolvedValue({ data, error }),
    insert: vi.fn().mockResolvedValue({ data: null, error }),
  };
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── deriveSource ───────────────────────────────────────────────

describe('deriveSource', () => {
  it('returns direct with null searchQuery for null referer', () => {
    expect(deriveSource(null, 'example.com')).toEqual({ source: 'direct', searchQuery: null });
  });

  it('returns search with query for same host /search?q=nlp', () => {
    expect(deriveSource('http://example.com/search?q=nlp', 'example.com')).toEqual({
      source: 'search',
      searchQuery: 'nlp',
    });
  });

  it('returns search with null query for same host /search without q', () => {
    expect(deriveSource('http://example.com/search', 'example.com')).toEqual({
      source: 'search',
      searchQuery: null,
    });
  });

  it('returns internal for same host non-search path', () => {
    expect(deriveSource('http://example.com/company/foo', 'example.com')).toEqual({
      source: 'internal',
      searchQuery: null,
    });
  });

  it('returns external for different host', () => {
    expect(deriveSource('http://google.com/results', 'example.com')).toEqual({
      source: 'external',
      searchQuery: null,
    });
  });

  it('strips www prefix when comparing hosts', () => {
    expect(deriveSource('http://www.example.com/page', 'example.com')).toEqual({
      source: 'internal',
      searchQuery: null,
    });
  });

  it('treats localhost referer as same site (internal)', () => {
    expect(deriveSource('http://localhost:3000/page', 'example.com')).toEqual({
      source: 'internal',
      searchQuery: null,
    });
  });

  it('returns direct for invalid URL string', () => {
    expect(deriveSource('not-a-url', 'example.com')).toEqual({
      source: 'direct',
      searchQuery: null,
    });
  });
});

// ─── logProfileView ─────────────────────────────────────────────

describe('logProfileView', () => {
  it('inserts view when no recent dedup match', async () => {
    const dedupChain = makeChain([]);
    const insertChain = makeChain(null);

    mockSupabaseFrom.mockReturnValueOnce(dedupChain).mockReturnValueOnce(insertChain);

    await logProfileView('comp-1', 'user-1', null, 'example.com');

    expect(dedupChain.select).toHaveBeenCalledWith('id');
    expect(dedupChain.eq).toHaveBeenCalledWith('company_id', 'comp-1');
    expect(dedupChain.eq).toHaveBeenCalledWith('viewer_id', 'user-1');
    expect(dedupChain.limit).toHaveBeenCalledWith(1);

    expect(insertChain.insert).toHaveBeenCalledWith({
      company_id: 'comp-1',
      viewer_id: 'user-1',
      referrer: null,
      source: 'direct',
      search_query: null,
    });
  });

  it('skips insert when dedup match found', async () => {
    const dedupChain = makeChain([{ id: 'existing' }]);
    mockSupabaseFrom.mockReturnValueOnce(dedupChain);

    await logProfileView('comp-1', 'user-1', null, 'example.com');

    expect(mockSupabaseFrom).toHaveBeenCalledTimes(1);
  });

  it('derives source correctly and passes to insert', async () => {
    const dedupChain = makeChain([]);
    const insertChain = makeChain(null);
    mockSupabaseFrom.mockReturnValueOnce(dedupChain).mockReturnValueOnce(insertChain);

    await logProfileView('comp-1', 'user-1', 'http://example.com/search?q=ai', 'example.com');

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'search',
        search_query: 'ai',
      })
    );
  });

  it('does not throw on Supabase error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSupabaseFrom.mockImplementation(() => {
      throw new Error('DB down');
    });

    await expect(logProfileView('comp-1', 'user-1', null, 'example.com')).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ─── getInsightsStats ───────────────────────────────────────────

describe('getInsightsStats', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns zeros when data is null', async () => {
    const chain = makeChain(null);
    mockSupabaseFrom.mockReturnValue(chain);

    const stats = await getInsightsStats('comp-1');
    expect(stats.totalViews).toBe(0);
    expect(stats.uniqueVisitors).toBe(0);
    expect(stats.last7Days).toBe(0);
    expect(stats.last30Days).toBe(0);
    expect(stats.viewsByDay).toEqual([]);
    expect(stats.topSources).toEqual([]);
    expect(stats.topSearchTerms).toEqual([]);
  });

  it('returns zeros when data is empty array', async () => {
    const chain = makeChain([]);
    mockSupabaseFrom.mockReturnValue(chain);

    const stats = await getInsightsStats('comp-1');
    expect(stats.totalViews).toBe(0);
  });

  it('returns correct totals', async () => {
    const views = [
      { id: '1', viewer_id: 'a', created_at: '2026-04-01T10:00:00Z', source: 'search', search_query: null },
      { id: '2', viewer_id: 'a', created_at: '2026-04-01T09:00:00Z', source: 'direct', search_query: null },
      { id: '3', viewer_id: 'b', created_at: '2026-04-01T08:00:00Z', source: 'search', search_query: null },
      { id: '4', viewer_id: 'c', created_at: '2026-04-01T07:00:00Z', source: 'external', search_query: null },
      { id: '5', viewer_id: 'b', created_at: '2026-04-01T06:00:00Z', source: 'internal', search_query: null },
    ];
    const chain = makeChain(views);
    mockSupabaseFrom.mockReturnValue(chain);

    const stats = await getInsightsStats('comp-1');
    expect(stats.totalViews).toBe(5);
    expect(stats.uniqueVisitors).toBe(3);
  });

  it('filters last7Days and last30Days correctly', async () => {
    const now = new Date('2026-04-01T12:00:00Z');
    const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

    const views = [
      { id: '1', viewer_id: 'a', created_at: daysAgo(0), source: 'direct', search_query: null },   // today
      { id: '2', viewer_id: 'b', created_at: daysAgo(3), source: 'direct', search_query: null },   // 3 days ago
      { id: '3', viewer_id: 'c', created_at: daysAgo(10), source: 'direct', search_query: null },  // 10 days ago
      { id: '4', viewer_id: 'd', created_at: daysAgo(45), source: 'direct', search_query: null },  // 45 days ago
    ];
    const chain = makeChain(views);
    mockSupabaseFrom.mockReturnValue(chain);

    const stats = await getInsightsStats('comp-1');
    expect(stats.last7Days).toBe(2);   // today + 3 days ago
    expect(stats.last30Days).toBe(3);  // today + 3 days ago + 10 days ago
  });

  it('builds viewsByDay with 30 entries', async () => {
    const views = [
      { id: '1', viewer_id: 'a', created_at: '2026-04-01T10:00:00Z', source: 'direct', search_query: null },
      { id: '2', viewer_id: 'b', created_at: '2026-04-01T08:00:00Z', source: 'direct', search_query: null },
      { id: '3', viewer_id: 'c', created_at: '2026-03-30T10:00:00Z', source: 'direct', search_query: null },
    ];
    const chain = makeChain(views);
    mockSupabaseFrom.mockReturnValue(chain);

    const stats = await getInsightsStats('comp-1');
    expect(stats.viewsByDay).toHaveLength(30);

    const april1 = stats.viewsByDay.find(d => d.date === '2026-04-01');
    expect(april1?.views).toBe(2);

    const march30 = stats.viewsByDay.find(d => d.date === '2026-03-30');
    expect(march30?.views).toBe(1);

    const march25 = stats.viewsByDay.find(d => d.date === '2026-03-25');
    expect(march25?.views).toBe(0);
  });

  it('aggregates topSources sorted by count desc', async () => {
    const views = [
      { id: '1', viewer_id: 'a', created_at: '2026-04-01T10:00:00Z', source: 'search', search_query: 'ai' },
      { id: '2', viewer_id: 'b', created_at: '2026-04-01T09:00:00Z', source: 'search', search_query: 'ai' },
      { id: '3', viewer_id: 'c', created_at: '2026-04-01T08:00:00Z', source: 'search', search_query: 'ai' },
      { id: '4', viewer_id: 'd', created_at: '2026-04-01T07:00:00Z', source: 'external', search_query: null },
      { id: '5', viewer_id: 'e', created_at: '2026-04-01T06:00:00Z', source: 'external', search_query: null },
      { id: '6', viewer_id: 'f', created_at: '2026-04-01T05:00:00Z', source: 'direct', search_query: null },
    ];
    const chain = makeChain(views);
    mockSupabaseFrom.mockReturnValue(chain);

    const stats = await getInsightsStats('comp-1');
    expect(stats.topSources[0]).toEqual({ source: 'search', count: 3 });
    expect(stats.topSources[1]).toEqual({ source: 'external', count: 2 });
    expect(stats.topSources[2]).toEqual({ source: 'direct', count: 1 });
  });

  it('aggregates topSearchTerms with lowercased dedup', async () => {
    const views = [
      { id: '1', viewer_id: 'a', created_at: '2026-04-01T10:00:00Z', source: 'search', search_query: 'AI' },
      { id: '2', viewer_id: 'b', created_at: '2026-04-01T09:00:00Z', source: 'search', search_query: 'ai' },
      { id: '3', viewer_id: 'c', created_at: '2026-04-01T08:00:00Z', source: 'search', search_query: 'NLP' },
    ];
    const chain = makeChain(views);
    mockSupabaseFrom.mockReturnValue(chain);

    const stats = await getInsightsStats('comp-1');
    expect(stats.topSearchTerms).toContainEqual({ term: 'ai', count: 2 });
    expect(stats.topSearchTerms).toContainEqual({ term: 'nlp', count: 1 });
    expect(stats.topSearchTerms.length).toBeLessThanOrEqual(10);
  });

  it('ignores null and empty search_query', async () => {
    const views = [
      { id: '1', viewer_id: 'a', created_at: '2026-04-01T10:00:00Z', source: 'direct', search_query: null },
      { id: '2', viewer_id: 'b', created_at: '2026-04-01T09:00:00Z', source: 'direct', search_query: '' },
      { id: '3', viewer_id: 'c', created_at: '2026-04-01T08:00:00Z', source: 'search', search_query: '  ' },
      { id: '4', viewer_id: 'd', created_at: '2026-04-01T07:00:00Z', source: 'search', search_query: 'valid' },
    ];
    const chain = makeChain(views);
    mockSupabaseFrom.mockReturnValue(chain);

    const stats = await getInsightsStats('comp-1');
    expect(stats.topSearchTerms).toEqual([{ term: 'valid', count: 1 }]);
  });
});

// ─── getInsightsViewers ─────────────────────────────────────────

describe('getInsightsViewers', () => {
  it('returns empty when no views', async () => {
    const chain = makeChain([]);
    mockSupabaseFrom.mockReturnValue(chain);

    const result = await getInsightsViewers('comp-1');
    expect(result).toEqual({ viewers: [], total: 0, page: 1, pageSize: 20 });
  });

  it('groups views by viewer_id', async () => {
    const views = [
      { viewer_id: 'user-a', created_at: '2026-04-01T10:00:00Z', source: 'search', viewer: { name: 'Alice', email: 'a@test.com', avatar_url: null } },
      { viewer_id: 'user-a', created_at: '2026-04-01T09:00:00Z', source: 'direct', viewer: { name: 'Alice', email: 'a@test.com', avatar_url: null } },
      { viewer_id: 'user-b', created_at: '2026-04-01T08:00:00Z', source: 'external', viewer: { name: 'Bob', email: 'b@test.com', avatar_url: null } },
    ];
    const chain = makeChain(views);
    mockSupabaseFrom.mockReturnValue(chain);

    const result = await getInsightsViewers('comp-1');
    expect(result.total).toBe(2);

    const alice = result.viewers.find(v => v.userId === 'user-a');
    expect(alice?.visitCount).toBe(2);

    const bob = result.viewers.find(v => v.userId === 'user-b');
    expect(bob?.visitCount).toBe(1);
  });

  it('computes lastVisited as most recent created_at', async () => {
    const views = [
      { viewer_id: 'user-a', created_at: '2026-04-01T10:00:00Z', source: 'search', viewer: { name: 'Alice', email: 'a@test.com', avatar_url: null } },
      { viewer_id: 'user-a', created_at: '2026-03-28T05:00:00Z', source: 'direct', viewer: { name: 'Alice', email: 'a@test.com', avatar_url: null } },
    ];
    const chain = makeChain(views);
    mockSupabaseFrom.mockReturnValue(chain);

    const result = await getInsightsViewers('comp-1');
    expect(result.viewers[0].lastVisited).toBe('2026-04-01T10:00:00Z');
  });

  it('computes topSource as most frequent source', async () => {
    const views = [
      { viewer_id: 'user-a', created_at: '2026-04-01T10:00:00Z', source: 'search', viewer: { name: 'Alice', email: 'a@test.com', avatar_url: null } },
      { viewer_id: 'user-a', created_at: '2026-04-01T09:00:00Z', source: 'search', viewer: { name: 'Alice', email: 'a@test.com', avatar_url: null } },
      { viewer_id: 'user-a', created_at: '2026-04-01T08:00:00Z', source: 'direct', viewer: { name: 'Alice', email: 'a@test.com', avatar_url: null } },
    ];
    const chain = makeChain(views);
    mockSupabaseFrom.mockReturnValue(chain);

    const result = await getInsightsViewers('comp-1');
    expect(result.viewers[0].topSource).toBe('search');
  });

  it('sorts by visitCount descending', async () => {
    const views = [
      { viewer_id: 'user-a', created_at: '2026-04-01T10:00:00Z', source: 'direct', viewer: { name: 'Alice', email: 'a@test.com', avatar_url: null } },
      { viewer_id: 'user-b', created_at: '2026-04-01T09:00:00Z', source: 'direct', viewer: { name: 'Bob', email: 'b@test.com', avatar_url: null } },
      { viewer_id: 'user-b', created_at: '2026-04-01T08:00:00Z', source: 'direct', viewer: { name: 'Bob', email: 'b@test.com', avatar_url: null } },
      { viewer_id: 'user-b', created_at: '2026-04-01T07:00:00Z', source: 'direct', viewer: { name: 'Bob', email: 'b@test.com', avatar_url: null } },
    ];
    const chain = makeChain(views);
    mockSupabaseFrom.mockReturnValue(chain);

    const result = await getInsightsViewers('comp-1');
    expect(result.viewers[0].userId).toBe('user-b');
    expect(result.viewers[0].visitCount).toBe(3);
    expect(result.viewers[1].userId).toBe('user-a');
    expect(result.viewers[1].visitCount).toBe(1);
  });

  it('paginates correctly', async () => {
    const views = [
      { viewer_id: 'user-a', created_at: '2026-04-01T10:00:00Z', source: 'direct', viewer: { name: 'A', email: 'a@t.com', avatar_url: null } },
      { viewer_id: 'user-b', created_at: '2026-04-01T09:00:00Z', source: 'direct', viewer: { name: 'B', email: 'b@t.com', avatar_url: null } },
      { viewer_id: 'user-c', created_at: '2026-04-01T08:00:00Z', source: 'direct', viewer: { name: 'C', email: 'c@t.com', avatar_url: null } },
    ];
    const chain1 = makeChain(views);
    mockSupabaseFrom.mockReturnValue(chain1);

    const page1 = await getInsightsViewers('comp-1', 1, 2);
    expect(page1.viewers).toHaveLength(2);
    expect(page1.total).toBe(3);
    expect(page1.page).toBe(1);
    expect(page1.pageSize).toBe(2);

    const chain2 = makeChain(views);
    mockSupabaseFrom.mockReturnValue(chain2);

    const page2 = await getInsightsViewers('comp-1', 2, 2);
    expect(page2.viewers).toHaveLength(1);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
  });

  it('skips entries with null viewer (join failed)', async () => {
    const views = [
      { viewer_id: 'user-a', created_at: '2026-04-01T10:00:00Z', source: 'direct', viewer: null },
      { viewer_id: 'user-b', created_at: '2026-04-01T09:00:00Z', source: 'direct', viewer: { name: 'Bob', email: 'b@test.com', avatar_url: null } },
    ];
    const chain = makeChain(views);
    mockSupabaseFrom.mockReturnValue(chain);

    const result = await getInsightsViewers('comp-1');
    expect(result.viewers).toHaveLength(1);
    expect(result.viewers[0].userId).toBe('user-b');
    expect(result.total).toBe(1);
  });
});
