"use client";

/**
 * تقسیم تونل — واقعی و کامل:
 * حالت انحصاری/مشارکتی + برنامه‌ها + نشانی‌های IP/CIDR + مسدود کردن اتصالات .ir
 */

import { useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, Lock, Network, Plus, RotateCcw, Search, ShieldOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { tr, tpl, type Lang } from "./i18n";
import type { SplitApp, SplitMode, SplitState } from "./types";

export const SPLIT_APPS: SplitApp[] = [
  { id: "tg", name: "Telegram", nameFa: "تلگرام", color: "oklch(0.7 0.13 230)", letter: "T" },
  { id: "wa", name: "WhatsApp", nameFa: "واتساپ", color: "oklch(0.72 0.17 150)", letter: "W" },
  { id: "ig", name: "Instagram", nameFa: "اینستاگرام", color: "oklch(0.62 0.22 20)", letter: "I" },
  { id: "yt", name: "YouTube", nameFa: "یوتیوب", color: "oklch(0.6 0.2 25)", letter: "Y" },
  { id: "ch", name: "Chrome", nameFa: "کروم", color: "oklch(0.65 0.15 60)", letter: "C" },
  { id: "sp", name: "Spotify", nameFa: "اسپاتیفای", color: "oklch(0.72 0.18 145)", letter: "S" },
  { id: "bk", name: "Banking", nameFa: "اپ بانکی", color: "oklch(0.55 0.12 260)", letter: "B" },
  { id: "sn", name: "Snapp", nameFa: "اسنپ", color: "oklch(0.72 0.16 130)", letter: "S" },
  { id: "dk", name: "Digikala", nameFa: "دیجی‌کالا", color: "oklch(0.62 0.19 28)", letter: "D" },
  { id: "gm", name: "Gmail", nameFa: "جیمیل", color: "oklch(0.6 0.16 35)", letter: "G" },
];

/** Working split tunneling: per-app switches + exclude/include routing mode + IP addresses + block .ir. */
export function SplitScreen({
  lang,
  split,
  setSplit,
  onBack,
}: {
  lang: Lang;
  split: SplitState;
  setSplit: React.Dispatch<React.SetStateAction<SplitState>>;
  onBack: () => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const Back = rtl ? ChevronRight : ChevronLeft;
  const [q, setQ] = useState("");
  const [addr, setAddr] = useState("");
  const [addrErr, setAddrErr] = useState(false);

  const list = SPLIT_APPS.filter((a) => {
    const n = lang === "fa" ? a.nameFa : a.name;
    return n.toLowerCase().includes(q.toLowerCase());
  });

  const toggleApp = (id: string) =>
    setSplit((s) => ({ ...s, apps: s.apps.includes(id) ? s.apps.filter((x) => x !== id) : [...s.apps, id] }));

  /* اعتبارسنجی آی‌پی یا CIDR — اکتت ۰..۲۵۵ و پریفیکس ۰..۳۲، مثل اپ واقعی */
  const addAddr = () => {
    const v = addr.trim();
    const oct = "(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
    const ok = new RegExp(`^(${oct}\\.${oct}\\.${oct}\\.${oct})(/(3[0-2]|[12]?\\d))?$`).test(v);
    if (!ok) {
      setAddrErr(true);
      setTimeout(() => setAddrErr(false), 1800);
      return;
    }
    if (!split.addresses.includes(v)) setSplit((s) => ({ ...s, addresses: [...s.addresses, v] }));
    setAddr("");
  };

  const n = split.apps.length;
  const na = split.addresses.length;
  const countLine =
    n === 0
      ? split.mode === "exclude"
        ? t.exclCount0
        : t.inclCount0
      : tpl(split.mode === "exclude" ? t.exclCount : t.inclCount, n);

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="flex min-h-0 flex-1 flex-col px-5 pt-2">
      <button type="button" onClick={onBack} aria-label="Back" className="w-fit text-dim hover:text-ink">
        <Back className="size-6" />
      </button>
      <h2 className="mt-3 font-display text-2xl font-bold text-ink">{t.splitTitle}</h2>
      <p className="mt-1.5 text-sm leading-6 text-dim">{t.splitDesc}</p>

      {/* کلید اصلی فعال‌سازی */}
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-4">
        <span className="flex-1 text-sm font-semibold text-ink">{t.splitEnable}</span>
        <Switch checked={split.on} onCheckedChange={(v) => setSplit((s) => ({ ...s, on: v }))} aria-label={t.splitEnable} />
      </div>

      {split.on && (
        <div className="screen-in">
          <div className="mt-3 grid grid-cols-2 rounded-xl bg-panel p-1">
            {(["exclude", "include"] as const).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setSplit((s) => ({ ...s, mode: m }))}
                aria-pressed={split.mode === m}
                className={
                  split.mode === m
                    ? "rounded-lg bg-night py-2 text-sm font-semibold text-ink"
                    : "rounded-lg py-2 text-sm text-dim"
                }
              >
                {m === "exclude" ? t.splitModeExcl : t.splitModeIncl}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm leading-6 text-dim">{split.mode === "exclude" ? t.splitExclHint : t.splitInclHint}</p>

          {/* کارت‌های برنامه‌ها / نشانی‌ها — شمارندهٔ علامت‌گذاری‌شده‌ها */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a href="#split-apps" className="flex flex-col items-center gap-1 rounded-2xl border border-panel-edge bg-panel p-3.5 text-center">
              <LayoutGrid className="size-5 text-dim" />
              <span className="text-sm font-semibold text-ink">{t.apps}</span>
              <span className="flex items-center gap-1 text-xs text-dim">
                {tpl(t.marked, n)} <ChevronLeft className="size-3 rtl:hidden" /><ChevronRight className="size-3 hidden rtl:block" />
              </span>
            </a>
            <a href="#split-addrs" className="flex flex-col items-center gap-1 rounded-2xl border border-panel-edge bg-panel p-3.5 text-center">
              <Network className="size-5 text-dim" />
              <span className="text-sm font-semibold text-ink">{t.addresses}</span>
              <span className="flex items-center gap-1 text-xs text-dim">
                {tpl(t.marked, na)} <ChevronLeft className="size-3 rtl:hidden" /><ChevronRight className="size-3 hidden rtl:block" />
              </span>
            </a>
          </div>

          {/* مسدود کردن اتصالات .ir — با وضعیت */}
          <div className="mt-3 rounded-2xl border border-panel-edge bg-panel p-4">
            <div className="flex items-center gap-3">
              <ShieldOff className="size-5 shrink-0 text-dim" />
              <span className="flex-1 text-sm font-semibold text-ink">{t.blockIr}</span>
              <Switch checked={split.blockIr} onCheckedChange={(v) => setSplit((s) => ({ ...s, blockIr: v }))} aria-label={t.blockIr} />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs leading-5 text-dim">{t.blockIrSub}</span>
              <span className="flex shrink-0 items-center gap-1 text-xs font-medium">
                <Lock className={split.blockIr ? "size-3 text-danger" : "size-3 text-dim"} />
                <span className={split.blockIr ? "text-danger" : "text-dim"}>{split.blockIr ? t.blockedNow : t.allowedNow}</span>
              </span>
            </div>
          </div>

          {/* نشانی‌ها — افزودن IP/CIDR */}
          <section id="split-addrs" className="mt-3 rounded-2xl border border-panel-edge bg-panel p-4">
            <div className="flex items-center gap-2">
              <Network className="size-4 text-dim" />
              <span className="text-sm font-semibold text-ink">{t.addresses}</span>
              <span className="text-xs text-dim">· {t.addressesSub}</span>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <input
                dir="ltr"
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAddr()}
                placeholder={t.addrPlaceholder}
                aria-label={t.addrPlaceholder}
                className={
                  addrErr
                    ? "w-full rounded-xl border border-danger bg-night px-3 py-2.5 font-mono text-sm text-ink outline-none placeholder:text-dim"
                    : "w-full rounded-xl border border-panel-edge bg-night px-3 py-2.5 font-mono text-sm text-ink outline-none placeholder:text-dim focus:border-glow/40"
                }
              />
              <button
                type="button"
                onClick={addAddr}
                className="flex shrink-0 items-center gap-1 rounded-xl bg-glow px-3 py-2.5 text-sm font-bold text-on-glow"
              >
                <Plus className="size-4" /> {t.addrAdd}
              </button>
            </div>
            {addrErr && <div className="mt-1.5 text-xs text-danger">{t.addrInvalid}</div>}
            {na > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {split.addresses.map((a) => (
                  <span key={a} className="flex items-center gap-1 rounded-full bg-night px-2.5 py-1 font-mono text-xs text-ink">
                    {a}
                    <button
                      type="button"
                      aria-label={`remove ${a}`}
                      onClick={() => setSplit((s) => ({ ...s, addresses: s.addresses.filter((x) => x !== a) }))}
                      className="text-dim hover:text-danger"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <div id="split-apps" className="mt-3 flex items-center gap-2 text-sm text-dim">
        <LayoutGrid className="size-4" /> {t.apps}
      </div>
      <label className="mt-2 flex items-center gap-3 rounded-xl border border-panel-edge bg-panel px-4 py-3">
        <Search className="size-4 text-dim" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.splitSearch}
          aria-label={t.splitSearch}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-dim"
        />
      </label>

      <div className={"scroll-hide mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-2 " + (split.on ? "" : "pointer-events-none opacity-40")}>
        {list.map((a) => {
          const on = split.apps.includes(a.id);
          return (
            <div
              key={a.id}
              className={
                on
                  ? "flex items-center gap-3 rounded-xl border border-glow/30 bg-panel px-3 py-3"
                  : "flex items-center gap-3 rounded-xl border border-panel-edge bg-panel px-3 py-3"
              }
            >
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold text-night"
                style={{ backgroundColor: a.color }}
              >
                {a.letter}
              </span>
              <span className="flex-1 text-sm font-semibold text-ink">{lang === "fa" ? a.nameFa : a.name}</span>
              <Switch checked={on} onCheckedChange={() => toggleApp(a.id)} aria-label={lang === "fa" ? a.nameFa : a.name} />
            </div>
          );
        })}
        {list.length === 0 && <div className="py-6 text-center text-sm text-dim">{t.noMatch}</div>}
      </div>

      <div className="sticky bottom-0 -mx-5 flex items-center gap-3 border-t border-panel-edge bg-night/90 px-5 py-3 backdrop-blur">
        <span className="flex-1 text-sm font-medium text-ink">{countLine}</span>
        {n > 0 && (
          <button
            type="button"
            onClick={() => setSplit((s) => ({ ...s, apps: [] }))}
            className="flex items-center gap-1.5 rounded-full border border-panel-edge px-3 py-1.5 text-sm text-dim hover:text-danger"
          >
            <RotateCcw className="size-3.5" /> {t.resetSplit}
          </button>
        )}
      </div>
    </div>
  );
}
