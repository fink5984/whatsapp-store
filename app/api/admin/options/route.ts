import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { optionGroupSchema, optionSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  const { supabase } = await requireUser();
  const body = await req.json();
  if (body.kind === 'group') {
    const parsed = optionGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid input' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('option_groups')
      .insert(parsed.data)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ group: data });
  }
  if (body.kind === 'option') {
    const parsed = optionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid input' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('options')
      .insert(parsed.data)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ option: data });
  }
  return NextResponse.json({ error: 'kind required' }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  const { supabase } = await requireUser();
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id חובה' }, { status: 400 });
  if (body.kind === 'group') {
    const { id, kind, ...rest } = body;
    const parsed = optionGroupSchema.partial().safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid input' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('option_groups')
      .update(parsed.data)
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ group: data });
  }
  if (body.kind === 'option') {
    const { id, kind, ...rest } = body;
    const parsed = optionSchema.partial().safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid input' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('options')
      .update(parsed.data)
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ option: data });
  }
  return NextResponse.json({ error: 'kind required' }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const { supabase } = await requireUser();
  const id = req.nextUrl.searchParams.get('id');
  const kind = req.nextUrl.searchParams.get('kind');
  if (!id || !kind) return NextResponse.json({ error: 'id+kind חובה' }, { status: 400 });
  const table = kind === 'group' ? 'option_groups' : 'options';
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
