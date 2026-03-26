import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/auth';
import { getOrCreateUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { getCompanyById } from '@/lib/company-repository';
import { isCompanyOwner, canEditDirectly } from '@/lib/company-permissions';
import { MENA_COUNTRIES } from '@/constants';

const MAX_FIELD_LENGTH = 1000;
const MAX_URL_LENGTH = 2048;

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function validateProposedData(data: Record<string, unknown>): { valid: Record<string, unknown>; errors: string[] } {
  const valid: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined || value === '') {
      valid[key] = value;
      continue;
    }
    if (typeof value !== 'string') {
      errors.push(`${key} must be a string`);
      continue;
    }
    if (key === 'hq_country' && !(MENA_COUNTRIES as readonly string[]).includes(value)) {
      errors.push(`Invalid country: ${value}`);
      continue;
    }
    if ((key === 'company_url' || key === 'linkedin_profile' || key === 'logo') && value && !isValidUrl(value)) {
      errors.push(`${key} must be a valid URL`);
      continue;
    }
    if ((key === 'company_url' || key === 'linkedin_profile' || key === 'logo') && value.length > MAX_URL_LENGTH) {
      errors.push(`${key} exceeds maximum length`);
      continue;
    }
    if ((key === 'name' || key === 'description') && value.length > MAX_FIELD_LENGTH) {
      errors.push(`${key} exceeds maximum length of ${MAX_FIELD_LENGTH} characters`);
      continue;
    }
    valid[key] = value;
  }

  return { valid, errors };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const company = await getCompanyById(id);

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  return NextResponse.json(company);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const stackUser = await stackServerApp.getUser();

  if (!stackUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let userId: string;
  try {
    userId = await getOrCreateUser(stackUser);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const company = await getCompanyById(id);

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  // Check ownership (claimed_by takes precedence over submitted_by)
  if (!isCompanyOwner(company, userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Only allow editing specific fields to prevent injection of status, embedding, etc.
    const ALLOWED_EDIT_FIELDS = ['name', 'description', 'company_url', 'linkedin_profile', 'hq_country', 'logo'];
    const filtered = Object.fromEntries(
      Object.entries(body).filter(([key]) => ALLOWED_EDIT_FIELDS.includes(key))
    );

    if (Object.keys(filtered).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { valid: proposed_data, errors: validationErrors } = validateProposedData(filtered);

    if (validationErrors.length > 0) {
      return NextResponse.json({ error: validationErrors.join(', ') }, { status: 400 });
    }

    if (Object.keys(proposed_data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // If claimed owner, apply edits directly (no approval needed)
    if (canEditDirectly(company, userId)) {
      const { data: updated, error } = await supabaseAdmin
        .from('companies')
        .update({ ...proposed_data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Direct edit error:', error);
        return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Company updated successfully',
        company: updated,
      });
    }

    // Otherwise, create an edit request for admin approval
    const { data: edit, error } = await supabaseAdmin
      .from('company_edits')
      .insert({
        company_id: id,
        proposed_data,
        submitted_by: userId,
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
