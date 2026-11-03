export const dynamic = "force-dynamic";

const GITHUB_REPO = "mostafaiekii/mianboor";

/**
 * دانلود مستقیم APK از سرور خودمان — پروکسی استریم به گیت‌هاب.
 *
 * چرا؟ github.com (فایل‌های release) در ایران بدون VPN فیلتر است؛
 * برای اینکه «به‌روزرسانی داخل اپ با درصد پیشرفت» همیشه برای کاربر ایرانی کار کند،
 * اپ این مسیر را صدا می‌زند و سرورِ خودمان (mianboor.vercel.app) فایل را از گیت‌هاب
 * می‌گیرد و استریم‌شده تحویل می‌دهد — با Content-Length تا درصد دانلود دقیق باشد.
 *
 * امنیت: فقط فایل APK از releaseهای همین ریپو — ورودی نسخه سخت‌گیرانه اعتبارسنجی
 * می‌شود تا این نقطه هرگز به یک open-proxy برای آدرس‌های دیگر تبدیل نشود.
 *
 * فراخوانی: GET /api/client/update/download?v=2.8.0
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const v = (searchParams.get("v") ?? "").trim().replace(/^v/i, "");

  // فقط نسخهٔ معنیار — حداکثر ۳ جزء عددی (2.8 / 2.8.0 / 2.10.1)
  if (!/^\d{1,3}(\.\d{1,3}){1,2}$/.test(v)) {
    return Response.json({ ok: false, error: "invalid version" }, { status: 400 });
  }

  // نام فایل مطابق خروجی CI: Mianboor-v2.8.0.apk
  const assetUrl =
    `https://github.com/${GITHUB_REPO}/releases/download/v${v}/Mianboor-v${v}.apk`;

  // طول فایل را با HEAD می‌گیریم تا درصد دانلود در اپ دقیق باشد
  let size = -1;
  try {
    const head = await fetch(assetUrl, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (head.ok) {
      const len = Number(head.headers.get("content-length") ?? "-1");
      if (Number.isFinite(len) && len > 0) size = len;
    }
  } catch {
    // بدون طول هم استریم ادامه می‌دهد — اپ درصد را بی‌نهایت نمایش می‌دهد
  }

  let upstream: Response;
  try {
    upstream = await fetch(assetUrl, {
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
      headers: { Accept: "application/octet-stream" },
    });
  } catch {
    return Response.json({ ok: false, error: "upstream fetch failed" }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return Response.json(
      { ok: false, error: `release asset not found (${upstream.status})` },
      { status: 404 },
    );
  }

  const headers = new Headers();
  // اولویت طول واقعی پاسخ گیت‌هاب؛ اگر نبود طول HEAD
  const realLen = Number(upstream.headers.get("content-length") ?? "-1");
  const finalLen = Number.isFinite(realLen) && realLen > 0 ? realLen : size;
  if (finalLen > 0) headers.set("Content-Length", String(finalLen));
  headers.set("Content-Type", "application/vnd.android.package-archive");
  headers.set("Content-Disposition", `attachment; filename="Mianboor-v${v}.apk"`);
  headers.set("Cache-Control", "no-store");

  return new Response(upstream.body, { status: 200, headers });
}
