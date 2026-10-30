"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Bell,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cog,
  Copy,
  Crown,
  Fingerprint,
  Gift,
  GitBranch,
  Globe,
  Inbox,
  Info,
  Loader2,
  Lock,
  Play,
  Power,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
  Zap,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { COUNTRIES, Flag } from "./flag";
import { TG_SUPPORT, tr, type Lang } from "./i18n";
import { FREE_QUOTA_GB, type ConfigItem, type Entitlement, type SplitState, type VpnState } from "./types";

/** یک ردیف مصرف — اپ یا سرور. در اپ واقعی از TrafficStats/VpnService می‌آید. */
export type UsageRow = { label: string; mb: number; icon?: "tg" | "web" | "cam" | "play" | "sys"; flag?: string };

export function pingTone(p: number): string {
  return p < 60 ? "text-glow" : p < 100 ? "text-gold" : "text-danger";
}

export function Bars({ ping }: { ping: number }) {
  const n = ping < 40 ? 4 : ping < 60 ? 3 : ping < 100 ? 2 : 1;
  return (
    <span className="flex h-3 items-end gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          style={{ height: `${i * 25}%` }}
          className={i <= n ? "w-1 rounded-sm bg-glow" : "w-1 rounded-sm bg-ink/20"}
        />
      ))}
    </span>
  );
}

