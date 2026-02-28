-- Add company_id FK to product_classification
ALTER TABLE product_classification
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Backfill from products table (all 82 existing rows)
UPDATE product_classification pc
SET company_id = p.company_id
FROM products p
WHERE p.id = pc.product_id;

-- Index for filtered queries by company
CREATE INDEX IF NOT EXISTS idx_product_classification_company
  ON product_classification(company_id);
