import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";
import { isAdminReq } from "@/lib/admin-auth";

/** لیست همه کانفیگ‌ها — فقط مدیر (کوکی وب یا هدر x-admin-key اپ) */
export async function GET(req: Request) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  await ensureDb();
  const configs = await db.vpnConfig.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ok: true, configs });
}

/** افزودن کانفیگ‌ها — هر خط یک لینک کانفیگ؛ premium یعنی فقط کاربران پرمیوم می‌گیرند
 *
 * country: اختیاری و عینی (verbatim) — مثلاً "gift" برای کانفیگ‌های هدیه با لوکیشن نامعلوم؛
 * اگر برای هر خط آرایهٔ countries فرستاده شود، کشور همان خط دقیقاً همان ذخیره می‌شود
 * و هرگز با تشخیص خودکار بازنویسی نمی‌شود.
 */
export async function POST(req: Request) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  await ensureDb();
  try {
    const { name, country, countries, links, premium } = await req.json();
    const lines = String(links ?? "")
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    if (lines.length === 0) {
      return NextResponse.json(
        { ok: false, error: "حداقل یک کانفیگ وارد کنید" },
        { status: 400 }
      );
    }

    const valid = lines.filter((l: string) =>
      /^(vmess|vless|trojan|ss|ssr|hysteria2?|tuic):\/\//i.test(l)
    );
    if (valid.length === 0) {
      return NextResponse.json(
        { ok: false, error: "فرمت کانفیگ‌ها معتبر نیست (vmess/vless/trojan/ss/hysteria)" },
        { status: 400 }
      );
    }

    // کشور هر کانفیگ: مقدار عینی همان خط (در صورت وجود) → مقدار عینی کل → «نامشخص»
    const perLine: unknown[] = Array.isArray(countries) ? countries : [];
    const shared = typeof country === "string" ? country.trim() : "";
    const countryOf = (i: number) => {
      const own = typeof perLine[i] === "string" ? (perLine[i] as string).trim() : "";
      return own || shared || "نامشخص";
    };

    const created = await db.vpnConfig.createMany({
      data: valid.map((link: string, i: number) => ({
        name: valid.length > 1 ? `${name || "سرور"} ${i + 1}` : name || "سرور",
        country: countryOf(i),
        link,
        premium: premium === true,
      })),
    });

    return NextResponse.json({ ok: true, added: created.count });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای سرور" }, { status: 500 });
  }
}
