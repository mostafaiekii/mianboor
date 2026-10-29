"use client";

import { Check, Crown, Send, X } from "lucide-react";
import { TG_SUPPORT, tr, type Lang } from "./i18n";

/**
 * Bottom sheet that explains the plans and hands the user over to the
 * Telegram admin (@member9) for payment & activation.
 * reason: "renew" = opened from Account, "premium-lock" = tapped a locked server.
 */
export function PlansSheet({
  lang,
  reason,
  onClose,
}: {
  lang: Lang;
  reason: "renew" | "premium-lock";
  onClose: () => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const plans = [
    { id: "m1", d: t.m1, p: t.price1, hot: false },
    { id: "m3", d: t.m3, p: t.price3, hot: false },
    { id: "m12", d: t.m12, p: t.price12, hot: true },
  ];

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col justify-end bg-night/70 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        dir={rtl ? "rtl" : "ltr"}
        className="sheet-in flex flex-col gap-3 rounded-t-3xl border-t border-gold/30 bg-panel px-5 pt-4 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-ink/20" />
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <Crown className="size-5 fill-gold text-gold" /> {t.plansTitle}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-dim hover:text-ink">
            <X className="size-5" />
          </button>
        </div>
        {reason === "premium-lock" && <div className="text-sm text-gold">{t.premiumLockSub}</div>}

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-night px-3 py-3">
            <div className="text-sm font-semibold text-ink">{t.currentPlan}</div>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-dim">
              <Check className="size-3.5" /> {t.planFree}
            </div>
            <div className="mt-1 text-xs leading-5 text-dim">{t.freeFeat}</div>
          </div>
          <div className="rounded-xl border border-gold/30 bg-gold/10 px-3 py-3">
            <div className="flex items-center gap-1 text-sm font-semibold text-gold">
              <Crown className="size-3.5 fill-gold text-gold" /> Premium
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-ink">
              <Check className="size-3.5 text-glow" /> {t.plansTitle}
            </div>
            <div className="mt-1 text-xs leading-5 text-dim">{t.premFeat}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {plans.map((pl) => (
            <div
              key={pl.id}
              className={
                pl.hot
                  ? "relative rounded-xl border border-gold/50 bg-gold/15 px-2 py-3 text-center"
                  : "rounded-xl bg-night px-2 py-3 text-center"
              }
            >
              {pl.hot && (
                <span className="absolute -top-2 start-1/2 -translate-x-1/2 rounded-full bg-gold px-1.5 py-px text-[10px] font-bold text-night rtl:translate-x-1/2">
                  {t.bestValue}
                </span>
              )}
              <div className="text-xs text-dim">{pl.d}</div>
              <div className="mt-1 font-display text-sm font-bold text-ink tabular-nums">{pl.p}</div>
            </div>
          ))}
        </div>

        <div className="text-xs leading-5 text-dim">{t.plansNote}</div>

        <a
          href={TG_SUPPORT}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-gold py-3 font-display text-base font-bold text-night"
        >
          <Send className="size-4" /> {t.viaTelegram}
        </a>
      </div>
    </div>
  );
}
