"use client";

import { useEffect, useRef, useState } from "react";
import { Hand, Home, Globe, ListPlus, Lock, RotateCcw, User, Eye } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HomeScreen, ServersScreen, AccountScreen } from "@/components/demo/user-screens";
import { AdminLogin, AdminPanel } from "@/components/demo/admin-screens";
import type { ConfigItem, Screen, VpnState } from "@/components/demo/types";

const HOLD_MS = 5000;
const DEMO_USER = "admin";
const DEMO_PASS = "Mianboor@2026";

const SEED: ConfigItem[] = [
  { id: 1, name: "Netherlands - Amsterdam", country: "nl", protocol: "VLESS", host: "nl1.mianboor.app", ping: 28, premium: false, enabled: true },
  { id: 2, name: "Germany - Frankfurt", country: "de", protocol: "VLESS", host: "de1.mianboor.app", ping: 32, premium: false, enabled: true },
  { id: 3, name: "Finland - Helsinki", country: "fi", protocol: "VMESS", host: "fi1.mianboor.app", ping: 41, premium: false, enabled: true },
  { id: 4, name: "United Kingdom - London", country: "gb", protocol: "Trojan", host: "uk1.mianboor.app", ping: 45, premium: true, enabled: true },
  { id: 5, name: "Turkey - Istanbul", country: "tr", protocol: "VLESS", host: "tr1.mianboor.app", ping: 58, premium: true, enabled: true },
  { id: 6, name: "USA - New York", country: "us", protocol: "Shadowsocks", host: "us1.mianboor.app", ping: 120, premium: true, enabled: false },
];

