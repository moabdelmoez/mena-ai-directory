import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateProductEmbedding } from '@/lib/openai';
import { requireAdmin } from '@/lib/admin-auth';
import { getCompanyById } from '@/lib/search';

async function getProductById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, company_id, name, description, created_at, updated_at')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const product = await getProductById(params.id);

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check for admin session first
  const adminSession = await requireAdmin(request);

  // If not admin, check for user session
  const session = !adminSession ? await getServerSession(authOptions) : null;

  if (!adminSession && !session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session?.user?.id;

  try {
    const product = await getProductById(params.id);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get the parent company to check ownership
    const company = await getCompanyById(product.company_id);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Only company owner or admin can update products
    if (!adminSession && company.submitted_by !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || !description) {
      return NextResponse.json({ error: 'name and description are required' }, { status: 400 });
    }

    // Regenerate embedding if name or description changed
    const embedding = await generateProductEmbedding(name, description, company.name);

    const { data: updatedProduct, error } = await supabaseAdmin
      .from('products')
      .update({
        name,
        description,
        embedding: JSON.stringify(embedding),
      })
      .eq('id', params.id)
      .select('id, company_id, name, description, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Product update error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check for admin session first
  const adminSession = await requireAdmin(request);

  // If not admin, check for user session
  const session = !adminSession ? await getServerSession(authOptions) : null;

  if (!adminSession && !session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session?.user?.id;

  try {
    const product = await getProductById(params.id);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get the parent company to check ownership
    const company = await getCompanyById(product.company_id);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Only company owner or admin can delete products
    if (!adminSession && company.submitted_by !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting product:', error);
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Product deleted' });
  } catch (error) {
    console.error('Product deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
