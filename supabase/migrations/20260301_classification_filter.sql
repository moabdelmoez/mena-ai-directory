-- Add filter_company_ids parameter to search_companies_with_products
-- This enables pre-filtering by classification (tech_category / industry)
-- without breaking pagination.

-- Drop existing function first (cannot ALTER to add params)
DROP FUNCTION IF EXISTS search_companies_with_products(VECTOR(1536), TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION search_companies_with_products(
  query_embedding VECTOR(1536),
  search_query TEXT DEFAULT NULL,
  filter_hq_country TEXT DEFAULT NULL,
  result_limit INTEGER DEFAULT 10,
  result_offset INTEGER DEFAULT 0,
  filter_company_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID, company_id VARCHAR, name VARCHAR, slug VARCHAR,
  company_url VARCHAR, linkedin_profile VARCHAR,
  description TEXT, logo VARCHAR,
  hq_country VARCHAR, status VARCHAR, submitted_by UUID,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  semantic_rank INTEGER, keyword_rank INTEGER, combined_score FLOAT,
  matching_product_id UUID, matching_product_name VARCHAR, matching_product_description TEXT
) AS $$
WITH company_semantic_results AS (
  SELECT c.id, ROW_NUMBER() OVER (ORDER BY c.embedding <=> query_embedding) as rank
  FROM companies c WHERE c.status = 'approved'
    AND (filter_hq_country IS NULL OR c.hq_country = filter_hq_country)
    AND (filter_company_ids IS NULL OR c.id = ANY(filter_company_ids))
    AND c.embedding IS NOT NULL LIMIT 30
),
company_keyword_results AS (
  SELECT c.id, ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', c.name || ' ' || c.description), plainto_tsquery('english', COALESCE(search_query, ''))) DESC) as rank
  FROM companies c WHERE c.status = 'approved'
    AND (filter_hq_country IS NULL OR c.hq_country = filter_hq_country)
    AND (filter_company_ids IS NULL OR c.id = ANY(filter_company_ids))
    AND (search_query IS NULL OR search_query = '' OR to_tsvector('english', c.name || ' ' || c.description) @@ plainto_tsquery('english', search_query)) LIMIT 30
),
product_semantic_results AS (
  SELECT p.id as product_id, p.company_id, p.name as product_name, p.description as product_description,
    ROW_NUMBER() OVER (ORDER BY p.embedding <=> query_embedding) as rank
  FROM products p JOIN companies c ON c.id = p.company_id WHERE c.status = 'approved'
    AND (filter_hq_country IS NULL OR c.hq_country = filter_hq_country)
    AND (filter_company_ids IS NULL OR c.id = ANY(filter_company_ids))
    AND p.embedding IS NOT NULL LIMIT 30
),
product_keyword_results AS (
  SELECT p.id as product_id, p.company_id, p.name as product_name, p.description as product_description,
    ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', p.name || ' ' || p.description), plainto_tsquery('english', COALESCE(search_query, ''))) DESC) as rank
  FROM products p JOIN companies c ON c.id = p.company_id WHERE c.status = 'approved'
    AND (filter_hq_country IS NULL OR c.hq_country = filter_hq_country)
    AND (filter_company_ids IS NULL OR c.id = ANY(filter_company_ids))
    AND (search_query IS NULL OR search_query = '' OR to_tsvector('english', p.name || ' ' || p.description) @@ plainto_tsquery('english', search_query)) LIMIT 30
),
company_combined AS (
  SELECT COALESCE(cs.id, ck.id) as id, cs.rank as semantic_rank, ck.rank as keyword_rank,
    COALESCE(1.0 / (60 + cs.rank), 0) + COALESCE(1.0 / (60 + ck.rank), 0) as rrf_score,
    NULL::UUID as matching_product_id, NULL::VARCHAR as matching_product_name, NULL::TEXT as matching_product_description
  FROM company_semantic_results cs FULL OUTER JOIN company_keyword_results ck ON cs.id = ck.id
),
product_combined AS (
  SELECT DISTINCT ON (COALESCE(ps.company_id, pk.company_id)) COALESCE(ps.company_id, pk.company_id) as id, COALESCE(ps.rank, 999) as semantic_rank, COALESCE(pk.rank, 999) as keyword_rank,
    COALESCE(1.0 / (60 + ps.rank), 0) + COALESCE(1.0 / (60 + pk.rank), 0) as rrf_score,
    COALESCE(ps.product_id, pk.product_id) as matching_product_id,
    COALESCE(ps.product_name, pk.product_name) as matching_product_name,
    COALESCE(ps.product_description, pk.product_description) as matching_product_description
  FROM product_semantic_results ps FULL OUTER JOIN product_keyword_results pk ON ps.product_id = pk.product_id
  WHERE COALESCE(ps.company_id, pk.company_id) IS NOT NULL
  ORDER BY COALESCE(ps.company_id, pk.company_id), COALESCE(1.0 / (60 + ps.rank), 0) + COALESCE(1.0 / (60 + pk.rank), 0) DESC
),
all_results AS (
  SELECT id, semantic_rank, keyword_rank, rrf_score,
    matching_product_id, matching_product_name, matching_product_description,
    ROW_NUMBER() OVER (PARTITION BY id ORDER BY rrf_score DESC) as rn
  FROM (SELECT * FROM company_combined UNION ALL SELECT * FROM product_combined) combined
)
SELECT c.id, c.company_id, c.name, c.slug, c.company_url, c.linkedin_profile, c.description, c.logo,
  c.hq_country, c.status, c.submitted_by, c.created_at, c.updated_at,
  COALESCE(ar.semantic_rank, 0)::INTEGER,
  COALESCE(ar.keyword_rank, 0)::INTEGER, ar.rrf_score,
  ar.matching_product_id, ar.matching_product_name, ar.matching_product_description
FROM all_results ar JOIN companies c ON c.id = ar.id WHERE ar.rn = 1
ORDER BY ar.rrf_score DESC LIMIT result_limit OFFSET result_offset;
$$ LANGUAGE SQL;
