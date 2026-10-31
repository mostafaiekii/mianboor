"use client";

import { CalendarClock, ChevronLeft, ChevronRight, Copy, Gift, Sparkles, UserPlus, Users } from "lucide-react";
import { tr, tpl, type Lang } from "./i18n";

/** یک دوست دعوت‌شده — در اپ واقعی از سرور می‌آید (کد معرف → ثبت دستگاه جدید) */
export type RefFriend = { name: string; agoMin: number; bought: boolean; days: number };

export const REF_CODE = "MIAN-7F3A";
export const REF_LINK = "https://mianboor.app/r/MIAN7F3A";

function ago(agoMin: number, lang: Lang): string {
  if (agoMin < 60) return lang === "fa" ? "همین حالا" : "just now";
  const h = Math.floor(agoMin / 60);
  if (h < 24) return lang === "fa" ? `${h} ساعت پیش` : `${h}h ago`;
  const d = Math.round(agoMin / 1440);
  return lang === "fa" ? `${d} روز پیش` : `${d}d ago`;
}

/**
 * صفحه دعوت دوستان (Referral):
 * کد معرف + لینک دعوت، آمار دوستان و روزهای هدیه، لیست دوستان،
 * و در دمو: شبیه‌سازی ورود دوست جدید + دریافت روزهای هدیه.
 */
export function ReferralScreen({
  lang,
  friends,
  giftDays,
  onClaim,
  onSimFriend,
  onCopy,
  onBack,
}: {
  lang: Lang;
  friends: RefFriend[];
  giftDays: number;
  /** دریافت روزهای هدیه — به حسابت به‌شکل پرمیوم اضافه می‌شه */
  onClaim: (days: number) => void;
  onSimFriend: () => void;
  /** کپی کد یا لینک — توست از والد می‌آید */
  onCopy: (what: "code" | "link") => void;
  onBack: () => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const Back = rtl ? ChevronRight : ChevronLeft;
  const Fwd = rtl ? ChevronLeft : ChevronRight;
  const steps = [t.invStep1, t.invStep2, t.invStep3];

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="scroll-hide flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pt-2 pb-3">
      <button type="button" onClick={onBack} aria-label="Back" className="w-fit text-dim hover:text-ink">
        <Back className="size-6" />
      </button>
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">{t.invite}</h2>
        <p className="mt-0.5 text-sm text-dim">{t.inviteSub}</p>
      </div>

      {/* هدر هدیه */}
      <div className="flex items-center gap-4 rounded-2xl border border-gold/40 bg-gold/10 p-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gold/20">
          <Gift className="size-6 fill-gold text-gold" />
        </span>
        <p className="text-sm leading-6 text-ink">{t.giftNote}</p>
      </div>

      {/* کد معرف + لینک دعوت */}
      <div className="rounded-2xl border border-panel-edge bg-panel p-4">
        <div className="text-sm text-dim">{t.yourCode}</div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span dir="ltr" className="rounded-xl bg-night px-3.5 py-2 font-mono text-base font-bold tracking-widest text-glow">
            {REF_CODE}
          </span>
          <button
            type="button"
            onClick={() => onCopy("code")}
            className="flex items-center gap-1.5 rounded-full bg-glow px-4 py-2 text-sm font-bold text-on-glow transition-opacity hover:opacity-90"
          >
            <Copy className="size-4" /> {t.copyBtn}
          </button>
        </div>
        <button
          type="button"
          onClick={() => onCopy("link")}
          dir="ltr"
          className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-panel-edge bg-night px-3 py-2.5 text-start transition-colors hover:border-glow/40"
        >
          <span className="truncate font-mono text-xs text-dim">{REF_LINK}</span>
          <Copy className="size-4 shrink-0 text-dim" />
        </button>
        <div className="mt-1.5 text-xs text-dim">{t.copyLink}</div>
      </div>

      {/* آمار: دوستان + روز هدیه */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-panel-edge bg-panel p-3.5">
          <div className="flex items-center gap-1.5 text-sm text-dim">
            <Users className="size-4 text-glow" /> {t.friendsJoined}
          </div>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">{friends.length}</div>
        </div>
        <div className="rounded-2xl border border-panel-edge bg-panel p-3.5">
          <div className="flex items-center gap-1.5 text-sm text-dim">
            <CalendarClock className="size-4 text-gold" /> {t.giftDays}
          </div>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-gold">{giftDays}</div>
        </div>
      </div>

      {/* دریافت روزهای هدیه */}
      {giftDays > 0 ? (
        <button
          type="button"
          onClick={() => onClaim(giftDays)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-gold py-3.5 font-display text-base font-bold text-night transition-opacity hover:opacity-90"
        >
          <Sparkles className="size-5" /> {tpl(t.claimGift, giftDays)}
        </button>
      ) : (
        <div className="rounded-2xl border border-panel-edge bg-panel py-3 text-center text-sm text-dim">{t.noGiftYet}</div>
      )}

      {/* لیست دوستان */}
      <div>
        <div className="text-sm font-bold text-ink">{t.friendsJoined}</div>
        <div className="scroll-hide mt-2 flex max-h-56 flex-col gap-2 overflow-y-auto">
          {friends.map((f, i) => (
            <div key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-xl border border-panel-edge bg-panel px-3 py-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink/10 text-sm font-bold text-ink">
                {f.name.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{f.name}</span>
                <span className="block text-xs text-dim">
                  {ago(f.agoMin, lang)} · {f.bought ? t.friendBought : t.friendJoined}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold">{tpl(t.daysShort, f.days)}</span>
            </div>
          ))}
          {friends.length === 0 && <div className="py-4 text-center text-sm text-dim">{t.noGiftYet}</div>}
        </div>
      </div>

      {/* چطور کار می‌کنه؟ */}
      <div className="rounded-2xl border border-panel-edge bg-panel p-4">
        <div className="text-sm font-bold text-ink">{t.inviteHow}</div>
        <ol className="mt-2.5 flex flex-col gap-2">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-6 text-dim">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-glow/15 text-[11px] font-bold text-glow">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>

      {/* فقط دمو: شبیه‌سازی ورود دوست */}
      <button
        type="button"
        onClick={onSimFriend}
        className="flex items-center gap-3 rounded-2xl border border-dashed border-panel-edge bg-panel/60 p-4 text-start transition-colors hover:border-glow/40"
      >
        <UserPlus className="size-5 shrink-0 text-dim" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">{t.simFriend}</span>
          <span className="block text-sm text-dim">{t.simFriendSub}</span>
        </span>
        <Fwd className="size-5 shrink-0 text-dim" />
      </button>
    </div>
  );
}
