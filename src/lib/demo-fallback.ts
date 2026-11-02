/**
 * داده‌های دموی سایت میانبر — تنها منبع حقیقت برای همهٔ مسیرهای API
 *
 * قانون degrade محترمانه:
 *  - اگر دیتابیس در دسترس نباشد → پاسخ HTTP 200 با ok:false و demo:true و
 *    همان شکل قراردادی پرشده با دادهٔ دمو از همین فایل.
 *  - اگر دیتابیس سالم باشد ولی برای کاربر داده‌ای نباشد → ok:true و demo:true
 *    با دادهٔ دمو (تا سایت دمو هیچ‌وقت خالی/خراب به نظر نرسد).
 *  - تاریخ‌ها همه نسبت به «الان» تولید می‌شوند تا دمو همیشه تازه بماند.
 */

export const DEMO_USER = "demo-user";

/** موجودی پیش‌فرض دمو (تومان/IRT) */
export const FALLBACK_BALANCE = 250_000;
/** مبلغ کد هدیه در حالت دمو */
export const DEMO_GIFT_AMOUNT = 50_000;
/** سقف مصرف ماهانهٔ دمو: ۵۰ گیگابایت */
export const QUOTA_BYTES = 53_687_091_200; // 50 * 1024^3
/** مصرف فعلی دمو: ۴۱ گیگابایت → ۸۲٪ */
export const USED_BYTES = 44_040_192_000; // 41 * 1024^3

/** تنها پلن تمدید دمو — با قرارداد API هم‌خوان است */
export const RENEW_PLAN = {
  id: "p50",
  name: "یک‌ماهه ۵۰ گیگ",
  days: 30,
  amount: 250_000,
};

/** هویت کاربر دمو از هدر x-demo-user — پیش‌فرض demo-user */
export function demoUserId(req: Request): string {
  const raw = (req.headers.get("x-demo-user") ?? "").trim();
  return raw.length > 0 ? raw.slice(0, 64) : DEMO_USER;
}

/** yyyy-mm-dd */
export function fmtDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * تولید عدد شبه‌تصادفی پایدار از روی یک رشته (برای نمودارها) —
 * خروجی برای یک روز مشخص همیشه یکسان است تا نمودار بین refreshها نپرد.
 */
function seeded(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100_000) / 100_000;
}

/** گردکردن بایت به مگابایت برای خوانایی */
const roundMb = (bytes: number) => Math.round(bytes / 1_048_576) * 1_048_576;
const GiB = 1_073_741_824;

/* ───────────────────────────── کیف پول ───────────────────────────── */

export type DemoTx = {
  id: string;
  type: "topup" | "spend" | "gift";
  amount: number;
  note: string;
  createdAt: string;
};

/** ۴ تراکنش دمو — جمعش دقیقاً FALLBACK_BALANCE است */
export function demoTransactions(): DemoTx[] {
  const now = Date.now();
  const rows: Array<Omit<DemoTx, "createdAt" | "id"> & { daysAgo: number }> = [
    { type: "topup", amount: 150_000, note: "پرداخت کارت‌به‌کارت", daysAgo: 21 },
    { type: "topup", amount: 100_000, note: "شارژ کیف پول", daysAgo: 14 },
    { type: "gift", amount: 50_000, note: "کد هدیه خوش‌آمدگویی", daysAgo: 9 },
    { type: "spend", amount: -50_000, note: "تمدید بستهٔ یک‌هفته‌ای", daysAgo: 3 },
  ];
  return rows.map((r, i) => ({
    id: `tx-demo-${i + 1}`,
    type: r.type,
    amount: r.amount,
    note: r.note,
    createdAt: new Date(now - r.daysAgo * 86_400_000).toISOString(),
  }));
}

/* ───────────────────────────── دستگاه‌ها ───────────────────────────── */

export type DemoDevice = {
  id: string;
  name: string;
  platform: string;
  lastSeen: string;
  createdAt: string;
  current: boolean;
};

