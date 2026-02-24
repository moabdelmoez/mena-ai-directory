-- Safe Migration: Add new columns if they don't exist
-- Date: 2026-02-03
-- This migration is idempotent and can be run multiple times safely

-- ============================================
-- PHASE 0: Create products table if not exists
-- ============================================

-- Products table (must exist before we can alter it)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product base indexes
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_fts ON products USING GIN(to_tsvector('english', name || ' ' || description));

-- Trigger for products updated_at (create function if not exists first)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger to avoid errors
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PHASE 1: Add new columns (non-breaking)
-- ============================================

-- Companies table updates
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_id VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hq_region VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_infrastructure BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_platform BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS scrape_confidence FLOAT;

-- Make category column nullable (no longer required - replaced by ai_infrastructure/ai_platform)
ALTER TABLE companies ALTER COLUMN category DROP NOT NULL;

-- Handle column renames safely (check if old column exists, rename; else add new column)
DO $$
BEGIN
  -- Rename logo_url to logo if logo_url exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'logo_url') THEN
    ALTER TABLE companies RENAME COLUMN logo_url TO logo;
  ELSE
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo VARCHAR(500);
  END IF;

  -- Rename country to hq_country if country exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'country') THEN
    ALTER TABLE companies RENAME COLUMN country TO hq_country;
  ELSE
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS hq_country VARCHAR(100);
  END IF;

  -- Rename industries to domain_verticals if industries exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'industries') THEN
    ALTER TABLE companies RENAME COLUMN industries TO domain_verticals;
  ELSE
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS domain_verticals TEXT[] DEFAULT '{}';
  END IF;

  -- Rename tags to derived_capabilities if tags exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'tags') THEN
    ALTER TABLE companies RENAME COLUMN tags TO derived_capabilities;
  ELSE
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS derived_capabilities TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Products table updates
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_id VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS capabilities TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS use_cases TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS target_customers TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS deployment TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS maturity VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS pricing_model VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS confidence FLOAT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sources TEXT[] DEFAULT '{}';

-- ============================================
-- PHASE 2: Update indexes (safe - IF NOT EXISTS / IF EXISTS)
-- ============================================

