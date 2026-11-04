"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BadgeCheck,
  Bell,
  CalendarClock,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cog,
  Copy,
  Crown,
  Fingerprint,
  Gauge,
  Gift,
  GitBranch,
  Globe,
  Infinity as InfinityIcon,
  Inbox,
  Info,
  KeyRound,
  LayoutGrid,
  Loader2,
  Lock,
  Mail,
  Play,
  Plus,
  Power,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Star,
  Ticket,
  Trash2,
  TriangleAlert,
  User,
  Users,
  Wallet as WalletIcon,
  X,
  Zap,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { COUNTRIES, ComboFlag, Flag } from "./flag";
import { TG_SUPPORT, tr, tpl, type Lang } from "./i18n";
import { SegmentedBar } from "./guardian-screen";
import { FREE_QUOTA_GB, TG_PROXY_FALLBACK, type ConfigItem, type Entitlement, type SortMode, type SpeedResult, type SplitState, type TgProxy, type UsageDay, type VpnState } from "./types";
import { FavStar, SpeedChip, UsageChart } from "./v2-features";

/** یک ردیف مصرف — اپ یا سرور. در اپ واقعی از TrafficStats/VpnService می‌آید. */
export type UsageRow = { label: string; mb: number; icon?: "tg" | "web" | "cam" | "play" | "sys"; flag?: string };

/* رنگ پینگ: سبز تا ۱۱۰ · نارنجی ۱۱۰ تا ۲۰۰ · قرمز بالای ۲۰۰ — مثل اپ واقعی */
export function pingTone(p: number): string {
  return p <= 110 ? "text-glow" : p <= 200 ? "text-gold" : "text-danger";
}

