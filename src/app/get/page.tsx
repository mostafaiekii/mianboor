import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";

export const dynamic = "force-dynamic";

const GITHUB_REPO = "mostafaiekii/mianboor";

/**
 * صفحهٔ دانلود مستقیم — پل نجات کاربرانی که نسخهٔ قدیمی با جریان نصب خراب دارند.
 *
 * چرا؟ اپ‌های v2.7.0/v2.8.0 روی اندروید ۱۲+ دیالوگ تأیید نصب درون‌اپی را باز
 * نمی‌کنند (STATUS_PENDING_USER_ACTION هندل نشده). فیکسش داخل v2.8.1 است؛
 * ولی برای رساندن v2.8.1 به آن کاربران، یک مسیر بیرون-اپیِ امن لازم است:
 *   مرورگر → همین صفحه → دانلود از دامنهٔ خودمان (بدون فیلترینگ گیت‌هاب)
 *   → بازکردن فایل → نصب‌کنندهٔ سیستم (جریان استاندارد اندروید، همیشه کار می‌کند)
 *
 * هیچ اشاره‌ای به گیت‌هاب در این صفحه نیست — همه‌چیز از سرور خودمان می‌آید.
 */

async function getLatest(): Promise<{ version: string; size: number }> {
  // ۱) دیتابیس خودمان — CI بعد از هر ریلیز ست می‌کند
  try {
    await ensureDb();
    const settings = await db.appSetting.findMany({
      where: { key: { in: ["latest_code", "latest_name"] } },
    });
    const get = (k: string) => settings.find((s) => s.key === k)?.value ?? "";
    const code = Number(get("latest_code")) || 0;
    const name = get("latest_name").trim();
    if (code > 0 && name) return { version: name, size: -1 };
  } catch {
    // ادامه به فال‌بک
  }
  // ۲) فال‌بک: گیت‌هاب از سمت سرور
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers: { Accept: "application/vnd.github+json" }, cache: "no-store", signal: AbortSignal.timeout(8000) },
    );
    if (res.ok) {
      const j = (await res.json()) as { tag_name?: string; assets?: Array<{ size?: number }> };
      const ver = (j.tag_name ?? "").replace(/^v/, "");
      if (ver) return { version: ver, size: j.assets?.[0]?.size ?? -1 };
    }
  } catch {
    // بی‌خیال — صفحه با پیام تلاش-مجدد رندر می‌شود
  }
  return { version: "", size: -1 };
}

export default async function GetPage() {
  const latest = await getLatest();
  const dl = latest.version
    ? `/api/client/update/download/${latest.version}/Mianboor-v${latest.version}.apk`
    : "";
  const sizeMb = latest.size > 0 ? (latest.size / 1048576).toFixed(1) + " مگابایت" : "حدود ۲۱ مگابایت";

  return (
    <main
      dir="rtl"
      lang="fa"
      className="min-h-screen bg-[#0b0e14] text-[#f3f0ea] flex flex-col items-center justify-center px-6 py-14"
      style={{
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif",
        backgroundImage:
          "radial-gradient(900px 420px at 50% -10%, rgba(245,166,35,0.14), transparent 65%)",
      }}
    >
      <div className="w-full max-w-md text-center">
        {/* لوگو */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#f5a623] to-[#c47f0e] shadow-[0_0_50px_rgba(245,166,35,0.35)]">
          <svg viewBox="0 0 24 24" fill="none" className="h-11 w-11 text-[#0b0e14]" aria-hidden>
            <path
              d="M12 2C8.5 5.5 6 9.5 6 13.5A6 6 0 0 0 18 13.5C18 9.5 15.5 5.5 12 2Z"
              fill="currentColor"
              opacity="0.95"
            />
            <path d="M12 21v-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight">
          میانبر
          <span className="mx-2 text-[#f5a623]">·</span>
          <span className="text-lg font-semibold tracking-wide text-[#b9b4a8]">Mianboor VPN</span>
        </h1>

        {latest.version ? (
          <>
            <p className="mt-4 text-[15px] leading-7 text-[#c9c4b8]">
              نسخهٔ جدید <span className="font-bold text-[#f5a623]">v{latest.version}</span> آمادهٔ
              دانلود است — این نسخه مشکل اتصال و نصب به‌روزرسانی را کامل رفع می‌کند.
            </p>

            <a
              href={dl}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f5a623] px-6 py-4 text-lg font-extrabold text-[#0b0e14] shadow-[0_10px_40px_rgba(245,166,35,0.35)] transition active:scale-[0.98]"
              download
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
                <path
                  d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 19h16"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              دانلود مستقیم نسخهٔ {latest.version}
            </a>
            <p className="mt-3 text-xs text-[#7d7869]">اندروید ۸ به بالا · {sizeMb}</p>

            {/* راهنمای نصب */}
            <div className="mt-8 rounded-2xl border border-[#262a35] bg-[#12151d] p-5 text-right">
              <h2 className="mb-3 text-sm font-bold text-[#f3f0ea]">بعد از دانلود، سه قدم:</h2>
              <ol className="space-y-2.5 text-[13px] leading-6 text-[#b9b4a8]">
                <li>
                  <span className="ml-1 font-bold text-[#f5a623]">۱.</span>
                  روی فایل دانلودشده بزن — اگر پرسید، «نصب از منابع ناشناس» را فقط برای مرورگرت
                  موقتاً اجازه بده.
                </li>
                <li>
                  <span className="ml-1 font-bold text-[#f5a623]">۲.</span>
                  «نصب» را بزن. اگر نسخهٔ قبلی را داری، همین‌جا روی آن نصب می‌شود و اطلاعات
                  پاک نمی‌شود.
                </li>
                <li>
                  <span className="ml-1 font-bold text-[#f5a623]">۳.</span>
                  میانبر را باز کن و وصل شو — از این به بعد، نسخه‌های بعدی خودکار داخل خود اپ
                  با نوار درصد نصب می‌شوند.
                </li>
              </ol>
            </div>
          </>
        ) : (
          <p className="mt-6 rounded-2xl border border-[#262a35] bg-[#12151d] p-5 text-sm leading-7 text-[#c9c4b8]">
            همین حالا نسخهٔ جدید در دسترس نیست — چند لحظه بعد دوباره این صفحه را باز کن.
          </p>
        )}

        <p className="mt-8 text-[11px] leading-5 text-[#5d5a52]">
          دانلود و نصب کاملاً از سرور رسمی میانبر انجام می‌شود — هیچ لینک بیرونی در کار نیست.
        </p>
      </div>
    </main>
  );
}
