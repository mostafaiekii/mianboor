"use client";

/**
 * ── بخش اضطراری (Emergency) — نسخهٔ وبِ دمو ──
 *
 * این فایل «کاملاً مستقل» است: همهٔ متن‌ها، منطق کشف دامنه و UI داخل همین فایل
 * است؛ حذفش هیچ چیز دیگری در اپ نمی‌شکند (همان اصل «بخش جدید برای بخش جدید»).
 *
 * همان جریان اپ اندروید (EmergencyGate.kt) — ولی «مفید»، نه فقط آنالیز:
 *   ۱) کشف دامنه‌ها از CDN (jsDelivr) + فال‌بک raw.githubusercontent
 *   ۲) کاوش زنده‌بودن هر دامنه (هر پاسخ HTTP حتی 401 یعنی مسیر باز است)
 *   ۳) دریافت کانفیگ‌های واقعی از اولین دامنهٔ زنده:
 *        - با توکن (اگر NEXT_PUBLIC_CLIENT_TOKEN تنظیم باشد) → لینک‌های خام
 *        - همیشه → seeds عمومی (base64) که سرور بدون توکن سرو می‌کند
 *   ۴) هر کانفیگ: دکمهٔ کپی (پیست در هر کلاینت: v2rayNG/Hiddify/NekoBox)
 *      و دکمهٔ هم‌رسانی — یعنی خروجی صفحه «قابل استفاده» است، نه فقط گزارش.
 *   ۵) دامنه‌های زنده به‌صورت چیپ قابل‌کلیک — کاربر می‌تواند سایت را باز کند
 *      یا لینکش را برای دوستانش بفرستد.
 *
 * هیچ لینک الکی‌ای وجود ندارد؛ اگر هیچی پیدا نشد، راهنمای صادقانه نشان داده
 * می‌شود (بازکردن دامنهٔ زنده / نصب اپ).
 */

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, Download, ExternalLink, Loader2, Share2, ShieldAlert } from "lucide-react";
import type { Lang } from "./i18n";

/* ── متن‌ها — داخلی تا i18n.ts دست نخورد ── */
const S = {
  title: { fa: "وضعیت اضطراری", en: "Emergency mode" },
  sub: {
    fa: "وقتی فیلترینگ شدید شد یا اینترنت قطع شد — میانبر خودش راه زنده را پیدا می‌کند.",
    en: "When filtering goes hard or the internet is cut — Mianboor finds a live route by itself.",
  },
  start: { fa: "جست‌وجوی راه زنده", en: "Find a live route" },
  searching: { fa: "در حال جست‌وجو…", en: "Searching…" },
  logTitle: { fa: "گزارش", en: "Log" },
  poolTitle: { fa: "کانفیگ‌های اضطراری — کپی کن و در هر کلاینت وصل شو", en: "Emergency configs — copy into any client" },
  connect: { fa: "در اپ وصل شو", en: "Connect in app" },
  copy: { fa: "کپی", en: "Copy" },
  copied: { fa: "کپی شد", en: "Copied" },
  share: { fa: "هم‌رسانی", en: "Share" },
  mirrorsTitle: { fa: "دامنه‌های زنده — باز کن یا برای دوستات بفرست", en: "Live mirrors — open or share with friends" },
  cacheNote: {
    fa: "اتصال اضطراری در اپ با حالت سخت‌گیر (تیکه‌تکه‌کردن TLS) برقرار می‌شود.",
    en: "Emergency connections in the app always use strict stealth (TLS fragmenting).",
  },
  empty: {
    fa: "هیچ کانفیگی منتشر نشده — ولی دامنه‌های زنده بالا کار می‌کنند: یکی را باز کن؛ در اپ میانبر هم همین جست‌وجو خودکار انجام می‌شود.",
    en: "No emergency config published yet — but the live mirrors above work: open one. The Mianboor app runs this search automatically.",
  },
  back: "back",
} as const;

const fa = (lang: Lang) => lang === "fa";
const L = (lang: Lang, k: keyof typeof S) => S[k][lang];

type ELink = { link: string; name: string; country: string };

