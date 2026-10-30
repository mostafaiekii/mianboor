import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";
import { isAdminReq } from "@/lib/admin-auth";

/**
 * لیست سفارش‌های همه‌ی دستگاه‌ها — فقط مدیر (هدر x-admin-key اپ / کوکی وب).
 * GET /api/admin/orders
 */
export async function GET(req: Request) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  await ensureDb();
  const orders = await db.order.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ ok: true, orders });
}
