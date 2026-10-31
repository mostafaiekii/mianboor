"use client";

/**
 * قابلیت‌های نسخهٔ ۲ دمو — همه به‌شکل واقعی داخل دمو کار می‌کنند:
 * اسپیدتست زنده، وضعیت سرورها، ورود کانفیگ شخصی، کیف پول + کد هدیه،
 * مدیریت دستگاه‌ها، صفحهٔ حریم خصوصی، نمودار مصرف ۱۴ روزه و پیش‌نمایش ویجت.
 */

import { useState } from "react";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Gauge,
  Gift,
  Globe,
  History,
  Link2,
  Loader2,
  Plus,
  Power,
  QrCode,
  Send,
  Shield,
  ShieldCheck,
  Smartphone,
  Star,
  TrendingUp,
  Upload,
  Wallet as WalletIcon,
  X,
  Zap,
} from "lucide-react";
import { COUNTRIES, Flag } from "./flag";
import { TG_SUPPORT, tr, type Lang } from "./i18n";
import {
  type ConfigItem,
  type MyDevice,
  type UsageDay,
  type Wallet,
  WALLET_CODES,
} from "./types";

/* ─────────────────────────── Speed test ─────────────────────────── */

export type SpeedPhase = "idle" | "down" | "up" | "done";

export interface SpeedState {
  phase: SpeedPhase;
  down: number;
  up: number;
  samples: number[];
}

