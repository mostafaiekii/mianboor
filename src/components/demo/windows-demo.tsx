"use client";

/**
 * ── دموی زندهٔ نسخهٔ ویندوز میانپور ──
 *
 * همین UI ای است که exe ویندوز اجرا می‌کند (windows-app/renderer) —
 * اینجا در یک iframe با «پل شبیه‌سازی‌شده» (demo-bridge.js) زنده شده است:
 *   • ظاهر/تم/چیدمان: واقعی و عین exe
 *   • اعداد پینگ/اتصال/مصرف: شبیه‌سازی — صادقانه برچسب خورده
 * رفتار واقعی و اثبات‌شده = اسکرین‌شات‌های تست E2E که زیر همین دمو هستند.
 */

import { useState } from "react";

const SHOTS: { file: string; title: string }[] = [
  { file: "01-home-off.png", title: "خانه — قبل از اتصال" },
  { file: "05-home-connected.png", title: "خانه — متصل با تایمر و مصرف زنده" },
  { file: "03-servers-live-ping.png", title: "سرورها — پینگ واقعی زنده" },
  { file: "02-import-sheet.png", title: "ورود کانفیگ (لینک یا سابسکریپشن)" },
  { file: "04-home-selected.png", title: "سرور انتخاب‌شده" },
  { file: "07-servers-best.png", title: "اتصال هوشمند — کمترین پینگ واقعی" },
  { file: "08-home-error.png", title: "خطای صادقانه — نه پیام دروغین" },
  { file: "09-settings-midnight.png", title: "تنظیمات — تم نیمه‌شب" },
  { file: "10-settings-forest.png", title: "تنظیمات — تم جنگل" },
  { file: "11-settings-english.png", title: "انگلیسی + LTR" },
  { file: "12-emergency.png", title: "بخش اضطراری — تست واقعی هر کانفیگ" },
  { file: "06-home-usage.png", title: "مصرف زنده از StatsService هسته" },
];

export default function WindowsDemo() {
  const [shot, setShot] = useState<string | null>(null);

  return (
    <div dir="rtl" className="flex flex-col gap-6">
      {/* بنر صداقت */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200">
        <p className="font-bold">این دموی زندهٔ رابط نسخهٔ ویندوز است — همان UI که فایل exe اجرا می‌کند.</p>
        <p className="mt-1 text-emerald-200/80">
          ظاهر، تم‌ها و چیدمان واقعی است (عین کد داخل exe). اما اعداد پینگ و اتصال در
          این پیش‌نمایشِ مرورگری شبیه‌سازی می‌شوند؛ در exe واقعی همهٔ اعداد از هستهٔ
          Xray واقعی می‌آیند — اثباتش اسکرین‌شات‌های تست واقعی زیر همین دمو است.
        </p>
      </div>

      {/* پنجرهٔ ویندوز — iframe زنده */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f14] shadow-2xl">
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-2">
          <span className="h-3 w-3 rounded-full bg-red-400/80" />
          <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
          <span className="h-3 w-3 rounded-full bg-green-400/80" />
          <span className="mx-auto text-xs text-white/50" dir="ltr">
            Mianboor for Windows — v1.1.0 (live preview)
          </span>
        </div>
        <div className="relative w-full" style={{ aspectRatio: "1280 / 800", minHeight: 480 }}>
          <iframe
            src="/win-demo/index.html"
            title="دموی میانپور ویندوز"
            className="absolute inset-0 h-full w-full border-0 bg-[#080e23]"
            allow="clipboard-write"
          />
        </div>
      </div>
      <p className="-mt-2 text-xs text-zinc-400">
        با دمو واقعاً کار کن: دکمهٔ پاور، تب سرورها با پینگ زنده، ورود لینک vmess/vless،
        تم‌ها و بخش اضطراری — همه فعال‌اند.
      </p>

      {/* اسکرین‌شات‌های واقعی E2E */}
      <section>
        <h3 className="mb-1 text-lg font-extrabold text-white">
          اسکرین‌شات‌های تست واقعی (E2E با هستهٔ Xray واقعی)
        </h3>
        <p className="mb-4 text-sm text-zinc-400">
          این‌ها از اجرای واقعی اپ زیر تست خودکار گرفته شده‌اند — همان چیزی که exe
          روی ویندوز نشان می‌دهد.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SHOTS.map((s) => (
            <button
              key={s.file}
              onClick={() => setShot(s.file)}
              className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 text-right transition hover:border-emerald-400/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/win-demo-shots/${s.file}`}
                alt={s.title}
                className="aspect-[4/3] w-full object-cover object-top transition group-hover:scale-[1.02]"
                loading="lazy"
              />
              <div className="px-3 py-2 text-xs text-zinc-300">{s.title}</div>
            </button>
          ))}
        </div>
      </section>

      {/* لایت‌باکس */}
      {shot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setShot(null)}
          role="dialog"
          aria-modal="true"
          aria-label="نمایش اسکرین‌شات"
        >
          <div className="max-h-[90vh] max-w-[95vw] overflow-hidden rounded-xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/win-demo-shots/${shot}`} alt="اسکرین‌شات نسخهٔ ویندوز" className="max-h-[82vh] w-auto max-w-full" />
            <div className="bg-white/5 py-2 text-center text-sm text-zinc-300">
              برای بستن کلیک کن
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
