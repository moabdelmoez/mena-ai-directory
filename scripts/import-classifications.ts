import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
config({ path: path.join(__dirname, '..', '.env.local') });

const CLASSIFICATIONS_FILE = '/Users/mostafa/Downloads/Coding_Projects/classification-products/output/classified_2026-03-05.json';

async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import('../src/lib/supabase');
  return supabaseAdmin;
}

interface RawClassification {
  company_id: string;
  product_id: string;
  tech_category: string;
  industry: string;
}

async function main() {
  console.log('=== MENA AI Directory — Product Classifications Import ===\n');

  // Read classifications file
  console.log('Reading classifications file...');
  const raw = JSON.parse(fs.readFileSync(CLASSIFICATIONS_FILE, 'utf-8'));
  const classifications: RawClassification[] = Array.isArray(raw) ? raw : [];
  console.log(`Found ${classifications.length} classification entries`);

  // Build lookup map: "company_id--product_id" (namespaced) → { tech_category, industry }
  // Keying by the full namespace avoids collisions when two companies share the same short product_id
  const classificationMap = new Map<string, { tech_category: string; industry: string }>();
  for (const entry of classifications) {
    const key = `${entry.company_id}--${entry.product_id}`;
    classificationMap.set(key, {
      tech_category: entry.tech_category,
      industry: entry.industry,
    });
  }

  const supabase = await getSupabaseAdmin();

  // Query all products with a product_id (namespaced)
  console.log('\nFetching products from DB...');
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, product_id, company_id')
    .not('product_id', 'is', null);

  if (fetchError) throw new Error(`Failed to fetch products: ${fetchError.message}`);
  console.log(`Found ${products?.length ?? 0} products with product_id`);

  // Match products to classifications using the full namespaced product_id
  const matched: Array<{ uuid: string; company_uuid: string; tech_category: string; industry: string }> = [];
  const unmatched: string[] = [];

  for (const product of products ?? []) {
    // DB stores "company_id--product_id" — use it directly as the map key
    const classification = classificationMap.get(product.product_id as string);
    if (classification) {
      matched.push({
        uuid: product.id,
        company_uuid: product.company_id as string,
        tech_category: classification.tech_category,
        industry: classification.industry,
      });
    } else {
      unmatched.push(product.product_id as string);
    }
  }

  console.log(`\nMatched:   ${matched.length} products`);
  console.log(`Unmatched: ${unmatched.length} products`);

  if (unmatched.length > 0) {
    console.log('\nUnmatched products:');
    for (const u of unmatched) console.log(`  - ${u}`);
  }

  if (matched.length === 0) {
    console.log('\nNo matches found — nothing to insert.');
    return;
  }

  // Delete existing classifications for matched products (idempotent)
  const matchedUuids = matched.map(m => m.uuid);
  console.log(`\nRemoving existing classifications for ${matchedUuids.length} products...`);
  const { error: deleteError, count: deleteCount } = await supabase
    .from('product_classification')
    .delete({ count: 'exact' })
    .in('product_id', matchedUuids);

  if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);
  console.log(`Removed ${deleteCount ?? 0} existing rows`);

  // Insert new classifications
  const rows = matched.map(m => ({
    product_id: m.uuid,
    company_id: m.company_uuid,
    tech_category: m.tech_category,
    industry: m.industry,
  }));

  console.log(`\nInserting ${rows.length} classification rows...`);
  const { error: insertError, count: insertCount } = await supabase
    .from('product_classification')
    .insert(rows, { count: 'exact' });

  if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

  console.log('\n=== Import Results ===');
  console.log(`Matched:   ${matched.length} products`);
  console.log(`Unmatched: ${unmatched.length} products`);
  console.log(`Inserted:  ${insertCount ?? rows.length} rows`);
  console.log('\n=== Done ===');
}

main().catch(console.error);
