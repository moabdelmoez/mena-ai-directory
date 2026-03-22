import { supabaseAdmin } from './supabase';
import { generateEmbedding } from './openai';
import { Company, SearchFilters, PaginatedResponse, MatchingProduct } from '@/types';
import { COMPANY_COLUMNS } from './company-repository';
import { parseSearchQuery } from './query-parser';
import { getCachedEmbedding, setCachedEmbedding } from './embedding-cache';

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
  claimed_by: string | null;
  created_at: string;
  updated_at: string;
  semantic_rank: number;
  keyword_rank: number;
  combined_score: number;
  matching_product_id: string | null;
  matching_product_name: string | null;
  matching_product_description: string | null;
  total_count: number;
}

interface CompanyWithMatchingProduct extends Company {
  matchingProduct?: MatchingProduct;
}

// Sanitize values before PostgREST interpolation to prevent injection
const sanitize = (v: string) => v.replace(/["(),.]/g, '');

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
    const sanitizedTechCategories = tech_categories
      .map(c => `"${sanitize(c)}"`)
      .join(',');
    const sanitizedIndustries = industries
      .map(i => `"${sanitize(i)}"`)
      .join(',');
    const orFilter = `tech_category.in.(${sanitizedTechCategories}),industry.in.(${sanitizedIndustries})`;
    query = query.or(orFilter);
  } else if (tech_categories && tech_categories.length > 0) {
    query = query.in('tech_category', tech_categories.map(sanitize));
  } else if (industries && industries.length > 0) {
    query = query.in('industry', industries.map(sanitize));
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

  // Parse natural language query to extract structured filters
  const rawQuery = query?.trim() || '';
  let effectiveCountry = hq_country;
  let effectiveTechCategories = tech_categories;
  let effectiveIndustries = industries;

  if (rawQuery) {
    const parsed = parseSearchQuery(rawQuery);
    // Extracted filters only apply when user hasn't set explicit ones
    if (!effectiveCountry && parsed.extractedCountry) effectiveCountry = parsed.extractedCountry;
    if ((!effectiveTechCategories?.length) && parsed.extractedTechCategories.length > 0) effectiveTechCategories = parsed.extractedTechCategories;
    if ((!effectiveIndustries?.length) && parsed.extractedIndustries.length > 0) effectiveIndustries = parsed.extractedIndustries;
  }

  // Generate embedding from the raw query to preserve full semantic context
  // (cleaned query is used for keyword search to avoid double-matching on filter terms)
  let queryEmbedding: number[] | null = null;
  if (rawQuery) {
    queryEmbedding = getCachedEmbedding(rawQuery);
    if (!queryEmbedding) {
      queryEmbedding = await generateEmbedding(rawQuery);
      if (queryEmbedding) {
        setCachedEmbedding(rawQuery, queryEmbedding);
      }
    }
  }

  // If no query text remains, fall back to filtered listing with extracted filters
  if (!queryEmbedding) {
    return getFilteredCompanies({
      hq_country: effectiveCountry,
      tech_categories: effectiveTechCategories,
      industries: effectiveIndustries,
      page,
      limit,
    });
  }

  // Get company IDs matching classification filters
  const companyIds = await getCompanyIdsByClassification(effectiveTechCategories, effectiveIndustries);

  // Run search RPC (total_count is included in each result row via COUNT(*) OVER())
  const rpcParams: Record<string, unknown> = {
    query_embedding: JSON.stringify(queryEmbedding),
    search_query: rawQuery || null,
    filter_hq_country: effectiveCountry || null,
    result_limit: limit,
    result_offset: offset,
    filter_tech_categories: effectiveTechCategories?.length ? effectiveTechCategories : null,
    filter_industries: effectiveIndustries?.length ? effectiveIndustries : null,
  };

  if (companyIds !== null) {
    rpcParams.filter_company_ids = companyIds;
  }

  const { data, error } = await supabaseAdmin.rpc('search_companies_with_products', rpcParams);

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
  const total = results.length > 0 ? results[0].total_count : 0;

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
    claimed_by: row.claimed_by ?? null,
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
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function getFilteredCompanies(
  filters: SearchFilters
): Promise<PaginatedResponse<CompanyWithMatchingProduct>> {
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

  const companies = (data || []) as Company[];
  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  // Fetch matching products when classification filters are active
  if (companyIds !== null && companies.length > 0) {
    const returnedIds = companies.map(c => c.id);

    let prodQuery = supabaseAdmin
      .from('product_classification')
      .select('company_id, product_id, products!inner(id, name, description)')
      .in('company_id', returnedIds);

    const formatForQuery = (values: string[]) => values.map(sanitize).map(v => `"${v}"`).join(',');

    if (tech_categories?.length && industries?.length) {
      const orQuery = `tech_category.in.(${formatForQuery(tech_categories)}),industry.in.(${formatForQuery(industries)})`;
      prodQuery = prodQuery.or(orQuery);
    } else if (tech_categories?.length) {
      prodQuery = prodQuery.in('tech_category', tech_categories.map(sanitize));
    } else if (industries?.length) {
      prodQuery = prodQuery.in('industry', industries.map(sanitize));
    }

    const { data: classData } = await prodQuery;

    // Build map: company_id → first matching product
    const productMap = new Map<string, MatchingProduct>();
    for (const row of classData || []) {
      if (!productMap.has(row.company_id) && row.products) {
        const p = row.products as unknown as { id: string; name: string; description: string };
        productMap.set(row.company_id, { id: p.id, name: p.name, description: p.description });
      }
    }

    const companiesWithProducts: CompanyWithMatchingProduct[] = companies.map(c => ({
      ...c,
      matchingProduct: productMap.get(c.id),
    }));

    return { data: companiesWithProducts, total, page, limit, totalPages };
  }

  return { data: companies, total, page, limit, totalPages };
}
