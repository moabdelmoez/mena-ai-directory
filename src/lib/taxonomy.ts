import { supabaseAdmin } from './supabase';

export type TaxonomyType = 'tech_category' | 'industry';

// Returns all distinct, case-preserved values currently attached to an approved
// company. Used to canonicalize casing when a user submits a new value that
// differs only by case from something we already accept (e.g., "fintech" vs
// "Fintech").
export async function loadApprovedTaxonomies(): Promise<{
  tech_categories: string[];
  industries: string[];
}> {
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
    (techResult.data || []).map((r) => r.tech_category as string)
  )];
  const industries = [...new Set(
    (industryResult.data || []).map((r) => r.industry as string)
  )];
  return { tech_categories, industries };
}

export function canonicalize(value: string | null | undefined, approved: string[]): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = approved.find((a) => a.toLowerCase() === trimmed.toLowerCase());
  return match ?? trimmed;
}
