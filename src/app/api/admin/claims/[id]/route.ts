import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdmin(request);

  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the claim to find the company
    const { data: claim, error: claimError } = await supabaseAdmin
      .from('company_claims')
      .select('company_id')
      .eq('id', id)
      .single();

    if (claimError || !claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    // Revoke the claim
    const { error: updateClaimError } = await supabaseAdmin
      .from('company_claims')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateClaimError) {
      console.error('Claim revoke error:', updateClaimError);
      return NextResponse.json({ error: 'Failed to revoke claim' }, { status: 500 });
    }

    // Clear claimed_by on the company
    const { error: updateCompanyError } = await supabaseAdmin
      .from('companies')
      .update({ claimed_by: null })
      .eq('id', claim.company_id);

    if (updateCompanyError) {
      console.error('Company update error:', updateCompanyError);
      return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Claim revoked successfully' });
  } catch (error) {
    console.error('Claim revoke error:', error);
    return NextResponse.json({ error: 'Failed to revoke claim' }, { status: 500 });
  }
}
