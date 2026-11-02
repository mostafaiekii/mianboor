import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/* ────────────────────────────────────────────────────────────────────────────
 * TgTunnel Lab — پروتکل مشترک دمو (تک منبع حقیقت؛ سرویس‌ها و موتور همه از این استفاده می‌کنند)
 *
 * لایهٔ بیرونی: جریان رمز AES-CTR (به سبک obfuscated2 تلگرام) بین «اپ ↔ دیتاسنتر»
 *   که از وسطِ «پروکسی MTProto» رد می‌شود. پروکسی فقط هندشیک ۶۴ بایتی را می‌بیند
 *   و برای اعتبارسنجیِ رمز، تگِ اولین فریم را با کلیدِ مشتق‌شده بررسی می‌کند؛
 *   بقیهٔ جریان برای پروکسی opaque است (رلهٔ کور — دقیقاً مثل MTProto proxy واقعی).
 * لایهٔ درونی: هر چانک با AES-256-GCM و کلید «اپ ↔ بات پل» رمز می‌شود —
 *   یعنی حتی دیتاسنتر هم محتوا را نمی‌بیند (همان «رمز دوم» وعده‌داده‌شده در طرح اصلی).
 * قاب‌بندی: سبک intermediate تلگرام — جریان رمزگشایی‌شده:
 *   TAG(0xEEEEEEEE) | [len:u32][payload] | [len:u32][payload] | ...
 *   هدر payload: [type:u8][id:u32][seq:u16][total:u16][len:u32] = ۱۳ بایت
 * ──────────────────────────────────────────────────────────────────────────── */

export const LAB_PORTS = { proxy: 3031, dc: 3032, bridge: 3033, proxyApi: 3035, dcApi: 3036 } as const;

/** رمز پروکسی — در لینک واقعی MTProto به‌صورت hex با پیشوند dd می‌آید */
export const LAB_SECRET = createHash("sha256").update("mianboor-tgtunnel-lab-secret-v1").digest().subarray(0, 16);

/** کلید درونی اپ ↔ بات پل — عمداً در اختیار دیتاسنتر نیست */
export const LAB_APP_KEY = createHash("sha256").update("mianboor-tgtunnel-lab-appkey-v1").digest();

export const LAB_DC_ID = 2;
export const LAB_CHUNK = 16 * 1024;
export const LAB_MAX_BODY = 3 * 1024 * 1024;
export const TAG_INTERMEDIATE = Buffer.from([0xee, 0xee, 0xee, 0xee]);

export type LabHop = "app" | "proxy" | "dc" | "bridge" | "net";
export interface LabEvent {
  t: number;
  hop: LabHop;
  msg: string;
  bytes?: number;
}
export type LabLog = (hop: LabHop, msg: string, bytes?: number) => void;

const rev = (b: Buffer) => Buffer.from(b).reverse();

/** مشتق کلیدهای دو جهت از هندشیک ۶۴ بایتی + رمز مشترک (سبک obfuscated2: کلید جهت برگشت، وارونهٔ بایت‌ها) */
export function deriveKeys(hs: Buffer) {
  const base = hs.subarray(8, 56);
  const pre = hs.subarray(0, 8);
  return {
    kUp: createHash("sha256").update(Buffer.concat([base, LAB_SECRET])).digest(),
    ivUp: createHash("sha256").update(Buffer.concat([pre, LAB_SECRET])).digest().subarray(0, 16),
    kDown: createHash("sha256").update(Buffer.concat([rev(base), LAB_SECRET])).digest(),
    ivDown: createHash("sha256").update(Buffer.concat([rev(pre), LAB_SECRET])).digest().subarray(0, 16),
  };
}

/** ساخت هندشیک ۶۴ بایتی: بایت‌های ۵۶..۵۷ = dc-id (LE)، ۵۸=0xEF، ۵۹=0x02 — مثل پروتکل واقعی */
export function buildHandshake(): Buffer {
  const hs = randomBytes(64);
  hs.writeUInt16LE(LAB_DC_ID, 56);
  hs[58] = 0xef;
  hs[59] = 0x02;
  return hs;
}

/* ── رمز درونی (اپ ↔ بات پل) — AES-256-GCM: [12B iv][16B tag][ct] ── */

export function sealInner(plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", LAB_APP_KEY, iv);
  const ct = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]);
}