function NavBtn({
  icon: I,
  label,
  active,
  ...rest
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={
        active
          ? "flex flex-1 select-none flex-col items-center gap-1 py-2 text-glow"
          : "flex flex-1 select-none flex-col items-center gap-1 py-2 text-dim hover:text-ink"
      }
      style={{ WebkitTouchCallout: "none", touchAction: "manipulation" }}
    >
      <I className="size-6" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

export default function VpnDemoPage() {
  const [screen, setScreen] = useState<Screen>("home");
  const [configs, setConfigs] = useState<ConfigItem[]>(SEED);
  const [selectedId, setSelectedId] = useState<number | null>(2);
  const [vpn, setVpn] = useState<VpnState>("off");
  const [seconds, setSeconds] = useState(0);
  const [hold, setHold] = useState(0);
  const [pass, setPass] = useState(DEMO_PASS);
  const [unlocked, setUnlocked] = useState(false);

  const holdStart = useRef(0);
  const raf = useRef(0);
  const fired = useRef(false);

  useEffect(() => {
    if (vpn !== "on") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [vpn]);

  useEffect(() => {
    if (!configs.find((c) => c.id === selectedId && c.enabled)) {
      const first = configs.find((c) => c.enabled);
      setSelectedId(first ? first.id : null);
    }
  }, [configs, selectedId]);

  const server = configs.find((c) => c.id === selectedId) ?? null;

  const toggleVpn = () => {
    if (vpn === "on" || vpn === "connecting") {
      setVpn("off");
      setSeconds(0);
      return;
    }
    if (!server) return;
    setVpn("connecting");
    setTimeout(() => setVpn((v) => (v === "connecting" ? "on" : v)), 1400);
  };

  const tick = () => {
    const p = Math.min(1, (performance.now() - holdStart.current) / HOLD_MS);
    setHold(p);
    if (p >= 1) {
      fired.current = true;
      if (navigator.vibrate) navigator.vibrate(60);
      setHold(0);
      setScreen(unlocked ? "admin" : "login");
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };

  const startHold = () => {
    fired.current = false;
    holdStart.current = performance.now();
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
  };
  const endHold = () => {
    cancelAnimationFrame(raf.current);
    setHold(0);
  };
  const accountClick = () => {
    if (fired.current) {
      fired.current = false;
      return;
    }
    setScreen("account");
  };

  const reset = () => {
    setScreen("home");
    setConfigs(SEED);
    setSelectedId(2);
    setVpn("off");
    setSeconds(0);
    setPass(DEMO_PASS);
    setUnlocked(false);
  };

  const isAdmin = screen === "login" || screen === "admin";
  const steps: { i: LucideIcon; t: React.ReactNode; done: boolean }[] = [
    { i: Hand, t: "روی آیکن Account پایین صفحه ۵ ثانیه انگشتت رو نگه دار", done: isAdmin || unlocked },
    {
      i: Lock,
      t: (
        <>
          وارد شو با <b className="font-mono text-foreground">{DEMO_USER}</b> و{" "}
          <b className="font-mono text-foreground">{pass}</b>
        </>
      ),
      done: unlocked,
    },
    {
      i: ListPlus,
      t: "روی Add config بزن، لینک vless یا vmess رو بچسبون و Save & publish",
      done: configs.length > SEED.length,
    },
    { i: Eye, t: "از پنل خارج شو و توی Servers ببین کانفیگ جدید اومده", done: configs.length > SEED.length && screen === "servers" },
  ];

  return (
    <main dir="ltr" className="@container min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-12 px-6 py-12 @4xl:flex-row @4xl:items-start @4xl:justify-center">
        {/* ── راهنمای فارسی ── */}
        <section dir="rtl" className="w-full max-w-sm @4xl:sticky @4xl:top-12 @4xl:order-2">
          <div className="font-display text-sm font-bold tracking-widest text-primary">MIANBOOR VPN · DEMO</div>
          <h1 className="mt-3 text-4xl leading-tight font-black">ورود مخفی مدیر</h1>
          <p className="mt-3 text-base leading-8 text-muted-foreground">
            کاربر عادی هیچ دکمه یا نشونه‌ای نمی‌بینه. فقط تو می‌دونی کجا رو باید نگه داری.
          </p>

          <div className="mt-6 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">نگه‌داشتن Account</span>
              <span dir="ltr" className="font-display font-bold tabular-nums">
                {(hold * 5).toFixed(1)} / 5s
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gold"
                style={{ width: `${hold * 100}%`, transition: hold === 0 ? "width .2s" : "none" }}
              />
            </div>
            <div className="mt-2 text-sm text-muted-foreground">این نشانگر فقط توی دموئه، توی اپ اصلی نیست.</div>
          </div>

          <ol className="mt-6 flex flex-col gap-4">
            {steps.map((s, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span
                  className={
                    s.done
                      ? "grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
                      : "grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
                  }
                >
                  <s.i className="size-4" />
                </span>
                <span
                  className={
                    s.done
                      ? "pt-1.5 text-base leading-7 text-muted-foreground line-through decoration-primary/60"
                      : "pt-1.5 text-base leading-7"
                  }
                >
                  {s.t}
                </span>
              </li>
            ))}
          </ol>

          <button
            type="button"
            onClick={reset}
            className="mt-8 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-4" /> شروع دوباره دمو
          </button>
        </section>

        {/* ── قاب گوشی ── */}
        <div className="shrink-0 origin-top scale-[0.85] max-sm:-mb-28 sm:scale-100">
          <div className="relative rounded-[52px] bg-[oklch(0.12_0.02_270)] p-3 shadow-[0_40px_80px_-20px_oklch(0.1_0.05_270/0.6)] ring-1 ring-ink/10">
            <div
              className="relative flex h-[760px] w-[370px] max-w-full flex-col overflow-hidden rounded-[42px] bg-night"
              onContextMenu={(e) => e.preventDefault()}
            >
              <div className="pointer-events-none absolute -top-24 left-1/2 size-80 -translate-x-1/2 rounded-full bg-[oklch(0.45_0.12_265/0.35)] blur-3xl" />
              <div className="relative flex items-center justify-between px-7 pt-4 pb-2 font-display text-sm font-semibold text-ink">
                <span>9:41</span>
                <span className="size-4 rounded-full bg-black ring-1 ring-ink/10" />
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-4 rounded-sm border border-ink/80" />
                </span>
              </div>

              <div key={screen} className="screen-in relative flex min-h-0 flex-1 flex-col">
                {screen === "home" && (
                  <HomeScreen
                    state={vpn}
                    onToggle={toggleVpn}
                    seconds={seconds}
                    server={server}
                    onPickServer={() => setScreen("servers")}
                  />
                )}
                {screen === "servers" && (
                  <ServersScreen
                    configs={configs}
                    selectedId={selectedId}
                    onSelect={(id) => {
                      setSelectedId(id);
                      setScreen("home");
                    }}
                    onBack={() => setScreen("home")}
                  />
                )}
                {screen === "account" && <AccountScreen />}
                {screen === "login" && (
                  <AdminLogin
                    check={(u, p) => u === DEMO_USER && p === pass}
                    onSuccess={() => {
                      setUnlocked(true);
                      setScreen("admin");
                    }}
                    onCancel={() => setScreen("account")}
                  />
                )}
                {screen === "admin" && (
                  <AdminPanel
                    configs={configs}
                    setConfigs={setConfigs}
                    onChangePass={setPass}
                    onExit={() => {
                      setUnlocked(false);
                      setScreen("account");
                    }}
                  />
                )}
              </div>

              {!isAdmin && (
                <nav className="relative mx-3 mb-2 flex rounded-3xl border border-panel-edge bg-panel/80 px-2">
                  <NavBtn icon={Home} label="Home" active={screen === "home"} onClick={() => setScreen("home")} />
                  <NavBtn icon={Globe} label="Servers" active={screen === "servers"} onClick={() => setScreen("servers")} />
                  <NavBtn
                    icon={User}
                    label="Account"
                    active={screen === "account"}
                    onClick={accountClick}
                    onPointerDown={startHold}
                    onPointerUp={endHold}
                    onPointerLeave={endHold}
                    onPointerCancel={endHold}
                    data-testid="account-tab"
                  />
                </nav>
              )}
              <div className="relative mx-auto mb-2 h-1 w-28 rounded-full bg-ink/40" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
