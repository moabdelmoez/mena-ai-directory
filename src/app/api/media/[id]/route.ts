import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { getCompanyById } from '@/lib/company-repository';
import { isCompanyOwner } from '@/lib/company-permissions';
import { deleteMediaFromR2 } from '@/lib/r2';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Fetch the media record
  const { data: media, error: fetchError } = await supabaseAdmin
    .from('company_media')
    .select('id, company_id, file_url')
    .eq('id', id)
    .single();

  if (fetchError || !media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  // Check ownership for non-admin users
  if (!auth.admin) {
    const company = await getCompanyById(media.company_id);
    if (!company || !isCompanyOwner(company, auth.userId!)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Delete from R2
  try {
    await deleteMediaFromR2(media.file_url);
  } catch (err) {
    console.error('R2 delete error:', err);
    // Continue to delete DB record even if R2 fails
  }

  // Delete DB record
  const { error: deleteError } = await supabaseAdmin
    .from('company_media')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('DB delete error:', deleteError);
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Media deleted' });
}
