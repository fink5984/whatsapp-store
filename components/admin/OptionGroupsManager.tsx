'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { SwitchRow } from '@/components/ui/switch';
import { Empty } from '@/components/ui/empty';
import { useToast } from '@/components/ui/toaster';
import { formatCurrencyILS } from '@/lib/pricing';
import type { Option, OptionGroup } from '@/lib/supabase/database.types';

interface GroupWithOptions extends OptionGroup {
  options: Option[];
}

interface DraftGroup {
  id?: string;
  name: string;
  description: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
  is_active: boolean;
  sort_order?: number;
}

interface DraftOption {
  id?: string;
  group_id: string;
  name: string;
  price_delta: number;
  is_active: boolean;
  sort_order?: number;
}

export function OptionGroupsManager({
  storeId,
  initial,
}: {
  storeId: string;
  initial: GroupWithOptions[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [groups, setGroups] = React.useState<GroupWithOptions[]>(initial);
  const [openId, setOpenId] = React.useState<string | null>(initial[0]?.id ?? null);
  const [groupDraft, setGroupDraft] = React.useState<DraftGroup | null>(null);
  const [optionDraft, setOptionDraft] = React.useState<DraftOption | null>(null);
  const [busy, setBusy] = React.useState(false);

  const saveGroup = async () => {
    if (!groupDraft) return;
    if (!groupDraft.name.trim()) {
      toast('שם חובה', 'error');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/admin/options', {
      method: groupDraft.id ? 'PUT' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'group', ...groupDraft, store_id: storeId }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast(json.error ?? 'שגיאה', 'error');
      return;
    }
    if (groupDraft.id) {
      setGroups((cur) => cur.map((g) => (g.id === groupDraft.id ? { ...g, ...json.group } : g)));
    } else {
      setGroups((cur) => [...cur, { ...json.group, options: [] }]);
      setOpenId(json.group.id);
    }
    setGroupDraft(null);
    toast('נשמר');
    router.refresh();
  };

  const removeGroup = async (id: string) => {
    if (!confirm('למחוק את כל הקבוצה?')) return;
    const res = await fetch(`/api/admin/options?id=${id}&kind=group`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json();
      toast(json.error ?? 'שגיאה', 'error');
      return;
    }
    setGroups((cur) => cur.filter((g) => g.id !== id));
    toast('הקבוצה נמחקה', 'error');
    router.refresh();
  };

  const saveOption = async () => {
    if (!optionDraft) return;
    if (!optionDraft.name.trim()) {
      toast('שם חובה', 'error');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/admin/options', {
      method: optionDraft.id ? 'PUT' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'option', ...optionDraft, store_id: storeId }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast(json.error ?? 'שגיאה', 'error');
      return;
    }
    setGroups((cur) =>
      cur.map((g) => {
        if (g.id !== optionDraft.group_id) return g;
        const exists = g.options.some((o) => o.id === json.option.id);
        return {
          ...g,
          options: exists
            ? g.options.map((o) => (o.id === json.option.id ? json.option : o))
            : [...g.options, json.option],
        };
      }),
    );
    setOptionDraft(null);
    toast('נשמר');
    router.refresh();
  };

  const removeOption = async (gid: string, oid: string) => {
    const res = await fetch(`/api/admin/options?id=${oid}&kind=option`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json();
      toast(json.error ?? 'שגיאה', 'error');
      return;
    }
    setGroups((cur) =>
      cur.map((g) => (g.id === gid ? { ...g, options: g.options.filter((o) => o.id !== oid) } : g)),
    );
    toast('נמחק', 'error');
    router.refresh();
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-title">קבוצות תוספות</div>
          <div className="page-head-sub">קבוצות נשמרות פעם אחת ברמת חנות, ומחוברות לכל מוצר רלוונטי</div>
        </div>
        <div className="page-head-actions">
          <Button
            variant="primary"
            onClick={() =>
              setGroupDraft({
                name: '',
                description: '',
                min_select: 0,
                max_select: 1,
                is_required: false,
                is_active: true,
                sort_order: groups.length + 1,
              })
            }
          >
            + קבוצה חדשה
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {groups.length === 0 && (
          <Card>
            <Empty title="אין עדיין קבוצות תוספות" body="קבוצה לדוגמה: גודל, תוספות, רטבים, סוג בצק" />
          </Card>
        )}
        {groups.map((g) => (
          <div key={g.id} className="option-group-card">
            <div className="option-group-card-head" onClick={() => setOpenId(openId === g.id ? null : g.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{g.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-subtle)', display: 'flex', gap: 8, marginTop: 2 }}>
                    <span>{g.options.length} אפשרויות</span>
                    <span>·</span>
                    <span>בחר {g.min_select}-{g.max_select}</span>
                    {g.is_required && <><span>·</span><Badge variant="warn">חובה</Badge></>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" onClick={() => setGroupDraft({ ...g, description: g.description ?? '' })}>
                  עריכה
                </Button>
                <Button variant="ghost" size="sm" onClick={() => removeGroup(g.id)}>מחק</Button>
                <Button variant="ghost" size="sm" onClick={() => setOpenId(openId === g.id ? null : g.id)}>
                  {openId === g.id ? '▴' : '▾'}
                </Button>
              </div>
            </div>
            {openId === g.id && (
              <div className="option-group-card-body">
                {g.options.map((o) => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', border: '1px solid var(--divider)', borderRadius: 'var(--r-sm)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{o.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>
                        {o.price_delta > 0 ? `+ ${formatCurrencyILS(Number(o.price_delta))}` : 'ללא תוספת מחיר'}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOptionDraft({ id: o.id, group_id: g.id, name: o.name, price_delta: o.price_delta, is_active: o.is_active })}
                    >
                      עריכה
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeOption(g.id, o.id)}>מחק</Button>
                  </div>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setOptionDraft({
                      group_id: g.id,
                      name: '',
                      price_delta: 0,
                      is_active: true,
                      sort_order: g.options.length + 1,
                    })
                  }
                >
                  + הוסף אפשרות
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog
        open={!!groupDraft}
        onClose={() => setGroupDraft(null)}
        title={groupDraft?.id ? 'עריכת קבוצה' : 'קבוצה חדשה'}
        footer={
          <>
            <Button variant="primary" onClick={saveGroup} disabled={busy}>שמור</Button>
            <Button variant="ghost" onClick={() => setGroupDraft(null)}>ביטול</Button>
          </>
        }
      >
        {groupDraft && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="שם הקבוצה" required hint="לדוגמה: גודל / תוספות / רטבים">
              <Input value={groupDraft.name} onChange={(e) => setGroupDraft({ ...groupDraft, name: e.target.value })} />
            </Field>
            <Field label="תיאור">
              <Textarea rows={2} value={groupDraft.description} onChange={(e) => setGroupDraft({ ...groupDraft, description: e.target.value })} />
            </Field>
            <div className="grid gap-4 grid-cols-2">
              <Field label="בחירה מינימלית">
                <Input type="number" value={groupDraft.min_select} onChange={(e) => setGroupDraft({ ...groupDraft, min_select: Number(e.target.value) })} />
              </Field>
              <Field label="בחירה מקסימלית">
                <Input type="number" value={groupDraft.max_select} onChange={(e) => setGroupDraft({ ...groupDraft, max_select: Number(e.target.value) })} />
              </Field>
            </div>
            <SwitchRow label="חובה למילוי" checked={groupDraft.is_required} onChange={(v) => setGroupDraft({ ...groupDraft, is_required: v })} />
            <SwitchRow label="פעיל" checked={groupDraft.is_active} onChange={(v) => setGroupDraft({ ...groupDraft, is_active: v })} />
          </div>
        )}
      </Dialog>

      <Dialog
        open={!!optionDraft}
        onClose={() => setOptionDraft(null)}
        title={optionDraft?.id ? 'עריכת אפשרות' : 'אפשרות חדשה'}
        footer={
          <>
            <Button variant="primary" onClick={saveOption} disabled={busy}>שמור</Button>
            <Button variant="ghost" onClick={() => setOptionDraft(null)}>ביטול</Button>
          </>
        }
      >
        {optionDraft && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="שם" required>
              <Input value={optionDraft.name} onChange={(e) => setOptionDraft({ ...optionDraft, name: e.target.value })} />
            </Field>
            <Field label="תוספת מחיר" hint="0 אם אין תוספת">
              <div className="input-affix">
                <span className="input-affix-addon input-affix-addon--start">₪</span>
                <input
                  type="number"
                  value={optionDraft.price_delta}
                  onChange={(e) => setOptionDraft({ ...optionDraft, price_delta: Number(e.target.value) })}
                />
              </div>
            </Field>
            <SwitchRow label="פעיל" checked={optionDraft.is_active} onChange={(v) => setOptionDraft({ ...optionDraft, is_active: v })} />
          </div>
        )}
      </Dialog>
    </>
  );
}
