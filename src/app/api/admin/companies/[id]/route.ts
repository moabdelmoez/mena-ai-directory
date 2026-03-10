import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { COMPANY_COLUMNS, getCompanyProducts } from '@/lib/company-repository';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';
import { generateCompanyEmbedding, generateProductEmbedding } from '@/lib/openai';
import { MENA_COUNTRIES } from '@/constants';
import { ProductInput } from '@/types';
import { validateLogo, uploadLogo, deleteLogoByUrl, parseAndValidateProducts, getFormString, getFormStringOrNull, getFormFile } from '@/lib/company-service';

interface ProductWithId extends ProductInput {
  id?: string;
  tech_category?: string | null;
  industry?: string | null;
}

interface ParsedFormData {
  name: string;
  company_url: string | null;
  linkedin_profile: string | null;
  description: string;
  hq_country: string;
  logo: File | null;
  removeLogo: boolean;
  logoBg: 'white' | 'black' | null;
  products: ProductWithId[];
}

type ExistingProduct = { id: string; name: string; description: string };

function parseFormData(formData: FormData): { data?: ParsedFormData; error?: string } {
  const name = getFormString(formData, 'name');
  const description = getFormString(formData, 'description');
  const hq_country = getFormString(formData, 'hq_country');

  if (!name || !description || !hq_country) {
    return { error: 'Name, description, and headquarters country are required' };
  }

  if (!MENA_COUNTRIES.includes(hq_country as typeof MENA_COUNTRIES[number])) {
    return { error: 'Invalid country' };
  }

  const productsJson = getFormStringOrNull(formData, 'products');
  let products: ProductWithId[] = [];
  if (productsJson) {
    try {
      products = parseAndValidateProducts(productsJson) as ProductWithId[];
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Invalid products JSON' };
    }
  }

  const logoBgRaw = getFormStringOrNull(formData, 'logo_bg');

  return {
    data: {
      name,
      company_url: getFormStringOrNull(formData, 'company_url'),
      linkedin_profile: getFormStringOrNull(formData, 'linkedin_profile'),
      description,
      hq_country,
      logo: getFormFile(formData, 'logo'),
      removeLogo: getFormString(formData, 'remove_logo') === 'true',
      logoBg: (logoBgRaw === 'white' || logoBgRaw === 'black') ? logoBgRaw : null,
      products,
    },
  };
}

async function resolveLogoUrl(
  logo: File | null,
  removeLogo: boolean,
  existingLogoUrl: string | null
): Promise<{ url?: string | null; error?: string }> {
  if (removeLogo && existingLogoUrl) {
    await deleteLogoByUrl(existingLogoUrl);
    return { url: null };
  }

  if (!logo || logo.size === 0) {
    return {}; // no change
  }

  const logoError = validateLogo(logo);
  if (logoError) {
    return { error: logoError };
  }

  if (existingLogoUrl) {
    await deleteLogoByUrl(existingLogoUrl);
  }

  try {
    return { url: await uploadLogo(logo) };
  } catch {
    return { error: 'Failed to upload logo' };
  }
}

function buildCompanyUpdate(
  fields: ParsedFormData,
  logoUrl: string | null | undefined,
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {
    name: fields.name,
    company_url: fields.company_url || null,
    linkedin_profile: fields.linkedin_profile || null,
    description: fields.description,
    hq_country: fields.hq_country,
    logo_bg: fields.logoBg,
    status: 'approved',
    updated_at: new Date().toISOString(),
  };

  if (logoUrl !== undefined) {
    updateData.logo = logoUrl;
  }

  return updateData;
}

async function syncProducts(
  companyId: string,
  companyName: string,
  products: ProductWithId[],
): Promise<void> {
  const { data: existingProducts } = await supabaseAdmin
    .from('products')
    .select('id, name, description')
    .eq('company_id', companyId);

  const existingMap = new Map<string, ExistingProduct>(
    (existingProducts || []).map((p: ExistingProduct) => [p.id, p])
  );
  const newProductIds = new Set(products.filter(p => p.id).map(p => p.id));

  // Delete removed products
  const toDelete = Array.from(existingMap.keys()).filter((pid: string) => !newProductIds.has(pid));
  if (toDelete.length > 0) {
    await supabaseAdmin.from('products').delete().in('id', toDelete);
  }

  for (const product of products) {
    const dbId = await upsertProduct(product, companyId, companyName, existingMap);
    if (dbId) {
      await syncClassification(dbId, companyId, product);
    }
  }
}

