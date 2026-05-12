import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { deliveryZoneSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  const { supabase } = await requireUser();
  const parsed = deliveryZoneSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid input' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('delivery_zones')
    .insert(parsed.data)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zone: data });
}

export async function PUT(req: NextRequest) {
  const { supabase } = await requireUser();
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id חובה' }, { status: 400 });
  const { id, ...rest } = body;
  const parsed = deliveryZoneSchema.partial().safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid input' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('delivery_zones')
    .update(parsed.data)
    .eq('id', id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zone: data });
}

export async function DELETE(req: NextRequest) {
  const { supabase } = await requireUser();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id חובה' }, { status: 400 });
  const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
