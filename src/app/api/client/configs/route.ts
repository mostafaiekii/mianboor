import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientToken } from "@/lib/admin-auth";

/**
 * نقطه اتصال اپ اندروید (و سایر کلاینت‌ها)
 * کانفیگ‌های فعال را برمی‌گرداند؛ کاربران هرگز لینک‌ها را در UI نمی‌بینند
 * و لینک خام هرگز داخل اپ باندل نمی‌شود.
 * فراخوانی: GET /api/client/configs?token=CLIENT_TOKEN
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token || token !== clientToken()) {
    return NextResponse.json(
      { ok: false, error: "توکن نامعتبر" },
      { status: 401 }
    );
  }

  const configs = await db.vpnConfig.findMany({
    where: { active: true },
    select: { id: true, name: true, country: true, link: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    { ok: true, count: configs.length, configs },
    { headers: { "Cache-Control": "no-store" } }
  );
}
