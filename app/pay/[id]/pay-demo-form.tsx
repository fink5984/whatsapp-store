'use client';

import { useState, useTransition } from 'react';
import { simulatePaymentCancel, simulatePaymentSuccess } from './actions';

export function PayDemoForm({ paymentId }: { paymentId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: typeof simulatePaymentSuccess) {
    setError(null);
    startTransition(async () => {
      const res = await action(paymentId);
      if (!res.ok) setError(res.error ?? 'אירעה שגיאה');
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(simulatePaymentSuccess)}
        style={{
          background: '#0f766e',
          color: '#fff',
          border: 'none',
          padding: '14px 16px',
          borderRadius: 12,
          fontSize: 16,
          fontWeight: 600,
          cursor: pending ? 'wait' : 'pointer',
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? 'מעבד...' : 'שלם עכשיו'}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(simulatePaymentCancel)}
        style={{
          background: 'transparent',
          color: '#6b7280',
          border: '1px solid #e5e7eb',
          padding: '10px 16px',
          borderRadius: 12,
          fontSize: 14,
          cursor: pending ? 'wait' : 'pointer',
        }}
      >
        בטל תשלום
      </button>
      {error && (
        <div style={{ color: '#991b1b', fontSize: 13, textAlign: 'center' }}>{error}</div>
      )}
    </div>
  );
}
