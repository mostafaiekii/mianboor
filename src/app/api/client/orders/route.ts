import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";
import { clientToken } from "@/lib/admin-auth";

/**
 * ثبت سفارش خرید از سمت اپ کاربر.
 * سفارش روی سرور ذخیره می‌شود تا مدیر از پنل مخفی (تب Orders) ببیند و تأیید کند؛
 * با تأیید، دستگاه کاربر از سمت سرور پرمیوم می‌شود و با sync بعدی اپ او فعال می‌گردد.
 *
 * POST /api/client/orders  { token, device, plan: "p1"|"p3"|"p6", via: "gateway"|"telegram" }
 */
const PLAN_PRICES: Record<string, number> = { p1: 200_000, p3: 400_000, p6: 700_000 };

export async function POST(req: Request) {
  let body: { token?: string; device?: string; plan?: string; via?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "بدنه نامعتبر" }, { status: 400 });
  }

  const { token, plan, via } = body;
  const device = (body.device ?? "").trim().toUpperCase();

  if (!token || token !== clientToken()) {
    return NextResponse.json({ ok: false, error: "توکن نامعتبر" }, { status: 401 });
  }
  if (!device.startsWith("MB-")) {
    return NextResponse.json({ ok: false, error: "شناسه دستگاه نامعتبر" }, { status: 400 });
  }
  const price = PLAN_PRICES[plan ?? ""];
  if (!price) {
    return NextResponse.json({ ok: false, error: "تعرفه نامعتبر" }, { status: 400 });
  }

  await ensureDb();

  // دستگاه را ثبت/به‌روز کن (با هر سفارش دیده می‌شود)
  await db.device
    .upsert({
      where: { id: device },
      create: { id: device, lastSeenAt: new Date() },
      update: { lastSeenAt: new Date() },
    })
    .catch(() => null);

  const id = `MB-${Math.floor(1000 + Math.random() * 9000)}`;
  // در صورت تکراری بودن شماره، یک بار دیگر تلاش کن
  const order = await db.order
    .create({ data: { id, deviceId: device, plan: plan!, price, via: via === "telegram" ? "telegram" : "gateway" } })
    .catch(async () => {
      const id2 = `MB-${Math.floor(1000 + Math.random() * 9000)}`;
      return db.order.create({
        data: { id: id2, deviceId: device, plan: plan!, price, via: via === "telegram" ? "telegram" : "gateway" },
      });
    });

  return NextResponse.json({ ok: true, order: { id: order.id, plan: order.plan, price: order.price, via: order.via } });
}
