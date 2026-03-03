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

  // Fetch all three counts in parallel instead of 3 separate paginated requests
  const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
    supabaseAdmin.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabaseAdmin.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
  ]);

  const pending = pendingRes.count ?? 0;
  const approved = approvedRes.count ?? 0;
  const rejected = rejectedRes.count ?? 0;

  return NextResponse.json({
    pending,
    approved,
    rejected,
    total: pending + approved + rejected,
  });
}
