import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";
import { isAdminReq } from "@/lib/admin-auth";

/**
 * تنظیمات پرداخت کارت‌به‌کارت — شماره کارت/نام صاحب حساب/توضیح که در اپ کاربران
 * هنگام خرید نمایش داده می‌شود. از سمت مدیریت ویرایش می‌شود.
 * + latestVersion/latestCode/latestUrl: اعلام نسخهٔ جدید برای نوتیف درون‌برنامه‌ای
 *   (CI بعد از هر release این‌ها را ست می‌کند).
 * + emergencyLinks: کانفیگ‌های اضطراری (هر خط یک لینک) — استخرِ بخش اضطراری اپ.
 *
 * PUT /api/admin/settings  { payCard, payHolder, payNote, latestVersion?, latestCode?, latestUrl?, emergencyLinks? }
 * GET  /api/admin/settings → خواندن مقادیر فعلی
 */
const KEYS = ["pay_card", "pay_holder", "pay_note"] as const;
const OTA_KEYS = ["latest_name", "latest_code", "latest_url"] as const;

export async function GET(req: Request) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  await ensureDb();
  const rows = await db.appSetting.findMany({ where: { key: { in: [...KEYS, ...OTA_KEYS, "emergency_links"] } } });
  const get = (k: string) => rows.find((r) => r.key === k)?.value ?? "";
  return NextResponse.json({
    ok: true,
    payCard: get("pay_card"),
    payHolder: get("pay_holder"),
    payNote: get("pay_note"),
    latestVersion: get("latest_name"),
    latestCode: Number(get("latest_code")) || 0,
    latestUrl: get("latest_url"),
    emergencyLinks: get("emergency_links"),
  });
}

export async function PUT(req: Request) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  let body: {
    payCard?: string; payHolder?: string; payNote?: string;
    latestVersion?: string; latestCode?: number; latestUrl?: string;
    emergencyLinks?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "بدنه نامعتبر" }, { status: 400 });
  }

  await ensureDb();

  const pairs: Array<[string, string]> = [
    ["pay_card", String(body.payCard ?? "").trim().slice(0, 40)],
    ["pay_holder", String(body.payHolder ?? "").trim().slice(0, 60)],
    ["pay_note", String(body.payNote ?? "").trim().slice(0, 200)],
  ];
  for (const [key, value] of pairs) {
    await db.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }

  // اعلام نسخهٔ جدید (فقط وقتی فیلدها ارسال شده باشند — تا PUT پرداخت، نسخه را پاک نکند)
