'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { initials } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ToastProvider } from '@/components/ui/toaster';

interface ShellStore {
  id: string;
  name: string;
  city: string | null;
  category: string | null;
  is_active: boolean;
}

interface AdminShellProps {
  user: { email?: string | null; full_name?: string | null };
  stores: ShellStore[];
  activeStoreId?: string | null;
  ordersTodayCount?: number;
  children: React.ReactNode;
}

const GLOBAL_NAV = [
  { key: 'dashboard', label: 'Dashboard', href: '/admin' },
  { key: 'stores', label: 'כל החנויות', href: '/admin/stores' },
];

const STORE_NAV = (storeId: string) => [
  { key: 'store_home', label: 'סקירה', href: `/admin/stores/${storeId}` },
  { key: 'orders', label: 'הזמנות', href: `/admin/stores/${storeId}/orders`, badgeKey: 'orders' },
  { key: 'products', label: 'מוצרים', href: `/admin/stores/${storeId}/products` },
  { key: 'categories', label: 'קטגוריות', href: `/admin/stores/${storeId}/categories` },
  { key: 'options', label: 'תוספות', href: `/admin/stores/${storeId}/options` },
  { key: 'delivery', label: 'אזורי משלוח', href: `/admin/stores/${storeId}/delivery` },
  { key: 'settings', label: 'הגדרות חנות', href: `/admin/stores/${storeId}/settings` },
];

