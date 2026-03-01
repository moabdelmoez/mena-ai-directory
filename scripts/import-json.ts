import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration - update these paths as needed
const COMPANIES_FILE = '/Users/mostafa/Downloads/Coding_Projects/extracting-company-description/output/companies_2026-02-27.json';
const PRODUCTS_FILE: string | null = null;
const AUTO_APPROVE = true;

// API endpoint
const API_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Country normalization map
const COUNTRY_NORMALIZATION: Record<string, string> = {
  'UAE': 'United Arab Emirates',
  'KSA': 'Saudi Arabia',
  'US': 'United States',
  'USA': 'United States',
  'UK': 'United Kingdom',
};

interface RawCompany {
  company_id: string;
  name: string;
  logo: string | null;
  company_url?: string;
  website?: string;
  linkedin_profile?: string;
  description: string | null;
  hq_country: string | null;
}

interface RawProduct {
  product_id: string;
  company_id: string;
  name: string;
  description: string;
  product_url?: string;
}

interface TransformedCompany {
  company_id: string;
  name: string;
  company_url?: string | null;
  linkedin_profile?: string;
  description: string;
  logo?: string;
  hq_country?: string | null;
  products: TransformedProduct[];
}

interface TransformedProduct {
  product_id: string;
  name: string;
  description: string;
  product_url?: string;
}

function normalizeCountry(country: string | null): string | null {
  if (!country) return null;
  return COUNTRY_NORMALIZATION[country] || country;
}

// Allowed MENA countries - others will be set to null
const ALLOWED_COUNTRIES = [
  'United Arab Emirates',
  'Saudi Arabia',
  'Qatar',
  'Egypt',
];

function transformCompany(raw: RawCompany): TransformedCompany {
  // Normalize country
  const normalizedCountry = normalizeCountry(raw.hq_country);

  // Only keep country if it's in the allowed list, otherwise set to null
  const hq_country = normalizedCountry && ALLOWED_COUNTRIES.includes(normalizedCountry)
    ? normalizedCountry
    : null;

  if (!hq_country && raw.hq_country) {
    console.log(`Note: "${raw.name}" country "${raw.hq_country}" set to null (not in allowed MENA countries)`);
  } else if (!hq_country) {
    console.log(`Note: "${raw.name}" has no country specified`);
  }

  return {
    company_id: raw.company_id,
    name: raw.name,
    company_url: raw.company_url || raw.website || null,
    linkedin_profile: raw.linkedin_profile || undefined,
    description: raw.description || '',
    logo: raw.logo || undefined,
    hq_country,
    products: [],
  };
}

function transformProduct(raw: RawProduct): TransformedProduct {
  return {
    product_id: raw.product_id,
    name: raw.name,
    description: raw.description || '',
    product_url: raw.product_url,
  };
}

async function loginAdmin(): Promise<string> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables');
  }

  const response = await fetch(`${API_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Admin login failed: ${error}`);
  }

  // Get the admin_session cookie from the response
  const cookies = response.headers.get('set-cookie');
  if (!cookies) {
    throw new Error('No cookies returned from login');
  }

  // Extract admin_session from cookies
  const tokenMatch = cookies.match(/admin_session=([^;]+)/);
  if (!tokenMatch) {
    throw new Error('admin_session not found in cookies');
  }

  return tokenMatch[1];
}

async function importCompanies(companies: TransformedCompany[], adminSession: string) {
  console.log(`\nImporting ${companies.length} companies...`);

  const response = await fetch(`${API_URL}/api/admin/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `admin_session=${adminSession}`,
    },
    body: JSON.stringify({
      companies,
      autoApprove: AUTO_APPROVE,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Import failed: ${error}`);
  }

  return response.json();
}

async function main() {
  console.log('=== MENA AI Directory Import Script ===\n');

  // Read JSON files
  console.log('Reading companies file...');
  const companiesRaw = JSON.parse(fs.readFileSync(COMPANIES_FILE, 'utf-8'));
  const rawCompanies: RawCompany[] = Array.isArray(companiesRaw) ? companiesRaw : companiesRaw.companies;
  console.log(`Found ${rawCompanies.length} companies`);

  let rawProducts: RawProduct[] = [];
  if (PRODUCTS_FILE) {
    console.log('Reading products file...');
    const productsRaw = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8'));
    rawProducts = Array.isArray(productsRaw) ? productsRaw : (productsRaw.products ?? []);
    console.log(`Found ${rawProducts.length} products`);
  } else {
    console.log('No products file specified, skipping products.');
  }

  // Transform companies (all companies are now imported, non-MENA countries set to null)
  console.log('\nTransforming data...');
  const transformedCompanies: TransformedCompany[] = rawCompanies.map(raw => transformCompany(raw));

  // Create a map for quick lookup
  const companyMap = new Map<string, TransformedCompany>();
  for (const company of transformedCompanies) {
    companyMap.set(company.company_id, company);
  }

  // Merge products into companies
  let productsMerged = 0;
  let productsOrphaned = 0;

  for (const rawProduct of rawProducts) {
    const company = companyMap.get(rawProduct.company_id);
    if (company) {
      company.products.push(transformProduct(rawProduct));
      productsMerged++;
    } else {
      productsOrphaned++;
    }
  }

  console.log(`\nTransformation complete:`);
  console.log(`  - Companies to import: ${transformedCompanies.length}`);
  console.log(`  - Products merged: ${productsMerged}`);
  console.log(`  - Products orphaned (company not found): ${productsOrphaned}`);

  // Login as admin
  console.log('\nLogging in as admin...');
  const adminToken = await loginAdmin();
  console.log('Login successful!');

  // Import companies
  const result = await importCompanies(transformedCompanies, adminToken);

  console.log('\n=== Import Results ===');
  console.log(result.message);
  if (result.results.errors.length > 0) {
    console.log('\nErrors:');
    for (const error of result.results.errors) {
      console.log(`  - ${error}`);
    }
  }

  console.log('\n=== Done ===');
  console.log(`Successfully imported: ${result.results.success} companies`);
  console.log(`Failed: ${result.results.failed} companies`);
}

main().catch(console.error);