function fmt(sec: number): string {
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/** Bilingual brand: big word + the other language underneath. */
export function Brand({ lang }: { lang: Lang }) {
  return (
    <span className="flex flex-col leading-none">
      {lang === "en" ? (
        <>
          <span dir="ltr" className="font-display text-xl font-extrabold tracking-tight text-ink">
            MIANBOOR
          </span>
          <span className="mt-1 text-xs font-medium text-dim">میانبر</span>
        </>
      ) : (
        <>
          <span className="text-xl font-extrabold text-ink">میانبر</span>
          <span dir="ltr" className="mt-1 font-display text-xs font-medium text-dim">
            Mianboor
          </span>
        </>
      )}
    </span>
  );
}

export function HomeScreen({
  lang,
  state,
  onToggle,
  seconds,
  server,
  warn,
  onPickServer,
  onOpenSettings,
  unread,
  onOpenInbox,
  origin,
  showFlash,
  flashOrigin,
}: {
  lang: Lang;
  state: VpnState;
  onToggle: () => void;
  seconds: number;
  server: ConfigItem | null;
  warn?: string | null;
  onPickServer: () => void;
  onOpenSettings: () => void;
  /** تعداد پیام خوانده‌نشده صندوق — badge روی زنگ */
  unread?: number;
  onOpenInbox?: () => void;
  /** آی‌پی و پرچم کشور مبدا کاربر (در اپ واقعی قبل از اتصال از ipwho.is) */
  origin?: { ip: string; country: string } | null;
  /** فلش لحظه اتصال: «از ایران به آلمان وصل شدی» — همیشه آی‌پی واقعی کاربر */
  flashOrigin?: { ip: string; country: string } | null;
  showFlash?: boolean;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const on = state === "on";
  const busy = state === "connecting";
  const label = on ? t.connected : busy ? t.connecting : t.notConnected;
  const Fwd = rtl ? ChevronLeft : ChevronRight;

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="flex flex-1 flex-col overflow-y-auto scroll-hide px-6 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-7 shrink-0 text-glow" />
          <Brand lang={lang} />
        </div>
        <div className="flex items-center gap-1">
          {/* صندوق پیام — زنگ با badge خوانده‌نشده */}
          {onOpenInbox && (
            <button
              type="button"
              onClick={onOpenInbox}
              aria-label={`${t.inbox}${unread ? ` (${unread})` : ""}`}
              className="relative grid size-9 place-items-center rounded-full text-dim hover:text-ink"
            >
              <Bell className="size-5" />
              {!!unread && unread > 0 && (
                <span className="absolute -end-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-night">
                  {unread}
                </span>
              )}
            </button>
          )}
          <a
            href={TG_SUPPORT}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${t.support} — @member9`}
            title={t.support}
            className="grid size-9 place-items-center rounded-full text-dim hover:text-ink"
          >
            <Send className="size-5" />
          </a>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label={t.settings}
            className="grid size-9 place-items-center rounded-full text-dim hover:text-ink"
          >
            <Settings className="size-6" />
          </button>
        </div>
      </div>

      <div className="relative mt-7 flex h-48 items-center justify-center">
        {/* هالهٔ نئون — موقع اتصال با ضربان زنده (کمرنگ↔پررنگ) */}
        <div className={on ? "breathe absolute size-56 rounded-full bg-glow/30 blur-3xl" : "absolute size-56 rounded-full bg-transparent"} />
        {on && <span className="pulse-ring absolute size-44 rounded-full border-2 border-glow/70" aria-hidden="true" />}
        <button
          type="button"
          onClick={onToggle}
          aria-label={on ? "Disconnect" : "Connect"}
          className={
            on
              ? "relative grid size-44 place-items-center rounded-full border-4 border-glow bg-night shadow-[0_0_40px_var(--mb-glow)] transition-all"
              : busy
                ? "spin-ring relative grid size-44 place-items-center rounded-full border-4 border-glow/30 border-t-glow bg-night transition-all"
                : "relative grid size-44 place-items-center rounded-full border-4 border-panel-edge bg-night transition-all hover:border-glow/50"
          }
        >
          <span className={busy ? "unspin grid size-32 place-items-center rounded-full bg-panel" : "grid size-32 place-items-center rounded-full bg-panel"}>
            <Power className={on ? "size-12 text-glow" : "size-12 text-dim"} strokeWidth={2.4} />
          </span>
        </button>
      </div>

      <div className="mt-4 text-center">
        <div className={on ? "font-display text-2xl font-bold text-glow" : "font-display text-2xl font-bold text-ink"}>{label}</div>
        <div className="mt-1 font-display text-base tabular-nums text-dim">{on ? fmt(seconds) : t.tapProtect}</div>
        {showFlash && on && server && (
          <div className="flash-in mx-auto mt-2 flex max-w-[300px] items-center justify-center gap-2 rounded-full border border-glow/40 bg-glow/10 px-3 py-1.5">
            <Flag code={(flashOrigin ?? origin)?.country ?? "ir"} size={18} />
            <span className="truncate text-xs font-semibold text-ink">
              {t.connectFlash
                .replace("{from}", COUNTRIES[(flashOrigin ?? origin)?.country ?? "ir"] ?? (flashOrigin ?? origin)?.country ?? "—")
                .replace("{to}", COUNTRIES[server.country] ?? server.country)}
            </span>
            <span className="text-xs text-dim">→</span>
            <Flag code={server.country} size={18} />
          </div>
        )}
        {warn && !on && (
          <div className="mx-auto mt-2 flex max-w-[280px] items-center justify-center gap-1.5 rounded-full border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger">
            <ShieldAlert className="size-3.5 shrink-0" /> {warn}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onPickServer}
        className="mt-5 flex items-center gap-4 rounded-2xl border border-panel-edge bg-panel p-4 text-start transition-colors hover:border-glow/40"
      >
        {server ? <Flag code={server.country} size={40} /> : <span className="size-10 rounded-full bg-ink/10" />}
        <span className="flex-1">
          <span className="block text-base font-semibold text-ink">{server ? server.name : t.noMatch}</span>
          {server && (
            <span className="mt-1 flex items-center gap-2 text-sm text-dim">
              <Bars ping={server.ping} /> <span className="tabular-nums">{server.ping} ms</span>
            </span>
          )}
        </span>
        <Fwd className="size-5 text-dim" />
      </button>

      {/* دانلود و آپلود کنار هم — آی‌پی مبدا زیرشان، دقیقا وسط */}
      <div className="mt-3 grid grid-cols-2 items-stretch gap-2">
        <div className="rounded-2xl border border-panel-edge bg-panel p-3">
          <div className="flex items-center gap-1.5 text-sm text-dim">
            <ArrowDown className="size-4 text-glow" /> {t.download}
          </div>
          <div className="mt-1.5 whitespace-nowrap font-display text-lg font-bold text-ink tabular-nums">
            {on ? "48.2" : "0.0"} <span className="text-xs font-medium text-dim">Mbps</span>
          </div>
        </div>
        <div className="rounded-2xl border border-panel-edge bg-panel p-3">
          <div className="flex items-center gap-1.5 text-sm text-dim">
            <ArrowUp className="size-4 text-up" /> {t.upload}
          </div>
          <div className="mt-1.5 whitespace-nowrap font-display text-lg font-bold text-ink tabular-nums">
            {on ? "12.6" : "0.0"} <span className="text-xs font-medium text-dim">Mbps</span>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center gap-2 rounded-2xl border border-panel-edge bg-panel px-3 py-2.5">
        {origin ? (
          <>
            <Flag code={origin.country} size={22} />
            <span dir="ltr" className="truncate font-mono text-[13px] font-semibold text-ink">{origin.ip}</span>
            <span className="text-dim">·</span>
            <span className="text-xs text-dim">{COUNTRIES[origin.country] ?? origin.country}</span>
          </>
        ) : (
          <>
            <Globe className="size-4 text-dim" />
            <span className="text-[13px] text-dim">{t.yourIp}…</span>
          </>
        )}
      </div>
    </div>
  );
}

export function ServersScreen({
  lang,
  configs,
  selectedId,
  premiumUser,
  syncing,
  syncOk,
  onRefresh,
  onSelect,
  onPremiumTap,
  onBack,
}: {
  lang: Lang;
  configs: ConfigItem[];
  selectedId: number | null;
  premiumUser: boolean;
  syncing: boolean;
  syncOk: boolean | null;
  onRefresh: () => void;
  onSelect: (id: number) => void;
  onPremiumTap: () => void;
  onBack: () => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const Back = rtl ? ChevronRight : ChevronLeft;
  const Fwd = rtl ? ChevronLeft : ChevronRight;
  const [q, setQ] = useState("");
  // کم‌ترین پینگ بالای لیست — مثل اپ واقعی
  const list = configs
    .filter((c) => c.enabled && c.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.ping - b.ping);
  const enabled = configs.filter((c) => c.enabled);
  const freeEnabled = enabled.filter((c) => !c.premium);
  // Smart Connect really measures: lowest live ping among the servers this user can join.
  const pool = premiumUser ? enabled : freeEnabled.length ? freeEnabled : enabled;
  const best = [...pool].sort((a, b) => a.ping - b.ping)[0];

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="flex min-h-0 flex-1 flex-col px-5 pt-2">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Back" className="w-fit text-dim hover:text-ink">
          <Back className="size-6" />
        </button>
        <h2 className="flex-1 font-display text-2xl font-bold text-ink">{t.selectLocation}</h2>
        {/* دکمه به‌روزرسانی از سرور — مثل اپ واقعی */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={syncing}
          aria-label={t.syncRefresh}
          title={t.syncRefresh}
          className={
            syncOk === false
              ? "grid size-9 shrink-0 place-items-center rounded-xl border border-panel-edge bg-panel text-danger hover:border-danger/40"
              : "grid size-9 shrink-0 place-items-center rounded-xl border border-panel-edge bg-panel text-glow hover:border-glow/40"
          }
        >
          {syncing ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
        </button>
      </div>
      <label className="mt-4 flex items-center gap-3 rounded-xl border border-panel-edge bg-panel px-4 py-3">
        <Search className="size-4 text-dim" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.search}
          aria-label={t.search}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-dim"
        />
      </label>
      <button
        type="button"
        onClick={() => best && onSelect(best.id)}
        className="mt-3 flex items-center gap-3 rounded-xl border border-glow/30 bg-glow/10 px-4 py-3 text-start"
      >
        <Zap className="size-5 shrink-0 fill-glow text-glow" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">
            {t.smart}
            {best && <span className="ms-2 text-dim">→ {best.name} · {best.ping} ms</span>}
          </span>
          <span className="block text-sm text-dim">{t.smartSub}</span>
        </span>
        <Fwd className="size-4 text-dim" />
      </button>
      <div className="mt-4 flex items-center gap-2 text-sm text-dim">
        <span>
          {t.locations} · {list.length}
        </span>
        <span className="flex items-center gap-1.5" title={t.livePing}>
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-glow opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-glow" />
          </span>
          {t.livePing}
        </span>
        {/* وضعیت همگام‌سازی با سرور */}
        <span className={syncOk === false ? "ms-auto text-xs text-danger" : "ms-auto text-xs"}>
          {syncing ? t.syncing : syncOk === null ? t.syncNever : syncOk ? t.syncOkAgo.replace("{m}", "<1") : t.syncFail}
        </span>
      </div>
      <div className="scroll-hide mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-3">
        {list.map((c) => {
          const sel = c.id === selectedId;
          const locked = c.premium && !premiumUser;
          const isBest = best?.id === c.id;
          return (
            <button
              type="button"
              key={c.id}
              onClick={() => (locked ? onPremiumTap() : onSelect(c.id))}
              aria-label={`${c.name}${locked ? " (premium)" : ""}`}
              className={
                locked
                  ? "flex items-center gap-3 rounded-xl border border-panel-edge bg-panel/60 px-3 py-3 text-start opacity-75"
                  : sel
                    ? "flex items-center gap-3 rounded-xl border border-glow/40 bg-panel px-3 py-3 text-start"
                    : "flex items-center gap-3 rounded-xl border border-panel-edge bg-panel px-3 py-3 text-start hover:border-ink/20"
              }
            >
              <Flag code={c.country} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{c.name}</span>
                <span className="block truncate text-sm text-dim">
                  {locked ? t.premiumLockSub : c.protocol}
                </span>
              </span>
              <span className={`w-12 shrink-0 text-end text-sm tabular-nums ${pingTone(c.ping)}`}>{c.ping} ms</span>
              {isBest && !locked && (
                <span className="shrink-0 rounded-full bg-glow/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-glow">
                  {t.best}
                </span>
              )}
              {locked ? (
                <>
                  <Crown className="size-4 shrink-0 fill-gold text-gold" />
                  <Lock className="size-4 shrink-0 text-gold" />
                </>
              ) : (
                <span className={sel ? "grid size-5 shrink-0 place-items-center rounded-full bg-glow" : "size-5 shrink-0 rounded-full border-2 border-ink/25"}>
                  {sel && <Check className="size-3.5 text-on-glow" strokeWidth={3} />}
                </span>
              )}
            </button>
          );
        })}
        {list.length === 0 && <div className="py-8 text-center text-sm text-dim">{t.noMatch}</div>}
      </div>
    </div>
  );
}

/* ── Account ── */

function usageRing(pct: number, stroke: string, big: string, small: string) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 110 110" className="size-28 shrink-0">
      <circle cx="55" cy="55" r={r} fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="9" />
      <circle
        cx="55"
        cy="55"
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${Math.min(1, Math.max(0, pct)) * circ} ${circ}`}
        transform="rotate(-90 55 55)"
      />
      <text x="55" y="54" textAnchor="middle" className="fill-ink font-display" style={{ fontSize: big.length > 6 ? 14 : 17, fontWeight: 800 }}>
        {big}
      </text>
      <text x="55" y="71" textAnchor="middle" className="fill-dim" style={{ fontSize: 10 }}>
        {small}
      </text>
    </svg>
  );
}