/** ۴ دستگاه دمو — اولی «همین دستگاه» با پلتفرم Android */
export function demoDevices(): DemoDevice[] {
  const now = Date.now();
  const min = 60_000;
  const rows = [
    { id: "dev-demo-1", name: "گوشی من — همین دستگاه", platform: "Android", lastSeen: now - 2 * min, createdAt: now - 90 * 86_400_000, current: true },
    { id: "dev-demo-2", name: "گوشی پدر", platform: "Android", lastSeen: now - 3 * 60 * min, createdAt: now - 60 * 86_400_000, current: false },
    { id: "dev-demo-3", name: "لپ‌تاپ کاری", platform: "Windows", lastSeen: now - 2 * 86_400_000, createdAt: now - 40 * 86_400_000, current: false },
    { id: "dev-demo-4", name: "آیپد خانه", platform: "iOS", lastSeen: now - 9 * 86_400_000, createdAt: now - 25 * 86_400_000, current: false },
  ];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    platform: r.platform,
    lastSeen: new Date(r.lastSeen).toISOString(),
    createdAt: new Date(r.createdAt).toISOString(),
    current: r.current,
  }));
}

/* ───────────────────────────── سرورها ───────────────────────────── */

export type DemoServer = {
  id: string;
  name: string;
  uptime30d: number;
  latencyMs: number;
  alive: boolean;
};

/** ۶ سرور دمو — آخری مرده است (latency 999 و alive:false) */
export function demoServers(): DemoServer[] {
  return [
    { id: "srv-de-fra", name: "آلمان — فرانکفورت", uptime30d: 99.2, latencyMs: 64, alive: true },
    { id: "srv-fi-hel", name: "فنلاند — هلسینکی", uptime30d: 98.7, latencyMs: 71, alive: true },
    { id: "srv-tr-ist", name: "ترکیه — استانبول", uptime30d: 97.4, latencyMs: 88, alive: true },
    { id: "srv-nl-ams", name: "هلند — آمستردام", uptime30d: 95.1, latencyMs: 120, alive: true },
    { id: "srv-ae-dxb", name: "امارات — دبی", uptime30d: 92.3, latencyMs: 155, alive: true },
    { id: "srv-us-nyc", name: "آمریکا — نیویورک", uptime30d: 88.6, latencyMs: 999, alive: false },
  ];
}

/* ───────────────────────────── مصرف ───────────────────────────── */

export type DemoUsage = {
  daily: Array<{ date: string; bytes: number }>;
  weekly: Array<{ weekStart: string; bytes: number }>;
  quotaBytes: number;
  usedBytes: number;
  percent: number;
  warning: boolean;
  expiryDate: string;
  daysLeft: number;
  expiryWarning: boolean;
};

/**
 * مصرف دمو: ۷ روز اخیر + ۴ هفتهٔ اخیر + سهمیهٔ ۵۰ گیگ با ۴۱ گیگ مصرف (۸۲٪)
 * و انقضا ۳ روز دیگر.
 */
export function demoUsage(): DemoUsage {
  const now = new Date();

  // ۷ روز اخیر — قدیمی→جدید
  const daily: Array<{ date: string; bytes: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const key = fmtDay(d);
    // بین ۱/۵ تا ۸ گیگ در روز — پایدار برای هر تاریخ
    const bytes = roundMb((1.5 + seeded(key) * 6.5) * GiB);
    daily.push({ date: key, bytes });
  }

  // ۴ هفتهٔ اخیر — هفتهٔ ایرانی از شنبه شروع می‌شود
  const dow = now.getUTCDay(); // یکشنبه=0 … شنبه=6
  const daysSinceSat = (dow + 1) % 7;
  const weekStartMs = now.getTime() - daysSinceSat * 86_400_000;
  const weekly: Array<{ weekStart: string; bytes: number }> = [];
  for (let i = 3; i >= 0; i--) {
    const start = weekStartMs - i * 7 * 86_400_000;
    const key = fmtDay(new Date(start));
    const bytes = roundMb((18 + seeded("w-" + key) * 22) * GiB); // ۱۸ تا ۴۰ گیگ
    weekly.push({ weekStart: key, bytes });
  }

  // انقضا: ۳ روز دیگر
  const expiry = new Date(now.getTime() + 3 * 86_400_000);
  const daysLeft = 3;

  return {
    daily,
    weekly,
    quotaBytes: QUOTA_BYTES,
    usedBytes: USED_BYTES,
    percent: 82,
    warning: true,
    expiryDate: fmtDay(expiry),
    daysLeft,
    expiryWarning: true,
  };
}

