import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';
import { createCompany, CreateCompanyError } from '@/lib/company-service';
import { COMPANY_COLUMNS } from '@/lib/company-repository';

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
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortOrder = searchParams.get('sort_order') || 'desc';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('companies')
    .select(`${COMPANY_COLUMNS}, submitted_user:users!submitted_by(name, email)`, { count: 'exact' });

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

    const { company } = await createCompany({
      formData,
      autoApprove: true,
      allowLogoBg: true,
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    if (error instanceof CreateCompanyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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
