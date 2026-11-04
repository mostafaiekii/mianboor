import { NextResponse } from "next/server";
import { clientToken } from "@/lib/admin-auth";
import { labVideoStart } from "@/lib/lab/client";
import { parseByteRange, validateMediaName } from "@/lib/lab/protocol";

/**
 * TgTunnel — استریم ویدیو از پُل (بدون نیاز به VPS)
 *
 * GET /api/tgtunnel/media?name=clip-480.mp4&token=CLIENT_TOKEN
 *   (توکن همچنین می‌تواند در هدر x-client-token بیاید — برای پخش‌کننده‌های
 *    اندروید که هدر راحت نمی‌فرستند، پارامتر کوئری هم پذیرفته می‌شود)
 *
 * همان موتور تونل ۴-هاپ/تک‌سروری lab؛ این‌جا به‌صورت باینری استریم می‌شود:
 * هدر Range مرورگر/پخش‌کننده → سشن تونل جدید از همان بایت (سک واقعی).
 * فقط فایل‌های مدیای صداگذاری‌شدهٔ سرور مجازند (whitelist) — SSRF-safe.
 */
export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const name = (u.searchParams.get("name") ?? "").trim();
  const qt = (u.searchParams.get("token") ?? "").trim();
  const ht = (req.headers.get("x-client-token") ?? "").trim();

  const serverToken = clientToken();
  if (serverToken.length > 0 && qt !== serverToken && ht !== serverToken) {
    return NextResponse.json({ ok: false, error: "توکن نامعتبر" }, { status: 401 });
  }
  if (!validateMediaName(name).ok) {
    return NextResponse.json({ ok: false, error: "نام مدیا مجاز نیست" }, { status: 400 });
  }

  const rangeHeader = req.headers.get("range");
  const start = await labVideoStart(name, rangeHeader);
  if (!start.ok) {
    return NextResponse.json({ ok: false, error: start.error ?? "تونل مدیا برقرار نشد" }, { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Type", start.contentType);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Length", String(start.rangeEnd - start.rangeStart + 1));
  if (start.status === 206) {
    headers.set("Content-Range", `bytes ${start.rangeStart}-${start.rangeEnd}/${start.totalBytes}`);
  }

  return new Response(start.stream, { status: start.status, headers });
}
