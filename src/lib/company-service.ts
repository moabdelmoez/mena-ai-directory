import { supabaseAdmin } from './supabase';
import { generateCompanyEmbedding, generateProductEmbedding } from './openai';
import { generateSlug } from './utils';
import { ProductInput } from '@/types';
import { MENA_COUNTRIES } from '@/constants';

// Safe FormData extraction — validates values are strings, not File objects
export function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (value === null) return '';
  if (typeof value !== 'string') return '';
  return value;
}

export function getFormStringOrNull(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (value === null) return null;
  if (typeof value !== 'string') return null;
  return value;
}

export function getFormFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  if (value === null || typeof value === 'string') return null;
  return value as File;
}

export function getFormStringArray(formData: FormData, key: string): string[] {
  return formData.getAll(key).filter((v): v is string => typeof v === 'string');
}

const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

// Map MIME types to extensions to prevent extension/MIME mismatch attacks
const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export function validateLogo(file: File): string | null {
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    return 'Invalid logo type. Allowed: PNG, JPEG, WebP';
  }
  if (file.size > MAX_LOGO_SIZE) {
    return 'Logo must be less than 2MB';
  }
  return null;
}

export async function uploadLogo(file: File): Promise<string> {
  const ext = MIME_TO_EXT[file.type] || 'png';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('company-logos')
    .upload(fileName, file, { contentType: file.type });

  if (uploadError) {
    throw new Error('Failed to upload logo');
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from('company-logos')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

export async function deleteLogoByUrl(logoUrl: string): Promise<void> {
  const fileName = logoUrl.split('/').pop();
  if (fileName) {
    await supabaseAdmin.storage
      .from('company-logos')
      .remove([fileName]);
  }
}

export function parseAndValidateProducts(productsJson: string): ProductInput[] {
  const parsed = JSON.parse(productsJson);
  if (!Array.isArray(parsed)) {
    throw new Error('Products must be an array');
  }
  for (const product of parsed) {
    if (!product.name || !product.description) {
      throw new Error('Each product must have a name and description');
    }
  }
  return parsed as ProductInput[];
}

const MAX_PRODUCTS_PER_BATCH = 20;

export async function insertProducts(
  companyId: string,
  products: ProductInput[],
  companyName: string
): Promise<string[]> {
  const warnings: string[] = [];

  if (products.length > MAX_PRODUCTS_PER_BATCH) {
    throw new Error(`Too many products: ${products.length}. Maximum ${MAX_PRODUCTS_PER_BATCH} products per request.`);
  }

  const productInserts = await Promise.all(
    products.map(async (product) => {
      const productEmbedding = await generateProductEmbedding(product.name, product.description, companyName);
      return {
        company_id: companyId,
        name: product.name,
        description: product.description,
        product_url: product.product_url || null,
        embedding: JSON.stringify(productEmbedding),
      };
    })
  );

  const { data: insertedProducts, error: productsError } = await supabaseAdmin
    .from('products')
    .insert(productInserts)
    .select('id');

  if (productsError) {
    console.error('Products insert error:', productsError);
    warnings.push('Some products could not be saved');
  }

  // Insert classifications for products that have tech_category or industry
  if (insertedProducts && insertedProducts.length > 0) {
    const classificationInserts = products
      .map((product, index) => {
        if (!product.tech_category && !product.industry) return null;
        const insertedId = insertedProducts[index]?.id;
        if (!insertedId) return null;
        return {
          product_id: insertedId,
          company_id: companyId,
          tech_category: product.tech_category || null,
          industry: product.industry || null,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    if (classificationInserts.length > 0) {
      const { error: classError } = await supabaseAdmin
        .from('product_classification')
        .insert(classificationInserts);

      if (classError) {
        console.error('Product classification insert error:', classError);
        warnings.push('Some product classifications could not be saved');
      }
    }
  }

  return warnings;
}

interface CreateCompanyOptions {
  formData: FormData;
  submittedBy?: string;
  autoApprove: boolean;
  allowLogoBg?: boolean;
}

interface CreateCompanyResult {
  company: Record<string, unknown>;
  warnings: string[];
}

export async function createCompany(opts: CreateCompanyOptions): Promise<CreateCompanyResult> {
  const { formData, submittedBy, autoApprove, allowLogoBg } = opts;

  const name = getFormString(formData, 'name');
  const company_url = getFormStringOrNull(formData, 'company_url');
  const linkedin_profile = getFormStringOrNull(formData, 'linkedin_profile');
  const description = getFormString(formData, 'description');
  const hq_country = getFormString(formData, 'hq_country');
  const logo = getFormFile(formData, 'logo');
  const productsJson = getFormStringOrNull(formData, 'products');

  // Optional logo_bg (admin-only)
  let logoBg: string | null = null;
  if (allowLogoBg) {
    const logoBgRaw = getFormStringOrNull(formData, 'logo_bg');
    logoBg = (logoBgRaw === 'white' || logoBgRaw === 'black') ? logoBgRaw : null;
  }

  // Parse products if provided
  let products: ProductInput[] = [];
  if (productsJson) {
    products = parseAndValidateProducts(productsJson);
  }

  // Validation
  if (!name || !description || !hq_country) {
    throw new CreateCompanyError('Name, description, and headquarters country are required', 400);
  }

  if (!MENA_COUNTRIES.includes(hq_country as typeof MENA_COUNTRIES[number])) {
    throw new CreateCompanyError('Invalid country', 400);
  }

  // Handle logo upload
  let logoUrl: string | null = null;
  if (logo && logo.size > 0) {
    const logoError = validateLogo(logo);
    if (logoError) {
      throw new CreateCompanyError(logoError, 400);
    }
    logoUrl = await uploadLogo(logo);
  }

  // Prefix-filtered slug generation (Phase 3.3)
  const baseSlug = generateSlug(name);
  const { data: matchingSlugs, error: slugError } = await supabaseAdmin
    .from('companies')
    .select('slug')
    .ilike('slug', `${baseSlug}%`);

  if (slugError) {
    console.error('Slug query error:', slugError);
    throw new CreateCompanyError('Failed to generate unique slug', 500);
  }

  const existingSlugs = (matchingSlugs || []).map(s => s.slug);
  let slug = baseSlug;
  let counter = 1;
  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Generate embedding
  const embedding = await generateCompanyEmbedding(name, description);

  // Build insert data
  const insertData: Record<string, unknown> = {
    name,
    slug,
    company_url: company_url || null,
    linkedin_profile: linkedin_profile || null,
    description,
    logo: logoUrl,
    hq_country,
    status: autoApprove ? 'approved' : 'pending',
    embedding: JSON.stringify(embedding),
  };

  if (submittedBy) {
    insertData.submitted_by = submittedBy;
  }

  if (allowLogoBg) {
    insertData.logo_bg = logoBg;
  }

  // Insert company
  const { data: company, error: insertError } = await supabaseAdmin
    .from('companies')
    .insert(insertData)
    .select()
    .single();

  if (insertError) {
    console.error('Insert error:', insertError);
    throw new CreateCompanyError('Failed to create company', 500);
  }

  // Insert products if provided
  const warnings: string[] = [];
  if (products.length > 0 && company) {
    const productWarnings = await insertProducts(company.id, products, name);
    warnings.push(...productWarnings);
  }

  return { company, warnings };
}

export class CreateCompanyError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
