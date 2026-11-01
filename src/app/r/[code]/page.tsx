"use client";

/**
 * صفحهٔ فرود لینک دعوت (Referral) — رفع باگ «کد قبول نمی‌شد»:
 * دوست با باز کردن https://mianboor.vercel.app/r/MIAN-XXXXX اینجا می‌آید،
 * کد را کپی یا مستقیم با دیپ‌لینک mianboor://ref/CODE وارد اپ می‌شود.
 */

import { use, useState } from "react";
import { Check, Copy, Download, Gift, ShieldCheck } from "lucide-react";

export default function ReferralLanding({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = use(params);
  const code = decodeURIComponent(raw ?? "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 16);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <main dir="rtl" className="flex min-h-dvh flex-col items-center justify-center bg-[oklch(0.16_0.02_270)] px-5 py-12 text-white">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5">
          <ShieldCheck className="size-7 text-[oklch(0.85_0.15_175)]" />
          <span className="font-black tracking-tight" dir="ltr">MIANBOOR</span>
          <span className="text-sm text-white/60">میانبر</span>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[oklch(0.85_0.15_175)_/_15%]">
            <Gift className="size-7 text-[oklch(0.85_0.15_175)]" />
          </span>
          <h1 className="mt-3 text-2xl font-black">دوستت میانبر رو پیشنهاد داده!</h1>
          <p className="mt-2 text-sm leading-7 text-white/60">
            با کد زیر ثبت‌نام کن، هر دو طرف <b className="text-white">۳ روز هدیه</b> می‌گیرید —
            و اگه پرمیوم بخره، دوستت ۷ روز دیگه هم می‌گیره.
          </p>

          <button
            type="button"
            onClick={copy}
            className="mt-5 flex w-full items-center justify-between rounded-2xl border border-[oklch(0.85_0.15_175)]/40 bg-black/30 px-4 py-3.5 transition-colors hover:border-[oklch(0.85_0.15_175)]"
          >
            <span dir="ltr" className="font-mono text-lg font-bold tracking-wider text-[oklch(0.85_0.15_175)]">
              {code || "—"}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-white/70">
              {copied ? <Check className="size-4 text-[oklch(0.85_0.15_175)]" /> : <Copy className="size-4" />}
              {copied ? "کپی شد!" : "کپی کد"}
            </span>
          </button>

          <a
            href={`mianboor://ref/${code}`}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[oklch(0.85_0.15_175)] py-3.5 font-black text-[oklch(0.16_0.02_270)]"
          >
            <Download className="size-4" /> باز کردن اپ میانبر
          </a>

          <div className="mt-5 rounded-2xl bg-black/25 px-4 py-3 text-start text-sm leading-7 text-white/60">
            <b className="text-white/90">چطور کد رو وارد کنم؟</b>
            <br />
            ۱. اپ میانبر رو باز کن (اگه نداری از دکمهٔ بالا یا سایت نصب کن)
            <br />
            ۲. برو به <b className="text-white/90">حساب ← دعوت دوستان</b>
            <br />
            ۳. کد رو توی بخش «ثبت کد دوست» وارد کن و بزن اعمال
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          میانبر VPN · اتصال امن و سریع · بدون ثبت‌نام
        </p>
      </div>
    </main>
  );
}
