import { NextResponse } from "next/server";
import {
  isSid,
  keyForSid,
  openFrames,
  splitFrames,
  egressFetch,
  rateLimit,
  clientIp,
  TT_MAX_FRAMES_UP,
} from "@/lib/tgtunnel/bridge";

/**
 * TgTunnel — عبور درخواست وب از پُل (بدون نیاز به VPS)
 *
 * بدنه: {"sid":"…","frames":[{seq,iv,ct},…]} — فریم‌ها ۱۶KB و هر کدام با
 * AES-256-GCM رمز شده‌اند؛ متن رمزگشایی‌شده JSON درخواست است: {"url":"…"}
 * سرور مقصد را واکشی می‌کند، پاسخ را دوباره فریم‌بندی و رمز می‌کند:
 * {"ok":true,"frames":[…],"meta":{…}} — متن رمزگشایی‌شده:
 * {"status","contentType","finalUrl","body","bytes","truncated"}
 */
export async function POST(req: Request) {
  if (!rateLimit(clientIp(req), 40, 5 * 60_000)) {
    return NextResponse.json({ ok: false, error: "درخواست‌های زیاد — کمی بعد دوباره" }, { status: 429 });
  }

  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ ok: false, error: "بدنهٔ نامعتبر" }, { status: 400 });
  }
  if (body.length > 2_500_000) {
    return NextResponse.json({ ok: false, error: "درخواست بیش از حد بزرگ است" }, { status: 413 });
  }

  let j: { sid?: unknown; frames?: unknown };
  try {
    j = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false, error: "JSON نامعتبر" }, { status: 400 });
  }
  if (!isSid(j.sid)) {
    return NextResponse.json({ ok: false, error: "نشست نامعتبر — دوباره وصل شو" }, { status: 400 });
  }

  try {
    const key = keyForSid(j.sid);
    const plain = openFrames(key, j.frames, TT_MAX_FRAMES_UP);
    const reqObj = JSON.parse(plain.toString("utf8")) as { url?: unknown };
    if (typeof reqObj.url !== "string" || reqObj.url.trim().length === 0) {
      return NextResponse.json({ ok: false, error: "آدرس مقصد خالی است" }, { status: 400 });
    }

    const eg = await egressFetch(reqObj.url);
    if (!eg.ok) {
      return NextResponse.json({ ok: false, error: eg.error });
    }

    const payload = JSON.stringify({
      status: eg.status,
      contentType: eg.contentType,
      finalUrl: eg.finalUrl,
      body: eg.body,
      bytes: eg.bytes,
      truncated: eg.truncated,
    });
    return NextResponse.json(
      {
        ok: true,
        frames: splitFrames(key, Buffer.from(payload, "utf8")),
        meta: {
          status: eg.status,
          contentType: eg.contentType,
          finalUrl: eg.finalUrl,
          bytes: eg.bytes,
          ms: eg.ms,
          truncated: eg.truncated,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای نامشخص پُل";
    return NextResponse.json({ ok: false, error: msg });
  }
}
