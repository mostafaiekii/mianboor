"use client";

import { useState } from "react";
import { Check, Copy, CreditCard, Crown, PartyPopper, Send, Ticket, Wallet as WalletIcon, X } from "lucide-react";
import { TG_SUPPORT, tr, type Lang } from "./i18n";
import { PLAN_DAYS, PLAN_PRICES, PROMO_CODES, type PlanId } from "./types";

const PLANS: { id: PlanId; key: "m1" | "m3" | "m6"; price: "price1" | "price3" | "price6"; sub: "sub1" | "sub3" | "sub6"; tag?: "popular" | "bestValue" }[] = [
  { id: "p1", key: "m1", price: "price1", sub: "sub1" },
  { id: "p3", key: "m3", price: "price3", sub: "sub3", tag: "popular" },
  { id: "p6", key: "m6", price: "price6", sub: "sub6", tag: "bestValue" },
];

/** اطلاعات کارت‌به‌کارت — در اپ واقعی از سرور (تب Server پنل ادمین) می‌آید. */
export const DEMO_PAY = {
  card: "6037-9977-1234-5678",
  holder: "MIANBOOR",
  note: "شماره سفارش را در شرح پرداخت بنویسید",
};

type Step = "pick" | "pay" | "sent";

/**
 * Full purchase flow: pick a tariff → choose payment method → order sent to
 * the server, where it is confirmed to grant premium.
 */
export function PlansSheet({
  lang,
  reason,
  walletBalance,
  onWalletPay,
  onClose,
  onCreateOrder,
}: {
  lang: Lang;
  reason: "renew" | "premium-lock" | "trial-over";
  /** موجودی کیف پول برای پرداخت مستقیم */
  walletBalance: number;
  onWalletPay: (plan: PlanId, finalPrice: number) => void;
  onClose: () => void;
  onCreateOrder: (plan: PlanId, via: "gateway" | "telegram", discountPct?: number) => string;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const [step, setStep] = useState<Step>("pick");
  const [plan, setPlan] = useState<PlanId>("p3");
  const [orderId, setOrderId] = useState("");
  const [promo, setPromo] = useState("");
  const [promoPct, setPromoPct] = useState<number | null>(null);
  const [promoErr, setPromoErr] = useState(false);

  const sel = PLANS.find((p) => p.id === plan)!;
  const finalPrice = Math.round(PLAN_PRICES[plan] * (1 - (promoPct ?? 0) / 100));

  const applyPromo = () => {
    const c = promo.trim().toUpperCase();
    const pct = PROMO_CODES[c];
    if (pct) {
      setPromoPct(pct);
      setPromoErr(false);
    } else {
      setPromoPct(null);
      setPromoErr(true);
    }
  };

  const pay = (via: "gateway" | "telegram") => {
    const id = onCreateOrder(plan, via, promoPct ?? 0);
    setOrderId(id);
    setStep("sent");
  };

  const fmtPrice = (n: number) => `${n.toLocaleString("en-US")} ${t.toman}`;

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
              {t.continuePay} — <span className="tabular-nums">{promoPct ? fmtPrice(finalPrice) : t[sel.price]}</span>
            </button>

            {/* ── کد تخفیف ── */}
            <div className="rounded-xl border border-panel-edge bg-night p-3">
              <div className="flex gap-2">
                <span className="grid w-9 shrink-0 place-items-center">
                  <Ticket className="size-4 text-gold" />
                </span>
                <input
                  dir="ltr"
                  value={promo}
                  onChange={(e) => { setPromo(e.target.value); setPromoErr(false); }}
                  onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                  placeholder={t.promoPh}
                  className="w-full flex-1 rounded-lg border border-panel-edge bg-panel px-2.5 py-2 font-mono text-sm uppercase text-ink outline-none placeholder:normal-case placeholder:text-dim focus:border-gold/50"
                />
                <button
                  type="button"
                  onClick={applyPromo}
                  className="shrink-0 rounded-lg bg-gold/20 px-3 text-sm font-bold text-gold"
                >
                  {t.promoApply}
                </button>
              </div>
              {promoPct != null && (
                <div className="mt-2 text-xs font-semibold text-glow">{t.promoOk.replace("{p}", String(promoPct))}</div>
              )}
              {promoErr && <div className="mt-2 text-xs font-semibold text-danger">{t.promoBad}</div>}
            </div>
          </>
        )}

        {step === "pay" && (
          <>
            <div className="text-sm font-semibold text-ink">{t.payTitle}</div>
            {/* ── پرداخت با کیف پول — فعال‌سازی آنی ── */}
            <button
              type="button"
              onClick={() => onWalletPay(plan, finalPrice)}
              className={`flex items-center gap-3 rounded-xl border bg-night px-4 py-4 text-start transition-colors ${
                walletBalance >= finalPrice ? "border-glow/40 hover:border-glow" : "border-panel-edge opacity-70"
              }`}
            >
              <WalletIcon className="size-5 shrink-0 text-glow" />
              <span className="flex-1">
                <span className="block text-sm font-semibold text-ink">{t.payWallet.replace("{b}", `${walletBalance.toLocaleString("en-US")} ${t.toman}`)}</span>
                <span className="block text-sm text-dim">{t.walletPay} · {t.walletPaySub.replace("{b}", `${walletBalance.toLocaleString("en-US")} ${t.toman}`)}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => pay("gateway")}
              className="flex items-center gap-3 rounded-xl border border-panel-edge bg-night px-4 py-4 text-start transition-colors hover:border-glow/50"
            >
              <CreditCard className="size-5 shrink-0 text-glow" />
              <span className="flex-1">
                <span className="block text-sm font-semibold text-ink">{t.payGateway}</span>
                <span className="block text-sm text-dim">{t.payGatewaySub}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => pay("telegram")}
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
            <div className="font-display text-lg font-bold text-ink">{t.orderPlaced}</div>
            <div dir="ltr" className="rounded-full bg-night px-3 py-1 font-mono text-sm text-dim">
              {t.payOrderId}: {orderId}
            </div>
            {/* اطلاعات کارت‌به‌کارت — در اپ واقعی از سرور می‌آید */}
            <button
              type="button"
              dir="ltr"
              onClick={() => {
                navigator.clipboard?.writeText(DEMO_PAY.card).catch(() => {});
              }}
              className="w-full rounded-xl border border-glow/30 bg-night px-4 py-3"
              aria-label={t.payCardLabel}
            >
              <span className="flex items-center gap-1.5 text-xs font-medium text-dim">
                <CreditCard className="size-3.5" /> {t.payCardLabel} <Copy className="ms-auto size-3.5" />
              </span>
              <span className="mt-1 block font-mono text-lg font-bold tracking-wider text-ink">{DEMO_PAY.card}</span>
              <span className="mt-1 block text-xs text-dim">{t.payHolderLabel}: {DEMO_PAY.holder}</span>
              <span className="mt-1 block text-sm font-semibold text-gold">
                {t.payAmountLabel}: {promoPct ? fmtPrice(finalPrice) : t[sel.price]}
              </span>
              {promoPct != null && <span className="mt-0.5 block text-xs font-bold text-glow">{t.promoApplied.replace("{c}", promo.trim().toUpperCase()).replace("{p}", String(promoPct))}</span>}
              <span className="mt-1 block text-xs leading-5 text-dim">{DEMO_PAY.note}</span>
            </button>
            <div className="text-xs leading-5 text-dim">{t.payCardHint}</div>
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
