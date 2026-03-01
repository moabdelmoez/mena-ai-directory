import { supabaseAdmin } from './supabase';
import { generateProductEmbedding } from './openai';
import { ProductInput } from '@/types';

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

export async function insertProducts(
  companyId: string,
  products: ProductInput[],
  companyName: string
): Promise<string[]> {
  const warnings: string[] = [];

  const productInserts = await Promise.all(
    products.map(async (product) => {
      const productEmbedding = await generateProductEmbedding(product.name, product.description, companyName);
      return {
        company_id: companyId,
        name: product.name,
        description: product.description,
        embedding: JSON.stringify(productEmbedding),
      };
    })
  );

  const { error: productsError } = await supabaseAdmin
    .from('products')
    .insert(productInserts);

  if (productsError) {
    console.error('Products insert error:', productsError);
    warnings.push('Some products could not be saved');
  }

  return warnings;
}
