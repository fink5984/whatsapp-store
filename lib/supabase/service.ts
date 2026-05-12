import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only service-role client. Bypasses RLS.
 *
 * Use ONLY from:
 *   - The WhatsApp Flow endpoint (which has no user session)
 *   - Internal cron / migration scripts
 *
 * Never expose this client to the browser.
 */
let _client: SupabaseClient | null = null;

export function createSupabaseService(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase service-role configuration');
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}
