import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { getCompanyById, getCompanyMediaCount } from '@/lib/company-repository';
import { isCompanyOwner } from '@/lib/company-permissions';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';
import { uploadMediaToR2, validateMediaFile, deleteMediaFromR2 } from '@/lib/r2';

const MAX_MEDIA_PER_COMPANY = 10;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting
  const rateLimitId = auth.admin ? auth.admin.adminId : auth.userId!;
  const rateLimitKey = getRateLimitKey('media', rateLimitId);
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.media);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', resetIn: rateLimit.resetIn },
      { status: 429 }
    );
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const companyId = formData.get('company_id') as string | null;

  if (!file || !companyId) {
    return NextResponse.json({ error: 'file and company_id are required' }, { status: 400 });
  }

  if (!UUID_REGEX.test(companyId)) {
    return NextResponse.json({ error: 'Invalid company_id format' }, { status: 400 });
  }

  // Validate file
  const validation = validateMediaFile(file);
  if (validation.error) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Verify company exists
  const company = await getCompanyById(companyId);
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  // Check ownership for non-admin users
  if (!auth.admin) {
    if (!isCompanyOwner(company, auth.userId!)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Check limit
  const count = await getCompanyMediaCount(companyId);
  if (count >= MAX_MEDIA_PER_COMPANY) {
    return NextResponse.json(
      { error: `Maximum ${MAX_MEDIA_PER_COMPANY} media items per company` },
      { status: 400 }
    );
  }

  // Upload to R2
  let uploadResult;
  try {
    uploadResult = await uploadMediaToR2(companyId, file);
  } catch (err) {
    console.error('R2 upload error:', err);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }

  // Insert DB record
  const { data, error } = await supabaseAdmin
    .from('company_media')
    .insert({
      company_id: companyId,
      file_url: uploadResult.url,
      file_type: uploadResult.fileType,
      mime_type: uploadResult.mimeType,
      file_size: uploadResult.fileSize,
      original_filename: file.name,
      sort_order: count, // append at end
    })
    .select()
    .single();

  if (error) {
    // Clean up orphaned R2 file
    try { await deleteMediaFromR2(uploadResult.url); } catch {}
    console.error('DB insert error:', error);
    return NextResponse.json({ error: 'Failed to save media record' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('company_id');

  if (!companyId) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 });
  }

  if (!UUID_REGEX.test(companyId)) {
    return NextResponse.json({ error: 'Invalid company_id format' }, { status: 400 });
  }

  // Rate limiting by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateLimitKey = getRateLimitKey('search', ip);
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.search);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', resetIn: rateLimit.resetIn },
      { status: 429 }
    );
  }

  // Verify company exists and is approved
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('id, status')
    .eq('id', companyId)
    .single();

  if (!company || company.status !== 'approved') {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from('company_media')
    .select('id, company_id, file_url, file_type, mime_type, file_size, original_filename, sort_order, created_at')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
