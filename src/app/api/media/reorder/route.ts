import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { getCompanyById } from '@/lib/company-repository';
import { isCompanyOwner } from '@/lib/company-permissions';

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { company_id: string; media_ids: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { company_id, media_ids } = body;
  if (!company_id || !Array.isArray(media_ids) || media_ids.length === 0) {
    return NextResponse.json({ error: 'company_id and media_ids are required' }, { status: 400 });
  }

  // Check ownership for non-admin users
  if (!auth.admin) {
    const company = await getCompanyById(company_id);
    if (!company || !isCompanyOwner(company, auth.userId!)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Update sort_order for each media item
  const updates = media_ids.map((mediaId, index) =>
    supabaseAdmin
      .from('company_media')
      .update({ sort_order: index })
      .eq('id', mediaId)
      .eq('company_id', company_id)
  );

  const results = await Promise.all(updates);
  const hasError = results.some(r => r.error);

  if (hasError) {
    console.error('Reorder errors:', results.filter(r => r.error).map(r => r.error));
    return NextResponse.json({ error: 'Failed to reorder media' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Media reordered' });
}
