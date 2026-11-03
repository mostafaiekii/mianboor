"use client";

/**
 * قابلیت‌های نسخهٔ ۳ — الهام‌گرفته از اپ‌های مدرن VPN، با اصول برند میانبر:
 * ۱. گاردین — مسدودسازی هوشمند محتوا در ۱۰ دسته (تبلیغات، ترکر، بزرگسال و…)
 * ۲. اشتراک‌گذاری نقطه اتصال — هات‌اسپوت با پروکسی محلی VPN را به اشتراک می‌گذارد
 * ۳. صفحهٔ نسخه — حلقه‌های متحرک + وضعیت به‌روزبودن
 */

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Banknote,
  Bitcoin,
  Captions,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Gamepad2,
  Hash,
  Landmark,
  Loader2,
  Megaphone,
  Newspaper,
  Shield,
  ShieldCheck,
  Wifi,
  X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { tr, tpl, type Lang } from "./i18n";
import { GUARDIAN_IDS, type GuardianId, type GuardianState, type TetherState } from "./types";

/* آیکن هر دستهٔ گاردین */
const GUARDIAN_META: Record<GuardianId, { icon: typeof Shield }> = {
  ads: { icon: Megaphone },
  trackers: { icon: Crosshair },
  adult: { icon: Captions },
  yt: { icon: Captions },
  gambling: { icon: Gamepad2 },
  gov: { icon: Landmark },
  pay: { icon: Banknote },
  social: { icon: Hash },
  crypto: { icon: Bitcoin },
  fake: { icon: Newspaper },
};

/* ── نوار پیشرفت سگمنتی (باطری‌مانند) — برای کارت سرور فعلی حساب ── */
export function SegmentedBar({ pct, bars = 24 }: { pct: number; bars?: number }) {
  const filled = Math.round(Math.min(1, Math.max(0, pct)) * bars);
  return (
    <div className="flex items-end gap-[3px]" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          style={{ height: 34 }}
          className={i < filled ? "w-[7px] flex-1 rounded-sm bg-ink/85" : "w-[7px] flex-1 rounded-sm bg-ink/12"}
        />
      ))}
    </div>
  );
}

