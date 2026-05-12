import { redirect } from 'next/navigation';
import { createSupabaseServer } from './supabase/server';

export async function requireUser() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { user, supabase };
}

export async function getOptionalUser() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user, supabase };
}
