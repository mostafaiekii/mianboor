import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";
import { clientToken } from "@/lib/admin-auth";

/**
 * کیف پول دستگاه (نسخهٔ ۲) — واقعی و مبتنی بر سرور:
 *
 *  - موجودی = مجموع تراکنش‌ها (WalletTx) به تومان
 *  - شارژ: فقط با کد هدیه (GiftCode) که مدیر می‌سازد، یا تأیید دستی مدیریت
 *  - پرداخت پلن از کیف پول: سفارش «approved» می‌شود و پرمیوم همان لحظه فعال می‌شود
 *  - کد تخفیف (PromoCode) قیمت پلن را درصدی کم می‌کند
 *
 * GET  /api/client/wallet?token=…&device=MB-…        ← { balance, txs[] }
 * POST /api/client/wallet { token, device, action:"redeem", code }   ← ردیم کد هدیه
 * POST /api/client/wallet { token, device, action:"promo", code }    ← بررسی کد تخفیف
 * POST /api/client/wallet { token, device, action:"pay", plan, promo? } ← پرداخت پلن
 */

const PLAN_PRICES: Record<string, number> = { p1: 200_000, p3: 400_000, p6: 700_000 };
const PLAN_DAYS: Record<string, number> = { p1: 30, p3: 90, p6: 180 };

async function balanceOf(deviceId: string): Promise<number> {
  const agg = await db.walletTx.aggregate({ where: { deviceId }, _sum: { amount: true } });
  return agg._sum.amount ?? 0;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";
  const device = (searchParams.get("device") ?? "").trim().toUpperCase();
  if (!token || token !== clientToken() || !device) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  await ensureDb();
  const txs = await db.walletTx.findMany({
    where: { deviceId: device },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    ok: true,
    balance: await balanceOf(device),
    txs: txs.map((t) => ({
      id: t.id,
      kind: t.kind,
      amount: t.amount,
      label: t.label,
      at: t.createdAt.getTime(),
    })),
  });
}

export async function POST(req: Request) {
  let body: { token?: string; device?: string; action?: string; code?: string; plan?: string; promo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }
  const token = String(body.token ?? "");
  const device = String(body.device ?? "").trim().toUpperCase();
  const action = String(body.action ?? "");
  if (!token || token !== clientToken() || !device) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  await ensureDb();

  // ── ردیم کد هدیه ──
  if (action === "redeem") {
    const code = String(body.code ?? "").trim().toUpperCase();
    if (!code) return NextResponse.json({ ok: false, error: "code required" }, { status: 400 });
    // اتمیک: فقط اگر استفاده‌نشده باشد مصرف می‌شود
    const used = await db.giftCode.updateMany({
      where: { code, usedBy: "" },
      data: { usedBy: device, usedAt: new Date() },
    });
    if (used.count === 0) {
      return NextResponse.json({ ok: false, error: "code invalid or used" }, { status: 404 });
    }
    const gift = await db.giftCode.findUnique({ where: { code } });
    const amount = Math.max(0, Math.min(10_000_000, gift?.amount ?? 0));
    if (amount > 0) {
      await db.walletTx.create({
        data: { deviceId: device, kind: "redeem", amount, label: `Gift code · ${code}` },
      });
    }
    return NextResponse.json({ ok: true, amount, balance: await balanceOf(device) });
  }

  // ── بررسی کد تخفیف ──
  if (action === "promo") {
    const code = String(body.code ?? "").trim().toUpperCase();
    const promo = await db.promoCode.findUnique({ where: { code } }).catch(() => null);
    if (!promo || !promo.active) {
      return NextResponse.json({ ok: false, error: "promo invalid" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, percent: promo.percent });
  }

  // ── پرداخت پلن از کیف پول ──
  if (action === "pay") {
    const plan = String(body.plan ?? "");
    const base = PLAN_PRICES[plan];
    const days = PLAN_DAYS[plan];
    if (!base || !days) return NextResponse.json({ ok: false, error: "plan invalid" }, { status: 400 });

    let percent = 0;
    const promoCode = String(body.promo ?? "").trim().toUpperCase();
    if (promoCode) {
      const promo = await db.promoCode.findUnique({ where: { code: promoCode } }).catch(() => null);
      if (promo?.active) percent = Math.max(0, Math.min(90, promo.percent));
    }
    const price = Math.round(base * (1 - percent / 100));

    const dev = await db.device
      .upsert({
        where: { id: device },
        create: { id: device, lastSeenAt: new Date() },
        update: { lastSeenAt: new Date() },
      })
      .catch(() => null);
    if (!dev) return NextResponse.json({ ok: false, error: "device not found" }, { status: 404 });
    const now = Date.now();
    const baseUntil = dev.premiumUntil && dev.premiumUntil.getTime() > now ? dev.premiumUntil.getTime() : now;
    const until = new Date(baseUntil + days * 86_400_000);

    await db.$transaction([
      db.walletTx.create({
        data: { deviceId: device, kind: "pay", amount: -price, label: `Plan purchase · ${plan}` },
      }),
      db.device.update({ where: { id: device }, data: { premiumUntil: until } }),
      db.order.create({
        data: {
          id: `MB-${Math.floor(1000 + Math.random() * 9000)}`,
          deviceId: device,
          plan,
          price,
          via: "wallet",
          status: "approved",
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      price,
      percent,
      balance: await balanceOf(device),
      premiumUntil: until.getTime(),
    });
  }

  return NextResponse.json({ ok: false, error: "action invalid" }, { status: 400 });
}
