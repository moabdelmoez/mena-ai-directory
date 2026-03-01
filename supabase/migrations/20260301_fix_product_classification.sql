-- Fix product_classification table: add company_id FK and unique constraint on product_id
-- Required for upsert onConflict to work correctly

-- Add company_id FK (idempotent)
ALTER TABLE product_classification
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_product_classification_company
  ON product_classification(company_id);

-- Remove duplicate rows before adding unique constraint, keeping the most recent
DELETE FROM product_classification a
  USING product_classification b
  WHERE a.id < b.id AND a.product_id = b.product_id;

-- Add unique constraint on product_id (required for upsert onConflict: 'product_id')
ALTER TABLE product_classification
  DROP CONSTRAINT IF EXISTS product_classification_product_id_unique;

ALTER TABLE product_classification
  ADD CONSTRAINT product_classification_product_id_unique UNIQUE (product_id);
