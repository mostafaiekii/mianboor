import { createCipheriv, createDecipheriv } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  FT_DATA_DOWN,
  FT_DATA_UP,
  FT_END_DOWN,
  FT_END_UP,
  FT_META_DOWN,
  FT_META_UP,
  FrameParser,
  LAB_CHUNK,
  LAB_MAX_BODY,
  TAG_INTERMEDIATE,
  deriveKeys,
  frameEncode,
  openInner,
  parseByteRange,
  sealInner,
  validateMediaName,
  validateTargetUrl,
  type LabLog,
  type ReqMeta,
  type ResMeta,
} from "./protocol";

/* ────────────────────────────────────────────────────────────────────────────
 * هستهٔ مشترک دیتاسنتر و بات پل — هم سرویس‌های مستقل و هم حالت تک‌سروری
 * (fallback روی Vercel) از همین کد استفاده می‌کنند تا رفتار یکسان بماند.
 * ──────────────────────────────────────────────────────────────────────────── */

interface DcSession {
  id: number;
  metaSealed: Buffer | null;
  upChunks: Buffer[];
  upDone: boolean;
  picked: boolean;
  createdAt: number;
}

/** اتصال یک تونل به دیتاسنتر: رمزگشایی جریان ورودی + رمزکردن جریان خروجی */
export class DcConnection {
  sessionId: number | null = null;
  readonly parser: FrameParser;
  private readonly upDec: ReturnType<typeof createDecipheriv>;
  private readonly downEnc: ReturnType<typeof createCipheriv>;
  private downTagSent = false;

  constructor(
    keys: ReturnType<typeof deriveKeys>,
    private readonly sink: (chunk: Buffer) => void,
    private readonly log: LabLog,
    private readonly store: DcStore,
  ) {
    this.upDec = createDecipheriv("aes-256-ctr", keys.kUp, keys.ivUp);
    this.downEnc = createCipheriv("aes-256-ctr", keys.kDown, keys.ivDown);
    this.parser = new FrameParser((type, id, seq, total, data) =>
      this.store.upFrame(this, type, id, seq, total, data),
    );
  }

  feed(raw: Buffer): void {
    try {
      this.parser.push(this.upDec.update(raw));
    } catch {
      this.log("dc", "جریان ورودی نامعتبر (تگ/رمز اشتباه) — اتصال بسته شد");
    }
  }

  /** برگرداندن پاسخ به سمت اپ از داخل جریان رمز (دیتاسنتر فقط قاب می‌سازد، محتوا نمی‌بیند) */
  deliverDown(
    resMetaSealed: Buffer | null,
    chunksSealed: Buffer[],
    offset: number,
    total: number,
    end: boolean,
  ): void {
    if (resMetaSealed) this.pushDown(FT_META_DOWN, this.sessionId ?? 0, 0, 1, resMetaSealed);
    chunksSealed.forEach((c, i) =>
      this.pushDown(FT_DATA_DOWN, this.sessionId ?? 0, offset + i, total, c),
    );
    if (end)
      this.pushDown(
        FT_END_DOWN,
        this.sessionId ?? 0,
        0,
        1,
        sealInner(Buffer.from(JSON.stringify({ end: true }), "utf8")),
      );
  }

  private pushDown(type: number, id: number, seq: number, total: number, data: Buffer): void {
    if (!this.downTagSent) {
      this.sink(this.downEnc.update(TAG_INTERMEDIATE));
      this.downTagSent = true;
    }
    this.sink(this.downEnc.update(frameEncode(type, id, seq, total, data)));
  }
}

/** انبار سشن‌های دیتاسنتر: دریافت از اپ، تحویل به پل، برگرداندن پاسخ */
export class DcStore {
  private sessions = new Map<number, DcSession>();
  private conns = new Map<number, DcConnection>();

  constructor(private readonly log: LabLog) {}

  get size(): number {
    return this.sessions.size;
  }

