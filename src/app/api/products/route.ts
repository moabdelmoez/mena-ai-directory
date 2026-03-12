import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateProductEmbedding } from '@/lib/openai';
import { requireAuth } from '@/lib/auth-helpers';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';
import { getCompanyById } from '@/lib/company-repository';
import { isCompanyOwner } from '@/lib/company-permissions';

export async function GET(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateLimitKey = getRateLimitKey('search', ip);
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.search);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', resetIn: rateLimit.resetIn },
      { status: 429 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const companyId = searchParams.get('company_id');

  if (!companyId) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 });
  }

  // Verify parent company exists and is approved
  const { data: company, error: companyError } = await supabaseAdmin
    .from('companies')
    .select('id, status')
    .eq('id', companyId)
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  if (company.status !== 'approved') {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  // Select specific columns to exclude embedding vectors (1536-dim)
  const productColumns = 'id, product_id, company_id, name, description, product_url, created_at, updated_at';

  const { data, error } = await supabaseAdmin
    .from('products')
    .select(productColumns)
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { admin: adminSession, userId } = auth;

  // Rate limiting for non-admin users
  if (!adminSession && userId) {
    const rateLimitKey = getRateLimitKey('registration', userId);
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.registration);

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetIn: rateLimit.resetIn },
        { status: 429 }
      );
    }
  }

  try {
    const body = await request.json();
    const { company_id, name, description, product_url } = body;

    if (!company_id || !name || !description) {
      return NextResponse.json({ error: 'company_id, name, and description are required' }, { status: 400 });
    }

    // Verify company exists and user has access
    const company = await getCompanyById(company_id);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Only company owner or admin can add products
    if (!adminSession && (!userId || !isCompanyOwner(company, userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate embedding
    const embedding = await generateProductEmbedding(name, description, company.name);

    // Insert product
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .insert({
        company_id,
        name,
        description,
        product_url: product_url || null,
        embedding: JSON.stringify(embedding),
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Product creation error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
