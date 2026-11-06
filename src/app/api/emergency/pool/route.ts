import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";
import { clientToken } from "@/lib/admin-auth";

/**
 * ── بخش اضطراری (Emergency) v2 — کاملاً مستقل از بقیهٔ اپ ──
 *
 * استخرِ راه‌های نجات برای وقتی فیلترینگ شدید می‌شود:
 *   1. mirrors — دامنه‌های جایگزین که همان /api/emergency/pool را سرو می‌کنند.
 *      اپ به‌ترتیب امتحانشان می‌کند تا یکی زنده باشد.
 *      پیش‌فرض: APP_URL + EMERGENCY_MIRRORS (env — با کاما جدا شود).
 *   2. links  — کانفیگ‌های اضطراری خام (vless/vmess/trojan/ss). فقط با توکن.
 *      اولویت: env EMERGENCY_LINKS (هر خط یک لینک) → تنظیم مدیر در دیتابیس
 *      (appSetting: emergency_links — از PUT /api/admin/settings با فیلد
 *      emergencyLinks) → کانفیگ‌های زندهٔ دیتابیس.
 *   3. seeds  — همان links ولی base64شده؛ عمومی و بدون توکن سرو می‌شود و
 *      فرمتش با فایل emergency/pool.json روی گیت‌هاب یکی است (CDN jsDelivr).
 *      یعنی حتی اگر همهٔ دامنه‌ها بسته باشند، اپ از CDN بذر می‌گیرد.
 *
 * بدون توکن → mirrors + seeds (شبکهٔ نجات عمومی؛ بدون دادهٔ شخصی).
 * با توکن   → + links خام.
 *
 * حذف این فایل هیچ تاثیری روی بقیهٔ سیستم ندارد.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const authed = !!token && token === clientToken();

  await ensureDb();

  // ── mirrors: دامنه‌های زندهٔ جایگزین ──
  const base = (process.env.APP_URL || "https://mianboor.vercel.app").trim().replace(/\/+$/, "");
  const extraMirrors = (process.env.EMERGENCY_MIRRORS || "")
    .split(/[,\s]+/).map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);
  const mirrors = [base, ...extraMirrors.filter((m) => m !== base)];

  // ── links: اول env اضطراری، بعد تنظیم مدیر در دیتابیس، بعد کانفیگ‌های زنده ──
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
      const row = await db.appSetting.findUnique({ where: { key: "emergency_links" } });
      const adminRaw = (row?.value ?? "").trim();
      if (adminRaw) {
        links = adminRaw
          .split(/[\n\r]+/).map((s) => s.trim()).filter(Boolean)
          .filter((s) => /^(vless|vmess|trojan|ss):\/\//.test(s))
          .map((link, i) => ({
            link,
            name: `EMG-${String(i + 1).padStart(2, "0")}`,
            country: "🆘",
          }));
      }
    } catch {
      // دیتابیس در دسترس نبود — ادامه
    }
  }

  if (links.length === 0 && authed) {
    try {
      const rows = await db.vpnConfig.findMany({
        where: { active: true },
        select: { name: true, country: true, link: true },
        take: 50,
      });
      links = rows.map((r) => ({ link: r.link, name: r.name, country: r.country }));
    } catch {
      // دیتابیس در دسترس نبود — فقط mirrors/seeds برمی‌گردد
    }
  }

  // ── seeds: همان links به‌صورت base64 — فرمت emergency/pool.json ──
  const seeds = links.map((l) =>
    Buffer.from(l.link, "utf8").toString("base64"),
  );

  return NextResponse.json(
    {
      ok: true,
      v: 2,
      mirrors,
      ...(authed ? { links } : {}),
      seeds,
      hint: "بدون توکن فقط seeds (base64) برمی‌گردد؛ اپ خودش دیکود می‌کند.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
