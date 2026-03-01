-- Recreate companies_with_ratings view to include logo_bg column
-- (logo_bg was added after the view was last created, so SELECT c.* was stale)
DROP VIEW IF EXISTS companies_with_ratings;
CREATE VIEW companies_with_ratings AS
SELECT
  c.*,
  COALESCE(AVG(r.rating), 0) AS average_rating,
  COUNT(r.id) AS review_count
FROM companies c
LEFT JOIN reviews r ON c.id = r.company_id
GROUP BY c.id;
