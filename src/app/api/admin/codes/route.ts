import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";
import { isAdminReq } from "@/lib/admin-auth";

/**
 * کدهای هدیه و تخفیف (نسخهٔ ۲) — از پنل مدیریت اپ:
 *
 * GET    /api/admin/codes              ← همهٔ کدهای هدیه و تخفیف
 * POST   /api/admin/codes { type:"gift", amount:50000, code? }
 *                        { type:"promo", percent:20, code? }
 * DELETE /api/admin/codes?type=gift&code=…
 */

const genCode = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export async function GET(req: Request) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  await ensureDb();
  const [gift, promo] = await Promise.all([
    db.giftCode.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    db.promoCode.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
  ]);
  return NextResponse.json({
    ok: true,
    gift: gift.map((g) => ({
      code: g.code,
      amount: g.amount,
      usedBy: g.usedBy,
      usedAt: g.usedAt?.getTime() ?? null,
      at: g.createdAt.getTime(),
    })),
    promo: promo.map((p) => ({
      code: p.code,
      percent: p.percent,
      active: p.active,
      at: p.createdAt.getTime(),
    })),
  });
}

export async function POST(req: Request) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  let body: { type?: string; code?: string; amount?: number; percent?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "بدنه نامعتبر" }, { status: 400 });
  }
  await ensureDb();

  if (body.type === "gift") {
    const code = String(body.code ?? "").trim().toUpperCase() || genCode("MB");
    const amount = Math.max(1000, Math.min(10_000_000, Number(body.amount) || 0));
    if (!amount) return NextResponse.json({ ok: false, error: "مبلغ نامعتبر" }, { status: 400 });
    const created = await db.giftCode.create({ data: { code, amount } }).catch(() => null);
    if (!created) return NextResponse.json({ ok: false, error: "این کد قبلاً هست" }, { status: 409 });
    return NextResponse.json({ ok: true, code: created.code, amount: created.amount });
  }

  if (body.type === "promo") {
    const code = String(body.code ?? "").trim().toUpperCase() || genCode("OFF");
    const percent = Math.max(1, Math.min(90, Number(body.percent) || 0));
    if (!percent) return NextResponse.json({ ok: false, error: "درصد نامعتبر" }, { status: 400 });
    const created = await db.promoCode.create({ data: { code, percent } }).catch(() => null);
    if (!created) return NextResponse.json({ ok: false, error: "این کد قبلاً هست" }, { status: 409 });
    return NextResponse.json({ ok: true, code: created.code, percent: created.percent });
  }

  return NextResponse.json({ ok: false, error: "type نامعتبر" }, { status: 400 });
}

export async function DELETE(req: Request) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "";
  const code = (searchParams.get("code") ?? "").trim().toUpperCase();
  if (!code || !["gift", "promo"].includes(type)) {
    return NextResponse.json({ ok: false, error: "type و code لازم است" }, { status: 400 });
  }
  await ensureDb();
  if (type === "gift") {
    await db.giftCode.delete({ where: { code } }).catch(() => undefined);
  } else {
    await db.promoCode.delete({ where: { code } }).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
