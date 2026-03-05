import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration
const PRODUCTS_FILE = '/Users/mostafa/Downloads/Coding_Projects/tinyfish-scraping-product-workflow/output/uae-products-final.json';

// Dynamic imports (after env is loaded)
async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import('../src/lib/supabase');
  return supabaseAdmin;
}

async function getEmbeddingFn() {
  const { generateProductEmbedding } = await import('../src/lib/openai');
  return generateProductEmbedding;
}

interface RawProduct {
  product_id: string;
  company_id: string; // external string ID, e.g. "synapse-analytics"
  name: string;
  description: string;
  sources?: string[];
}

async function main() {
  console.log('=== MENA AI Directory — Products Import Script ===\n');

  // Read products file
  console.log('Reading products file...');
  const raw = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8'));
  const rawProducts: RawProduct[] = Array.isArray(raw) ? raw : (raw.products ?? []);
  console.log(`Found ${rawProducts.length} products`);

  const supabase = await getSupabaseAdmin();
  const generateProductEmbedding = await getEmbeddingFn();

  // Collect unique external company_ids
  const externalIds = [...new Set(rawProducts.map(p => p.company_id))];
  console.log(`\nLooking up ${externalIds.length} companies by company_id...`);

  const { data: companies, error: lookupError } = await supabase
    .from('companies')
    .select('id, company_id, name')
    .in('company_id', externalIds);

  if (lookupError) throw new Error(`Company lookup failed: ${lookupError.message}`);

  // Map external company_id → { internalId, name }
  const companyMap = new Map<string, { id: string; name: string }>();
  for (const c of companies ?? []) {
    if (c.company_id) companyMap.set(c.company_id, { id: c.id, name: c.name });
  }
  console.log(`Matched ${companyMap.size} / ${externalIds.length} companies`);

  const missing = externalIds.filter(id => !companyMap.has(id));
  if (missing.length > 0) {
    console.warn(`WARNING: No DB match for company_ids: ${missing.join(', ')}`);
  }

  const validProducts = rawProducts.filter(p => companyMap.has(p.company_id));

  // Delete existing products for these companies so the import is idempotent
  const internalIds = [...companyMap.values()].map(c => c.id);
  console.log(`\nRemoving existing products for ${internalIds.length} companies...`);
  const { error: deleteError, count } = await supabase
    .from('products')
    .delete({ count: 'exact' })
    .in('company_id', internalIds);
  if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);
  console.log(`Removed ${count ?? 0} existing products`);

  // Insert all products fresh
  const results = { success: 0, failed: 0, skipped: rawProducts.length - validProducts.length, errors: [] as string[] };
  const BATCH_SIZE = 5;

  console.log(`\nImporting ${validProducts.length} products in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < validProducts.length; i += BATCH_SIZE) {
    const batch = validProducts.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (product) => {
        const company = companyMap.get(product.company_id)!;
        const embedding = await generateProductEmbedding(
          product.name,
          product.description || '',
          company.name,
        );

        // Namespace product_id ({company_id}--{product_id}) to avoid cross-company collisions
        const namespacedProductId = product.product_id
          ? `${product.company_id}--${product.product_id}`
          : null;

        const { error } = await supabase.from('products').insert({
          product_id: namespacedProductId,
          company_id: company.id,
          name: product.name,
          description: product.description || '',
          product_url: product.sources?.[0] ?? null,
          embedding: JSON.stringify(embedding),
        });

        if (error) throw new Error(error.message);
        return product.name;
      })
    );

    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        results.success++;
        console.log(`  ✓ ${batch[idx].name} (${batch[idx].company_id})`);
      } else {
        results.failed++;
        const msg = `${batch[idx].name} (${batch[idx].company_id}): ${result.reason?.message}`;
        results.errors.push(msg);
        console.error(`  ✗ ${msg}`);
      }
    });
  }

  console.log('\n=== Import Results ===');
  console.log(`Successfully imported: ${results.success} products`);
  console.log(`Failed:                ${results.failed} products`);
  console.log(`Skipped (no company):  ${results.skipped} products`);

  if (results.errors.length > 0) {
    console.log('\nErrors:');
    for (const e of results.errors) console.log(`  - ${e}`);
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
