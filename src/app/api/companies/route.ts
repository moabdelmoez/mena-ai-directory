import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCompanyEmbedding } from '@/lib/openai';
import { generateUniqueSlug } from '@/lib/utils';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';
import { MENA_COUNTRIES } from '@/constants';
import { ProductInput } from '@/types';
import { validateLogo, uploadLogo, parseAndValidateProducts, insertProducts, getFormString, getFormStringOrNull, getFormFile, getFormStringArray } from '@/lib/company-service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  // Only allow fetching approved companies from the public API.
  // Admin endpoints have their own routes for accessing other statuses.
  const status = 'approved';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);
  const offset = (page - 1) * limit;

  // Select specific columns to exclude embedding vectors (1536-dim)
  const companyColumns = 'id, company_id, name, slug, website, description, logo, derived_capabilities, domain_verticals, hq_country, hq_region, ai_infrastructure, ai_platform, scrape_confidence, status, submitted_by, created_at, updated_at';

  const { data, error, count } = await supabaseAdmin
    .from('companies')
    .select(companyColumns, { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
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

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting
  const rateLimitKey = getRateLimitKey('registration', session.user.id);
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.registration);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. You can submit up to 5 companies per hour.', resetIn: rateLimit.resetIn },
      { status: 429 }
    );
  }

  try {
    const formData = await request.formData();

    const name = getFormString(formData, 'name');
    const website = getFormString(formData, 'website');
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

    // Validation
    if (!name || !website || !description || !hq_country) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    // Insert company
    const { data: company, error: insertError } = await supabaseAdmin
      .from('companies')
      .insert({
        name,
        slug,
        website,
        description,
        logo: logoUrl,
        derived_capabilities,
        domain_verticals,
        hq_country,
        hq_region: hq_region || null,
        ai_infrastructure,
        ai_platform,
        status: 'pending',
        embedding: JSON.stringify(embedding),
        submitted_by: session.user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to register company' }, { status: 500 });
    }

    // Insert products if provided
    const warnings: string[] = [];
    if (products.length > 0 && company) {
      const productWarnings = await insertProducts(company.id, products, name);
      warnings.push(...productWarnings);
    }

    return NextResponse.json(
      { ...company, ...(warnings.length > 0 ? { warnings } : {}) },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
