import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getCompanyById } from '@/lib/search';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const company = await getCompanyById(params.id);

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  return NextResponse.json(company);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const company = await getCompanyById(params.id);

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  // Only the user who submitted the company can edit it
  if (company.submitted_by !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Create an edit request for admin approval
    const { data: edit, error } = await supabaseAdmin
      .from('company_edits')
      .insert({
        company_id: params.id,
        proposed_data: body,
        submitted_by: session.user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Edit request error:', error);
      return NextResponse.json({ error: 'Failed to submit edit request' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Edit request submitted for approval',
      edit,
    });
  } catch (error) {
    console.error('Edit error:', error);
    return NextResponse.json({ error: 'Failed to process edit request' }, { status: 500 });
  }
}
