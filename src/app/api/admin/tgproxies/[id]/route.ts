import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";
import { isAdminReq } from "@/lib/admin-auth";

/**
 * تغییر پروکسی تلگرام — پنل مدیریت (نسخهٔ ۲٫۱٫۱):
 *
 * PATCH /api/admin/tgproxies/[id]  { country?, title?, active? }
 *
 * مهم‌ترین کاربرد: تغییر پرچم/کشور یک پروکسی بعد از ثبت — چون لوکیشن از لینک
 * معلوم نیست، پیش‌فرض «gift» ذخیره می‌شود و مدیر هر وقت خواست می‌تواند پرچم
 * واقعی‌اش را بگذارد (یا برعکس، به gift برگرداند).
 *
 * country قبول‌شده: "gift" یا کد دوحرفی کشور یا رشتهٔ کوتاه دلخواه؛ خالی = gift.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const { id } = await params;
  let body: { country?: string | null; title?: string; active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "بدنه نامعتبر" }, { status: 400 });
  }
  await ensureDb();

  const data: { country?: string | null; title?: string; active?: boolean } = {};
  if (body.country !== undefined) {
    const cc = String(body.country ?? "").trim().toLowerCase();
    data.country = cc.length === 0 || cc === "gift" ? "gift" : cc.slice(0, 24);
  }
  if (body.title !== undefined) {
    const ti = String(body.title ?? "").trim();
    if (ti) data.title = ti.slice(0, 80);
  }
  if (body.active !== undefined) data.active = Boolean(body.active);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: "چیزی برای تغییر نیست" }, { status: 400 });
  }

  try {
    const updated = await db.tgProxy.update({ where: { id }, data });
    return NextResponse.json({ ok: true, proxy: updated });
  } catch {
    return NextResponse.json({ ok: false, error: "پروکسی پیدا نشد" }, { status: 404 });
  }
}
