import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import net from "node:net";
import { DcConnection, DcStore, bridgeDoRequest, parseReqMeta, reassembleBody } from "./core";
import {
  FT_DATA_DOWN,
  FT_END_UP,
  FT_META_DOWN,
  FT_META_UP,
  FrameParser,
  LAB_PORTS,
  TAG_INTERMEDIATE,
  buildHandshake,
  deriveKeys,
  frameEncode,
  openInner,
  parseByteRange,
  sealInner,
  validateMediaName,
  validateTargetUrl,
  type LabEvent,
  type LabLog,
  type ReqMeta,
  type ResMeta,
} from "./protocol";

/* ────────────────────────────────────────────────────────────────────────────
 * موتور کلاینت تونل — نقش «اپ میانبر» در این دمو.
 * حالت hops: ۴ هاپ واقعی روی شبکه (پروکسی 3031 ← دیتاسنتر 3032 ← پل 3033)
 * حالت inline: همان پروتکل و همان کد هسته، درون یک پروسه (fallback بدون سرویس‌ها)
 * ──────────────────────────────────────────────────────────────────────────── */

export const LAB_UA =
  "Mozilla/5.0 (Linux; Android 14; MianboorLab) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

export interface LabTiming {
  handshakeMs: number;
  bridgeMs: number;
  firstByteMs: number;
  totalMs: number;
}

export interface LabBrowseResult {
  ok: boolean;
  mode: "hops" | "inline";
  status: number;
  contentType: string;
  finalUrl: string;
  title: string | null;
  body: string | null;
  bodyB64: boolean;
  truncated: boolean;
  bytes: number;
  chunksUp: number;
  chunksDown: number;
  timing: LabTiming;
  trace: LabEvent[];
  error: string | null;
}

const emptyResult = (mode: LabBrowseResult["mode"]): LabBrowseResult => ({
  ok: false,
  mode,
  status: 0,
  contentType: "",
  finalUrl: "",
  title: null,
  body: null,
  bodyB64: false,
  truncated: false,
  bytes: 0,
  chunksUp: 0,
  chunksDown: 0,
  timing: { handshakeMs: 0, bridgeMs: 0, firstByteMs: 0, totalMs: 0 },
  trace: [],
  error: null,
});

const sortTrace = (t: LabEvent[]): LabEvent[] => [...t].sort((a, b) => a.t - b.t);

const newTunnelId = (): number => (Date.now() ^ randomBytes(3).readUIntBE(0, 3)) >>> 0;

/** سمت اپ: رمزکردن قاب‌های بالادست + رمزگشایی جریان بالادستِ برگشتی */
class TunnelClient {
  private readonly encUp: ReturnType<typeof createCipheriv>;
  private readonly decDown: ReturnType<typeof createDecipheriv>;
  private readonly parser: FrameParser;
  private upTagSent = false;
  private readonly chunks = new Map<number, Buffer>();
  private resMeta: ResMeta | null = null;
  firstByteAt = 0;

  constructor(
    keys: ReturnType<typeof deriveKeys>,
    private readonly sink: (b: Buffer) => void,
    private readonly log: LabLog,
    private readonly id: number,
    private readonly onData?: (seq: number, buf: Buffer) => void,
    private readonly onMeta?: (m: ResMeta) => void,
  ) {
    this.encUp = createCipheriv("aes-256-ctr", keys.kUp, keys.ivUp);
    this.decDown = createDecipheriv("aes-256-ctr", keys.kDown, keys.ivDown);
    this.parser = new FrameParser((type, _id, seq, _total, data) => {
      if (type === FT_META_DOWN) {
        this.resMeta = JSON.parse(openInner(data).toString("utf8")) as ResMeta;
        this.log("app", `متای پاسخ از تونل رسید: status=${this.resMeta.status} · ${this.resMeta.totalChunks} چانک در راه`);
        this.onMeta?.(this.resMeta);
      } else if (type === FT_DATA_DOWN) {
        const plain = openInner(data);
        this.chunks.set(seq, plain);
        if (!this.firstByteAt) this.firstByteAt = Date.now();
        this.onData?.(seq, plain);
      }
    });
  }

  get meta(): ResMeta | null {
    return this.resMeta;
  }

  get receivedAll(): boolean {
    return !!this.resMeta && this.chunks.size >= this.resMeta.totalChunks;
  }