/* ── ۱. گاردین ── */
export function GuardianScreen({
  lang,
  guardian,
  setGuardian,
  onBack,
}: {
  lang: Lang;
  guardian: GuardianState;
  setGuardian: React.Dispatch<React.SetStateAction<GuardianState>>;
  onBack: () => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const Back = rtl ? ChevronRight : ChevronLeft;

  const label = (id: GuardianId): string =>
    id === "ads" ? t.gAds
    : id === "trackers" ? t.gTrackers
    : id === "adult" ? t.gAdult
    : id === "yt" ? t.gYt
    : id === "gambling" ? t.gGambling
    : id === "gov" ? t.gGov
    : id === "pay" ? t.gPay
    : id === "social" ? t.gSocial
    : id === "crypto" ? t.gCrypto
    : t.gFake;

  const blockedCount = GUARDIAN_IDS.filter((id) => guardian[id]).length;

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="flex min-h-0 flex-1 flex-col px-5 pt-2">
      <button type="button" onClick={onBack} aria-label="Back" className="w-fit text-dim hover:text-ink">
        <Back className="size-6" />
      </button>
      <h2 className="mt-3 font-display text-2xl font-bold text-ink">{t.guardian}</h2>

      {/* سرصفحهٔ معنایی — سپر + توضیح */}
      <div className="mt-4 flex flex-col items-center text-center">
        <span className="grid size-16 place-items-center rounded-2xl border border-dashed border-panel-edge bg-panel">
          <Shield className="size-8 text-ink" />
        </span>
        <p className="mt-3 max-w-[280px] text-sm leading-6 text-dim">{t.guardianSub}</p>
      </div>
      <div className="mt-3 border-t border-dashed border-panel-edge" />

      {/* تعداد دسته‌های مسدود */}
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="font-semibold text-ink">{tpl2(t.guardianCount, blockedCount)}</span>
        <span className="text-dim">{t.guardianCta}</span>
      </div>

      <div className="scroll-hide mt-3 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-3">
        {GUARDIAN_IDS.map((id) => {
          const I = GUARDIAN_META[id].icon;
          const on = guardian[id];
          return (
            <div
              key={id}
              className={on ? "flex items-center gap-3 rounded-2xl border border-glow/30 bg-panel p-3.5" : "flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-3.5"}
            >
              <span className={on ? "grid size-10 shrink-0 place-items-center rounded-xl bg-glow/15" : "grid size-10 shrink-0 place-items-center rounded-xl bg-ink/10"}>
                <I className={on ? "size-5 text-glow" : "size-5 text-dim"} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{label(id)}</span>
                <span className="mt-0.5 flex items-center gap-1 text-xs">
                  {on ? (
                    <>
                      <Shield className="size-3 text-glow" />
                      <span className="font-medium text-glow">{t.gBlocked}</span>
                    </>
                  ) : (
                    <>
                      <X className="size-3 text-dim" />
                      <span className="text-dim">{t.gAllowed}</span>
                    </>
                  )}
                </span>
              </span>
              <Switch
                checked={on}
                onCheckedChange={(v) => setGuardian((s) => ({ ...s, [id]: v }))}
                aria-label={`${label(id)} — ${on ? t.gBlocked : t.gAllowed}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── ۲. شیت اشتراک‌گذاری نقطه اتصال ── */
export function TetherSheet({
  lang,
  tether,
  setTether,
  socksPort,
  onClose,
  onToast,
}: {
  lang: Lang;
  tether: TetherState;
  setTether: React.Dispatch<React.SetStateAction<TetherState>>;
  socksPort: number;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  /* هاست محلی دمو — در اپ واقعی از WifiManager خوانده می‌شه */
  const host = "192.168.43.1";
  const port = tether.port || socksPort;
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-night/70 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div
        dir={rtl ? "rtl" : "ltr"}
        className="sheet-in flex flex-col rounded-t-3xl border-t border-glow/30 bg-panel px-5 pt-4 pb-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t.tetherTitle}
      >
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <Wifi className="size-5 text-glow" /> {t.tetherTitle}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full text-dim hover:text-ink">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-panel-edge bg-night p-4">
          <span className="flex-1 text-sm font-semibold text-ink">{t.tetherOn}</span>
          <Switch
            checked={tether.on}
            onCheckedChange={(v) => {
              setTether((s) => ({ ...s, on: v }));
              if (v) onToast(t.tetherOnToast);
            }}
            aria-label={t.tetherOn}
          />
        </div>

        <p className="mt-3 text-sm leading-6 text-dim">{t.tetherDesc}</p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-panel-edge bg-night p-3 text-center">
            <div dir="ltr" className="font-display text-lg font-bold tabular-nums text-ink">
              {tether.on ? port : "--.--.-.---"}
            </div>
            <div className="mt-0.5 text-xs text-dim">{t.tetherPort}</div>
          </div>
          <div className="rounded-2xl border border-panel-edge bg-night p-3 text-center">
            <div dir="ltr" className="font-display text-lg font-bold tabular-nums text-ink">
              {tether.on ? host : "--.--.-.---"}
            </div>
            <div className="mt-0.5 text-xs text-dim">{t.tetherHost}</div>
          </div>
        </div>

        {!tether.on && <div className="mt-3 text-center text-xs text-dim">{t.tetherHint}</div>}
      </div>
    </div>
  );
}

/* ── ۳. صفحهٔ نسخه — چرخهٔ کامل به‌روزرسانی داخل اپ (مثل اپ اصلی v2.8):
       بررسی از سرور خودمان → نسخهٔ جدید → دانلود با درصد → نصب داخل اپ.
       هیچ‌جا مرورگر یا گیت‌هاب باز نمی‌شود — دانلود از سرور خود میانبر است. ── */

/** نسخه‌ای که در دمو به‌عنوان «آخرین انتشار» شبیه‌سازی می‌شود (انتشار بعدی). */
export const SIM_LATEST_VERSION = "2.8.0";
const SIM_LATEST_SIZE_MB = 20.6;

function verGt(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

type VerStep = "checking" | "uptodate" | "available" | "downloading" | "ready" | "installing" | "installed";

export function VersionScreen({
  lang,
  version,
  /** لحظه‌ای که ورود به صفحه نسخه دوباره چک می‌شه — صفحه از نو مونت می‌شود */
  onInstalled,
  onBack,
}: {
  lang: Lang;
  version: string;
  /** لحظه‌ای که ورود به صفحه نسخه دوباره چک می‌شه */
  checking?: boolean;
  /** بعد از نصب موفق — نسخهٔ اپ در دمو به‌روز می‌شود */
  onInstalled?: (v: string) => void;
  onBack: () => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const Back = rtl ? ChevronRight : ChevronLeft;

  const [step, setStep] = useState<VerStep>("checking");
  const [pct, setPct] = useState(0);

  // ورود به صفحه: بررسی نسخه — اول از سرور خودمان (مثل اپ اصلی).
  // صفحهٔ نسخه هر بار از نو مونت می‌شود؛ تصمیم بعد از چک (تایمر) گرفته می‌شود.
  useEffect(() => {
    const id = setTimeout(() => {
      setStep(verGt(SIM_LATEST_VERSION, version) ? "available" : "uptodate");
    }, 1500);
    return () => clearTimeout(id);
  }, []);

  // دانلود شبیه‌سازی‌شده با درصد — دقیقاً مثل نوار پیشرفت واقعی اپ
  useEffect(() => {
    if (step !== "downloading") return;
    const id = setInterval(() => {
      setPct((p) => {
        const next = Math.min(100, p + 2 + Math.round(Math.random() * 5));
        if (next >= 100) {
          clearInterval(id);
          setTimeout(() => setStep("ready"), 400);
        }
        return next;
      });
    }, 150);
    return () => clearInterval(id);
  }, [step]);

  const startInstall = () => {
    setStep("installing");
    setTimeout(() => {
      setStep("installed");
      onInstalled?.(SIM_LATEST_VERSION);
    }, 1700);
  };

  // بعد از نصب، چند لحظه پیام موفقیت، بعد حالت «به‌روز»
  useEffect(() => {
    if (step !== "installed") return;
    const id = setTimeout(() => setStep("uptodate"), 3400);
    return () => clearTimeout(id);
  }, [step]);

  const ringR = 58;
  const circ = 2 * Math.PI * ringR;
  const doneMb = ((pct / 100) * SIM_LATEST_SIZE_MB).toFixed(1);

  const centerBadge = () => {
    if (step === "checking") {
      return (
        <span className="grid size-24 place-items-center rounded-full bg-ink/10">
          <Loader2 className="size-9 animate-spin text-glow" />
        </span>
      );
    }
    if (step === "downloading") {
      return (
        <span className="grid size-24 place-items-center rounded-full bg-ink/85 font-display text-xl font-black tabular-nums text-night ring-4 ring-night">
          {pct}٪
        </span>
      );
    }
    return (
      <span className="grid size-24 place-items-center rounded-full bg-ink/85 font-display text-2xl font-black tabular-nums text-night ring-4 ring-night">
        {step === "installed" || (step === "uptodate" && !verGt(SIM_LATEST_VERSION, version))
          ? `v${version}`
          : `v${SIM_LATEST_VERSION}`}
      </span>
    );
  };

  const ringStroke = () => {
    if (step === "downloading") {
      return (
        <svg viewBox="0 0 140 140" className="absolute size-44 -rotate-90" aria-hidden="true">
          <circle cx="70" cy="70" r={ringR} fill="none" stroke="currentColor" strokeWidth="5" className="text-ink/12" />
          <circle
            cx="70" cy="70" r={ringR} fill="none" stroke="currentColor" strokeWidth="5"
            strokeLinecap="round" strokeDasharray={`${(pct / 100) * circ} ${circ}`}
            className="text-glow transition-[stroke-dasharray] duration-150"
          />
        </svg>
      );
    }
    if (step === "installing") {
      return <span className="spin-ring absolute size-44 rounded-full border border-glow/30 border-t-glow" aria-hidden="true" />;
    }
    return (
      <>
        <span className="absolute size-44 rounded-full border border-ink/8" aria-hidden="true" />
        <span
          className={
            step === "available" || step === "ready"
              ? "absolute size-40 rounded-full border-2 border-glow/70"
              : "absolute size-40 rounded-full border border-ink/12"
          }
          aria-hidden="true"
        />
      </>
    );
  };

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="flex min-h-0 flex-1 flex-col px-5 pt-2">
      <button type="button" onClick={onBack} aria-label="Back" className="w-fit text-dim hover:text-ink">
        <Back className="size-6" />
      </button>
      <h2 className="mt-3 shrink-0 text-center font-display text-xl font-bold text-ink">{t.versionRow}</h2>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center pb-6">
        {/* هالهٔ حلقه‌ها + حلقهٔ پیشرفت دانلود */}
        <div className="relative grid size-72 place-items-center rounded-full bg-panel/60">
          {ringStroke()}
          <span className="absolute size-56 rounded-full border-b border-ink/15" aria-hidden="true" />
          {centerBadge()}
        </div>

        <div className="screen-in mt-7 text-center">
          {step === "checking" && (
            <div className="text-sm text-dim">{t.verChecking}</div>
          )}
          {step === "uptodate" && (
            <>
              <div className="flex items-center justify-center gap-2 font-display text-xl font-bold text-ink">
                <BadgeCheck className="size-6 text-glow" />
                {t.verUpToDate}
              </div>
              <div className="mt-2 text-sm text-dim">{t.verReady}</div>
            </>
          )}
          {step === "available" && (
            <>
              <div className="flex items-center justify-center gap-2 font-display text-xl font-bold text-ink">
                <BadgeCheck className="size-6 text-gold" />
                {t.verNewAvailable.replace("{v}", SIM_LATEST_VERSION)}
              </div>
              <div className="mt-2 text-sm text-dim">
                {t.verNewSub} · {SIM_LATEST_SIZE_MB} MB
              </div>
              <button
                type="button"
                onClick={() => setStep("downloading")}
                className="mt-5 rounded-full bg-gold px-7 py-3 font-display text-sm font-bold text-night shadow-lg shadow-gold/20 transition hover:brightness-110 active:scale-95"
              >
                {t.verDownloadBtn}
              </button>
            </>
          )}
          {step === "downloading" && (
            <>
              <div className="font-display text-lg font-bold text-ink">
                {t.verDownloading.replace("{p}", String(pct))}
              </div>
              <div dir="ltr" className="mt-1 font-display text-sm tabular-nums text-dim">
                {doneMb} / {SIM_LATEST_SIZE_MB} MB
              </div>
            </>
          )}
          {step === "ready" && (
            <>
              <div className="font-display text-lg font-bold text-ink">{t.verReadyInstall}</div>
              <button
                type="button"
                onClick={startInstall}
                className="mt-5 rounded-full bg-glow px-8 py-3 font-display text-sm font-bold text-night shadow-lg shadow-glow/25 transition hover:brightness-110 active:scale-95"
              >
                {t.verInstallBtn}
              </button>
            </>
          )}
          {step === "installing" && (
            <div className="text-sm text-dim">{t.verInstalling}</div>
          )}
          {step === "installed" && (
            <>
              <div className="flex items-center justify-center gap-2 font-display text-xl font-bold text-ink">
                <BadgeCheck className="size-6 text-glow" />
                {t.verInstalled.replace("{v}", SIM_LATEST_VERSION)}
              </div>
              <div className="mt-2 text-sm text-dim">{t.verReady}</div>
            </>
          )}
        </div>
      </div>

      {/* یادداشت — همه‌چیز داخل اپ، بدون مرورگر و گیت‌هاب */}
      <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-panel-edge bg-panel/70 p-3.5">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-dim" />
        <p className="text-xs leading-5 text-dim">{t.verInAppNote}</p>
      </div>
    </div>
  );
}

function tpl2(s: string, n: number) {
  return tpl(s, n);
}
