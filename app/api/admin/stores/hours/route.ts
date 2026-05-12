import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

export async function PUT(req: NextRequest) {
  const { supabase } = await requireUser();
  const body = await req.json();
  const storeId = body.store_id as string;
  const hours = body.hours as Array<{
    day_of_week: number;
    open_time: string | null;
    close_time: string | null;
    is_closed: boolean;
  }>;
  if (!storeId || !Array.isArray(hours)) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  // RLS validates ownership; we just upsert all 7 rows
  const rows = hours.map((h) => ({
    store_id: storeId,
    day_of_week: h.day_of_week,
    open_time: h.is_closed ? null : h.open_time,
    close_time: h.is_closed ? null : h.close_time,
    is_closed: h.is_closed,
  }));

  const { error } = await supabase
    .from('store_opening_hours')
    .upsert(rows, { onConflict: 'store_id,day_of_week' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
