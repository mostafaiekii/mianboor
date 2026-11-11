"use client";

/**
 * سوییچر دمو: نسخهٔ اندروید (دموی قبلی) ↔ نسخهٔ ویندوز (جدید)
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import WindowsDemo from "./windows-demo";

const DemoApp = dynamic(() => import("./demo-app"), { ssr: false });

type Tab = "windows" | "android";

export default function DemoSwitcher() {
  const [tab, setTab] = useState<Tab>("windows");

  return (
    <div className="flex flex-col gap-6">
      {/* تب‌ها */}
      <div className="mx-auto flex w-full max-w-md rounded-full border border-white/10 bg-white/5 p-1">
        <button
          onClick={() => setTab("windows")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-bold transition ${
            tab === "windows" ? "bg-emerald-500 text-black" : "text-zinc-300 hover:text-white"
          }`}
          aria-pressed={tab === "windows"}
        >
          دموی نسخهٔ ویندوز (exe)
        </button>
        <button
          onClick={() => setTab("android")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-bold transition ${
            tab === "android" ? "bg-emerald-500 text-black" : "text-zinc-300 hover:text-white"
          }`}
          aria-pressed={tab === "android"}
        >
          دموی اپ اندروید
        </button>
      </div>

      {tab === "windows" ? <WindowsDemo /> : <DemoApp />}
    </div>
  );
}
