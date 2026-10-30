import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";
import { clientToken } from "@/lib/admin-auth";

/**
 * نقطه اتصال اپ اندروید (و سایر کلاینت‌ها)
 *
 * توزیع هدفمند کانفیگ‌ها بر اساس دسته‌ی کاربر:
 *  - device=MB-… ارسال شود → سرور وضعیت پرمیوم دستگاه را از دیتابیس می‌خواند
 *    (مدیر از پنل مخفی می‌تواند دستگاه را پرمیوم کند) و کانفیگ‌های مجاز همان
 *    دسته را برمی‌گرداند؛ خروجی plan/premiumUntil هم دارد تا اپ همگام شود.
 *  - فقط plan=free|premium (نسخه‌های قدیمی اپ) → همان رفتار قبلی.
 *
 * کاربران هرگز لینک‌ها را در UI نمی‌بینند و لینک خام هرگز داخل اپ باندل نمی‌شود.
 * فراخوانی: GET /api/client/configs?token=CLIENT_TOKEN[&device=MB-…][&plan=free|premium]
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const device = (searchParams.get("device") ?? "").trim().toUpperCase();
  const planParam = (searchParams.get("plan") ?? "").toLowerCase();

  if (!token || token !== clientToken()) {
    return NextResponse.json(
      { ok: false, error: "توکن نامعتبر" },
      { status: 401 },
    );
  }

  await ensureDb();

  // وضعیت پرمیوم دستگاه از سرور (مرجع نهایی)
  let premium = false;
  let premiumUntil: string | null = null;
  if (device) {
    const dev = await db.device
      .upsert({
        where: { id: device },
        create: { id: device, lastSeenAt: new Date() },
        update: { lastSeenAt: new Date() },
      })
      .catch(() => null);
    if (dev?.premiumUntil && dev.premiumUntil.getTime() > Date.now()) {
      premium = true;
      premiumUntil = dev.premiumUntil.toISOString();
    } else if (dev?.premiumUntil) {
      // انقضا گذشته — وضعیت به روز شود
      premiumUntil = null;
    }
  }

  const plan = device ? (premium ? "premium" : "free") : planParam || "free";

  const configs = await db.vpnConfig.findMany({
    where: {
      active: true,
      // دسته‌بندی توزیع: پرمیوم فقط برای پرمیوم‌ها
      ...(plan === "premium" ? {} : { premium: false }),
    },
    select: { id: true, name: true, country: true, link: true, premium: true },
    orderBy: { createdAt: "desc" },
  });

  // اطلاعات پرداخت کارت‌به‌کارت (از تنظیمات پنل ادمین)
  const settings = await db.appSetting.findMany({
    where: { key: { in: ["pay_card", "pay_holder", "pay_note"] } },
  }).catch(() => []);
  const get = (k: string) => settings.find((s) => s.key === k)?.value ?? "";

  return NextResponse.json(
    {
      ok: true,
      configs,
      plan,
      premiumUntil,
      serverTime: Date.now(),
      pay: {
        card: get("pay_card") || "6037-9977-XXXX-XXXX",
        holder: get("pay_holder") || "MIANBOOR",
        note: get("pay_note") || "شناسه دستگاه خود را در شرح پرداخت بنویسید",
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
