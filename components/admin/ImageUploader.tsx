'use client';

import * as React from 'react';
import Image from 'next/image';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { storeAssetPath, uploadImage } from '@/lib/storage';
import { useToast } from '@/components/ui/toaster';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/avif';

export type ImageKind = 'logos' | 'covers' | 'categories' | 'products' | 'options';

interface Props {
  storeId: string;
  kind: ImageKind;
  value?: string | null;
  onChange: (publicUrl: string | null) => void;
  /** preview height in px */
  height?: number;
  label?: string;
}

export function ImageUploader({
  storeId,
  kind,
  value,
  onChange,
  height = 160,
  label = 'גרור תמונה לכאן או לחץ להעלאה',
}: Props) {
  const toast = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [hover, setHover] = React.useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast('יש להעלות קובץ תמונה בלבד', 'error');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast('הקובץ גדול מדי (מעל 5MB)', 'error');
      return;
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowser();
      const path = storeAssetPath(storeId, kind, file.name);
      const url = await uploadImage(supabase, file, path);
      // Cache-bust to force the browser to fetch the freshly uploaded image
      onChange(`${url}?t=${Date.now()}`);
      toast('התמונה הועלתה');
    } catch (err) {
      toast((err as Error).message || 'שגיאה בהעלאה', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    void upload(files[0]);
  };

  const remove = () => {
    onChange(null);
  };

  return (
    <div>
      <div
        onClick={() => !busy && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setHover(true);
        }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => {
          e.preventDefault();
          setHover(false);
          if (busy) return;
          handleFiles(e.dataTransfer.files);
        }}
        style={{
          position: 'relative',
          height,
          border: `1px dashed ${hover ? 'var(--accent)' : 'var(--border-strong)'}`,
          background: hover ? 'var(--accent-soft)' : value ? 'var(--surface)' : 'var(--surface-2)',
          borderRadius: 'var(--r-md)',
          cursor: busy ? 'progress' : 'pointer',
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-muted)',
          fontSize: 12,
          textAlign: 'center',
          transition: 'all 120ms',
        }}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, transparent 60%, oklch(0% 0 0 / 0.45))',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'flex-end',
                padding: 8,
                gap: 6,
                opacity: hover || busy ? 1 : 0,
                transition: 'opacity 120ms',
              }}
            >
              <button
                type="button"
                className="btn btn--sm btn--secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                disabled={busy}
              >
                החלף
              </button>
              <button
                type="button"
                className="btn btn--sm btn--danger"
                onClick={(e) => {
                  e.stopPropagation();
                  remove();
                }}
                disabled={busy}
              >
                הסר
              </button>
            </div>
          </>
        ) : busy ? (
          <span>מעלה…</span>
        ) : (
          <div style={{ padding: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
              {label}
            </div>
            <div>PNG, JPG, WEBP · עד 5MB</div>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFiles(e.target.files);
          // reset value so re-selecting the same file fires onChange
          e.target.value = '';
        }}
      />
    </div>
  );
}
