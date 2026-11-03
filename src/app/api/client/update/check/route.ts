import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";

export const dynamic = "force-dynamic";

const GITHUB_REPO = "mostafaiekii/mianboor";

/**
 * بررسی نسخهٔ جدید — کاملاً از سرور خودمان، بدون نیاز به دسترسی کاربر به گیت‌هاب.
 *
 * چرا این مسیر؟ api.github.com و github.com در ایران بدون VPN فیلتر است؛
 * برای اینکه «به‌روزرسانی داخل اپ» همیشه کار کند، اپ اول این نقطه را صدا می‌زند
 * (mianboor.vercel.app همیشه در دسترس است) و فقط اگر جواب نداد مستقیم به گیت‌هاب می‌رود.
 *
 * خروجی: { ok, latestVersion, latestCode, apkUrl, sizeBytes }
 * apkUrl یک مسیر پروکسی روی همین سرور است — دانلود هم از سرور خودمان انجام می‌شود.
 */
export async function GET() {
  // ۱) اول دیتابیس خودمان (CI بعد از هر release این را ست می‌کند)
  await ensureDb();
  const settings = await db.appSetting
    .findMany({ where: { key: { in: ["latest_code", "latest_name"] } } })
    .catch(() => []);
  const get = (k: string) => settings.find((s) => s.key === k)?.value ?? "";
  const code = Number(get("latest_code")) || 0;
  const name = get("latest_name").trim();

  if (code > 0 && name) {
    return NextResponse.json(
      {
        ok: true,
        latestVersion: name,
        latestCode: code,
        apkUrl: `/api/client/update/download?v=${encodeURIComponent(name)}`,
        sizeBytes: -1,
        source: "server",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // ۲) فال‌بک: گیت‌هاب از سمت سرور (Vercel به گیت‌هاب دسترسی دارد)
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const j = (await res.json()) as {
        tag_name?: string;
        assets?: Array<{ name?: string; size?: number; browser_download_url?: string }>;
      };
      const tag = (j.tag_name ?? "").trim();
      const asset = (j.assets ?? []).find((a) => (a.name ?? "").endsWith(".apk"));
      if (tag && asset?.browser_download_url) {
        const ver = tag.replace(/^v/, "");
        return NextResponse.json(
          {
            ok: true,
            latestVersion: ver,
            latestCode: 0,
            apkUrl: `/api/client/update/download?v=${encodeURIComponent(ver)}`,
            sizeBytes: asset.size ?? -1,
            source: "github",
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
    }
  } catch {
    // گیت‌هاب از سمت سرور هم در دسترس نبود
  }

  return NextResponse.json(
    { ok: false, error: "no release info" },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}