export function AccountScreen({
  lang,
  entitlement,
  trialLocked,
  usedGb,
  split,
  deviceId,
  unread,
  onOpenSplit,
  onUpgrade,
  onCopyDevice,
  onOpenUsage,
  onOpenInvite,
  onOpenSupport,
  onOpenInbox,
}: {
  lang: Lang;
  entitlement: Entitlement;
  trialLocked: boolean;
  usedGb: number;
  split: SplitState;
  deviceId: string;
  unread?: number;
  onOpenSplit: () => void;
  onUpgrade: () => void;
  onCopyDevice: () => void;
  onOpenUsage: () => void;
  onOpenInvite: () => void;
  onOpenSupport: () => void;
  onOpenInbox: () => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const Fwd = rtl ? ChevronLeft : ChevronRight;
  const [kill, setKill] = useState(true);
  const [auto, setAuto] = useState(true);
  const [renewOpen, setRenewOpen] = useState(false);
  const premium = entitlement.plan !== "free";
  const pct = premium ? 1 : trialLocked ? 1 : usedGb / FREE_QUOTA_GB;
  const usedStr = premium ? "∞" : `${usedGb.toFixed(1)}`;
  const totalStr = premium ? t.unlimited : `${FREE_QUOTA_GB} GB`;
  const until = entitlement.expiresAt
    ? new Date(entitlement.expiresAt).toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";
  const splitN = split.apps.length;
  const splitSub =
    splitN === 0
      ? t.splitSubOff
      : tpl2(t.splitSubOn, splitN, split.mode === "exclude" ? t.modeExcl : t.modeIncl);

  const rows = [
    { icon: ShieldCheck, t: t.killSwitch, d: t.killSwitchSub, v: kill, set: setKill },
    { icon: WifiIcon, t: t.autoConnect, d: t.autoConnectSub, v: auto, set: setAuto },
  ];

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="scroll-hide flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pt-2 pb-3"
    >
      <h2 className="font-display text-2xl font-bold text-ink">{t.account}</h2>

      {/* plan card */}
      {premium ? (
        <div className="flex items-center gap-4 rounded-2xl border border-gold/40 bg-gold/10 p-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gold/20">
            <Crown className="size-6 fill-gold text-gold" />
          </span>
          <span className="flex-1">
            <span className="flex items-center gap-1.5 text-base font-bold text-ink">
              {t.planPremium} <BadgeCheck className="size-4 fill-gold text-gold" />
            </span>
            <span className="block text-sm text-dim">{t.planPremiumSub}</span>
            <span dir="ltr" className="mt-0.5 block text-sm font-medium text-gold">
              {t.validUntil} {until}
            </span>
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={onUpgrade}
          className="flex items-center gap-4 rounded-2xl border border-panel-edge bg-panel p-4 text-start transition-colors hover:border-glow/40"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-ink/10">
            <User className="size-6 text-ink" />
          </span>
          <span className="flex-1">
            <span className="block text-base font-semibold text-ink">{t.planFree}</span>
            <span className="block text-sm text-dim">{t.planFreeSub}</span>
          </span>
          <Fwd className="size-5 shrink-0 text-dim" />
        </button>
      )}

      {/* usage — با کلیک، جزئیات مصرف به تفکیک اپ و سرور باز می‌شه */}
      <button
        type="button"
        onClick={onOpenUsage}
        aria-label={t.usageDetails}
        className="flex items-center justify-between rounded-2xl border border-panel-edge bg-panel p-4 text-start transition-colors hover:border-glow/40"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm text-dim">
            {t.dataUsage}
            <ChevronRight className="size-3.5 rtl:hidden" />
            <ChevronLeft className="size-3.5 hidden rtl:block" />
          </div>
          {premium ? (
            <div className="mt-2 flex items-center gap-1.5 text-sm font-medium text-gold">
              <Crown className="size-4 shrink-0 fill-gold text-gold" /> {t.unlimited}
            </div>
          ) : trialLocked ? (
            <div className="mt-2 text-sm font-medium leading-5 text-danger">{t.trialUsedTitle}</div>
          ) : (
            <div className="mt-2 text-sm text-dim">{t.resetsOn}</div>
          )}
        </div>
        {usageRing(
          pct,
          premium ? "var(--mb-gold)" : trialLocked ? "var(--mb-danger)" : "var(--mb-glow)",
          premium ? "∞" : `${usedStr} GB`,
          premium ? t.unlimited : totalStr,
        )}
      </button>
      {trialLocked && !premium && <div className="-mt-1 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs leading-5 text-danger">{t.trialUsedSub}</div>}

      {rows.map(({ icon: I, t: title, d, v, set }) => (
        <div key={title} className="flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-4">
          <I className="size-5 shrink-0 text-dim" />
          <span className="flex-1">
            <span className="block text-sm font-semibold text-ink">{title}</span>
            <span className="block text-sm text-dim">{d}</span>
          </span>
          <Switch checked={v} onCheckedChange={set} aria-label={title} />
        </div>
      ))}

      {/* split tunneling — really works */}
      <button
        type="button"
        onClick={onOpenSplit}
        className="flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-4 text-start transition-colors hover:border-glow/40"
      >
        <GitBranch className="size-5 shrink-0 text-dim" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">{t.split}</span>
          <span className="block text-sm text-dim">{splitSub}</span>
        </span>
        <Fwd className="size-5 shrink-0 text-dim" />
      </button>

      {/* renew subscription + explainer */}
      <div className="rounded-2xl border border-panel-edge bg-panel">
        <button type="button" onClick={() => setRenewOpen((o) => !o)} className="flex w-full items-center gap-3 p-4 text-start" aria-expanded={renewOpen}>
          <Info className="size-5 shrink-0 text-dim" />
          <span className="flex-1">
            <span className="block text-sm font-semibold text-ink">{t.renewRow}</span>
            <span className="block text-sm text-dim">{t.renewWhat}</span>
          </span>
          <ChevronDown className={`size-5 shrink-0 text-dim transition-transform ${renewOpen ? "rotate-180" : ""}`} />
        </button>
        {renewOpen && <p className="screen-in border-t border-panel-edge px-4 py-3 text-sm leading-6 text-dim">{t.renewExplain}</p>}
      </div>

      {/* پیام‌ها — صندوق اطلاع‌رسانی‌های میانبر */}
      <button
        type="button"
        onClick={onOpenInbox}
        className="flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-4 text-start transition-colors hover:border-glow/40"
      >
        <Inbox className="size-5 shrink-0 text-dim" />
        <span className="flex-1">
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            {t.inbox}
            {!!unread && unread > 0 && (
              <span className="grid min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-night">{unread}</span>
            )}
          </span>
          <span className="block text-sm text-dim">{t.inboxRowSub}</span>
        </span>
        <Fwd className="size-5 shrink-0 text-dim" />
      </button>

      {/* دعوت دوستان — referral: کد معرف و روز هدیه */}
      <button
        type="button"
        onClick={onOpenInvite}
        className="flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-4 text-start transition-colors hover:border-gold/40"
      >
        <Gift className="size-5 shrink-0 text-dim" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">{t.invite}</span>
          <span className="block text-sm text-dim">{t.inviteSub}</span>
        </span>
        <Fwd className="size-5 shrink-0 text-dim" />
      </button>

      {/* پشتیبانی آنلاین — چت هوشمند داخل اپ + نقطه سبز چشمک‌زن لایو */}
      <button
        type="button"
        onClick={onOpenSupport}
        className="flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-4 text-start transition-colors hover:border-glow/40"
      >
        <Send className="size-5 shrink-0 text-dim" />
        <span className="flex-1">
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            {t.supportOnline}
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-glow opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-glow" />
            </span>
          </span>
          <span className="block text-sm text-dim">{t.supportSubChat}</span>
        </span>
        <Fwd className="size-5 shrink-0 text-dim" />
      </button>

      {/* device id — anti-fraud binding */}
      <button
        type="button"
        onClick={onCopyDevice}
        className="flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-4 text-start transition-colors hover:border-ink/20"
      >
        <Fingerprint className="size-5 shrink-0 text-dim" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">{t.deviceId}</span>
          <span className="block text-sm text-dim">{t.deviceIdSub}</span>
        </span>
        <span dir="ltr" className="shrink-0 rounded-full bg-night px-2.5 py-1 font-mono text-xs text-dim">
          {deviceId}
        </span>
        <Copy className="size-4 shrink-0 text-dim" />
      </button>

      <button
        type="button"
        onClick={onUpgrade}
        className="mt-1 rounded-2xl bg-glow py-3 font-display text-base font-bold text-on-glow"
      >
        {premium ? t.renewBtn : t.upgrade}
      </button>
    </div>
  );
}

