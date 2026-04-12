import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/auth';
import { getOrCreateUser } from '@/lib/auth-helpers';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

interface RouteContext {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  // Check admin first
  const admin = await requireAdmin(request);
  let userId: string | null = null;

  if (!admin) {
    const stackUser = await stackServerApp.getUser();
    if (!stackUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      userId = await getOrCreateUser(stackUser);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Verify company exists and check ownership
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('id, claimed_by')
    .eq('id', params.id)
    .single();

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  // Only company owner or admin can view info requests
  if (!admin && company.claimed_by !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('info_requests')
    .select(`
      *,
      user:users(name, avatar_url)
    `)
    .eq('company_id', params.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching info requests:', error);
    return NextResponse.json({ error: 'Failed to fetch info requests' }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
