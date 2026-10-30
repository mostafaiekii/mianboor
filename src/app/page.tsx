"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  CreditCard,
  Eye,
  Fingerprint,
  Gauge,
  Gift,
  GitBranch,
  Globe,
  Hand,
  Home,
  ListPlus,
  Lock,
  Palette,
  RotateCcw,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HomeScreen, ServersScreen, AccountScreen, UsageSheet, type UsageRow } from "@/components/demo/user-screens";
import { SettingsScreen } from "@/components/demo/settings-screen";
import { SplitScreen } from "@/components/demo/split-screen";
import { PlansSheet } from "@/components/demo/plans-sheet";
import { ReferralScreen, type RefFriend, REF_CODE, REF_LINK } from "@/components/demo/referral-screen";
import { SupportChatScreen } from "@/components/demo/support-chat";
import { AdminLogin, AdminPanel } from "@/components/demo/admin-screens";
import { tr, tpl, type Lang } from "@/components/demo/i18n";
import { THEMES, type ThemeName } from "@/components/demo/themes";
import {
  FREE_QUOTA_GB,
  PLAN_DAYS,
  type ConfigItem,
  type DeviceRecord,
  type Entitlement,
  type Order,
  type PlanId,
  type Screen,
  type SplitState,
  type VpnState,
} from "@/components/demo/types";

const HOLD_MS = 5000;
const DEMO_USER = "admin";
const DEMO_PASS = "Mianboor@2026";
const PING_MS = 3000;
const DEVICE_ID = "MB-7F3A-92K1";
const RELEASES_URL = "https://github.com/mostafaiekii/mianboor/releases/latest";

/** کشور مبدا کاربر — در اپ واقعی قبل از اتصال از ipwho.is گرفته می‌شود؛ اینجا ماک دمو */
const ORIGIN = { ip: "5.160.42.117", country: "ir" };

/** مصرف به تفکیک اپ (دمو) — در اپ واقعی: TrafficStats به تفکیک UID */
const DEMO_BY_APP: UsageRow[] = [
  { label: "Telegram", mb: 612, icon: "tg" },
  { label: "Chrome", mb: 348, icon: "web" },
  { label: "Instagram", mb: 214, icon: "cam" },
  { label: "YouTube", mb: 88, icon: "play" },
  { label: "System", mb: 31, icon: "sys" },
];

/** مصرف به تفکیک سرور (دمو) — در اپ واقعی: آمار سشن VPN هر سرور */
const DEMO_BY_SERVER: UsageRow[] = [
  { label: "Germany - Frankfurt", mb: 842, flag: "de" },
  { label: "Netherlands - Amsterdam", mb: 244, flag: "nl" },
  { label: "Finland - Helsinki", mb: 157, flag: "fi" },
];

const SEED: ConfigItem[] = [
  { id: 1, name: "Netherlands - Amsterdam", country: "nl", protocol: "VLESS", host: "nl1.mianboor.app", ping: 28, premium: false, enabled: true },
  { id: 2, name: "Germany - Frankfurt", country: "de", protocol: "VLESS", host: "de1.mianboor.app", ping: 32, premium: false, enabled: true },
  { id: 3, name: "Finland - Helsinki", country: "fi", protocol: "VMESS", host: "fi1.mianboor.app", ping: 41, premium: false, enabled: true },
  { id: 4, name: "United Kingdom - London", country: "gb", protocol: "Trojan", host: "uk1.mianboor.app", ping: 45, premium: true, enabled: true },
  { id: 5, name: "Turkey - Istanbul", country: "tr", protocol: "VLESS", host: "tr1.mianboor.app", ping: 58, premium: true, enabled: true },
  { id: 6, name: "USA - New York", country: "us", protocol: "Shadowsocks", host: "us1.mianboor.app", ping: 120, premium: true, enabled: false },
];

const seedPings = (): Record<number, number> =>
  Object.fromEntries(SEED.map((c) => [c.id, c.ping]));

const freshDevices = (): DeviceRecord[] => [
  { id: DEVICE_ID, premium: false, trialUsed: false, reinstalls: 0, seen: "just now" },
  { id: "MB-2K8D-41F7", premium: false, trialUsed: true, reinstalls: 1, seen: "2h ago" },
  { id: "MB-9Q3L-77XE", premium: true, premiumUntil: Date.now() + 40 * 86400_000, trialUsed: true, reinstalls: 0, seen: "yesterday" },
];

