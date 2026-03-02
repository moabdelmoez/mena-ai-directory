-- Enhance hybrid search: stored tsvector, HNSW indexes, websearch syntax,
-- distance threshold, total_count in results, logo_bg in return type.

----------------------------------------------------------------------
-- 1a. Pre-computed weighted tsvector columns (trigger-based)
--     Using triggers instead of GENERATED ALWAYS AS ... STORED to
--     avoid full table rewrite that exceeds free-tier 32MB work_mem.
----------------------------------------------------------------------
ALTER TABLE companies ADD COLUMN IF NOT EXISTS search_tsv tsvector;
ALTER TABLE products  ADD COLUMN IF NOT EXISTS search_tsv tsvector;

-- Shared trigger function for both tables
CREATE OR REPLACE FUNCTION update_search_tsv()
RETURNS trigger AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_companies_search_tsv ON companies;
CREATE TRIGGER trg_companies_search_tsv
  BEFORE INSERT OR UPDATE OF name, description ON companies
  FOR EACH ROW EXECUTE FUNCTION update_search_tsv();

DROP TRIGGER IF EXISTS trg_products_search_tsv ON products;
CREATE TRIGGER trg_products_search_tsv
  BEFORE INSERT OR UPDATE OF name, description ON products
  FOR EACH ROW EXECUTE FUNCTION update_search_tsv();

-- Backfill existing rows in batches of 100 to stay under memory limits
DO $$
DECLARE
  batch_size INT := 100;
  affected   INT;
