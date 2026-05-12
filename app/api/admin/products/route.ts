import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { productSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  const { supabase } = await requireUser();
  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid input' }, { status: 400 });
  }
  const { option_group_ids, ...rest } = parsed.data;

  const { data: product, error } = await supabase
    .from('products')
    .insert(rest)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (option_group_ids?.length) {
    const rows = option_group_ids.map((group_id) => ({
      store_id: rest.store_id,
      product_id: product.id,
      group_id,
    }));
    await supabase.from('product_option_groups').insert(rows);
  }
  return NextResponse.json({ product });
}

export async function PUT(req: NextRequest) {
  const { supabase } = await requireUser();
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id חובה' }, { status: 400 });
  const { id, option_group_ids, ...rest } = body;
  const parsed = productSchema.partial().safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid input' }, { status: 400 });
  }
  const { data: product, error } = await supabase
    .from('products')
    .update(parsed.data)
    .eq('id', id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (Array.isArray(option_group_ids)) {
    await supabase.from('product_option_groups').delete().eq('product_id', id);
    if (option_group_ids.length) {
      const rows = option_group_ids.map((group_id: string) => ({
        store_id: product.store_id,
        product_id: id,
        group_id,
      }));
      await supabase.from('product_option_groups').insert(rows);
    }
  }
  return NextResponse.json({ product });
}

export async function DELETE(req: NextRequest) {
  const { supabase } = await requireUser();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id חובה' }, { status: 400 });
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
