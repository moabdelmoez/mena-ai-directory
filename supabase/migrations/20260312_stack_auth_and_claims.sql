-- Part A2: Stack Auth migration - add stack_auth_id to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS stack_auth_id VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stack_auth_id ON users(stack_auth_id) WHERE stack_auth_id IS NOT NULL;
ALTER TABLE users ALTER COLUMN google_id DROP NOT NULL;

-- Part B1: Claim feature - add claimed_by to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_companies_claimed_by ON companies(claimed_by);

-- Claims audit table
CREATE TABLE IF NOT EXISTS company_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  verified_email VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'verified',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  CONSTRAINT company_claims_company_unique UNIQUE (company_id)
);
CREATE INDEX IF NOT EXISTS idx_company_claims_status ON company_claims(status);

-- Rebuild view to include claimed_by
DROP VIEW IF EXISTS companies_with_ratings;
CREATE VIEW companies_with_ratings AS
SELECT c.*, COALESCE(AVG(r.rating), 0) as average_rating, COUNT(r.id) as review_count
FROM companies c LEFT JOIN reviews r ON c.id = r.company_id GROUP BY c.id;
