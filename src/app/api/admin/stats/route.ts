import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting
  const rateLimitKey = getRateLimitKey('admin', session.adminId);
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.admin);

  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // Fetch counts and profile views in parallel
  const [pendingRes, approvedRes, rejectedRes, usersRes, profileViewsRes] = await Promise.all([
    supabaseAdmin.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabaseAdmin.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('profile_views').select('company_id'),
  ]);

  const pending = pendingRes.count ?? 0;
  const approved = approvedRes.count ?? 0;
  const rejected = rejectedRes.count ?? 0;
  const registeredUsers = usersRes.count ?? 0;

  // Aggregate profile views by company_id
  const viewCounts = new Map<string, number>();
  if (profileViewsRes.data) {
    for (const row of profileViewsRes.data) {
      viewCounts.set(row.company_id, (viewCounts.get(row.company_id) || 0) + 1);
    }
  }

  // Sort by views desc, take top 10
  const top10Ids = [...viewCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  // Fetch company details for top 10
  let topCompanies: Array<{ id: string; name: string; slug: string; views: number }> = [];
  if (top10Ids.length > 0) {
    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select('id, name, slug')
      .in('id', top10Ids)
      .eq('status', 'approved');

    if (companies) {
      const companyMap = new Map(companies.map(c => [c.id, c]));
      topCompanies = top10Ids
        .filter(id => companyMap.has(id))
        .map(id => {
          const company = companyMap.get(id)!;
          return { id: company.id, name: company.name, slug: company.slug, views: viewCounts.get(id)! };
        });
    }
  }

  return NextResponse.json({
    pending,
    approved,
    rejected,
    total: pending + approved + rejected,
    registeredUsers,
    topCompanies,
  });
}
