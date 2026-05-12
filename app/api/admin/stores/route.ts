import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { storeSchema } from '@/lib/validations';

export async function GET() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from('stores').select('*').order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stores: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { user, supabase } = await requireUser();
  const body = await req.json();
  const parsed = storeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid input' }, { status: 400 });
  }

  // unique slug check
  const { data: clash } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', parsed.data.slug)
    .maybeSingle();
  if (clash) return NextResponse.json({ error: 'Slug כבר קיים' }, { status: 409 });

  const { data, error } = await supabase
    .from('stores')
    .insert({ ...parsed.data, owner_id: user.id })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ store: data });
}

export async function PUT(req: NextRequest) {
  const { supabase } = await requireUser();
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id חובה' }, { status: 400 });
  const { id, owner_id, created_at, updated_at, ...rest } = body;
  const parsed = storeSchema.partial().safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid input' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('stores')
    .update(parsed.data)
    .eq('id', id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ store: data });
}

export async function DELETE(req: NextRequest) {
  const { supabase } = await requireUser();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id חובה' }, { status: 400 });
  const { error } = await supabase.from('stores').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
