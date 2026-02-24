import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const revalidate = 300; // Revalidate every 5 minutes

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Fetch unique derived_capabilities from approved companies
    const { data: capabilitiesData, error: capabilitiesError } = await supabase
      .from('companies')
      .select('derived_capabilities')
      .eq('status', 'approved')
      .not('derived_capabilities', 'is', null);

    if (capabilitiesError) {
      throw capabilitiesError;
    }

    // Fetch unique domain_verticals from approved companies
    const { data: verticalsData, error: verticalsError } = await supabase
      .from('companies')
      .select('domain_verticals')
      .eq('status', 'approved')
      .not('domain_verticals', 'is', null);

    if (verticalsError) {
      throw verticalsError;
    }

    // Extract and dedupe capabilities from all companies
    const capabilitiesSet = new Set<string>();
    for (const company of capabilitiesData || []) {
      if (Array.isArray(company.derived_capabilities)) {
        for (const cap of company.derived_capabilities) {
          if (cap) capabilitiesSet.add(cap);
        }
      }
    }

    // Extract and dedupe verticals from all companies
    const verticalsSet = new Set<string>();
    for (const company of verticalsData || []) {
      if (Array.isArray(company.domain_verticals)) {
        for (const vert of company.domain_verticals) {
          if (vert) verticalsSet.add(vert);
        }
      }
    }

    // Sort alphabetically
    const capabilities = Array.from(capabilitiesSet).sort();
    const verticals = Array.from(verticalsSet).sort();

    return NextResponse.json({
      capabilities,
      verticals,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
}