export function openInner(sealed: Buffer): Buffer {
  const d = createDecipheriv("aes-256-gcm", LAB_APP_KEY, sealed.subarray(0, 12));
  d.setAuthTag(sealed.subarray(12, 28));
  return Buffer.concat([d.update(sealed.subarray(28)), d.final()]);
}

/* ── قاب‌ها ── */

export const FRAME_HEADER = 13;
export const FT_META_UP = 1;
export const FT_DATA_UP = 2;
export const FT_END_UP = 3;
export const FT_META_DOWN = 4;
export const FT_DATA_DOWN = 5;
export const FT_END_DOWN = 6;

export function frameEncode(type: number, id: number, seq: number, total: number, data: Buffer): Buffer {
  const head = Buffer.alloc(FRAME_HEADER);
  head.writeUInt8(type, 0);
  head.writeUInt32BE(id >>> 0, 1);
  head.writeUInt16BE(seq, 5);
  head.writeUInt16BE(total, 7);
  head.writeUInt32BE(data.length, 9);
  return Buffer.concat([head, data]);
}

/** پارسر افزایشی جریان رمزگشایی‌شده → قاب‌ها */
export class FrameParser {
  private buf = Buffer.alloc(0);
  private tagSeen = false;

  constructor(
    private readonly onFrame: (type: number, id: number, seq: number, total: number, data: Buffer) => void,
  ) {}

  push(decrypted: Buffer): void {
    this.buf = Buffer.concat([this.buf, decrypted]);
    if (!this.tagSeen) {
      if (this.buf.length < 4) return;
      if (!this.buf.subarray(0, 4).equals(TAG_INTERMEDIATE)) throw new Error("obfuscation tag mismatch");
      this.buf = this.buf.subarray(4);
      this.tagSeen = true;
    }
    while (this.buf.length >= FRAME_HEADER) {
      const len = this.buf.readUInt32BE(9);
      if (this.buf.length < FRAME_HEADER + len) break;
      const type = this.buf.readUInt8(0);
      const id = this.buf.readUInt32BE(1);
      const seq = this.buf.readUInt16BE(5);
      const total = this.buf.readUInt16BE(7);
      const data = Buffer.from(this.buf.subarray(FRAME_HEADER, FRAME_HEADER + len));
      this.buf = this.buf.subarray(FRAME_HEADER + len);
      this.onFrame(type, id, seq, total, data);
    }
  }
}

/* ── محافظت SSRF — دمو فقط مقصدهای عمومی اینترنت ── */

const PRIVATE_HOST =
  /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i;

export function validateTargetUrl(raw: string): { ok: true; url: URL } | { ok: false; error: string } {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, error: "آدرس نامعتبر است" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, error: "فقط http/https مجاز است" };
  if (PRIVATE_HOST.test(u.hostname) || !u.hostname.includes("."))
    return { ok: false, error: "فقط آدرس‌های عمومی اینترنت مجاز است" };
  return { ok: true, url: u };
}

/* ── متادیتا ── */

export interface ReqMeta {
  id: number;
  url: string;
  ua: string;
  /** ویدیو/مدیا: پل این فایل را از «CDN خودش» (پوشهٔ media) با پشتیبانی Range سرو می‌کند */
  media?: { name: string; range?: string };
}

export interface ResMeta {
  id: number;
  status: number;
  contentType: string;
  finalUrl: string;
  totalChunks: number;
  msBridge: number;
  truncated?: boolean;
  error?: string;
  /* فقط برای مدیا */
  totalBytes?: number;
  rangeStart?: number;
  rangeEnd?: number;
}

/* ── مدیا: فقط فایل‌های صداگذاری‌شدهٔ دمو مجازند (SSRF-safe) ── */
export function validateMediaName(name: string): { ok: true } | { ok: false; error: string } {
  if (!/^[a-z0-9_-]+\.mp4$/i.test(name)) return { ok: false, error: "نام فایل مدیا مجاز نیست" };
  return { ok: true };
}

/** پارس هدر Range سمت مرورگر: bytes=start-[end] (end می‌تواند خالی باشد) */
export function parseByteRange(range: string | null | undefined): { start: number; end: number | null } | null {
  if (!range) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!m) return null;
  const [, a, b] = m;
  if (a === "" && b === "") return null;
  if (a === "") {
    /* suffix range: bytes=-N → از N تا آخر؛ برای دمو ساده نگه می‌داریم و کل فایل می‌دهیم */
    return { start: 0, end: null };
  }
  return { start: Number(a), end: b === "" ? null : Number(b) };
}
