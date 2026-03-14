-- Filter products by classification in search ranking
-- When classification filters are active (extracted or explicit), only search
-- products matching those classifications. This ensures ranking and displayed
-- matching product are both relevant.

----------------------------------------------------------------------
-- Drop old signature (new params change the signature)
----------------------------------------------------------------------
DROP FUNCTION IF EXISTS search_companies_with_products(VECTOR(1536), TEXT, TEXT, INTEGER, INTEGER, UUID[]);

----------------------------------------------------------------------
-- Recreate with classification filter params
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_companies_with_products(
  query_embedding        VECTOR(1536),
  search_query           TEXT    DEFAULT NULL,
  filter_hq_country      TEXT    DEFAULT NULL,
  result_limit           INTEGER DEFAULT 10,
  result_offset          INTEGER DEFAULT 0,
  filter_company_ids     UUID[]  DEFAULT NULL,
  filter_tech_categories TEXT[]  DEFAULT NULL,
  filter_industries      TEXT[]  DEFAULT NULL
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
  parsed_query    tsquery;
  parsed_query_or tsquery;
BEGIN
  -- Parse once, reuse everywhere
  parsed_query    := safe_tsquery(search_query);
  parsed_query_or := safe_tsquery_or(search_query);

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
    WHERE
      (filter_tech_categories IS NULL AND filter_industries IS NULL)
      OR EXISTS (
        SELECT 1 FROM product_classification pcl
        WHERE pcl.product_id = p.id
          AND (
            (filter_tech_categories IS NOT NULL AND pcl.tech_category = ANY(filter_tech_categories))
            OR (filter_industries IS NOT NULL AND pcl.industry = ANY(filter_industries))
          )
      )
  ),

  -- Company semantic candidates (loosened threshold: 0.42 → 0.46)
  company_semantic AS (
    SELECT fc.id,
           ROW_NUMBER() OVER (ORDER BY fc.embedding <=> query_embedding) AS rank
    FROM filtered_companies fc
    WHERE fc.embedding IS NOT NULL
      AND (fc.embedding <=> query_embedding) < 0.46
    LIMIT 75
  ),

  -- Company keyword candidates (AND — exact multi-word match)
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

  -- Company keyword OR fallback (partial multi-word match, excludes AND hits)
  company_keyword_or AS (
    SELECT fc.id,
           ROW_NUMBER() OVER (
             ORDER BY ts_rank(fc.search_tsv, parsed_query_or, 32) DESC
           ) AS rank
    FROM filtered_companies fc
    WHERE parsed_query_or IS NOT NULL
      AND parsed_query_or IS DISTINCT FROM parsed_query
      AND fc.search_tsv @@ parsed_query_or
      AND fc.id NOT IN (SELECT ck.id FROM company_keyword ck)
    LIMIT 75
  ),

  -- Product semantic candidates (loosened threshold: 0.42 → 0.46)
  product_semantic AS (
    SELECT fp.id AS product_id, fp.company_id,
           fp.name AS product_name, fp.description AS product_description,
           ROW_NUMBER() OVER (ORDER BY fp.embedding <=> query_embedding) AS rank
    FROM filtered_products fp
    WHERE fp.embedding IS NOT NULL
      AND (fp.embedding <=> query_embedding) < 0.46
    LIMIT 75
  ),

  -- Product keyword candidates (AND — exact multi-word match)
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

  -- Product keyword OR fallback (partial multi-word match, excludes AND hits)
  product_keyword_or AS (
    SELECT fp.id AS product_id, fp.company_id,
           fp.name AS product_name, fp.description AS product_description,
           ROW_NUMBER() OVER (
             ORDER BY ts_rank(fp.search_tsv, parsed_query_or, 32) DESC
           ) AS rank
    FROM filtered_products fp
    WHERE parsed_query_or IS NOT NULL
      AND parsed_query_or IS DISTINCT FROM parsed_query
      AND fp.search_tsv @@ parsed_query_or
      AND fp.id NOT IN (SELECT pk.product_id FROM product_keyword pk)
    LIMIT 75
  ),

  -- RRF fusion: companies (AND keywords + OR fallback dampened)
  company_combined AS (
    SELECT COALESCE(cs.id, ck.id, cko.id) AS id,
           cs.rank AS semantic_rank,
           COALESCE(ck.rank, cko.rank) AS keyword_rank,
           COALESCE(1.0 / (60 + cs.rank), 0)
             + COALESCE(1.0 / (60 + ck.rank), 0)
             + COALESCE(1.0 / (80 + cko.rank), 0) * 0.5
             AS rrf_score,
           NULL::UUID    AS matching_product_id,
           NULL::VARCHAR AS matching_product_name,
           NULL::TEXT    AS matching_product_description
    FROM company_semantic cs
    FULL OUTER JOIN company_keyword ck ON cs.id = ck.id
    FULL OUTER JOIN company_keyword_or cko ON COALESCE(cs.id, ck.id) = cko.id
  ),

  -- RRF fusion: products (best product per company, boosted 1.5x, OR fallback dampened)
  product_combined AS (
    SELECT DISTINCT ON (COALESCE(ps.company_id, pk.company_id, pko.company_id))
           COALESCE(ps.company_id, pk.company_id, pko.company_id) AS id,
           COALESCE(ps.rank, 999)                                  AS semantic_rank,
           COALESCE(pk.rank, pko.rank, 999)                        AS keyword_rank,
           (COALESCE(1.0 / (45 + ps.rank), 0)
             + COALESCE(1.0 / (45 + pk.rank), 0)
             + COALESCE(1.0 / (80 + pko.rank), 0) * 0.5
           ) * 1.5 AS rrf_score,
           COALESCE(ps.product_id, pk.product_id, pko.product_id)  AS matching_product_id,
           COALESCE(ps.product_name, pk.product_name, pko.product_name) AS matching_product_name,
           COALESCE(ps.product_description, pk.product_description, pko.product_description) AS matching_product_description
    FROM product_semantic ps
    FULL OUTER JOIN product_keyword pk ON ps.product_id = pk.product_id
    FULL OUTER JOIN product_keyword_or pko ON COALESCE(ps.product_id, pk.product_id) = pko.product_id
    WHERE COALESCE(ps.company_id, pk.company_id, pko.company_id) IS NOT NULL
    ORDER BY COALESCE(ps.company_id, pk.company_id, pko.company_id),
             (COALESCE(1.0 / (45 + ps.rank), 0)
               + COALESCE(1.0 / (45 + pk.rank), 0)
               + COALESCE(1.0 / (80 + pko.rank), 0) * 0.5
             ) * 1.5 DESC
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