export function Bars({ ping }: { ping: number }) {
  const n = ping <= 70 ? 4 : ping <= 110 ? 3 : ping <= 200 ? 2 : 1;
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

/** Bilingual brand: mini app logo + big word + the other language underneath — v2.9.1 logo jadid. */
export function Brand({ lang }: { lang: Lang }) {
  return (
    <span className="flex items-center gap-2.5">
      <Image
        src="/logo-512.png"
        alt="Mianboor logo"
        width={40}
        height={40}
        priority
        className="size-10 shrink-0 rounded-xl shadow-[0_0_16px_-4px_var(--mb-glow)]"
      />
      <span className="flex flex-col leading-none">
        {lang === "en" ? (
          <>
            <span dir="ltr" className="font-display text-3xl font-extrabold tracking-wide text-ink">
              MIANBOOR
            </span>
            <span className="mt-1.5 text-sm font-bold text-dim">میانبر</span>
          </>
        ) : (
          <>
            <span className="text-3xl font-extrabold text-ink">میانبر</span>
            <span dir="ltr" className="mt-1.5 font-display text-sm font-bold tracking-wide text-dim">
              Mianboor
            </span>
          </>
        )}
      </span>
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
  unread,
  onOpenInbox,
  flashOrigin,
  showFlash,
  quotaWarnPct,
  expiryDays,
  onRenew,
  stealthOn,
  restarting,
  onToast,
  favServers,
  retryingId,
  onFavSelect,
  onFavRetry,
  tgActive,
  onTgStop,
  onTgConnect,
  /* v2.8: بنر نسخهٔ جدید — آپدیت کاملاً داخل اپ، بدون گیت‌هاب */
  updateTag,
  onUpdateClick,
  onDismissUpdate,
}: {
  lang: Lang;
  state: VpnState;
  onToggle: () => void;
  seconds: number;
  server: ConfigItem | null;
  warn?: string | null;
  onPickServer: () => void;
  /** تعداد پیام خوانده‌نشده صندوق — badge روی زنگ */
  unread?: number;
  onOpenInbox?: () => void;
  /** فلش لحظه اتصال: «از ایران به آلمان وصل شدی» — همیشه آی‌پی واقعی کاربر */
  flashOrigin?: { ip: string; country: string } | null;
  showFlash?: boolean;
  /** هشدار مصرف ۸۰٪ — درصد مصرف */
  quotaWarnPct?: number | null;
  /** هشدار انقضای پلن — روزهای باقی‌مانده */
  expiryDays?: number | null;
  onRenew?: () => void;
  /** حالت سخت‌گیر ضد-فیلترینگ روشنه؟ */
  stealthOn?: boolean;
  /** ری‌استارت لحظه‌ای تونل بعد از تعویض DNS — حین اتصال زنده */
  restarting?: boolean;
  /** نمایش توست دمو (برای پروکسی تلگرام) */
  onToast?: (msg: string) => void;
  /** سرورهای سنجاق‌شده کاربر — نوار «اضافه‌شده» بالای بنر */
  favServers?: ConfigItem[];
  /** کدام سرور در حال تلاش مجدد پینگ است */
  retryingId?: number | null;
  /** انتخاب سرور از نوار علاقه‌مندی‌ها */
  onFavSelect?: (id: number) => void;
  /** پینگ دوبارهٔ یک سرور */
  onFavRetry?: (id: number) => void;
  /** پروکسی تلگرام فعلاً وصله — نسخهٔ ۲٫۶: داخل خود اپ، مثل خود APK */
  tgActive?: { id: string; title: string } | null;
  /** قطع پروکسی تلگرام */
  onTgStop?: () => void;
  /** اتصال پروکسی تلگرام از داخل اپ (نسخهٔ ۲٫۶) — به بالا خبر می‌ده */
  onTgConnect?: (p: TgProxy) => void;
  /* v2.8: بنر نسخهٔ جدید — آپدیت کاملاً داخل اپ، بدون گیت‌هاب */
  updateTag?: string | null;
  onUpdateClick?: () => void;
  onDismissUpdate?: () => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const on = state === "on";
  const busy = state === "connecting";
  const blocked = state === "blocked";
  const label = blocked ? t.blockedTitle : on ? t.connected : busy ? t.connecting : t.notConnected;
  const Fwd = rtl ? ChevronLeft : ChevronRight;

  /* ── پروکسی تلگرام: شیت انتخاب پروکسی + اتصال نمایشی ── */
  const [tgOpen, setTgOpen] = useState(false);
  const [tgProxies, setTgProxies] = useState<TgProxy[]>(TG_PROXY_FALLBACK);
  const [tgBusyId, setTgBusyId] = useState<string | null>(null);
  const [tgDoneId, setTgDoneId] = useState<string | null>(null);

  useEffect(() => {
    if (!tgOpen) return;
    let dead = false;
    (async () => {
      let list: TgProxy[] = TG_PROXY_FALLBACK;
      try {
        /* اگر NEXT_PUBLIC_CLIENT_TOKEN تنظیم شده باشد لیست واقعی سرور را می‌گیرد؛
           وگرنه همان لیست دمو — با هر دو حالت کاملاً کار می‌کند. */
        const tk = (process.env.NEXT_PUBLIC_CLIENT_TOKEN ?? "").trim();
        const res = await fetch("/api/client/telegram/proxies" + (tk ? `?token=${encodeURIComponent(tk)}` : ""), {
          headers: { "x-demo-user": "demo-user" },
        });
        const j = res.ok ? await res.json().catch(() => null) : null;
        /* ok:false / demo:true / بدنهٔ نامعتبر → همون لیست دمو */
        if (j && j.demo !== true && j.ok === true && Array.isArray(j.proxies) && j.proxies.length > 0) {
          list = (j.proxies as Array<Partial<TgProxy> & { id: string }>).map((p) => ({
            id: String(p.id ?? `tp-${Math.random().toString(36).slice(2, 8)}`),
            title: String(p.title ?? "پروکسی تلگرام"),
            server: String(p.server ?? ""),
            port: Number(p.port ?? 0),
            kind: p.kind === "socks" ? "socks" : "mtproto",
            secret: (p.secret as string | null) ?? null,
            country: String(p.country ?? "gift") || "gift",
            /* سرور پینگ نمی‌فرستد — پینگ نمایشی زندهٔ دمو */
            ping: typeof p.ping === "number" && p.ping > 0 ? p.ping : 40 + Math.floor(Math.random() * 260),
          })) as TgProxy[];
        }
      } catch {
        /* شبکه در دسترس نیست → fallback */
      }
      if (!dead) setTgProxies(list);
      /* نسخهٔ ۲٫۶: پینگ واقعی TCP — عین TgProxyManager.measureAll خود APK؛
         همهٔ اهداف همزمان، نامرئی‌ها 999 و ته لیست. شکست → پینگ نمایشی می‌ماند. */
      try {
        const pingRes = await fetch("/api/client/telegram/ping", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            targets: list.slice(0, 12).map((p) => ({ id: p.id, host: p.server, port: p.port })),
          }),
        });
        const pj = pingRes.ok ? await pingRes.json().catch(() => null) : null;
        if (!dead && pj && pj.ok === true && pj.pings && typeof pj.pings === "object") {
          setTgProxies((prev) =>
            prev.map((p) => {
              const ms = (pj.pings as Record<string, number>)[p.id];
              return typeof ms === "number" && ms > 0 ? { ...p, ping: ms } : p;
            }),
          );
        }
      } catch {
        /* پینگ واقعی نشد — نمایشی می‌ماند */
      }
    })();
    return () => {
      dead = true;
    };
  }, [tgOpen]);

  const tgConnect = (p: TgProxy) => {
    if (tgBusyId || tgDoneId === p.id) return;
    setTgBusyId(p.id);
    setTimeout(() => {
      setTgBusyId(null);
      setTgDoneId(p.id);
      onTgConnect?.(p);
      onToast?.(t.tgProxyAdded);
    }, 1200);
  };

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="flex flex-1 flex-col overflow-y-auto scroll-hide px-6 pt-2">
      {/* v2.8: بنر نسخهٔ جدید — دانلود و نصب کامل داخل خود اپ */}
      {updateTag && (
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/20 text-gold">
            <Crown className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-ink">{t.updateTitle}</div>
            <div className="mt-0.5 truncate text-xs text-dim">{t.updateSub.replace("{v}", updateTag)}</div>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-1">
            <button
              type="button"
              onClick={onUpdateClick}
              className="rounded-full bg-gold px-3.5 py-1.5 text-xs font-bold text-night transition hover:brightness-110 active:scale-95"
            >
              {t.updateBtn}
            </button>
            <button
              type="button"
              onClick={onDismissUpdate}
              className="text-[11px] text-dim hover:text-ink"
            >
              {t.updateLater}
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
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
            blocked
              ? "relative grid size-44 place-items-center rounded-full border-4 border-danger bg-night shadow-[0_0_40px_var(--mb-danger)] transition-all"
              : on
                ? restarting
                  ? "spin-ring relative grid size-44 place-items-center rounded-full border-4 border-glow/30 border-t-glow bg-night transition-all"
                  : "relative grid size-44 place-items-center rounded-full border-4 border-glow bg-night shadow-[0_0_40px_var(--mb-glow)] transition-all"
                : busy
                  ? "spin-ring relative grid size-44 place-items-center rounded-full border-4 border-glow/30 border-t-glow bg-night transition-all"
                  : "relative grid size-44 place-items-center rounded-full border-4 border-panel-edge bg-night transition-all hover:border-glow/50"
          }
        >
          <span className={busy ? "unspin grid size-32 place-items-center rounded-full bg-panel" : "grid size-32 place-items-center rounded-full bg-panel"}>
            <Power className={blocked ? "size-12 text-danger" : on ? "size-12 text-glow" : "size-12 text-dim"} strokeWidth={2.4} />
          </span>
        </button>
      </div>

      <div className="mt-4 text-center">
        <div className={blocked ? "font-display text-2xl font-bold text-danger" : on ? "font-display text-2xl font-bold text-glow" : "font-display text-2xl font-bold text-ink"}>{label}</div>
        <div className="mt-1 font-display text-base tabular-nums text-dim">
          {blocked ? t.blockedSub : on ? (restarting ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-4 animate-spin" /> {t.tunnelRestarting}
            </span>
          ) : (
            fmt(seconds)
          )) : t.tapProtect}
        </div>
        {stealthOn && on && (
          <div className="mx-auto mt-2 flex w-fit items-center gap-1.5 rounded-full border border-glow/40 bg-glow/10 px-3 py-1 text-xs font-semibold text-glow">
            <ShieldAlert className="size-3.5" /> {t.stealthBadge}
          </div>
        )}
        {showFlash && on && server && (
          <div className="flash-in mx-auto mt-2 flex max-w-[300px] items-center justify-center gap-2 rounded-full border border-glow/40 bg-glow/10 px-3 py-1.5">
            <Flag code={flashOrigin?.country ?? "ir"} size={18} />
            <span className="truncate text-xs font-semibold text-ink">
              {t.connectFlash
                .replace("{from}", COUNTRIES[flashOrigin?.country ?? "ir"] ?? flashOrigin?.country ?? "—")
                .replace("{to}", COUNTRIES[server.country] ?? server.country)}
            </span>
            <span className="text-xs text-dim">→</span>
            <Flag code={server.country} size={18} />
          </div>
        )}
        {warn && !on && !blocked && (
          <div className="mx-auto mt-2 flex max-w-[280px] items-center justify-center gap-1.5 rounded-full border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger">
            <ShieldAlert className="size-3.5 shrink-0" /> {warn}
          </div>
        )}
      </div>

      {/* ── هشدارهای خانه: مصرف ۸۰٪ و انقضای پلن — با دکمهٔ اقدام ── */}
      {(quotaWarnPct != null || expiryDays != null) && (
        <div className="mt-3 flex flex-col gap-2">
          {quotaWarnPct != null && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-gold/40 bg-gold/10 px-3 py-2.5">
              <TriangleAlert className="size-4 shrink-0 text-gold" />
              <span className="min-w-0 flex-1 text-xs font-medium leading-5 text-ink">
                {t.quotaWarn.replace("{p}", String(quotaWarnPct))}
              </span>
              {onRenew && (
                <button type="button" onClick={onRenew} className="shrink-0 rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-night">
                  {t.quotaWarnCta}
                </button>
              )}
            </div>
          )}
          {expiryDays != null && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-gold/40 bg-gold/10 px-3 py-2.5">
              <CalendarClock className="size-4 shrink-0 text-gold" />
              <span className="min-w-0 flex-1 text-xs font-medium leading-5 text-ink">
                {t.expiryWarn.replace("{d}", String(expiryDays))}
              </span>
              {onRenew && (
                <button type="button" onClick={onRenew} className="shrink-0 rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-night">
                  {t.expiryWarnCta}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── زیر دکمهٔ اتصال اصلی: «پروکسی تلگرام» —
            افکت شیشه‌ای رفلکس نور هر ۵ ثانیه روی دکمهٔ تلگرام ── */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setTgOpen(true)}
          className="tg-shine relative flex items-center gap-2 overflow-hidden rounded-full border border-gold/40 bg-gold/10 px-3.5 py-2.5 text-[13px] font-semibold text-gold transition-colors hover:border-gold/70"
        >
          <Send className="size-4" />
          {t.tgProxy}
          {tgActive && <span className="size-2 rounded-full bg-glow breathe" aria-hidden="true" />}
        </button>
      </div>

      {/* ── نسخهٔ ۲٫۶: پروکسی تلگرام از داخل اپ وصله — بنر حالت تلگرام ── */}
      {tgActive && (
        <div
          role="status"
          className="mt-3 flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-3"
        >
          <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-gold/15">
            <Send className="size-5 text-gold" />
            <span className="pulse-ring absolute size-10 rounded-full border border-gold/60" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-ink">{t.tgActiveTitle}</span>
            <span className="mt-0.5 block truncate text-xs leading-4 text-dim">
              {tgActive.title} · {t.tgActiveSub}
            </span>
          </span>
          {onTgStop && (
            <button
              type="button"
              onClick={onTgStop}
              aria-label={t.tgStop}
              className="shrink-0 rounded-full border border-panel-edge bg-night px-3 py-1.5 text-xs font-bold text-dim transition-colors hover:border-gold/50 hover:text-ink"
            >
              {t.tgStop}
            </button>
          )}
        </div>
      )}

      {/* ── بنر سرور فعلی — پرچم ترکیبی (مقصد + ایران) + تاخیر + تلاش مجدد ── */}
      <button
        type="button"
        onClick={onPickServer}
        className={
          on
            ? "mt-4 flex w-full items-center gap-3 rounded-2xl border border-glow/40 bg-panel p-4 text-start transition-colors hover:border-glow/70"
            : "mt-4 flex w-full items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-4 text-start transition-colors hover:border-glow/40"
        }
      >
        {server ? <ComboFlag code={server.country} size={46} /> : <span className="size-11 rounded-full bg-ink/10" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-bold text-ink" dir="ltr" style={{ textAlign: rtl ? "right" : "left" }}>{server ? server.name : t.noMatch}</span>
          {server && (
            <span className="mt-1 flex items-center gap-1.5 text-sm text-dim">
              <Bars ping={server.ping} />
              <span className="tabular-nums">
                {t.delay} {server.ping}
              </span>
            </span>
          )}
        </span>
        {/* تلاش مجدد پینگ سرور فعلی */}
        {server && onFavRetry && (
          <span
            role="button"
            tabIndex={0}
            aria-label={t.retry}
            title={t.retry}
            onClick={(e) => {
              e.stopPropagation();
              onFavRetry(server.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                onFavRetry(server.id);
              }
            }}
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-panel-edge bg-night text-dim hover:text-glow"
          >
            {retryingId === server.id ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
          </span>
        )}
        <Fwd className="size-5 shrink-0 text-dim" />
      </button>

      {/* ── نوار «اضافه‌شده» — سرورهای سنجاق‌شده با پینگ و تلاش مجدد ── */}
      {favServers && favServers.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-semibold text-ink">{t.favSection}</div>
          <div className="scroll-hide mt-2 flex gap-2 overflow-x-auto pb-1">
            {favServers.map((f) => {
              const sel = server?.id === f.id;
              return (
                <div
                  key={f.id}
                  className={
                    sel
                      ? "flex w-[108px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-glow/50 bg-panel p-3"
                      : "flex w-[108px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-panel-edge bg-panel p-3"
                  }
                >
                  <button type="button" onClick={() => onFavSelect?.(f.id)} aria-label={f.name} className="flex flex-col items-center gap-1.5">
                    <Flag code={f.country} size={34} />
                    <span className="flex items-center gap-1 text-xs tabular-nums text-dim">
                      <Bars ping={f.ping} /> {f.ping}
                    </span>
                  </button>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onFavSelect?.(f.id)}
                      aria-label={t.selectLocation}
                      title={t.selectLocation}
                      className="grid size-6 place-items-center rounded-md bg-night text-glow"
                    >
                      <Check className="size-3.5" strokeWidth={3} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onFavRetry?.(f.id)}
                      aria-label={t.retry}
                      title={t.retry}
                      className="grid size-6 place-items-center rounded-md bg-night text-dim hover:text-glow"
                    >
                      {retryingId === f.id ? <Loader2 className="size-3 animate-spin" /> : <RotateCcw className="size-3" />}
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 border-t border-dashed border-panel-edge" />
        </div>
      )}

      {/* دانلود و آپلود کنار هم */}
      <div className="mt-3 grid grid-cols-2 items-stretch gap-2">
        <div className="rounded-2xl border border-panel-edge bg-panel p-3">
          <div className="flex items-center gap-1.5 text-sm text-dim">
            <ArrowDown className="size-4 text-glow" /> {t.download}
          </div>
          <div className="mt-1.5 whitespace-nowrap font-display text-lg font-bold text-ink tabular-nums">
            {on ? "1.42 GB" : "0 B"}
          </div>
        </div>
        <div className="rounded-2xl border border-panel-edge bg-panel p-3">
          <div className="flex items-center gap-1.5 text-sm text-dim">
            <ArrowUp className="size-4 text-up" /> {t.upload}
          </div>
          <div className="mt-1.5 whitespace-nowrap font-display text-lg font-bold text-ink tabular-nums">
            {on ? "312 MB" : "0 B"}
          </div>
        </div>
      </div>

      {/* ── شیت پروکسی‌های تلگرام ── */}
      {tgOpen && (
        <div
          className="absolute inset-0 z-20 flex flex-col justify-end bg-night/70 backdrop-blur-sm"
          onClick={() => setTgOpen(false)}
          role="presentation"
        >
          <div
            dir={rtl ? "rtl" : "ltr"}
            className="sheet-in flex max-h-[85%] flex-col rounded-t-3xl border-t border-glow/30 bg-panel px-5 pt-4 pb-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={t.tgProxiesTitle}
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
                <Send className="size-5 text-glow" /> {t.tgProxiesTitle}
              </h3>
              <button type="button" onClick={() => setTgOpen(false)} aria-label="Close" className="grid size-8 place-items-center rounded-full text-dim hover:text-ink">
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-0.5 text-sm text-dim">{t.tgProxiesSub}</div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-gold/80">
              <Loader2 className="size-3 animate-spin" aria-hidden="true" /> {t.tgPingReal}
            </div>

            {/* همیشه مرتب: سریع‌ترین بالای لیست (سورت صعودی بر اساس پینگ، مرده‌ها ته) */}
            <div className="scroll-hide mt-3 flex max-h-96 min-h-0 flex-col gap-2 overflow-y-auto">
              {[...tgProxies].sort((a, b) => a.ping - b.ping).map((p) => {
                const fastest = p.ping === Math.min(...tgProxies.map((x) => x.ping));
                const isActive = tgActive?.id === p.id;
                const isDone = isActive || tgDoneId === p.id;
                const isBusy = tgBusyId === p.id;
                const gift = !p.country || p.country === "gift";
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => tgConnect(p)}
                    disabled={isBusy || isDone}
                    aria-label={p.title}
                    className={
                      isDone
                        ? "flex items-center gap-3 rounded-xl border border-glow/40 bg-glow/10 px-3 py-3 text-start"
                        : "flex items-center gap-3 rounded-xl border border-panel-edge bg-night px-3 py-3 text-start transition-colors hover:border-glow/40 disabled:opacity-80"
                    }
                  >
                    {/* پرچم طلایی هدیه برای پروکسی‌های بی‌لوکیشن — عین کانفیگ‌ها */}
                    <span className="relative shrink-0">
                      <Flag code={gift ? "gift" : p.country} size={28} />
                      {gift && <span className="absolute -bottom-1.5 -end-1.5 text-[11px] leading-none">🎁</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="block truncate text-sm font-semibold text-ink">{p.title}</span>
                        {gift && <span className="shrink-0 text-[11px] text-gold">🎁</span>}
                        {fastest && !isDone && (
                          <span className="shrink-0 rounded-full bg-glow/15 px-1.5 py-0.5 text-[10px] font-bold text-glow">{t.tgFastest}</span>
                        )}
                      </span>
                      <span dir="ltr" className="block truncate font-mono text-xs text-dim">
                        {p.server}:{p.port}
                      </span>
                    </span>
                    {isBusy ? (
                      <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-glow">
                        <Loader2 className="size-3.5 animate-spin" /> {t.connecting}
                      </span>
                    ) : isDone ? (
                      <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-glow">
                        <Check className="size-3.5" strokeWidth={3} /> {t.connected} ✓
                      </span>
                    ) : (
                      <span className={`w-12 shrink-0 text-end text-sm tabular-nums ${pingTone(p.ping)}`}>{p.ping} ms</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-xl border border-panel-edge bg-night px-3 py-2.5">
              <Info className="mt-0.5 size-4 shrink-0 text-dim" />
              <span className="text-xs leading-5 text-dim">{t.tgProxyNote}</span>
            </div>
          </div>
        </div>
      )}
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
  favorites,
  speedResults,
  onRefresh,
  onSelect,
  onToggleFav,
  onSpeedTest,
  onImport,
  onPremiumTap,
  onBack,
  sort,
  setSort,
  groupByCountry,
  onToast,
}: {
  lang: Lang;
  configs: ConfigItem[];
  selectedId: number | null;
  premiumUser: boolean;
  syncing: boolean;
  syncOk: boolean | null;
  /** سرورهای سنجاق‌شده بالای لیست */
  favorites: number[];
  /** نتیجهٔ اسپیدتست‌های انجام‌شده */
  speedResults: Record<number, SpeedResult>;
  onRefresh: () => void;
  onSelect: (id: number) => void;
  onToggleFav: (id: number) => void;
  onSpeedTest: () => void;
  onImport: () => void;
  onPremiumTap: () => void;
  onBack: () => void;
  /** مرتب‌سازی: کمترین پینگ یا الفبا */
  sort: SortMode;
  setSort: (m: SortMode) => void;
  /** دسته‌بندی سرورها بر اساس کشور (تنظیمات) */
  groupByCountry: boolean;
  onToast?: (m: string) => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const Back = rtl ? ChevronRight : ChevronLeft;
  const Fwd = rtl ? ChevronLeft : ChevronRight;
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "free" | "premium">("all");
  const [sortOpen, setSortOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const enabled = configs.filter((c) => c.enabled);
  const freeEnabled = enabled.filter((c) => !c.premium);
  const premEnabled = enabled.filter((c) => c.premium);
  const tabbed = tab === "free" ? freeEnabled : tab === "premium" ? premEnabled : enabled;
  const base = tabbed.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  /* سنجاق‌شده‌ها اول، بعد مرتب‌سازی انتخابی */
  const sorted = (arr: ConfigItem[]) =>
    sort === "az"
      ? [...arr].sort((a, b) => a.name.localeCompare(b.name))
      : [...arr].sort((a, b) => a.ping - b.ping);
  const list = [
    ...sorted(base.filter((c) => favorites.includes(c.id))),
    ...sorted(base.filter((c) => !favorites.includes(c.id))),
  ];
  /* گروه‌بندی کشوری: پرچم و نام هر کشور به‌عنوان سرفصل */
  const groups: Array<{ country: string; items: ConfigItem[] }> = [];
  if (groupByCountry) {
    const seen = new Map<string, ConfigItem[]>();
    for (const c of list) {
      const arr = seen.get(c.country) ?? [];
      arr.push(c);
      seen.set(c.country, arr);
    }
    for (const [country, items] of seen) groups.push({ country, items });
  }
  // Smart Connect really measures: lowest live ping among the servers this user can join.
  const pool = premiumUser ? enabled : freeEnabled.length ? freeEnabled : enabled;
  const best = [...pool].sort((a, b) => a.ping - b.ping)[0];

  /* نمونه‌های هر سرور — مثلا nl1/nl2/nl3 با پینگ و بار متفاوت (قطعی و بدون رندر شومیز) */
  const instancesOf = (c: ConfigItem) =>
    [1, 2, 3].map((i) => {
      const seg = c.host.split(".");
      seg[0] = (seg[0].replace(/\d+$/, "") || seg[0]) + i;
      const host = seg.join(".");
      const ping = Math.max(9, c.ping + (((c.id * 13 + i * 29) % 26) - 6));
      const load = 18 + ((c.id * 17 + i * 41) % 72);
      return { host, ping, load, i };
    });

  const renderRow = (c: ConfigItem) => {
    const sel = c.id === selectedId;
    const locked = c.premium && !premiumUser;
    const isBest = best?.id === c.id;
    const fav = favorites.includes(c.id);
    const spd = speedResults[c.id];
    const open = expanded === c.id;
    return (
      <div key={c.id} className="flex flex-col">
        <div
          role="button"
          tabIndex={0}
          onClick={() => (locked ? onPremiumTap() : onSelect(c.id))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (locked) onPremiumTap();
              else onSelect(c.id);
            }
          }}
          aria-label={`${c.name}${locked ? " (premium)" : ""}`}
          title={c.country === "gift" ? t.giftCfg : undefined}
          className={
            locked
              ? "flex cursor-pointer items-center gap-3 rounded-xl border border-panel-edge bg-panel/60 px-3 py-3 text-start opacity-75"
              : sel
                ? "flex cursor-pointer items-center gap-3 rounded-xl border border-glow/40 bg-panel px-3 py-3 text-start"
                : "flex cursor-pointer items-center gap-3 rounded-xl border border-panel-edge bg-panel px-3 py-3 text-start hover:border-ink/20"
          }
        >
          <Flag code={c.country} size={32} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              {fav && <Star className="size-3 shrink-0 fill-gold text-gold" />}
              <span className="block truncate text-sm font-semibold text-ink" dir="ltr" style={{ textAlign: rtl ? "right" : "left" }}>{c.name}</span>
              {c.premium && (
                <span className="shrink-0 rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-black uppercase text-gold" title={t.unlimited}>
                  VIP
                </span>
              )}
              {c.premium && <InfinityIcon className="size-3.5 shrink-0 text-gold" aria-label={t.unlimited} />}
            </span>
            <span className="block truncate text-sm text-dim">
              {locked ? t.premiumLockSub : c.country === "gift" ? t.giftCfg : c.protocol}
            </span>
          </span>
          {spd && <SpeedChip lang={lang} r={spd} />}
          <span className={`w-12 shrink-0 text-end text-sm tabular-nums ${pingTone(c.ping)}`}>{c.ping} ms</span>
          {isBest && !locked && (
            <span className="shrink-0 rounded-full bg-glow/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-glow">
              {t.best}
            </span>
          )}
          {!locked && <FavStar active={fav} onClick={() => onToggleFav(c.id)} label={fav ? t.starRemove : t.starAdd} />}
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
          {/* باز/بستن نمونه‌های سرور */}
          <button
            type="button"
            aria-label={t.instances}
            aria-expanded={open}
            title={t.instances}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(open ? null : c.id);
            }}
            className="grid size-6 shrink-0 place-items-center rounded-md text-dim hover:text-glow"
          >
            <ChevronDown className={open ? "size-4 transition-transform rotate-180" : "size-4 transition-transform"} />
          </button>
        </div>

        {/* نمونه‌ها — با بار سرور و اتصال مستقیم */}
        {open && !locked && (
          <div className="screen-in mx-1 mt-1 flex flex-col gap-1.5 rounded-xl border border-panel-edge bg-night/60 p-2">
            {instancesOf(c).map((ins) => (
              <button
                key={ins.host}
                type="button"
                onClick={() => {
                  onSelect(c.id);
                  onToast?.(t.instConnected.replace("{h}", ins.host));
                }}
                className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-start transition-colors hover:bg-panel"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-panel text-[10px] font-bold text-glow">{ins.i}</span>
                <span className="min-w-0 flex-1">
                  <span dir="ltr" className="block truncate font-mono text-xs text-ink">{ins.host}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="h-1 w-16 overflow-hidden rounded-full bg-ink/10">
                      <span className="block h-full rounded-full bg-glow" style={{ width: `${ins.load}%` }} />
                    </span>
                    <span className="text-[10px] text-dim">{ins.load}%</span>
                  </span>
                </span>
                <span className={`w-12 shrink-0 text-end text-xs tabular-nums ${pingTone(ins.ping)}`}>{ins.ping} ms</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="flex min-h-0 flex-1 flex-col px-5 pt-2">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label="Back" className="w-fit text-dim hover:text-ink">
          <Back className="size-6" />
        </button>
        <h2 className="flex-1 truncate font-display text-2xl font-bold text-ink">{t.selectLocation}</h2>
        {/* اسپیدتست سرور انتخاب‌شده */}
        <button
          type="button"
          onClick={onSpeedTest}
          disabled={!configs.find((c) => c.id === selectedId)}
          aria-label={t.speedTest}
          title={t.speedTest}
          className="grid size-9 shrink-0 place-items-center rounded-xl border border-panel-edge bg-panel text-glow hover:border-glow/40 disabled:opacity-50"
        >
          <Gauge className="size-4" />
        </button>
        {/* ورود کانفیگ شخصی */}
        <button
          type="button"
          onClick={onImport}
          aria-label={t.importTitle}
          title={t.importTitle}
          className="grid size-9 shrink-0 place-items-center rounded-xl border border-panel-edge bg-panel text-glow hover:border-glow/40"
        >
          <Plus className="size-4" />
        </button>
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
      <div className="mt-3 flex items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-panel-edge bg-panel px-4 py-3">
          <Search className="size-4 text-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.search}
            aria-label={t.search}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-dim"
          />
        </label>
        {/* مرتب‌سازی: کمترین پینگ / A-Z — منوی بازشو مثل اپ‌های مدرن */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setSortOpen((o) => !o)}
            aria-label={t.sortTip}
            aria-expanded={sortOpen}
            title={t.sortTip}
            className="grid size-11 place-items-center rounded-xl border border-panel-edge bg-panel text-dim hover:text-glow"
          >
            <ArrowUpDown className="size-4" />
          </button>
          {sortOpen && (
            <div className="absolute end-0 top-12 z-20 w-44 rounded-2xl border border-panel-edge bg-panel p-1 shadow-xl">
              {([
                ["ping", t.sortPing],
                ["az", t.sortAz],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setSort(k);
                    setSortOpen(false);
                  }}
                  aria-pressed={sort === k}
                  className={
                    sort === k
                      ? "flex w-full items-center justify-between rounded-xl bg-glow/15 px-3 py-2.5 text-sm font-bold text-glow"
                      : "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-ink hover:bg-night"
                  }
                >
                  {label}
                  {sort === k && <Check className="size-4" strokeWidth={3} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* ── تب همه / رایگان / پرمیوم — سه تب کنار هم ── */}
      <div className="mt-2 grid grid-cols-3 gap-0 rounded-xl border border-panel-edge bg-panel p-0">
        {([
          ["all", t.tabAll, enabled.length],
          ["free", t.tabFree, freeEnabled.length],
          ["premium", t.tabPremium, premEnabled.length],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm transition-colors ${
              tab === key ? "bg-glow/15 font-bold text-glow" : "font-medium text-dim hover:text-ink"
            }`}
          >
            {label}
            <span className={tab === key ? "text-xs opacity-70" : "text-xs opacity-60"}>{count}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => best && onSelect(best.id)}
        aria-label={t.smart}
        className="mt-3 flex items-center gap-3 rounded-xl border border-glow/30 bg-glow/10 px-4 py-3.5 text-start"
      >
        <Zap className="size-7 shrink-0 fill-glow text-glow" />
        <span className="flex-1 text-sm font-semibold text-ink">{t.smart}</span>
        {best && <span className="shrink-0 text-sm tabular-nums text-dim">{best.ping} ms</span>}
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
      <div
        className="scroll-hide mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-3"
        onClick={() => sortOpen && setSortOpen(false)}
      >
        {groupByCountry
          ? groups.map((g) => (
              <div key={g.country} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-1 pt-1.5 text-xs font-bold uppercase tracking-wide text-dim">
                  <Flag code={g.country} size={18} />
                  {COUNTRIES[g.country] ?? g.country}
                  <span className="opacity-60">· {g.items.length}</span>
                </div>
                {g.items.map((c) => renderRow(c))}
              </div>
            ))
          : list.map((c) => renderRow(c))}
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
  killSwitch,
  setKillSwitch,
  failover,
  setFailover,
  autoReconnect,
  setAutoReconnect,
  onOpenSplit,
  onUpgrade,
  onCopyDevice,
  onOpenUsage,
  onOpenInvite,
  onOpenSupport,
  onOpenInbox,
  onOpenWallet,
  onOpenDevices,
  onOpenPrivacy,
  server,
  giftDays,
  onOpenServers,
  onSetPass,
  onDeleteAcc,
  vpnOn,
}: {
  lang: Lang;
  entitlement: Entitlement;
  trialLocked: boolean;
  usedGb: number;
  split: SplitState;
  deviceId: string;
  unread?: number;
  /** کلید قطع اضطراری و محافظت‌های اتصال — از تنظیمات سراسری می‌آید */
  killSwitch: boolean;
  setKillSwitch: (v: boolean) => void;
  failover: boolean;
  setFailover: (v: boolean) => void;
  autoReconnect: boolean;
  setAutoReconnect: (v: boolean) => void;
  onOpenSplit: () => void;
  onUpgrade: () => void;
  onCopyDevice: () => void;
  onOpenUsage: () => void;
  onOpenInvite: () => void;
  onOpenSupport: () => void;
  onOpenInbox: () => void;
  onOpenWallet: () => void;
  onOpenDevices: () => void;
  onOpenPrivacy: () => void;
  /** سرور فعلی برای کارت «سرور فعلی» */
  server: ConfigItem | null;
  /** روزهای هدیهٔ فعال — ستون «داده VIP» */
  giftDays: number;
  /** نمایش همه سرویس‌ها — پرش به لیست سرورها */
  onOpenServers: () => void;
  /** تعیین گذرواژه */
  onSetPass: () => void;
  /** حذف حساب کاربری */
  onDeleteAcc: () => void;
  /** تونل الان وصله؟ — badge کارت سرور فعلی */
  vpnOn: boolean;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const Fwd = rtl ? ChevronLeft : ChevronRight;
  const [renewOpen, setRenewOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const premium = entitlement.plan !== "free";
  const pct = premium ? 1 : trialLocked ? 1 : usedGb / FREE_QUOTA_GB;
  /* درصد باقی‌ماندهٔ ظرفیت — نوار سگمنتی سرور فعلی */
  const remainPct = premium ? 1 : trialLocked ? 0 : Math.max(0, 1 - usedGb / FREE_QUOTA_GB);
  const vipDataGb = (giftDays * 0.25).toFixed(1);
  const creditDays = entitlement.expiresAt ? Math.max(0, Math.ceil((entitlement.expiresAt - Date.now()) / 86400_000)) : giftDays;
  const usedStr = premium ? "∞" : `${usedGb.toFixed(1)}`;
  const totalStr = premium ? t.unlimited : `${FREE_QUOTA_GB} GB`;
  const until = entitlement.expiresAt
    ? new Date(entitlement.expiresAt).toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";
  const daysLeft = entitlement.expiresAt ? Math.max(0, Math.ceil((entitlement.expiresAt - Date.now()) / 86400_000)) : null;
  const splitN = split.apps.length;
  const splitSub =
    splitN === 0
      ? t.splitSubOff
      : tpl2(t.splitSubOn, splitN, split.mode === "exclude" ? t.modeExcl : t.modeIncl);

  const rows = [
    { icon: ShieldCheck, t: t.killSwitch, d: t.killSwitchSub, v: killSwitch, set: setKillSwitch },
    { icon: ShieldAlert, t: t.failover, d: t.failoverSub, v: failover, set: setFailover },
    { icon: WifiIcon, t: t.autoReconnect, d: t.autoReconnectSub, v: autoReconnect, set: setAutoReconnect },
  ];

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="scroll-hide flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pt-2 pb-3"
    >
      <h2 className="font-display text-2xl font-bold text-ink">{t.account}</h2>

      {/* ── ایمیل + وضعیت تایید + حذف حساب / تعیین گذرواژه ── */}
      <div className="rounded-2xl border border-panel-edge bg-panel p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink/10">
            <Mail className="size-5 text-ink" />
          </span>
          <span className="min-w-0 flex-1">
            <span dir="ltr" className="block truncate text-start text-sm font-semibold text-ink">mroidad@gmail.com</span>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-glow/15 px-2 py-0.5 text-[11px] font-bold text-glow">
              <BadgeCheck className="size-3.5" /> {t.verified}
            </span>
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onSetPass}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-panel-edge bg-night py-2.5 text-xs font-semibold text-ink transition-colors hover:border-glow/40"
          >
            <KeyRound className="size-3.5 text-dim" /> {t.setPass}
          </button>
          <button
            type="button"
            onClick={onDeleteAcc}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-danger/30 bg-danger/10 py-2.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/20"
          >
            <Trash2 className="size-3.5" /> {t.deleteAcc}
          </button>
        </div>
      </div>

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
            {daysLeft != null && daysLeft <= 3 && (
              <span className="mt-1 flex items-center gap-1.5 text-sm font-bold text-danger">
                <CalendarClock className="size-4 shrink-0" /> {t.planEndsDays.replace("{d}", String(daysLeft))}
              </span>
            )}
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

      {/* ── سرور فعلی — نوار سگمنتی + آمار ۲×۲ + همهٔ سرویس‌ها/گزینه‌های بیشتر ── */}
      <div className="rounded-3xl border border-panel-edge bg-panel p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-bold text-ink">{t.svCurrent}</div>
            <div className="mt-0.5 truncate text-xs text-dim">{server ? server.host : "—"}</div>
          </div>
          <span className="shrink-0 rounded-full bg-glow/15 px-2.5 py-1 text-[11px] font-bold text-glow">{vpnOn ? "● " + t.connected : t.svCurrent}</span>
        </div>
        <div className="mt-3 text-end font-display text-3xl font-black tabular-nums text-ink">{Math.round(remainPct * 100)}%</div>
        <div className="mt-2">
          <SegmentedBar pct={remainPct} bars={22} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-panel-edge bg-night px-3 py-2.5 text-center">
            <div className="text-sm font-bold tabular-nums text-ink">{usedStr} GB {lang === "fa" ? "از" : "of"} {totalStr === t.unlimited ? "∞" : totalStr}</div>
            <div className="mt-0.5 text-[11px] text-dim">{t.dataUsage}</div>
          </div>
          <div className="rounded-2xl border border-panel-edge bg-night px-3 py-2.5 text-center">
            <div className="text-sm font-bold tabular-nums text-ink">{vipDataGb} GB</div>
            <div className="mt-0.5 text-[11px] text-dim">{t.vipData}</div>
          </div>
          <div className="rounded-2xl border border-panel-edge bg-night px-3 py-2.5 text-center">
            <div className="text-sm font-bold tabular-nums text-ink">2 {t.users}</div>
            <div className="mt-0.5 text-[11px] text-dim">{t.usersOnline}</div>
          </div>
          <div className="rounded-2xl border border-panel-edge bg-night px-3 py-2.5 text-center">
            <div className="text-sm font-bold tabular-nums text-ink">{creditDays} {t.days}</div>
            <div className="mt-0.5 text-[11px] text-dim">{t.credit}</div>
          </div>
        </div>
        <div className="my-4 border-t border-dashed border-panel-edge" />
        <button
          type="button"
          onClick={onOpenServers}
          className="flex w-full items-center gap-3 rounded-2xl border border-panel-edge bg-night px-4 py-3.5 text-start transition-colors hover:border-glow/40"
        >
          <Ticket className="size-5 shrink-0 text-dim" />
          <span className="flex-1 text-sm font-semibold text-ink">{t.allServices}</span>
          <Fwd className="size-5 shrink-0 text-dim" />
        </button>
        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          aria-expanded={moreOpen}
          className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-panel-edge bg-night px-4 py-3.5 text-start transition-colors hover:border-glow/40"
        >
          <LayoutGrid className="size-5 shrink-0 text-dim" />
          <span className="flex-1 text-sm font-semibold text-ink">{moreOpen ? t.lessOptions : t.moreOptions}</span>
          {moreOpen ? <X className="size-5 shrink-0 text-dim" /> : <Fwd className="size-5 shrink-0 text-dim" />}
        </button>
      </div>

      {/* ── تقسیم تونل — همیشه قابل‌مشاهده (قابلیت اصلی) ── */}
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

      {/* ── گزینه‌های بیشتر — بقیهٔ سرویس‌ها پس از باز شدن ── */}
      {moreOpen && (
        <>
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

      {/* ── دستگاه‌های من: مدیریت دسترسی از سمت کاربر ── */}
      {moreOpen && (
      <button
        type="button"
        onClick={onOpenDevices}
        className="flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-4 text-start transition-colors hover:border-glow/40"
      >
        <Smartphone className="size-5 shrink-0 text-dim" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">{t.myDevices}</span>
          <span className="block text-sm text-dim">{t.myDevicesSub}</span>
        </span>
        <Fwd className="size-5 shrink-0 text-dim" />
      </button>
      )}

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

      {/* ── حریم خصوصی و بدون لاگ ── */}
      <button
        type="button"
        onClick={onOpenPrivacy}
        className="flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-4 text-start transition-colors hover:border-glow/40"
      >
        <ShieldCheck className="size-5 shrink-0 text-dim" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">{t.privacyRow}</span>
          <span className="block text-sm text-dim">{t.privacyRowSub}</span>
        </span>
        <Fwd className="size-5 shrink-0 text-dim" />
      </button>
        </>
      )}

      {/* ── کیف پول: موجودی، کد هدیه، پرداخت از کیف پول — همیشه قابل‌مشاهده ── */}
      <button
        type="button"
        onClick={onOpenWallet}
        className="flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-4 text-start transition-colors hover:border-glow/40"
      >
        <WalletIcon className="size-5 shrink-0 text-dim" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">{t.wallet}</span>
          <span className="block text-sm text-dim">{t.walletSub}</span>
        </span>
        <Fwd className="size-5 shrink-0 text-dim" />
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
  days,
  onClose,
}: {
  lang: Lang;
  usedGb: number;
  totalText: string;
  byApp: UsageRow[];
  byServer: UsageRow[];
  /** مصرف روزانهٔ ۱۴ روز اخیر برای نمودار */
  days: UsageDay[];
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
          <UsageChart lang={lang} days={days} />

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
  return tpl(s, n).replace("{mode}", mode);
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
