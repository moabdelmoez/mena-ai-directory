import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { MENA_COUNTRIES } from '@/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Revalidate every 5 minutes

export async function GET() {
  // Only surface values attached to approved companies. New values introduced
  // on pending registrations stay hidden until the company is approved.
  const [techResult, industryResult] = await Promise.all([
    supabaseAdmin
      .from('product_classification')
      .select('tech_category, companies!inner(status)')
      .not('tech_category', 'is', null)
      .eq('companies.status', 'approved'),
    supabaseAdmin
      .from('product_classification')
      .select('industry, companies!inner(status)')
      .not('industry', 'is', null)
      .eq('companies.status', 'approved'),
  ]);

  const tech_categories = [...new Set(
    (techResult.data || []).map((r) => r.tech_category) as string[]
  )].sort((a, b) => a.localeCompare(b));

  const industries = [...new Set(
    (industryResult.data || []).map((r) => r.industry) as string[]
  )].sort((a, b) => a.localeCompare(b));

  return NextResponse.json(
    { tech_categories, industries, countries: MENA_COUNTRIES },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  );
}
