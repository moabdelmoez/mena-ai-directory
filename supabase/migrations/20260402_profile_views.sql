-- Profile views tracking for buyer intent analytics
CREATE TABLE profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referrer TEXT,
  source VARCHAR(50),
  search_query TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Primary query: company owner viewing their stats (time-ordered)
CREATE INDEX idx_profile_views_company_created
  ON profile_views(company_id, created_at DESC);

-- Admin query: who viewed (grouped by viewer)
CREATE INDEX idx_profile_views_viewer
  ON profile_views(viewer_id, created_at DESC);

-- Dedup check: same viewer + company within 5 minutes
CREATE INDEX idx_profile_views_dedup
  ON profile_views(company_id, viewer_id, created_at DESC);
