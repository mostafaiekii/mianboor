"use client";

import { Activity, ChevronLeft, ChevronRight, Info, Send } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { TG_SUPPORT, tr, type Lang } from "./i18n";

/** Real settings screen: language, live ping engine, support, about. */
export function SettingsScreen({
  lang,
  setLang,
  pingLive,
  setPingLive,
  onBack,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  pingLive: boolean;
  setPingLive: (v: boolean) => void;
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
      <h2 className="mt-3 font-display text-2xl font-bold text-ink">{t.settings}</h2>

      <div className="mt-4 rounded-2xl border border-panel-edge bg-panel p-4">
        <div className="text-sm font-semibold text-ink">{t.language}</div>
        <div className="mt-3 grid grid-cols-2 rounded-xl bg-night p-1" dir="ltr">
          {(["en", "fa"] as const).map((l) => (
            <button
              type="button"
              key={l}
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={
                lang === l
                  ? "rounded-lg bg-panel py-2 text-sm font-semibold text-ink"
                  : "rounded-lg py-2 text-sm text-dim"
              }
            >
              {l === "en" ? "English" : "فارسی"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-4">
        <Activity className="size-5 text-dim" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">{t.livePingSet}</span>
          <span className="block text-sm text-dim">{t.livePingSetDesc}</span>
        </span>
        <Switch checked={pingLive} onCheckedChange={setPingLive} aria-label={t.livePingSet} />
      </div>

      <a
        href={TG_SUPPORT}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-4 transition-colors hover:border-glow/40"
      >
        <Send className="size-5 text-dim" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">{t.support}</span>
          <span dir="ltr" className="block text-sm text-dim">
            {t.supportSub}
          </span>
        </span>
        {rtl ? <ChevronLeft className="size-5 text-dim" /> : <ChevronRight className="size-5 text-dim" />}
      </a>

      <div className="mt-3 rounded-2xl border border-panel-edge bg-panel p-4">
        <div className="flex items-center gap-2">
          <Info className="size-4 text-dim" />
          <span className="text-sm font-semibold text-ink">{t.about}</span>
        </div>
        <div className="mt-2 text-sm text-dim" dir="ltr">
          {t.aboutLine}
        </div>
        <div className="mt-1 text-sm leading-6 text-dim">{t.noKey}</div>
      </div>
    </div>
  );
}
