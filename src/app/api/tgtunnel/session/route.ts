import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { clientToken } from "@/lib/admin-auth";
import { keyForSid, rateLimit, clientIp, TT_FRAME } from "@/lib/tgtunnel/bridge";

/**
 * TgTunnel — هندشیک نشست (بدون نیاز به VPS؛ پُل روی همین سرور میانبر)
 *
 * دو راه ورود:
 *  ۱) اپ اندروید با همان توکن کلاینتِ بقیهٔ APIها می‌آید: {"token":"CLIENT_TOKEN"}
 *  ۲) صفحهٔ دمو (آزمایشگاه وب) بدون توکن با {"mode":"public-demo"} — نشست دمو
 *     با سقف نرخِ سختگیرانه‌تر صادر می‌شود تا توکنِ داخل APK هرگز لازم نباشد
 *     در باندلِ سایت قرار بگیرد.
 *
 * سرور یک sid صادر می‌کند و کلید AES-256-GCM آن نشست را با HMAC از sid
 * می‌سازد (stateless — برای serverless مناسب است). کلید فقط روی کانال HTTPS
 * به همین اپ برمی‌گردد. خود مسیر fetch/media هم سقف حجم/زمان و محافظت SSRF
 * و محدودیت نرخ مستقل دارد.
 */
export async function POST(req: Request) {
  let token = "";
  let publicDemo = false;
  try {
    const j = (await req.json()) as { token?: unknown; mode?: unknown };
    if (typeof j.token === "string") token = j.token;
    if (j.mode === "public-demo") publicDemo = true;
  } catch {
    /* بدنهٔ نامعتبر → token خالی می‌ماند */
  }

  // نشست دمو: سقف نرخ سختگیرانه‌تر (۱۵ نشست در ۵ دقیقه برای هر IP)
  if (publicDemo && !rateLimit(clientIp(req), 15, 5 * 60_000)) {
    return NextResponse.json(
      { ok: false, error: "درخواست‌های دمو زیاد است — کمی بعد دوباره" },
      { status: 429 },
    );
  }
  if (!rateLimit(clientIp(req), 30, 5 * 60_000)) {
    return NextResponse.json({ ok: false, error: "درخواست‌های زیاد — کمی بعد دوباره" }, { status: 429 });
  }

  const serverToken = clientToken();
  // وقتی CLIENT_TOKEN تنظیم نشده (دموی محلی)، نشست دمو با پرچم demo صادر می‌شود؛
  // در production توکن اجباری است — به‌جز حالت public-demo صفحهٔ آزمایشگاه.
  const demo = serverToken.length === 0 || publicDemo;
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
