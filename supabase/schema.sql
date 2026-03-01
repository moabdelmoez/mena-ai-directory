-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (Google OAuth users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  avatar_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admins table (separate credentials)
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  company_url VARCHAR(500),
  linkedin_profile VARCHAR(500),
  description TEXT NOT NULL,
  logo VARCHAR(500),
  hq_country VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  embedding VECTOR(1536),
  submitted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pending edits table (for re-approval workflow)
CREATE TABLE company_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  proposed_data JSONB NOT NULL,
  submitted_by UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(100),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  product_url VARCHAR(500),
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product classification table
CREATE TABLE product_classification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  tech_category VARCHAR(100),
  industry VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT product_classification_product_id_unique UNIQUE (product_id)
);

-- Indexes for performance
CREATE INDEX idx_companies_status ON companies(status);
CREATE UNIQUE INDEX idx_companies_company_id ON companies(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_companies_hq_country ON companies(hq_country);
CREATE INDEX idx_companies_embedding ON companies USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_reviews_company ON reviews(company_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_company_edits_company ON company_edits(company_id);
CREATE INDEX idx_company_edits_status ON company_edits(status);

-- Full-text search index for keyword search
CREATE INDEX idx_companies_fts ON companies USING GIN(to_tsvector('english', name || ' ' || description));

-- Product indexes
CREATE INDEX idx_products_company ON products(company_id);
CREATE UNIQUE INDEX idx_products_product_id ON products(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_products_embedding ON products USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_products_fts ON products USING GIN(to_tsvector('english', name || ' ' || description));
CREATE INDEX idx_product_classification_product ON product_classification(product_id);
CREATE INDEX idx_product_classification_company ON product_classification(company_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for companies updated_at
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for products updated_at
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function for hybrid search
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

-- Function for hybrid search including products
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

-- View for companies with average ratings
CREATE OR REPLACE VIEW companies_with_ratings AS
SELECT
  c.*,
  COALESCE(AVG(r.rating), 0) as average_rating,
  COUNT(r.id) as review_count
FROM companies c
LEFT JOIN reviews r ON c.id = r.company_id
GROUP BY c.id;
