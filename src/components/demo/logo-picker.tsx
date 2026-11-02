"use client";

/* TEMP: پیش‌نمایش لوگو — بعد از تأیید کاربر حذف می‌شود */
import Image from "next/image";
import { useState } from "react";
import { Check, MessageCircle } from "lucide-react";

const CANDIDATES = [
  {
    id: "a" as const,
    src: "/logo-preview/a-m-shortcut.png",
    name: "A · مونوگرام M",
    desc: "حرف M درخشان با حس سرعت و سادگی",
  },
  {
    id: "b" as const,
    src: "/logo-preview/b-gate.png",
    name: "B · دروازه میان‌بر",
    desc: "دروازه فیروزه‌ای + جاده طلایی — حس واقعی «میانبر»",
  },
  {
    id: "c" as const,
    src: "/logo-preview/c-shield.png",
    name: "C · سپر و آذرخش",
    desc: "امنیت VPN + سرعت، ترکیب فیروزه‌ای و طلایی",
  },
];

export function LogoPicker() {
  const [picked, setPicked] = useState<"a" | "b" | "c" | null>(null);

  return (
    <div
      dir="rtl"
      className="mt-6 rounded-2xl border border-glow/30 bg-card p-4 shadow-[0_0_24px_-8px_var(--mb-glow)]"
      data-testid="logo-picker"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-glow opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-glow" />
        </span>
        <h2 className="text-base font-extrabold">لوگوی جدید اپ — کدوم رو دوست داری؟</h2>
      </div>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
        سه کانسپت با همون پالت طراحی جدید (شب، فیروزه‌ای، طلایی). روی هرکدوم بزن تا انتخاب بشه.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {CANDIDATES.map((c) => {
          const active = picked === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setPicked(c.id)}
              className={
                "group relative flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all " +
                (active
                  ? "border-glow bg-glow/10 shadow-[0_0_18px_-4px_var(--mb-glow)]"
                  : "border-border bg-background/40 hover:border-glow/50")
              }
            >
              {active && (
                <span className="absolute -top-2 -left-2 grid size-6 place-items-center rounded-full bg-glow text-[oklch(0.2_0.05_200)] shadow">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              )}
              <span className="block aspect-square w-full overflow-hidden rounded-[26%] ring-1 ring-ink/10">
                <Image
                  src={c.src}
                  alt={`لوگو ${c.name}`}
                  width={256}
                  height={256}
                  className="size-full object-cover"
                />
              </span>
              <span className="text-center text-xs leading-5">
                <b className="block font-bold">{c.name}</b>
                <span className="text-muted-foreground">{c.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm leading-6">
        <MessageCircle className="mt-1 size-4 shrink-0 text-gold" />
        <span>
          {picked ? (
            <>
              انتخابت: <b className="font-mono text-foreground">{picked.toUpperCase()}</b> — حالا توی چت بگو «
              {picked.toUpperCase()}» تا آیکون لانچر اپ اندروید و لوگوی سایت رو با همون جایگزین کنم.
            </>
          ) : (
            <>بعد از انتخاب، حرفش رو توی چت بگو (مثلاً «B») — یا اگه تغییری می‌خوای بگو تا نسخه جدید بسازم.</>
          )}
        </span>
      </div>
    </div>
  );
}
