import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';
import { generateCompanyEmbedding } from '@/lib/openai';
import { generateUniqueSlug } from '@/lib/utils';
import { MENA_COUNTRIES } from '@/constants';
import { ProductInput } from '@/types';
import { validateLogo, uploadLogo, parseAndValidateProducts, insertProducts, getFormString, getFormStringOrNull, getFormFile, getFormStringArray } from '@/lib/company-service';

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting
  const rateLimitKey = getRateLimitKey('admin', session.adminId);
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.admin);

  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const hqCountry = searchParams.get('hq_country');
  const aiInfrastructure = searchParams.get('ai_infrastructure');
  const aiPlatform = searchParams.get('ai_platform');
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortOrder = searchParams.get('sort_order') || 'desc';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
  const offset = (page - 1) * limit;

  // Select specific columns to exclude embedding vectors (1536-dim)
  const companyColumns = 'id, company_id, name, slug, website, description, logo, derived_capabilities, domain_verticals, hq_country, hq_region, ai_infrastructure, ai_platform, scrape_confidence, status, submitted_by, created_at, updated_at';

  let query = supabaseAdmin
    .from('companies')
    .select(`${companyColumns}, submitted_user:users!submitted_by(name, email)`, { count: 'exact' });

  // Apply filters
  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    // Sanitize search input: escape PostgREST special characters to prevent filter injection
    const sanitized = search.replace(/[,%.()"\\]/g, '');
    if (sanitized) {
      query = query.or(`name.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
    }
  }

  if (hqCountry) {
    query = query.eq('hq_country', hqCountry);
  }

  if (aiInfrastructure === 'true') {
    query = query.eq('ai_infrastructure', true);
  }

  if (aiPlatform === 'true') {
    query = query.eq('ai_platform', true);
  }

  // Apply sorting
  const validSortColumns = ['created_at', 'name', 'hq_country', 'status'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching companies:', error);
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

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { companyId, status } = body;

    if (!companyId || !status) {
      return NextResponse.json({ error: 'Company ID and status are required' }, { status: 400 });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { data: company, error } = await supabaseAdmin
      .from('companies')
      .update({ status })
      .eq('id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating company:', error);
      return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting
  const rateLimitKey = getRateLimitKey('admin', session.adminId);
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.admin);

  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const formData = await request.formData();

    const name = getFormString(formData, 'name');
    const website = getFormStringOrNull(formData, 'website');
    const description = getFormString(formData, 'description');
    const derived_capabilities = getFormStringArray(formData, 'derived_capabilities');
    const domain_verticals = getFormStringArray(formData, 'domain_verticals');
    const hq_country = getFormString(formData, 'hq_country');
    const hq_region = getFormStringOrNull(formData, 'hq_region');
    const ai_infrastructure = getFormString(formData, 'ai_infrastructure') === 'true';
    const ai_platform = getFormString(formData, 'ai_platform') === 'true';
    const logo = getFormFile(formData, 'logo');
    const productsJson = getFormStringOrNull(formData, 'products');

    // Parse products if provided
    let products: ProductInput[] = [];
    if (productsJson) {
      try {
        products = parseAndValidateProducts(productsJson);
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid products JSON' }, { status: 400 });
      }
    }

    // Validation - required fields: name, description, hq_country
    if (!name || !description || !hq_country) {
      return NextResponse.json({ error: 'Name, description, and headquarters country are required' }, { status: 400 });
    }

    if (!MENA_COUNTRIES.includes(hq_country as typeof MENA_COUNTRIES[number])) {
      return NextResponse.json({ error: 'Invalid country' }, { status: 400 });
    }

    // Handle logo upload
    let logoUrl: string | null = null;
    if (logo && logo.size > 0) {
      const logoError = validateLogo(logo);
      if (logoError) {
        return NextResponse.json({ error: logoError }, { status: 400 });
      }
      try {
        logoUrl = await uploadLogo(logo);
      } catch {
        return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
      }
    }

    // Get existing slugs to generate unique slug
    const { data: existingSlugs } = await supabaseAdmin
      .from('companies')
      .select('slug');

    const slug = generateUniqueSlug(name, (existingSlugs || []).map(s => s.slug));

    // Generate embedding
    const embedding = await generateCompanyEmbedding(
      name,
      description,
      derived_capabilities,
      domain_verticals,
      ai_infrastructure,
      ai_platform
    );

    // Insert company with status 'approved' (admin-created)
    const { data: company, error: insertError } = await supabaseAdmin
      .from('companies')
      .insert({
        name,
        slug,
        website: website || null,
        description,
        logo: logoUrl,
        derived_capabilities,
        domain_verticals,
        hq_country,
        hq_region: hq_region || null,
        ai_infrastructure,
        ai_platform,
        status: 'approved',
        embedding: JSON.stringify(embedding),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
    }

    // Insert products if provided
    if (products.length > 0 && company) {
      await insertProducts(company.id, products, name);
    }

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error('Create company error:', error);
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const companyId = searchParams.get('companyId');

  if (!companyId) {
    return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('companies')
    .delete()
    .eq('id', companyId);

  if (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Company deleted' });
}
