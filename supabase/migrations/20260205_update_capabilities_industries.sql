-- Migration: Update capabilities and industries values
-- Date: 2026-02-05

-- ============================================
-- STEP 1: Update derived_capabilities
-- ============================================

-- Transform capability values to new format
-- Uses COALESCE to return empty array when no valid values remain
UPDATE companies
SET derived_capabilities = COALESCE((
  SELECT array_agg(DISTINCT
    CASE
      WHEN cap = 'cloud' THEN 'GPU Cloud'
      WHEN cap = 'on_prem' THEN 'On Prem'
      WHEN cap = 'gpu_compute_management' THEN 'GPU Compute Management'
      WHEN cap IN ('ai_agent', 'ai_agents', 'AI Agents') THEN 'AI Agent'
      WHEN cap IN ('ai_voice', 'AI Voice') THEN 'AI Voice'
      WHEN cap IN ('ai_vision', 'AI Vision') THEN 'AI Vision'
      WHEN cap IN ('ai_analytics', 'AI Analytics') THEN 'AI Analytics'
      WHEN cap = 'Conversational AI' THEN 'AI Agent'
      ELSE cap
    END
  )
  FROM unnest(derived_capabilities) AS cap
  WHERE CASE
      WHEN cap = 'cloud' THEN 'GPU Cloud'
      WHEN cap = 'on_prem' THEN 'On Prem'
      WHEN cap = 'gpu_compute_management' THEN 'GPU Compute Management'
      WHEN cap IN ('ai_agent', 'ai_agents', 'AI Agents') THEN 'AI Agent'
      WHEN cap IN ('ai_voice', 'AI Voice') THEN 'AI Voice'
      WHEN cap IN ('ai_vision', 'AI Vision') THEN 'AI Vision'
      WHEN cap IN ('ai_analytics', 'AI Analytics') THEN 'AI Analytics'
      WHEN cap = 'Conversational AI' THEN 'AI Agent'
      ELSE cap
    END IN ('AI Agent', 'AI Analytics', 'AI Vision', 'AI Voice', 'GPU Cloud', 'GPU Compute Management', 'On Prem')
), '{}')
WHERE derived_capabilities IS NOT NULL AND array_length(derived_capabilities, 1) > 0;

-- ============================================
-- STEP 2: Update domain_verticals
-- ============================================

-- Transform industry values to new format
-- Uses COALESCE to return empty array when no valid values remain
UPDATE companies
SET domain_verticals = COALESCE((
  SELECT array_agg(DISTINCT
    CASE
      WHEN vert = 'Financial Services' THEN 'Finance'
      ELSE vert
    END
  )
  FROM unnest(domain_verticals) AS vert
  WHERE CASE
      WHEN vert = 'Financial Services' THEN 'Finance'
      ELSE vert
    END IN ('Finance', 'Insurance', 'Industrials', 'Education', 'Government', 'Healthcare')
), '{}')
WHERE domain_verticals IS NOT NULL AND array_length(domain_verticals, 1) > 0;

-- ============================================
-- STEP 3: Update products table if it has similar fields
-- ============================================

-- Update product capabilities if the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'capabilities'
  ) THEN
    UPDATE products
    SET capabilities = COALESCE((
      SELECT array_agg(DISTINCT
        CASE
          WHEN cap = 'cloud' THEN 'GPU Cloud'
          WHEN cap = 'on_prem' THEN 'On Prem'
          WHEN cap = 'gpu_compute_management' THEN 'GPU Compute Management'
          WHEN cap IN ('ai_agent', 'ai_agents', 'AI Agents') THEN 'AI Agent'
          WHEN cap IN ('ai_voice', 'AI Voice') THEN 'AI Voice'
          WHEN cap IN ('ai_vision', 'AI Vision') THEN 'AI Vision'
          WHEN cap IN ('ai_analytics', 'AI Analytics') THEN 'AI Analytics'
          WHEN cap = 'Conversational AI' THEN 'AI Agent'
          ELSE cap
        END
      )
      FROM unnest(capabilities) AS cap
      WHERE CASE
          WHEN cap = 'cloud' THEN 'GPU Cloud'
          WHEN cap = 'on_prem' THEN 'On Prem'
          WHEN cap = 'gpu_compute_management' THEN 'GPU Compute Management'
          WHEN cap IN ('ai_agent', 'ai_agents', 'AI Agents') THEN 'AI Agent'
          WHEN cap IN ('ai_voice', 'AI Voice') THEN 'AI Voice'
          WHEN cap IN ('ai_vision', 'AI Vision') THEN 'AI Vision'
          WHEN cap IN ('ai_analytics', 'AI Analytics') THEN 'AI Analytics'
          WHEN cap = 'Conversational AI' THEN 'AI Agent'
          ELSE cap
        END IN ('AI Agent', 'AI Analytics', 'AI Vision', 'AI Voice', 'GPU Cloud', 'GPU Compute Management', 'On Prem')
    ), '{}')
    WHERE capabilities IS NOT NULL AND array_length(capabilities, 1) > 0;
  END IF;
END $$;