/* ── نقشهٔ دامنه‌ها — همان فایل عمومیِ بدون راز که اپ اندروید می‌خواند ── */
const CDN_MAPS = [
  { url: "https://cdn.jsdelivr.net/gh/mostafaiekii/mianboor@main/emergency/pool.json", where: "CDN jsDelivr" },
  { url: "https://raw.githubusercontent.com/mostafaiekii/mianboor/main/emergency/pool.json", where: "GitHub raw" },
];
const POOL_PATH = "/api/emergency/pool";

/* ── پارس نمایشی لینک (فقط برای لیست UI) ── */
function protoOf(link: string): string {
  if (link.startsWith("vless://")) return "VLESS";
  if (link.startsWith("vmess://")) return "VMess";
  if (link.startsWith("trojan://")) return "Trojan";
  return "SS";
}

function hostOf(link: string): string {
  try {
    if (link.startsWith("vmess://")) {
      const json = JSON.parse(atob(link.slice("vmess://".length)));
      return String(json.add ?? "—");
    }
    const afterAuth = link.split("://")[1] ?? "";
    const hostPart = afterAuth.split("@")[1] ?? "";
    return hostPart.split("/")[0].split("?")[0].split(":")[0] || "—";
  } catch {
    return "—";
  }
}

function portOf(link: string): number {
  try {
    if (link.startsWith("vmess://")) {
      const json = JSON.parse(atob(link.slice("vmess://".length)));
      return Number(json.port) || 443;
    }
    const afterAuth = link.split("://")[1] ?? "";
    const hostPart = afterAuth.split("@")[1] ?? "";
    const p = Number(hostPart.split("/")[0].split("?")[0].split(":")[1]);
    return p > 0 ? p : 443;
  } catch {
    return 443;
  }
}

