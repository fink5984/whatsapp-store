/**
 * scripts/seed-sushi-tokyo.ts
 *
 * Seeds the full menu into the existing "סושי טוקיו" store.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-sushi-tokyo.ts
 */

import { createClient } from '@supabase/supabase-js';

const STORE_ID = '39ae9282-6dfd-4b7b-915d-7d47b902a4a6';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

type ProductSeed = {
  name: string;
  description?: string;
  price: number;
  badge?: string;
};

type CategorySeed = {
  name: string;
  description?: string;
  products: ProductSeed[];
};

const MENU: CategorySeed[] = [
  {
    name: 'ראשונות',
    products: [
      { name: 'אדממה', description: 'פולי סויה מאודים, מוגש עם פלח לימון ומלח גס', price: 28 },
      { name: 'פטריות בטמפורה 🌾', description: 'פטריות בטמפורה בציפוי פריך, מוגש עם רוטב צילי מתוק', price: 44 },
      { name: 'פרחי כרובית 🌾', description: "פרחי כרובית בטמפורה ופנקו מוגש עם צ'ילי מתוק", price: 49 },
      { name: "פיש & צ'יפס", description: 'אצבעות סלמון בטמפורה בציפוי פנקו יפני', price: 79 },
      { name: 'סושי פיצה 🌾🍣', description: 'ריבועי אורז בציפוי טמפורה בתוספת סלמון ואבוקדו בזיגוג ספייסי מיונז ורוטב מתוק', price: 65 },
      { name: 'סלמון פאפרס 🌾🍣', description: "נתחי סלמון בציפוי טמפורה מוקפצים ברוטב מתוק חריף עם בצל ירוק ושומשום קלוי, מוגש על מצע אורז סושי", price: 82 },
      { name: "צ'יפס פריך", price: 35 },
      { name: 'אצבעות סלמון', price: 52 },
      { name: 'סירות דייגים', description: 'סירות אורז בטמפורה עם דג לבחירה', price: 66 },
    ],
  },
  {
    name: 'סשימי | ניגירי | מאקי',
    products: [
      { name: 'קריספי ניגירי 🌾', description: 'אורז סושי בציפוי פריך, בעיטור דג לבחירה. 2 יחידות', price: 30 },
      { name: 'ניגירי סלמון צרוב', description: '2 יחידות', price: 30 },
      { name: "ניגירי אבוקדו 2 יח'", description: "ניגירי אבוקדו - 2 יח'", price: 18 },
      { name: 'סשימי סלמון 🍣', description: 'סשימי סלמון - 2 יחידות', price: 28 },
      { name: 'סשימי טונה 🍣', description: 'סשימי טונה - 2 יחידות', price: 32 },
      { name: 'ניגירי טונה 🍣', description: 'ניגירי טונה - 2 יחידות', price: 28 },
      { name: 'ניגירי סלמון 🍣', description: 'ניגירי סלמון - 2 יחידות', price: 24 },
      { name: 'מאקי אבוקדו', description: 'רול דק עם אצה בחוץ', price: 24 },
      { name: 'מאקי טונה 🍣', description: 'רול דק עם אצה בחוץ', price: 39 },
      { name: 'מאקי סלמון 🍣', description: 'רול דק עם אצה בחוץ', price: 30 },
    ],
  },
  {
    name: 'פוקי בול | סלטים',
    products: [
      { name: 'פוקי סלמון 🌾🍣', description: 'קערת אורז סושי, אבוקדו, בטטה, מלפפון, פטריות, גזר, שומשום קלוי מוגש עם סלמון טרי', price: 69 },
      { name: 'פוקי טונה אדומה 🌾🍣', description: 'קערת אורז סושי, אבוקדו, בטטה, מלפפון, פטריות, גזר, שומשום קלוי מוגש עם מנגו (בעונה) וטונה אדומה', price: 89 },
      { name: 'פוקי צמחוני 🌾', description: 'קערת אורז סושי, אבוקדו, בטטה, מלפפון, פטריות, גזר, ושומשום קלוי', price: 59 },
      { name: 'סלט סושי 🌾', description: 'מיקס אורז סושי, אבוקדו, מלפפון וגזר עם ספייסי מיונז וסויה מוגש עם סלמון או טונה לבחירה', price: 69 },
    ],
  },
  {
    name: "רולים דגים - 8 יחי' בציפוי שומשום קלוי",
    products: [
      { name: 'רול דגים בהרכבה עצמית', description: 'דג + 2 ירקות לבחירה', price: 35 },
      { name: 'אלסקה 🍣', description: 'סלמון טרי, אבוקדו ומלפפון', price: 35 },
      { name: 'בוסטון 🌾🍣', description: "ספייסי סלמון, אבוקדו וקראנצ'", price: 38 },
      { name: 'ספייסי טונה 🌾🍣', description: "ספייסי טונה, אבוקדו וקראנצ'", price: 45 },
      { name: 'קיוטו', description: 'סלמון אפוי, אבוקדו ובטטה', price: 39 },
      { name: 'רגע מתוק 🌾', description: 'סלמון אפוי, בטטה ופטריות', price: 39 },
    ],
  },
  {
    name: "רולים צמחוניים - 8 יחי' בציפוי שומשום קלוי",
    products: [
      { name: 'רול צמחוני בהרכבה', price: 28 },
      { name: 'קלאסי', description: 'אבוקדו, מלפפון וגזר', price: 28 },
      { name: 'אבן ספיר 🌾', description: "בטטה, פטריות ומלפפון במעטפת אבוקדו וקראנצ'", price: 38 },
      { name: 'שלושת המוסקטרים 🌾', description: "אבוקדו, בטטה ופטריות במעטפת קראנצ' בטטה", price: 30 },
      { name: 'אבוקדו ומלפפון', price: 26 },
      { name: 'רול אבוקדו', price: 29 },
      { name: 'רול בטטה בטמפורה 🌾', price: 29 },
      { name: 'רול מלפפון', price: 25 },
    ],
  },
  {
    name: 'רולים בטמפורה בציפוי פריך',
    products: [
      { name: 'טוקיו 🌾', description: 'סלמון, אבוקדו ובטטה', price: 48 },
      { name: 'סוסומי 🌾', description: 'סלמון, בטטה ופטריות', price: 48 },
      { name: "סנדוויץ' סלמון בטמפורה 🌾", description: 'סלמון אפוי ובטטה', price: 59 },
      { name: 'אגוגו 🌾', description: 'סלמון אפוי, אבוקדו ופטריות', price: 48 },
    ],
  },
  {
    name: "סנדוויץ' סושי בציפוי פנקו יפני",
    products: [
      { name: 'סלמון אבוקדו 🌾🍣', price: 45 },
      { name: 'סלמון אפוי, אבוקדו ובטטה 🌾', price: 49 },
      { name: 'אבוקדו ובטטה 🌾', price: 38 },
      { name: 'טונה אבוקדו 🌾🍣', price: 55 },
    ],
  },
  {
    name: 'ארבעת המופלאים - סושי לאפה',
    description: 'רול אורז בטמפורה במילויים שונים, לא חתוך',
    products: [
      { name: 'כחול 🌾🍣', description: "ספייסי טונה, אבוקדו, רטבים וקראנצ'", price: 69, badge: 'חדש' },
      { name: 'אדום 🌾🍣', description: "ספייסי סלמון, אבוקדו, רטבים וקראנצ'", price: 59, badge: 'חדש' },
      { name: 'ירוק 🌾', description: "אבוקדו, רטבים וקראנצ'", price: 49, badge: 'חדש' },
      { name: 'כתום 🌾', description: "סלמון אפוי, אבוקדו, בטטה, רטבים וקראנצ'", price: 59, badge: 'חדש' },
    ],
  },
  {
    name: 'מיוחדים',
    products: [
      { name: 'גאולה 🌾', description: "סלמון בטמפורה ואבוקדו במעטפת ספייסי סלמון אפוי, ספייסי מיונז וקראנצ'", price: 52 },
      { name: 'דרקון ירוק 🌾', description: "סלמון אפוי, פטריות ומלפפון במעטפת אבוקדו וקראנצ'", price: 49 },
      { name: 'מקסיקני 🌾🍣', description: "ספייסי סלמון, אבוקדו ומלפפון במעטפת סלמון, פלפל חריף, רוטב סריראצ'ה וקראנצ'", price: 55 },
      { name: 'סאניפילד 🍣', description: 'טונה, אבוקדו ומלפפון במעטפת סלמון ואבוקדו', price: 58, badge: 'חדש' },
      { name: 'האש שלי 🌾', description: "סלמון בטמפורה, בטטה ופטריות במעטפת סלמון צרוב ברוטב סריראצ'ה", price: 57 },
      { name: 'מיאמי היט 🍣', description: "סלמון, טונה, מלפפון ובצל ירוק במעטפת סלמון צרוב עם סריראצ'ה מיונז", price: 59 },
      { name: '5 כוכבים 🌾🍣', description: 'סלמון נא, סלמון בטמפורה, טונה אדומה, אבוקדו ובצל ירוק ברול פוטומאקי (6 חתיכות)', price: 55 },
      { name: 'קריפטו 🌾🍣', description: 'סלמון בטמפורה, בטטה ומלפפון במעטפת ספייסי סלמון', price: 52, badge: 'חדש' },
      { name: 'רולסרויס 🍣', description: 'סלמון, אבוקדו, בטטה במעטפת סלמון ובצל ירוק', price: 52 },
      { name: 'יאווקינה 🍣', description: 'סלמון, אבוקדו, מלפפון ובצל ירוק במעטפת שומשום קלוי', price: 36 },
      { name: 'דניאל', description: 'סלמון אפוי, אבוקדו, בטטה ופטריות בזיגוג ספייסי מיונז ורוטב מתוק', price: 40, badge: 'חדש' },
      { name: 'ברווז צלוי', description: "ספייסי סלמון קראנץ', מלפפון ואבוקדו במעטפת טונה צרובה עם נגיעות פלפל שחור וסריראצ'ה מיונז", price: 59 },
    ],
  },
  {
    name: 'שף ספיישל',
    products: [
      { name: 'מנהטן', description: 'סלמון, אבוקדו, פלפל חריף ובצל ירוק במעטפת סלמון, טונה אדומה וקוביות סלמון ברוטב סויה', price: 74 },
      { name: 'רולקס', description: 'סלמון, טונה אדומה, בטטה בטמפורה, אבוקדו ובצל ירוק במעטפת סלמון, טונה, אבוקדו, בטטה קריספי ונגיעות ספייסי מיונז', price: 72, badge: 'חדש' },
      { name: 'ניומינטור', description: "ספייסי טונה, אבוקדו, קראנצ' עטוף באבוקדו, פלפל חריף ורוטב סריראצ'ה מיונז וקראנצ'", price: 59 },
      { name: 'טסלה', description: 'טונה, אבוקדו ומלפפון במעטפת טונה ובצל ירוק', price: 65, badge: 'חדש' },
      { name: 'יהלום', description: 'רול אבוקדו ומלפפון בעיטור קוביות סלמון בסויה', price: 43, badge: 'חדש' },
    ],
  },
  {
    name: 'מגשי מסיבה',
    products: [
      { name: 'מגש מסיבה M מיקס', description: "72 יח' לבחירת השף, מגיע עם רטבים, צ'ופסטיק, ג׳ינג׳ר ווואסבי", price: 349 },
      { name: 'מגש מסיבה L מיקס', description: "104 יח' לבחירת השף, מגיע עם רטבים, צ'ופסטיק, ג׳ינג׳ר ווואסבי", price: 489 },
      { name: 'מגש מסיבה L צמחוני', price: 439 },
      { name: 'מגש מסיבה L דגים', price: 539 },
      { name: 'מגש מסיבה M צמחוני', price: 319 },
      { name: 'מגש מסיבה M דגים', price: 379 },
    ],
  },
  {
    name: 'רטבים',
    products: [
      { name: 'סויה', price: 2 },
      { name: 'ספייסי מיונז', price: 2 },
      { name: 'טריאקי', price: 2 },
      { name: "ג'ינג'ר", price: 2 },
      { name: 'וואסאבי', price: 2 },
      { name: 'רוטב מתוק', price: 2 },
      { name: "צ'ילי מתוק", price: 2 },
      { name: "צ'ילי חריף", price: 2 },
      { name: 'רוטב ספייסי מיונז 310 מ"ל', price: 39, badge: 'חדש' },
      { name: 'רוטב מתוק אמריקאי 310 מ"ל', price: 39, badge: 'חדש' },
    ],
  },
  {
    name: 'משקאות',
    products: [
      { name: 'מים מינרליים', price: 10 },
      { name: 'סודה', price: 10 },
      { name: 'קולה', price: 10 },
      { name: 'קולה זירו', price: 10 },
      { name: 'ספרייט', price: 10 },
      { name: 'ספרייט זירו', price: 10 },
      { name: 'פיוזטי', price: 10 },
    ],
  },
];

async function main() {
  console.log('Seeding store', STORE_ID);

  let totalProducts = 0;
  for (let i = 0; i < MENU.length; i++) {
    const cat = MENU[i];
    const { data: insertedCat, error: catErr } = await supabase
      .from('categories')
      .insert({
        store_id: STORE_ID,
        name: cat.name,
        description: cat.description ?? null,
        sort_order: i + 1,
      })
      .select()
      .single();
    if (catErr) {
      console.error('category failed:', cat.name, catErr);
      throw catErr;
    }
    console.log(`✓ category: ${cat.name} (${cat.products.length} products)`);

    const rows = cat.products.map((p, idx) => ({
      store_id: STORE_ID,
      category_id: insertedCat.id,
      name: p.name,
      description: p.description ?? null,
      price: p.price,
      badge: p.badge ?? null,
      sort_order: idx + 1,
    }));
    const { error: prodErr } = await supabase.from('products').insert(rows);
    if (prodErr) {
      console.error('products failed for', cat.name, prodErr);
      throw prodErr;
    }
    totalProducts += rows.length;
  }

  console.log(`\nDone. Inserted ${MENU.length} categories and ${totalProducts} products.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
