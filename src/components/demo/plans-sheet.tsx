"use client";

import { useState } from "react";
import { Check, CreditCard, Crown, Loader2, PartyPopper, Send, X } from "lucide-react";
import { TG_SUPPORT, tr, type Lang } from "./i18n";
import { PLAN_DAYS, type PlanId } from "./types";

const PLANS: { id: PlanId; key: "m1" | "m3" | "m6"; price: "price1" | "price3" | "price6"; sub: "sub1" | "sub3" | "sub6"; tag?: "popular" | "bestValue" }[] = [
  { id: "p1", key: "m1", price: "price1", sub: "sub1" },
  { id: "p3", key: "m3", price: "price3", sub: "sub3", tag: "popular" },
  { id: "p6", key: "m6", price: "price6", sub: "sub6", tag: "bestValue" },
];

type Step = "pick" | "pay" | "sent";

/**
 * Full purchase flow: pick a tariff → choose payment method → order sent to
 * the admin, who approves it in the hidden panel (Orders tab) to grant premium.
 */
export function PlansSheet({
  lang,
  reason,
  onClose,
  onCreateOrder,
}: {
  lang: Lang;
  reason: "renew" | "premium-lock" | "trial-over";
  onClose: () => void;
  onCreateOrder: (plan: PlanId, via: "gateway" | "telegram") => string;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const [step, setStep] = useState<Step>("pick");
  const [plan, setPlan] = useState<PlanId>("p3");
  const [busy, setBusy] = useState(false);
  const [orderId, setOrderId] = useState("");

  const sel = PLANS.find((p) => p.id === plan)!;

  const payGateway = () => {
    setBusy(true);
    setTimeout(() => {
      const id = onCreateOrder(plan, "gateway");
      setOrderId(id);
      setBusy(false);
      setStep("sent");
    }, 1600);
  };

  const payTelegram = () => {
    const id = onCreateOrder(plan, "telegram");
    setOrderId(id);
    setStep("sent");
  };

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col justify-end bg-night/70 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        dir={rtl ? "rtl" : "ltr"}
        className="sheet-in flex max-h-[88%] flex-col gap-3 overflow-y-auto scroll-hide rounded-t-3xl border-t border-gold/30 bg-panel px-5 pt-4 pb-6"
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
        {reason === "trial-over" && <div className="text-sm font-medium text-danger">{t.trialOverUpsell}</div>}

        {step === "pick" && (
          <>
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
                  <Crown className="size-3.5 fill-gold text-gold" /> {t.planPremium}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                  <Check className="size-3.5 text-glow" /> {t.plansTitle}
                </div>
                <div className="mt-1 text-xs leading-5 text-dim">{t.premFeat}</div>
              </div>
            </div>

            <div className="mt-1 text-sm font-semibold text-ink">{t.pickPlan}</div>
            <div className="flex flex-col gap-2">
              {PLANS.map((p) => {
                const active = plan === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setPlan(p.id)}
                    aria-pressed={active}
                    className={
                      active
                        ? "relative flex items-center gap-3 rounded-xl border-2 border-gold bg-gold/10 px-4 py-3 text-start"
                        : "flex items-center gap-3 rounded-xl border-2 border-transparent bg-night px-4 py-3 text-start hover:border-panel-edge"
                    }
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-base font-bold text-ink">
                        {t[p.key]}
                        {p.tag && (
                          <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold">
                            {t[p.tag]}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-sm text-dim">{t[p.sub]}</span>
                    </span>
                    <span className="shrink-0 text-end">
                      <span className="block font-display text-base font-bold tabular-nums text-ink">{t[p.price]}</span>
                    </span>
                    <span
                      className={
                        active
                          ? "grid size-6 shrink-0 place-items-center rounded-full bg-gold"
                          : "size-6 shrink-0 rounded-full border-2 border-ink/25"
                      }
                    >
                      {active && <Check className="size-4 text-night" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setStep("pay")}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-gold py-3 font-display text-base font-bold text-night"
            >
              {t.continuePay} — <span className="tabular-nums">{t[sel.price]}</span>
            </button>
          </>
        )}

        {step === "pay" && (
          <>
            <div className="text-sm font-semibold text-ink">{t.payTitle}</div>
            <button
              type="button"
              disabled={busy}
              onClick={payGateway}
              className="flex items-center gap-3 rounded-xl border border-panel-edge bg-night px-4 py-4 text-start transition-colors hover:border-glow/50 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-5 shrink-0 animate-spin text-glow" /> : <CreditCard className="size-5 shrink-0 text-glow" />}
              <span className="flex-1">
                <span className="block text-sm font-semibold text-ink">{busy ? t.processing : t.payGateway}</span>
                <span className="block text-sm text-dim">{t.payGatewaySub}</span>
              </span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={payTelegram}
              className="flex items-center gap-3 rounded-xl border border-panel-edge bg-night px-4 py-4 text-start transition-colors hover:border-glow/50"
            >
              <Send className="size-5 shrink-0 text-glow" />
              <span className="flex-1">
                <span className="block text-sm font-semibold text-ink">{t.viaTelegram}</span>
                <span className="block text-sm text-dim">{t.viaTelegramSub}</span>
              </span>
            </button>
            <button type="button" onClick={() => setStep("pick")} className="text-sm font-medium text-dim hover:text-ink">
              ← {t.pickPlan}
            </button>
          </>
        )}

        {step === "sent" && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-glow/15">
              <PartyPopper className="size-7 text-glow" />
            </span>
            <div className="font-display text-lg font-bold text-ink">{t.paySuccess}</div>
            <div dir="ltr" className="rounded-full bg-night px-3 py-1 font-mono text-sm text-dim">
              {orderId}
            </div>
            <div className="text-sm font-semibold text-ink">{t.orderPlaced}</div>
            <div className="text-sm leading-6 text-dim">{t.orderPlacedSub}</div>
            <div className="mt-1 flex w-full flex-col gap-2">
              <a
                href={TG_SUPPORT}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-gold py-3 font-display text-base font-bold text-night"
              >
                <Send className="size-4" /> {t.openTelegram}
              </a>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-panel-edge bg-night py-3 font-display text-base font-bold text-ink"
              >
                {t.done}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const planDays = (p: PlanId) => PLAN_DAYS[p];
