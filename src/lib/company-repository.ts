import { supabaseAdmin } from './supabase';
import { Company, Product } from '@/types';

// Explicit column lists to exclude embedding vectors (1536-dim, ~6KB per row)
export const COMPANY_COLUMNS = 'id, company_id, name, slug, company_url, linkedin_profile, description, logo, logo_bg, hq_country, status, submitted_by, claimed_by, created_at, updated_at';
export const COMPANY_WITH_RATINGS_COLUMNS = `${COMPANY_COLUMNS}, average_rating, review_count`;
export const PRODUCT_COLUMNS = 'id, product_id, company_id, name, description, product_url, created_at, updated_at';

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const { data, error } = await supabaseAdmin
    .from('companies_with_ratings')
    .select(COMPANY_WITH_RATINGS_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'approved')
    .single();

  if (error || !data) {
    return null;
  }

  return data as Company;
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const { data, error } = await supabaseAdmin
    .from('companies')
    .select(COMPANY_COLUMNS)
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Company;
}

export async function getCompanyProducts(companyId: string): Promise<Product[]> {
  // Single query with join to fetch products and their classifications together
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select(`${PRODUCT_COLUMNS}, product_classification(tech_category, industry)`)
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  if (!products || products.length === 0) return [];

  return products.map((p: Record<string, unknown>) => {
    const classification = p.product_classification as { tech_category: string | null; industry: string | null } | null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { product_classification: _unused, ...rest } = p;
    return {
      ...rest,
      embedding: null,
      tech_category: classification?.tech_category ?? null,
      industry: classification?.industry ?? null,
    } as Product;
  });
}
