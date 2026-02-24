import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCompanyEmbedding, generateProductEmbedding } from '@/lib/openai';
import { generateUniqueSlug } from '@/lib/utils';
import { MENA_COUNTRIES } from '@/constants';

interface CompanyJsonRow {
  company_id?: string;
  name: string;
  website: string;
  description?: string | null;
  derived_capabilities?: string[];
  domain_verticals?: string[];
  hq_country?: string | null;
  hq_region?: string;
  ai_infrastructure?: boolean;
  ai_platform?: boolean;
  logo?: string;
  scrape_confidence?: number;
  products?: ProductJsonRow[];
}

interface ProductJsonRow {
  product_id?: string;
  name: string;
  description: string;
  category?: string;
  capabilities?: string[];
  use_cases?: string[];
  target_customers?: string[];
  deployment?: string[];
  maturity?: string;
  pricing_model?: string;
  confidence?: number;
  sources?: string[];
}

interface CsvRow {
  name: string;
  website: string;
  description: string;
  derived_capabilities: string;
  domain_verticals: string;
  hq_country: string;
  hq_region?: string;
  ai_infrastructure?: string;
  ai_platform?: string;
  logo?: string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCsv(csvContent: string): CsvRow[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push({
      name: row.name || '',
      website: row.website || '',
      description: row.description || '',
      derived_capabilities: row.derived_capabilities || row.tags || '',
      domain_verticals: row.domain_verticals || row.industries || '',
      hq_country: row.hq_country || row.country || '',
      hq_region: row.hq_region || '',
      ai_infrastructure: row.ai_infrastructure || '',
      ai_platform: row.ai_platform || '',
      logo: row.logo || row.logo_url || row.logourl || row['logo url'] || '',
    });
  }

  return rows;
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle JSON import
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { companies, autoApprove = false } = body as { companies: CompanyJsonRow[]; autoApprove?: boolean };

      if (!companies || !Array.isArray(companies)) {
        return NextResponse.json({ error: 'Invalid JSON: expected { companies: [...] }' }, { status: 400 });
      }

      return handleJsonImport(companies, autoApprove);
    }

    // Handle FormData (CSV file upload)
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const autoApprove = formData.get('autoApprove') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const csvContent = await file.text();
    const rows = parseCsv(csvContent);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid rows found in CSV' }, { status: 400 });
    }

    return handleCsvImport(rows, autoApprove);
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}

const BATCH_SIZE = 5; // Process companies in parallel batches of 5

async function handleJsonImport(companies: CompanyJsonRow[], autoApprove: boolean) {
  // Get existing slugs
  const { data: existingSlugs } = await supabaseAdmin
    .from('companies')
    .select('slug');

  const slugSet = new Set((existingSlugs || []).map(s => s.slug));
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Pre-validate and assign slugs (must be sequential for uniqueness)
  const validatedRows: { row: CompanyJsonRow; slug: string }[] = [];
  for (const row of companies) {
    if (!row.name || !row.website) {
      results.failed++;
      results.errors.push(`Company "${row.name || 'unknown'}": Missing required fields (name, website)`);
      continue;
    }
    if (row.hq_country && !MENA_COUNTRIES.includes(row.hq_country as typeof MENA_COUNTRIES[number])) {
      console.warn(`Company "${row.name}": hq_country "${row.hq_country}" not in allowed list, setting to null`);
      row.hq_country = null;
    }
    const slug = generateUniqueSlug(row.name, Array.from(slugSet));
    slugSet.add(slug);
    validatedRows.push({ row, slug });
  }

  // Process in parallel batches
  for (let i = 0; i < validatedRows.length; i += BATCH_SIZE) {
    const batch = validatedRows.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async ({ row, slug }) => {
        const description = row.description || '';
        const derived_capabilities = row.derived_capabilities || [];
        const domain_verticals = row.domain_verticals || [];
        const ai_infrastructure = row.ai_infrastructure || false;
        const ai_platform = row.ai_platform || false;

        const embedding = await generateCompanyEmbedding(
          row.name, description, derived_capabilities, domain_verticals,
          ai_infrastructure, ai_platform
        );

        const { data: company, error } = await supabaseAdmin
          .from('companies')
          .insert({
            company_id: row.company_id || null,
            name: row.name, slug, website: row.website, description,
            logo: row.logo || null, derived_capabilities, domain_verticals,
            hq_country: row.hq_country, hq_region: row.hq_region || null,
            ai_infrastructure, ai_platform,
            scrape_confidence: row.scrape_confidence || null,
            status: autoApprove ? 'approved' : 'pending',
            embedding: JSON.stringify(embedding),
          })
          .select()
          .single();

        if (error) throw new Error(error.message);

        // Insert products in parallel
        if (row.products && row.products.length > 0 && company) {
          const productInserts = await Promise.all(
            row.products.map(async (product) => {
              const productEmbedding = await generateProductEmbedding(
                product.name, product.description, row.name
              );
              return {
                product_id: product.product_id || null,
                company_id: company.id,
                name: product.name, description: product.description,
                category: product.category || null,
                capabilities: product.capabilities || [],
                use_cases: product.use_cases || [],
                target_customers: product.target_customers || [],
                deployment: product.deployment || [],
                maturity: product.maturity || null,
                pricing_model: product.pricing_model || null,
                confidence: product.confidence || null,
                sources: product.sources || [],
                embedding: JSON.stringify(productEmbedding),
              };
            })
          );
          await supabaseAdmin.from('products').insert(productInserts);
        }

        return row.name;
      })
    );

    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        results.success++;
      } else {
        results.failed++;
        results.errors.push(`Company "${batch[idx].row.name}": ${result.reason?.message || 'Unknown error'}`);
      }
    });
  }

  return NextResponse.json({
    message: `Imported ${results.success} companies. ${results.failed} failed.`,
    results,
  });
}

