"use client";

/**
 * تنظیمات کامل — نسخهٔ ۲:
 * زبان، تم، پینگ زنده، محافظت اتصال (Kill Switch / Failover / Auto-reconnect)،
 * حالت ضد-فیلترینگ، DNS رمز، قابلیت‌های گوشی، حریم خصوصی، آزمایشگاه دمو و ضدچیت.
 */

import { Activity, ChevronLeft, ChevronRight, Fingerprint, FlaskConical, Info, Palette, Send, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { TG_SUPPORT, tr, type Lang } from "./i18n";
import { THEMES, THEME_ORDER, type ThemeName } from "./themes";
import { PhoneExtrasCard } from "./v2-features";
import type { DnsMode, StealthMode } from "./types";

export function SettingsScreen({
  lang,
  setLang,
  theme,
  setTheme,
  pingLive,
  setPingLive,
  killSwitch,
  setKillSwitch,
  failover,
  setFailover,
  autoReconnect,
  setAutoReconnect,
  stealth,
  setStealth,
  dnsMode,
  setDnsMode,
  dnsCustom,
  setDnsCustom,
  onChaosKill,
  onChaosNet,
  onChaosQuota,
  onChaosExpiry,
  onOpenPrivacy,
  onReinstall,
  version,
  onBack,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  pingLive: boolean;
  setPingLive: (v: boolean) => void;
  killSwitch: boolean;
  setKillSwitch: (v: boolean) => void;
  failover: boolean;
  setFailover: (v: boolean) => void;
  autoReconnect: boolean;
  setAutoReconnect: (v: boolean) => void;
  stealth: StealthMode;
  setStealth: (m: StealthMode) => void;
  dnsMode: DnsMode;
  setDnsMode: (m: DnsMode) => void;
  dnsCustom: string;
  setDnsCustom: (v: string) => void;
  onChaosKill: () => void;
  onChaosNet: () => void;
  onChaosQuota: () => void;
  onChaosExpiry: () => void;
  onOpenPrivacy: () => void;
  onReinstall: () => void;
  /** نسخهٔ فعلی اپ — بعد از آپدیت OTA به‌روز می‌شه */
  version: string;
  onBack: () => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const Back = rtl ? ChevronRight : ChevronLeft;

  const protRows = [
    { t: t.killSwitch, d: t.killSwitchSub, v: killSwitch, set: setKillSwitch },
    { t: t.failover, d: t.failoverSub, v: failover, set: setFailover },
    { t: t.autoReconnect, d: t.autoReconnectSub, v: autoReconnect, set: setAutoReconnect },
  ];

  const chaosBtns = [
    { label: t.chaosKill, fn: onChaosKill },
    { label: t.chaosNet, fn: onChaosNet },
    { label: t.chaosQuota, fn: onChaosQuota },
    { label: t.chaosExpiry, fn: onChaosExpiry },
  ];

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="scroll-hide flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-2 pb-3">
      <button type="button" onClick={onBack} aria-label="Back" className="w-fit shrink-0 text-dim hover:text-ink">
        <Back className="size-6" />
      </button>
      <h2 className="mt-3 shrink-0 font-display text-2xl font-bold text-ink">{t.settings}</h2>

      {/* ── محافظت اتصال: Kill Switch / Failover / Auto-reconnect ── */}
      <div className="mt-4 rounded-2xl border border-panel-edge bg-panel p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-glow" />
          <span className="text-sm font-semibold text-ink">{t.connSection}</span>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {protRows.map(({ t: title, d, v, set }) => (
            <div key={title} className="flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">{title}</span>
                <span className="block text-xs leading-5 text-dim">{d}</span>
              </span>
              <Switch checked={v} onCheckedChange={set} aria-label={title} />
            </div>
          ))}
        </div>
      </div>

      {/* ── حالت ضد-فیلترینگ ── */}
      <div className="mt-3 rounded-2xl border border-panel-edge bg-panel p-4">
        <div className="text-sm font-semibold text-ink">{t.stealth}</div>
        <div className="mt-0.5 text-sm text-dim">{t.stealthSub}</div>
        <div className="mt-3 grid grid-cols-2 rounded-xl bg-night p-1">
          {([
            ["normal", t.stealthNormal],
            ["strict", t.stealthStrict],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setStealth(k)}
              aria-pressed={stealth === k}
              className={
                stealth === k
                  ? "rounded-lg bg-panel py-2 text-sm font-semibold text-ink"
                  : "rounded-lg py-2 text-sm text-dim"
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── DNS رمزنگاری‌شده ── */}
      <div className="mt-3 rounded-2xl border border-panel-edge bg-panel p-4">
        <div className="text-sm font-semibold text-ink">{t.dns}</div>
        <div className="mt-0.5 text-sm text-dim">{t.dnsSub}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {([
            ["auto", t.dnsAuto],
            ["cf", t.dnsCf],
            ["google", t.dnsGoogle],
            ["custom", t.dnsCustom],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setDnsMode(k)}
              aria-pressed={dnsMode === k}
              className={
                dnsMode === k
                  ? "rounded-xl border-2 border-glow bg-glow/10 py-2.5 text-sm font-bold text-ink"
                  : "rounded-xl border-2 border-transparent bg-night py-2.5 text-sm text-dim hover:text-ink"
              }
            >
              {label}
            </button>
          ))}
        </div>
        {dnsMode === "custom" && (
          <input
            dir="ltr"
            value={dnsCustom}
            onChange={(e) => setDnsCustom(e.target.value)}
            placeholder={t.dnsCustomHint}
            className="mt-2 w-full rounded-xl border border-panel-edge bg-night px-3 py-2.5 font-mono text-sm text-ink outline-none placeholder:text-dim focus:border-glow/40"
          />
        )}
      </div>

      <div className="mt-3 rounded-2xl border border-panel-edge bg-panel p-4">
        <div className="text-sm font-semibold text-ink">{t.language}</div>
        <div className="mt-3 grid grid-cols-2 rounded-xl bg-night p-1" dir="ltr">
          {(["en", "fa"] as const).map((l) => (
            <button
              type="button"
              key={l}
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={
                lang === l
                  ? "rounded-lg bg-panel py-2 text-sm font-semibold text-ink"
                  : "rounded-lg py-2 text-sm text-dim"
              }
            >
              {l === "en" ? "English" : "فارسی"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-panel-edge bg-panel p-4">
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-dim" />
          <span className="text-sm font-semibold text-ink">{t.theme}</span>
        </div>
        <div className="mt-1 text-sm text-dim">{t.themeSub}</div>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {THEME_ORDER.map((name) => {
            const th = THEMES[name];
            const active = theme === name;
            return (
              <button
                type="button"
                key={name}
                onClick={() => setTheme(name)}
                aria-pressed={active}
                aria-label={th.name[lang]}
                title={th.name[lang]}
                className={
                  active
                    ? "flex flex-col items-center gap-1.5 rounded-xl border-2 border-glow bg-night px-1 py-2"
                    : "flex flex-col items-center gap-1.5 rounded-xl border-2 border-transparent bg-night px-1 py-2 hover:border-panel-edge"
                }
              >
                <span className="relative size-8 overflow-hidden rounded-full ring-1 ring-ink/10" style={{ background: th.vars["--mb-night"] as string }}>
                  <span className="absolute inset-y-0 start-0 w-1/3" style={{ background: th.vars["--mb-glow"] as string }} />
                  <span className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: th.vars["--mb-panel"] as string }} />
                </span>
                <span className={`w-full truncate text-center text-[10px] leading-4 ${active ? "font-semibold text-ink" : "text-dim"}`}>
                  {th.name[lang]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-4">
        <Activity className="size-5 text-dim" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">{t.livePingSet}</span>
          <span className="block text-sm text-dim">{t.livePingSetDesc}</span>
        </span>
        <Switch checked={pingLive} onCheckedChange={setPingLive} aria-label={t.livePingSet} />
      </div>

      {/* ── قابلیت‌های گوشی: ویجت، کاشی QS، ربات تلگرام ── */}
      <PhoneExtrasCard lang={lang} />

      <a
        href={TG_SUPPORT}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-4 transition-colors hover:border-glow/40"
      >
        <Send className="size-5 text-dim" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">{t.support}</span>
          <span dir="ltr" className="block text-sm text-dim">
            {t.supportSub}
          </span>
        </span>
        {rtl ? <ChevronLeft className="size-5 text-dim" /> : <ChevronRight className="size-5 text-dim" />}
      </a>

      {/* ── حریم خصوصی و بدون لاگ ── */}
      <button
        type="button"
        onClick={onOpenPrivacy}
        className="mt-3 flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-4 text-start transition-colors hover:border-glow/40"
      >
        <ShieldCheck className="size-5 shrink-0 text-dim" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">{t.privacyRow}</span>
          <span className="block text-sm text-dim">{t.privacyRowSub}</span>
        </span>
        {rtl ? <ChevronLeft className="size-5 text-dim" /> : <ChevronRight className="size-5 text-dim" />}
      </button>

      <div className="mt-3 rounded-2xl border border-panel-edge bg-panel p-4">
        <div className="flex items-center gap-2">
          <Info className="size-4 text-dim" />
          <span className="text-sm font-semibold text-ink">{t.about}</span>
        </div>
        <div className="mt-2 text-sm text-dim" dir="ltr">
          {t.aboutLine.replace("{v}", version)}
        </div>
        <div className="mt-1 text-sm leading-6 text-dim">{t.noKey}</div>
      </div>

      {/* ── آزمایشگاه دمو: محافظت‌های واقعی را تحریک کن ── */}
      <div className="mt-3 rounded-2xl border border-glow/30 bg-glow/5 p-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-glow" />
          <span className="text-sm font-semibold text-ink">{t.chaosTitle}</span>
        </div>
        <div className="mt-0.5 text-sm text-dim">{t.chaosSub}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {chaosBtns.map(({ label, fn }) => (
            <button
              key={label}
              type="button"
              onClick={fn}
              className="rounded-xl border border-glow/30 bg-night px-2 py-2.5 text-xs font-semibold leading-5 text-ink transition-colors hover:border-glow/60"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onReinstall}
        className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-4 text-start transition-colors hover:bg-danger/20"
      >
        <Fingerprint className="size-5 shrink-0 text-danger" />
        <span className="flex-1">
          <span className="block text-sm font-bold text-danger">{t.reinstallSim}</span>
          <span className="block text-sm leading-5 text-dim">{t.reinstallSimSub}</span>
        </span>
      </button>
    </div>
  );
}
