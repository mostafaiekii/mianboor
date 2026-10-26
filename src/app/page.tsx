"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Power,
  Send,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react";
import AdminPanel from "@/components/admin-panel";

type Status = "idle" | "scanning" | "connecting" | "connected" | "disconnecting";

interface Server {
  country: string;
  city: string;
  flag: string;
  ping: number;
  load: number;
}

const SERVERS: Server[] = [
  { country: "فنلاند", city: "هلسینکی", flag: "🇫🇮", ping: 24, load: 14 },
  { country: "آلمان", city: "فرانکفورت", flag: "🇩🇪", ping: 31, load: 27 },
  { country: "هلند", city: "آمستردام", flag: "🇳🇱", ping: 36, load: 21 },
  { country: "فرانسه", city: "پاریس", flag: "🇫🇷", ping: 42, load: 33 },
  { country: "ترکیه", city: "استانبول", flag: "🇹🇷", ping: 47, load: 58 },
  { country: "امارات", city: "دبی", flag: "🇦🇪", ping: 55, load: 37 },
  { country: "انگلیس", city: "لندن", flag: "🇬🇧", ping: 63, load: 44 },
  { country: "آمریکا", city: "نیویورک", flag: "🇺🇸", ping: 112, load: 49 },
];

const SCAN_MSGS = [
  "داریم سریع‌ترین سرور رو پیدا می‌کنیم…",
  "تست پینگ سرورهای نزدیک…",
];
const CONNECT_MSGS = [
  "سریع‌ترین سرور پیدا شد ✓",
  "در حال برقراری تونل امن…",
  "فعال‌سازی رمزنگاری…",
  "الان وصل میشی…",
];
const DISCONNECT_MSG = "در حال قطع اتصال…";
const IDLE_MSG = "برای اتصال لمس کن";

const faNum = (n: number) => n.toLocaleString("fa-IR");

const PARTICLES = [
  { x: "12%", y: "20%", s: 3, d: 5, del: 0 },
  { x: "84%", y: "15%", s: 4, d: 6, del: 1.1 },
  { x: "72%", y: "62%", s: 3, d: 5.5, del: 0.6 },
  { x: "18%", y: "74%", s: 2, d: 4.5, del: 1.6 },
  { x: "90%", y: "42%", s: 2, d: 6.5, del: 2 },
  { x: "6%", y: "46%", s: 2, d: 5.2, del: 0.3 },
];

