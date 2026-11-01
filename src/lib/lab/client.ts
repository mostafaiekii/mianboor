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
  sealInner,
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
  ) {
    this.encUp = createCipheriv("aes-256-ctr", keys.kUp, keys.ivUp);
    this.decDown = createDecipheriv("aes-256-ctr", keys.kDown, keys.ivDown);
    this.parser = new FrameParser((type, _id, seq, _total, data) => {
      if (type === FT_META_DOWN) {
        this.resMeta = JSON.parse(openInner(data).toString("utf8")) as ResMeta;
        this.log("app", `متای پاسخ از تونل رسید: status=${this.resMeta.status} · ${this.resMeta.totalChunks} چانک در راه`);
      } else if (type === FT_DATA_DOWN) {
        this.chunks.set(seq, openInner(data));
        if (!this.firstByteAt) this.firstByteAt = Date.now();
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