/** شیت اسپیدتست — موتور تست در page.tsx می‌چرخد و اینجا فقط نمایش زنده است. */
export function SpeedTestSheet({
  lang,
  server,
  speed,
  onStart,
  onClose,
}: {
  lang: Lang;
  server: ConfigItem;
  speed: SpeedState | null;
  onStart: () => void;
  onClose: () => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const running = speed !== null && (speed.phase === "down" || speed.phase === "up");
  const done = speed?.phase === "done";
  const shown = speed?.phase === "up" ? speed.up : speed?.down ?? 0;
  const maxSample = Math.max(...(speed?.samples ?? [1]), 1);

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-night/70 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div
        dir={rtl ? "rtl" : "ltr"}
        className="sheet-in flex max-h-[86%] flex-col gap-3 rounded-t-3xl border-t border-glow/30 bg-panel px-5 pt-4 pb-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t.speedTest}
      >
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <Gauge className="size-5 text-glow" /> {t.speedTest}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-dim hover:text-ink">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-panel-edge bg-night px-3 py-2.5">
          <Flag code={server.country} size={28} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">{server.name}</span>
            <span className="block text-xs text-dim">{t.speedResultSub}</span>
          </span>
          <span className={`shrink-0 text-sm tabular-nums ${server.ping <= 110 ? "text-glow" : server.ping <= 200 ? "text-gold" : "text-danger"}`}>
            {t.speedPing}: {server.ping} ms
          </span>
        </div>

        {/* عدد بزرگ زنده + نمودار میله‌ای */}
        <div className="flex flex-col items-center rounded-2xl border border-panel-edge bg-night px-4 py-5">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-5xl font-black tabular-nums text-glow">
              {shown.toFixed(1)}
            </span>
            <span className="text-sm font-semibold text-dim">Mbps</span>
          </div>
          <div className="mt-1 flex h-5 items-center gap-2 text-xs font-semibold text-dim">
            {speed?.phase === "down" && (
              <>
                <Download className="size-3.5 text-glow" /> {t.speedDown} · {t.speedTesting}
              </>
            )}
            {speed?.phase === "up" && (
              <>
                <Upload className="size-3.5 text-up" /> {t.speedUp} · {t.speedTesting}
              </>
            )}
            {done && (
              <>
                <BadgeCheck className="size-4 text-glow" /> {lang === "fa" ? "تموم شد" : "Done"}
              </>
            )}
            {!speed && <span className="opacity-70">{t.speedStart}</span>}
          </div>
          <div className="mt-4 flex h-16 w-full items-end gap-1" aria-hidden="true">
            {(speed?.samples ?? []).slice(-34).map((s, i) => (
              <span
                key={i}
                className={`flex-1 rounded-t-sm ${speed?.phase === "up" ? "bg-up" : "bg-glow"}`}
                style={{ height: `${Math.max(4, (s / maxSample) * 100)}%`, opacity: 0.35 + (i / 34) * 0.65 }}
              />
            ))}
            {(speed?.samples.length ?? 0) === 0 && <span className="h-1 w-full rounded-full bg-ink/10" />}
          </div>
        </div>

        {done && speed && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-panel-edge bg-night px-3 py-2.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-dim">
                <Download className="size-3.5 text-glow" /> {t.speedDown}
              </div>
              <div className="mt-0.5 font-display text-lg font-bold tabular-nums text-ink">
                {speed.down.toFixed(1)} <span className="text-xs text-dim">Mbps</span>
              </div>
            </div>
            <div className="rounded-xl border border-panel-edge bg-night px-3 py-2.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-dim">
                <Upload className="size-3.5 text-up" /> {t.speedUp}
              </div>
              <div className="mt-0.5 font-display text-lg font-bold tabular-nums text-ink">
                {speed.up.toFixed(1)} <span className="text-xs text-dim">Mbps</span>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onStart}
          disabled={running}
          className="flex items-center justify-center gap-2 rounded-xl bg-glow py-3 font-display text-base font-bold text-on-glow disabled:opacity-60"
        >
          {running ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
          {running ? t.speedTesting : t.speedStart}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────── Server status ─────────────────────────── */

/** آپ‌تایم قطعی (دمو) از شناسهٔ سرور — در اپ واقعی از مانیتورینگ می‌آید */
export const uptimeOf = (id: number): number => 98.4 + ((id * 37) % 16) / 10;
export const loadOf = (id: number): 0 | 1 | 2 => (id % 3) as 0 | 1 | 2;

export function StatusSheet({
  lang,
  configs,
  dead,
  onClose,
}: {
  lang: Lang;
  configs: ConfigItem[];
  dead: number[];
  onClose: () => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-night/70 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div
        dir={rtl ? "rtl" : "ltr"}
        className="sheet-in flex max-h-[86%] flex-col rounded-t-3xl border-t border-glow/30 bg-panel px-5 pt-4 pb-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t.statusTitle}
      >
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <ShieldCheck className="size-5 text-glow" /> {t.statusTitle}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-dim hover:text-ink">
            <X className="size-5" />
          </button>
        </div>
        <div className="text-sm text-dim">{t.statusSub}</div>

        <div className="scroll-hide mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {configs.map((c) => {
            const isDead = dead.includes(c.id);
            const up = uptimeOf(c.id);
            const load = loadOf(c.id);
            const loadText = load === 0 ? t.loadLow : load === 1 ? t.loadMed : t.loadHigh;
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-panel-edge bg-night px-3 py-2.5">
                <Flag code={c.country} size={26} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{c.name}</span>
                  <span className="flex items-center gap-2 text-xs text-dim">
                    <span className={`relative flex size-1.5`}>
                      {!isDead && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-glow opacity-60" />}
                      <span className={`relative inline-flex size-1.5 rounded-full ${isDead ? "bg-danger" : "bg-glow"}`} />
                    </span>
                    {t.statusUptime} {isDead ? "—" : `${up.toFixed(1)}%`} · {t.statusLoad}: {loadText}
                  </span>
                </span>
                <span className={`shrink-0 text-sm tabular-nums ${c.ping <= 110 ? "text-glow" : c.ping <= 200 ? "text-gold" : "text-danger"}`}>
                  {c.ping} ms
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Import config ─────────────────────────── */

const IMPORT_FLAGS = ["de", "nl", "fi", "tr", "us", "gb", "fr", "se", "ae", "sg"];

/** پارس ساده و مقاوم لینک اشتراک برای دمو */
export function parseShareLink(link: string): { protocol: string; host: string; name: string } | null {
  const l = link.trim();
  const pm = l.match(/^(vless|vmess|trojan|ss):\/\//i);
  if (!pm) return null;
  const protocol = pm[1].toLowerCase();
  let host = "";
  let name = "";
  try {
    if (protocol === "vmess") {
      const b64 = l.slice(8).replace(/-/g, "+").replace(/_/g, "/");
      const json = JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)));
      host = String(json.add ?? "");
      name = String(json.ps ?? "");
    } else {
      const frag = l.split("#")[1];
      if (frag) name = decodeURIComponent(frag);
      const hm = l.match(/@([a-zA-Z0-9.\-]+):(\d+)/);
      if (hm) host = hm[1];
    }
  } catch {
    return null;
  }
  if (!host || !/^[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(host)) return null;
  return { protocol, host, name };
}

export function ImportSheet({
  lang,
  onAddServer,
  onImportSub,
  onClose,
}: {
  lang: Lang;
  onAddServer: (c: { name: string; country: string; protocol: string; host: string }) => void;
  onImportSub: (host: string) => void;
  onClose: () => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const [tab, setTab] = useState<"link" | "sub">("link");
  const [link, setLink] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("de");
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [err, setErr] = useState("");

  const addFromLink = () => {
    const p = parseShareLink(link);
    if (!p) {
      setErr(t.importInvalid);
      return;
    }
    onAddServer({ name: name.trim() || p.name || `Custom · ${p.host}`, country, protocol: p.protocol.toUpperCase(), host: p.host });
  };

  const fetchSub = () => {
    if (!/^https:\/\/.+\..+/.test(url.trim())) {
      setErr(t.importSubBad);
      return;
    }
    setErr("");
    setFetching(true);
    setTimeout(() => {
      setFetching(false);
      try {
        onImportSub(new URL(url.trim()).hostname);
      } catch {
        /* unreachable — regex validated */
      }
    }, 1400);
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-night/70 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div
        dir={rtl ? "rtl" : "ltr"}
        className="sheet-in flex max-h-[88%] flex-col gap-3 rounded-t-3xl border-t border-glow/30 bg-panel px-5 pt-4 pb-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t.importTitle}
      >
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <Plus className="size-5 text-glow" /> {t.importTitle}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-dim hover:text-ink">
            <X className="size-5" />
          </button>
        </div>
        <div className="text-sm text-dim">{t.importSub2}</div>

        <div className="grid grid-cols-2 gap-0 rounded-xl border border-panel-edge bg-night p-1">
          {([
            ["link", t.importLinkTab],
            ["sub", t.importSubTab],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => { setTab(k); setErr(""); }}
              className={`rounded-lg py-2 text-sm transition-colors ${tab === k ? "bg-panel font-bold text-ink" : "text-dim"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "link" ? (
          <>
            <textarea
              dir="ltr"
              value={link}
              onChange={(e) => { setLink(e.target.value); setErr(""); }}
              placeholder={t.importLinkSub}
              rows={3}
              className="w-full resize-none rounded-xl border border-panel-edge bg-night px-3 py-2.5 font-mono text-xs text-ink outline-none placeholder:text-dim focus:border-glow/40"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.importName}
                className="w-full rounded-xl border border-panel-edge bg-night px-3 py-2.5 text-sm text-ink outline-none placeholder:text-dim focus:border-glow/40"
              />
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                aria-label={t.importCountry}
                className="w-full rounded-xl border border-panel-edge bg-night px-3 py-2.5 text-sm text-ink outline-none focus:border-glow/40"
              >
                {IMPORT_FLAGS.map((f) => (
                  <option key={f} value={f}>
                    {COUNTRIES[f] ?? f}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={addFromLink}
              className="flex items-center justify-center gap-2 rounded-xl bg-glow py-3 font-display text-base font-bold text-on-glow"
            >
              <Plus className="size-4" /> {t.importAdd}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 rounded-xl border border-panel-edge bg-night px-3 py-1">
              <Link2 className="size-4 shrink-0 text-dim" />
              <input
                dir="ltr"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setErr(""); }}
                placeholder="https://sub.example.com/xxxx"
                className="w-full bg-transparent py-2 font-mono text-xs text-ink outline-none placeholder:text-dim"
              />
            </div>
            <button
              type="button"
              onClick={fetchSub}
              disabled={fetching}
              className="flex items-center justify-center gap-2 rounded-xl bg-glow py-3 font-display text-base font-bold text-on-glow disabled:opacity-60"
            >
              {fetching ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {fetching ? t.importFetching : t.importFetch}
            </button>
          </>
        )}

        {err && <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{err}</div>}

        <div className="flex items-center gap-2 rounded-xl border border-panel-edge bg-night px-3 py-2.5 text-xs text-dim">
          <QrCode className="size-4 shrink-0 text-dim" /> {t.importQrNote}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Wallet screen ─────────────────────────── */

const fmtT = (n: number) => n.toLocaleString("en-US");

export function WalletScreen({
  lang,
  wallet,
  onTopup,
  onRedeem,
  onBack,
}: {
  lang: Lang;
  wallet: Wallet;
  onTopup: () => void;
  /** ردیم کد — موفق/ناموفق برای پیام داخل صفحه */
  onRedeem: (code: string) => boolean;
  onBack: () => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const Back = rtl ? ChevronRight : ChevronLeft;
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const redeem = () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    const ok = onRedeem(c);
    setMsg(ok ? { ok: true, text: t.walletRedeemOk.replace("{n}", fmtT(WALLET_CODES[c] ?? 0)) } : { ok: false, text: t.walletRedeemBad });
    if (ok) setCode("");
  };

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="scroll-hide flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pt-2 pb-3">
      <button type="button" onClick={onBack} aria-label="Back" className="w-fit shrink-0 text-dim hover:text-ink">
        <Back className="size-6" />
      </button>
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
        <WalletIcon className="size-6 text-glow" /> {t.wallet}
      </h2>

      {/* موجودی */}
      <div className="rounded-2xl border border-glow/30 bg-glow/10 p-4">
        <div className="text-sm text-dim">{t.walletBalance}</div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="font-display text-3xl font-black tabular-nums text-ink">{fmtT(wallet.balance)}</span>
          <span className="text-sm font-semibold text-dim">{t.toman}</span>
        </div>
        <button
          type="button"
          onClick={onTopup}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-glow py-2.5 font-display text-sm font-bold text-on-glow"
        >
          <Plus className="size-4" /> {t.walletTopup}
        </button>
      </div>

      {/* کد هدیه */}
      <div className="rounded-2xl border border-panel-edge bg-panel p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Gift className="size-4 text-gold" /> {t.walletRedeem}
        </div>
        <div className="mt-2.5 flex gap-2">
          <input
            dir="ltr"
            value={code}
            onChange={(e) => { setCode(e.target.value); setMsg(null); }}
            onKeyDown={(e) => e.key === "Enter" && redeem()}
            placeholder={t.walletRedeemPh}
            className="w-full flex-1 rounded-xl border border-panel-edge bg-night px-3 py-2.5 font-mono text-sm uppercase text-ink outline-none placeholder:normal-case placeholder:text-dim focus:border-glow/40"
          />
          <button type="button" onClick={redeem} className="shrink-0 rounded-xl bg-gold px-4 font-display text-sm font-bold text-night">
            {t.walletRedeemBtn}
          </button>
        </div>
        {msg && (
          <div className={`mt-2 rounded-xl px-3 py-2 text-xs font-medium ${msg.ok ? "border border-glow/30 bg-glow/10 text-glow" : "border border-danger/30 bg-danger/10 text-danger"}`}>
            {msg.text}
          </div>
        )}
      </div>

      {/* تراکنش‌ها */}
      <div className="rounded-2xl border border-panel-edge bg-panel p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <History className="size-4 text-dim" /> {t.walletTxs}
        </div>
        <div className="mt-2.5 flex flex-col gap-2">
          {wallet.txs.length === 0 && <div className="py-3 text-center text-sm text-dim">—</div>}
          {wallet.txs.map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 rounded-xl bg-night px-3 py-2.5">
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${tx.amount >= 0 ? "bg-glow/15" : "bg-gold/15"}`}>
                {tx.kind === "pay" ? <Zap className="size-4 text-gold" /> : tx.kind === "redeem" ? <Gift className="size-4 text-gold" /> : <Plus className="size-4 text-glow" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">
                  {tx.kind === "topup" ? t.txTopup : tx.kind === "redeem" ? tx.label : t.txPay}
                </span>
                <span dir="ltr" className="block text-[11px] text-dim">
                  {new Date(tx.at).toLocaleString(lang === "fa" ? "fa-IR" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </span>
              <span dir="ltr" className={`shrink-0 text-sm font-bold tabular-nums ${tx.amount >= 0 ? "text-glow" : "text-gold"}`}>
                {tx.amount >= 0 ? "+" : "−"}{fmtT(Math.abs(tx.amount))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Devices (user side) ─────────────────────────── */

export function DevicesSheet({
  lang,
  devices,
  onUnlink,
  onClose,
}: {
  lang: Lang;
  devices: MyDevice[];
  onUnlink: (id: string) => void;
  onClose: () => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-night/70 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div
        dir={rtl ? "rtl" : "ltr"}
        className="sheet-in flex max-h-[80%] flex-col gap-2 rounded-t-3xl border-t border-glow/30 bg-panel px-5 pt-4 pb-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t.myDevices}
      >
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <Smartphone className="size-5 text-glow" /> {t.myDevices}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-dim hover:text-ink">
            <X className="size-5" />
          </button>
        </div>
        <div className="text-sm text-dim">{t.myDevicesSub}</div>
        <div className="scroll-hide mt-1 flex flex-col gap-2 overflow-y-auto">
          {devices.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-xl border border-panel-edge bg-night px-3 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink/10">
                <Smartphone className="size-4 text-ink" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  {d.self ? t.thisPhone : d.name}
                  {d.self && <BadgeCheck className="size-3.5 text-glow" />}
                </span>
                <span dir="ltr" className="block truncate font-mono text-[11px] text-dim">
                  {d.id} · {d.lastSeen}
                </span>
              </span>
              {d.self ? (
                <span className="shrink-0 rounded-full bg-glow/15 px-2.5 py-1 text-[11px] font-bold text-glow">✓</span>
              ) : (
                <button
                  type="button"
                  onClick={() => onUnlink(d.id)}
                  className="shrink-0 rounded-full border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/20"
                >
                  {t.unlink}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Privacy screen ─────────────────────────── */

export function PrivacyScreen({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const Back = rtl ? ChevronRight : ChevronLeft;
  const sections = [
    { i: Copy, ti: t.p1t, b: t.p1b },
    { i: Shield, ti: t.p2t, b: t.p2b },
    { i: ShieldCheck, ti: t.p3t, b: t.p3b },
    { i: Star, ti: t.p4t, b: t.p4b },
  ];
  return (
    <div dir={rtl ? "rtl" : "ltr"} className="scroll-hide flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pt-2 pb-3">
      <button type="button" onClick={onBack} aria-label="Back" className="w-fit shrink-0 text-dim hover:text-ink">
        <Back className="size-6" />
      </button>
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
        <ShieldCheck className="size-6 text-glow" /> {t.privacyTitle}
      </h2>
      {sections.map(({ i: I, ti, b }) => (
        <div key={ti} className="rounded-2xl border border-panel-edge bg-panel p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <I className="size-4 text-glow" /> {ti}
          </div>
          <p className="mt-1.5 text-sm leading-6 text-dim">{b}</p>
        </div>
      ))}
      <a
        href={TG_SUPPORT}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-xl border border-panel-edge bg-panel py-3 text-sm font-semibold text-dim hover:text-ink"
      >
        <Send className="size-4" /> @member9
      </a>
    </div>
  );
}

/* ─────────────────────────── Usage chart (14 days) ─────────────────────────── */

export function UsageChart({ lang, days }: { lang: Lang; days: UsageDay[] }) {
  const t = tr(lang);
  const max = Math.max(...days.map((d) => d.gb), 1);
  return (
    <section>
      <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
        <TrendingUp className="size-4 text-glow" /> {t.usageChart}
      </div>
      <div className="text-xs text-dim">{t.usageChartSub}</div>
      <div className="mt-2.5 flex h-24 items-end gap-1.5 rounded-xl bg-night px-2.5 pt-2" dir="ltr">
        {days.map((d, i) => (
          <span key={i} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${d.gb.toFixed(1)} GB`}>
            <span
              className={`w-full rounded-t-sm ${i === days.length - 1 ? "bg-gold" : "bg-glow/70"}`}
              style={{ height: `${Math.max(3, (d.gb / max) * 100)}%` }}
            />
          </span>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-dim" dir="ltr">
        <span>{days[0]?.label}</span>
        <span>{t.today}</span>
      </div>
    </section>
  );
}

/* ─────────────────────────── Phone features preview (settings) ─────────────────────────── */

export function PhoneExtrasCard({ lang }: { lang: Lang }) {
  const t = tr(lang);
  const rtl = lang === "fa";
  return (
    <div className="mt-3 rounded-2xl border border-panel-edge bg-panel p-4">
      <div className="text-sm font-semibold text-ink">{t.phoneExtras}</div>
      <div className="mt-0.5 text-sm text-dim">{t.phoneExtrasSub}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {/* ویجت صفحهٔ اصلی */}
        <div className="rounded-xl border border-panel-edge bg-night p-3">
          <div className="text-[11px] font-semibold text-dim">{t.widgetPrev}</div>
          <div className="mt-2 flex items-center gap-2.5 rounded-lg bg-panel p-2.5">
            <span className="grid size-9 place-items-center rounded-full border-2 border-glow bg-panel">
              <Power className="size-4 text-glow" />
            </span>
            <span className="min-w-0">
              <span dir="ltr" className="block truncate font-display text-[11px] font-bold text-ink">MIANBOOR</span>
              <span className="block text-[10px] text-glow">{rtl ? "متصل · آلمان" : "Connected · DE"}</span>
            </span>
          </div>
        </div>
        {/* کاشی Quick Settings */}
        <div className="rounded-xl border border-panel-edge bg-night p-3">
          <div className="text-[11px] font-semibold text-dim">{t.tilePrev}</div>
          <div className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-glow py-2.5">
            <ShieldCheck className="size-4 text-on-glow" />
            <span className="text-[11px] font-bold text-on-glow">{rtl ? "میانبر · روشن" : "Mianboor · On"}</span>
          </div>
        </div>
      </div>
      <a
        href={TG_SUPPORT}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex items-center gap-2 rounded-xl border border-panel-edge bg-night px-3 py-2.5 transition-colors hover:border-glow/40"
      >
        <Send className="size-4 shrink-0 text-glow" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{t.tgBot}</span>
          <span className="block truncate text-xs text-dim">{t.tgBotSub}</span>
        </span>
        {rtl ? <ChevronLeft className="size-4 shrink-0 text-dim" /> : <ChevronRight className="size-4 shrink-0 text-dim" />}
      </a>
    </div>
  );
}

/* ─────────────────────────── small shared helpers ─────────────────────────── */

export function SpeedChip({ lang, r }: { lang: Lang; r: { down: number; up: number } }) {
  return (
    <span dir="ltr" className="shrink-0 rounded-full bg-glow/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-glow" title={tr(lang).speedTest}>
      ↓{Math.round(r.down)}
    </span>
  );
}

export function FavStar({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      aria-pressed={active}
      className="shrink-0 p-0.5"
    >
      <Star className={`size-4 ${active ? "fill-gold text-gold" : "text-dim hover:text-gold"}`} />
    </button>
  );
}

export function BestGlobe() {
  return <Globe className="size-4 text-glow" />;
}
