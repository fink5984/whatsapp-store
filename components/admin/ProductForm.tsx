'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { SwitchRow } from '@/components/ui/switch';
import { Empty } from '@/components/ui/empty';
import { useToast } from '@/components/ui/toaster';
import type { Category, OptionGroup, Product } from '@/lib/supabase/database.types';

interface ProductFormProps {
  storeId: string;
  product?: Product | null;
  categories: Category[];
  optionGroups: (OptionGroup & { option_count: number })[];
  linkedGroupIds: string[];
}

export function ProductForm({ storeId, product, categories, optionGroups, linkedGroupIds }: ProductFormProps) {
  const router = useRouter();
  const toast = useToast();
  const editing = !!product;

  const [form, setForm] = React.useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product?.price ?? 0,
    category_id: product?.category_id ?? categories[0]?.id ?? '',
    sku: product?.sku ?? '',
    badge: product?.badge ?? '',
    is_active: product?.is_active ?? true,
    is_available: product?.is_available ?? true,
    is_featured: product?.is_featured ?? false,
    sort_order: product?.sort_order ?? 1,
    allow_note: product?.allow_note ?? true,
    max_quantity_per_order: product?.max_quantity_per_order ?? 20,
    option_group_ids: linkedGroupIds,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  const setF = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleGroup = (id: string) => {
    setF(
      'option_group_ids',
      form.option_group_ids.includes(id)
        ? form.option_group_ids.filter((g) => g !== id)
        : [...form.option_group_ids, id],
    );
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.name) e.name = 'שם מוצר חובה';
    if (form.price < 0 || Number.isNaN(form.price)) e.price = 'מחיר לא יכול להיות שלילי';
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    const res = await fetch('/api/admin/products', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...form, store_id: storeId, id: product?.id }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast(json.error ?? 'שגיאה בשמירה', 'error');
      return;
    }
    toast(editing ? 'המוצר עודכן' : 'המוצר נוצר');
    router.push(`/admin/stores/${storeId}/products`);
    router.refresh();
  };

  const remove = async () => {
    if (!product) return;
    if (!confirm('למחוק את המוצר?')) return;
    const res = await fetch(`/api/admin/products?id=${product.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json();
      toast(json.error ?? 'שגיאה במחיקה', 'error');
      return;
    }
    toast('המוצר נמחק', 'error');
    router.push(`/admin/stores/${storeId}/products`);
    router.refresh();
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-title">{editing ? 'עריכת מוצר' : 'מוצר חדש'}</div>
          <div className="page-head-sub">{editing ? product?.name : 'הוסף מוצר לתפריט'}</div>
        </div>
        <div className="page-head-actions">
          {editing && (
            <Button variant="danger" onClick={remove}>מחק</Button>
          )}
          <Button variant="ghost" onClick={() => router.push(`/admin/stores/${storeId}/products`)}>ביטול</Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? '...' : 'שמור מוצר'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-[2fr_1fr]">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="פרטים">
            <Field label="שם" required error={errors.name}>
              <Input value={form.name} onChange={(e) => setF('name', e.target.value)} error={!!errors.name} placeholder="פיצה מרגריטה" />
            </Field>
            <div style={{ marginTop: 14 }}>
              <Field label="תיאור" hint="יוצג ללקוח במסך בחירת המוצר ב־WhatsApp">
                <Textarea
                  value={form.description ?? ''}
                  onChange={(e) => setF('description', e.target.value)}
                  placeholder="רוטב עגבניות, מוצרלה, בזיליקום טרי..."
                />
              </Field>
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2" style={{ marginTop: 14 }}>
              <Field label="מחיר בסיס" required error={errors.price}>
                <div className="input-affix">
                  <span className="input-affix-addon input-affix-addon--start">₪</span>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setF('price', Number(e.target.value))}
                  />
                </div>
              </Field>
              <Field label="קטגוריה">
                <Select
                  value={form.category_id ?? ''}
                  onChange={(e) => setF('category_id', e.target.value)}
                >
                  <option value="">— ללא —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="SKU" hint="לניהול מלאי פנימי">
                <Input value={form.sku ?? ''} onChange={(e) => setF('sku', e.target.value)} placeholder="PZA-MRG" />
              </Field>
              <Field label="Badge" hint="הכי נמכר / חדש / חריף">
                <Input value={form.badge ?? ''} onChange={(e) => setF('badge', e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card title="קבוצות תוספות" sub="בחר אילו קבוצות יוצגו במסך התאמת המוצר">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {optionGroups.length === 0 && (
                <Empty title="אין קבוצות תוספות" body="הוסף קבוצות במסך 'תוספות'" />
              )}
              {optionGroups.map((g) => {
                const on = form.option_group_ids.includes(g.id);
                return (
                  <div
                    key={g.id}
                    onClick={() => toggleGroup(g.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'),
                      background: on ? 'var(--accent-soft)' : 'var(--surface)',
                      borderRadius: 'var(--r-md)',
                      cursor: 'pointer',
                      transition: 'all 120ms',
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 3,
                        border: '1.5px solid ' + (on ? 'var(--accent)' : 'var(--border-strong)'),
                        background: on ? 'var(--accent)' : 'transparent',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{g.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>
                        {g.option_count} אפשרויות · {g.is_required ? 'חובה' : 'אופציונלי'} · בחר עד {g.max_select}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="זמינות וסטטוס">
            <SwitchRow label="פעיל" sub="מוצג בתפריט ב־WhatsApp" checked={form.is_active} onChange={(v) => setF('is_active', v)} />
            <SwitchRow label="זמין כעת" sub="ניתן להזמין עכשיו" checked={form.is_available} onChange={(v) => setF('is_available', v)} />
            <SwitchRow label="מומלץ" sub="יוצג בראש הקטגוריה" checked={form.is_featured} onChange={(v) => setF('is_featured', v)} />
            <SwitchRow label="אפשר הערה ללקוח" checked={form.allow_note} onChange={(v) => setF('allow_note', v)} />
          </Card>

          <Card title="הגדרות נוספות">
            <Field label="סדר תצוגה">
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setF('sort_order', Number(e.target.value))}
              />
            </Field>
            <div style={{ marginTop: 12 }}>
              <Field label="כמות מקסימלית להזמנה">
                <Input
                  type="number"
                  value={form.max_quantity_per_order}
                  onChange={(e) => setF('max_quantity_per_order', Number(e.target.value))}
                />
              </Field>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
