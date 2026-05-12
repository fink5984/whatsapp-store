import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'store-assets';

/**
 * Upload a file to Supabase Storage under `path` and return the public URL.
 * Throws on failure. RLS policies must allow the caller to write to `path`.
 */
export async function uploadImage(
  supabase: SupabaseClient,
  file: File | Blob,
  path: string,
): Promise<string> {
  const contentType =
    'type' in file && typeof file.type === 'string' && file.type
      ? file.type
      : 'application/octet-stream';

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType });

  if (error) {
    throw new Error(`upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function storeAssetPath(storeId: string, kind: string, filename: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `stores/${storeId}/${kind}/${Date.now()}_${safe}`;
}