function fmtMb(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}

function UsageBar({ row, max }: { row: UsageRow; max: number }) {
  const pct = Math.round((row.mb / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink/10">
        {row.flag ? (
          <Flag code={row.flag} size={22} />
        ) : row.icon === "tg" ? (
          <Send className="size-4 text-ink" />
        ) : row.icon === "web" ? (
          <Globe className="size-4 text-ink" />
        ) : row.icon === "cam" ? (
          <Camera className="size-4 text-ink" />
        ) : row.icon === "play" ? (
          <Play className="size-4 text-ink" />
        ) : (
          <Cog className="size-4 text-ink" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-ink">{row.label}</span>
          <span className="shrink-0 text-xs font-medium tabular-nums text-dim">{fmtMb(row.mb)}</span>
        </span>
        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-ink/10">
          <span className="block h-full rounded-full bg-glow" style={{ width: `${pct}%` }} />
        </span>
      </span>
    </div>
  );
}

/**
 * جزئیات مصرف — با لمس کارت «مصرف دیتا» باز می‌شود:
 * کاربر می‌بیند کدام اپ و کدام سرور چقدر مصرف کرده.
 * در اپ اندروید: نمونه‌گیری TrafficStats به تفکیک UID + آمار سشن هر سرور.
 */
export function UsageSheet({
  lang,
  usedGb,
  totalText,
  byApp,
  byServer,
  onClose,
}: {
  lang: Lang;
  usedGb: number;
  totalText: string;
  byApp: UsageRow[];
  byServer: UsageRow[];
  onClose: () => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const maxApp = Math.max(...byApp.map((r) => r.mb), 1);
  const maxSrv = Math.max(...byServer.map((r) => r.mb), 1);
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col justify-end bg-night/70 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        dir={rtl ? "rtl" : "ltr"}
        className="sheet-in flex max-h-[88%] flex-col rounded-t-3xl border-t border-glow/30 bg-panel px-5 pt-4 pb-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t.usageDetails}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-ink">{t.usageDetails}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full text-dim hover:text-ink">
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-0.5 text-sm text-dim">
          {t.usageThisMonth} · <span className="font-semibold text-ink">{usedGb.toFixed(1)} GB</span> / {totalText}
        </div>

        <div className="scroll-hide mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <section>
            <div className="text-sm font-bold text-ink">{t.usageByApp}</div>
            <div className="text-xs text-dim">{t.usageAppSub}</div>
            <div className="mt-2.5 flex flex-col gap-3">
              {byApp.map((r) => (
                <UsageBar key={r.label} row={r} max={maxApp} />
              ))}
            </div>
          </section>

          <section>
            <div className="text-sm font-bold text-ink">{t.usageByServer}</div>
            <div className="text-xs text-dim">{t.usageSrvSub}</div>
            <div className="mt-2.5 flex flex-col gap-3">
              {byServer.map((r) => (
                <UsageBar key={r.label} row={r} max={maxSrv} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function tpl2(s: string, n: number, mode: string) {
  return s.replace("{n}", String(n)).replace("{mode}", mode);
}

function WifiIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20h.01" />
      <path d="M2 8.82a15 15 0 0 1 20 0" />
      <path d="M5 12.859a10 10 0 0 1 14 0" />
      <path d="M8.5 16.429a5 5 0 0 1 7 0" />
    </svg>
  );
}