/* ───────────────────────────── تغییرات نسخه‌ها ───────────────────────────── */

export type DemoChangelog = {
  version: string;
  date: string;
  title: string;
  items: string[];
};

export function demoChangelog(): DemoChangelog[] {
  const now = Date.now();
  return [
    {
      version: "1.8.0",
      date: fmtDay(new Date(now - 3 * 86_400_000)),
      title: "سرورهای جدید و اتصال سریع‌تر",
      items: [
        "افزودن ۳ سرور جدید با پینگ پایین‌تر",
        "بهبود الگوریتم اتصال خودکار تا ۴۰٪ سریع‌تر",
        "رفع مشکل قطعی اتصال در شبکهٔ همراه اول",
        "پشتیبانی از پروتکل Hysteria2",
      ],
    },
    {
      version: "1.7.0",
      date: fmtDay(new Date(now - 24 * 86_400_000)),
      title: "طراحی تازهٔ صفحهٔ اصلی",
      items: [
        "بازطراحی کامل رابط کاربری با تم تیره",
        "نمایش مصرف داده به‌صورت لحظه‌ای",
        "افزودن حالت صرفه‌جویی باتری",
        "رفع اشکالات جزئی و بهبود پایداری",
      ],
    },
  ];
}

/* ─────────────────────── کدهای هدیه / تخفیف (پنل مدیریت) ─────────────────────── */

export type DemoGiftCode = {
  code: string;
  amount: number;
  used: boolean;
  usedBy: string | null;
  createdAt: string;
};

export function demoGiftCodes(): DemoGiftCode[] {
  const now = Date.now();
  return [
    { code: "MB-7HK4QP2M", amount: 50_000, used: true, usedBy: DEMO_USER, createdAt: new Date(now - 20 * 86_400_000).toISOString() },
    { code: "MB-9XZT4RWC", amount: 100_000, used: false, usedBy: null, createdAt: new Date(now - 12 * 86_400_000).toISOString() },
    { code: "MB-3NDVK8YQ", amount: 50_000, used: false, usedBy: null, createdAt: new Date(now - 6 * 86_400_000).toISOString() },
    { code: "MB-5TUJ2PL7", amount: 200_000, used: false, usedBy: null, createdAt: new Date(now - 2 * 86_400_000).toISOString() },
  ];
}

export type DemoDiscount = {
  id: string;
  code: string;
  percent: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
};

export function demoDiscounts(): DemoDiscount[] {
  const now = Date.now();
  return [
    {
      id: "dc-demo-1",
      code: "NOROOZ20",
      percent: 20,
      startsAt: new Date(now - 7 * 86_400_000).toISOString(),
      endsAt: new Date(now + 14 * 86_400_000).toISOString(),
      active: true,
    },
    {
      id: "dc-demo-2",
      code: "WELCOME10",
      percent: 10,
      startsAt: new Date(now - 30 * 86_400_000).toISOString(),
      endsAt: new Date(now - 2 * 86_400_000).toISOString(),
      active: false,
    },
  ];
}

/* ───────────────────────────── مولد کد هدیه ───────────────────────────── */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // بدون I/O/0/1 برای خوانایی

/** تولید کد هدیه به شکل MB-XXXX-XXXX */
export function generateGiftCode(): string {
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    if (i === 3) out += "-";
  }
  return `MB-${out}`;
}
