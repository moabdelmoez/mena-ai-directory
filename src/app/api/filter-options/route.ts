import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { MENA_COUNTRIES } from '@/constants';

export const revalidate = 300; // Revalidate every 5 minutes

export async function GET() {
  const { data } = await supabaseAdmin
    .from('product_classification')
    .select('tech_category, industry');

  const tech_categories = [...new Set(
    (data || []).map((r) => r.tech_category).filter(Boolean) as string[]
  )].sort((a, b) => a.localeCompare(b));

  const industries = [...new Set(
    (data || []).map((r) => r.industry).filter(Boolean) as string[]
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
