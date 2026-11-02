import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes } from "node:crypto";
import { validateTargetUrl } from "@/lib/lab/protocol";

/* ────────────────────────────────────────────────────────────────────────────
 * TgTunnel Bridge — پُل واقعی «وبگردی کامل» روی سرور خود میانبر (بدون نیاز به VPS)
 *
 * اپ → [رمز درونی AES-256-GCM روی هر فریم ۱۶KB] → HTTPS → پُل (همین‌جا) → اینترنت
 *
 * - کلید نشست stateless است: key = HMAC-SHA256(SECRET, sid) — روی سرورهای
 *   serverless (Vercel) هیچ حافظهٔ مشترکی لازم نیست؛ هر نمونه می‌تواند کلید را
 *   از خود sid دوباره بسازد. sid در handshake صادر و فقط همین نشست معتبر است.
 * - محافظت SSRF: فقط http/https عمومی (همان قانون آزمایشگاه).
 * - سقف حجم پاسخ ۳MB، سقف زمان ۱۲ ثانیه، فقط محتوای متنی/HTML/JSON.
 * ──────────────────────────────────────────────────────────────────────────── */

export const TT_FRAME = 16 * 1024;
export const TT_MAX_FRAMES_UP = 64;
export const TT_MAX_FRAMES_DOWN = 256;
export const TT_MAX_BODY = 3 * 1024 * 1024;
export const TT_TIMEOUT_MS = 12_000;

const SECRET_FALLBACK = createHash("sha256")
  .update("mianboor-tgtunnel-bridge-v1")
  .digest();

export function tgtunnelSecret(): Buffer {
  const env = (process.env.TGTUNNEL_SECRET ?? "").trim();
  if (env.length >= 16) return createHash("sha256").update(env).digest();
  return SECRET_FALLBACK;
}

/** کلید نشست از خود sid ساخته می‌شود — stateless روی هر نمونهٔ سرور */
export function keyForSid(sid: string): Buffer {
  return createHmac("sha256", tgtunnelSecret()).update(`sid:${sid}`).digest();
}

export function isSid(s: unknown): s is string {
  return typeof s === "string" && /^[0-9a-f]{32,64}$/.test(s);
}

export interface Frame {
  seq: number;
  iv: string;
  ct: string;
}

/** رمز یک فریم — AES-256-GCM؛ خروجی: {seq, iv, ct} که ct = ciphertext||tag است
 *  (چینش بومی Java: خروجی doFinal در GCM خودش tag را ته ct می‌چسباند —
 *  نود هم همین چینش را می‌سازد/می‌خواند؛ بدون AAD تا رفتار همه‌جا یکسان بماند). */
export function sealFrame(key: Buffer, seq: number, plain: Buffer): Frame {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  const ct = Buffer.concat([c.update(plain), c.final(), c.getAuthTag()]);
  return { seq, iv: iv.toString("hex"), ct: ct.toString("hex") };
}

/** باز کردن و چیدن فریم‌ها به ترتیب seq — خراب یا جاافتاده → خطا */
export function openFrames(key: Buffer, raw: unknown, maxFrames: number): Buffer {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > maxFrames) {
    throw new Error("فریم‌ها نامعتبرند");
  }
  const frames = raw as Array<{ seq?: unknown; iv?: unknown; ct?: unknown }>;
  const parts = new Map<number, Buffer>();
  for (const f of frames) {
    const seq = typeof f.seq === "number" && Number.isInteger(f.seq) ? f.seq : -1;
    if (seq < 0 || seq >= maxFrames || parts.has(seq)) throw new Error("شمارهٔ فریم نامعتبر است");
    if (typeof f.iv !== "string" || typeof f.ct !== "string") throw new Error("فریم ناقص است");
    if (f.iv.length !== 24 || f.ct.length < 32 || f.ct.length > (TT_FRAME + 80) * 2) throw new Error("حجم فریم بیش از حد مجاز است");
    const iv = Buffer.from(f.iv, "hex");
    if (iv.length !== 12) throw new Error("IV نامعتبر است");
    const buf = Buffer.from(f.ct, "hex");
    if (buf.length < 17) throw new Error("CT نامعتبر است");
    try {
      const d = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
      d.setAuthTag(buf.subarray(buf.length - 16));
      parts.set(seq, Buffer.concat([d.update(buf.subarray(0, buf.length - 16)), d.final()]));
    } catch {
      throw new Error("رمزگشایی فریم شکست خورد — نشست یا کلید اشتباه است");
    }
  }
  // همهٔ seq های 0..n-1 باید موجود باشند
  for (let i = 0; i < frames.length; i++) {
    if (!parts.has(i)) throw new Error("فریمی جا افتاده است");
  }
  return Buffer.concat([...parts.entries()].sort((a, b) => a[0] - b[0]).map(([, b]) => b));
}