DROP INDEX IF EXISTS idx_companies_category;
DROP INDEX IF EXISTS idx_companies_tags;
DROP INDEX IF EXISTS idx_companies_industries;
DROP INDEX IF EXISTS idx_companies_country;

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_company_id ON companies(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_derived_capabilities ON companies USING GIN(derived_capabilities);
CREATE INDEX IF NOT EXISTS idx_companies_domain_verticals ON companies USING GIN(domain_verticals);
CREATE INDEX IF NOT EXISTS idx_companies_hq_country ON companies(hq_country);
CREATE INDEX IF NOT EXISTS idx_companies_hq_region ON companies(hq_region);
CREATE INDEX IF NOT EXISTS idx_companies_ai_infrastructure ON companies(ai_infrastructure);
CREATE INDEX IF NOT EXISTS idx_companies_ai_platform ON companies(ai_platform);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_product_id ON products(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_capabilities ON products USING GIN(capabilities);
CREATE INDEX IF NOT EXISTS idx_products_use_cases ON products USING GIN(use_cases);
CREATE INDEX IF NOT EXISTS idx_products_maturity ON products(maturity);

-- ============================================
-- PHASE 3: Recreate view
-- ============================================

DROP VIEW IF EXISTS companies_with_ratings;
CREATE VIEW companies_with_ratings AS
SELECT
  c.*,
  COALESCE(AVG(r.rating), 0) as average_rating,
  COUNT(r.id) as review_count
FROM companies c
LEFT JOIN reviews r ON c.id = r.company_id
GROUP BY c.id;

-- ============================================
-- PHASE 4: Update search functions
-- ============================================

DROP FUNCTION IF EXISTS search_companies(VECTOR(1536), TEXT, TEXT, TEXT[], TEXT[], TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS search_companies_with_products(VECTOR(1536), TEXT, TEXT, TEXT[], TEXT[], TEXT, INTEGER, INTEGER);

-- Updated search_companies function
CREATE OR REPLACE FUNCTION search_companies(
  query_embedding VECTOR(1536),
  search_query TEXT DEFAULT NULL,
  filter_derived_capabilities TEXT[] DEFAULT NULL,
  filter_domain_verticals TEXT[] DEFAULT NULL,
  filter_hq_country TEXT DEFAULT NULL,
  result_limit INTEGER DEFAULT 10,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  company_id VARCHAR,
  name VARCHAR,
  slug VARCHAR,
  website VARCHAR,
  description TEXT,
  logo VARCHAR,
  derived_capabilities TEXT[],
  domain_verticals TEXT[],
  hq_country VARCHAR,
  hq_region VARCHAR,
  ai_infrastructure BOOLEAN,
  ai_platform BOOLEAN,
  scrape_confidence FLOAT,
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
    AND (filter_derived_capabilities IS NULL OR c.derived_capabilities && filter_derived_capabilities)
    AND (filter_domain_verticals IS NULL OR c.domain_verticals && filter_domain_verticals)
    AND (filter_hq_country IS NULL OR c.hq_country = filter_hq_country)
    AND c.embedding IS NOT NULL
  LIMIT 20
),
keyword_results AS (
  SELECT c.id, ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', c.name || ' ' || COALESCE(c.description, '')), plainto_tsquery('english', COALESCE(search_query, ''))) DESC) as rank
  FROM companies c
  WHERE c.status = 'approved'
    AND (filter_derived_capabilities IS NULL OR c.derived_capabilities && filter_derived_capabilities)
    AND (filter_domain_verticals IS NULL OR c.domain_verticals && filter_domain_verticals)
    AND (filter_hq_country IS NULL OR c.hq_country = filter_hq_country)
    AND (search_query IS NULL OR search_query = '' OR to_tsvector('english', c.name || ' ' || COALESCE(c.description, '')) @@ plainto_tsquery('english', search_query))
  LIMIT 20
),
combined AS (
  SELECT COALESCE(s.id, k.id) as id, s.rank as semantic_rank, k.rank as keyword_rank,
    COALESCE(1.0 / (60 + s.rank), 0) + COALESCE(1.0 / (60 + k.rank), 0) as rrf_score
  FROM semantic_results s FULL OUTER JOIN keyword_results k ON s.id = k.id
)
SELECT c.id, c.company_id, c.name, c.slug, c.website, c.description, c.logo,
  c.derived_capabilities, c.domain_verticals, c.hq_country, c.hq_region,
  c.ai_infrastructure, c.ai_platform, c.scrape_confidence, c.status, c.submitted_by,
  c.created_at, c.updated_at, COALESCE(combined.semantic_rank, 0)::INTEGER,
  COALESCE(combined.keyword_rank, 0)::INTEGER, combined.rrf_score
FROM combined JOIN companies c ON c.id = combined.id
ORDER BY combined.rrf_score DESC LIMIT result_limit OFFSET result_offset;
$$ LANGUAGE SQL;

-- Updated search_companies_with_products function
CREATE OR REPLACE FUNCTION search_companies_with_products(
  query_embedding VECTOR(1536),
  search_query TEXT DEFAULT NULL,
  filter_derived_capabilities TEXT[] DEFAULT NULL,
  filter_domain_verticals TEXT[] DEFAULT NULL,
  filter_hq_country TEXT DEFAULT NULL,
  result_limit INTEGER DEFAULT 10,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID, company_id VARCHAR, name VARCHAR, slug VARCHAR, website VARCHAR,
  description TEXT, logo VARCHAR, derived_capabilities TEXT[], domain_verticals TEXT[],
  hq_country VARCHAR, hq_region VARCHAR, ai_infrastructure BOOLEAN, ai_platform BOOLEAN,
  scrape_confidence FLOAT, status VARCHAR, submitted_by UUID, created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ, semantic_rank INTEGER, keyword_rank INTEGER, combined_score FLOAT,
  matching_product_id UUID, matching_product_name VARCHAR, matching_product_description TEXT
) AS $$
WITH company_semantic_results AS (
  SELECT c.id, ROW_NUMBER() OVER (ORDER BY c.embedding <=> query_embedding) as rank
  FROM companies c WHERE c.status = 'approved'
    AND (filter_derived_capabilities IS NULL OR c.derived_capabilities && filter_derived_capabilities)
    AND (filter_domain_verticals IS NULL OR c.domain_verticals && filter_domain_verticals)
    AND (filter_hq_country IS NULL OR c.hq_country = filter_hq_country)
    AND c.embedding IS NOT NULL LIMIT 30
),
company_keyword_results AS (
  SELECT c.id, ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', c.name || ' ' || COALESCE(c.description, '')), plainto_tsquery('english', COALESCE(search_query, ''))) DESC) as rank
  FROM companies c WHERE c.status = 'approved'
    AND (filter_derived_capabilities IS NULL OR c.derived_capabilities && filter_derived_capabilities)
    AND (filter_domain_verticals IS NULL OR c.domain_verticals && filter_domain_verticals)
    AND (filter_hq_country IS NULL OR c.hq_country = filter_hq_country)
    AND (search_query IS NULL OR search_query = '' OR to_tsvector('english', c.name || ' ' || COALESCE(c.description, '')) @@ plainto_tsquery('english', search_query)) LIMIT 30
),
product_semantic_results AS (
  SELECT p.id as product_id, p.company_id, p.name as product_name, p.description as product_description,
    ROW_NUMBER() OVER (ORDER BY p.embedding <=> query_embedding) as rank
  FROM products p JOIN companies c ON c.id = p.company_id WHERE c.status = 'approved'
    AND (filter_derived_capabilities IS NULL OR c.derived_capabilities && filter_derived_capabilities)
    AND (filter_domain_verticals IS NULL OR c.domain_verticals && filter_domain_verticals)
    AND (filter_hq_country IS NULL OR c.hq_country = filter_hq_country)
    AND p.embedding IS NOT NULL LIMIT 30
),
product_keyword_results AS (
  SELECT p.id as product_id, p.company_id, p.name as product_name, p.description as product_description,
    ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')), plainto_tsquery('english', COALESCE(search_query, ''))) DESC) as rank
  FROM products p JOIN companies c ON c.id = p.company_id WHERE c.status = 'approved'
    AND (filter_derived_capabilities IS NULL OR c.derived_capabilities && filter_derived_capabilities)
    AND (filter_domain_verticals IS NULL OR c.domain_verticals && filter_domain_verticals)
    AND (filter_hq_country IS NULL OR c.hq_country = filter_hq_country)
    AND (search_query IS NULL OR search_query = '' OR to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('english', search_query)) LIMIT 30
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
    COALESCE(ps.product_id, pk.product_id) as matching_product_id, COALESCE(ps.product_name, pk.product_name) as matching_product_name,
    COALESCE(ps.product_description, pk.product_description) as matching_product_description
  FROM product_semantic_results ps FULL OUTER JOIN product_keyword_results pk ON ps.product_id = pk.product_id
  WHERE COALESCE(ps.company_id, pk.company_id) IS NOT NULL
  ORDER BY COALESCE(ps.company_id, pk.company_id), COALESCE(1.0 / (60 + ps.rank), 0) + COALESCE(1.0 / (60 + pk.rank), 0) DESC
),
all_results AS (
  SELECT id, semantic_rank, keyword_rank, rrf_score, matching_product_id, matching_product_name, matching_product_description,
    ROW_NUMBER() OVER (PARTITION BY id ORDER BY rrf_score DESC) as rn
  FROM (SELECT * FROM company_combined UNION ALL SELECT * FROM product_combined) combined
)
SELECT c.id, c.company_id, c.name, c.slug, c.website, c.description, c.logo, c.derived_capabilities,
  c.domain_verticals, c.hq_country, c.hq_region, c.ai_infrastructure, c.ai_platform, c.scrape_confidence,
  c.status, c.submitted_by, c.created_at, c.updated_at, COALESCE(ar.semantic_rank, 0)::INTEGER,
  COALESCE(ar.keyword_rank, 0)::INTEGER, ar.rrf_score, ar.matching_product_id, ar.matching_product_name, ar.matching_product_description
FROM all_results ar JOIN companies c ON c.id = ar.id WHERE ar.rn = 1
ORDER BY ar.rrf_score DESC LIMIT result_limit OFFSET result_offset;
$$ LANGUAGE SQL;
