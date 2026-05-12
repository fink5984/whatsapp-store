'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch, SwitchRow } from '@/components/ui/switch';
import { Empty } from '@/components/ui/empty';
import { useToast } from '@/components/ui/toaster';
import { formatCurrencyILS } from '@/lib/pricing';
import type { DeliveryZone } from '@/lib/supabase/database.types';

interface Draft {
  id?: string;
  city: string;
  area_name: string;
  delivery_fee: number;
  minimum_order: number;
  estimated_minutes: number;
  is_active: boolean;
}

export function DeliveryZonesManager({
  storeId,
  initial,
}: {
  storeId: string;
  initial: DeliveryZone[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [list, setList] = React.useState<DeliveryZone[]>(initial);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [busy, setBusy] = React.useState(false);

  const save = async () => {
    if (!draft) return;
    if (!draft.city.trim()) {
      toast('עיר חובה', 'error');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/admin/delivery-zones', {
      method: draft.id ? 'PUT' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...draft, store_id: storeId }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast(json.error ?? 'שגיאה', 'error');
      return;
    }
    if (draft.id) {
      setList((cur) => cur.map((z) => (z.id === draft.id ? json.zone : z)));
    } else {
      setList((cur) => [...cur, json.zone]);
    }
    setDraft(null);
    toast('נשמר');
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!confirm('למחוק את האזור?')) return;
    const res = await fetch(`/api/admin/delivery-zones?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json();
      toast(json.error ?? 'שגיאה', 'error');
      return;
    }
    setList((cur) => cur.filter((z) => z.id !== id));
    toast('האזור נמחק', 'error');
    router.refresh();
  };

  const toggle = async (z: DeliveryZone) => {
    const res = await fetch('/api/admin/delivery-zones', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: z.id, store_id: storeId, is_active: !z.is_active }),
    });
    if (res.ok) {
      setList((cur) => cur.map((x) => (x.id === z.id ? { ...x, is_active: !x.is_active } : x)));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-title">אזורי משלוח</div>
          <div className="page-head-sub">דמי משלוח, מינימום וזמן הגעה משתנים לפי עיר/אזור</div>
        </div>
        <div className="page-head-actions">
          <Button
            variant="primary"
            onClick={() =>
              setDraft({
                city: '',
                area_name: '',
                delivery_fee: 18,
                minimum_order: 50,
                estimated_minutes: 45,
                is_active: true,
              })
            }
          >
            + אזור חדש
          </Button>
        </div>
      </div>

      <Card flush>
        {list.length === 0 ? (
          <Empty title="אין אזורי משלוח" body="הגדר את הערים והאזורים אליהם החנות מבצעת משלוחים" />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>עיר</th><th>אזור</th><th>דמי משלוח</th><th>מינימום</th><th>זמן משלוח</th><th>פעיל</th><th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((z) => (
                <tr key={z.id}>
                  <td className="cell-strong">{z.city}</td>
                  <td>{z.area_name ?? '—'}</td>
                  <td className="cell-strong mono">{formatCurrencyILS(Number(z.delivery_fee))}</td>
                  <td className="mono">{formatCurrencyILS(Number(z.minimum_order))}</td>
                  <td>{z.estimated_minutes} דק׳</td>
                  <td><Switch checked={z.is_active} onChange={() => toggle(z)} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button variant="ghost" size="sm" onClick={() => setDraft({
                        id: z.id,
                        city: z.city,
                        area_name: z.area_name ?? '',
                        delivery_fee: z.delivery_fee,
                        minimum_order: z.minimum_order,
                        estimated_minutes: z.estimated_minutes,
                        is_active: z.is_active,
                      })}>עריכה</Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(z.id)}>מחק</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'עריכת אזור' : 'אזור חדש'}
        footer={
          <>
            <Button variant="primary" onClick={save} disabled={busy}>שמור</Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>ביטול</Button>
          </>
        }
      >
        {draft && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="grid gap-4 grid-cols-2">
              <Field label="עיר" required>
                <Input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
              </Field>
              <Field label="שם האזור" hint="לדוגמה: מרכז, צפון">
                <Input value={draft.area_name} onChange={(e) => setDraft({ ...draft, area_name: e.target.value })} />
              </Field>
              <Field label="דמי משלוח">
                <div className="input-affix">
                  <span className="input-affix-addon input-affix-addon--start">₪</span>
                  <input
                    type="number"
                    value={draft.delivery_fee}
                    onChange={(e) => setDraft({ ...draft, delivery_fee: Number(e.target.value) })}
                  />
                </div>
              </Field>
              <Field label="מינימום הזמנה">
                <div className="input-affix">
                  <span className="input-affix-addon input-affix-addon--start">₪</span>
                  <input
                    type="number"
                    value={draft.minimum_order}
                    onChange={(e) => setDraft({ ...draft, minimum_order: Number(e.target.value) })}
                  />
                </div>
              </Field>
              <Field label="זמן משלוח">
                <div className="input-affix">
                  <input
                    type="number"
                    value={draft.estimated_minutes}
                    onChange={(e) => setDraft({ ...draft, estimated_minutes: Number(e.target.value) })}
                  />
                  <span className="input-affix-addon">דקות</span>
                </div>
              </Field>
            </div>
            <SwitchRow label="פעיל" checked={draft.is_active} onChange={(v) => setDraft({ ...draft, is_active: v })} />
          </div>
        )}
      </Dialog>
    </>
  );
}