  feedDown(raw: Buffer): void {
    this.parser.push(this.decDown.update(raw));
  }

  sendRequest(meta: ReqMeta): void {
    this.writeUp(FT_META_UP, 0, 1, sealInner(Buffer.from(JSON.stringify(meta), "utf8")));
    this.writeUp(
      FT_END_UP,
      0,
      1,
      sealInner(Buffer.from(JSON.stringify({ end: true }), "utf8")),
    );
  }

  assemble(): Buffer {
    const n = this.resMeta?.totalChunks ?? 0;
    const parts: Buffer[] = [];
    for (let i = 0; i < n; i++) {
      const c = this.chunks.get(i);
      if (c) parts.push(c);
    }
    return Buffer.concat(parts);
  }

  private writeUp(type: number, seq: number, total: number, data: Buffer): void {
    if (!this.upTagSent) {
      this.sink(this.encUp.update(TAG_INTERMEDIATE));
      this.upTagSent = true;
    }
    this.sink(this.encUp.update(frameEncode(type, this.id, seq, total, data)));
  }
}

function proxyAlive(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v: boolean) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    const s = net.connect(LAB_PORTS.proxy, "127.0.0.1");
    const to = setTimeout(() => {
      s.destroy();
      done(false);
    }, 600);
    s.once("connect", () => {
      clearTimeout(to);
      s.destroy();
      done(true);
    });
    s.once("error", () => {
      clearTimeout(to);
      done(false);
    });
  });
}

