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

  // Fetch counts, recent info requests, and latest companies in parallel
  const [pendingRes, approvedRes, rejectedRes, usersRes, infoReqRes, companiesRes] = await Promise.all([
    supabaseAdmin.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabaseAdmin.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
    supabaseAdmin
      .from('info_requests')
      .select('id, user_email, created_at, company:companies(id, name, slug)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('companies')
      .select('id, name, slug, submitted_by, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const pending = pendingRes.count ?? 0;
  const approved = approvedRes.count ?? 0;
  const rejected = rejectedRes.count ?? 0;
  const registeredUsers = usersRes.count ?? 0;

  type InfoReqRow = {
    id: string;
    user_email: string;
    created_at: string;
    company: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
  };
  const recentInfoRequests = ((infoReqRes.data as InfoReqRow[] | null) ?? []).map((row) => {
    const company = Array.isArray(row.company) ? row.company[0] ?? null : row.company;
    return {
      id: row.id,
      userEmail: row.user_email,
      createdAt: row.created_at,
      company,
    };
  });

  type CompanyRow = { id: string; name: string; slug: string; submitted_by: string | null };
  const companiesData = (companiesRes.data as CompanyRow[] | null) ?? [];
  const ownerIds = [...new Set(companiesData.map((c) => c.submitted_by).filter((v): v is string => !!v))];

  const ownerMap = new Map<string, { email: string; name: string | null }>();
  if (ownerIds.length > 0) {
    const { data: owners } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .in('id', ownerIds);
    for (const o of owners ?? []) {
      ownerMap.set(o.id, { email: o.email, name: o.name });
    }
  }

  const companiesWithOwners = companiesData.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    owner: c.submitted_by ? ownerMap.get(c.submitted_by) ?? null : null,
  }));

  return NextResponse.json({
    pending,
    approved,
    rejected,
    total: pending + approved + rejected,
    registeredUsers,
    recentInfoRequests,
    companiesWithOwners,
  });
}
