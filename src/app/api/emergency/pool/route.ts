import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";
import { clientToken } from "@/lib/admin-auth";

/**
 * ── بخش اضطراری (Emergency) — کاملاً مستقل از بقیهٔ اپ ──
 *
 * استخرِ راه‌های نجات برای وقتی فیلترینگ شدید می‌شود:
 *   1. mirrors — دامنه‌های جایگزین که همان /api/emergency/pool را سرو می‌کنند.
 *      اپ به‌ترتیب امتحانشان می‌کند تا یکی زنده باشد.
 *      پیش‌فرض: APP_URL + EMERGENCY_MIRRORS (env — با کاما جدا شود).
 *   2. links  — کانفیگ‌های اضطراری (vless/vmess/ss خام).
 *      اولویت: env EMERGENCY_LINKS (هر خط یک لینک)؛ اگر نبود، همان
 *      کانفیگ‌های زندهٔ دیتابیس (همان منبع /api/client/configs).
 *
 * احراز: همان توکن کلاینت اپ (?token=...). چیز دیگری را دست نمی‌زند؛
 * حذف این فایل هیچ تاثیری روی بقیهٔ سیستم ندارد.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token || token !== clientToken()) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  await ensureDb();

  // ── mirrors: دامنه‌های زندهٔ جایگزین ──
  const base = (process.env.APP_URL || "https://mianboor.vercel.app").trim().replace(/\/+$/, "");
  const extraMirrors = (process.env.EMERGENCY_MIRRORS || "")
    .split(/[,\s]+/).map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);
  const mirrors = [base, ...extraMirrors.filter((m) => m !== base)];

  // ── links: اول env اضطراری، بعد دیتابیس ──
  type L = { link: string; name: string; country: string };
  let links: L[] = [];

  const envRaw = (process.env.EMERGENCY_LINKS || "").trim();
  if (envRaw) {
    links = envRaw
      .split(/[\n\r]+/).map((s) => s.trim()).filter(Boolean)
      .filter((s) => /^(vless|vmess|trojan|ss):\/\//.test(s))
      .map((link, i) => ({
        link,
        name: `EMG-${String(i + 1).padStart(2, "0")}`,
        country: "🆘",
      }));
  }

  if (links.length === 0) {
    try {
      const rows = await db.vpnConfig.findMany({
        where: { active: true },
        select: { name: true, country: true, link: true },
        take: 50,
      });
      links = rows.map((r) => ({ link: r.link, name: r.name, country: r.country }));
    } catch {
      // دیتابیس در دسترس نبود — فقط mirrors برمی‌گردد؛ اپ مسیر بعدی را می‌رود
    }
  }

  return NextResponse.json(
    {
      ok: true,
      v: 1,
      mirrors,
      links,
      hint: "اگر این دامنه پاسخ داد، از mirrors بعدی استفاده نکن.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
