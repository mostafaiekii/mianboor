"use client";

/**
 * قابلیت‌های نسخهٔ ۳ — الهام‌گرفته از اپ‌های مدرن VPN، با اصول برند میانبر:
 * ۱. گاردین — مسدودسازی هوشمند محتوا در ۱۰ دسته (تبلیغات، ترکر، بزرگسال و…)
 * ۲. اشتراک‌گذاری نقطه اتصال — هات‌اسپوت با پروکسی محلی VPN را به اشتراک می‌گذارد
 * ۳. صفحهٔ نسخه — حلقه‌های متحرک + وضعیت به‌روزبودن
 */

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
  Wifi,
  X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { tr, type Lang } from "./i18n";
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

/* ── ۳. صفحهٔ نسخه — حلقه‌های متحرک + وضعیت ── */
export function VersionScreen({
  lang,
  version,
  checking,
  onBack,
}: {
  lang: Lang;
  version: string;
  /** لحظه‌ای که ورود به صفحه نسخه دوباره چک می‌شه */
  checking: boolean;
  onBack: () => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const Back = rtl ? ChevronRight : ChevronLeft;
  return (
    <div dir={rtl ? "rtl" : "ltr"} className="flex min-h-0 flex-1 flex-col px-5 pt-2">
      <button type="button" onClick={onBack} aria-label="Back" className="w-fit text-dim hover:text-ink">
        <Back className="size-6" />
      </button>
      <h2 className="mt-3 shrink-0 text-center font-display text-xl font-bold text-ink">{t.versionRow}</h2>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center pb-10">
        {/* هالهٔ حلقه‌ها */}
        <div className="relative grid size-72 place-items-center rounded-full bg-panel/60">
          <span className="absolute size-72 rounded-full border border-ink/8" aria-hidden="true" />
          <span className="absolute size-56 rounded-full border border-ink/12" aria-hidden="true" />
          <span className="spin-ring absolute size-40 rounded-full border border-glow/30 border-t-glow" aria-hidden="true" />
          <span className="absolute size-56 rounded-full border-b border-ink/15" aria-hidden="true" />
          {checking ? (
            <span className="grid size-24 place-items-center rounded-full bg-ink/10">
              <Loader2 className="size-9 animate-spin text-glow" />
            </span>
          ) : (
            <span className="grid size-24 place-items-center rounded-full bg-ink/85 font-display text-2xl font-black tabular-nums text-night ring-4 ring-night">
              {version}
            </span>
          )}
        </div>

        {!checking && (
          <div className="screen-in mt-8 text-center">
            <div className="flex items-center justify-center gap-2 font-display text-xl font-bold text-ink">
              <BadgeCheck className="size-6 text-glow" />
              {t.verUpToDate}
            </div>
            <div className="mt-2 text-sm text-dim">{t.verReady}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function tpl2(s: string, n: number) {
  return s.replace("{n}", String(n));
}
