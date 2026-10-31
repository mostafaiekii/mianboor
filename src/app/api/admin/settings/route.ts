import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";
import { isAdminReq } from "@/lib/admin-auth";

/**
 * تنظیمات پرداخت کارت‌به‌کارت — شماره کارت/نام صاحب حساب/توضیح که در اپ کاربران
 * هنگام خرید نمایش داده می‌شود. از سمت مدیریت ویرایش می‌شود.
 * + latestVersion/latestCode/latestUrl: اعلام نسخهٔ جدید برای نوتیف درون‌برنامه‌ای
 *   (CI بعد از هر release این‌ها را ست می‌کند).
 *
 * PUT /api/admin/settings  { payCard, payHolder, payNote, latestVersion?, latestCode?, latestUrl? }
 * GET  /api/admin/settings → خواندن مقادیر فعلی
 */
const KEYS = ["pay_card", "pay_holder", "pay_note"] as const;

export async function GET(req: Request) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  await ensureDb();
  const rows = await db.appSetting.findMany({ where: { key: { in: [...KEYS] } } });
  const get = (k: string) => rows.find((r) => r.key === k)?.value ?? "";
  return NextResponse.json({
    ok: true,
    payCard: get("pay_card"),
    payHolder: get("pay_holder"),
    payNote: get("pay_note"),
  });
}

export async function PUT(req: Request) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  let body: {
    payCard?: string; payHolder?: string; payNote?: string;
    latestVersion?: string; latestCode?: number; latestUrl?: string;
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
  if (body.latestVersion !== undefined || body.latestCode !== undefined || body.latestUrl !== undefined) {
    const ver = String(body.latestVersion ?? "").trim().slice(0, 20);
    const code = Math.max(0, Math.min(1_000_000, Number(body.latestCode) || 0));
    const url = String(body.latestUrl ?? "").trim().slice(0, 300);
    await db.appSetting.upsert({ where: { key: "latest_name" }, create: { key: "latest_name", value: ver }, update: { value: ver } });
    await db.appSetting.upsert({ where: { key: "latest_code" }, create: { key: "latest_code", value: String(code) }, update: { value: String(code) } });
    await db.appSetting.upsert({ where: { key: "latest_url" }, create: { key: "latest_url", value: url }, update: { value: url } });
  }
  return NextResponse.json({ ok: true });
}
