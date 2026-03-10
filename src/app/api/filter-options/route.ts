import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { MENA_COUNTRIES } from '@/constants';

export const revalidate = 300; // Revalidate every 5 minutes

export async function GET() {
  // Two focused queries instead of fetching all rows
  const [techResult, industryResult] = await Promise.all([
    supabaseAdmin
      .from('product_classification')
      .select('tech_category')
      .not('tech_category', 'is', null),
    supabaseAdmin
      .from('product_classification')
      .select('industry')
      .not('industry', 'is', null),
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
