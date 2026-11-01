/**
 * پارس لینک کامل پروکسی تلگرام — نسخهٔ ۲
 *
 * فرمت‌های پشتیبانی‌شده (همان لینک‌هایی که تلگرام با «Copy proxy link» می‌دهد):
 *   tg://proxy?server=HOST&port=PORT&secret=SECRET
 *   https://t.me/proxy?server=HOST&port=PORT&secret=SECRET
 *   tg://socks?server=HOST&port=PORT&user=USER&pass=PASS
 *   https://t.me/socks?server=HOST&port=PORT&user=USER&pass=PASS
 *
 * خروجی: مشخصات آمادهٔ ذخیره در جدول TgProxy — یا null اگر لینک نامعتبر باشد.
 * این ماژول خالص است (بدون وابستگی به Node/DOM) — هم در API و هم در دمو استفاده می‌شود.
 */

export interface ParsedTgProxyLink {
  server: string;
  port: number;
  kind: "mtproto" | "socks";
  /** mtproto: خود secret — socks: «user:pass» یا null */
  secret: string | null;
}

/** پارس امن query-string بدون تکیه بر URL constructor (سازگار با هر رانتایم) */
function queryParams(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const q = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
  for (const pair of q.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const k = pair.slice(0, eq).trim().toLowerCase();
    let v = pair.slice(eq + 1).trim();
    try {
      v = decodeURIComponent(v.replace(/\+/g, " "));
    } catch {
      /* مقدار خراب — همان خام نگه داشته می‌شود */
    }
    if (k) out[k] = v;
  }
  return out;
}

export function parseTgProxyLink(link: string): ParsedTgProxyLink | null {
  const l = link.trim();
  if (!l || l.length > 2048) return null;

  // نوع لینک را تشخیص بده — فقط proxy/socks تلگرام قبول است
  const m = l.match(/^(?:tg:\/\/|https?:\/\/t\.me\/)(proxy|socks)\?/i);
  if (!m) return null;
  const kind: "mtproto" | "socks" = m[1].toLowerCase() === "socks" ? "socks" : "mtproto";

  const p = queryParams(l);
  const server = (p.server ?? "").trim();
  const port = Math.floor(Number(p.port));
  if (!server || !/^[a-zA-Z0-9.\-]+$/.test(server)) return null;
  if (!Number.isFinite(port) || port < 1 || port > 65535) return null;

  if (kind === "mtproto") {
    const secret = (p.secret ?? "").trim();
    // secret ام‌تی‌پروتو هگز است (معمولاً ۱۶/۳۲ یا با پیشوند ee/dd) — حداقل ۸ کاراکتر هگز
    if (!secret || !/^[0-9a-fA-F]{8,}$/.test(secret)) return null;
    return { server, port, kind, secret: secret.toLowerCase() };
  }

  // socks — user/pass اختیاری است
  const user = (p.user ?? "").trim();
  const pass = (p.pass ?? "").trim();
  const secret = user && pass ? `${user}:${pass}` : null;
  return { server, port, kind, secret };
}
