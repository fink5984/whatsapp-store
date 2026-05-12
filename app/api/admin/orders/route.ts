import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { orderStatusSchema } from '@/lib/validations';

export async function PUT(req: NextRequest) {
  const { supabase } = await requireUser();
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id חובה' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) {
    const parsed = orderStatusSchema.safeParse(body.status);
    if (!parsed.success) {
      return NextResponse.json({ error: 'סטטוס לא חוקי' }, { status: 400 });
    }
    updates.status = parsed.data;
  }
  if (body.payment_status !== undefined) updates.payment_status = body.payment_status;
  if (body.payment_method !== undefined) updates.payment_method = body.payment_method;

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'אין שדות לעדכון' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', body.id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: data });
}
