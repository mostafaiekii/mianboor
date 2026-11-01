"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Database,
  FlaskConical,
  Globe,
  Loader2,
  Lock,
  MonitorPlay,
  Play,
  RefreshCw,
  Server,
  Smartphone,
  X,
  Youtube,
} from "lucide-react";
import type { LabBrowseResult } from "@/lib/lab/client";
import type { LabEvent, LabHop } from "@/lib/lab/protocol";

/* ────────────────────────────────────────────────────────────────────────────
 * آزمایشگاه TgTunnel — دموی زندهٔ «وبگردی کامل با پروکسی تلگرام»
 * دو حالت:
 *  ۱) «۴ هاپ لوکال» — اپ → پروکسی MTProto → دیتاسنتر → بات پُل → اینترنت
 *     (نقش دیتاسنتر/بات لوکال شبیه‌سازی شده؛ همین مسیر با VPS واقعی می‌شود)
 *  ۲) «پُل میانبر — بدون VPS» — همان موتوری که داخل اپ اندروید می‌آید:
 *     فریم‌بندی ۱۶KB + رمز AES-256-GCM واقعی در مرورگر، پُل روی سرور میانبر
 * ──────────────────────────────────────────────────────────────────────────── */

type Mode = "local" | "bridge";
type Tab = "web" | "video";

