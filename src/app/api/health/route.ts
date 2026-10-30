import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";

/**
 * نقطهٔ تشخیص سلامت — کاربر می‌تواند در مرورگر باز کند و ببیند نسخهٔ جدید
 * سرور واقعاً دیپلوی شده یا نه:
 *   https://mianboor.vercel.app/api/health
 * اگر build قدیمی بود یعنی Vercel هنوز آپدیت نکرده.
 */
const BUILD = "2.0.0";

export async function GET() {
  const out: Record<string, unknown> = {
    ok: true,
    build: BUILD,
    time: new Date().toISOString(),
  };
  try {
    await ensureDb();
    const [configs, devices, orders] = await Promise.all([
      db.vpnConfig.count(),
      db.device.count().catch(() => -1),
      db.order.count().catch(() => -1),
    ]);
    out.db = "connected";
    out.configs = configs;
    out.devices = devices;
    out.orders = orders;
  } catch (e) {
    out.db = "error";
    out.dbError = String(e).slice(0, 200);
  }
  return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
}
