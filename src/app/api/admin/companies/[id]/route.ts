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

  // Rate limiting
  const rateLimitKey = getRateLimitKey('admin', session.adminId);
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.admin);

  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { id } = await params;

  try {
    // Fetch existing company to compare fields
    const { data: existingCompany, error: fetchError } = await supabaseAdmin
      .from('companies')
      .select('name, description, logo')
      .eq('id', id)
      .single();

    if (fetchError || !existingCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const formData = await request.formData();

    const name = getFormString(formData, 'name');
    const company_url = getFormStringOrNull(formData, 'company_url');
    const linkedin_profile = getFormStringOrNull(formData, 'linkedin_profile');
    const description = getFormString(formData, 'description');
    const hq_country = getFormString(formData, 'hq_country');
    const logo = getFormFile(formData, 'logo');
    const removeLogo = getFormString(formData, 'remove_logo') === 'true';
    const logoBgRaw = getFormStringOrNull(formData, 'logo_bg');
    const logoBg = (logoBgRaw === 'white' || logoBgRaw === 'black') ? logoBgRaw : null;
    const productsJson = getFormStringOrNull(formData, 'products');

    // Parse products if provided
    let products: ProductWithId[] = [];
    if (productsJson) {
      try {
        products = parseAndValidateProducts(productsJson) as ProductWithId[];
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid products JSON' }, { status: 400 });
      }
    }

    // Validation
    if (!name || !description || !hq_country) {
      return NextResponse.json({ error: 'Name, description, and headquarters country are required' }, { status: 400 });
    }

    if (!MENA_COUNTRIES.includes(hq_country as typeof MENA_COUNTRIES[number])) {
      return NextResponse.json({ error: 'Invalid country' }, { status: 400 });
    }

    // Detect text changes to trigger embedding regeneration
    const textFieldsChanged =
      existingCompany.name !== name ||
      existingCompany.description !== description;

    // Handle logo
    let logoUrl: string | null | undefined = undefined; // undefined means no change

    if (removeLogo && existingCompany.logo) {
      await deleteLogoByUrl(existingCompany.logo);
      logoUrl = null;
    } else if (logo && logo.size > 0) {
      const logoError = validateLogo(logo);
      if (logoError) {
        return NextResponse.json({ error: logoError }, { status: 400 });
      }

      // Delete old logo if exists
      if (existingCompany.logo) {
        await deleteLogoByUrl(existingCompany.logo);
      }

      try {
        logoUrl = await uploadLogo(logo);
      } catch {
        return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      name,
      company_url: company_url || null,
      linkedin_profile: linkedin_profile || null,
      description,
      hq_country,
      logo_bg: logoBg,
      status: 'approved', // Auto-approve admin changes
      updated_at: new Date().toISOString(),
    };

    if (logoUrl !== undefined) {
      updateData.logo = logoUrl;
    }

    // Regenerate embedding if text fields changed
    if (textFieldsChanged) {
      const embedding = await generateCompanyEmbedding(name, description);
      updateData.embedding = JSON.stringify(embedding);
    }

    // Update company
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

    // Sync products
    if (productsJson !== null) {
      // Get existing products
      const { data: existingProducts } = await supabaseAdmin
        .from('products')
        .select('id, name, description')
        .eq('company_id', id);

      type ExistingProduct = { id: string; name: string; description: string };
      const existingProductIds = new Set((existingProducts || []).map((p: ExistingProduct) => p.id));
      const newProductIds = new Set(products.filter(p => p.id).map(p => p.id));

      // Delete removed products
      const toDelete = Array.from(existingProductIds).filter(pid => !newProductIds.has(pid));
      if (toDelete.length > 0) {
        await supabaseAdmin
          .from('products')
          .delete()
          .in('id', toDelete);
      }

      // Update existing and create new products
      for (const product of products) {
        let productDbId: string | undefined = product.id;

        if (product.id && existingProductIds.has(product.id)) {
          // Check if product text changed
          const existingProduct = (existingProducts || []).find((p: ExistingProduct) => p.id === product.id);
          const productTextChanged = existingProduct &&
            (existingProduct.name !== product.name || existingProduct.description !== product.description);

          const productUpdate: Record<string, unknown> = {
            name: product.name,
            description: product.description,
            updated_at: new Date().toISOString(),
          };

          if (productTextChanged) {
            const productEmbedding = await generateProductEmbedding(product.name, product.description, name);
            productUpdate.embedding = JSON.stringify(productEmbedding);
          }

          await supabaseAdmin
            .from('products')
            .update(productUpdate)
            .eq('id', product.id);
        } else {
          // Create new product
          const productEmbedding = await generateProductEmbedding(product.name, product.description, name);
          const { data: newProduct } = await supabaseAdmin
            .from('products')
            .insert({
              company_id: id,
              name: product.name,
              description: product.description,
              embedding: JSON.stringify(productEmbedding),
            })
            .select('id')
            .single();
          productDbId = newProduct?.id;
        }

        // Upsert or delete classification
        if (productDbId) {
          if (product.tech_category || product.industry) {
            await supabaseAdmin
              .from('product_classification')
              .upsert(
                {
                  product_id: productDbId,
                  company_id: id,
                  tech_category: product.tech_category ?? null,
                  industry: product.industry ?? null,
                },
                { onConflict: 'product_id' }
              );
          } else {
            // Both fields cleared — remove stale classification row
            await supabaseAdmin
              .from('product_classification')
              .delete()
              .eq('product_id', productDbId);
          }
        }
      }
    }

    // Invalidate ISR cache so public page reflects changes immediately
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
