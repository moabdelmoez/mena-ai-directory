import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/auth';
import { getOrCreateUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
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

  // Rate limiting
  const rateLimitKey = getRateLimitKey('infoRequests', userId);
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.infoRequests);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. You can submit up to 10 info requests per hour.', resetIn: rateLimit.resetIn },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { companyId } = body;

    if (!companyId || typeof companyId !== 'string') {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Verify company exists and is approved
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .eq('status', 'approved')
      .single();

    if (!company) {
      return NextResponse.json({ error: 'Company not found or not approved' }, { status: 404 });
    }

    const { data: infoRequest, error } = await supabaseAdmin
      .from('info_requests')
      .insert({
        company_id: companyId,
        user_id: userId,
        user_email: stackUser.primaryEmail,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating info request:', error);
      return NextResponse.json({ error: 'Failed to create info request' }, { status: 500 });
    }

    return NextResponse.json(infoRequest, { status: 201 });
  } catch (error) {
    console.error('Info request error:', error);
    return NextResponse.json({ error: 'Failed to create info request' }, { status: 500 });
  }
}
