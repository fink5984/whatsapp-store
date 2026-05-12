'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<'signin' | 'signup'>('signin');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowser();
    const op =
      mode === 'signin'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await op;
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/admin');
    router.refresh();
  };

  return (
    <form className="login-form" onSubmit={submit}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
        <div className="sidebar-logo">W</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Flow Shops</div>
          <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>פלטפורמת חנויות WhatsApp</div>
        </div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 6 }}>
        {mode === 'signin' ? 'ברוכים השבים' : 'הקמת חשבון'}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
        {mode === 'signin' ? 'התחבר כדי לנהל את החנויות שלך' : 'צור חשבון חדש כדי להתחיל'}
      </div>

      <div style={{ marginBottom: 16 }}>
        <Field label="אימייל">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </Field>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Field label="סיסמה">
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </Field>
      </div>
      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 12.5, marginBottom: 10 }}>{error}</div>
      )}

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button variant="primary" size="lg" type="submit" disabled={loading}>
          {loading ? 'רגע...' : mode === 'signin' ? 'התחבר' : 'הירשם'}
        </Button>
        <div style={{ fontSize: 12, color: 'var(--text-subtle)', textAlign: 'center' }}>
          {mode === 'signin' ? 'אין לך חשבון? ' : 'יש כבר חשבון? '}
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            style={{
              color: 'var(--accent)',
              fontWeight: 500,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            {mode === 'signin' ? 'צור חשבון' : 'התחבר'}
          </button>
        </div>
      </div>
    </form>
  );
}