export default function VpnDemoPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [phaseMsg, setPhaseMsg] = useState(SCAN_MSGS[0]);
  const [flicker, setFlicker] = useState<Server | null>(null);
  const [server, setServer] = useState<Server | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [down, setDown] = useState(0);
  const [up, setUp] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => () => clearTimers(), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  /* ── پیام‌های حین اتصال ── */
  useEffect(() => {
    if (status !== "scanning" && status !== "connecting") return;
    const list = status === "scanning" ? SCAN_MSGS : CONNECT_MSGS;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % list.length;
      setPhaseMsg(list[i]);
    }, 850);
    return () => clearInterval(id);
  }, [status]);

  /* ── چشمک زدن سرورها حین اسکن ── */
  useEffect(() => {
    if (status !== "scanning") return;
    const id = setInterval(() => {
      const s = SERVERS[Math.floor(Math.random() * SERVERS.length)];
      setFlicker({ ...s, ping: s.ping + Math.floor(Math.random() * 9 - 4) });
    }, 110);
    return () => clearInterval(id);
  }, [status]);

  /* ── تایمر مدت اتصال ── */
  useEffect(() => {
    if (status !== "connected") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  /* ── سرعت‌های نوسانی ── */
  useEffect(() => {
    if (status !== "connected") return;
    const id = setInterval(() => {
      setDown((d) =>
        Math.max(72, Math.min(128, d + Math.floor(Math.random() * 11 - 5)))
      );
      setUp((u) =>
        Math.max(24, Math.min(52, u + Math.floor(Math.random() * 7 - 3)))
      );
    }, 1200);
    return () => clearInterval(id);
  }, [status]);

  const connect = () => {
    clearTimers();
    setPhaseMsg(SCAN_MSGS[0]);
    setStatus("scanning");
    later(() => {
      // پشت صحنه: انتخاب سریع‌ترین سرور بر اساس پینگ + کمی نویز واقعی
      let best = SERVERS[0];
      let bestScore = Infinity;
      for (const s of SERVERS) {
        const score = s.ping + Math.random() * 8;
        if (score < bestScore) {
          bestScore = score;
          best = s;
        }
      }
      setServer({
        ...best,
        ping: best.ping + Math.floor(Math.random() * 5),
        load: Math.max(5, best.load + Math.floor(Math.random() * 11 - 5)),
      });
      setPhaseMsg(CONNECT_MSGS[0]);
      setStatus("connecting");
      later(() => {
        setSeconds(0);
        setDown(96);
        setUp(38);
        setStatus("connected");
      }, 2600);
    }, 1700);
  };

  const disconnect = () => {
    clearTimers();
    setStatus("disconnecting");
    later(() => {
      setStatus("idle");
      setServer(null);
      setFlicker(null);
      setSeconds(0);
      setDown(0);
      setUp(0);
    }, 900);
  };

  const handleClick = () => {
    if (status === "idle") connect();
    else if (status === "connected") disconnect();
  };

  const msg =
    status === "idle"
      ? IDLE_MSG
      : status === "disconnecting"
        ? DISCONNECT_MSG
        : phaseMsg;

  const busy = status === "scanning" || status === "connecting";
  const connected = status === "connected";

  const btnSkin = connected
    ? "border-emerald-300/90 bg-gradient-to-b from-emerald-400/25 to-emerald-600/10 text-emerald-100 shadow-[0_0_90px_-5px_rgba(0,255,157,0.85),inset_0_0_45px_rgba(0,255,157,0.35)]"
    : busy
      ? "border-emerald-300/60 bg-emerald-500/10 text-emerald-200 shadow-[0_0_50px_-8px_rgba(0,255,157,0.6),inset_0_0_25px_rgba(0,255,157,0.18)]"
      : "border-emerald-400/25 bg-emerald-950/20 text-emerald-300/50 shadow-[0_0_35px_-12px_rgba(0,255,157,0.4)]";

  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  const timerText = `${faNum(mm)}:${faNum(ss).padStart(2, "۰")}`;

  const badge =
    connected
      ? { text: "متصل", dot: "bg-emerald-400", ring: "shadow-[0_0_10px_rgba(0,255,157,0.9)]" }
      : busy
        ? { text: "در حال اتصال…", dot: "bg-amber-300", ring: "shadow-[0_0_10px_rgba(252,211,77,0.9)]" }
        : status === "disconnecting"
          ? { text: "در حال قطع…", dot: "bg-amber-300", ring: "" }
          : { text: "آماده", dot: "bg-zinc-500", ring: "" };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#010402] text-emerald-50 flex flex-col">
      {/* ── پس‌زمینه نئون ── */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="neon-grid absolute inset-0"
          style={{
            maskImage:
              "radial-gradient(ellipse 95% 75% at 50% 32%, black 25%, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 95% 75% at 50% 32%, black 25%, transparent 78%)",
          }}
        />
        {/* هاله پشت دکمه */}
        <motion.div
          className="absolute left-1/2 top-[24%] h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(0,255,157,0.16) 0%, rgba(0,255,157,0.05) 45%, transparent 70%)",
          }}
          animate={
            connected
              ? { scale: [1, 1.18, 1], opacity: [0.9, 1, 0.9] }
              : { scale: [1, 1.05, 1], opacity: [0.45, 0.6, 0.45] }
          }
          transition={{ duration: connected ? 2.4 : 4.5, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* ذرات شناور */}
        {PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-emerald-300"
            style={{ left: p.x, top: p.y, width: p.s, height: p.s }}
            animate={{ y: [0, -20, 0], opacity: [0.15, 0.85, 0.15] }}
            transition={{
              duration: p.d,
              repeat: Infinity,
              delay: p.del,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-7 pb-5">
        {/* ── هدر ── */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10 shadow-[0_0_18px_-4px_rgba(0,255,157,0.55)]">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
            </div>
            <div className="leading-tight">
              <p className="text-[15px] font-extrabold tracking-tight">میانبر</p>
              <p className="text-[11px] text-emerald-200/50">Mianboor VPN · نسخه آزمایشی</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://t.me/member9"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="پشتیبانی تلگرام — @member9"
              title="پشتیبانی تلگرام"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400/20 bg-white/[0.03] text-emerald-300 backdrop-blur transition-colors hover:border-emerald-400/40 hover:bg-emerald-500/10"
            >
              <Send className="h-4 w-4" />
            </a>
            <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-white/[0.03] px-3 py-1.5 backdrop-blur">
            <span className={`h-2 w-2 rounded-full ${badge.dot} ${badge.ring} ${busy || connected ? "animate-pulse" : ""}`} />
            <span className="text-xs font-medium text-emerald-100/80">{badge.text}</span>
            </div>
          </div>
        </header>

        {/* ── پیام وضعیت ── */}
        <div
          className="mt-8 flex h-8 items-center justify-center"
          aria-live="polite"
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={msg}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className={`text-sm font-medium sm:text-base ${
                connected ? "text-emerald-300" : "text-emerald-100/75"
              }`}
            >
              {msg}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* ── دکمه بزرگ نئون ── */}
        <section className="mt-4 flex justify-center">
          <div className="relative h-56 w-56 sm:h-64 sm:w-64">
            {/* حلقه‌های پخش‌شونده وقتی وصل هستیم */}
            {connected &&
              [0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border border-emerald-400/50"
                  animate={{ scale: [1, 1.55], opacity: [0.65, 0] }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    delay: i * 0.7,
                    ease: "easeOut",
                  }}
                />
              ))}

            {/* قوس‌های چرخان حین اتصال */}
            {busy && (
              <>
                <motion.svg
                  className="absolute -inset-3 h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)]"
                  viewBox="0 0 100 100"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="47.5"
                    fill="none"
                    stroke="rgba(0,255,157,0.9)"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeDasharray="70 228"
                  />
                </motion.svg>
                <motion.svg
                  className="absolute -inset-6 h-[calc(100%+3rem)] w-[calc(100%+3rem)]"
                  viewBox="0 0 100 100"
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 3.4, ease: "linear" }}
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="48.5"
                    fill="none"
                    stroke="rgba(45,212,191,0.45)"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeDasharray="34 271"
                  />
                </motion.svg>
              </>
            )}

            {/* خود دکمه */}
            <motion.button
              onClick={handleClick}
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.02 }}
              aria-label={connected ? "قطع اتصال" : "اتصال به سریع‌ترین سرور"}
              className={`absolute inset-0 cursor-pointer rounded-full border backdrop-blur-sm transition-colors duration-500 ${btnSkin}`}
            >
              <span className="absolute inset-4 rounded-full border border-emerald-400/20" />
              <motion.span
                className="absolute inset-0 flex items-center justify-center"
                animate={busy ? { opacity: [0.6, 1, 0.6] } : { opacity: 1 }}
                transition={{ duration: 1, repeat: busy ? Infinity : 0 }}
              >
                <Power
                  className={`h-16 w-16 sm:h-20 sm:w-20 transition-all duration-500 ${
                    connected ? "drop-shadow-[0_0_18px_rgba(0,255,157,0.95)]" : "drop-shadow-[0_0_8px_rgba(0,255,157,0.35)]"
                  }`}
                  strokeWidth={2.2}
                />
              </motion.span>
            </motion.button>
          </div>
        </section>

        {/* ── کارت سرور ── */}
        <section className="mt-8">
          <motion.div
            layout
            className="relative overflow-hidden rounded-2xl border border-emerald-400/15 bg-white/[0.03] p-5 shadow-[0_0_40px_-18px_rgba(0,255,157,0.5)] backdrop-blur-xl"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-emerald-300/60 to-transparent" />

            <AnimatePresence mode="wait">
              {status === "idle" && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-4"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/10">
                    <Zap className="h-6 w-6 text-emerald-300" />
                  </div>
                  <div>
                    <p className="font-bold">سریع‌ترین سرور، خودکار</p>
                    <p className="mt-1 text-xs leading-5 text-emerald-100/55">
                      فقط لمس کن؛ بقیه‌ش با ما. بهترین سرور بر اساس پینگ و بار شبکه انتخاب میشه.
                    </p>
                  </div>
                </motion.div>
              )}

              {status === "scanning" && flicker && (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{flicker.flag}</span>
                      <div>
                        <p className="font-bold">{flicker.country}</p>
                        <p className="text-xs text-emerald-100/50">{flicker.city}</p>
                      </div>
                    </div>
                    <motion.span
                      key={flicker.ping}
                      className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-200"
                    >
                      {faNum(flicker.ping)} ms
                    </motion.span>
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-emerald-950">
                    <motion.div
                      key="scanbar"
                      className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-teal-300 shadow-[0_0_12px_rgba(0,255,157,0.8)]"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.7, ease: "easeInOut" }}
                    />
                  </div>
                </motion.div>
              )}

              {(status === "connecting" || connected) && server && (
                <motion.div
                  key="server"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <motion.span
                        className="text-3xl"
                        animate={connected ? { scale: [1, 1.08, 1] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {server.flag}
                      </motion.span>
                      <div>
                        <p className="text-[11px] text-emerald-300/60">
                          {connected ? "متصل به سریع‌ترین سرور" : "قفل شد روی بهترین سرور"}
                        </p>
                        <p className="text-lg font-extrabold leading-6">
                          {server.country}
                          <span className="mr-1.5 text-sm font-medium text-emerald-100/50">
                            · {server.city}
                          </span>
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                        connected
                          ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-200 shadow-[0_0_14px_-2px_rgba(0,255,157,0.6)]"
                          : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                      }`}
                    >
                      {faNum(server.ping)} ms
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <span className="shrink-0 text-[11px] text-emerald-100/50">بار شبکه</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-emerald-950">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-teal-300"
                        initial={{ width: 0 }}
                        animate={{ width: `${server.load}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-emerald-200/80">
                      {faNum(server.load)}٪
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </section>

        {/* ── آمار اتصال ── */}
        <AnimatePresence>
          {connected && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.35 }}
              className="mt-4"
            >
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-emerald-400/15 bg-white/[0.03] p-3.5 text-center backdrop-blur-xl">
                  <Timer className="mx-auto h-4 w-4 text-emerald-300/80" />
                  <p className="mt-1.5 text-[10px] text-emerald-100/50">زمان اتصال</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums" dir="ltr">
                    {timerText}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-400/15 bg-white/[0.03] p-3.5 text-center backdrop-blur-xl">
                  <ArrowDown className="mx-auto h-4 w-4 text-emerald-300/80" />
                  <p className="mt-1.5 text-[10px] text-emerald-100/50">دانلود</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums">
                    {faNum(down)}
                    <span className="text-[9px] font-normal text-emerald-100/40"> Mbps</span>
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-400/15 bg-white/[0.03] p-3.5 text-center backdrop-blur-xl">
                  <ArrowUp className="mx-auto h-4 w-4 text-emerald-300/80" />
                  <p className="mt-1.5 text-[10px] text-emerald-100/50">آپلود</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums">
                    {faNum(up)}
                    <span className="text-[9px] font-normal text-emerald-100/40"> Mbps</span>
                  </p>
                </div>
              </div>

              {/* کیفیت اتصال */}
              <div className="mt-3 flex items-center justify-between rounded-2xl border border-emerald-400/15 bg-white/[0.03] px-4 py-3 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-300/80" />
                  <span className="text-xs text-emerald-100/60">کیفیت اتصال</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex items-end gap-0.5" dir="ltr">
                    {[6, 9, 12, 15].map((h, i) => (
                      <motion.span
                        key={h}
                        className="w-1 rounded-sm bg-emerald-300"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.18 }}
                        style={{ height: h }}
                      />
                    ))}
                  </div>
                  <span className="bg-gradient-to-l from-emerald-300 to-teal-200 bg-clip-text text-sm font-extrabold text-transparent">
                    عالی
                  </span>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── فوتر + پنل مخفی مدیر ── */}
        <AdminPanel />
      </main>
    </div>
  );
}
