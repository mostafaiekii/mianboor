"use client";

/**
 * ── بخش اضطراری (Emergency) — نسخهٔ وبِ دمو ──
 *
 * این فایل «کاملاً مستقل» است: همهٔ متن‌ها، منطق کشف دامنه و UI داخل همین فایل
 * است؛ حذفش هیچ چیز دیگری در اپ نمی‌شکند (همان اصل «بخش جدید برای بخش جدید»).
 *
 * همان جریان اپ اندروید (EmergencyGate.kt):
 *   ۱) کشف دامنه‌ها از روی CDN (jsDelivr) + فال‌بک raw.githubusercontent
 *   ۲) کاوش زنده‌بودن هر دامنه (هر پاسخ HTTP حتی 401 یعنی مسیر باز است)
 *   ۳) دریافت استخر کانفیگ‌های اضطراری از اولین دامنهٔ زنده
 *   ۴) نمایش لیست + دکمهٔ وصل‌شدن
 *
 * اگر توکن عمومی کلاینت (NEXT_PUBLIC_CLIENT_TOKEN) تنظیم نباشد، یک استخر
 * نمونهٔ دمو نمایش داده می‌شود تا جریان همیشه قابل دیدن باشد.
 */

import { useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, ShieldAlert } from "lucide-react";
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
  poolTitle: { fa: "کانفیگ‌های اضطراری — یکی را وصل کن", en: "Emergency configs — connect to one" },
  connect: { fa: "وصل شو", en: "Connect" },
  connectedNote: {
    fa: "اتصال اضطراری با حالت سخت‌گیر (تیکه‌تکه‌کردن TLS) برقرار می‌شود.",
    en: "Emergency connections always use strict stealth (TLS fragmenting).",
  },
  empty: {
    fa: "هیچ راهی پیدا نشد — دوباره امتحان کن؛ هر بار دامنه‌های تازه بررسی می‌شوند.",
    en: "No route found — try again; fresh mirrors are checked each time.",
  },
  discover: { fa: "— کشف دامنه‌های ممکن…", en: "— discovering candidate domains…" },
  candidates: { fa: "دامنهٔ کاندید؛ کاوش…", en: "candidate domains; probing…" },
  cdnOk: { fa: "CDN jsDelivr", en: "CDN jsDelivr" },
  rawOk: { fa: "GitHub raw", en: "GitHub raw" },
  alive: { fa: "زنده:", en: "alive:" },
  dead: { fa: "مرده:", en: "dead:" },
  configs: { fa: "کانفیگ اضطراری", en: "emergency configs" },
  noRoute: { fa: "— هیچ راهی پیدا نشد", en: "— no route found" },
  demoPool: { fa: "— استخر نمونهٔ دمو بارگذاری شد", en: "— demo pool loaded" },
  back: "back",
} as const;

const fa = (lang: Lang) => lang === "fa";
const L = (lang: Lang, k: keyof typeof S) => S[k][lang];

type ELink = { link: string; name: string; country: string };

/* ── نقشهٔ دامنه‌ها — همان فایل عمومیِ بدون راز که اپ اندروید می‌خواند ── */
const CDN_MAPS = [
  { url: "https://cdn.jsdelivr.net/gh/mostafaiekii/mianboor@main/emergency/pool.json", where: "cdnOk" as const },
  { url: "https://raw.githubusercontent.com/mostafaiekii/mianboor/main/emergency/pool.json", where: "rawOk" as const },
];
const POOL_PATH = "/api/emergency/pool";

/* ── فال‌بک دمو — وقتی توکن عمومی تنظیم نیست، جریان UI همچنان قابل دیدن است ── */
const DEMO_POOL: ELink[] = [
  {
    link: "vless://00000000-0000-0000-0000-000000000000@cdn.example-edge.net:443?encryption=none&security=tls&type=ws&host=emergency.mianboor.example&sni=emergency.mianboor.example&path=%2Femg",
    name: "EMG-01",
    country: "🆘",
  },
  {
    link: "vless://00000000-0000-0000-0000-000000000000@cdn2.example-edge.net:443?encryption=none&security=tls&type=ws&host=emergency2.mianboor.example&sni=emergency2.mianboor.example&path=%2Femg",
    name: "EMG-02",
    country: "🆘",
  },
  {
    link: "trojan://0000000000000000@cdn3.example-edge.net:443?security=tls&type=ws&sni=emergency3.mianboor.example",
    name: "EMG-03",
    country: "🆘",
  },
];

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
    return (hostPart.split("/")[0].split("?")[0].split(":")[0] || "—");
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
    const hostPort = hostPart.split("/")[0].split("?")[0];
    const p = Number(hostPort.split(":")[1]);
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

