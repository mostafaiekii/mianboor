import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";
import { isAdminReq } from "@/lib/admin-auth";

/**
 * مدیریت یک دستگاه — پرمیوم‌کردن دستی (خرید تلگرامی)، تمدید یا لغو.
 *
 * POST /api/admin/devices/[id]  { action: "premium", days: 30|90|180 | "custom" }
 *                              | { action: "revoke" }
 *                              | { action: "rename", label: "…" }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const { id: rawId } = await params;
  const id = rawId.trim().toUpperCase();
  let body: { action?: string; days?: number; label?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  await ensureDb();

  const dev = await db.device.findUnique({ where: { id } });
  if (!dev) {
    return NextResponse.json({ ok: false, error: "دستگاه پیدا نشد" }, { status: 404 });
  }

  if (body.action === "premium") {
    const days = Math.min(Math.max(Number(body.days) || 30, 1), 3650);
    const base =
      dev.premiumUntil && dev.premiumUntil.getTime() > Date.now()
        ? dev.premiumUntil.getTime()
        : Date.now();
    const until = new Date(base + days * 86_400_000);
    await db.device.update({ where: { id }, data: { premiumUntil: until } });
    return NextResponse.json({ ok: true, premiumUntil: until.toISOString() });
  }

  if (body.action === "revoke") {
    await db.device.update({ where: { id }, data: { premiumUntil: null } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "rename") {
    await db.device.update({ where: { id }, data: { label: String(body.label ?? "").slice(0, 60) } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "action نامعتبر" }, { status: 400 });
}
