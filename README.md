# WhatsApp Flow Shops

מערכת SaaS להקמת חנויות דינמיות בתוך WhatsApp Flow רשמי.
לוח ניהול בעברית (RTL) + endpoint מוצפן ל־Data Exchange של WhatsApp Flow.

המערכת בנויה ב־**Next.js 15 + TypeScript + Tailwind + Supabase**.
אין נתוני דמו קשיחים בקוד — הכל מנוהל דרך הדאשבורד והדאטהבייס.

## תוכן עניינים
1. [הקמת Supabase](#1-הקמת-supabase)
2. [הרצת המיגרציות](#2-הרצת-המיגרציות)
3. [משתני סביבה](#3-משתני-סביבה)
4. [הרצה מקומית](#4-הרצה-מקומית)
5. [הוספת חנות ראשונה](#5-הוספת-חנות-ראשונה)
6. [הגדרת WhatsApp Flow Endpoint](#6-הגדרת-whatsapp-flow-endpoint)
7. [העלאת flow.json ל־Meta](#7-העלאת-flowjson-ל־meta)
8. [בדיקת ping](#8-בדיקת-ping)
9. [בדיקת הזמנה מלאה](#9-בדיקת-הזמנה-מלאה)
10. [התראות על הזמנות](#10-התראות-על-הזמנות)
11. [מבנה הקוד](#11-מבנה-הקוד)

---

## 1. הקמת Supabase

1. צור פרויקט חדש ב־[supabase.com](https://supabase.com/).
2. ב־**Project Settings → API** העתק את:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` *(סודי — server-side בלבד)*
3. ב־**Authentication → Providers** ודא ש־Email/Password פעיל.

## 2. הרצת המיגרציות

יש שתי דרכים:

### CLI (מומלץ)
```bash
npm i -g supabase
supabase link --project-ref <your-project-ref>
supabase db push
```

### דרך SQL Editor של Supabase
פתח את `supabase/migrations/001_initial_schema.sql` והרץ.
ואז את `supabase/migrations/002_rls_policies.sql`.

המיגרציות יוצרות:
- 15 טבלאות (stores, products, categories, option_groups, options, orders, ...)
- מדיניות RLS — כל owner רואה רק את החנויות שלו
- bucket אחסון בשם `store-assets` עם read ציבורי וכתיבה לבעלים בלבד
- טריגרים ל־`updated_at` ויצירת `profile` אוטומטית מ־`auth.users`

## 3. משתני סביבה

העתק את `.env.example` ל־`.env.local` ומלא ערכים:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...

# RSA private key שמצורף ל־Public Key שהעלית ל־Meta WhatsApp Manager.
# שמור את הערך כשורה אחת עם \n או עטוף במרכאות.
WHATSAPP_FLOW_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMII...\n-----END RSA PRIVATE KEY-----"
WHATSAPP_FLOW_PRIVATE_KEY_PASSPHRASE=

# אופציונלי — webhook להתראות על הזמנות
ORDER_NOTIFICATION_WEBHOOK_URL=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **חשוב:** `SUPABASE_SERVICE_ROLE_KEY` ו־`WHATSAPP_FLOW_PRIVATE_KEY` הם server-only.
> אסור להציב אותם בקוד צד־לקוח. הם משמשים אך ורק את ה־endpoint של WhatsApp Flow
> וסקריפטים פנימיים.

## 4. הרצה מקומית

```bash
npm install
npm run dev
# http://localhost:3000
```

יצירת משתמש: היכנס ל־`/login`, לחץ על "צור חשבון" והירשם.
לאחר ההרשמה — `profile` ייווצר אוטומטית.

## 5. הוספת חנות ראשונה

1. ב־`/admin` לחץ **+ חנות חדשה**.
2. מלא את **שם / Slug / קטגוריה** (חובה). כל השאר אופציונלי.
3. אחרי השמירה: הוסף קטגוריות → מוצרים → תוספות (Option Groups) → אזורי משלוח.
4. ה־`store_id` מוצג ב־**הגדרות → WhatsApp Flow** — צרף אותו כפרמטר אם יש לך
   טריגר מותאם, או הסתמך על חיפוש החנות במסך הראשון של ה־Flow.

לסיוע מהיר אפשר להריץ סקריפט seed לחנות לדוגמה:
```bash
npm run seed -- --owner-email=you@example.com
```
הסקריפט אופציונלי לחלוטין — המערכת עובדת גם בלעדיו.

## 6. הגדרת WhatsApp Flow Endpoint

ה־endpoint נמצא ב־`POST /api/whatsapp/flow`.
ב־[Meta WhatsApp Manager](https://business.facebook.com/wa/manage/flows/):

1. צור Flow חדש מסוג **Data Exchange**.
2. הגדר את ה־endpoint:
   `https://YOUR-DOMAIN/api/whatsapp/flow`
3. הצמד את **Public Key** של ה־Flow שלך.
   ה־Private המקביל הולך ל־`WHATSAPP_FLOW_PRIVATE_KEY` בקובץ ה־env.

> **איפה ה־Private Key?** **רק** ב־env של השרת.
> אנחנו טוענים אותו פעם אחת, מטמינים בזיכרון, ולא מדפיסים אותו ללוגים.

## 7. העלאת flow.json ל־Meta

ה־JSON הגנרי של ה־Flow נמצא ב־`whatsapp-flow/flow.json`.

ב־WhatsApp Manager → Flow Editor → Source code → הדבק את התוכן או העלה את הקובץ.
המסכים הם **גנריים** — כל הנתונים (חנויות, קטגוריות, מוצרים, תוספות) מגיעים
מה־API בזמן ריצה דרך `data_exchange`.

## 8. בדיקת ping

WhatsApp Manager שולח ping מוצפן עם `{ "action": "ping" }`.
ה־endpoint מחזיר:
```json
{ "data": { "status": "active" } }
```
מוצפן באותו AES key. אם זה עובד — ה־private key תקין.

```bash
# בדיקה שהשירות חי (GET לא דורש הצפנה)
curl https://YOUR-DOMAIN/api/whatsapp/flow
# → {"ok":true}
```

## 9. בדיקת הזמנה מלאה

1. ב־Meta WhatsApp Manager → Flow Preview, פתח את ה־Flow.
2. במסך STORE_SEARCH הקלד שם חנות שיצרת ולחץ "חפש חנות".
3. בחר את החנות → תפריט קטגוריות → מוצר → תוספות → "הוסף לעגלה".
4. CART → "המשך להזמנה" → DELIVERY_METHOD → CUSTOMER_DETAILS → ORDER_SUMMARY.
5. אישור → SUCCESS עם `order_number`. בדוק שההזמנה הופיעה ב־`/admin/stores/<id>/orders`.

**אנטי־כפילות:** עמודת `flow_token` ב־`orders` היא `unique`.
שתי בקשות `submit_order` באותו flow_token יתקבלו, אבל רק אחת תיווצר;
השנייה תזהה את ההזמנה הקיימת ותחזיר את אותו SUCCESS.

## 10. התראות על הזמנות

`lib/notifications.ts` קורא לכל הזמנה חדשה:
1. רושם entry מובנה ב־`console.log`.
2. שולח POST ל־`ORDER_NOTIFICATION_WEBHOOK_URL` אם הוגדר.
3. שולח POST לכל יעד `store_notifications` של החנות שמסומן כ־`webhook`.

הקוד מובנה כך שתחליף אותו בקלות ל־WhatsApp Cloud / SES / Twilio:
ב־`lib/notifications.ts` יש לולאה על `channels` — הוסף שם handler ל־`whatsapp` / `email` / `sms`.

## 11. מבנה הקוד

```
app/
  layout.tsx, page.tsx                       — root + redirect
  login/                                     — Supabase Auth UI
  admin/                                     — לוח ניהול (Hebrew RTL)
    page.tsx                                 — דשבורד גלובלי
    stores/page.tsx, stores/new/page.tsx     — רשימה + יצירה
    stores/[storeId]/
      page.tsx                               — דשבורד חנות
      categories, products, options,
      delivery, orders, settings             — דפי ניהול
  api/whatsapp/flow/route.ts                 — Data Exchange endpoint
  api/admin/                                 — REST פרטי לדאשבורד

components/
  admin/                                     — AdminShell, StoreForm,
                                               ProductForm, OptionGroupsManager,
                                               DeliveryZonesManager, OrderDetails,
                                               SettingsTabs, ...
  ui/                                        — primitives (Button, Card, ...)

lib/
  supabase/{client,server,service}.ts       — שלושה clients
  whatsapp-flow-crypto.ts                    — RSA + AES-128-GCM
  flow-handlers.ts                           — router לכל ה־steps
  flow-builders.ts                           — בונה JSON תשובה
  flow-sessions.ts                           — ניהול session/cart
  pricing.ts, validations.ts, storage.ts,
  notifications.ts, auth.ts, utils.ts

supabase/migrations/                         — schema + RLS
whatsapp-flow/flow.json                      — Flow definition
scripts/seed-example-store.ts                — seed אופציונלי
```

### עקרונות שיש לשמור

- **לעולם לא להחזיר service-role client ללקוח.** השתמש בו רק מ־endpoint של WhatsApp ומסקריפטים.
- **RLS על כל טבלה.** כל שאילתה של admin מסוננת לפי `owner_id` של החנות.
- **אין נתוני דמו קשיחים בקוד.** הכל מגיע מה־DB דרך API routes.
- **שגיאות לא חושפות stack traces ללקוח.** רק הודעות תקליטיות בעברית.
- **flow_token unique** ב־`orders` מבטיח שאי אפשר ליצור הזמנה כפולה.

---

בהצלחה! לכל שאלה — בדוק את `lib/flow-handlers.ts` כדי להבין איך ה־Flow מתורגם ל־DB.
