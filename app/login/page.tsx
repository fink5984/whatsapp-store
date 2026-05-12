import { redirect } from 'next/navigation';
import { getOptionalUser } from '@/lib/auth';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const { user } = await getOptionalUser();
  if (user) redirect('/admin');

  return (
    <div className="login">
      <div className="login-form-wrap">
        <LoginForm />
      </div>
      <div className="login-hero">
        <div className="login-hero-quote">
          הקם חנויות WhatsApp דינמיות תוך דקות. ניהול מוצרים, תוספות והזמנות במקום אחד.
        </div>
        <div className="login-hero-meta">פלטפורמה רב־חנותית · תמיכה ב־WhatsApp Flow רשמי</div>
      </div>
    </div>
  );
}
