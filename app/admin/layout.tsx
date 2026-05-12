import { ReactNode } from 'react';
import { requireUser } from '@/lib/auth';
import { AdminShell } from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user, supabase } = await requireUser();

  // Ensure profile exists (trigger usually handles it, but never assume)
  await supabase
    .from('profiles')
    .upsert({ id: user.id, full_name: user.user_metadata?.full_name ?? null }, { onConflict: 'id' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const { data: stores } = await supabase
    .from('stores')
    .select('id, name, city, category, is_active')
    .order('created_at', { ascending: true });

  return (
    <AdminShell
      user={{ email: user.email, full_name: profile?.full_name ?? null }}
      stores={stores ?? []}
    >
      {children}
    </AdminShell>
  );
}
