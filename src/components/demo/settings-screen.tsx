"use client";

import { Activity, ChevronLeft, ChevronRight, Fingerprint, Info, Palette, Send } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { TG_SUPPORT, tr, type Lang } from "./i18n";
import { THEMES, THEME_ORDER, type ThemeName } from "./themes";

/** Real settings screen: language, soft themes, live ping engine, anti-fraud demo, support, about. */
export function SettingsScreen({
  lang,
  setLang,
  theme,
  setTheme,
  pingLive,
  setPingLive,
  onReinstall,
  version,
  onBack,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  pingLive: boolean;
  setPingLive: (v: boolean) => void;
  onReinstall: () => void;
  /** نسخهٔ فعلی اپ — بعد از آپدیت OTA به‌روز می‌شه */
  version: string;
  onBack: () => void;
}) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const Back = rtl ? ChevronRight : ChevronLeft;

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="scroll-hide flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-2 pb-3">
      <button type="button" onClick={onBack} aria-label="Back" className="w-fit shrink-0 text-dim hover:text-ink">
        <Back className="size-6" />
      </button>
      <h2 className="mt-3 shrink-0 font-display text-2xl font-bold text-ink">{t.settings}</h2>

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

      <div className="mt-3 rounded-2xl border border-panel-edge bg-panel p-4">
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-dim" />
          <span className="text-sm font-semibold text-ink">{t.theme}</span>
        </div>
        <div className="mt-1 text-sm text-dim">{t.themeSub}</div>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {THEME_ORDER.map((name) => {
            const th = THEMES[name];
            const active = theme === name;
            return (
              <button
                type="button"
                key={name}
                onClick={() => setTheme(name)}
                aria-pressed={active}
                aria-label={th.name[lang]}
                title={th.name[lang]}
                className={
                  active
                    ? "flex flex-col items-center gap-1.5 rounded-xl border-2 border-glow bg-night px-1 py-2"
                    : "flex flex-col items-center gap-1.5 rounded-xl border-2 border-transparent bg-night px-1 py-2 hover:border-panel-edge"
                }
              >
                <span className="relative size-8 overflow-hidden rounded-full ring-1 ring-ink/10" style={{ background: th.vars["--mb-night"] as string }}>
                  <span className="absolute inset-y-0 start-0 w-1/3" style={{ background: th.vars["--mb-glow"] as string }} />
                  <span className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: th.vars["--mb-panel"] as string }} />
                </span>
                <span className={`w-full truncate text-center text-[10px] leading-4 ${active ? "font-semibold text-ink" : "text-dim"}`}>
                  {th.name[lang]}
                </span>
              </button>
            );
          })}
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
          {t.aboutLine.replace("{v}", version)}
        </div>
        <div className="mt-1 text-sm leading-6 text-dim">{t.noKey}</div>
      </div>

      <button
        type="button"
        onClick={onReinstall}
        className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-4 text-start transition-colors hover:bg-danger/20"
      >
        <Fingerprint className="size-5 shrink-0 text-danger" />
        <span className="flex-1">
          <span className="block text-sm font-bold text-danger">{t.reinstallSim}</span>
          <span className="block text-sm leading-5 text-dim">{t.reinstallSimSub}</span>
        </span>
      </button>
    </div>
  );
}
