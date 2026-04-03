import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/auth';
import { getOrCreateUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { getInsightsStats } from '@/lib/profile-views';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';

interface RouteContext {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const stackUser = await stackServerApp.getUser();
  if (!stackUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let userId: string;
  try {
    userId = await getOrCreateUser(stackUser);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitResult = checkRateLimit(
    getRateLimitKey('search', userId),
    RATE_LIMITS.search
  );
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('id, claimed_by')
    .eq('id', params.id)
    .single();

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  if (company.claimed_by !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const stats = await getInsightsStats(params.id);

  return NextResponse.json(stats, {
    headers: {
      'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120',
    },
  });
}
