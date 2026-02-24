-- Migration: Add products table and search function
-- Date: 2026-02-01

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_embedding ON products USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_products_fts ON products USING GIN(to_tsvector('english', name || ' ' || description));

-- Trigger for products updated_at
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function for hybrid search including products
CREATE OR REPLACE FUNCTION search_companies_with_products(
  query_embedding VECTOR(1536),
  search_query TEXT DEFAULT NULL,
  filter_category TEXT DEFAULT NULL,
  filter_tags TEXT[] DEFAULT NULL,
  filter_industries TEXT[] DEFAULT NULL,
  filter_country TEXT DEFAULT NULL,
  result_limit INTEGER DEFAULT 10,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  slug VARCHAR,
  website VARCHAR,
  description TEXT,
  logo_url VARCHAR,
  category VARCHAR,
  tags TEXT[],
  industries TEXT[],
  country VARCHAR,
  status VARCHAR,
  submitted_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  semantic_rank INTEGER,
  keyword_rank INTEGER,
  combined_score FLOAT,
  matching_product_id UUID,
  matching_product_name VARCHAR,
  matching_product_description TEXT
) AS $$
WITH company_semantic_results AS (
  SELECT
    c.id,
    ROW_NUMBER() OVER (ORDER BY c.embedding <=> query_embedding) as rank
  FROM companies c
  WHERE c.status = 'approved'
    AND (filter_category IS NULL OR c.category = filter_category)
    AND (filter_tags IS NULL OR c.tags && filter_tags)
    AND (filter_industries IS NULL OR c.industries && filter_industries)
    AND (filter_country IS NULL OR c.country = filter_country)
    AND c.embedding IS NOT NULL
  LIMIT 30
),
company_keyword_results AS (
  SELECT
    c.id,
    ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', c.name || ' ' || c.description), plainto_tsquery('english', COALESCE(search_query, ''))) DESC) as rank
  FROM companies c
  WHERE c.status = 'approved'
    AND (filter_category IS NULL OR c.category = filter_category)
    AND (filter_tags IS NULL OR c.tags && filter_tags)
    AND (filter_industries IS NULL OR c.industries && filter_industries)
    AND (filter_country IS NULL OR c.country = filter_country)
    AND (search_query IS NULL OR search_query = '' OR to_tsvector('english', c.name || ' ' || c.description) @@ plainto_tsquery('english', search_query))
  LIMIT 30
),
product_semantic_results AS (
  SELECT
    p.id as product_id,
    p.company_id,
    p.name as product_name,
    p.description as product_description,
    ROW_NUMBER() OVER (ORDER BY p.embedding <=> query_embedding) as rank
  FROM products p
  JOIN companies c ON c.id = p.company_id
  WHERE c.status = 'approved'
    AND (filter_category IS NULL OR c.category = filter_category)
    AND (filter_tags IS NULL OR c.tags && filter_tags)
    AND (filter_industries IS NULL OR c.industries && filter_industries)
    AND (filter_country IS NULL OR c.country = filter_country)
    AND p.embedding IS NOT NULL
  LIMIT 30
),
product_keyword_results AS (
  SELECT
    p.id as product_id,
    p.company_id,
    p.name as product_name,
    p.description as product_description,
    ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', p.name || ' ' || p.description), plainto_tsquery('english', COALESCE(search_query, ''))) DESC) as rank
  FROM products p
  JOIN companies c ON c.id = p.company_id
  WHERE c.status = 'approved'
    AND (filter_category IS NULL OR c.category = filter_category)
    AND (filter_tags IS NULL OR c.tags && filter_tags)
    AND (filter_industries IS NULL OR c.industries && filter_industries)
    AND (filter_country IS NULL OR c.country = filter_country)
    AND (search_query IS NULL OR search_query = '' OR to_tsvector('english', p.name || ' ' || p.description) @@ plainto_tsquery('english', search_query))
  LIMIT 30
),
-- Combine company results with RRF
company_combined AS (
  SELECT
    COALESCE(cs.id, ck.id) as id,
    cs.rank as semantic_rank,
    ck.rank as keyword_rank,
    COALESCE(1.0 / (60 + cs.rank), 0) + COALESCE(1.0 / (60 + ck.rank), 0) as rrf_score,
    NULL::UUID as matching_product_id,
    NULL::VARCHAR as matching_product_name,
    NULL::TEXT as matching_product_description
  FROM company_semantic_results cs
  FULL OUTER JOIN company_keyword_results ck ON cs.id = ck.id
),
-- Combine product results with RRF, group by company (take best product match)
product_combined AS (
  SELECT DISTINCT ON (company_id)
    company_id as id,
    COALESCE(ps.rank, 999) as semantic_rank,
    COALESCE(pk.rank, 999) as keyword_rank,
    COALESCE(1.0 / (60 + ps.rank), 0) + COALESCE(1.0 / (60 + pk.rank), 0) as rrf_score,
    COALESCE(ps.product_id, pk.product_id) as matching_product_id,
    COALESCE(ps.product_name, pk.product_name) as matching_product_name,
    COALESCE(ps.product_description, pk.product_description) as matching_product_description
  FROM product_semantic_results ps
  FULL OUTER JOIN product_keyword_results pk
    ON ps.product_id = pk.product_id
  WHERE COALESCE(ps.company_id, pk.company_id) IS NOT NULL
  ORDER BY company_id,
    COALESCE(1.0 / (60 + ps.rank), 0) + COALESCE(1.0 / (60 + pk.rank), 0) DESC
),
-- Union and deduplicate: if company appears in both, take higher score and include product info
all_results AS (
  SELECT
    id,
    semantic_rank,
    keyword_rank,
    rrf_score,
    matching_product_id,
    matching_product_name,
    matching_product_description,
    ROW_NUMBER() OVER (PARTITION BY id ORDER BY rrf_score DESC) as rn
  FROM (
    SELECT * FROM company_combined
    UNION ALL
    SELECT * FROM product_combined
  ) combined
)
SELECT
  c.id,
  c.name,
  c.slug,
  c.website,
  c.description,
  c.logo_url,
  c.category,
  c.tags,
  c.industries,
  c.country,
  c.status,
  c.submitted_by,
  c.created_at,
  c.updated_at,
  COALESCE(ar.semantic_rank, 0)::INTEGER,
  COALESCE(ar.keyword_rank, 0)::INTEGER,
  ar.rrf_score,
  ar.matching_product_id,
  ar.matching_product_name,
  ar.matching_product_description
FROM all_results ar
JOIN companies c ON c.id = ar.id
WHERE ar.rn = 1
ORDER BY ar.rrf_score DESC
LIMIT result_limit
OFFSET result_offset;
$$ LANGUAGE SQL;