/* ── fetch با تایم‌اوت ── */
async function fetchT(url: string, ms: number, noCors = false): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { signal: ac.signal, mode: noCors ? "no-cors" : "cors", cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

function b64decode(s: string): string {
  try {
    return decodeURIComponent(
      atob(s.replace(/-/g, "+").replace(/_/g, "/"))
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
  } catch {
    try {
      return atob(s);
    } catch {
      return "";
    }
  }
}

export function EmergencyScreen({
  lang,
  onBack,
  onConnect,
}: {
  lang: Lang;
  onBack: () => void;
  /** کاربر روی «در اپ وصل شو» زد — name نام کانفیگ انتخابی است */
  onConnect: (name: string) => void;
}) {
  const rtl = fa(lang);
  const Back = rtl ? ChevronRight : ChevronLeft;

  const [logs, setLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [pool, setPool] = useState<ELink[]>([]);
  const [mirrors, setMirrors] = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const ts = () => new Date().toLocaleTimeString("en-GB", { hour12: false });
  const log = (s: string) => setLogs((p) => [...p.slice(-119), `[${ts()}] ${s}`]);

  async function runRescue() {
    if (busy) return;
    setBusy(true);
    setSearched(true);
    setPool([]);
    setMirrors([]);
    setLogs([]);

    try {
      log(rtl ? "— کشف دامنه‌های ممکن…" : "— discovering candidate domains…");

      /* ── ۱) کشف دامنه‌ها ──
         خودِ همین صفحه هم یک mirror زندهٔ same-origin است — اگر کاربر این را
         می‌بیند، یعنی این دامنه از موقعیت او باز می‌شود. */
      const found = new Set<string>();
      try {
        if (window.location.origin.startsWith("http")) {
          found.add(window.location.origin);
          log(`✓ ${rtl ? "همین دامنه" : "this origin"} — 1`);
        }
      } catch { /* noop */ }
      for (const m of CDN_MAPS) {
        try {
          const res = await fetchT(m.url, 6000);
          if (!res.ok) {
            log(`✗ ${m.where} — ${res.status}`);
            continue;
          }
          const j = (await res.json()) as { mirrors?: unknown };
          let n = 0;
          for (const mir of Array.isArray(j.mirrors) ? j.mirrors : []) {
            const s = String(mir).trim().replace(/\/+$/, "");
            if (s.startsWith("http") && !found.has(s)) {
              found.add(s);
              n++;
            }
          }
          log(`✓ ${m.where} — ${n}`);
        } catch {
          log(`✗ ${m.where}`);
        }
      }

      /* ── ۲) کاوش زنده‌بودن ── */
      const candidates = [...found];
      log(`— ${candidates.length} ${rtl ? "دامنهٔ کاندید؛ کاوش…" : "candidates; probing…"}`);
      const aliveMirrors: string[] = [];
      let links: ELink[] = [];

      const tk = (process.env.NEXT_PUBLIC_CLIENT_TOKEN ?? "").trim();
      for (const base of candidates) {
        let alive = false;
        try {
          await fetchT(base + POOL_PATH, 4000, true); /* opaque — هر پاسخ یعنی مسیر باز */
          alive = true;
        } catch {
          alive = false;
        }
        log(`${alive ? "✓" : "✗"} ${alive ? (rtl ? "زنده:" : "alive:") : rtl ? "مرده:" : "dead:"} ${base}`);
        if (!alive) continue;
        aliveMirrors.push(base);
        setMirrors([...aliveMirrors]);
        if (links.length > 0) continue; /* اولین استخرِ موفق کافی است */

        /* ── ۳) کانفیگ‌ها: اول لینک خام با توکن، بعد seeds عمومی ── */
        if (tk) {
          try {
            const res = await fetchT(`${base}${POOL_PATH}?token=${encodeURIComponent(tk)}`, 8000);
            if (res.ok) {
              const j = (await res.json()) as { ok?: boolean; links?: unknown };
              for (const o of Array.isArray(j.links) ? j.links : []) {
                const e = o as { link?: string; name?: string; country?: string };
                const lk = String(e.link ?? "");
                if (/^(vless|vmess|trojan|ss):\/\//.test(lk)) {
                  links.push({ link: lk, name: String(e.name ?? "EMG"), country: String(e.country ?? "🆘") });
                }
              }
              if (links.length > 0) log(`✓ ${base} — ${links.length} ${rtl ? "کانفیگ خام" : "raw configs"}`);
            }
          } catch {
            /* توکن از این دامنه نگذشت — seeds را امتحان می‌کنیم */
          }
        }

        if (links.length === 0) {
          try {
            const res = await fetchT(base + POOL_PATH, 8000); /* seeds عمومی — بدون توکن */
            if (res.ok) {
              const j = (await res.json()) as { seeds?: unknown };
              let n = 0;
              for (const s of Array.isArray(j.seeds) ? j.seeds : []) {
                const lk = b64decode(String(s));
                if (/^(vless|vmess|trojan|ss):\/\//.test(lk)) {
                  links.push({ link: lk, name: `EMG-${String(links.length + 1).padStart(2, "0")}`, country: "🆘" });
                  n++;
                }
              }
              if (n > 0) log(`✓ ${base} — ${n} ${rtl ? "کانفیگ از seeds عمومی" : "configs from public seeds"}`);
            }
          } catch {
            log(`✗ ${base} — ${rtl ? "seeds" : "seeds"}`);
          }
        }
        setPool([...links]);
      }

      setMirrors(aliveMirrors);
      if (links.length === 0) log(rtl ? "— هیچ کانفیگی منتشر نشده" : "— no config published yet");
    } finally {
      setBusy(false);
    }
  }

  async function copyCfg(i: number, link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedIdx(i);
      setTimeout(() => setCopiedIdx((p) => (p === i ? null : p)), 1800);
    } catch {
      /* clipboard بسته شد — بی‌خیال */
    }
  }

  async function shareCfg(link: string, name: string) {
    const nav = navigator as Navigator & { share?: (d: { title: string; text: string }) => Promise<void> };
    if (nav.share) {
      await nav.share({ title: "Mianboor Emergency", text: `${name}\n${link}` }).catch(() => {});
    } else {
      await copyCfg(-1, link);
    }
  }

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="flex min-h-0 flex-1 flex-col px-5 pt-2">
      <button type="button" onClick={onBack} aria-label="Back" className="w-fit text-dim hover:text-ink">
        <Back className="size-6" />
      </button>

      {/* هدر طلایی/کهربایی */}
      <div className="mt-3 flex items-center gap-3">
        <span className="grid size-[46px] shrink-0 place-items-center rounded-2xl bg-gold/15">
          <ShieldAlert className="size-6 text-gold" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-[22px] font-bold leading-7 text-ink">{L(lang, "title")}</h2>
          <p className="text-xs leading-[17px] text-dim">{L(lang, "sub")}</p>
        </div>
      </div>

      {/* دکمهٔ شروع */}
      <button
        type="button"
        onClick={runRescue}
        disabled={busy}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gold py-3.5 text-[15px] font-bold text-night transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {busy ? L(lang, "searching") : L(lang, "start")}
      </button>

      {/* دامنه‌های زنده — قابل‌کلیک و قابل‌هم‌رسانی */}
      {mirrors.length > 0 && (
        <>
          <p className="mt-4 text-xs font-semibold text-dim">{L(lang, "mirrorsTitle")}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {mirrors.map((m) => (
              <a
                key={m}
                href={m}
                target="_blank"
                rel="noreferrer"
                dir="ltr"
                className="inline-flex items-center gap-1.5 rounded-full border border-glow/30 bg-glow/10 px-3 py-1.5 font-mono text-[11px] text-glow transition-colors hover:bg-glow/20"
              >
                <ExternalLink className="size-3" />
                {m.replace(/^https?:\/\//, "")}
              </a>
            ))}
          </div>
        </>
      )}

      {/* گزارش زنده */}
      {logs.length > 0 && (
        <>
          <p className="mt-4 text-xs text-dim">{L(lang, "logTitle")}</p>
          <div className="scroll-hide mt-1.5 max-h-36 overflow-y-auto rounded-xl bg-night p-2.5">
            {logs.slice(-14).map((line, i) => (
              <p
                key={i}
                className={`font-mono text-[11px] leading-[15px] ${
                  line.includes("✓") ? "text-glow" : line.includes("✗") ? "text-gold" : "text-dim"
                }`}
              >
                {line}
              </p>
            ))}
          </div>
        </>
      )}

      {/* استخر اضطراری — با کپی/هم‌رسانی واقعی */}
      {pool.length > 0 && (
        <>
          <p className="mt-4 text-sm font-semibold text-ink">{L(lang, "poolTitle")}</p>
          <div className="scroll-hide mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-3">
            {pool.map((e, i) => (
              <div key={i} className="rounded-xl bg-night p-3">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {e.country} {e.name || `EMG-${i + 1}`}
                    </p>
                    <p dir="ltr" className="truncate text-start text-[11px] text-dim">
                      {protoOf(e.link)} · {hostOf(e.link)}:{portOf(e.link)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onConnect(e.name || `EMG-${i + 1}`)}
                    className="shrink-0 rounded-lg bg-gold/15 px-3 py-2 text-[12px] font-bold text-gold transition-colors hover:bg-gold/25"
                  >
                    {L(lang, "connect")}
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2 border-t border-panel-edge/60 pt-2">
                  <button
                    type="button"
                    onClick={() => copyCfg(i, e.link)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-panel px-2.5 py-1.5 text-[11px] font-semibold text-ink transition-colors hover:bg-panel-edge"
                  >
                    {copiedIdx === i ? <Check className="size-3.5 text-glow" /> : <Copy className="size-3.5" />}
                    {copiedIdx === i ? L(lang, "copied") : L(lang, "copy")}
                  </button>
                  <button
                    type="button"
                    onClick={() => shareCfg(e.link, e.name)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-panel px-2.5 py-1.5 text-[11px] font-semibold text-ink transition-colors hover:bg-panel-edge"
                  >
                    <Share2 className="size-3.5" />
                    {L(lang, "share")}
                  </button>
                  <p dir="ltr" className="min-w-0 flex-1 truncate font-mono text-[10px] text-dim">
                    {e.link.slice(0, 42)}…
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="pb-3 text-[11px] leading-[15px] text-dim">{L(lang, "cacheNote")}</p>
        </>
      )}
      {pool.length === 0 && searched && !busy && (
        <div className="mt-3.5 rounded-xl border border-panel-edge bg-panel p-3.5">
          <p className="text-xs leading-[17px] text-dim">{L(lang, "empty")}</p>
          <a
            href="https://github.com/mostafaiekii/mianboor/releases/latest"
            target="_blank"
            rel="noreferrer"
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-gold/15 px-3 py-2 text-xs font-bold text-gold transition-colors hover:bg-gold/25"
          >
            <Download className="size-3.5" />
            {rtl ? "دانلود اپ میانبر" : "Get the Mianboor app"}
          </a>
        </div>
      )}
    </div>
  );
}
