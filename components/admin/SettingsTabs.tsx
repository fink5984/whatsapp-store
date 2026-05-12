'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea, Select } from '@/components/ui/input';
import { Switch, SwitchRow } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toaster';
import type { Store, StoreOpeningHours, StoreNotification } from '@/lib/supabase/database.types';

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export function SettingsTabs({
  store: initialStore,
  hours: initialHours,
  notifications: initialNotifications,
}: {
  store: Store;
  hours: StoreOpeningHours[];
  notifications: StoreNotification[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = React.useState<'general' | 'hours' | 'notifications' | 'flow'>('general');
  const [store, setStore] = React.useState(initialStore);
  const [hours, setHours] = React.useState(initialHours);
  const [notifications, setNotifications] = React.useState(initialNotifications);
  const [busy, setBusy] = React.useState(false);

  const saveGeneral = async () => {
    setBusy(true);
    const res = await fetch('/api/admin/stores', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: store.id,
        name: store.name,
        slug: store.slug,
        store_code: store.store_code,
        description: store.description,
        phone: store.phone,
        whatsapp_phone: store.whatsapp_phone,
        email: store.email,
        city: store.city,
        address: store.address,
        category: store.category,
        kosher_type: store.kosher_type,
        is_active: store.is_active,
        accepts_delivery: store.accepts_delivery,
        accepts_pickup: store.accepts_pickup,
        minimum_order: store.minimum_order,
        default_delivery_fee: store.default_delivery_fee,
        estimated_preparation_minutes: store.estimated_preparation_minutes,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      toast('שגיאה בשמירה', 'error');
      return;
    }
    toast('ההגדרות נשמרו');
    router.refresh();
  };

  const saveHours = async () => {
    setBusy(true);
    const res = await fetch('/api/admin/stores/hours', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ store_id: store.id, hours }),
    });
    setBusy(false);
    if (!res.ok) {
      toast('שגיאה בשמירה', 'error');
      return;
    }
    toast('שעות הפעילות נשמרו');
    router.refresh();
  };

  const setS = <K extends keyof Store>(k: K, v: Store[K]) => setStore((s) => ({ ...s, [k]: v }));

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-title">הגדרות חנות</div>
          <div className="page-head-sub">{store.name}</div>
        </div>
      </div>

      <div className="tabs">
        {[
          { k: 'general', l: 'כללי' },
          { k: 'hours', l: 'שעות פעילות' },
          { k: 'notifications', l: 'התראות' },
          { k: 'flow', l: 'WhatsApp Flow' },
        ].map((t) => (
          <button
            key={t.k}
            className="tab"
            data-active={tab === t.k ? 'true' : 'false'}
            onClick={() => setTab(t.k as typeof tab)}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="grid gap-4 grid-cols-1 xl:grid-cols-[2fr_1fr]">
          <Card
            title="פרטי העסק"
            action={<Button variant="primary" onClick={saveGeneral} disabled={busy}>שמור שינויים</Button>}
          >
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <Field label="שם"><Input value={store.name} onChange={(e) => setS('name', e.target.value)} /></Field>
              <Field label="קטגוריה"><Input value={store.category ?? ''} onChange={(e) => setS('category', e.target.value)} /></Field>
              <Field label="טלפון"><Input value={store.phone ?? ''} onChange={(e) => setS('phone', e.target.value)} /></Field>
              <Field label="WhatsApp"><Input value={store.whatsapp_phone ?? ''} onChange={(e) => setS('whatsapp_phone', e.target.value)} /></Field>
              <Field label="עיר"><Input value={store.city ?? ''} onChange={(e) => setS('city', e.target.value)} /></Field>
              <Field label="כתובת"><Input value={store.address ?? ''} onChange={(e) => setS('address', e.target.value)} /></Field>
              <Field label="כשרות">
                <Select value={store.kosher_type ?? 'כשר'} onChange={(e) => setS('kosher_type', e.target.value)}>
                  <option>כשר</option><option>כשר למהדרין</option><option>לא כשר</option>
                </Select>
              </Field>
              <Field label="קוד חנות"><Input value={store.store_code ?? ''} onChange={(e) => setS('store_code', e.target.value.toUpperCase())} /></Field>
            </div>
            <div className="divider" />
            <Field label="תיאור">
              <Textarea value={store.description ?? ''} onChange={(e) => setS('description', e.target.value)} />
            </Field>
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card title="זמינות">
              <SwitchRow label="חנות פעילה" sub="כשכבוי, הלקוחות לא יראו את החנות" checked={store.is_active} onChange={(v) => setS('is_active', v)} />
              <SwitchRow label="משלוחים" checked={store.accepts_delivery} onChange={(v) => setS('accepts_delivery', v)} />
              <SwitchRow label="איסוף עצמי" checked={store.accepts_pickup} onChange={(v) => setS('accepts_pickup', v)} />
            </Card>
            <Card title="פיננסי">
              <Field label="מינימום הזמנה">
                <div className="input-affix">
                  <span className="input-affix-addon input-affix-addon--start">₪</span>
                  <input type="number" value={store.minimum_order} onChange={(e) => setS('minimum_order', Number(e.target.value))} />
                </div>
              </Field>
              <div style={{ marginTop: 12 }}>
                <Field label="זמן הכנה משוער">
                  <div className="input-affix">
                    <input type="number" value={store.estimated_preparation_minutes} onChange={(e) => setS('estimated_preparation_minutes', Number(e.target.value))} />
                    <span className="input-affix-addon">דקות</span>
                  </div>
                </Field>
              </div>
              <div style={{ marginTop: 12 }}>
                <Field label="דמי משלוח ברירת מחדל">
                  <div className="input-affix">
                    <span className="input-affix-addon input-affix-addon--start">₪</span>
                    <input type="number" value={store.default_delivery_fee} onChange={(e) => setS('default_delivery_fee', Number(e.target.value))} />
                  </div>
                </Field>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'hours' && (
        <Card
          title="שעות פעילות שבועיות"
          sub="שעות הפעילות ייבדקו אוטומטית בכל הזמנה"
          action={<Button variant="primary" onClick={saveHours} disabled={busy}>שמור</Button>}
        >
          {hours.map((h, i) => (
            <div key={i} className="day-hours-row">
              <div className="day-hours-row-name">{DAY_NAMES[h.day_of_week]}</div>
              <input
                className="input"
                type="time"
                value={h.open_time ?? ''}
                disabled={h.is_closed}
                onChange={(e) =>
                  setHours((cur) => cur.map((x, idx) => (idx === i ? { ...x, open_time: e.target.value } : x)))
                }
              />
              <input
                className="input"
                type="time"
                value={h.close_time ?? ''}
                disabled={h.is_closed}
                onChange={(e) =>
                  setHours((cur) => cur.map((x, idx) => (idx === i ? { ...x, close_time: e.target.value } : x)))
                }
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>סגור</span>
                <Switch
                  checked={h.is_closed}
                  onChange={(v) =>
                    setHours((cur) => cur.map((x, idx) => (idx === i ? { ...x, is_closed: v } : x)))
                  }
                />
              </div>
            </div>
          ))}
        </Card>
      )}

      {tab === 'notifications' && (
        <NotificationsEditor storeId={store.id} initial={notifications} onChange={setNotifications} />
      )}

      {tab === 'flow' && (
        <Card title="הגדרות WhatsApp Flow" sub="המידע משמש לחיבור ה־Endpoint למטא">
          <Field label="Flow Endpoint URL" hint="הזן ב־Meta WhatsApp Manager">
            <Input value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/whatsapp/flow`} disabled />
          </Field>
          <div style={{ marginTop: 14 }}>
            <Field label="Store ID (לזיהוי בקריאות)">
              <Input value={store.id} disabled className="mono" />
            </Field>
          </div>
          <div
            style={{
              marginTop: 14,
              padding: 12,
              background: 'var(--info-soft)',
              borderRadius: 'var(--r-md)',
              fontSize: 12,
              border: '1px solid oklch(88% 0.05 240)',
              color: 'oklch(35% 0.13 240)',
            }}
          >
            <strong>טיפ:</strong> ה־Private Key לפענוח לא מאוחסן בחנות אלא ב־env של השרת
            (<code className="mono">WHATSAPP_FLOW_PRIVATE_KEY</code>).
          </div>
        </Card>
      )}
    </>
  );
}

function NotificationsEditor({
  storeId,
  initial,
  onChange,
}: {
  storeId: string;
  initial: StoreNotification[];
  onChange: (n: StoreNotification[]) => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [list, setList] = React.useState<StoreNotification[]>(initial);
  const [newDraft, setNewDraft] = React.useState({ channel: 'webhook', target: '' });
  const [busy, setBusy] = React.useState(false);

  const add = async () => {
    if (!newDraft.target.trim()) return;
    setBusy(true);
    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ store_id: storeId, channel: newDraft.channel, target: newDraft.target, is_active: true }),
    });
    setBusy(false);
    if (!res.ok) {
      toast('שגיאה', 'error');
      return;
    }
    const json = await res.json();
    setList((cur) => [...cur, json.notification]);
    onChange([...list, json.notification]);
    setNewDraft({ channel: 'webhook', target: '' });
    router.refresh();
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/admin/notifications?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      const next = list.filter((n) => n.id !== id);
      setList(next);
      onChange(next);
      router.refresh();
    }
  };

  const toggle = async (n: StoreNotification) => {
    const res = await fetch('/api/admin/notifications', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: n.id, is_active: !n.is_active }),
    });
    if (res.ok) {
      const next = list.map((x) => (x.id === n.id ? { ...x, is_active: !x.is_active } : x));
      setList(next);
      onChange(next);
    }
  };

  return (
    <Card title="לאן לשלוח התראות על הזמנות חדשות" sub="כל הזמנה חדשה תפעיל התראה לאפיקים הפעילים">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map((n) => (
          <div
            key={n.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{n.channel}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-subtle)' }} className="mono">{n.target}</div>
            </div>
            <Switch checked={n.is_active} onChange={() => toggle(n)} />
            <Button variant="ghost" size="sm" onClick={() => remove(n.id)}>מחק</Button>
          </div>
        ))}
        <div className="divider" />
        <div style={{ display: 'flex', gap: 8 }}>
          <Select
            value={newDraft.channel}
            onChange={(e) => setNewDraft({ ...newDraft, channel: e.target.value })}
            style={{ width: 160 }}
          >
            <option value="webhook">Webhook</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">אימייל</option>
            <option value="sms">SMS</option>
          </Select>
          <Input
            placeholder={newDraft.channel === 'webhook' ? 'https://...' : newDraft.channel === 'email' ? 'someone@example.com' : '+972...'}
            value={newDraft.target}
            onChange={(e) => setNewDraft({ ...newDraft, target: e.target.value })}
          />
          <Button variant="primary" onClick={add} disabled={busy}>+ הוסף</Button>
        </div>
      </div>
    </Card>
  );
}
