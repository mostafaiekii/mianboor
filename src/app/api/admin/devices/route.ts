import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";
import { isAdminReq } from "@/lib/admin-auth";

/**
 * لیست دستگاه‌های متصل (با هر sync ثبت می‌شوند) — فقط مدیر.
 * برای پیدا‌کردن خریدار تلگرامی: کاربر «شناسه دستگاه» خودش را (از صفحه حساب)
 * برایتان می‌فرستد؛ همین‌جا جستجو کنید و پرمیومش کنید.
 *
 * GET /api/admin/devices
 */
export async function GET(req: Request) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  await ensureDb();
  const devices = await db.device.findMany({ orderBy: { lastSeenAt: "desc" }, take: 300 });
  const now = Date.now();
  return NextResponse.json({
    ok: true,
    devices: devices.map((d) => ({
      id: d.id,
      premium: !!(d.premiumUntil && d.premiumUntil.getTime() > now),
      premiumUntil: d.premiumUntil && d.premiumUntil.getTime() > now ? d.premiumUntil.toISOString() : null,
      label: d.label,
      lastSeenAt: d.lastSeenAt.toISOString(),
      createdAt: d.createdAt.toISOString(),
    })),
  });
}
