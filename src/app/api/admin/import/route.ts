import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCompanyEmbedding, generateProductEmbedding } from '@/lib/openai';
import { generateUniqueSlug } from '@/lib/utils';
import { MENA_COUNTRIES } from '@/constants';

interface CompanyJsonRow {
  company_id?: string;
  name: string;
  company_url?: string;
  linkedin_profile?: string;
  description?: string | null;
  hq_country?: string | null;
  logo?: string;
  products?: ProductJsonRow[];
}

interface ProductJsonRow {
  product_id?: string;
  name: string;
  description: string;
  product_url?: string;
}

interface CsvRow {
  name: string;
  company_url: string;
  description: string;
  hq_country: string;
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
      company_url: row.company_url || row.website || '',
      description: row.description || '',
      hq_country: row.hq_country || row.country || '',
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
    if (!row.name) {
      results.failed++;
      results.errors.push(`Company "${row.name || 'unknown'}": Missing required field (name)`);
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

        const embedding = await generateCompanyEmbedding(row.name, description);

        const { data: company, error } = await supabaseAdmin
          .from('companies')
          .insert({
            company_id: row.company_id || null,
            name: row.name, slug, company_url: row.company_url || null,
            linkedin_profile: row.linkedin_profile || null,
            description,
            logo: row.logo || null,
            hq_country: row.hq_country,
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
                product_url: product.product_url || null,
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
    if (!row.name || !row.hq_country) {
      results.failed++;
      results.errors.push(`Row "${row.name || 'unknown'}": Missing required fields (name, hq_country)`);
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
        const embedding = await generateCompanyEmbedding(row.name, row.description);

        const { error } = await supabaseAdmin.from('companies').insert({
          name: row.name, slug, company_url: row.company_url || null,
          description: row.description, logo: row.logo || null,
          hq_country: row.hq_country,
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