/** شکستن یک بافر به فریم‌های رمزشدهٔ ۱۶KB برای مسیر برگشت */
export function splitFrames(key: Buffer, buf: Buffer, maxFrames = TT_MAX_FRAMES_DOWN): Frame[] {
  const out: Frame[] = [];
  for (let off = 0, seq = 0; off < buf.length; off += TT_FRAME, seq++) {
    out.push(sealFrame(key, seq, buf.subarray(off, Math.min(off + TT_FRAME, buf.length))));
  }
  if (out.length > maxFrames) throw new Error("پاسخ بیش از سقف فریم است");
  return out;
}

/* ── خروج واقعی به اینترنت — با سقف حجم/زمان و محافظت SSRF ── */

const ALLOWED_CT = /^(text\/html|text\/plain|application\/json|application\/xml|text\/xml|application\/xhtml)/i;

export interface EgressOk {
  ok: true;
  status: number;
  contentType: string;
  finalUrl: string;
  body: string;
  bytes: number;
  truncated: boolean;
  ms: number;
}
export interface EgressFail {
  ok: false;
  error: string;
}

export async function egressFetch(rawUrl: string): Promise<EgressOk | EgressFail> {
  const v = validateTargetUrl(rawUrl.trim());
  if (!v.ok) return { ok: false, error: v.error };

  const t0 = Date.now();
  try {
    const res = await fetch(v.url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(TT_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.5",
        "Accept-Language": "fa,en;q=0.8",
      },
    });

    const ct = (res.headers.get("content-type") ?? "text/html").split(";")[0].trim();
    if (!ALLOWED_CT.test(ct)) {
      return { ok: false, error: `نوع محتوای مقصد (${ct || "نامشخص"}) در این نسخه پشتیبانی نمی‌شود` };
    }

    const lenHeader = Number(res.headers.get("content-length") ?? "0");
    if (lenHeader > TT_MAX_BODY) {
      return { ok: false, error: "صفحهٔ مقصد بزرگ‌تر از سقف ۳MB نسخهٔ فعلی است" };
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > TT_MAX_BODY) {
      return {
        ok: true,
        status: res.status,
        contentType: ct,
        finalUrl: res.url || v.url.toString(),
        body: buf.subarray(0, TT_MAX_BODY).toString("utf8"),
        bytes: TT_MAX_BODY,
        truncated: true,
        ms: Date.now() - t0,
      };
    }

    return {
      ok: true,
      status: res.status,
      contentType: ct,
      finalUrl: res.url || v.url.toString(),
      body: buf.toString("utf8"),
      bytes: buf.length,
      truncated: false,
      ms: Date.now() - t0,
    };
  } catch (e) {
    const msg =
      e instanceof Error && e.name === "TimeoutError"
        ? "مقصد دیر جواب داد (سقف ۱۲ ثانیه)"
        : "دسترسی به مقصد ممکن نشد";
    return { ok: false, error: msg };
  }
}

/* ── محدودیت نرخ سادهٔ درون‌حافظه‌ای (بهترین تلاش روی serverless) ── */

const hits = new Map<string, number[]>();

export function rateLimit(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(ip, arr);
    return false;
  }
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return true;
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "local"
  );
}
