'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SwitchRow } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toaster';
import { ImageUploader } from '@/components/admin/ImageUploader';
import type { Store } from '@/lib/supabase/database.types';

type Mode = 'create' | 'edit';

export function StoreForm({
  store,
  mode,
}: {
  store?: Store | null;
  mode: Mode;
}) {
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = React.useState({
    name: store?.name ?? '',
    slug: store?.slug ?? '',
    store_code: store?.store_code ?? '',
    description: store?.description ?? '',
    logo_url: store?.logo_url ?? '',
    cover_image_url: store?.cover_image_url ?? '',
    phone: store?.phone ?? '',
    whatsapp_phone: store?.whatsapp_phone ?? '',
    email: store?.email ?? '',
    city: store?.city ?? '',
    address: store?.address ?? '',
    category: store?.category ?? 'פיצריה',
    kosher_type: store?.kosher_type ?? 'כשר',
    accepts_delivery: store?.accepts_delivery ?? true,
    accepts_pickup: store?.accepts_pickup ?? true,
    minimum_order: store?.minimum_order ?? 50,
    default_delivery_fee: store?.default_delivery_fee ?? 18,
    estimated_preparation_minutes: store?.estimated_preparation_minutes ?? 25,
    is_active: store?.is_active ?? true,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  const setF = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.name) e.name = 'שם חנות חובה';
    if (!form.slug) e.slug = 'Slug חובה';
    if (form.slug && !/^[a-z0-9-]+$/.test(form.slug)) e.slug = 'אותיות לטיניות, ספרות ומקפים בלבד';
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    const endpoint = '/api/admin/stores';
    const init: RequestInit = {
      method: mode === 'create' ? 'POST' : 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(mode === 'create' ? form : { id: store?.id, ...form }),
    };
    const res = await fetch(endpoint, init);
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast(json.error ?? 'שגיאה בשמירה', 'error');
      return;
    }
    toast(mode === 'create' ? 'החנות נוצרה' : 'השינויים נשמרו');
    router.push(`/admin/stores/${json.store.id}`);
    router.refresh();
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-title">{mode === 'create' ? 'חנות חדשה' : 'הגדרות חנות'}</div>
          <div className="page-head-sub">{mode === 'create' ? 'פרטים בסיסיים — תוכל לערוך אותם בכל עת' : form.name}</div>
        </div>
        <div className="page-head-actions">
          <Button variant="ghost" onClick={() => router.back()}>ביטול</Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? '...' : mode === 'create' ? 'שמור חנות' : 'שמור שינויים'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-[2fr_1fr]">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="זהות החנות">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <Field label="שם חנות" required error={errors.name}>
                <Input value={form.name} onChange={(e) => setF('name', e.target.value)} placeholder='לדוגמה: "פיצה נאפולי"' error={!!errors.name} />
              </Field>
              <Field label="קטגוריה">
                <Select value={form.category} onChange={(e) => setF('category', e.target.value)}>
                  <option>פיצריה</option>
                  <option>המבורגרים</option>
                  <option>סושי</option>
                  <option>אסייתי</option>
                  <option>בית קפה</option>
                  <option>שווארמה</option>
                  <option>אחר</option>
                </Select>
              </Field>
              <Field label="Slug" required error={errors.slug} hint="ישמש בכתובת ה־WhatsApp Flow">
                <div className="input-affix">
                  <span className="input-affix-addon input-affix-addon--start mono">/shop/</span>
                  <input
                    value={form.slug ?? ''}
                    onChange={(e) => setF('slug', e.target.value.replace(/[^a-z0-9-]/g, ''))}
                    placeholder="napoli"
                  />
                </div>
              </Field>
              <Field label="קוד חנות" hint="קוד קצר ללקוחות לחיפוש מהיר">
                <Input
                  value={form.store_code ?? ''}
                  onChange={(e) => setF('store_code', e.target.value.toUpperCase())}
                  placeholder="NAPL"
                />
              </Field>
            </div>
            <div style={{ marginTop: 16 }}>
              <Field label="תיאור">
                <Textarea
                  value={form.description ?? ''}
                  onChange={(e) => setF('description', e.target.value)}
                  placeholder="כמה משפטים שיוצגו ללקוח כשהוא בוחר בחנות..."
                />
              </Field>
            </div>
          </Card>

          <Card title="פרטי קשר ומיקום">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <Field label="טלפון">
                <Input value={form.phone ?? ''} onChange={(e) => setF('phone', e.target.value)} />
              </Field>
              <Field label="WhatsApp">
                <Input
                  value={form.whatsapp_phone ?? ''}
                  onChange={(e) => setF('whatsapp_phone', e.target.value)}
                  placeholder="+972..."
                />
              </Field>
              <Field label="אימייל">
                <Input value={form.email ?? ''} onChange={(e) => setF('email', e.target.value)} type="email" />
              </Field>
              <Field label="עיר">
                <Input value={form.city ?? ''} onChange={(e) => setF('city', e.target.value)} />
              </Field>
              <Field label="כתובת" hint="לאיסוף עצמי">
                <Input value={form.address ?? ''} onChange={(e) => setF('address', e.target.value)} />
              </Field>
              <Field label="סוג כשרות">
                <Select value={form.kosher_type ?? ''} onChange={(e) => setF('kosher_type', e.target.value)}>
                  <option>כשר</option>
                  <option>כשר למהדרין</option>
                  <option>לא כשר</option>
                </Select>
              </Field>
            </div>
          </Card>

          <Card title="הזמנות ומשלוחים">
            <SwitchRow
              label="משלוחים פעילים"
              sub="לקוחות יכולים להזמין עם משלוח לכתובת"
              checked={form.accepts_delivery}
              onChange={(v) => setF('accepts_delivery', v)}
            />
            <SwitchRow
              label="איסוף עצמי פעיל"
              sub="לקוחות יכולים לאסוף בעצמם"
              checked={form.accepts_pickup}
              onChange={(v) => setF('accepts_pickup', v)}
            />
            <div className="divider" />
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              <Field label="מינימום הזמנה">
                <div className="input-affix">
                  <span className="input-affix-addon input-affix-addon--start">₪</span>
                  <input
                    type="number"
                    value={form.minimum_order}
                    onChange={(e) => setF('minimum_order', Number(e.target.value))}
                  />
                </div>
              </Field>
              <Field label="דמי משלוח ברירת מחדל">
                <div className="input-affix">
                  <span className="input-affix-addon input-affix-addon--start">₪</span>
                  <input
                    type="number"
                    value={form.default_delivery_fee}
                    onChange={(e) => setF('default_delivery_fee', Number(e.target.value))}
                  />
                </div>
              </Field>
              <Field label="זמן הכנה משוער">
                <div className="input-affix">
                  <input
                    type="number"
                    value={form.estimated_preparation_minutes}
                    onChange={(e) => setF('estimated_preparation_minutes', Number(e.target.value))}
                  />
                  <span className="input-affix-addon">דקות</span>
                </div>
              </Field>
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {store?.id ? (
            <Card title="מותג">
              <Field label="לוגו" hint="מומלץ 200×200, רקע שקוף">
                <ImageUploader
                  storeId={store.id}
                  kind="logos"
                  value={form.logo_url || null}
                  onChange={(url) => setF('logo_url', url ?? '')}
                  height={120}
                  label="העלה לוגו"
                />
              </Field>
              <div style={{ marginTop: 12 }}>
                <Field label="תמונת קאבר" hint="מומלץ 1200×400">
                  <ImageUploader
                    storeId={store.id}
                    kind="covers"
                    value={form.cover_image_url || null}
                    onChange={(url) => setF('cover_image_url', url ?? '')}
                    height={100}
                    label="העלה קאבר"
                  />
                </Field>
              </div>
            </Card>
          ) : (
            <div
              style={{
                padding: 14,
                background: 'var(--surface-2)',
                border: '1px dashed var(--border-strong)',
                borderRadius: 'var(--r-md)',
                fontSize: 12,
                color: 'var(--text-muted)',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>תמונות מותג</div>
              שמור את החנות תחילה — אחר כך תוכל להעלות לוגו ותמונת קאבר.
            </div>
          )}

          <Card title="סטטוס">
            <SwitchRow
              label="החנות פעילה"
              sub="כשכבוי, הלקוחות לא יראו את החנות בחיפוש"
              checked={form.is_active}
              onChange={(v) => setF('is_active', v)}
            />
          </Card>
          <div
            style={{
              padding: 14,
              background: 'var(--info-soft)',
              borderRadius: 'var(--r-md)',
              fontSize: 12,
              color: 'oklch(35% 0.13 240)',
              border: '1px solid oklch(88% 0.05 240)',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>טיפ</div>
            לאחר השמירה, תוכל להוסיף קטגוריות, מוצרים, תוספות ואזורי משלוח. ה־flow_token של הלקוח ייווצר אוטומטית בכל הזמנה.
          </div>
        </div>
      </div>
    </>
  );
}
