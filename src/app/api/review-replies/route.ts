import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/auth';
import { getOrCreateUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';
import { isCompanyOwner } from '@/lib/company-permissions';

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

  const rateLimitKey = getRateLimitKey('reviews', `reply:${userId}`);
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.reviews);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded.', resetIn: rateLimit.resetIn },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { reviewId, comment } = body;

    if (!reviewId || !comment?.trim()) {
      return NextResponse.json({ error: 'Review ID and comment are required' }, { status: 400 });
    }

    // Fetch review to get company_id
    const { data: review } = await supabaseAdmin
      .from('reviews')
      .select('id, company_id')
      .eq('id', reviewId)
      .single();

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Fetch company to check ownership
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('id, submitted_by, claimed_by')
      .eq('id', review.company_id)
      .single();

    if (!company || !isCompanyOwner(company, userId)) {
      return NextResponse.json({ error: 'Only company owners can reply to reviews' }, { status: 403 });
    }

    // Check no existing reply
    const { data: existingReply } = await supabaseAdmin
      .from('review_replies')
      .select('id')
      .eq('review_id', reviewId)
      .single();

    if (existingReply) {
      return NextResponse.json({ error: 'A reply already exists for this review' }, { status: 409 });
    }

    const { data: reply, error } = await supabaseAdmin
      .from('review_replies')
      .insert({
        review_id: reviewId,
        company_id: review.company_id,
        user_id: userId,
        comment: comment.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reply:', error);
      return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
    }

    return NextResponse.json(reply, { status: 201 });
  } catch (error) {
    console.error('Reply error:', error);
    return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { replyId, comment } = body;

    if (!replyId || !comment?.trim()) {
      return NextResponse.json({ error: 'Reply ID and comment are required' }, { status: 400 });
    }

    const { data: existingReply } = await supabaseAdmin
      .from('review_replies')
      .select('id, user_id')
      .eq('id', replyId)
      .single();

    if (!existingReply) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
    }

    if (existingReply.user_id !== userId) {
      return NextResponse.json({ error: 'Not authorized to edit this reply' }, { status: 403 });
    }

    const { data: reply, error } = await supabaseAdmin
      .from('review_replies')
      .update({ comment: comment.trim(), updated_at: new Date().toISOString() })
      .eq('id', replyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating reply:', error);
      return NextResponse.json({ error: 'Failed to update reply' }, { status: 500 });
    }

    return NextResponse.json(reply);
  } catch (error) {
    console.error('Reply update error:', error);
    return NextResponse.json({ error: 'Failed to update reply' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const replyId = request.nextUrl.searchParams.get('replyId');
  if (!replyId) {
    return NextResponse.json({ error: 'Reply ID is required' }, { status: 400 });
  }

  const { data: existingReply } = await supabaseAdmin
    .from('review_replies')
    .select('id, user_id')
    .eq('id', replyId)
    .single();

  if (!existingReply) {
    return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
  }

  if (existingReply.user_id !== userId) {
    return NextResponse.json({ error: 'Not authorized to delete this reply' }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from('review_replies')
    .delete()
    .eq('id', replyId);

  if (error) {
    console.error('Error deleting reply:', error);
    return NextResponse.json({ error: 'Failed to delete reply' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Reply deleted' });
}
