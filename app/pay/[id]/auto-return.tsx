'use client';

import { useEffect, useState } from 'react';

/**
 * After the payment confirms, send the user back to WhatsApp without
 * requiring a tap. Browsers won't let us close the tab (it was opened by a
 * system deep link, not by JS), but `location.href = wa.me/...` brings
 * WhatsApp to the foreground on both iOS and Android. The browser tab
 * stays open in the background — acceptable trade-off vs. the manual button.
 */
export function AutoReturnToWhatsApp({ waUrl, delaySeconds = 2 }: { waUrl: string; delaySeconds?: number }) {
  const [secondsLeft, setSecondsLeft] = useState(delaySeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      window.location.href = waUrl;
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, waUrl]);

  return (
    <>
      <div style={{ fontSize: 14, marginTop: 4 }}>
        {secondsLeft > 0
          ? `חוזר ל־WhatsApp בעוד ${secondsLeft} שניות...`
          : 'פותח WhatsApp...'}
      </div>
      <a
        href={waUrl}
        style={{
          display: 'inline-block',
          marginTop: 12,
          background: '#25d366',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: 8,
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        חזור עכשיו
      </a>
    </>
  );
}
