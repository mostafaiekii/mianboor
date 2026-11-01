import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { clientToken } from "@/lib/admin-auth";
import { keyForSid, rateLimit, clientIp, TT_FRAME } from "@/lib/tgtunnel/bridge";

/**
 * TgTunnel — هندشیک نشست (بدون نیاز به VPS؛ پُل روی همین سرور میانبر)
 *
 * اپ با همان توکن کلاینتِ بقیهٔ APIها می‌آید؛ سرور یک sid صادر می‌کند و
 * کلید AES-256-GCM آن نشست را با HMAC از sid می‌سازد (stateless — برای
 * serverless مناسب است). کلید فقط روی کانال HTTPS به همین اپ برمی‌گردد.
 *
 * فراخوانی: POST /api/tgtunnel/session   بدنه: {"token":"CLIENT_TOKEN"}
 */
export async function POST(req: Request) {
  if (!rateLimit(clientIp(req), 30, 5 * 60_000)) {
    return NextResponse.json({ ok: false, error: "درخواست‌های زیاد — کمی بعد دوباره" }, { status: 429 });
  }

  let token = "";
  try {
    const j = (await req.json()) as { token?: unknown };
    if (typeof j.token === "string") token = j.token;
  } catch {
    /* بدنهٔ نامعتبر → token خالی می‌ماند */
  }

  const serverToken = clientToken();
  // وقتی CLIENT_TOKEN تنظیم نشده (دموی محلی)، نشست دمو با پرچم demo صادر می‌شود؛
  // در production توکن اجباری است — همان قانون بقیهٔ APIهای کلاینت.
  const demo = serverToken.length === 0;
  if (!demo && token !== serverToken) {
    return NextResponse.json({ ok: false, error: "توکن نامعتبر" }, { status: 401 });
  }

  const sid = randomBytes(24).toString("hex");
  return NextResponse.json(
    {
      ok: true,
      sid,
      key: keyForSid(sid).toString("hex"),
      frame: TT_FRAME,
      ...(demo ? { demo: true } : {}),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
