"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  GitBranch,
  Lock,
  Power,
  Search,
  Send,
  Settings,
  ShieldCheck,
  User,
  Wifi,
  Zap,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Flag } from "./flag";
import { TG_SUPPORT, tr, type Lang } from "./i18n";
import { PlansSheet } from "./plans-sheet";
import type { ConfigItem, VpnState } from "./types";

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
  onPickServer,
  onOpenSettings,
}: {
  lang: Lang;
  state: VpnState;
  onToggle: () => void;
  seconds: number;
  server: ConfigItem | null;
  onPickServer: () => void;
  onOpenSettings: () => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const on = state === "on";
  const busy = state === "connecting";
  const label = on ? t.connected : busy ? t.connecting : t.notConnected;
  const Fwd = rtl ? ChevronLeft : ChevronRight;

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="flex flex-1 flex-col px-6 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-7 shrink-0 text-glow" />
          <Brand lang={lang} />
        </div>
        <div className="flex items-center gap-1">
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

      <div className="relative mt-8 flex h-52 items-center justify-center">
        <div className={on ? "breathe absolute size-56 rounded-full bg-glow/30 blur-3xl" : "absolute size-56 rounded-full bg-transparent"} />
        <button
          type="button"
          onClick={onToggle}
          aria-label={on ? "Disconnect" : "Connect"}
          className={
            on
              ? "relative grid size-48 place-items-center rounded-full border-4 border-glow bg-night shadow-[0_0_40px_oklch(0.84_0.15_168/0.55)] transition-all"
              : busy
                ? "spin-ring relative grid size-48 place-items-center rounded-full border-4 border-glow/30 border-t-glow bg-night transition-all"
                : "relative grid size-48 place-items-center rounded-full border-4 border-panel-edge bg-night transition-all hover:border-glow/50"
          }
        >
          <span className={busy ? "unspin grid size-36 place-items-center rounded-full bg-panel" : "grid size-36 place-items-center rounded-full bg-panel"}>
            <Power className={on ? "size-14 text-glow" : "size-14 text-dim"} strokeWidth={2.4} />
          </span>
        </button>
      </div>

      <div className="mt-6 text-center">
        <div className={on ? "font-display text-2xl font-bold text-glow" : "font-display text-2xl font-bold text-ink"}>{label}</div>
        <div className="mt-1 font-display text-base tabular-nums text-dim">{on ? fmt(seconds) : t.tapProtect}</div>
      </div>

      <button
        type="button"
        onClick={onPickServer}
        className="mt-6 flex items-center gap-4 rounded-2xl border border-panel-edge bg-panel p-4 text-start transition-colors hover:border-glow/40"
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

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-panel-edge bg-panel p-4">
          <div className="flex items-center gap-2 text-sm text-dim">
            <ArrowDown className="size-4 text-glow" /> {t.download}
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-ink tabular-nums">
            {on ? "48.2" : "0.0"} <span className="text-sm font-medium text-dim">Mbps</span>
          </div>
        </div>
        <div className="rounded-2xl border border-panel-edge bg-panel p-4">
          <div className="flex items-center gap-2 text-sm text-dim">
            <ArrowUp className="size-4 text-up" /> {t.upload}
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-ink tabular-nums">
            {on ? "12.6" : "0.0"} <span className="text-sm font-medium text-dim">Mbps</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ServersScreen({
  lang,
  configs,
  selectedId,
  onSelect,
  onPremiumTap,
  onBack,
}: {
  lang: Lang;
  configs: ConfigItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onPremiumTap: () => void;
  onBack: () => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const Back = rtl ? ChevronRight : ChevronLeft;
  const Fwd = rtl ? ChevronLeft : ChevronRight;
  const [q, setQ] = useState("");
  const list = configs.filter((c) => c.enabled && c.name.toLowerCase().includes(q.toLowerCase()));
  const enabled = configs.filter((c) => c.enabled);
  const freeEnabled = enabled.filter((c) => !c.premium);
  // Smart Connect really measures: lowest live ping among unlocked servers.
  const best = [...(freeEnabled.length ? freeEnabled : enabled)].sort((a, b) => a.ping - b.ping)[0];

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="flex min-h-0 flex-1 flex-col px-5 pt-2">
      <button type="button" onClick={onBack} aria-label="Back" className="w-fit text-dim hover:text-ink">
        <Back className="size-6" />
      </button>
      <h2 className="mt-3 font-display text-2xl font-bold text-ink">{t.selectLocation}</h2>
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
          <span className="block text-sm font-semibold text-ink">{t.smart}</span>
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
      </div>
      <div className="scroll-hide mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-3">
        {list.map((c) => {
          const sel = c.id === selectedId;
          const locked = c.premium;
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

export function AccountScreen({ lang }: { lang: Lang }) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const Fwd = rtl ? ChevronLeft : ChevronRight;
  const [kill, setKill] = useState(true);
  const [auto, setAuto] = useState(true);
  const [plans, setPlans] = useState(false);
  const used = 18.4;
  const total = 50;
  const r = 44;
  const circ = 2 * Math.PI * r;
  const rows = [
    { icon: ShieldCheck, t: t.killSwitch, d: t.killSwitchSub, v: kill, set: setKill },
    { icon: Wifi, t: t.autoConnect, d: t.autoConnectSub, v: auto, set: setAuto },
  ];

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="scroll-hide flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pt-2 pb-3"
    >
      <h2 className="font-display text-2xl font-bold text-ink">{t.account}</h2>
      <div className="flex items-center gap-4 rounded-2xl border border-panel-edge bg-panel p-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-ink/10">
          <User className="size-6 text-ink" />
        </span>
        <span className="flex-1">
          <span className="block text-base font-semibold text-ink">{t.planFree}</span>
          <span className="block text-sm text-dim">{t.planFreeSub}</span>
        </span>
        <Fwd className="size-5 shrink-0 text-dim" />
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-panel-edge bg-panel p-4">
        <div>
          <div className="text-sm text-dim">{t.dataUsage}</div>
          <div className="mt-1 text-sm text-dim">{t.resetsOn}</div>
        </div>
        <svg viewBox="0 0 110 110" className="size-28 shrink-0">
          <circle cx="55" cy="55" r={r} fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="9" />
          <circle
            cx="55"
            cy="55"
            r={r}
            fill="none"
            stroke="oklch(0.84 0.15 168)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${(used / total) * circ} ${circ}`}
            transform="rotate(-90 55 55)"
          />
          <text x="55" y="54" textAnchor="middle" className="fill-ink font-display" style={{ fontSize: 17, fontWeight: 800 }}>
            18.4 GB
          </text>
          <text x="55" y="71" textAnchor="middle" className="fill-dim" style={{ fontSize: 10 }}>
            of 50 GB
          </text>
        </svg>
      </div>
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
      <div className="flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-4">
        <GitBranch className="size-5 shrink-0 text-dim" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">{t.split}</span>
          <span className="block text-sm text-dim">{t.splitSub}</span>
        </span>
        <Fwd className="size-5 shrink-0 text-dim" />
      </div>
      <a
        href={TG_SUPPORT}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-4 transition-colors hover:border-glow/40"
      >
        <Send className="size-5 shrink-0 text-dim" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">{t.support}</span>
          <span dir="ltr" className="block text-sm text-dim">
            {t.supportSub}
          </span>
        </span>
        <Fwd className="size-5 shrink-0 text-dim" />
      </a>
      <button
        type="button"
        onClick={() => setPlans(true)}
        className="mt-1 rounded-2xl bg-glow py-3 font-display text-base font-bold text-on-glow"
      >
        {t.upgrade}
      </button>
      {plans && <PlansSheet lang={lang} reason="renew" onClose={() => setPlans(false)} />}
    </div>
  );
}