BEGIN
  -- Backfill companies
  LOOP
    WITH batch AS (
      SELECT id FROM companies WHERE search_tsv IS NULL LIMIT batch_size
    )
    UPDATE companies c
    SET search_tsv =
      setweight(to_tsvector('english', coalesce(c.name, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(c.description, '')), 'B')
    FROM batch b WHERE c.id = b.id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    EXIT WHEN affected = 0;
  END LOOP;

  -- Backfill products
  LOOP
    WITH batch AS (
      SELECT id FROM products WHERE search_tsv IS NULL LIMIT batch_size
    )
    UPDATE products p
    SET search_tsv =
      setweight(to_tsvector('english', coalesce(p.name, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(p.description, '')), 'B')
    FROM batch b WHERE p.id = b.id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    EXIT WHEN affected = 0;
  END LOOP;
END $$;

----------------------------------------------------------------------
-- 1b. GIN indexes on tsvector columns (created after backfill)
----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_companies_search_tsv ON companies USING GIN(search_tsv);
CREATE INDEX IF NOT EXISTS idx_products_search_tsv  ON products  USING GIN(search_tsv);
DROP INDEX IF EXISTS idx_products_fts;  -- old expression-based, superseded

----------------------------------------------------------------------
-- 1c. Vector indexes skipped — exceeds free-tier maintenance_work_mem (32MB).
-- Sequential scan is fine at current dataset size. Revisit when upgrading plan.
----------------------------------------------------------------------

----------------------------------------------------------------------
-- 1d. safe_tsquery helper — websearch syntax with fallback
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION safe_tsquery(query TEXT)
RETURNS tsquery AS $$
DECLARE
  result tsquery;
BEGIN
  IF query IS NULL OR query = '' THEN RETURN NULL; END IF;

  result := websearch_to_tsquery('english', query);
  IF result = ''::tsquery THEN RETURN NULL; END IF;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  result := plainto_tsquery('english', query);
  IF result = ''::tsquery THEN RETURN NULL; END IF;
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

----------------------------------------------------------------------
-- 1e. Rewritten search_companies_with_products
----------------------------------------------------------------------
-- Drop old signatures so CREATE OR REPLACE doesn't conflict
DROP FUNCTION IF EXISTS search_companies_with_products(VECTOR(1536), TEXT, TEXT, INTEGER, INTEGER, UUID[]);
DROP FUNCTION IF EXISTS search_companies_with_products(VECTOR(1536), TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION search_companies_with_products(
  query_embedding   VECTOR(1536),
  search_query      TEXT    DEFAULT NULL,
  filter_hq_country TEXT    DEFAULT NULL,
  result_limit      INTEGER DEFAULT 10,
  result_offset     INTEGER DEFAULT 0,
  filter_company_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id                          UUID,
  company_id                  VARCHAR,
  name                        VARCHAR,
  slug                        VARCHAR,
  company_url                 VARCHAR,
  linkedin_profile            VARCHAR,
  description                 TEXT,
  logo                        VARCHAR,
  logo_bg                     VARCHAR,
  hq_country                  VARCHAR,
  status                      VARCHAR,
  submitted_by                UUID,
  created_at                  TIMESTAMPTZ,
  updated_at                  TIMESTAMPTZ,
  semantic_rank               INTEGER,
  keyword_rank                INTEGER,
  combined_score              FLOAT,
  matching_product_id         UUID,
  matching_product_name       VARCHAR,
  matching_product_description TEXT,
  total_count                 BIGINT
) AS $$
DECLARE
  parsed_query tsquery;
BEGIN
  -- Parse once, reuse everywhere
  parsed_query := safe_tsquery(search_query);

  RETURN QUERY
  WITH
  -- DRY: pre-filtered base sets
  filtered_companies AS (
    SELECT c.*
    FROM companies c
    WHERE c.status = 'approved'
      AND (filter_hq_country IS NULL OR c.hq_country = filter_hq_country)
      AND (filter_company_ids IS NULL OR c.id = ANY(filter_company_ids))
  ),
  filtered_products AS (
    SELECT p.*, fc.hq_country AS _fc_hq
    FROM products p
    JOIN filtered_companies fc ON fc.id = p.company_id
  ),

  -- Company semantic candidates (with distance threshold)
  company_semantic AS (
    SELECT fc.id,
           ROW_NUMBER() OVER (ORDER BY fc.embedding <=> query_embedding) AS rank
    FROM filtered_companies fc
    WHERE fc.embedding IS NOT NULL
      AND (fc.embedding <=> query_embedding) < 0.42
    LIMIT 75
  ),

  -- Company keyword candidates
  company_keyword AS (
    SELECT fc.id,
           ROW_NUMBER() OVER (
             ORDER BY ts_rank(fc.search_tsv, parsed_query, 32) DESC
           ) AS rank
    FROM filtered_companies fc
    WHERE parsed_query IS NOT NULL
      AND fc.search_tsv @@ parsed_query
    LIMIT 75
  ),

  -- Product semantic candidates (with distance threshold)
  product_semantic AS (
    SELECT fp.id AS product_id, fp.company_id,
           fp.name AS product_name, fp.description AS product_description,
           ROW_NUMBER() OVER (ORDER BY fp.embedding <=> query_embedding) AS rank
    FROM filtered_products fp
    WHERE fp.embedding IS NOT NULL
      AND (fp.embedding <=> query_embedding) < 0.42
    LIMIT 75
  ),

  -- Product keyword candidates
  product_keyword AS (
    SELECT fp.id AS product_id, fp.company_id,
           fp.name AS product_name, fp.description AS product_description,
           ROW_NUMBER() OVER (
             ORDER BY ts_rank(fp.search_tsv, parsed_query, 32) DESC
           ) AS rank
    FROM filtered_products fp
    WHERE parsed_query IS NOT NULL
      AND fp.search_tsv @@ parsed_query
    LIMIT 75
  ),

  -- RRF fusion: companies
  company_combined AS (
    SELECT COALESCE(cs.id, ck.id) AS id,
           cs.rank AS semantic_rank,
           ck.rank AS keyword_rank,
           COALESCE(1.0 / (60 + cs.rank), 0) + COALESCE(1.0 / (60 + ck.rank), 0) AS rrf_score,
           NULL::UUID    AS matching_product_id,
           NULL::VARCHAR AS matching_product_name,
           NULL::TEXT    AS matching_product_description
    FROM company_semantic cs
    FULL OUTER JOIN company_keyword ck ON cs.id = ck.id
  ),

  -- RRF fusion: products (best product per company, boosted 1.5× with k=45)
  product_combined AS (
    SELECT DISTINCT ON (COALESCE(ps.company_id, pk.company_id))
           COALESCE(ps.company_id, pk.company_id)              AS id,
           COALESCE(ps.rank, 999)                              AS semantic_rank,
           COALESCE(pk.rank, 999)                              AS keyword_rank,
           (COALESCE(1.0 / (45 + ps.rank), 0) + COALESCE(1.0 / (45 + pk.rank), 0)) * 1.5 AS rrf_score,
           COALESCE(ps.product_id, pk.product_id)              AS matching_product_id,
           COALESCE(ps.product_name, pk.product_name)          AS matching_product_name,
           COALESCE(ps.product_description, pk.product_description) AS matching_product_description
    FROM product_semantic ps
    FULL OUTER JOIN product_keyword pk ON ps.product_id = pk.product_id
    WHERE COALESCE(ps.company_id, pk.company_id) IS NOT NULL
    ORDER BY COALESCE(ps.company_id, pk.company_id),
             (COALESCE(1.0 / (45 + ps.rank), 0) + COALESCE(1.0 / (45 + pk.rank), 0)) * 1.5 DESC
  ),

  -- Deduplicate: keep highest RRF score per company
  all_results AS (
    SELECT combined.id, combined.semantic_rank, combined.keyword_rank,
           combined.rrf_score,
           combined.matching_product_id, combined.matching_product_name,
           combined.matching_product_description,
           ROW_NUMBER() OVER (PARTITION BY combined.id ORDER BY combined.rrf_score DESC) AS rn
    FROM (
      SELECT * FROM company_combined
      UNION ALL
      SELECT * FROM product_combined
    ) combined
  ),

  -- Final ranked set (before pagination)
  ranked AS (
    SELECT ar.*
    FROM all_results ar
    WHERE ar.rn = 1
    ORDER BY ar.rrf_score DESC
  )

  SELECT
    c.id, c.company_id, c.name, c.slug, c.company_url, c.linkedin_profile,
    c.description, c.logo, c.logo_bg,
    c.hq_country, c.status, c.submitted_by, c.created_at, c.updated_at,
    COALESCE(r.semantic_rank, 0)::INTEGER,
    COALESCE(r.keyword_rank, 0)::INTEGER,
    r.rrf_score::DOUBLE PRECISION,
    r.matching_product_id, r.matching_product_name, r.matching_product_description,
    COUNT(*) OVER()::BIGINT AS total_count
  FROM ranked r
  JOIN companies c ON c.id = r.id
  ORDER BY r.rrf_score DESC
  LIMIT result_limit OFFSET result_offset;
END;
$$ LANGUAGE plpgsql;
