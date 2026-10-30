"use client";

import { BellRing, CheckCheck, ChevronLeft, ChevronRight, DownloadCloud, Gift, Megaphone, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { tr, tpl, type Lang, type Strings } from "./i18n";
import type { Notice, NoticeKind } from "./types";

/** آیکن و رنگ هر نوع اعلان — مشترک بین صندوق و پاپ‌آپ */
export const KIND_META: Record<NoticeKind, { icon: LucideIcon; cls: string; box: string }> = {
  info: { icon: Megaphone, cls: "text-glow", box: "bg-glow/15" },
  gift: { icon: Gift, cls: "text-gold", box: "bg-gold/15" },
  warn: { icon: TriangleAlert, cls: "text-danger", box: "bg-danger/15" },
  update: { icon: DownloadCloud, cls: "text-glow", box: "bg-glow/15" },
};

/** زمان نسبی — «همین حالا / ۵ دقیقه پیش / ۳ ساعت پیش / ۲ روز پیش» */
export function timeAgo(at: number, t: Strings): string {
  const m = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (m < 1) return t.timeNow;
  if (m < 60) return tpl(t.minAgo, m);
  const h = Math.round(m / 60);
  if (h < 24) return tpl(t.hourAgo, h);
  return tpl(t.dayAgo, Math.round(h / 24));
}

/**
 * صندوق پیام کاربر — اعلان‌هایی که مدیر می‌فرستد (اطلاع‌رسانی، هدیه، هشدار، آپدیت)
 * اینجا ذخیره می‌شن؛ توی اپ واقعی از سرور همگام می‌شه و همون‌جا خوانده‌شدن ثبت می‌شه.
 */
export function InboxScreen({
  lang,
  notices,
  onOpen,
  onMarkAll,
  onBack,
}: {
  lang: Lang;
  notices: Notice[];
  /** باز کردن یک پیام — خوانده‌شده علامت می‌خورد */
  onOpen: (n: Notice) => void;
  onMarkAll: () => void;
  onBack: () => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const Back = rtl ? ChevronRight : ChevronLeft;
  const unread = notices.filter((n) => !n.read).length;

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="flex min-h-0 flex-1 flex-col px-5 pt-2">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Back" className="w-fit text-dim hover:text-ink">
          <Back className="size-6" />
        </button>
        <div className="flex-1">
          <h2 className="font-display text-2xl font-bold text-ink">{t.inbox}</h2>
          <p className="text-sm text-dim">{t.inboxSub}</p>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={onMarkAll}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-panel-edge bg-panel px-3 py-1.5 text-xs font-semibold text-dim hover:border-glow/40 hover:text-ink"
          >
            <CheckCheck className="size-3.5" /> {t.markAll}
          </button>
        )}
      </div>

      <div className="scroll-hide mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-3">
        {notices.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-panel-edge bg-panel px-6 py-10 text-center">
            <BellRing className="size-8 text-dim" />
            <div className="text-sm font-semibold text-ink">{t.inboxEmpty}</div>
            <div className="text-sm leading-6 text-dim">{t.inboxEmptySub}</div>
          </div>
        )}
        {notices.map((n) => {
          const meta = KIND_META[n.kind];
          const I = meta.icon;
          return (
            <button
              type="button"
              key={n.id}
              onClick={() => onOpen(n)}
              aria-label={n.title}
              className={
                n.read
                  ? "flex items-start gap-3 rounded-2xl border border-panel-edge bg-panel/60 px-3.5 py-3 text-start opacity-75 transition-colors hover:border-ink/20"
                  : "flex items-start gap-3 rounded-2xl border border-glow/30 bg-panel px-3.5 py-3 text-start transition-colors hover:border-glow/50"
              }
            >
              <span className={`relative grid size-10 shrink-0 place-items-center rounded-xl ${meta.box}`}>
                <I className={`size-5 ${meta.cls}`} />
                {!n.read && <span className="absolute -top-1 -end-1 size-2.5 rounded-full bg-gold ring-2 ring-panel" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`truncate text-sm font-bold ${n.read ? "text-ink" : "text-ink"}`}>{n.title}</span>
                  <span className="shrink-0 text-[11px] text-dim">{timeAgo(n.at, t)}</span>
                </span>
                <span className="mt-0.5 line-clamp-2 block text-sm leading-5 text-dim">{n.body}</span>
              </span>
              {!n.read && <span className="mt-1 shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">•</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
