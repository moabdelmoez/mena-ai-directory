import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/auth';
import { getOrCreateUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';
import { getEmailDomain, isPublicEmailDomain } from '@/lib/domain-utils';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const companyId = searchParams.get('companyId');

  if (!companyId) {
    return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select(`
      *,
      user:users(name, avatar_url),
      reply:review_replies(id, review_id, company_id, user_id, comment, created_at, updated_at)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }

  // Flatten reply from array to single object (Supabase returns arrays for joins)
  const reviews = (data || []).map((review: Record<string, unknown>) => ({
    ...review,
    reply: Array.isArray(review.reply) && review.reply.length > 0 ? review.reply[0] : null,
  }));

  return NextResponse.json(reviews, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  });
}

async function getAuthUser() {
  const stackUser = await stackServerApp.getUser();
  if (!stackUser) return null;
  try {
    const userId = await getOrCreateUser(stackUser);
    return { userId, stackUser };
  } catch {
    return null;
  }
}

async function checkReviewEligibility(stackUser: { primaryEmail: string | null; listConnectedAccounts?: () => Promise<Array<{ provider: string }>> }): Promise<string | null> {
  const email = stackUser.primaryEmail;
  if (!email) return 'Email is required to submit a review.';

  const domain = getEmailDomain(email);
  if (!isPublicEmailDomain(domain)) return null; // Company email — allowed

  // Personal email — check for LinkedIn
  try {
    const accounts = await stackUser.listConnectedAccounts?.() ?? [];
    if (accounts.some(a => a.provider === 'linkedin')) return null; // LinkedIn — allowed
  } catch (err) {
    console.error('checkReviewEligibility: failed to list connected accounts', err);
  }

  return 'Reviews can only be submitted using a LinkedIn account or a company email address.';
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser();

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId, stackUser } = auth;

  // Check review eligibility (LinkedIn or company email required)
  const eligibilityError = await checkReviewEligibility(stackUser);
  if (eligibilityError) {
    return NextResponse.json({ error: eligibilityError }, { status: 403 });
  }

  // Rate limiting
  const rateLimitKey = getRateLimitKey('reviews', userId);
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.reviews);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. You can submit up to 10 reviews per hour.', resetIn: rateLimit.resetIn },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { companyId, rating, comment } = body;

    if (!companyId || rating === undefined || rating === null) {
      return NextResponse.json({ error: 'Company ID and rating are required' }, { status: 400 });
    }

    if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
    }

    if (comment !== undefined && comment !== null && typeof comment !== 'string') {
      return NextResponse.json({ error: 'Comment must be a string' }, { status: 400 });
    }

    // Check if company exists and is approved
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .eq('status', 'approved')
      .single();

    if (!company) {
      return NextResponse.json({ error: 'Company not found or not approved' }, { status: 404 });
    }

    // Check if user already reviewed this company
    const { data: existingReview } = await supabaseAdmin
      .from('reviews')
      .select('id')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this company.' },
        { status: 409 }
      );
    }

    const { data: review, error } = await supabaseAdmin
      .from('reviews')
      .insert({
        company_id: companyId,
        user_id: userId,
        rating,
        comment: comment || null,
      })
      .select(`
        *,
        user:users(name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error creating review:', error);
      return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
    }

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Review error:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Reviews cannot be edited. Contact support@bayanbase.com for help.' },
    { status: 403 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Reviews cannot be deleted. Contact support@bayanbase.com for help.' },
    { status: 403 }
  );
}
