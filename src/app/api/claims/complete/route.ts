import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/auth';
import { getOrCreateUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { getCompanyById } from '@/lib/company-repository';
import { emailMatchesCompanyDomain } from '@/lib/domain-utils';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const stackUser = await stackServerApp.getUser();

  if (!stackUser?.primaryEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check that the email is verified
  if (!stackUser.primaryEmailVerified) {
    return NextResponse.json({ error: 'Email not verified' }, { status: 403 });
  }

  let userId: string;
  try {
    userId = await getOrCreateUser(stackUser);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting: 5 attempts per user per hour
  const rateLimitKey = getRateLimitKey('registration', userId);
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.registration);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.', resetIn: rateLimit.resetIn },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { company_id } = body;

    if (!company_id) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 });
    }

    const company = await getCompanyById(company_id);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (!company.company_url) {
      return NextResponse.json({ error: 'Company has no website URL' }, { status: 400 });
    }

    if (company.claimed_by) {
      return NextResponse.json({ error: 'This company has already been claimed' }, { status: 409 });
    }

    // Validate email domain matches company domain
    if (!emailMatchesCompanyDomain(company.company_url, stackUser.primaryEmail)) {
      return NextResponse.json(
        { error: 'Your email domain does not match the company website domain' },
        { status: 403 }
      );
    }

    // Insert claim record
    const { error: claimError } = await supabaseAdmin
      .from('company_claims')
      .insert({
        company_id: company.id,
        user_id: userId,
        verified_email: stackUser.primaryEmail,
        status: 'verified',
      });

    if (claimError) {
      console.error('Claim insert error:', claimError);
      return NextResponse.json({ error: 'Failed to create claim' }, { status: 500 });
    }

    // Update company's claimed_by
    const { error: updateError } = await supabaseAdmin
      .from('companies')
      .update({ claimed_by: userId })
      .eq('id', company.id);

    if (updateError) {
      console.error('Company update error:', updateError);
      return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Company claimed successfully' }, { status: 200 });
  } catch (error) {
    console.error('Claim error:', error);
    return NextResponse.json({ error: 'Failed to process claim' }, { status: 500 });
  }
}