export function AdminShell({ user, stores, activeStoreId, ordersTodayCount, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [switcherOpen, setSwitcherOpen] = React.useState(false);

  // Infer active store from URL when not provided explicitly: /admin/stores/<id>/...
  const inferredStoreId = React.useMemo(() => {
    const m = pathname.match(/^\/admin\/stores\/([^\/]+)/);
    if (!m || m[1] === 'new') return null;
    return stores.find((s) => s.id === m[1])?.id ?? null;
  }, [pathname, stores]);
  const currentStoreId = activeStoreId ?? inferredStoreId;
  const active = currentStoreId ? stores.find((s) => s.id === currentStoreId) : null;
  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    if (href === '/admin/stores') return pathname === '/admin/stores' || pathname.startsWith('/admin/stores/new');
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const signOut = async () => {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <ToastProvider>
      <div className="admin-layout">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-logo">W</div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Flow Shops</div>
              <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>ניהול חנויות WhatsApp</div>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <div className="sidebar-switcher" onClick={() => setSwitcherOpen((o) => !o)}>
              {active ? (
                <>
                  <div className="store-avatar">{initials(active.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {active.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                      {[active.city, active.category].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="store-avatar">+</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>בחר חנות</div>
                    <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{stores.length} חנויות במערכת</div>
                  </div>
                </>
              )}
              <span style={{ color: 'var(--text-subtle)', fontSize: 11 }}>▾</span>
            </div>

            {switcherOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                  onClick={() => setSwitcherOpen(false)}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 12,
                    left: 12,
                    marginTop: 4,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: 4,
                    zIndex: 50,
                  }}
                >
                  <div style={{ padding: '8px 10px 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-subtle)', fontWeight: 600 }}>
                    החנויות שלך
                  </div>
                  {stores.length === 0 && (
                    <div style={{ padding: 10, fontSize: 12, color: 'var(--text-subtle)' }}>
                      אין עדיין חנויות.
                    </div>
                  )}
                  {stores.map((s) => (
                    <Link
                      key={s.id}
                      href={`/admin/stores/${s.id}`}
                      onClick={() => setSwitcherOpen(false)}
                      style={{
                        padding: '7px 10px',
                        fontSize: 13,
                        borderRadius: 'var(--r-sm)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <div className="store-avatar" style={{ width: 24, height: 24, fontSize: 10 }}>
                        {initials(s.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{s.city ?? ''}</div>
                      </div>
                      {!s.is_active && <Badge variant="warn">לא פעיל</Badge>}
                    </Link>
                  ))}
                  <div style={{ height: 1, background: 'var(--divider)', margin: '4px 0' }} />
                  <Link href="/admin/stores/new" onClick={() => setSwitcherOpen(false)} style={{ padding: '7px 10px', fontSize: 13, display: 'block' }}>
                    ＋ חנות חדשה
                  </Link>
                  <Link href="/admin/stores" onClick={() => setSwitcherOpen(false)} style={{ padding: '7px 10px', fontSize: 13, display: 'block' }}>
                    ☰ נהל את כל החנויות
                  </Link>
                </div>
              </>
            )}
          </div>

          <nav className="sidebar-nav">
            <div className="nav-group">
              <div className="nav-group-title">כללי</div>
              {GLOBAL_NAV.map((item) => (
                <Link key={item.key} href={item.href} className="nav-item" data-active={isActive(item.href) ? 'true' : 'false'}>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
            {active && (
              <div className="nav-group">
                <div className="nav-group-title">{active.name}</div>
                {STORE_NAV(active.id).map((item) => (
                  <Link key={item.key} href={item.href} className="nav-item" data-active={isActive(item.href) ? 'true' : 'false'}>
                    <span>{item.label}</span>
                    {item.badgeKey === 'orders' && (ordersTodayCount ?? 0) > 0 && (
                      <span className="nav-item-badge">{ordersTodayCount}</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </nav>

          <div className="sidebar-footer">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--r-pill)',
                background: 'oklch(85% 0.012 250)',
                color: 'var(--text)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              {initials(user.full_name || user.email)}
            </div>
            <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{user.full_name || 'משתמש'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </div>
            </div>
            <button className="icon-btn" onClick={signOut} title="התנתק">
              ⎋
            </button>
          </div>
        </aside>

        <div className="admin-main">
          <Topbar />
          <main className="admin-content">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}

function Topbar() {
  const pathname = usePathname();
  const crumbs = breadcrumbsFor(pathname);
  return (
    <header className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="crumbs-sep">›</span>}
            {c.href && !c.current ? (
              <Link href={c.href} className="crumbs-item">{c.label}</Link>
            ) : (
              <span className={`crumbs-item ${c.current ? 'crumbs-item--current' : ''}`}>{c.label}</span>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="topbar-search">
        <input placeholder="חיפוש מוצרים, הזמנות, לקוחות..." />
        <span className="topbar-search-icon">⌕</span>
      </div>
    </header>
  );
}

function breadcrumbsFor(pathname: string) {
  const crumbs: { label: string; href?: string; current?: boolean }[] = [];
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'admin') return [{ label: 'Admin', current: true }];

  if (parts.length === 1) return [{ label: 'Dashboard', current: true }];
  if (parts[1] === 'stores') {
    crumbs.push({ label: 'כל החנויות', href: '/admin/stores' });
    if (parts.length === 2) {
      crumbs[0].current = true;
      crumbs[0].href = undefined;
      return crumbs;
    }
    if (parts[2] === 'new') {
      crumbs.push({ label: 'חנות חדשה', current: true });
      return crumbs;
    }
    const storeId = parts[2];
    const baseHref = `/admin/stores/${storeId}`;
    crumbs.push({ label: 'חנות', href: baseHref });
    const map: Record<string, string> = {
      products: 'מוצרים',
      categories: 'קטגוריות',
      options: 'תוספות',
      delivery: 'אזורי משלוח',
      orders: 'הזמנות',
      settings: 'הגדרות',
    };
    if (parts.length === 3) {
      crumbs[crumbs.length - 1].current = true;
      crumbs[crumbs.length - 1].href = undefined;
      return crumbs;
    }
    const section = parts[3];
    if (map[section]) {
      crumbs.push({ label: map[section], href: `${baseHref}/${section}`, current: parts.length === 4 });
    }
    if (parts.length >= 5) {
      crumbs[crumbs.length - 1].current = false;
      crumbs.push({ label: parts[4] === 'new' ? 'חדש' : 'עריכה', current: true });
    }
  }
  return crumbs;
}
