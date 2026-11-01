import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";
import { clientToken } from "@/lib/admin-auth";
import { TG_PROXY_FALLBACK } from "@/lib/tg-proxies";

/**
 * پروکسی‌های تلگرام — نقطه اتصال اپ اندروید (نسخهٔ ۲)
 *
 * همان الگوی احراز api/client/configs: توکن کلاینت اجباری، device اختیاری
 * (فقط برای ثبت آخرین بازدید دستگاه).
 *
 * فقط پروکسی‌های فعال برگردانده می‌شوند. اگر دیتابیس در دسترس نباشد،
 * پاسخ HTTP 200 با پرچم demo:true و لیست نمایشی برمی‌گردد.
 *
 * فراخوانی: GET /api/client/telegram/proxies?token=CLIENT_TOKEN[&device=MB-…]
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const device = (searchParams.get("device") ?? "").trim().toUpperCase();

  if (!token || token !== clientToken()) {
    return NextResponse.json(
      { ok: false, error: "توکن نامعتبر" },
      { status: 401 },
    );
  }

  try {
    await ensureDb();

    // ثبت آخرین بازدید دستگاه (همان الگوی configs)
    if (device) {
      await db.device
        .upsert({
          where: { id: device },
          create: { id: device, lastSeenAt: new Date() },
          update: { lastSeenAt: new Date() },
        })
        .catch(() => null);
    }

    const proxies = await db.tgProxy.findMany({
      where: { active: true },
      select: {
        id: true,
        title: true,
        server: true,
        port: true,
        kind: true,
        secret: true,
        country: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { ok: true, proxies },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // دیتابیس در دسترس نیست — لیست نمایشی (اپ باید demo را بشناسد)
    return NextResponse.json(
      { ok: false, demo: true, proxies: TG_PROXY_FALLBACK },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
