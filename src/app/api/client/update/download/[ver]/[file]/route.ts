export const dynamic = "force-dynamic";

/**
 * دانلود APK با مسیرِ مبتنی بر نام فایل — سازگار با نسخه‌های قدیمی اپ (v2.6/v2.7):
 *
 *   GET /api/client/update/download/2.8.0/Mianboor-v2.8.0.apk
 *
 * چرا این مسیر؟ اپ‌های قدیمی فقط لینکی را «لینک APK» می‌دانند که با «.apk» تمام شود
 * (Updater.checkLatest → serverFallbackUrl.endsWith(".apk"))؛
 * لینک کوئری‌دار (…?v=2.8.0) برای آن‌ها قابل استفاده نیست. این مسیر همان فایل را
 * روی دامنهٔ خودمان (بدون فیلترینگ گیت‌هاب در ایران) با همان نام استاندارد می‌دهد.
 *
 * امنیت: نسخه و نام فایل سخت‌گیرانه اعتبارسنجی می‌شود — فقط APK ریلیزهای همین ریپو.
 * پیاده‌سازی: ریدایرکت ۳۰۲ به مسیر استریم اصلی (?v=) — یک منبع واحد برای منطق دانلود.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ver: string; file: string }> },
) {
  const { ver, file } = await params;

  const v = (ver ?? "").trim().replace(/^v/i, "");
  // فقط نسخهٔ معنیار — حداکثر ۳ جزء عددی (2.8.0 / 2.10.1)
  if (!/^\d{1,3}(\.\d{1,3}){1,2}$/.test(v)) {
    return Response.json({ ok: false, error: "invalid version" }, { status: 400 });
  }
  // نام فایل باید دقیقاً مطابق خروجی CI باشد
  if ((file ?? "") !== `Mianboor-v${v}.apk`) {
    return Response.json({ ok: false, error: "invalid file name" }, { status: 400 });
  }

  return Response.redirect(
    new URL(`/api/client/update/download?v=${encodeURIComponent(v)}`, _req.url),
    302,
  );
}
