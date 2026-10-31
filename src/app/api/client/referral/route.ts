import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";
import { clientToken } from "@/lib/admin-auth";

/**
 * دعوت دوستان (Referral) — واقعی و مبتنی بر سرور:
 *
 *  - هر دستگاه یک کد معرف یکتا دارد (در اولین تماس ساخته می‌شود)
 *  - دستگاه تازه با وارد کردن کد دوستش ثبت می‌شود: هر دو طرف ۳ روز هدیه می‌گیرند
 *  - اگر دوستِ دعوت‌شده پرمیوم بخرد، دعوت‌کننده ۷ روز هدیهٔ اضافه می‌گیرد
 *    (در تأیید سفارش: /api/admin/orders/[id])
 *  - روزهای هدیهٔ دریافت‌نشده با claim به پرمیوم اضافه می‌شوند
 *
 * GET  /api/client/referral?token=…&device=MB-…
 *      ← { code, friends[], giftDays, invitedCount }
 * POST /api/client/referral  { token, device, code }    → ثبت کد دوست
 * POST /api/client/referral  { token, device, action:"claim" } → دریافت روزهای هدیه
 */

const GIFT_DAYS_PER_FRIEND = 3;

/** کد معرف قطعی برای هر دستگاه — از hash شناسهٔ دستگاه ساخته می‌شود */
function codeFor(deviceId: string): string {
  let h = 0;
  const s = deviceId.trim().toUpperCase() + "::mianboor-ref";
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  const hex = (h >>> 0).toString(36).toUpperCase().padStart(7, "7");
  return `MIAN-${hex.slice(0, 5)}`;
}

async function getOrCreateDevice(deviceId: string) {
  const code = codeFor(deviceId);
  const existing = await db.device.findUnique({ where: { id: deviceId } });
  if (existing) {
    if (!existing.refCode) {
      return await db.device.update({
        where: { id: deviceId },
        data: { refCode: code, lastSeenAt: new Date() },
      });
    }
    return existing;
  }
  return await db.device.create({
    data: { id: deviceId, refCode: code, lastSeenAt: new Date() },
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";
  const device = (searchParams.get("device") ?? "").trim().toUpperCase();
  if (!token || token !== clientToken() || !device) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  await ensureDb();
  const me = await getOrCreateDevice(device);

  // دوستانی که با کد من ثبت شده‌اند
  const friends = await db.device.findMany({
    where: { referredBy: me.refCode },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    ok: true,
    code: me.refCode,
    giftDays: me.refGiftPending,
    invitedCount: me.refCount,
    friends: friends.map((f) => ({
      id: f.id,
      label: f.label || f.id,
      at: f.createdAt.getTime(),
      premium: !!(f.premiumUntil && f.premiumUntil.getTime() > Date.now()),
    })),
  });
}

export async function POST(req: Request) {
  let body: { token?: string; device?: string; code?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }
  const token = String(body.token ?? "");
  const device = String(body.device ?? "").trim().toUpperCase();
  if (!token || token !== clientToken() || !device) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  await ensureDb();
  const me = await getOrCreateDevice(device);

  // ── دریافت روزهای هدیه ──
  if (body.action === "claim") {
    const days = me.refGiftPending;
    if (days <= 0) {
      return NextResponse.json({ ok: false, error: "no gift" }, { status: 400 });
    }
    const base =
      me.premiumUntil && me.premiumUntil.getTime() > Date.now()
        ? me.premiumUntil.getTime()
        : Date.now();
    const until = new Date(base + days * 86_400_000);
    await db.device.update({
      where: { id: device },
      data: { premiumUntil: until, refGiftPending: 0, lastSeenAt: new Date() },
    });
    return NextResponse.json({ ok: true, claimed: days, premiumUntil: until.getTime() });
  }

  // ── ثبت کد معرف دوست ──
  const code = String(body.code ?? "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ ok: false, error: "code required" }, { status: 400 });
  }
  if (me.referredBy) {
    return NextResponse.json({ ok: false, error: "already referred" }, { status: 400 });
  }
  if (code === me.refCode) {
    return NextResponse.json({ ok: false, error: "self code" }, { status: 400 });
  }
  const inviter = await db.device.findFirst({ where: { refCode: code } });
  if (!inviter || inviter.id === device) {
    return NextResponse.json({ ok: false, error: "code not found" }, { status: 404 });
  }

  // دستگاه من ثبت می‌شود + هر دو طرف ۳ روز هدیه می‌گیرند
  await db.device.update({
    where: { id: device },
    data: { referredBy: code, refGiftPending: { increment: GIFT_DAYS_PER_FRIEND }, lastSeenAt: new Date() },
  });
  await db.device.update({
    where: { id: inviter.id },
    data: {
      refGiftPending: { increment: GIFT_DAYS_PER_FRIEND },
      refCount: { increment: 1 },
    },
  });

  return NextResponse.json({ ok: true, giftDays: GIFT_DAYS_PER_FRIEND });
}
