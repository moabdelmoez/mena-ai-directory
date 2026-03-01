-- Schema Restructure: Remove scraper/classification fields, add company_url/linkedin, create product_classification table

-- Step 1: Drop dependent view
DROP VIEW IF EXISTS companies_with_ratings;

-- Step 2: Drop dependent functions
DROP FUNCTION IF EXISTS search_companies(VECTOR(1536), TEXT, TEXT[], TEXT[], TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS search_companies_with_products(VECTOR(1536), TEXT, TEXT[], TEXT[], TEXT, INTEGER, INTEGER);

-- Step 3: Alter companies table
ALTER TABLE companies
  DROP COLUMN IF EXISTS derived_capabilities,
  DROP COLUMN IF EXISTS domain_verticals,
  DROP COLUMN IF EXISTS hq_region,
  DROP COLUMN IF EXISTS ai_infrastructure,
  DROP COLUMN IF EXISTS ai_platform,
  DROP COLUMN IF EXISTS scrape_confidence,
  DROP COLUMN IF EXISTS website,
  ADD COLUMN IF NOT EXISTS company_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS linkedin_profile VARCHAR(500);

-- Step 4: Alter products table
ALTER TABLE products
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS capabilities,
  DROP COLUMN IF EXISTS use_cases,
  DROP COLUMN IF EXISTS target_customers,
  DROP COLUMN IF EXISTS deployment,
  DROP COLUMN IF EXISTS maturity,
  DROP COLUMN IF EXISTS pricing_model,
  DROP COLUMN IF EXISTS confidence,
  DROP COLUMN IF EXISTS sources,
  ADD COLUMN IF NOT EXISTS product_url VARCHAR(500);

-- Step 5: Create product_classification table
CREATE TABLE IF NOT EXISTS product_classification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tech_category VARCHAR(100),
  industry VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_classification_product
  ON product_classification(product_id);

-- Step 6: Recreate companies_with_ratings view
CREATE VIEW companies_with_ratings AS
SELECT
  c.*,
  COALESCE(AVG(r.rating), 0) AS average_rating,
  COUNT(r.id) AS review_count
FROM companies c
LEFT JOIN reviews r ON c.id = r.company_id
GROUP BY c.id;

-- Step 7: Recreate search functions (without removed filter params)

CREATE OR REPLACE FUNCTION search_companies(
  query_embedding VECTOR(1536),
  search_query TEXT DEFAULT NULL,
  filter_hq_country TEXT DEFAULT NULL,
  result_limit INTEGER DEFAULT 10,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  company_id VARCHAR,
  name VARCHAR,
  slug VARCHAR,
  company_url VARCHAR,
  linkedin_profile VARCHAR,
  description TEXT,
  logo VARCHAR,
  hq_country VARCHAR,
  status VARCHAR,
  submitted_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  semantic_rank INTEGER,
  keyword_rank INTEGER,
  combined_score FLOAT
) AS $$
WITH semantic_results AS (
  SELECT c.id, ROW_NUMBER() OVER (ORDER BY c.embedding <=> query_embedding) as rank
  FROM companies c
  WHERE c.status = 'approved'
    AND (filter_hq_country IS NULL OR c.hq_country = filter_hq_country)
    AND c.embedding IS NOT NULL
  LIMIT 20
),
keyword_results AS (
  SELECT c.id, ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', c.name || ' ' || c.description), plainto_tsquery('english', COALESCE(search_query, ''))) DESC) as rank
  FROM companies c
  WHERE c.status = 'approved'
    AND (filter_hq_country IS NULL OR c.hq_country = filter_hq_country)
    AND (search_query IS NULL OR search_query = '' OR to_tsvector('english', c.name || ' ' || c.description) @@ plainto_tsquery('english', search_query))
  LIMIT 20
),
combined AS (
  SELECT COALESCE(s.id, k.id) as id, s.rank as semantic_rank, k.rank as keyword_rank,
    COALESCE(1.0 / (60 + s.rank), 0) + COALESCE(1.0 / (60 + k.rank), 0) as rrf_score
  FROM semantic_results s FULL OUTER JOIN keyword_results k ON s.id = k.id
)
SELECT c.id, c.company_id, c.name, c.slug, c.company_url, c.linkedin_profile, c.description, c.logo,
  c.hq_country, c.status, c.submitted_by, c.created_at, c.updated_at,
  COALESCE(combined.semantic_rank, 0)::INTEGER,
  COALESCE(combined.keyword_rank, 0)::INTEGER, combined.rrf_score
FROM combined JOIN companies c ON c.id = combined.id
ORDER BY combined.rrf_score DESC LIMIT result_limit OFFSET result_offset;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION search_companies_with_products(
  query_embedding VECTOR(1536),
  search_query TEXT DEFAULT NULL,
  filter_hq_country TEXT DEFAULT NULL,
  result_limit INTEGER DEFAULT 10,
  result_offset INTEGER DEFAULT 0
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
    AND c.embedding IS NOT NULL LIMIT 30
),
company_keyword_results AS (
  SELECT c.id, ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', c.name || ' ' || c.description), plainto_tsquery('english', COALESCE(search_query, ''))) DESC) as rank
  FROM companies c WHERE c.status = 'approved'
    AND (filter_hq_country IS NULL OR c.hq_country = filter_hq_country)
    AND (search_query IS NULL OR search_query = '' OR to_tsvector('english', c.name || ' ' || c.description) @@ plainto_tsquery('english', search_query)) LIMIT 30
),
product_semantic_results AS (
  SELECT p.id as product_id, p.company_id, p.name as product_name, p.description as product_description,
    ROW_NUMBER() OVER (ORDER BY p.embedding <=> query_embedding) as rank
  FROM products p JOIN companies c ON c.id = p.company_id WHERE c.status = 'approved'
    AND (filter_hq_country IS NULL OR c.hq_country = filter_hq_country)
    AND p.embedding IS NOT NULL LIMIT 30
),
product_keyword_results AS (
  SELECT p.id as product_id, p.company_id, p.name as product_name, p.description as product_description,
    ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', p.name || ' ' || p.description), plainto_tsquery('english', COALESCE(search_query, ''))) DESC) as rank
  FROM products p JOIN companies c ON c.id = p.company_id WHERE c.status = 'approved'
    AND (filter_hq_country IS NULL OR c.hq_country = filter_hq_country)
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
