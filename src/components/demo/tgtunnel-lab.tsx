"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Database,
  FlaskConical,
  Globe,
  Loader2,
  Play,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import type { LabBrowseResult } from "@/lib/lab/client";
import type { LabEvent, LabHop } from "@/lib/lab/protocol";

/* ────────────────────────────────────────────────────────────────────────────
 * آزمایشگاه TgTunnel — دموی زندهٔ «وبگردی کامل با پروکسی تلگرام»
 * اپ → پروکسی MTProto → دیتاسنتر تلگرام → بات پُل → اینترنت آزاد → برگشت
 * همه‌چیز واقعی است جز نقش دیتاسنتر/بات که اینجا لوکال شبیه‌سازی شده.
 * ──────────────────────────────────────────────────────────────────────────── */

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

function fmtBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

export function TgTunnelLab({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [url, setUrl] = useState("https://example.com");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<LabBrowseResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const run = async (target: string) => {
    if (running) return;
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/lab/browse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = (await res.json()) as LabBrowseResult;
      setResult(data);
      if (!data.ok && data.error) setError(data.error);
    } catch {
      setError("ارتباط با موتور تونل برقرار نشد");
    } finally {
      setRunning(false);
    }
  };

  const doc =
    result?.body && /html/i.test(result.contentType)
      ? result.body.replace(
          /<head([^>]*)>/i,
          `<head$1><base href="${result.finalUrl}" target="_self">`,
        )
      : null;

  const stats: { label: string; value: string }[] = result
    ? [
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
      ]
    : [];

  const nodes = [
    { icon: Smartphone, label: "اپ میانبر", hint: "موتور TgTunnel" },
    { icon: ShieldCheck, label: "پروکسی تلگرام", hint: "رلهٔ کور" },
    { icon: Database, label: "دیتاسنتر تلگرام", hint: "بدون رمز درونی" },
    { icon: Bot, label: "بات پُل", hint: "خروجی واقعی" },
    { icon: Globe, label: "اینترنت آزاد", hint: "مقصد" },
  ];

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
            <p className="truncate text-xs text-muted-foreground">دموی زندهٔ TgTunnel · اپ اصلی و مخزن گیت‌هاب دست‌نخورده</p>
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
          {/* توپولوژی */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold">مسیر تونل</h3>
              {result && (
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                    result.mode === "hops"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {result.mode === "hops" ? "۴ هاپ واقعی روی شبکه" : "حالت تک‌سروری (fallback)"}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-1">
              {nodes.map((n, i) => (
                <div key={n.label} className="flex min-w-0 flex-1 items-center gap-1">
                  <div className="flex min-w-0 flex-col items-center gap-1">
                    <span
                      className={`grid size-9 place-items-center rounded-full border-2 transition sm:size-11 ${
                        running
                          ? "animate-pulse border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : result?.ok
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      <n.icon className="size-4 sm:size-5" />
                    </span>
                    <span className="max-w-full truncate text-center text-[9px] leading-tight text-muted-foreground sm:text-[11px]">
                      {n.label}
                    </span>
                  </div>
                  {i < nodes.length - 1 && (
                    <span className="relative h-0.5 min-w-2 flex-1 rounded bg-border">
                      {running && (
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
              پروکسی فقط هندشیک را می‌بیند و بقیه را کورکورانه رله می‌کند؛ محتوا با رمز درونی اپ↔پل حتی از دیتاسنتر پنهان است.
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
            <div className="mt-3 rounded-xl bg-muted/60 p-3">
              <div className="text-[10px] font-semibold text-muted-foreground">لینک پروکسی تستی این آزمایشگاه (مثل فرمت واقعی اپ)</div>
              <code dir="ltr" className="mt-1 block truncate text-left text-[11px] text-emerald-600 dark:text-emerald-400">
                {DEMO_PROXY_LINK}
              </code>
            </div>
          </section>

          {error && (
            <section className="flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </section>
          )}

          {/* آمار */}
          {result && (
            <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-3">
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  <div className="mt-1 text-sm font-black tabular-nums">{s.value}</div>
                </div>
              ))}
            </section>
          )}

          {/* گزارش مسیر */}
          {result && result.trace.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-bold">گزارش زندهٔ مسیر (هاپ به هاپ)</h3>
              <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl bg-muted/40 p-3 lab-scroll">
                {result.trace.map((e: LabEvent, i) => (
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
          {result && result.ok && result.body && (
            <section className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold">خروجی داخل اپ (صفحهٔ واکشی‌شده از تونل)</h3>
                {result.title && (
                  <span className="max-w-full truncate rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">
                    عنوان: {result.title}
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
                  {result.body.slice(0, 4000)}
                </pre>
              )}
              <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
                HTML از داخل تونل آمده؛ برای سادگیِ نمایش، فایل‌های استایل/تصویر مستقیم از مقصد بارگیری می‌شوند و اسکریپت‌ها بسته‌اند.
                {result.truncated && " پاسخ از سقف ۳MB دمو برش خورد."}
              </p>
            </section>
          )}

          {/* توضیح صادقانه */}
          <section className="rounded-2xl border border-border bg-card p-4 text-xs leading-6 text-muted-foreground">
            <h3 className="mb-2 text-sm font-bold text-foreground">این دمو دقیقاً چی را ثابت می‌کند؟</h3>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <b className="text-foreground">واقعی:</b> هندشیک و رمز CTR دوطرفه (سبک obfuscated2)، رلهٔ کور پروکسی، رمز درونی
                AES-GCM روی هر چانک، چانک‌بندی ۱۶KB، ۴ سرویس مستقل روی شبکهٔ واقعی، و واکشی واقعی صفحهٔ مقصد توسط پُل.
              </li>
              <li>
                <b className="text-foreground">شبیه‌سازی‌شده:</b> نقش دیتاسنتر و بات تلگرام این‌جا لوکال است؛ در نسخهٔ اصلی همان
                نقش را دیتاسنتر واقعی تلگرام + بات روی VPS شما بازی می‌کند.
              </li>
              <li>
                <b className="text-foreground">برای نسخهٔ اصلی لازم است:</b> یک VPS خارج از ایران + یک توکن بات از BotFather —
                بقیه‌اش همین موتور است که به اپ اندروید اضافه می‌شود.
              </li>
              <li>
                <b className="text-foreground">اپ اصلی:</b> هیچ تغییری در اپ اندروید، ورک‌فلوها و ریلیزهای گیت‌هاب داده نشده.
              </li>
            </ul>
          </section>
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
