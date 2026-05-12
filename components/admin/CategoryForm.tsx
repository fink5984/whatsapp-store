'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { SwitchRow } from '@/components/ui/switch';
import { Empty } from '@/components/ui/empty';
import { useToast } from '@/components/ui/toaster';
import type { Category } from '@/lib/supabase/database.types';

interface CategoryWithCount extends Category {
  product_count?: number;
}

interface DraftCategory {
  id?: string;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

export function CategoriesManager({
  storeId,
  initial,
}: {
  storeId: string;
  initial: CategoryWithCount[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [list, setList] = React.useState<CategoryWithCount[]>(initial);
  const [draft, setDraft] = React.useState<DraftCategory | null>(null);
  const [busy, setBusy] = React.useState(false);

  const refresh = () => router.refresh();

  const openNew = () =>
    setDraft({ name: '', description: '', sort_order: list.length + 1, is_active: true });
  const openEdit = (c: CategoryWithCount) =>
    setDraft({
      id: c.id,
      name: c.name,
      description: c.description ?? '',
      sort_order: c.sort_order,
      is_active: c.is_active,
    });

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast('שם חובה', 'error');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/admin/categories', {
      method: draft.id ? 'PUT' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...draft, store_id: storeId }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast(json.error ?? 'שגיאה בשמירה', 'error');
      return;
    }
    toast(draft.id ? 'הקטגוריה עודכנה' : 'הקטגוריה נוצרה');
    setDraft(null);
    refresh();
    if (draft.id) {
      setList((cur) => cur.map((c) => (c.id === draft.id ? { ...c, ...json.category } : c)));
    } else {
      setList((cur) => [...cur, { ...json.category, product_count: 0 }]);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('למחוק את הקטגוריה?')) return;
    const res = await fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json();
      toast(json.error ?? 'שגיאה במחיקה', 'error');
      return;
    }
    setList((cur) => cur.filter((c) => c.id !== id));
    toast('הקטגוריה נמחקה', 'error');
    refresh();
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-title">קטגוריות</div>
          <div className="page-head-sub">סדר את התפריט שלך לחווית לקוח טובה יותר ב־WhatsApp</div>
        </div>
        <div className="page-head-actions">
          <Button variant="primary" onClick={openNew}>+ קטגוריה חדשה</Button>
        </div>
      </div>

      <Card flush>
        {list.length === 0 ? (
          <Empty
            title="אין עדיין קטגוריות"
            body="קטגוריות עוזרות ללקוחות לנווט בקלות בתפריט שלך"
            action={<Button variant="primary" onClick={openNew}>+ קטגוריה ראשונה</Button>}
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>שם</th>
                <th>תיאור</th>
                <th>מוצרים</th>
                <th>סדר</th>
                <th>סטטוס</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...list]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((c) => (
                  <tr key={c.id}>
                    <td className="cell-strong">{c.name}</td>
                    <td className="cell-muted">{c.description ?? '—'}</td>
                    <td className="cell-strong">{c.product_count ?? 0}</td>
                    <td className="mono">{c.sort_order}</td>
                    <td>
                      {c.is_active ? <Badge variant="success" dot>פעיל</Badge> : <Badge dot>מוסתר</Badge>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>עריכה</Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(c.id)}>מחק</Button>
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
        title={draft?.id ? 'עריכת קטגוריה' : 'קטגוריה חדשה'}
        footer={
          <>
            <Button variant="primary" onClick={save} disabled={busy}>שמור</Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>ביטול</Button>
          </>
        }
      >
        {draft && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="שם" required>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label="תיאור">
              <Textarea
                rows={2}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </Field>
            <div className="grid gap-4 grid-cols-2">
              <Field label="סדר תצוגה">
                <Input
                  type="number"
                  value={draft.sort_order}
                  onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
                />
              </Field>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
                <SwitchRow
                  label="פעיל בתפריט"
                  checked={draft.is_active}
                  onChange={(v) => setDraft({ ...draft, is_active: v })}
                />
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