  upFrame(conn: DcConnection, type: number, id: number, _seq: number, _total: number, data: Buffer): void {
    if (!this.sessions.has(id)) {
      this.sessions.set(id, {
        id,
        metaSealed: null,
        upChunks: [],
        upDone: false,
        picked: false,
        createdAt: Date.now(),
      });
      this.conns.set(id, conn);
      conn.sessionId = id;
      this.log("dc", `تونل #${id % 10000} از مسیر پروکسی وارد دیتاسنتر شد — قاب‌ها رمز درونی دارند`);
    }
    const s = this.sessions.get(id)!;
    if (type === FT_META_UP) {
      s.metaSealed = data;
      this.log("dc", `متای درخواست (${data.length}B) — رمز درونی است؛ دیتاسنتر نمی‌تواند بخواند`);
    } else if (type === FT_DATA_UP) {
      s.upChunks.push(data);
    } else if (type === FT_END_UP) {
      s.upDone = true;
      this.log("dc", `درخواست کامل شد (${s.upChunks.length} بخش بدنه) — آمادهٔ برداشت بات پل`);
    }
  }

  /** بات پل می‌آید برمی‌دارد (مثل getUpdates بوت تلگرام) */
  pick(): { id: number; metaSealed: Buffer; upChunks: Buffer[] } | null {
    for (const s of this.sessions.values()) {
      if (s.upDone && !s.picked && s.metaSealed) {
        s.picked = true;
        return { id: s.id, metaSealed: s.metaSealed, upChunks: [...s.upChunks] };
      }
    }
    return null;
  }

  deliver(
    id: number,
    resMetaSealed: Buffer | null,
    chunksSealed: Buffer[],
    offset: number,
    total: number,
    end: boolean,
  ): boolean {
    const conn = this.conns.get(id);
    if (!conn) return false;
    conn.deliverDown(resMetaSealed, chunksSealed, offset, total, end);
    return true;
  }

  drop(id: number): void {
    this.sessions.delete(id);
    this.conns.delete(id);
  }
}

/* ───────────────────────── بات پل (خروجی واقعی اینترنت) ───────────────────────── */

const LAB_DEFAULT_UA =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

/* ── مدیا: «CDN پل» — فایل‌های دمو از پوشهٔ public/media سرو می‌شوند (با Range واقعی) ── */

const MEDIA_MAX_BYTES = 16 * 1024 * 1024;

