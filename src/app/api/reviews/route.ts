import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/auth';
import { getOrCreateUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';

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

async function getAuthUserId(): Promise<string | null> {
  const stackUser = await stackServerApp.getUser();
  if (!stackUser) return null;
  try {
    return await getOrCreateUser(stackUser);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        { error: 'You have already reviewed this company. Use PUT to update your review.' },
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

export async function PUT(request: NextRequest) {
  const userId = await getAuthUserId();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { reviewId, rating, comment } = body;

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
    }

    if (rating !== undefined && (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
    }

    // Check if review belongs to user
    const { data: existingReview } = await supabaseAdmin
      .from('reviews')
      .select('id')
      .eq('id', reviewId)
      .eq('user_id', userId)
      .single();

    if (!existingReview) {
      return NextResponse.json({ error: 'Review not found or not yours' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (rating !== undefined) updateData.rating = rating;
    if (comment !== undefined) updateData.comment = comment;

    const { data: review, error } = await supabaseAdmin
      .from('reviews')
      .update(updateData)
      .eq('id', reviewId)
      .select(`
        *,
        user:users(name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error updating review:', error);
      return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error('Review update error:', error);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getAuthUserId();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const reviewId = searchParams.get('reviewId');

  if (!reviewId) {
    return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
  }

  // Check if review belongs to user
  const { data: existingReview } = await supabaseAdmin
    .from('reviews')
    .select('id')
    .eq('id', reviewId)
    .eq('user_id', userId)
    .single();

  if (!existingReview) {
    return NextResponse.json({ error: 'Review not found or not yours' }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from('reviews')
    .delete()
    .eq('id', reviewId);

  if (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Review deleted' });
}
