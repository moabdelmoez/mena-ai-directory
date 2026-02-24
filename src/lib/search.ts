import { supabaseAdmin } from './supabase';
import { generateEmbedding } from './openai';
import { Company, Product, SearchFilters, PaginatedResponse, MatchingProduct } from '@/types';

// Explicit column lists to exclude embedding vectors (1536-dim, ~6KB per row)
const COMPANY_COLUMNS = 'id, company_id, name, slug, website, description, logo, derived_capabilities, domain_verticals, hq_country, hq_region, ai_infrastructure, ai_platform, scrape_confidence, status, submitted_by, created_at, updated_at';
const COMPANY_WITH_RATINGS_COLUMNS = `${COMPANY_COLUMNS}, average_rating, review_count`;
const PRODUCT_COLUMNS = 'id, product_id, company_id, name, description, category, capabilities, use_cases, target_customers, deployment, maturity, pricing_model, confidence, sources, created_at, updated_at';

interface SearchResultRow {
  id: string;
  company_id: string | null;
  name: string;
  slug: string;
  website: string;
  description: string;
  logo: string | null;
  derived_capabilities: string[];
  domain_verticals: string[];
  hq_country: string;
  hq_region: string | null;
  ai_infrastructure: boolean;
  ai_platform: boolean;
  scrape_confidence: number | null;
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

export async function hybridSearch(
  filters: SearchFilters
): Promise<PaginatedResponse<CompanyWithMatchingProduct>> {
  const { query, derived_capabilities, domain_verticals, hq_country, page = 1, limit = 10 } = filters;
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

  // Use the hybrid search function that includes products
  // Build count query for pagination
  let countQuery = supabaseAdmin
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');

  if (derived_capabilities && derived_capabilities.length > 0) {
    countQuery = countQuery.overlaps('derived_capabilities', derived_capabilities);
  }

  if (domain_verticals && domain_verticals.length > 0) {
    countQuery = countQuery.overlaps('domain_verticals', domain_verticals);
  }

  if (hq_country) {
    countQuery = countQuery.eq('hq_country', hq_country);
  }

  // Run search and count queries in parallel
  const [searchResult, countResult] = await Promise.all([
    supabaseAdmin.rpc('search_companies_with_products', {
      query_embedding: JSON.stringify(queryEmbedding),
      search_query: query || null,
      filter_derived_capabilities: derived_capabilities && derived_capabilities.length > 0 ? derived_capabilities : null,
      filter_domain_verticals: domain_verticals && domain_verticals.length > 0 ? domain_verticals : null,
      filter_hq_country: hq_country || null,
      result_limit: limit,
      result_offset: offset,
    }),
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
    website: row.website,
    description: row.description,
    logo: row.logo,
    derived_capabilities: row.derived_capabilities as Company['derived_capabilities'],
    domain_verticals: row.domain_verticals as Company['domain_verticals'],
    hq_country: row.hq_country as Company['hq_country'],
    hq_region: row.hq_region,
    ai_infrastructure: row.ai_infrastructure,
    ai_platform: row.ai_platform,
    scrape_confidence: row.scrape_confidence,
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
  const { derived_capabilities, domain_verticals, hq_country, ai_infrastructure, ai_platform, page = 1, limit = 10 } = filters;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('companies')
    .select(COMPANY_COLUMNS, { count: 'exact' })
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (derived_capabilities && derived_capabilities.length > 0) {
    query = query.overlaps('derived_capabilities', derived_capabilities);
  }

  if (domain_verticals && domain_verticals.length > 0) {
    query = query.overlaps('domain_verticals', domain_verticals);
  }

  if (hq_country) {
    query = query.eq('hq_country', hq_country);
  }

  if (ai_infrastructure !== undefined) {
    query = query.eq('ai_infrastructure', ai_infrastructure);
  }

  if (ai_platform !== undefined) {
    query = query.eq('ai_platform', ai_platform);
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
  const { data, error } = await supabaseAdmin
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return (data || []) as Product[];
}
