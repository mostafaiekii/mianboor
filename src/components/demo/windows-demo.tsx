"use client";

/**
 * ── دموی زندهٔ نسخهٔ ویندوز میانپور — صفحهٔ متمرکز ──
 *
 * نکتهٔ کلیدی: پنجرهٔ واقعی اپ در exe اندازهٔ ۴۳۰×۸۰۰ است (main.js).
 * پس iframe دقیقاً با همان اندازهٔ منطقی رندر می‌شود و با transform
 * scale در هر عرضی «یک‌تکه» کوچک/بزرگ می‌شود — هیچ عنصری از جایش
 * تکان نمی‌خورد؛ دقیقاً همان چیزی که کاربر ویندوز می‌بیند.
 *
 * صداقت: ظاهر/تم/چیدمان واقعی کد exe است؛ اعداد پینگ/اتصال در این
 * پیش‌نمایش مرورگری شبیه‌سازی می‌شوند (پل demo-bridge.js) و اثبات
 * رفتار واقعی، اسکرین‌شات‌های تست E2E زیر همین پنجره است.
 */

import { useEffect, useRef, useState } from "react";

/** اندازهٔ منطقی پنجرهٔ اپ — عین main.js (width: 430, height: 800) */
const APP_W = 430;
const APP_H = 800;

const SHOTS: { file: string; title: string }[] = [
  { file: "01-home-off.png", title: "خانه — قبل از اتصال" },
  { file: "05-home-connected.png", title: "متصل — تایمر و مصرف زنده" },
  { file: "03-servers-live-ping.png", title: "پینگ واقعی زنده" },
  { file: "02-import-sheet.png", title: "ورود کانفیگ" },
  { file: "08-home-error.png", title: "خطای صادقانه" },
  { file: "09-settings-midnight.png", title: "تم نیمه‌شب" },
  { file: "10-settings-forest.png", title: "تم جنگل" },
  { file: "11-settings-english.png", title: "انگلیسی + LTR" },
  { file: "12-emergency.png", title: "اضطراری — تست واقعی" },
  { file: "06-home-usage.png", title: "مصرف از StatsService" },
  { file: "04-home-selected.png", title: "سرور انتخاب‌شده" },
  { file: "07-servers-best.png", title: "اتصال هوشمند" },
];

export default function WindowsDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [shot, setShot] = useState<string | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const calc = () => {
      const cw = el.clientWidth;
      // کل پنجره همیشه دیده شود: بر اساس عرض + محدودیت ارتفاع دید
      const hLimit = Math.max(560, window.innerHeight - 210);
      const s = Math.min(cw / (APP_W + 24), hLimit / APP_H, 1);
      setScale(Math.max(0.42, s));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    window.addEventListener("resize", calc);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", calc);
    };
  }, []);

  return (
    <div dir="rtl" className="flex flex-col gap-4">
      {/* ── صحنه: پس‌زمینهٔ دسکتاپ + پنجرهٔ اپ ── */}
      <div
        ref={stageRef}
        className="relative overflow-hidden rounded-2xl border border-white/10"
        style={{
          height: APP_H * scale + 28,
          background:
            "radial-gradient(1200px 500px at 50% -10%, rgba(73,233,184,0.10), transparent 60%), linear-gradient(160deg, #16181d 0%, #0c0e12 55%, #101318 100%)",
        }}
      >
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: APP_W,
            height: APP_H,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          {/* پنجرهٔ اپ — دقیقاً مثل exe ویندوز */}
          <div
            className="overflow-hidden rounded-xl border border-white/15 bg-[#080E23]"
            style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.65), 0 4px 18px rgba(0,0,0,0.5)" }}
          >
            <iframe
              key="mbwin"
              src="/win-demo/index.html"
              title="دموی میانپور ویندوز"
              className="block border-0 bg-[#080E23]"
              style={{ width: APP_W, height: APP_H }}
              allow="clipboard-write"
            />
          </div>
        </div>
      </div>

      {/* خط صداقت — کوتاه */}
      <p className="text-center text-xs leading-5 text-zinc-400">
        ظاهر و چیدمان = کد واقعی exe (پنجرهٔ ۴۳۰×۸۰۰ همان main.js) — با دکمه‌ها واقعاً کار کن:
        پاور، سرورها با پینگ زنده، ورود کانفیگ، تم‌ها، اضطراری.
        <span className="text-zinc-500"> اعداد در این پیش‌نمایش مرورگری شبیه‌سازی‌شده؛ اثبات رفتار واقعی = اسکرین‌شات‌های E2E پایین.</span>
      </p>

      {/* ── اسکرین‌شات‌های واقعی E2E ── */}
      <section>
        <h3 className="mb-3 text-base font-extrabold text-white">
          اسکرین‌شات‌های تست واقعی (اجرای واقعی با هستهٔ Xray)
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SHOTS.map((s) => (
            <button
              key={s.file}
              onClick={() => setShot(s.file)}
              className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 text-right transition hover:border-emerald-400/40"
            >
              <img
                src={`/win-demo-shots/${s.file}`}
                alt={s.title}
                className="aspect-[430/800] w-full object-cover object-top transition group-hover:scale-[1.02]"
                loading="lazy"
              />
              <div className="px-2.5 py-2 text-[11px] text-zinc-300">{s.title}</div>
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
          <div
            className="max-h-[92vh] overflow-hidden rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`/win-demo-shots/${shot}`}
              alt="اسکرین‌شات نسخهٔ ویندوز"
              className="max-h-[84vh] w-auto max-w-full"
            />
            <div className="bg-white/5 py-2 text-center text-sm text-zinc-300">برای بستن کلیک کن</div>
          </div>
        </div>
      )}
    </div>
  );
}
