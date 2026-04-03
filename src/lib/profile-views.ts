import { supabaseAdmin } from '@/lib/supabase';

type ViewSource = 'search' | 'direct' | 'external' | 'internal';

const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export function deriveSource(referer: string | null, host: string): { source: ViewSource; searchQuery: string | null } {
  if (!referer) {
    return { source: 'direct', searchQuery: null };
  }

  try {
    const url = new URL(referer);
    const refHost = url.hostname.replace(/^www\./, '');
    const siteHost = host.replace(/^www\./, '');

    if (refHost === siteHost || refHost === 'localhost') {
      if (url.pathname.startsWith('/search')) {
        const query = url.searchParams.get('q') || null;
        return { source: 'search', searchQuery: query };
      }
      return { source: 'internal', searchQuery: null };
    }

    return { source: 'external', searchQuery: null };
  } catch {
    return { source: 'direct', searchQuery: null };
  }
}

export async function logProfileView(
  companyId: string,
  viewerId: string,
  referer: string | null,
  host: string
): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
    const { data: recent } = await supabaseAdmin
      .from('profile_views')
      .select('id')
      .eq('company_id', companyId)
      .eq('viewer_id', viewerId)
      .gte('created_at', cutoff)
      .limit(1);

    if (recent && recent.length > 0) {
      return;
    }

    const { source, searchQuery } = deriveSource(referer, host);

    await supabaseAdmin.from('profile_views').insert({
      company_id: companyId,
      viewer_id: viewerId,
      referrer: referer,
      source,
      search_query: searchQuery,
    });
  } catch (err) {
    console.error('Failed to log profile view:', err);
  }
}

export interface InsightsStats {
  totalViews: number;
  uniqueVisitors: number;
  last7Days: number;
  last30Days: number;
  viewsByDay: Array<{ date: string; views: number }>;
  topSources: Array<{ source: string; count: number }>;
  topSearchTerms: Array<{ term: string; count: number }>;
}

export async function getInsightsStats(companyId: string): Promise<InsightsStats> {
  const { data: views } = await supabaseAdmin
    .from('profile_views')
    .select('id, viewer_id, created_at, source, search_query')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (!views || views.length === 0) {
    return {
      totalViews: 0,
      uniqueVisitors: 0,
      last7Days: 0,
      last30Days: 0,
      viewsByDay: [],
      topSources: [],
      topSearchTerms: [],
    };
  }

  const now = Date.now();
  const ms7 = 7 * 24 * 60 * 60 * 1000;
  const ms30 = 30 * 24 * 60 * 60 * 1000;

  const totalViews = views.length;
  const uniqueVisitors = new Set(views.map(v => v.viewer_id)).size;
  const last7Days = views.filter(v => now - new Date(v.created_at).getTime() <= ms7).length;
  const last30Days = views.filter(v => now - new Date(v.created_at).getTime() <= ms30).length;

  // Views by day for last 30 days (zero-filled)
  const dayCountMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dayCountMap.set(key, 0);
  }
  for (const v of views) {
    const key = new Date(v.created_at).toISOString().slice(0, 10);
    if (dayCountMap.has(key)) {
      dayCountMap.set(key, (dayCountMap.get(key) ?? 0) + 1);
    }
  }
  const viewsByDay = Array.from(dayCountMap.entries()).map(([date, count]) => ({ date, views: count }));

  // Top sources
  const sourceMap = new Map<string, number>();
  for (const v of views) {
    const s = v.source ?? 'direct';
    sourceMap.set(s, (sourceMap.get(s) ?? 0) + 1);
  }
  const topSources = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // Top search terms (top 10)
  const termMap = new Map<string, number>();
  for (const v of views) {
    if (v.search_query) {
      const term = v.search_query.trim().toLowerCase();
      if (term) {
        termMap.set(term, (termMap.get(term) ?? 0) + 1);
      }
    }
  }
  const topSearchTerms = Array.from(termMap.entries())
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalViews,
    uniqueVisitors,
    last7Days,
    last30Days,
    viewsByDay,
    topSources,
    topSearchTerms,
  };
}

export interface ViewerEntry {
  userId: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  visitCount: number;
  lastVisited: string;
  topSource: string;
}

export interface ViewersResult {
  viewers: ViewerEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getInsightsViewers(
  companyId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<ViewersResult> {
  const { data: views } = await supabaseAdmin
    .from('profile_views')
    .select('viewer_id, created_at, source, viewer:users(name, email, avatar_url)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (!views || views.length === 0) {
    return { viewers: [], total: 0, page, pageSize };
  }

  // Group by viewer_id
  const grouped = new Map<string, {
    name: string | null;
    email: string;
    avatarUrl: string | null;
    visitCount: number;
    lastVisited: string;
    sources: string[];
  }>();

  for (const v of views) {
    const user = v.viewer as unknown as { name: string | null; email: string; avatar_url: string | null } | null;
    if (!user) continue;

    const existing = grouped.get(v.viewer_id);
    if (existing) {
      existing.visitCount += 1;
      if (v.created_at > existing.lastVisited) {
        existing.lastVisited = v.created_at;
      }
      existing.sources.push(v.source ?? 'direct');
    } else {
      grouped.set(v.viewer_id, {
        name: user.name,
        email: user.email,
        avatarUrl: user.avatar_url,
        visitCount: 1,
        lastVisited: v.created_at,
        sources: [v.source ?? 'direct'],
      });
    }
  }

  // Compute top source per viewer and build entries
  const allEntries: ViewerEntry[] = Array.from(grouped.entries()).map(([userId, data]) => {
    const sourceFreq = new Map<string, number>();
    for (const s of data.sources) {
      sourceFreq.set(s, (sourceFreq.get(s) ?? 0) + 1);
    }
    const topSource = [...sourceFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'direct';

    return {
      userId,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatarUrl,
      visitCount: data.visitCount,
      lastVisited: data.lastVisited,
      topSource,
    };
  });

  // Sort by visitCount desc
  allEntries.sort((a, b) => b.visitCount - a.visitCount);

  const total = allEntries.length;
  const offset = (page - 1) * pageSize;
  const viewers = allEntries.slice(offset, offset + pageSize);

  return { viewers, total, page, pageSize };
}