function mediaDir(): string {
  const candidates = [
    path.join(process.cwd(), "public", "media"), /* پروسهٔ Next.js */
    path.join(process.cwd(), "..", "..", "public", "media"), /* سرویس پل (mini-services/tunnel-bridge) */
    path.join(process.cwd(), "..", "public", "media"),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return candidates[0];
}

/** پل مثل یک CDN واقعی رفتار می‌کند: فایل مدیا را با پشتیبانی کامل Range سرو می‌کند */
export async function bridgeServeMedia(
  meta: ReqMeta,
  log: LabLog,
): Promise<{ resMeta: ResMeta; chunksSealed: Buffer[] }> {
  const t0 = Date.now();
  const name = meta.media?.name ?? "";
  const guard = validateMediaName(name);
  if (!guard.ok) {
    log("bridge", `درخواست مدیا رد شد — ${guard.error}`);
    return mediaError(meta, guard.error, t0);
  }
  const file = path.join(mediaDir(), name);
  let buf: Buffer;
  try {
    buf = await readFile(file);
  } catch {
    const msg = `فایل مدیا پیدا نشد: ${name}`;
    log("bridge", msg);
    return mediaError(meta, msg, t0);
  }
  if (buf.length > MEDIA_MAX_BYTES) {
    const msg = `فایل مدیا بزرگ‌تر از سقف است`; 
    log("bridge", msg);
    return mediaError(meta, msg, t0);
  }

  const range = parseByteRange(meta.media?.range ?? null);
  let start = 0;
  let end = buf.length - 1;
  let status = 200;
  if (range && range.start > 0) {
    start = Math.min(range.start, Math.max(0, buf.length - 1));
    end = range.end != null ? Math.min(range.end, buf.length - 1) : buf.length - 1;
    if (start > end) start = Math.max(0, buf.length - 1);
    status = 206;
  }
  const slice = buf.subarray(start, end + 1);
  const chunksSealed = splitChunks(slice).map(sealInner);
  log(
    "bridge",
    `CDN مدیا: ${name} — ${slice.length}B از بایت ${start} (بایت ${buf.length} کل) · ${chunksSealed.length} چانک رمز شد`,
  );
  return {
    resMeta: {
      id: meta.id,
      status,
      contentType: "video/mp4",
      finalUrl: `media://${name}`,
      totalChunks: chunksSealed.length,
      msBridge: Date.now() - t0,
      totalBytes: buf.length,
      rangeStart: start,
      rangeEnd: end,
    },
    chunksSealed,
  };
}

function mediaError(meta: ReqMeta, error: string, t0: number): { resMeta: ResMeta; chunksSealed: Buffer[] } {
  return {
    resMeta: {
      id: meta.id,
      status: 0,
      contentType: "",
      finalUrl: `media://${meta.media?.name ?? "?"}`,
      totalChunks: 0,
      msBridge: Date.now() - t0,
      error,
    },
    chunksSealed: [],
  };
}

export function parseReqMeta(metaSealed: Buffer): ReqMeta {
  return JSON.parse(openInner(metaSealed).toString("utf8")) as ReqMeta;
}

export function reassembleBody(upChunks: Buffer[]): Buffer {
  return Buffer.concat(upChunks.map(openInner));
}

export function splitChunks(buf: Buffer, size: number = LAB_CHUNK): Buffer[] {
  if (buf.length === 0) return [Buffer.alloc(0)];
  const out: Buffer[] = [];
  for (let o = 0; o < buf.length; o += size) out.push(buf.subarray(o, Math.min(o + size, buf.length)));
  return out;
}

/** پل درخواست را باز می‌کند، واقعاً به اینترنت می‌زند و پاسخ را چانک‌چانک رمز می‌کند */
export async function bridgeDoRequest(
  meta: ReqMeta,
  body: Buffer,
  log: LabLog,
): Promise<{ resMeta: ResMeta; chunksSealed: Buffer[] }> {
  /* درخواست مدیا → CDN داخلی پل (بدون خروج به اینترنت) */
  if (meta.media) return bridgeServeMedia(meta, log);
  const t0 = Date.now();
  const guard = validateTargetUrl(meta.url);
  if (!guard.ok) {
    log("bridge", `درخواست رد شد — ${guard.error}`);
    return {
      resMeta: {
        id: meta.id,
        status: 0,
        contentType: "",
        finalUrl: meta.url,
        totalChunks: 0,
        msBridge: Date.now() - t0,
        error: guard.error,
      },
      chunksSealed: [],
    };
  }
  log("bridge", `واکشی واقعی از اینترنت آزاد: GET ${meta.url}`);
  try {
    const res = await fetch(guard.url, {
      headers: {
        "user-agent": meta.ua?.trim() || LAB_DEFAULT_UA,
        "accept-language": "fa,en;q=0.8",
        accept: "text/html,application/json,*/*",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    const ab = await res.arrayBuffer();
    let buf = Buffer.from(ab);
    let truncated = false;
    if (buf.length > LAB_MAX_BODY) {
      buf = buf.subarray(0, LAB_MAX_BODY);
      truncated = true;
      log("bridge", `بدنه بزرگ‌تر از سقف ${LAB_MAX_BODY / 1024 / 1024}MB بود — برش خورد`);
    }
    const chunksSealed = splitChunks(buf).map(sealInner);
    log("bridge", `پاسخ ${res.status} · ${buf.length}B · ${chunksSealed.length} چانک رمز و آمادهٔ برگشت`);
    return {
      resMeta: {
        id: meta.id,
        status: res.status,
        contentType: res.headers.get("content-type") ?? "application/octet-stream",
        finalUrl: res.url || meta.url,
        totalChunks: chunksSealed.length,
        msBridge: Date.now() - t0,
        truncated,
      },
      chunksSealed,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    log("bridge", `خطای واکشی: ${msg}`);
    return {
      resMeta: {
        id: meta.id,
        status: 0,
        contentType: "",
        finalUrl: meta.url,
        totalChunks: 0,
        msBridge: Date.now() - t0,
        error: msg,
      },
      chunksSealed: [],
    };
  }
}
