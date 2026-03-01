import { supabaseAdmin } from './supabase';
import { generateEmbedding } from './openai';
import { Company, Product, SearchFilters, PaginatedResponse, MatchingProduct } from '@/types';

// Explicit column lists to exclude embedding vectors (1536-dim, ~6KB per row)
const COMPANY_COLUMNS = 'id, company_id, name, slug, company_url, linkedin_profile, description, logo, logo_bg, hq_country, status, submitted_by, created_at, updated_at';
const COMPANY_WITH_RATINGS_COLUMNS = `${COMPANY_COLUMNS}, average_rating, review_count`;
const PRODUCT_COLUMNS = 'id, product_id, company_id, name, description, product_url, created_at, updated_at';

interface SearchResultRow {
  id: string;
  company_id: string | null;
  name: string;
  slug: string;
  company_url: string | null;
  linkedin_profile: string | null;
  description: string;
  logo: string | null;
  logo_bg: string | null;
  hq_country: string;
  status: string;
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
  semantic_rank: number;
  keyword_rank: number;
  combined_score: number;
  matching_product_id: string | null;
  matching_product_name: string | null;
  matching_product_description: string | null;
}

interface CompanyWithMatchingProduct extends Company {
  matchingProduct?: MatchingProduct;
}

async function getCompanyIdsByClassification(
  tech_categories?: string[],
  industries?: string[]
): Promise<string[] | null> {
  if ((!tech_categories || tech_categories.length === 0) && (!industries || industries.length === 0)) {
    return null;
  }

  let query = supabaseAdmin
    .from('product_classification')
    .select('company_id');

  if (tech_categories && tech_categories.length > 0 && industries && industries.length > 0) {
    query = query.or(`tech_category.in.(${tech_categories.map(c => `"${c}"`).join(',')}),industry.in.(${industries.map(i => `"${i}"`).join(',')})`);
  } else if (tech_categories && tech_categories.length > 0) {
    query = query.in('tech_category', tech_categories);
  } else if (industries && industries.length > 0) {
    query = query.in('industry', industries);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('Classification filter error:', error);
    return null;
  }

  return [...new Set(data.map((r) => r.company_id).filter(Boolean) as string[])];
}

export async function hybridSearch(
  filters: SearchFilters
): Promise<PaginatedResponse<CompanyWithMatchingProduct>> {
  const { query, hq_country, tech_categories, industries, page = 1, limit = 10 } = filters;
  const offset = (page - 1) * limit;

  // Generate embedding for the query if provided
  let queryEmbedding: number[] | null = null;
  if (query && query.trim()) {
    queryEmbedding = await generateEmbedding(query);
  }

  // If no query, fall back to filtered listing
  if (!queryEmbedding) {
    return getFilteredCompanies(filters);
  }

  // Get company IDs matching classification filters
  const companyIds = await getCompanyIdsByClassification(tech_categories, industries);

  // Build count query for pagination
  let countQuery = supabaseAdmin
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');

  if (hq_country) {
    countQuery = countQuery.eq('hq_country', hq_country);
  }

  if (companyIds !== null) {
    countQuery = countQuery.in('id', companyIds);
  }

  // Run search and count queries in parallel
  const rpcParams: Record<string, unknown> = {
    query_embedding: JSON.stringify(queryEmbedding),
    search_query: query || null,
    filter_hq_country: hq_country || null,
    result_limit: limit,
    result_offset: offset,
  };

  if (companyIds !== null) {
    rpcParams.filter_company_ids = companyIds;
  }

  const [searchResult, countResult] = await Promise.all([
    supabaseAdmin.rpc('search_companies_with_products', rpcParams),
    countQuery,
  ]);

  const { data, error } = searchResult;
  const { count } = countResult;

  if (error) {
    console.error('Search error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    // Check if it's a network/connection error
    if (error.message?.includes('fetch failed') || error.message?.includes('timeout')) {
      throw new Error('Unable to connect to database. Please check your internet connection and try again.');
    }
    throw new Error('Search failed');
  }

  const results = (data as SearchResultRow[]) || [];

  const companies: CompanyWithMatchingProduct[] = results.map((row) => ({
    id: row.id,
    company_id: row.company_id,
    name: row.name,
    slug: row.slug,
    company_url: row.company_url,
    linkedin_profile: row.linkedin_profile,
    description: row.description,
    logo: row.logo,
    logo_bg: (row.logo_bg === 'white' || row.logo_bg === 'black') ? row.logo_bg : null,
    hq_country: row.hq_country as Company['hq_country'],
    status: row.status as Company['status'],
    embedding: null,
    submitted_by: row.submitted_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    matchingProduct: row.matching_product_id ? {
      id: row.matching_product_id,
      name: row.matching_product_name!,
      description: row.matching_product_description!,
    } : undefined,
  }));

  return {
    data: companies,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

async function getFilteredCompanies(
  filters: SearchFilters
): Promise<PaginatedResponse<Company>> {
  const { hq_country, tech_categories, industries, page = 1, limit = 10 } = filters;
  const offset = (page - 1) * limit;

  // Get company IDs matching classification filters
  const companyIds = await getCompanyIdsByClassification(tech_categories, industries);

  let query = supabaseAdmin
    .from('companies')
    .select(COMPANY_COLUMNS, { count: 'exact' })
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (hq_country) {
    query = query.eq('hq_country', hq_country);
  }

  if (companyIds !== null) {
    query = query.in('id', companyIds);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error('Filter error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    // Check if it's a network/connection error
    if (error.message?.includes('fetch failed') || error.message?.includes('timeout')) {
      throw new Error('Unable to connect to database. Please check your internet connection and try again.');
    }
    throw new Error('Failed to fetch companies');
  }

  return {
    data: (data || []) as Company[],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

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
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  if (!products || products.length === 0) return [];

  const productIds = products.map((p) => p.id);

  const { data: classifications } = await supabaseAdmin
    .from('product_classification')
    .select('product_id, tech_category, industry')
    .in('product_id', productIds);

  const classMap = new Map<string, { tech_category: string | null; industry: string | null }>();
  for (const c of classifications ?? []) {
    classMap.set(c.product_id, { tech_category: c.tech_category, industry: c.industry });
  }

  return products.map((p) => {
    const cls = classMap.get(p.id) ?? null;
    return {
      ...p,
      embedding: null,
      tech_category: cls?.tech_category ?? null,
      industry: cls?.industry ?? null,
    } as Product;
  });
}