export function EmergencyScreen({
  lang,
  onBack,
  onConnect,
}: {
  lang: Lang;
  onBack: () => void;
  /** کاربر روی «وصل شو» زد — name نام کانفیگ انتخابی است */
  onConnect: (name: string) => void;
}) {
  const rtl = fa(lang);
  const Back = rtl ? ChevronRight : ChevronLeft;

  const [logs, setLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [pool, setPool] = useState<ELink[]>([]);

  const ts = () => new Date().toLocaleTimeString("en-GB", { hour12: false });
  const log = (s: string) => setLogs((p) => [...p.slice(-119), `[${ts()}] ${s}`]);

  async function runRescue() {
    if (busy) return;
    setBusy(true);
    setSearched(true);
    setPool([]);
    setLogs([]);

    try {
      log(L(lang, "discover"));

      /* ── ۱) کشف دامنه‌ها ── */
      const found = new Set<string>();
      for (const m of CDN_MAPS) {
        try {
          const res = await fetchT(m.url, 6000);
          if (!res.ok) {
            log(`✗ ${L(lang, m.where)} — ${res.status}`);
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
          log(`✓ ${L(lang, m.where)} — ${n}`);
        } catch {
          log(`✗ ${L(lang, m.where)}`);
        }
      }

      /* ── ۲) کاوش زنده‌بودن ── */
      const candidates = [...found];
      log(`— ${candidates.length} ${L(lang, "candidates")}`);
      let links: ELink[] | null = null;

      const tk = (process.env.NEXT_PUBLIC_CLIENT_TOKEN ?? "").trim();
      for (const base of candidates) {
        let alive = false;
        try {
          await fetchT(base + POOL_PATH, 4000, true); /* opaque — هر پاسخ یعنی مسیر باز */
          alive = true;
        } catch {
          alive = false;
        }
        log(`${alive ? "✓" : "✗"} ${alive ? L(lang, "alive") : L(lang, "dead")} ${base}`);
        if (!alive) continue;

        /* ── ۳) استخر اضطراری ── */
        if (tk) {
          try {
            const res = await fetchT(`${base}${POOL_PATH}?token=${encodeURIComponent(tk)}`, 8000);
            if (res.ok) {
              const j = (await res.json()) as { ok?: boolean; links?: unknown };
              const parsed: ELink[] = [];
              for (const o of Array.isArray(j.links) ? j.links : []) {
                const e = o as { link?: string; name?: string; country?: string };
                const lk = String(e.link ?? "");
                if (/^(vless|vmess|trojan|ss):\/\//.test(lk)) {
                  parsed.push({ link: lk, name: String(e.name ?? "EMG"), country: String(e.country ?? "🆘") });
                }
              }
              if (parsed.length > 0) {
                log(`✓ ${base} — ${parsed.length} ${L(lang, "configs")}`);
                links = parsed;
                break;
              }
              log(`✗ ${base} — 0`);
            } else {
              log(`✗ ${base} — ${res.status}`);
            }
          } catch {
            log(`✗ ${base} — CORS`);
          }
        }
      }

      /* ── ۴) فال‌بک دمو ── */
      if (!links && !tk) {
        links = DEMO_POOL;
        log(L(lang, "demoPool"));
      }

      if (links) setPool(links);
      else log(L(lang, "noRoute"));
    } finally {
      setBusy(false);
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

      {/* گزارش زنده */}
      {logs.length > 0 && (
        <>
          <p className="mt-4 text-xs text-dim">{L(lang, "logTitle")}</p>
          <div className="mt-1.5 scroll-hide max-h-44 overflow-y-auto rounded-xl bg-night p-2.5">
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

      {/* استخر اضطراری */}
      {pool.length > 0 && (
        <>
          <p className="mt-4 text-sm font-semibold text-ink">{L(lang, "poolTitle")}</p>
          <div className="scroll-hide mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-3">
            {pool.map((e, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl bg-night p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{e.name || `EMG-${i + 1}`}</p>
                  <p className="truncate text-[11px] text-dim">
                    {protoOf(e.link)} · {hostOf(e.link)}:{portOf(e.link)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onConnect(e.name || `EMG-${i + 1}`)}
                  className="shrink-0 rounded-lg bg-gold/15 px-3 py-2 text-[13px] font-bold text-gold transition-colors hover:bg-gold/25"
                >
                  {L(lang, "connect")}
                </button>
              </div>
            ))}
          </div>
          <p className="pb-3 text-[11px] leading-[15px] text-dim">{L(lang, "connectedNote")}</p>
        </>
      )}
      {pool.length === 0 && searched && !busy && (
        <p className="mt-3.5 text-xs leading-[17px] text-dim">{L(lang, "empty")}</p>
      )}
    </div>
  );
}
