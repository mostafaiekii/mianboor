import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";
import { isAdminReq } from "@/lib/admin-auth";

const PLAN_DAYS: Record<string, number> = { p1: 30, p3: 90, p6: 180 };

/**
 * تأیید / رد سفارش خرید.
 *  - approve → وضعیت سفارش approved و دستگاه خریدار برای مدت تعرفه پرمیوم می‌شود
 *    (اگر پرمیوم فعال دارد، از تاریخ انقضای فعلی تمدید می‌شود).
 *  - reject → وضعیت rejected.
 *
 * POST /api/admin/orders/[id]  { action: "approve" | "reject" }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const { id } = await params;
  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  await ensureDb();

  const order = await db.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ ok: false, error: "سفارش پیدا نشد" }, { status: 404 });
  }

  if (body.action === "approve") {
    const days = PLAN_DAYS[order.plan] ?? 30;
    const dev = await db.device.findUnique({ where: { id: order.deviceId } });
    const base =
      dev?.premiumUntil && dev.premiumUntil.getTime() > Date.now()
        ? dev.premiumUntil.getTime()
        : Date.now();
    const until = new Date(base + days * 86_400_000);
    await db.device.upsert({
      where: { id: order.deviceId },
      create: { id: order.deviceId, premiumUntil: until, lastSeenAt: new Date() },
      update: { premiumUntil: until, lastSeenAt: new Date() },
    });
    await db.order.update({ where: { id }, data: { status: "approved" } });
    return NextResponse.json({ ok: true, premiumUntil: until.toISOString() });
  }

  if (body.action === "reject") {
    await db.order.update({ where: { id }, data: { status: "rejected" } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "action نامعتبر" }, { status: 400 });
}
