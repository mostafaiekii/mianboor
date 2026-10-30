import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminReq } from "@/lib/admin-auth";

/** لیست همه کانفیگ‌ها — فقط مدیر (کوکی وب یا هدر x-admin-key اپ) */
export async function GET(req: Request) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const configs = await db.vpnConfig.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ok: true, configs });
}

/** افزودن کانفیگ‌ها — هر خط یک لینک کانفیگ؛ premium یعنی فقط کاربران پرمیوم می‌گیرند */
export async function POST(req: Request) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  try {
    const { name, country, links, premium } = await req.json();
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

    const created = await db.vpnConfig.createMany({
      data: valid.map((link: string, i: number) => ({
        name: valid.length > 1 ? `${name || "سرور"} ${i + 1}` : name || "سرور",
        country: country || "نامشخص",
        link,
        premium: premium === true,
      })),
    });

    return NextResponse.json({ ok: true, added: created.count });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای سرور" }, { status: 500 });
  }
}