async function fetchEvents(port: number, sinceAbs: number): Promise<LabEvent[]> {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/events?since=${sinceAbs}`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!r.ok) return [];
    const j = (await r.json()) as { events?: LabEvent[] };
    return j.events ?? [];
  } catch {
    return [];
  }
}

function sortTraceRel(events: LabEvent[], t0: number): LabEvent[] {
  return sortTrace(events.map((e) => ({ ...e, t: Math.max(0, e.t - t0) })));
}

/** رویدادهای هر ۴ هاپ را جمع و به‌صورت نسبی مرتب می‌کند */
async function collectServiceEvents(t0: number): Promise<LabEvent[]> {
  const sinceAbs = t0 - 1000;
  const [proxyEv, dcEv, bridgeEv] = await Promise.all([
    fetchEvents(LAB_PORTS.proxyApi, sinceAbs),
    fetchEvents(LAB_PORTS.dcApi, sinceAbs),
    fetchEvents(LAB_PORTS.bridge, sinceAbs),
  ]);
  return [...proxyEv, ...dcEv, ...bridgeEv];
}

function finish(
  client: TunnelClient,
  mode: LabBrowseResult["mode"],
  t0: number,
  handshakeMs: number,
  local: LabLog,
  trace: LabEvent[],
  upFrames: number,
): LabBrowseResult {
  const meta = client.meta;
  const body = client.assemble();
  const totalMs = Date.now() - t0;
  if (!meta) {
    local("app", "پاسخی از تونل دریافت نشد");
    return {
      ...emptyResult(mode),
      timing: { ...emptyResult(mode).timing, totalMs },
      trace: sortTrace(trace),
      error: "پاسخی از تونل دریافت نشد",
    };
  }
  const isText = /text|json|xml|javascript/i.test(meta.contentType);
  const text = isText ? body.toString("utf8") : null;
  const title =
    text && /html/i.test(meta.contentType)
      ? (text.match(/<title[^>]*>([^<]{1,300})<\/title>/i)?.[1]?.trim() ?? null)
      : null;
  local("app", `تونل کامل شد — ${body.length} بایت در ${totalMs}ms`);
  return {
    ok: meta.status > 0 && !meta.error,
    mode,
    status: meta.status,
    contentType: meta.contentType,
    finalUrl: meta.finalUrl,
    title,
    body: text,
    bodyB64: !isText,
    truncated: !!meta.truncated,
    bytes: body.length,
    chunksUp: upFrames,
    chunksDown: meta.totalChunks,
    timing: {
      handshakeMs,
      bridgeMs: meta.msBridge,
      firstByteMs: client.firstByteAt ? client.firstByteAt - t0 : 0,
      totalMs,
    },
    trace: sortTrace(trace),
    error: meta.error ?? null,
  };
}

/** مسیر کامل واقعی: اپ → پروکسی (TCP) → دیتاسنتر → پل → اینترنت و برگشت */
async function viaHops(
  target: string,
  t0: number,
  local: LabLog,
  trace: LabEvent[],
): Promise<LabBrowseResult> {
  const hs = buildHandshake();
  const keys = deriveKeys(hs);
  const id = newTunnelId();
  local("app", `هندشیک ۶۴ بایتی ساخته شد (dc=${hs.readUInt16LE(56)}) — کلیدهای CTR از رمز پروکسی مشتق شدند`);

  const socket = await new Promise<net.Socket>((resolve, reject) => {
    const s = net.connect(LAB_PORTS.proxy, "127.0.0.1");
    const to = setTimeout(() => {
      s.destroy();
      reject(new Error("اتصال به پروکسی MTProto ممکن نشد"));
    }, 5000);
    s.once("connect", () => {
      clearTimeout(to);
      resolve(s);
    });
    s.once("error", (e) => {
      clearTimeout(to);
      reject(e instanceof Error ? e : new Error("socket error"));
    });
  });
  const handshakeMs = Date.now() - t0;
  socket.write(hs); /* هندشیک ۶۴ بایتی — بدون رمز، دقیقاً مثل شروع اتصال MTProto */
  local("app", "به پروکسی تلگرام وصل شد — هندشیک رفت");

  let upBytes = 0;
  const client = new TunnelClient(
    keys,
    (b) => {
      upBytes += b.length;
      socket.write(b);
    },
    local,
    id,
  );

  const done = new Promise<void>((resolve, reject) => {
    const to = setTimeout(() => reject(new Error("تایم‌اوت پاسخ از تونل (۲۵ ثانیه)")), 25_000);
    const cleanup = () => {
      clearTimeout(to);
      socket.off("data", onData);
      socket.off("error", onErr);
      socket.off("close", onClose);
    };
    const onData = (d: Buffer) => {
      client.feedDown(d);
      if (client.receivedAll) {
        cleanup();
        resolve();
      }
    };
    const onErr = (e: Error) => {
      cleanup();
      reject(e);
    };
    const onClose = () => {
      if (!client.receivedAll) {
        cleanup();
        reject(new Error("تونل نیمه‌کاره بسته شد"));
      }
    };
    socket.on("data", onData);
    socket.on("error", onErr);
    socket.on("close", onClose);
  });

  client.sendRequest({ id, url: target, ua: LAB_UA });
  local("app", "درخواست رمز شد و وارد پروکسی شد (متا + پایان)", upBytes);

  await done;
  socket.destroy();

  trace.push(...(await collectServiceEvents(t0)).map((e) => ({ ...e, t: Math.max(0, e.t - t0) })));
  return finish(client, "hops", t0, handshakeMs, local, trace, 2);
}

/** fallback: همان پروتکل و همان کد هسته، ولی همهٔ هاپ‌ها درون یک پروسه */
async function inline(
  target: string,
  t0: number,
  local: LabLog,
  trace: LabEvent[],
): Promise<LabBrowseResult> {
  const hs = buildHandshake();
  const keys = deriveKeys(hs);
  const id = newTunnelId();
  local("app", "حالت تک‌سروری: همان پروتکل و همان کد، ولی همهٔ هاپ‌ها درون یک پروسه");

  const downBuf: Buffer[] = [];
  const store = new DcStore(local);
  const conn = new DcConnection(keys, (b) => downBuf.push(b), local, store);
  const client = new TunnelClient(keys, (b) => conn.feed(b), local, id);

  client.sendRequest({ id, url: target, ua: LAB_UA });
  local("app", "درخواست رمز شد و مستقیم به منطق دیتاسنتر رسید (بدون شبکه)");

  const job = store.pick();
  if (!job) throw new Error("سشن در دیتاسنتر ساخته نشد");
  const meta = parseReqMeta(job.metaSealed);
  const body = reassembleBody(job.upChunks);
  const { resMeta, chunksSealed } = await bridgeDoRequest(meta, body, local);
  store.deliver(
    job.id,
    sealInner(Buffer.from(JSON.stringify(resMeta), "utf8")),
    chunksSealed,
    0,
    resMeta.totalChunks,
    true,
  );

  client.feedDown(Buffer.concat(downBuf));
  return finish(client, "inline", t0, 0, local, trace, 2);
}

export async function labBrowse(rawUrl: string): Promise<LabBrowseResult> {
  const guard = validateTargetUrl(rawUrl);
  if (!guard.ok)
    return {
      ...emptyResult("inline"),
      error: guard.error,
      trace: [{ t: 0, hop: "app", msg: guard.error }],
    };
  const t0 = Date.now();
  const trace: LabEvent[] = [];
  const local: LabLog = (hop, msg, bytes) => trace.push({ t: Date.now() - t0, hop, msg, bytes });
  const hops = await proxyAlive();
  local(
    "app",
    hops
      ? "سرویس‌های آزمایشگاه فعال‌اند — مسیر کامل ۴ هاپ واقعی"
      : "سرویس‌های لوکال در دسترس نیست — حالت تک‌سروری (همان منطق، درون یک پروسه)",
  );
  try {
    return hops
      ? await viaHops(guard.url.toString(), t0, local, trace)
      : await inline(guard.url.toString(), t0, local, trace);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته";
    local("app", `خطا: ${msg}`);
    const svcEvents = hops ? await collectServiceEvents(t0) : [];
    return {
      ...emptyResult(hops ? "hops" : "inline"),
      error: msg,
      trace: sortTraceRel([...trace, ...svcEvents], t0),
    };
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * ویدیو از داخل تونل — جریان پیش‌روندهٔ واقعی (Streaming)
 *
 * همان پروتکل ۴ هاپ، این‌بار به‌صورت استریم: هر چانک ۱۶KB به‌محض رسیدن و
 * رمزگشایی، به‌ترتیب داخل ReadableStream تزریق می‌شود تا <video> مرورگر
 * همان لحظه پخش را شروع کند (بافر می‌سازد). سک‌ها = درخواست Range جدید
 * از بایت موردنظر؛ پل مثل یک CDN واقعی از همان آفست سرو می‌کند.
 * ════════════════════════════════════════════════════════════════════════════ */

/** صف بازچینی چانک‌ها: بر اساس seq مرتب و به‌ترتیب به استریم تزریق می‌کند */
class ChunkFlow {
  private readonly pending = new Map<number, Buffer>();
  private nextSeq = 0;
  private readonly queue: Buffer[] = [];
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private closed = false;
  bytes = 0;
  count = 0;
  error = "";

  push(seq: number, buf: Buffer): void {
    if (this.closed) return;
    if (seq < this.nextSeq) return;
    this.pending.set(seq, buf);
    while (this.pending.has(this.nextSeq)) {
      const b = this.pending.get(this.nextSeq)!;
      this.pending.delete(this.nextSeq);
      this.nextSeq++;
      this.queue.push(b);
      this.bytes += b.length;
      this.count++;
    }
    this.drain();
  }

  attach(c: ReadableStreamDefaultController<Uint8Array>): void {
    this.controller = c;
    this.drain();
  }

  private drain(): void {
    if (!this.controller) return;
    while (this.queue.length > 0) {
      const b = this.queue.shift()!;
      try {
        this.controller.enqueue(new Uint8Array(b));
      } catch {
        return;
      }
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    try {
      this.controller?.close();
    } catch {
      /* قبلاً بسته شده */
    }
  }

  fail(msg: string): void {
    this.error = msg;
    this.close();
  }
}

interface VideoSession {
  meta: ResMeta;
  abort: () => void;
  done: Promise<void>;
}

/** مسیر ۴ هاپ واقعی برای ویدیو — همان viaHops ولی جریانی */
async function videoViaHops(
  name: string,
  rangeStr: string | null,
  id: number,
  flow: ChunkFlow,
  local: LabLog,
): Promise<VideoSession> {
  const hs = buildHandshake();
  const keys = deriveKeys(hs);
  local("app", `هندشیک ۶۴ بایتی ویدیو ساخته شد — کلیدهای CTR مشتق شدند (تونل #${id % 10000})`);

  const socket = await new Promise<net.Socket>((resolve, reject) => {
    const s = net.connect(LAB_PORTS.proxy, "127.0.0.1");
    const to = setTimeout(() => {
      s.destroy();
      reject(new Error("اتصال به پروکسی MTProto ممکن نشد"));
    }, 5000);
    s.once("connect", () => {
      clearTimeout(to);
      resolve(s);
    });
    s.once("error", (e) => {
      clearTimeout(to);
      reject(e instanceof Error ? e : new Error("socket error"));
    });
  });
  socket.write(hs);
  local("app", "به پروکسی تلگرام وصل شد — سشن ویدیو از مسیر رلهٔ کور می‌گذرد");

  let metaResolve!: (m: ResMeta) => void;
  let metaReject!: (e: Error) => void;
  const metaPromise = new Promise<ResMeta>((res, rej) => {
    metaResolve = res;
    metaReject = rej;
  });
  const metaTimer = setTimeout(() => metaReject(new Error("متای ویدیو از تونل نرسید (۱۲ ثانیه)")), 12_000);

  const client = new TunnelClient(
    keys,
    (b) => socket.write(b),
    local,
    id,
    (seq, buf) => flow.push(seq, buf),
    (m) => metaResolve(m),
  );

  const done = new Promise<void>((resolve, reject) => {
    const to = setTimeout(() => reject(new Error("جریان ویدیو قطع شد (تایم‌اوت ۶۰ ثانیه)")), 60_000);
    const cleanup = () => {
      clearTimeout(to);
      clearTimeout(metaTimer);
      socket.off("data", onData);
      socket.off("error", onErr);
      socket.off("close", onClose);
    };
    const onData = (d: Buffer) => {
      client.feedDown(d);
      if (client.receivedAll) {
        cleanup();
        resolve();
      }
    };
    const onErr = (e: Error) => {
      cleanup();
      reject(e);
    };
    const onClose = () => {
      cleanup();
      if (client.receivedAll) resolve();
      else reject(new Error("تونل ویدیو نیمه‌کاره بسته شد"));
    };
    socket.on("data", onData);
    socket.on("error", onErr);
    socket.on("close", onClose);
  });

  /* درخواست: متای رمزشده + قاب پایان — مثل بقیهٔ ترافیک تونل */
  const reqMeta: ReqMeta = { id, url: `media://${name}`, ua: LAB_UA, media: { name, ...(rangeStr ? { range: rangeStr } : {}) } };
  client.sendRequest(reqMeta);
  local("app", `درخواست ویدیو رمز شد و وارد پروکسی شد${rangeStr ? ` — از بایت ${parseByteRange(rangeStr)?.start} ادامه` : ""}`);

  void done
    .then(() => flow.close())
    .catch((e: unknown) => {
      flow.fail(e instanceof Error ? e.message : "خطای جریان ویدیو");
    });

  const meta = await metaPromise;
  return { meta, abort: () => socket.destroy(), done };
}

/** fallback تک‌سروری برای ویدیو — همان پروتکل، تحویلِ دسته‌ای پیش‌رونده */
async function videoInline(
  name: string,
  rangeStr: string | null,
  id: number,
  flow: ChunkFlow,
  local: LabLog,
): Promise<VideoSession> {
  const keys = deriveKeys(buildHandshake());
  const downBuf: Buffer[] = [];
  const store = new DcStore(local);
  const conn = new DcConnection(keys, (b) => downBuf.push(b), local, store);
  local("app", "حالت تک‌سروری ویدیو: همان پروتکل و همان کد هسته، درون یک پروسه");

  let metaResolve!: (m: ResMeta) => void;
  const client = new TunnelClient(
    keys,
    (b) => conn.feed(b),
    local,
    id,
    (seq, buf) => flow.push(seq, buf),
    (m) => metaResolve(m),
  );
  const metaPromise = new Promise<ResMeta>((res) => {
    metaResolve = res;
  });

  client.sendRequest({
    id,
    url: `media://${name}`,
    ua: LAB_UA,
    media: { name, ...(rangeStr ? { range: rangeStr } : {}) },
  });

  const done = (async () => {
    const job = store.pick();
    if (!job) throw new Error("سشن ویدیو در دیتاسنتر ساخته نشد");
    const meta = parseReqMeta(job.metaSealed);
    const body = reassembleBody(job.upChunks);
    const { resMeta, chunksSealed } = await bridgeDoRequest(meta, body, local);
    if (resMeta.error) throw new Error(resMeta.error);
    const resMetaSealed = sealInner(Buffer.from(JSON.stringify(resMeta), "utf8"));
    const BATCH = 6;
    for (let i = 0; i < chunksSealed.length; i += BATCH) {
      store.deliver(
        job.id,
        i === 0 ? resMetaSealed : null,
        chunksSealed.slice(i, i + BATCH),
        i,
        chunksSealed.length,
        i + BATCH >= chunksSealed.length,
      );
      client.feedDown(Buffer.concat(downBuf));
      downBuf.length = 0;
      /* مکث کوتاه بین دسته‌ها → جریان واقعاً پیش‌رونده به مرورگر می‌رسد */
      if (i + BATCH < chunksSealed.length) await new Promise((r) => setTimeout(r, 4));
    }
    flow.close();
  })();
  void done.catch((e: unknown) => flow.fail(e instanceof Error ? e.message : "خطای جریان ویدیو"));

  const meta = await Promise.race([
    metaPromise,
    new Promise<ResMeta>((_, rej) => setTimeout(() => rej(new Error("متای ویدیو نرسید (۱۰ ثانیه)")), 10_000)),
  ]);
  return { meta, abort: () => {}, done };
}

export interface LabVideoStart {
  ok: boolean;
  error: string | null;
  status: number; /* 200 یا 206 */
  contentType: string;
  totalBytes: number;
  rangeStart: number;
  rangeEnd: number;
  bytes: number;
  totalChunks: number;
  msBridge: number;
  mode: "hops" | "inline";
  stream: ReadableStream<Uint8Array>;
  trace: LabEvent[];
}

const failVideo = (error: string): LabVideoStart => ({
  ok: false,
  error,
  status: 0,
  contentType: "",
  totalBytes: 0,
  rangeStart: 0,
  rangeEnd: 0,
  bytes: 0,
  totalChunks: 0,
  msBridge: 0,
  mode: "inline",
  stream: new ReadableStream<Uint8Array>({ start() {} }),
  trace: [],
});

/**
 * شروع یک سشن استریم ویدیو از داخل تونل.
 * تا رسیدن متا صبر می‌کند (هدرها معلوم شوند) و بقیه به‌صورت جریان برمی‌گردد.
 */
export async function labVideoStart(
  rawName: string,
  rangeHeader: string | null,
  onEvent?: (e: LabEvent) => void,
): Promise<LabVideoStart> {
  const guard = validateMediaName(rawName);
  if (!guard.ok) return failVideo(guard.error);
  const name = rawName;
  const range = parseByteRange(rangeHeader);
  const rangeStr = range && range.start > 0 ? `bytes=${range.start}-` : null;

  const t0 = Date.now();
  const trace: LabEvent[] = [];
  const local: LabLog = (hop, msg, bytes) => {
    const e: LabEvent = { t: Date.now() - t0, hop, msg, bytes };
    trace.push(e);
    onEvent?.(e);
  };

  const flow = new ChunkFlow();
  let hops = false;
  try {
    hops = await proxyAlive();
    local(
      "app",
      hops ? "سشن ویدیو: مسیر کامل ۴ هاپ فعال است" : "سشن ویدیو: سرویس‌های لوکال نیستند — حالت تک‌سروری",
    );
    const session = hops
      ? await videoViaHops(name, rangeStr, newTunnelId(), flow, local)
      : await videoInline(name, rangeStr, newTunnelId(), flow, local);
    const meta = session.meta;
    if (meta.error) {
      session.abort();
      local("bridge", `خطای پل: ${meta.error}`);
      return failVideo(meta.error);
    }
    local(
      "app",
      `هدرها آماده شد: ${meta.status} · ${meta.totalChunks} چانک · بایت ${meta.rangeStart ?? 0} تا ${meta.rangeEnd ?? 0} از ${meta.totalBytes ?? 0}`,
    );
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        flow.attach(c);
      },
      cancel() {
        session.abort();
        flow.close();
      },
    });
    return {
      ok: true,
      error: null,
      status: meta.status,
      contentType: meta.contentType || "video/mp4",
      totalBytes: meta.totalBytes ?? 0,
      rangeStart: meta.rangeStart ?? 0,
      rangeEnd: meta.rangeEnd ?? 0,
      bytes: flow.bytes,
      totalChunks: meta.totalChunks,
      msBridge: meta.msBridge,
      mode: hops ? "hops" : "inline",
      stream,
      trace: sortTrace(trace),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناختهٔ تونل ویدیو";
    local("app", `خطا: ${msg}`);
    flow.fail(msg);
    return { ...failVideo(msg), trace: sortTrace(trace), mode: hops ? "hops" : "inline" };
  }
}
