"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Search } from "lucide-react";
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

/** Working split tunneling: per-app switches + exclude/include routing mode. */
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

  const list = SPLIT_APPS.filter((a) => {
    const n = lang === "fa" ? a.nameFa : a.name;
    return n.toLowerCase().includes(q.toLowerCase());
  });

  const toggleApp = (id: string) =>
    setSplit((s) => ({ ...s, apps: s.apps.includes(id) ? s.apps.filter((x) => x !== id) : [...s.apps, id] }));

  const n = split.apps.length;
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

      <div className="mt-4 grid grid-cols-2 rounded-xl bg-panel p-1">
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

      <label className="mt-3 flex items-center gap-3 rounded-xl border border-panel-edge bg-panel px-4 py-3">
        <Search className="size-4 text-dim" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.splitSearch}
          aria-label={t.splitSearch}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-dim"
        />
      </label>

      <div className="scroll-hide mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-2">
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
