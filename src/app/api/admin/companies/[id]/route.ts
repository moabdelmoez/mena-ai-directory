import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';
import { generateCompanyEmbedding, generateProductEmbedding } from '@/lib/openai';
import { MENA_COUNTRIES } from '@/constants';
import { ProductInput } from '@/types';
import { validateLogo, uploadLogo, deleteLogoByUrl, parseAndValidateProducts, getFormString, getFormStringOrNull, getFormFile, getFormStringArray } from '@/lib/company-service';

interface ProductWithId extends ProductInput {
  id?: string;
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

  // Select specific columns to exclude embedding vectors
  const companyColumns = 'id, company_id, name, slug, website, description, logo, derived_capabilities, domain_verticals, hq_country, hq_region, ai_infrastructure, ai_platform, scrape_confidence, status, submitted_by, created_at, updated_at';

  const { data: company, error } = await supabaseAdmin
    .from('companies')
    .select(companyColumns)
    .eq('id', id)
    .single();

  if (error || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  // Fetch products for this company
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, description, category, capabilities, use_cases, target_customers, deployment, maturity, pricing_model')
    .eq('company_id', id);

  return NextResponse.json({ ...company, products: products || [] });
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
      .select('name, description, derived_capabilities, domain_verticals, ai_infrastructure, ai_platform, logo')
      .eq('id', id)
      .single();

    if (fetchError || !existingCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const formData = await request.formData();

    const name = getFormString(formData, 'name');
    const website = getFormStringOrNull(formData, 'website');
    const description = getFormString(formData, 'description');
    const derived_capabilities = getFormStringArray(formData, 'derived_capabilities');
    const domain_verticals = getFormStringArray(formData, 'domain_verticals');
    const hq_country = getFormString(formData, 'hq_country');
    const hq_region = getFormStringOrNull(formData, 'hq_region');
    const ai_infrastructure = getFormString(formData, 'ai_infrastructure') === 'true';
    const ai_platform = getFormString(formData, 'ai_platform') === 'true';
    const logo = getFormFile(formData, 'logo');
    const removeLogo = getFormString(formData, 'remove_logo') === 'true';
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
      existingCompany.description !== description ||
      JSON.stringify(existingCompany.derived_capabilities) !== JSON.stringify(derived_capabilities) ||
      JSON.stringify(existingCompany.domain_verticals) !== JSON.stringify(domain_verticals) ||
      existingCompany.ai_infrastructure !== ai_infrastructure ||
      existingCompany.ai_platform !== ai_platform;

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
      website: website || null,
      description,
      derived_capabilities,
      domain_verticals,
      hq_country,
      hq_region: hq_region || null,
      ai_infrastructure,
      ai_platform,
      status: 'approved', // Auto-approve admin changes
      updated_at: new Date().toISOString(),
    };

    if (logoUrl !== undefined) {
      updateData.logo = logoUrl;
    }

    // Regenerate embedding if text fields changed
    if (textFieldsChanged) {
      const embedding = await generateCompanyEmbedding(
        name,
        description,
        derived_capabilities,
        domain_verticals,
        ai_infrastructure,
        ai_platform
      );
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
        if (product.id && existingProductIds.has(product.id)) {
          // Check if product text changed
          const existingProduct = (existingProducts || []).find((p: ExistingProduct) => p.id === product.id);
          const productTextChanged = existingProduct &&
            (existingProduct.name !== product.name || existingProduct.description !== product.description);

          const productUpdate: Record<string, unknown> = {
            name: product.name,
            description: product.description,
            category: product.category || null,
            capabilities: product.capabilities || [],
            use_cases: product.use_cases || [],
            target_customers: product.target_customers || [],
            deployment: product.deployment || [],
            maturity: product.maturity || null,
            pricing_model: product.pricing_model || null,
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
          await supabaseAdmin
            .from('products')
            .insert({
              company_id: id,
              name: product.name,
              description: product.description,
              category: product.category || null,
              capabilities: product.capabilities || [],
              use_cases: product.use_cases || [],
              target_customers: product.target_customers || [],
              deployment: product.deployment || [],
              maturity: product.maturity || null,
              pricing_model: product.pricing_model || null,
              embedding: JSON.stringify(productEmbedding),
            });
        }
      }
    }

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
