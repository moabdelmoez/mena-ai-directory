import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';
import { createCompany, CreateCompanyError } from '@/lib/company-service';
import { COMPANY_COLUMNS } from '@/lib/company-repository';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  // Only allow fetching approved companies from the public API.
  // Admin endpoints have their own routes for accessing other statuses.
  const status = 'approved';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('companies')
    .select(COMPANY_COLUMNS, { count: 'exact' })
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

    const { company, warnings } = await createCompany({
      formData,
      submittedBy: session.user.id,
      autoApprove: false,
    });

    return NextResponse.json(
      { ...company, ...(warnings.length > 0 ? { warnings } : {}) },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof CreateCompanyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
