import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateProductEmbedding } from '@/lib/openai';
import { requireAdmin } from '@/lib/admin-auth';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';
import { getCompanyById } from '@/lib/search';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const companyId = searchParams.get('company_id');

  if (!companyId) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 });
  }

  // Select specific columns to exclude embedding vectors (1536-dim)
  const productColumns = 'id, product_id, company_id, name, description, category, capabilities, use_cases, target_customers, deployment, maturity, pricing_model, confidence, sources, created_at, updated_at';

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
  // Check for admin session first
  const adminSession = await requireAdmin(request);

  // If not admin, check for user session
  const session = !adminSession ? await getServerSession(authOptions) : null;

  if (!adminSession && !session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session?.user?.id;

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
    const {
      company_id,
      name,
      description,
      category,
      capabilities,
      use_cases,
      target_customers,
      deployment,
      maturity,
      pricing_model
    } = body;

    if (!company_id || !name || !description) {
      return NextResponse.json({ error: 'company_id, name, and description are required' }, { status: 400 });
    }

    // Verify company exists and user has access
    const company = await getCompanyById(company_id);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Only company owner or admin can add products
    if (!adminSession && company.submitted_by !== userId) {
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
        category: category || null,
        capabilities: capabilities || [],
        use_cases: use_cases || [],
        target_customers: target_customers || [],
        deployment: deployment || [],
        maturity: maturity || null,
        pricing_model: pricing_model || null,
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