/* دمو: دوستان دعوت‌شده اولیه + روزهای هدیه در انتظار (۱۰ از خرید پرمیوم + ۳ از ورود) */
const freshFriends = (): RefFriend[] => [
  { name: "Amir H.", agoMin: 2880, bought: true, days: 10 },
  { name: "Sara M.", agoMin: 1440, bought: false, days: 3 },
];
const SIM_NAMES = ["Ali R.", "Nima K.", "Mahdi S.", "Reza T.", "Hossein F.", "Kian V.", "Pouya J."];

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
  const [pings, setPings] = useState<Record<number, number>>(seedPings);
  const [pingLive, setPingLive] = useState(true);
  const [lang, setLang] = useState<Lang>("en");
  const [theme, setTheme] = useState<ThemeName>("midnight");
  const [selectedId, setSelectedId] = useState<number | null>(2);
  const [vpn, setVpn] = useState<VpnState>("off");
  const [seconds, setSeconds] = useState(0);
  const [hold, setHold] = useState(0);
  const [pass, setPass] = useState(DEMO_PASS);
  const [unlocked, setUnlocked] = useState(false);
  const [plans, setPlans] = useState<null | "renew" | "premium-lock" | "trial-over">(null);
  const [entitlement, setEntitlement] = useState<Entitlement>({ plan: "free" });
  const [orders, setOrders] = useState<Order[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>(freshDevices);
  const [trialLocked, setTrialLocked] = useState(false);
  const [usedGb, setUsedGb] = useState(1.2);
  const [split, setSplit] = useState<SplitState>({ mode: "exclude", apps: [] });
  const [friends, setFriends] = useState<RefFriend[]>(freshFriends);
  const [giftDays, setGiftDays] = useState(13);
  const [toast, setToast] = useState<{ msg: string; k: number } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncOk, setSyncOk] = useState<boolean | null>(null);
  const [usageOpen, setUsageOpen] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [updateBanner, setUpdateBanner] = useState(false);

  const t = tr(lang);
  const holdStart = useRef(0);
  const raf = useRef(0);
  const fired = useRef(false);

  const premium = entitlement.plan !== "free";

  const showToast = (msg: string) => setToast({ msg, k: Date.now() });

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(id);
  }, [toast]);

  /* ── موتور پینگ زنده: هر ۳ ثانیه دوباره اندازه‌گیری می‌شه ── */
  useEffect(() => {
    if (!pingLive) return;
    const id = setInterval(() => {
      setPings((prev) => {
        const next = { ...prev };
        for (const c of configs) {
          if (!c.enabled) continue;
          const jitter = 0.85 + Math.random() * 0.35;
          const spike = Math.random() < 0.06 ? 1.6 : 1;
          next[c.id] = Math.max(9, Math.round(c.ping * jitter * spike));
        }
        return next;
      });
    }, PING_MS);
    return () => clearInterval(id);
  }, [pingLive, configs]);

  /* ── کانفیگ‌های تازه‌اضافه‌شده (از پنل مدیر) وارد چرخه پینگ می‌شن ── */
  useEffect(() => {
    setPings((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const c of configs) {
        if (next[c.id] === undefined) {
          next[c.id] = c.ping;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [configs]);

  useEffect(() => {
    if (vpn !== "on") return;
    const id = setInterval(() => {
      setSeconds((s) => s + 1);
      setUsedGb((u) => (premium ? u : Math.min(FREE_QUOTA_GB, u + 0.015)));
    }, 1000);
    return () => clearInterval(id);
  }, [vpn, premium]);

  /* ── فلش لحظه اتصال: «از ایران به آلمان وصل شدی» — چند ثانیه بعد محو می‌شه ── */
  useEffect(() => {
    if (vpn !== "on") return;
    setShowFlash(true);
    const id = setTimeout(() => setShowFlash(false), 4500);
    return () => clearTimeout(id);
  }, [vpn]);

  /* ── بنر نسخهٔ جدید (دمو: بعد از چند ثانیه می‌آید؛ اپ واقعی: چکر GitHub Releases) ── */
  useEffect(() => {
    const id = setTimeout(() => setUpdateBanner(true), 2500);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!configs.find((c) => c.id === selectedId && c.enabled)) {
      const first = configs.find((c) => c.enabled);
      setSelectedId(first ? first.id : null);
    }
  }, [configs, selectedId]);

  /* ── کانفیگ‌های زنده: پینگ لحظه‌ای جای پایه رو می‌گیره ── */
  const liveConfigs: ConfigItem[] = configs.map((c) => ({ ...c, ping: pings[c.id] ?? c.ping }));
  const server = liveConfigs.find((c) => c.id === selectedId) ?? null;

  const toggleVpn = () => {
    if (vpn === "on" || vpn === "connecting") {
      setVpn("off");
      setSeconds(0);
      return;
    }
    if (!server) return;
    if (!premium && trialLocked) {
      setPlans("trial-over");
      showToast(t.trialOverUpsell);
      return;
    }
    setVpn("connecting");
    setTimeout(() => setVpn((v) => (v === "connecting" ? "on" : v)), 1400);
  };

  /* ── رفرش سرورها — شبیه‌سازی sync با سرور اصلی (در اپ واقعی از API می‌آید) ── */
  const refreshServers = () => {
    if (syncing) return;
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSyncOk(true);
      showToast(t.syncDoneToast);
    }, 900);
  };

  /* ── خرید: سفارش ثبت می‌شه، ادمین از تب Orders تأیید می‌کنه ── */
  const createOrder = (plan: PlanId, via: "gateway" | "telegram"): string => {
    const id = `MB-${Math.floor(1000 + Math.random() * 9000)}`;
    setOrders((os) => [{ id, plan, price: plan === "p1" ? 200000 : plan === "p3" ? 400000 : 700000, device: DEVICE_ID, via, at: Date.now(), status: "pending" }, ...os]);
    showToast(t.orderPlacedToast);
    return id;
  };

  const approveOrder = (id: string) => {
    const o = orders.find((x) => x.id === id);
    if (!o) return;
    setOrders((os) => os.map((x) => (x.id === id ? { ...x, status: "approved" } : x)));
    setEntitlement({ plan: o.plan, expiresAt: Date.now() + PLAN_DAYS[o.plan] * 86400_000 });
    showToast(t.orderApprovedToast);
  };

  const rejectOrder = (id: string) => {
    setOrders((os) => os.map((x) => (x.id === id ? { ...x, status: "rejected" } : x)));
    showToast(t.orderRejectedToast);
  };

  /* ── پرمیوم‌کردن مستقیم دستگاه (خرید تلگرامی) — days=0 یعنی لغو ── */
  const devicePremium = (id: string, days: number) => {
    setDevices((ds) =>
      ds.map((d) =>
        d.id === id
          ? {
              ...d,
              premium: days > 0,
              premiumUntil: days > 0 ? Math.max(Date.now(), d.premiumUntil ?? 0) + days * 86400_000 : undefined,
            }
          : d,
      ),
    );
    if (id === DEVICE_ID) {
      setEntitlement(
        days > 0
          ? { plan: "p3", expiresAt: Math.max(Date.now(), entitlement.expiresAt ?? 0) + days * 86400_000 }
          : { plan: "free" },
      );
    }
  };

  /* ── ضدچیت: شبیه‌سازی نصب مجدد — دوره رایگان روی دستگاه قفل می‌مونه ── */
  const reinstall = () => {
    setTrialLocked(true);
    setUsedGb(FREE_QUOTA_GB);
    setVpn("off");
    setSeconds(0);
    setScreen("home");
    setDevices((ds) => ds.map((d) => (d.id === DEVICE_ID ? { ...d, trialUsed: true, reinstalls: d.reinstalls + 1 } : d)));
    showToast(t.reinstallDoneToast);
  };

  const copyDevice = () => {
    navigator.clipboard?.writeText(DEVICE_ID).catch(() => {});
    showToast(t.copied);
  };

  /* ── Referral: دریافت روزهای هدیه → به‌شکل زمان پرمیوم به حسابت اضافه می‌شه ── */
  const claimGift = (days: number) => {
    setEntitlement((e) =>
      e.plan === "free"
        ? { plan: "p1", expiresAt: Date.now() + days * 86400_000 }
        : { ...e, expiresAt: Math.max(Date.now(), e.expiresAt ?? 0) + days * 86400_000 },
    );
    setGiftDays(0);
    showToast(t.giftClaimedToast);
  };

  /* ── Referral (دمو): ورود یه دوست جدید → ۳ روز؛ اگه پرمیوم بخره ۱۰ روز ── */
  const simFriend = () => {
    const bought = Math.random() < 0.35;
    const days = bought ? 10 : 3;
    const name = SIM_NAMES.find((n) => !friends.some((f) => f.name === n)) ?? `Friend #${friends.length + 1}`;
    setFriends((f) => [{ name, agoMin: 0, bought, days }, ...f]);
    setGiftDays((g) => g + days);
    showToast(tpl(t.giftPlusToast, days));
  };

  const copyRef = (what: "code" | "link") => {
    navigator.clipboard?.writeText(what === "code" ? REF_CODE : REF_LINK).catch(() => {});
    showToast(t.copied);
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
    setPings(seedPings());
    setSelectedId(2);
    setVpn("off");
    setSeconds(0);
    setPass(DEMO_PASS);
    setUnlocked(false);
    setPlans(null);
    setEntitlement({ plan: "free" });
    setOrders([]);
    setDevices(freshDevices());
    setTrialLocked(false);
    setUsedGb(1.2);
    setSplit({ mode: "exclude", apps: [] });
    setFriends(freshFriends());
    setGiftDays(13);
    setTheme("midnight");
    setLang("en");
    setSyncOk(null);
    setUsageOpen(false);
    setShowFlash(false);
    setUpdateBanner(false);
  };

  const isAdmin = screen === "login" || screen === "admin";
  const themeVars = THEMES[theme].vars as CSSProperties;
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
    {
      i: Palette,
      t: "چرخ‌دنده بالای خانه → زبان رو فارسی کن و یه تم ملایم (مثلاً جنگل) انتخاب کن",
      done: lang === "fa" || theme !== "midnight",
    },
    {
      i: GitBranch,
      t: "از Account → Split Tunneling چند اپ رو مستثنی کن و نتیجه رو ببین",
      done: split.apps.length > 0,
    },
    {
      i: CreditCard,
      t: "Account → خرید پرمیوم: تعرفه ۳ ماهه ۴۰۰ رو انتخاب و پرداخت کن؛ بعد با ورود مخفی، تب Orders پنل رو بزن و Approve کن",
      done: premium,
    },
    {
      i: Fingerprint,
      t: "تنظیمات → شبیه‌سازی نصب مجدد: ببین حجم رایگان روی دستگاه قفل می‌مونه (ضدچیت)",
      done: trialLocked,
    },
    {
      i: Gift,
      t: "از Account → دعوت دوستان: «شبیه‌سازی ورود دوست» رو بزن، روز هدیه جمع کن و Claim کن؛ بعد Support رو باز کن و با دستیار هوشمند چت کن",
      done: friends.length > freshFriends().length && giftDays === 0,
    },
  ];

  return (
    <main dir="ltr" className="@container min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-12 px-6 py-12 @4xl:flex-row @4xl:items-start @4xl:justify-center">
        {/* ── راهنمای فارسی ── */}
        <section dir="rtl" className="w-full max-w-sm @4xl:sticky @4xl:top-12 @4xl:order-2">
          <div className="font-display text-sm font-bold tracking-widest text-primary">MIANBOOR VPN · DEMO</div>
          <h1 className="mt-3 text-4xl leading-tight font-black">اپ کامل: خرید، ضدچیت، تم</h1>
          <p className="mt-3 text-base leading-8 text-muted-foreground">
            ماهی ۵ گیگ رایگان؛ تعرفه‌های ۱ ماهه ۲۰۰ / ۳ ماهه ۴۰۰ / ۶ ماهه ۷۰۰ هزار تومان. خرید که ثبت می‌شه،
            سفارش می‌ره پنل مدیر (تب Orders) و با تأیید تو، کاربر همون لحظه پرمیوم می‌شه.
          </p>
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-border bg-card p-4 text-sm leading-7 text-muted-foreground">
            <Gauge className="mt-1 size-4 shrink-0 text-primary" />
            <span>
              پینگ‌ها هر ۳ ثانیه زنده به‌روز می‌شن و اتصال هوشمند واقعاً کم‌پینگ‌ترین سرور آزاد رو انتخاب می‌کنه.
              تونل‌گذاری انتخابی واقعاً کار می‌کنه (Exclude / Include). دوره رایگان به شناسه دستگاه قفله —
              «شبیه‌سازی نصب مجدد» توی تنظیمات امتحانش کن. تم‌های ملایم هم توی چرخ‌دنده‌ست.
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-gold/30 bg-gold/10 p-4 text-sm leading-7 text-muted-foreground">
            <b className="text-foreground">پرمیوم‌کردن کاربر:</b> کاربر از Account → خرید پرمیوم تعرفه رو انتخاب و پرداخت
            می‌کنه؛ سفارشش با شناسه دستگاه توی تب <b className="text-foreground">Orders</b> پنل مدیر ظاهر می‌شه — دکمه
            «Approve premium» رو بزنی، حسابش پرمیوم می‌شه.
          </div>

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
              style={themeVars}
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
                    lang={lang}
                    state={vpn}
                    onToggle={toggleVpn}
                    seconds={seconds}
                    server={server}
                    warn={!premium && trialLocked ? t.trialOverUpsell : null}
                    onPickServer={() => setScreen("servers")}
                    onOpenSettings={() => setScreen("settings")}
                    origin={ORIGIN}
                    showFlash={showFlash}
                    update={
                      updateBanner
                        ? { version: "1.6.0", url: RELEASES_URL, onUpdate: () => setUpdateBanner(false), onDismiss: () => setUpdateBanner(false) }
                        : null
                    }
                  />
                )}
                {screen === "servers" && (
                  <ServersScreen
                    lang={lang}
                    configs={liveConfigs}
                    selectedId={selectedId}
                    premiumUser={premium}
                    syncing={syncing}
                    syncOk={syncOk}
                    onRefresh={refreshServers}
                    onSelect={(id) => {
                      setSelectedId(id);
                      setScreen("home");
                    }}
                    onPremiumTap={() => setPlans("premium-lock")}
                    onBack={() => setScreen("home")}
                  />
                )}
                {screen === "account" && (
                  <AccountScreen
                    lang={lang}
                    entitlement={entitlement}
                    trialLocked={trialLocked}
                    usedGb={usedGb}
                    split={split}
                    deviceId={DEVICE_ID}
                    onOpenSplit={() => setScreen("split")}
                    onUpgrade={() => setPlans("renew")}
                    onCopyDevice={copyDevice}
                    onOpenUsage={() => setUsageOpen(true)}
                    onOpenInvite={() => setScreen("referral")}
                    onOpenSupport={() => setScreen("support")}
                  />
                )}
                {screen === "referral" && (
                  <ReferralScreen
                    lang={lang}
                    friends={friends}
                    giftDays={giftDays}
                    onClaim={claimGift}
                    onSimFriend={simFriend}
                    onCopy={copyRef}
                    onBack={() => setScreen("account")}
                  />
                )}
                {screen === "support" && (
                  <SupportChatScreen lang={lang} onBack={() => setScreen("account")} />
                )}
                {screen === "settings" && (
                  <SettingsScreen
                    lang={lang}
                    setLang={setLang}
                    theme={theme}
                    setTheme={setTheme}
                    pingLive={pingLive}
                    setPingLive={setPingLive}
                    onReinstall={reinstall}
                    onBack={() => setScreen("home")}
                  />
                )}
                {screen === "split" && (
                  <SplitScreen lang={lang} split={split} setSplit={setSplit} onBack={() => setScreen("account")} />
                )}
                {screen === "login" && (
                  <AdminLogin
                    check={(u, p) => u === DEMO_USER && p === pass}
                    onSuccess={() => {
                      setUnlocked(true);
                      setScreen("admin");
                      /* ادمین که وارد می‌شه، سفارش‌های در انتظار بهش اعلام می‌شه */
                      const n = orders.filter((o) => o.status === "pending").length;
                      if (n > 0) showToast(t.pendingOrders.replace("{n}", String(n)));
                    }}
                    onCancel={() => setScreen("account")}
                  />
                )}
                {screen === "admin" && (
                  <AdminPanel
                    configs={configs}
                    setConfigs={setConfigs}
                    orders={orders}
                    devices={devices}
                    ownDeviceId={DEVICE_ID}
                    onApprove={approveOrder}
                    onReject={rejectOrder}
                    onDevicePremium={devicePremium}
                    onChangePass={setPass}
                    onExit={() => {
                      setUnlocked(false);
                      setScreen("account");
                    }}
                  />
                )}
              </div>

              {plans && (
                <PlansSheet lang={lang} reason={plans} onClose={() => setPlans(null)} onCreateOrder={createOrder} />
              )}

              {usageOpen && (
                <UsageSheet
                  lang={lang}
                  usedGb={usedGb}
                  totalText={premium ? t.unlimited : `${FREE_QUOTA_GB} GB`}
                  byApp={DEMO_BY_APP}
                  byServer={DEMO_BY_SERVER}
                  onClose={() => setUsageOpen(false)}
                />
              )}

              {toast && (
                <div className="pointer-events-none absolute inset-x-0 top-12 z-40 flex justify-center px-6">
                  <span
                    key={toast.k}
                    className="screen-in max-w-full rounded-full bg-ink px-4 py-2 text-center text-sm font-semibold text-night shadow-lg"
                  >
                    {toast.msg}
                  </span>
                </div>
              )}

              {!isAdmin && (
                <nav dir="ltr" className="relative mx-3 mb-2 flex rounded-3xl border border-panel-edge bg-panel/80 px-2">
                  <NavBtn icon={Home} label={t.home} active={screen === "home"} onClick={() => setScreen("home")} />
                  <NavBtn icon={Globe} label={t.servers} active={screen === "servers"} onClick={() => setScreen("servers")} />
                  <NavBtn
                    icon={User}
                    label={t.account}
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
