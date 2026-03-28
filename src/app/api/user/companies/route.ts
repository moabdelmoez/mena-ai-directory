import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/auth';
import { getOrCreateUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { COMPANY_COLUMNS } from '@/lib/company-repository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);
  const offset = (page - 1) * limit;

  // Fetch companies the user submitted OR claimed
  const { data, error, count } = await supabaseAdmin
    .from('companies')
    .select(COMPANY_COLUMNS, { count: 'exact' })
    .or(`submitted_by.eq.${userId},claimed_by.eq.${userId}`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching user companies:', error);
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }

  return NextResponse.json({
    data,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