async function upsertProduct(
  product: ProductWithId,
  companyId: string,
  companyName: string,
  existingMap: Map<string, ExistingProduct>,
): Promise<string | undefined> {
  if (product.id && existingMap.has(product.id)) {
    return updateExistingProduct(product, companyName, existingMap.get(product.id)!);
  }
  return createNewProduct(product, companyId, companyName);
}

async function updateExistingProduct(
  product: ProductWithId,
  companyName: string,
  existing: ExistingProduct,
): Promise<string> {
  const textChanged = existing.name !== product.name || existing.description !== product.description;
  const productUpdate: Record<string, unknown> = {
    name: product.name,
    description: product.description,
    updated_at: new Date().toISOString(),
  };

  if (textChanged) {
    const embedding = await generateProductEmbedding(product.name, product.description, companyName);
    productUpdate.embedding = JSON.stringify(embedding);
  }

  await supabaseAdmin.from('products').update(productUpdate).eq('id', product.id!);
  return product.id!;
}

async function createNewProduct(
  product: ProductWithId,
  companyId: string,
  companyName: string,
): Promise<string | undefined> {
  const embedding = await generateProductEmbedding(product.name, product.description, companyName);
  const { data: newProduct } = await supabaseAdmin
    .from('products')
    .insert({
      company_id: companyId,
      name: product.name,
      description: product.description,
      embedding: JSON.stringify(embedding),
    })
    .select('id')
    .single();
  return newProduct?.id;
}

async function syncClassification(
  productDbId: string,
  companyId: string,
  product: ProductWithId,
): Promise<void> {
  if (product.tech_category || product.industry) {
    await supabaseAdmin
      .from('product_classification')
      .upsert(
        {
          product_id: productDbId,
          company_id: companyId,
          tech_category: product.tech_category ?? null,
          industry: product.industry ?? null,
        },
        { onConflict: 'product_id' }
      );
  } else {
    await supabaseAdmin
      .from('product_classification')
      .delete()
      .eq('product_id', productDbId);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { data: company, error } = await supabaseAdmin
    .from('companies')
    .select(COMPANY_COLUMNS)
    .eq('id', id)
    .single();

  if (error || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  // Fetch products with classifications (two-step: products then product_classification)
  const companyProducts = await getCompanyProducts(id);
  const productsWithClassification = companyProducts.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    product_url: p.product_url,
    tech_category: p.tech_category ?? null,
    industry: p.industry ?? null,
  }));

  return NextResponse.json({ ...company, products: productsWithClassification });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = checkRateLimit(getRateLimitKey('admin', session.adminId), RATE_LIMITS.admin);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { id } = await params;

  try {
    const { data: existingCompany, error: fetchError } = await supabaseAdmin
      .from('companies')
      .select('name, description, logo')
      .eq('id', id)
      .single();

    if (fetchError || !existingCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const parsed = parseFormData(formData);
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const fields = parsed.data!;

    const logoResult = await resolveLogoUrl(fields.logo, fields.removeLogo, existingCompany.logo);
    if (logoResult.error) {
      return NextResponse.json({ error: logoResult.error }, { status: 400 });
    }

    const updateData = buildCompanyUpdate(fields, logoResult.url);
    const textFieldsChanged = existingCompany.name !== fields.name || existingCompany.description !== fields.description;
    if (textFieldsChanged) {
      updateData.embedding = JSON.stringify(await generateCompanyEmbedding(fields.name, fields.description));
    }

    const { data: company, error: updateError } = await supabaseAdmin
      .from('companies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
    }

    const productsJson = getFormStringOrNull(formData, 'products');
    if (productsJson !== null) {
      await syncProducts(id, fields.name, fields.products);
    }

    revalidatePath('/company/' + company.slug);
    return NextResponse.json(company);
  } catch (error) {
    console.error('Update company error:', error);
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin(request);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Fetch company to get logo URL
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('logo')
    .eq('id', id)
    .single();

  // Delete logo from storage if exists
  if (company?.logo) {
    await deleteLogoByUrl(company.logo);
  }

  // Delete products first (foreign key constraint)
  await supabaseAdmin
    .from('products')
    .delete()
    .eq('company_id', id);

  // Delete company
  const { error } = await supabaseAdmin
    .from('companies')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Company deleted' });
}
