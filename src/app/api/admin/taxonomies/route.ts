import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';

type TaxonomyType = 'tech_category' | 'industry';

function isTaxonomyType(v: string | null): v is TaxonomyType {
  return v === 'tech_category' || v === 'industry';
}

interface TaxonomyRow {
  name: string;
  approvedUsage: number;
  pendingUsage: number;
  firstPendingCompany: { id: string; name: string } | null;
}

type ClassificationJoinRow = {
  tech_category: string | null;
  industry: string | null;
  companies: { id: string; name: string; status: string } | null;
};

async function buildList(type: TaxonomyType): Promise<TaxonomyRow[]> {
  // Fetch every classification row with its company status so we can group by
  // the taxonomy value and split counts by approved/pending.
  const column = type;
  const { data, error } = await supabaseAdmin
    .from('product_classification')
    .select(`${column}, companies!inner(id, name, status)`)
    .not(column, 'is', null);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data || []) as unknown as ClassificationJoinRow[];
  const byName = new Map<string, TaxonomyRow>();

  for (const r of rows) {
    const value = (type === 'tech_category' ? r.tech_category : r.industry) as string | null;
    if (!value) continue;
    const company = r.companies;
    if (!company) continue;

    let entry = byName.get(value);
    if (!entry) {
      entry = { name: value, approvedUsage: 0, pendingUsage: 0, firstPendingCompany: null };
      byName.set(value, entry);
    }
    if (company.status === 'approved') {
      entry.approvedUsage += 1;
    } else if (company.status === 'pending') {
      entry.pendingUsage += 1;
      if (!entry.firstPendingCompany) {
        entry.firstPendingCompany = { id: company.id, name: company.name };
      }
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = checkRateLimit(getRateLimitKey('admin', session.adminId), RATE_LIMITS.admin);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const type = request.nextUrl.searchParams.get('type');
  if (!isTaxonomyType(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  try {
    const rows = await buildList(type);
    return NextResponse.json({ rows });
  } catch (err) {
    console.error('Taxonomies GET error:', err);
    return NextResponse.json({ error: 'Failed to load taxonomies' }, { status: 500 });
  }
}

interface PatchBody {
  type?: string;
  from?: string;
  to?: string;
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = checkRateLimit(getRateLimitKey('admin', session.adminId), RATE_LIMITS.admin);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isTaxonomyType(body.type ?? null)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }
  const type = body.type as TaxonomyType;
  const from = (body.from ?? '').trim();
  const to = (body.to ?? '').trim();

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to are required' }, { status: 400 });
  }

  if (from === to) {
    return NextResponse.json({ rows: await buildList(type) });
  }

  // Cascade rename across all rows using the old value. If `to` already exists
  // with different casing, this effectively merges the two.
  const { error } = await supabaseAdmin
    .from('product_classification')
    .update({ [type]: to })
    .eq(type, from);

  if (error) {
    console.error('Taxonomies PATCH error:', error);
    return NextResponse.json({ error: 'Failed to rename' }, { status: 500 });
  }

  return NextResponse.json({ rows: await buildList(type) });
}

interface DeleteBody {
  type?: string;
  name?: string;
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = checkRateLimit(getRateLimitKey('admin', session.adminId), RATE_LIMITS.admin);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let body: DeleteBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isTaxonomyType(body.type ?? null)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }
  const type = body.type as TaxonomyType;
  const name = (body.name ?? '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  // Block if any approved company uses it.
  const { data: approvedRows, error: checkError } = await supabaseAdmin
    .from('product_classification')
    .select(`id, companies!inner(status)`)
    .eq(type, name)
    .eq('companies.status', 'approved')
    .limit(1);

  if (checkError) {
    return NextResponse.json({ error: 'Failed to check usage' }, { status: 500 });
  }
  if (approvedRows && approvedRows.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete: in use by at least one approved company. Rename or reassign first.' },
      { status: 409 }
    );
  }

  const { error } = await supabaseAdmin
    .from('product_classification')
    .update({ [type]: null })
    .eq(type, name);

  if (error) {
    console.error('Taxonomies DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }

  return NextResponse.json({ rows: await buildList(type) });
}