const HOP_META: Record<LabHop, { label: string; cls: string }> = {
  app: { label: "اپ", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  proxy: { label: "پروکسی", cls: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  dc: { label: "دیتاسنتر", cls: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  bridge: { label: "بات پُل", cls: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  net: { label: "شبکه", cls: "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400" },
};

const PRESETS = [
  { label: "example.com", url: "https://example.com" },
  { label: "httpbin · صفحهٔ نمونه", url: "https://httpbin.org/html" },
  { label: "vercel.com (سنگین ~۵۷۰KB)", url: "https://vercel.com" },
];

const DEMO_PROXY_LINK = "tg://proxy?server=127.0.0.1&port=3031&secret=dd6f9b2ddc9658ebf92244c869709c9f78";

/** گره‌های نمایش مسیر برای هر حالت */
const NODES: Record<Mode, { icon: typeof Smartphone; label: string; hint: string }[]> = {
  local: [
    { icon: Smartphone, label: "اپ میانبر", hint: "موتور TgTunnel" },
    { icon: Lock, label: "پروکسی تلگرام", hint: "رلهٔ کور" },
    { icon: Database, label: "دیتاسنتر تلگرام", hint: "بدون رمز درونی" },
    { icon: Bot, label: "بات پُل", hint: "خروجی واقعی" },
    { icon: Globe, label: "اینترنت آزاد", hint: "مقصد" },
  ],
  bridge: [
    { icon: Smartphone, label: "اپ میانبر", hint: "همین کد در اپ" },
    { icon: Lock, label: "قاب‌بندی + رمز", hint: "فریم ۱۶KB · AES-GCM" },
    { icon: Server, label: "پُل میانبر", hint: "روی سرور خودمان" },
    { icon: Globe, label: "خروج واقعی", hint: "واکشی مقصد" },
    { icon: FlaskConical, label: "برگشت رمزی", hint: "فریم به فریم" },
  ],
};

function fmtBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

/* ── ویدیو از داخل تونل ── */

const VID_QUALITIES = [
  { name: "clip-360.mp4", label: "۳۶۰p", sub: "سبک" },
  { name: "clip-480.mp4", label: "۴۸۰p", sub: "معمولی" },
] as const;

const VNODES = [
  { icon: Smartphone, label: "اپ میانبر" },
  { icon: Lock, label: "پروکسی تلگرام" },
  { icon: Database, label: "دیتاسنتر" },
  { icon: Bot, label: "بات پُل" },
  { icon: MonitorPlay, label: "CDN ویدیو" },
];

interface VidStats {
  ok: boolean;
  name: string;
  bytes: number;
  chunks: number;
  requests: number;
  seeks: number;
  bps: number;
  active: boolean;
  done: boolean;
  error: string | null;
  mode: "hops" | "inline" | null;
  msBridge: number;
  elapsedMs: number;
  log: LabEvent[];
}

/* ── تب ویدیو: پخش‌کنندهٔ واقعی که همهٔ بایت‌هایش از تونل ۴-هاپ می‌آید ── */
function VideoLab() {
  const [quality, setQuality] = useState<string>(VID_QUALITIES[1].name);
  const [nonce, setNonce] = useState(0);
  const [st, setSt] = useState<VidStats | null>(null);
  const [bufferedAhead, setBufferedAhead] = useState(0);
  const [playState, setPlayState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const [errText, setErrText] = useState("");
  const vidRef = useRef<HTMLVideoElement | null>(null);
  const sidRef = useRef(`v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    pollRef.current = setInterval(() => {
      void (async () => {
        try {
          const r = await fetch(`/api/lab/video-stats?sid=${sidRef.current}`, { cache: "no-store" });
          if (r.ok) setSt((await r.json()) as VidStats);
        } catch {
          /* پول بعدی */
        }
      })();
      const v = vidRef.current;
      if (v && v.buffered.length > 0) {
        setBufferedAhead(Math.max(0, v.buffered.end(v.buffered.length - 1) - v.currentTime));
      }
    }, 500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const switchQuality = (name: string) => {
    if (name === quality) return;
    setQuality(name);
    setNonce((n) => n + 1);
    setPlayState("idle");
    setErrText("");
  };

  const retry = () => {
    setNonce((n) => n + 1);
    setPlayState("idle");
    setErrText("");
  };

  const src = `/api/lab/video?name=${quality}&sid=${sidRef.current}&n=${nonce}`;
  const bps = st?.bps ?? 0;
  const flowing = (st?.active ?? false) && !st?.done;
  const buffering = playState === "loading" || (playState === "idle" && (st?.bytes ?? 0) > 0 && !st?.done);
  const modeTag =
    st?.mode === "hops" ? "۴ هاپ واقعی روی شبکه" : st?.mode === "inline" ? "تک‌سروری (fallback)" : "—";

  return (
    <>
      {/* توپولوژی ویدیو */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold">مسیر ویدیو — از اپ تا CDN، همه رمزی</h3>
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
              flowing
                ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            {flowing ? "در حال عبور از تونل" : buffering ? "پر شدن بافر" : "آماده"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1">
          {VNODES.map((n, i) => (
            <div key={n.label} className="flex min-w-0 flex-1 items-center gap-1">
              <div className="flex min-w-0 flex-col items-center gap-1">
                <span
                  className={`grid size-9 place-items-center rounded-full border-2 transition sm:size-11 ${
                    flowing || buffering
                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-border bg-muted text-muted-foreground"
                  } ${flowing && bps > 0 ? "animate-pulse" : ""}`}
                >
                  <n.icon className="size-4 sm:size-5" />
                </span>
                <span className="max-w-full truncate text-center text-[9px] leading-tight text-muted-foreground sm:text-[11px]">
                  {n.label}
                </span>
              </div>
              {i < VNODES.length - 1 && (
                <span className="relative h-0.5 min-w-2 flex-1 rounded bg-border">
                  {(flowing || buffering) && (
                    <i className="lab-dot absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-emerald-500" style={{ animationDelay: `${i * 0.22}s` }} />
                  )}
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
          هر ثانیه ویدیو = چند قاب ۱۶KB که با AES-256-GCM (لایهٔ درونی اپ↔پل) داخل جریان رمز CTR (لایهٔ بیرونی سبک
          obfuscated2) رد می‌شوند — پروکسی و دیتاسنتر فقط قاب می‌بینند، نه محتوا. سک روی تایم‌لاین = سشن Range جدید از
          همان بایت.
        </p>
      </section>

      {/* پخش‌کننده */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <Youtube className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">Mianboor TV — پخش از داخل تونل</div>
              <div className="truncate text-[10px] text-muted-foreground">
                ویدیوی واقعی ۶۰ ثانیه‌ای (H.264+AAC) — تمام بایت‌هایش از مسیر پروکسی تلگرام رد شده، نه از CDN معمولی
              </div>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
            <i className="size-1.5 animate-pulse rounded-full bg-rose-500" />
            TUNNELED
          </span>
        </div>

        <div className="relative bg-neutral-950">
          <video
            key={src}
            ref={vidRef}
            src={src}
            controls
            playsInline
            preload="auto"
            className="aspect-video w-full"
            onPlaying={() => setPlayState("playing")}
            onWaiting={() => setPlayState("loading")}
            onCanPlay={() => setPlayState((s) => (s === "loading" ? "playing" : s))}
            onError={() => {
              setPlayState("error");
              setErrText(st?.error ?? "جریان ویدیو از تونل نرسید — دوباره تلاش کن");
            }}
          />
          {playState === "idle" && (
            <button
              type="button"
              onClick={() => {
                setPlayState("loading");
                void vidRef.current?.play().catch(() => setPlayState("idle"));
              }}
              aria-label="پخش ویدیو از داخل تونل"
              className="group absolute inset-0 grid place-items-center bg-black/45 transition hover:bg-black/30"
            >
              <span className="grid size-16 place-items-center rounded-full bg-rose-600 text-white shadow-xl shadow-rose-600/30 transition group-hover:scale-105 sm:size-20">
                <Play className="size-7 -translate-x-0.5 fill-current sm:size-9" />
              </span>
              <span className="absolute bottom-4 rounded-full bg-black/60 px-3 py-1 text-[11px] text-white/90">
                {buffering ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="size-3 animate-spin" /> بافر در حال پر شدن از تونل…
                  </span>
                ) : (
                  "پخش از داخل تونل ۴-هاپ"
                )}
              </span>
            </button>
          )}
          {playState === "loading" && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <Loader2 className="size-10 animate-spin text-white/85" />
            </div>
          )}
        </div>

        {/* بافر */}
        <div className="px-4 pt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-rose-500/70 transition-all duration-500"
              style={{ width: `${Math.min(100, (bufferedAhead / 20) * 100)}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>سلامت بافر: {bufferedAhead.toFixed(1)} ثانیه پیش‌رو</span>
            <span dir="ltr">{quality === "clip-360.mp4" ? "640×360 · 320kbps" : "854×480 · 470kbps"}</span>
          </div>
        </div>

        {/* کیفیت + کنترل */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <span className="text-xs font-bold">کیفیت (از داخل تونل):</span>
          {VID_QUALITIES.map((q) => (
            <button
              key={q.name}
              type="button"
              onClick={() => switchQuality(q.name)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                quality === q.name
                  ? "border-rose-500/50 bg-rose-500/10 font-bold text-rose-600 dark:text-rose-400"
                  : "border-border bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {q.label} <span className="text-[9px] opacity-70">{q.sub}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={retry}
            className="ms-auto flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <RefreshCw className="size-3.5" /> بارگیری مجدد از تونل
          </button>
        </div>
      </section>

      {(playState === "error" || st?.error) && (
        <section className="flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{errText || st?.error} — دکمهٔ «بارگیری مجدد از تونل» را بزن.</span>
        </section>
      )}

      {/* آمار زنده */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          { label: "سرعت لحظه‌ای از تونل", value: bps > 0 ? `${Math.round(bps / 1024)} KB/s` : "—" },
          { label: "حجم دریافت‌شده", value: fmtBytes(st?.bytes ?? 0) },
          { label: "پرده‌های رمزی", value: `${st?.chunks ?? 0}` },
          { label: "درخواست‌های تونل", value: `${st?.requests ?? 0} (سک: ${st?.seeks ?? 0})` },
          { label: "واکشی پل/CDN", value: st?.msBridge ? `${st.msBridge} ms` : "—" },
          { label: "مسیر فعال", value: modeTag },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3">
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-sm font-black tabular-nums">{s.value}</div>
          </div>
        ))}
      </section>

      {/* گزارش زنده */}
      {st && st.log.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-bold">گزارش زندهٔ جریان ویدیو</h3>
          <div className="lab-scroll max-h-56 space-y-1.5 overflow-y-auto rounded-xl bg-muted/40 p-3">
            {st.log.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] leading-5">
                <span className="w-14 shrink-0 text-left font-mono tabular-nums text-muted-foreground" dir="ltr">
                  {e.t}ms
                </span>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold ${HOP_META[e.hop].cls}`}>
                  {HOP_META[e.hop].label}
                </span>
                <span className="min-w-0 flex-1 text-foreground/90">{e.msg}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* یوتیوب واقعی */}
      <section className="rounded-2xl border border-border bg-card p-4 text-xs leading-6 text-muted-foreground">
        <h3 className="mb-2 text-sm font-bold text-foreground">پس یوتیوب چی؟</h3>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <b className="text-foreground">همین مسیر، هم‌ین قاب‌ها:</b> یوتیوب هم فقط HTTPS است — ویدیوها تکه‌تکه (DASH)
            می‌آیند و هر تکه مثل همین فایل، به‌صورت قاب‌های ۱۶KB رمزشده از تونل رد می‌شود.
          </li>
          <li>
            <b className="text-foreground">سطح ۱ (بدون VPS):</b> با فریم‌های موازی و پیش‌بارگیری، عملاً ۲۴۰p تا ۴۸۰p روان
            پخش می‌شود؛ ۷۲۰p مرزی است (بسته به اپراتور).
          </li>
          <li>
            <b className="text-foreground">سطح ۲ (VPS):</b> پهنای‌باند واقعی و تأخیر کم → ۷۲۰p و ۱۰۸۰p بدون لگ. هر وقت VPS
            گرفتی، فقط نقطهٔ اتصال عوض می‌شود؛ موتور همین است.
          </li>
          <li>
            <b className="text-foreground">در اپ اندروید:</b> QUIC/UDP-443 بسته می‌شود تا یوتیوب مجبور شود روی TLS-over-TCP
            بیاید — یعنی دقیقاً همان مسیری که تونل جواب می‌دهد.
          </li>
        </ul>
      </section>
    </>
  );
}

/* ── موتور سمت مرورگر برای حالت «پُل میانبر» — همان کاری که اپ اندروید می‌کند ── */

const enc = new TextEncoder();
const dec = new TextDecoder();

function hexToBytes(h: string): Uint8Array {
  const a = new Uint8Array(h.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return a;
}
function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

interface BridgeView {
  ok: boolean;
  error?: string;
  body?: string;
  contentType?: string;
  finalUrl?: string;
  title?: string | null;
  truncated?: boolean;
  trace: LabEvent[];
  stats: { label: string; value: string }[];
}

async function bridgeBrowse(
  url: string,
  lit: (n: number) => void,
): Promise<BridgeView> {
  const trace: LabEvent[] = [];
  const t0 = Date.now();
  const log = (hop: LabHop, msg: string) => trace.push({ t: Date.now() - t0, hop, msg });

  /* ۱) هندشیک */
  lit(1);
  const hs = await fetch("/api/tgtunnel/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: (process.env.NEXT_PUBLIC_CLIENT_TOKEN ?? "").trim() }),
  }).then((r) => r.json());
  if (!hs.ok) throw new Error(hs.error ?? "هندشیک با پُل شکست خورد");
  log("app", `هندشیک انجام شد — نشست ${String(hs.sid).slice(0, 8)}… صادر شد${hs.demo ? " (حالت دمو)" : ""}`);

  const cryptoKey = await crypto.subtle.importKey("raw", hexToBytes(hs.key) as BufferSource, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);

  /* ۲) قاب‌بندی و رمز درخواست */
  lit(2);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, cryptoKey, enc.encode(JSON.stringify({ url }))),
  );
  log("app", `درخواست در قاب رمز شد — ${fmtBytes(sealed.length)} (IV ۱۲B + تگ GCM)`);

  /* ۳) عبور از پُل و خروج واقعی */
  lit(3);
  const res = await fetch("/api/tgtunnel/fetch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sid: hs.sid, frames: [{ seq: 0, iv: bytesToHex(iv), ct: bytesToHex(sealed) }] }),
  }).then((r) => r.json());
  if (!res.ok) throw new Error(res.error ?? "پُل درخواست را نپذیرفت");
  log("bridge", `پُل مقصد را واکشی کرد — ${res.meta.bytes} بایت در ${res.meta.ms}ms (وضعیت ${res.meta.status})`);
  lit(4);

  /* ۴) رمزگشایی فریم به فریم مسیر برگشت */
  const parts: Uint8Array[] = [];
  for (const f of res.frames as Array<{ seq: number; iv: string; ct: string }>) {
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: hexToBytes(f.iv) as BufferSource },
      cryptoKey,
      hexToBytes(f.ct) as BufferSource,
    );
    parts.push(new Uint8Array(pt));
  }
  log("app", `${res.frames.length} فریم برگشتی رمزگشایی و چیده شد`);
  lit(5);

  const payload = JSON.parse(dec.decode(concatBytes(parts))) as {
    status: number;
    contentType: string;
    finalUrl: string;
    body: string;
    bytes: number;
    truncated: boolean;
  };
  const totalMs = Date.now() - t0;
  log("net", `آمادهٔ نمایش — ${fmtBytes(payload.bytes)} از ${payload.finalUrl}`);

  return {
    ok: true,
    body: payload.body,
    contentType: payload.contentType,
    finalUrl: payload.finalUrl,
    truncated: payload.truncated,
    trace,
    stats: [
      { label: "زمان کل", value: `${totalMs} ms` },
      { label: "واکشی پُل", value: `${res.meta.ms} ms` },
      { label: "حجم پاسخ", value: fmtBytes(payload.bytes) },
      { label: "فریم‌ها", value: `۱↑ / ${res.frames.length}↓` },
      { label: "وضعیت", value: `${payload.status}` },
      {
        label: "سرعت مؤثر",
        value: totalMs > 0 && payload.bytes > 0 ? `${Math.max(1, Math.round(payload.bytes / 1024 / (totalMs / 1000)))} KB/s` : "—",
      },
    ],
  };
}

function concatBytes(list: Uint8Array[]): Uint8Array {
  const total = list.reduce((s, b) => s + b.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const b of list) {
    out.set(b, off);
    off += b.length;
  }
  return out;
}

/* ── کامپوننت آزمایشگاه ── */

export function TgTunnelLab({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("web");
  const [mode, setMode] = useState<Mode>("bridge");
  const [url, setUrl] = useState("https://example.com");
  const [running, setRunning] = useState(false);
  const [litHops, setLitHops] = useState(0);
  const [result, setResult] = useState<LabBrowseResult | BridgeView | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState("");
  const litTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => () => {
    if (litTimer.current) clearInterval(litTimer.current);
  }, []);

  if (!open) return null;

  const isLab = (r: LabBrowseResult | BridgeView): r is LabBrowseResult => "timing" in r;
  const view = result
    ? isLab(result)
      ? {
          ok: result.ok,
          error: result.error ?? "",
          body: result.body ?? undefined,
          contentType: result.contentType,
          finalUrl: result.finalUrl,
          title: result.title,
          truncated: result.truncated,
          trace: result.trace,
          stats: [
            { label: "زمان کل", value: `${result.timing.totalMs} ms` },
            { label: "اولین بایت", value: result.timing.firstByteMs ? `${result.timing.firstByteMs} ms` : "—" },
            { label: "حجم پاسخ", value: fmtBytes(result.bytes) },
            { label: "چانک‌ها", value: `${result.chunksUp}↑ / ${result.chunksDown}↓` },
            { label: "واکشی پُل", value: result.timing.bridgeMs ? `${result.timing.bridgeMs} ms` : "—" },
            {
              label: "سرعت مؤثر",
              value:
                result.timing.totalMs > 0 && result.bytes > 0
                  ? `${Math.max(1, Math.round(result.bytes / 1024 / (result.timing.totalMs / 1000)))} KB/s`
                  : "—",
            },
          ],
          modeTag: result.mode === "hops" ? "۴ هاپ واقعی روی شبکه" : "تک‌سروری (fallback)",
        }
      : { ...result, modeTag: "پُل میانبر — بدون VPS" }
    : null;

  const run = async (target: string) => {
    if (running || !target.trim()) return;
    setRunning(true);
    setError("");
    setResult(null);
    setLitHops(1);
    if (litTimer.current) clearInterval(litTimer.current);
    litTimer.current = setInterval(() => setLitHops((n) => Math.min(n + 1, 5)), 420);
    setHistory((h) => [target, ...h.filter((u) => u !== target)].slice(0, 6));
    try {
      const r: LabBrowseResult | BridgeView =
        mode === "bridge" ? await bridgeBrowse(target, () => {}) : await localBrowse(target);
      if (litTimer.current) clearInterval(litTimer.current);
      setLitHops(5);
      setResult(r);
      if (!r.ok && r.error) setError(r.error);
    } catch (e) {
      if (litTimer.current) clearInterval(litTimer.current);
      setLitHops(0);
      setError(e instanceof Error ? e.message : "ارتباط با تونل برقرار نشد");
    } finally {
      setRunning(false);
    }
  };

  const localBrowse = async (target: string): Promise<LabBrowseResult> => {
    const res = await fetch("/api/lab/browse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: target }),
    });
    return (await res.json()) as LabBrowseResult;
  };

  const doc =
    view?.body && /html/i.test(view.contentType ?? "")
      ? (view.body ?? "").replace(/<head([^>]*)>/i, `<head$1><base href="${view.finalUrl}" target="_self">`)
      : null;

  const nodes = NODES[mode];

  return (
    <div dir="rtl" className="fixed inset-0 z-[80] flex flex-col bg-background">
      {/* هدر */}
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <FlaskConical className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-black sm:text-lg">آزمایشگاه: وبگردی کامل با پروکسی تلگرام</h2>
            <p className="truncate text-xs text-muted-foreground">پیش‌نمایش زندهٔ TgTunnel — همان تجربه‌ای که در نسخهٔ ۲٫۲ اپ اندروید منتشر شده</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="بستن آزمایشگاه"
          className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
          {/* تب‌ها: وبگردی / ویدیو */}
          <section className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-2">
            {(
              [
                { id: "web", title: "وبگردی کامل", sub: "هر سایتی، از داخل تونل" },
                { id: "video", title: "ویدیو و یوتیوب", sub: "پخش استریم از داخل تونل" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-xl px-3 py-2.5 text-start transition ${
                  tab === t.id ? "bg-rose-600/10 ring-1 ring-rose-600/40" : "hover:bg-muted"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {t.id === "web" ? <Globe className="size-4" /> : <Youtube className="size-4" />}
                  <span className={`text-[13px] font-bold ${tab === t.id ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
                    {t.title}
                  </span>
                </span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">{t.sub}</span>
              </button>
            ))}
          </section>

          {tab === "web" && (
            <>
          {/* انتخاب حالت */}
          <section className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-2">
            {(
              [
                { id: "bridge", title: "پُل میانبر — بدون VPS", sub: "همین که داخل اپ می‌آید" },
                { id: "local", title: "۴ هاپ کامل (لوکال)", sub: "مسیر تلگرامی با بات پُل" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMode(m.id);
                  setResult(null);
                  setError("");
                  setLitHops(0);
                }}
                className={`rounded-xl px-3 py-2.5 text-start transition ${
                  mode === m.id
                    ? "bg-emerald-600/15 ring-1 ring-emerald-600/40"
                    : "hover:bg-muted"
                }`}
              >
                <span className={`block text-[13px] font-bold ${mode === m.id ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                  {m.title}
                </span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">{m.sub}</span>
              </button>
            ))}
          </section>

          {/* توپولوژی */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold">مسیر تونل</h3>
              {view && (
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                    view.ok
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {view.modeTag}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-1">
              {nodes.map((n, i) => (
                <div key={n.label} className="flex min-w-0 flex-1 items-center gap-1">
                  <div className="flex min-w-0 flex-col items-center gap-1">
                    <span
                      className={`grid size-9 place-items-center rounded-full border-2 transition sm:size-11 ${
                        litHops > i
                          ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-border bg-muted text-muted-foreground"
                      } ${running && litHops === i + 1 ? "animate-pulse" : ""}`}
                    >
                      <n.icon className="size-4 sm:size-5" />
                    </span>
                    <span className="max-w-full truncate text-center text-[9px] leading-tight text-muted-foreground sm:text-[11px]">
                      {n.label}
                    </span>
                  </div>
                  {i < nodes.length - 1 && (
                    <span className="relative h-0.5 min-w-2 flex-1 rounded bg-border">
                      {litHops > i + 1 && <i className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-emerald-500/60" />}
                      {running && litHops === i + 1 && (
                        <i
                          className="lab-dot absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-emerald-500"
                          style={{ animationDelay: `${i * 0.22}s` }}
                        />
                      )}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
              {mode === "local"
                ? "پروکسی فقط هندشیک را می‌بیند و بقیه را کورکورانه رله می‌کند؛ محتوا با رمز درونی اپ↔پل حتی از دیتاسنتر پنهان است."
                : "درخواست به فریم‌های ۱۶KB شکسته و با AES-256-GCM رمز می‌شود؛ پُل روی سرور خود میانبر مقصد را واکشی و پاسخ را فریم‌به‌فریم رمزی برمی‌گرداند — بدون نیاز به VPS."}
            </p>
          </section>

          {/* فرم */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <label htmlFor="lab-url" className="mb-2 block text-sm font-bold">
              آدرس صفحهٔ مقصد
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="lab-url"
                dir="ltr"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && run(url.trim())}
                placeholder="https://example.com"
                className="h-12 flex-1 rounded-xl border border-border bg-background px-4 text-left text-sm outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={() => run(url.trim())}
                disabled={running || !url.trim()}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                {running ? "در حال عبور از تونل…" : "اتصال از طریق پروکسی تلگرام"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.url}
                  type="button"
                  onClick={() => {
                    setUrl(p.url);
                    void run(p.url);
                  }}
                  disabled={running}
                  className="rounded-full border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground transition hover:border-emerald-500/40 hover:text-foreground disabled:opacity-50"
                >
                  {p.label}
                </button>
              ))}
            </div>
            {history.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-muted-foreground">بازدیدهای اخیر:</span>
                {history.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      setUrl(h);
                      void run(h);
                    }}
                    disabled={running}
                    dir="ltr"
                    className="max-w-44 truncate rounded-full bg-muted/70 px-2.5 py-1 text-left text-[10px] text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                  >
                    {h.replace(/^https?:\/\//, "")}
                  </button>
                ))}
              </div>
            )}
            {mode === "local" && (
              <div className="mt-3 rounded-xl bg-muted/60 p-3">
                <div className="text-[10px] font-semibold text-muted-foreground">لینک پروکسی تستی این آزمایشگاه (مثل فرمت واقعی اپ)</div>
                <code dir="ltr" className="mt-1 block truncate text-left text-[11px] text-emerald-600 dark:text-emerald-400">
                  {DEMO_PROXY_LINK}
                </code>
              </div>
            )}
          </section>

          {error && (
            <section className="flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </section>
          )}

          {/* آمار */}
          {view && view.ok && (
            <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {view.stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-3">
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  <div className="mt-1 text-sm font-black tabular-nums">{s.value}</div>
                </div>
              ))}
            </section>
          )}

          {/* گزارش مسیر */}
          {view && view.trace.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-bold">گزارش زندهٔ مسیر (هاپ به هاپ)</h3>
              <div className="lab-scroll max-h-64 space-y-1.5 overflow-y-auto rounded-xl bg-muted/40 p-3">
                {view.trace.map((e: LabEvent, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] leading-5">
                    <span className="w-14 shrink-0 text-left font-mono tabular-nums text-muted-foreground" dir="ltr">
                      {e.t}ms
                    </span>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold ${HOP_META[e.hop].cls}`}>
                      {HOP_META[e.hop].label}
                    </span>
                    <span className="min-w-0 flex-1 text-foreground/90">{e.msg}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* خروجی */}
          {view && view.ok && view.body && (
            <section className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold">خروجی داخل اپ (صفحهٔ واکشی‌شده از تونل)</h3>
                {view.title && (
                  <span className="max-w-full truncate rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">
                    عنوان: {view.title}
                  </span>
                )}
              </div>
              {doc !== null ? (
                <iframe
                  title="صفحهٔ واکشی‌شده از تونل"
                  sandbox=""
                  srcDoc={doc}
                  className="h-80 w-full rounded-xl border border-border bg-white"
                />
              ) : (
                <pre dir="ltr" className="max-h-64 overflow-auto rounded-xl border border-border bg-muted/40 p-3 text-left text-xs">
                  {(view.body ?? "").slice(0, 4000)}
                </pre>
              )}
              <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
                HTML از داخل تونل آمده؛ برای سادگیِ نمایش، فایل‌های استایل/تصویر مستقیم از مقصد بارگیری می‌شوند و اسکریپت‌ها بسته‌اند.
                {view.truncated && " پاسخ از سقف ۳MB برش خورد."}
              </p>
            </section>
          )}

          {/* توضیح صادقانه */}
          <section className="rounded-2xl border border-border bg-card p-4 text-xs leading-6 text-muted-foreground">
            <h3 className="mb-2 text-sm font-bold text-foreground">این دمو دقیقاً چی را ثابت می‌کند؟</h3>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <b className="text-foreground">حالت «پُل میانبر» (بدون VPS):</b> واقعی و کامل — همان دو API و همان رمز
                AES-256-GCM و همان قاب‌بندی ۱۶KB که داخل اپ اندروید نسخهٔ ۲٫۲ استفاده می‌شود؛ پُل روی سرور خود میانبر
                (همین سایت) اجرا می‌شود و مقصد را واقعاً واکشی می‌کند.
              </li>
              <li>
                <b className="text-foreground">حالت «۴ هاپ لوکال»:</b> هندشیک و رمز CTR دوطرفه (سبک obfuscated2)، رلهٔ کور
                پروکسی و واکشی واقعی توسط پُل — فقط نقش دیتاسنتر/بات لوکال شبیه‌سازی شده؛ با VPS همین مسیر واقعی می‌شود.
              </li>
              <li>
                <b className="text-foreground">برای فعال شدن مسیر تلگرامی کامل:</b> فقط یک VPS خارج از ایران + یک توکن بات
                از BotFather لازم است — موتورش همین است و در اپ از قبل جای‌گذاری شده.
              </li>
              <li>
                <b className="text-foreground">اپ اصلی:</b> دکمهٔ «وبگردی کامل» در نسخهٔ ۲٫۲ کنار دکمهٔ پروکسی تلگرام
                منتشر شده؛ این آزمایشگاه پیش‌نمایش زندهٔ همان تجربه است.
              </li>
            </ul>
          </section>
            </>
          )}

          {tab === "video" && <VideoLab />}
        </div>
      </div>

      <style>{`
        .lab-dot { left: 100%; animation: labFlow 1.1s linear infinite; }
        @keyframes labFlow { from { left: 100%; opacity: 1; } to { left: 0%; opacity: .35; } }
        .lab-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .lab-scroll::-webkit-scrollbar-thumb { background: oklch(0.55 0.05 160 / .4); border-radius: 999px; }
      `}</style>
    </div>
  );
}