async function handleCsvImport(rows: CsvRow[], autoApprove: boolean) {
  // Get existing slugs
  const { data: existingSlugs } = await supabaseAdmin
    .from('companies')
    .select('slug');

  const slugSet = new Set((existingSlugs || []).map(s => s.slug));
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Pre-validate and assign slugs (must be sequential for uniqueness)
  const validatedRows: { row: CsvRow; slug: string }[] = [];
  for (const row of rows) {
    if (!row.name || !row.website || !row.hq_country) {
      results.failed++;
      results.errors.push(`Row "${row.name || 'unknown'}": Missing required fields (name, website, hq_country)`);
      continue;
    }
    if (!MENA_COUNTRIES.includes(row.hq_country as typeof MENA_COUNTRIES[number])) {
      results.failed++;
      results.errors.push(`Row "${row.name}": Invalid hq_country "${row.hq_country}"`);
      continue;
    }
    const slug = generateUniqueSlug(row.name, Array.from(slugSet));
    slugSet.add(slug);
    validatedRows.push({ row, slug });
  }

  // Process in parallel batches
  for (let i = 0; i < validatedRows.length; i += BATCH_SIZE) {
    const batch = validatedRows.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async ({ row, slug }) => {
        const derived_capabilities = row.derived_capabilities.split(',').map(t => t.trim()).filter(t => t);
        const domain_verticals = row.domain_verticals.split(',').map(t => t.trim()).filter(t => t);
        const ai_infrastructure = row.ai_infrastructure?.toLowerCase() === 'true';
        const ai_platform = row.ai_platform?.toLowerCase() === 'true';

        const embedding = await generateCompanyEmbedding(
          row.name, row.description, derived_capabilities, domain_verticals,
          ai_infrastructure, ai_platform
        );

        const { error } = await supabaseAdmin.from('companies').insert({
          name: row.name, slug, website: row.website,
          description: row.description, logo: row.logo || null,
          derived_capabilities, domain_verticals,
          hq_country: row.hq_country, hq_region: row.hq_region || null,
          ai_infrastructure, ai_platform,
          status: autoApprove ? 'approved' : 'pending',
          embedding: JSON.stringify(embedding),
        });

        if (error) throw new Error(error.message);
        return row.name;
      })
    );

    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        results.success++;
      } else {
        results.failed++;
        results.errors.push(`Row "${batch[idx].row.name}": ${result.reason?.message || 'Unknown error'}`);
      }
    });
  }

  return NextResponse.json({
    message: `Imported ${results.success} companies. ${results.failed} failed.`,
    results,
  });
}
