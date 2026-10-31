"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Bell,
  Check,
  CreditCard,
  DownloadCloud,
  Fingerprint,
  Gauge,
  Gift,
  GitBranch,
  Globe,
  Home,
  Info,
  Palette,
  Power,
  RotateCcw,
  ShieldCheck,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HomeScreen, ServersScreen, AccountScreen, UsageSheet, type UsageRow } from "@/components/demo/user-screens";
import { SettingsScreen } from "@/components/demo/settings-screen";
import { SplitScreen } from "@/components/demo/split-screen";
import { PlansSheet } from "@/components/demo/plans-sheet";
import { ReferralScreen, type RefFriend, REF_CODE, REF_LINK } from "@/components/demo/referral-screen";
import { SupportChatScreen } from "@/components/demo/support-chat";
import { InboxScreen, KIND_META } from "@/components/demo/inbox-screen";
import { AdminLogin, AdminPanel } from "@/components/demo/admin-screens";
import { tr, tpl, type Lang, type Strings } from "@/components/demo/i18n";
import { THEMES, type ThemeName } from "@/components/demo/themes";
import {
  FREE_QUOTA_GB,
  PLAN_DAYS,
  type ConfigItem,
  type DeviceRecord,
  type Entitlement,
  type Notice,
  type NoticeAudience,
  type NoticeChannel,
  type NoticeKind,
  type Order,
  type OtaModule,
  type OtaRelease,
  type PlanId,
  type Screen,
  type SplitState,
  type VpnState,
} from "@/components/demo/types";

const HOLD_MS = 5000;
/* دروازهٔ ورود دمو — فقط هش؛ هیچ مقدار متنی در سورس نگه داشته نمی‌شه */
const authHash = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
};
const DEMO_AUTH = "1qt9z6z";
const PING_MS = 3000;
const DEVICE_ID = "MB-7F3A-92K1";
const APP_VERSION = "1.6.0";

/** کشور و آی‌پی مبدا کاربر — در اپ واقعی قبل از اتصال از ipwho.is گرفته می‌شود؛ اینجا ماک دمو */
const ORIGIN = { ip: "5.160.42.117", country: "ir" };

/** آی‌پی و کشور مقصد — در اپ واقعی بعد از اتصال، ipwho.is از داخل تونل صدا زده می‌شه */
const DEST = { ip: "49.12.208.71", country: "de" };

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
  { label: "Singapore - Singapore", mb: 96, flag: "sg" },
];

const SEED: ConfigItem[] = [
  { id: 1, name: "Netherlands - Amsterdam", country: "nl", protocol: "VLESS", host: "nl1.mianboor.app", ping: 28, premium: false, enabled: true },
  { id: 2, name: "Germany - Frankfurt", country: "de", protocol: "VLESS", host: "de1.mianboor.app", ping: 32, premium: false, enabled: true },
  { id: 3, name: "Finland - Helsinki", country: "fi", protocol: "VMESS", host: "fi1.mianboor.app", ping: 41, premium: false, enabled: true },
  { id: 4, name: "United Kingdom - London", country: "gb", protocol: "Trojan", host: "uk1.mianboor.app", ping: 45, premium: true, enabled: true },
  { id: 5, name: "Turkey - Istanbul", country: "tr", protocol: "VLESS", host: "tr1.mianboor.app", ping: 58, premium: true, enabled: true },
  { id: 6, name: "USA - New York", country: "us", protocol: "Shadowsocks", host: "us1.mianboor.app", ping: 120, premium: true, enabled: true },
  { id: 7, name: "France - Paris", country: "fr", protocol: "VLESS", host: "fr1.mianboor.app", ping: 38, premium: false, enabled: true },
  { id: 8, name: "Sweden - Stockholm", country: "se", protocol: "VLESS", host: "se1.mianboor.app", ping: 47, premium: false, enabled: true },
  { id: 9, name: "UAE - Dubai", country: "ae", protocol: "VMESS", host: "ae1.mianboor.app", ping: 64, premium: true, enabled: true },
  { id: 10, name: "Singapore - Singapore", country: "sg", protocol: "VLESS", host: "sg1.mianboor.app", ping: 148, premium: true, enabled: true },
  { id: 11, name: "Canada - Toronto", country: "ca", protocol: "Trojan", host: "ca1.mianboor.app", ping: 132, premium: true, enabled: true },
  { id: 12, name: "Japan - Tokyo", country: "jp", protocol: "Shadowsocks", host: "jp1.mianboor.app", ping: 168, premium: true, enabled: true },
];

const seedPings = (): Record<number, number> =>
  Object.fromEntries(SEED.map((c) => [c.id, c.ping]));

const freshDevices = (): DeviceRecord[] => [
  { id: DEVICE_ID, premium: false, trialUsed: false, reinstalls: 0, seen: "just now" },
  { id: "MB-2K8D-41F7", premium: false, trialUsed: true, reinstalls: 1, seen: "2h ago" },
  { id: "MB-9Q3L-77XE", premium: true, premiumUntil: Date.now() + 40 * 86400_000, trialUsed: true, reinstalls: 0, seen: "yesterday" },
];

/* صندوق پیام اولیه: یه پیام خوانده‌شده + یه اعلان هدیه خوانده‌نشده (برای badge) */
const SEED_NOTICES = (): Notice[] => [
  {
    id: "seed-gift",
    title: "🎁 Gift weekend",
    body: "This weekend every friend you invite brings +3 extra gift days — share your code from Account → Invite Friends.",
    kind: "gift",
    audience: "all",
    channels: ["inbox", "push"],
    at: Date.now() - 45 * 60_000,
    read: false,
  },
  {
    id: "seed-welcome",
    title: "Welcome to Mianboor 1.6",
    body: "Faster servers, live pings and this message inbox — announcements from the team land here.",
    kind: "info",
    audience: "all",
    channels: ["inbox"],
    at: Date.now() - 2 * 86400_000,
    read: true,
  },
];

const MOD_KEY: Record<OtaModule, keyof Strings> = { engine: "modEngine", servers: "modServers", ui: "modUi" };

function PushBanner({ n, onOpen }: { n: Notice; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="push-in absolute inset-x-3 top-9 z-50 flex items-start gap-3 rounded-2xl border border-panel-edge bg-panel p-3 text-start shadow-[0_18px_40px_oklch(0_0_0/0.45)]"
      role="alert"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-glow/15">
        <ShieldCheck className="size-5 text-glow" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[11px] text-dim">
          <span className="font-display font-bold text-ink">Mianboor</span>
          <span>· now</span>
        </span>
        <span className="mt-0.5 block truncate text-sm font-bold text-ink">{n.title}</span>
        <span className="line-clamp-2 block text-xs leading-5 text-dim">{n.body}</span>
      </span>
      <span className="mt-0.5 flex items-center gap-1">
        <Check className="size-3.5 text-dim" />
        <span className="text-[10px] font-semibold uppercase text-dim">now</span>
      </span>
    </button>
  );
}

function NoticePopup({ lang, n, onClose, onInbox }: { lang: Lang; n: Notice; onClose: () => void; onInbox: () => void }) {
  const t = tr(lang);
  const M = KIND_META[n.kind];
  const I = M.icon;
  return (
    <div
      className="absolute inset-0 z-30 grid place-items-center bg-night/70 px-7 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="screen-in w-full rounded-3xl border border-panel-edge bg-panel p-5 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={n.title}
      >
        <span className={`mx-auto grid size-14 place-items-center rounded-2xl ${M.box}`}>
          <I className={`size-7 ${M.cls}`} />
        </span>
        <h3 className="mt-3 font-display text-lg font-bold text-ink">{n.title}</h3>
        <p className="mt-1.5 text-sm leading-6 text-dim">{n.body}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onInbox}
            className="flex-1 rounded-xl bg-glow py-2.5 font-display text-sm font-bold text-on-glow"
          >
            {t.popupOpenInbox}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-panel-edge py-2.5 text-sm font-semibold text-dim hover:text-ink"
          >
            {t.popupGotIt}
          </button>
        </div>
      </div>
    </div>
  );
}

function OtaPopup({
  lang,
  rel,
  state,
  progress,
  onStart,
  onLater,
  onDone,
}: {
  lang: Lang;
  rel: OtaRelease;
  state: "offer" | "progress" | "done";
  progress: number;
  onStart: () => void;
  onLater: () => void;
  onDone: () => void;
}) {
  const t = tr(lang);
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-night/70 px-7 backdrop-blur-sm" role="dialog" aria-label={t.otaTitle}>
      <div className="screen-in w-full rounded-3xl border border-panel-edge bg-panel p-5 text-center shadow-2xl">
        {state === "done" ? (
          <>
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-glow/15">
              <Check className="size-7 text-glow" strokeWidth={3} />
            </span>
            <h3 className="mt-3 font-display text-lg font-bold text-ink">{t.otaDone.replace("{v}", rel.version)}</h3>
            <p className="mt-1.5 text-sm leading-6 text-dim">{t.otaDoneSub}</p>
            <button
              type="button"
              onClick={onDone}
              className="mt-4 w-full rounded-xl bg-glow py-2.5 font-display text-sm font-bold text-on-glow"
            >
              {tr(lang).popupGotIt}
            </button>
          </>
        ) : state === "progress" ? (
          <>
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-glow/15">
              <DownloadCloud className="size-7 text-glow" />
            </span>
            <h3 className="mt-3 font-display text-lg font-bold text-ink">{progress >= 100 ? t.otaInstall : t.otaDl}</h3>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full rounded-full bg-glow transition-[width] duration-150" style={{ width: `${progress}%` }} />
            </div>
            <div dir="ltr" className="mt-1.5 font-mono text-xs font-bold tabular-nums text-dim">
              {Math.round(progress)}% · {rel.sizeMb} MB
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {rel.modules.map((m) => (
                <span key={m} className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-bold text-dim">
                  {t[MOD_KEY[m]]}
                </span>
              ))}
            </div>
          </>
        ) : (
          <>
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-gold/15">
              <DownloadCloud className="size-7 text-gold" />
            </span>
            <h3 className="mt-3 font-display text-lg font-bold text-ink">{t.otaTitle}</h3>
            <p className="mt-1 text-sm text-dim">{t.otaVerSub.replace("{v}", rel.version).replace("{s}", String(rel.sizeMb))}</p>
            {rel.notes && <p className="mt-2 rounded-xl bg-night px-3 py-2 text-sm leading-6 text-ink">{rel.notes}</p>}
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {rel.modules.map((m) => (
                <span key={m} className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-bold text-dim">
                  {t[MOD_KEY[m]]}
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-glow/25 bg-glow/10 px-3 py-2 text-start">
              <Info className="mt-0.5 size-4 shrink-0 text-glow" />
              <span className="text-xs leading-5 text-dim">{t.otaPatchNote}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onStart}
                className="flex-1 rounded-xl bg-gold py-2.5 font-display text-sm font-bold text-night"
              >
                {t.otaBtn}
              </button>
              <button
                type="button"
                onClick={onLater}
                className="flex-1 rounded-xl border border-panel-edge py-2.5 text-sm font-semibold text-dim hover:text-ink"
              >
                {t.otaLater}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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
  const [passHash, setPassHash] = useState(DEMO_AUTH);
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
  /* آی‌پی واقعی مقصد — بعد از اتصال، با تاخیر کوتاه «تشخیص» می‌شه (دمو: ipwho.is از داخل تونل) */
  const [destResolved, setDestResolved] = useState(false);
  /* اعلان‌ها: صندوق پیام + نوتیف گوشی + پاپ‌آپ */
  const [notices, setNotices] = useState<Notice[]>(SEED_NOTICES);
  const [push, setPush] = useState<{ n: Notice; k: number } | null>(null);
  const [popupNotice, setPopupNotice] = useState<Notice | null>(null);
  const [pendingPopupId, setPendingPopupId] = useState<string | null>(null);
  /* OTA: انتشار → پاپ‌آپ → دانلود پچ → نصب خودکار */
  const [ota, setOta] = useState<OtaRelease | null>(null);
  const [otaState, setOtaState] = useState<null | "offer" | "progress" | "done">(null);
  const [otaProgress, setOtaProgress] = useState(0);
  const [pendingOta, setPendingOta] = useState(false);
  const [appVersion, setAppVersion] = useState(APP_VERSION);

  const t = tr(lang);
  const holdStart = useRef(0);
  const raf = useRef(0);
  const fired = useRef(false);

  const premium = entitlement.plan !== "free";
  const isAdmin = screen === "login" || screen === "admin";
  const unread = notices.filter((n) => !n.read).length;

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

  /* ── کانفیگ‌های تازه‌اضافه‌شده وارد چرخه پینگ می‌شن ── */
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
    if (vpn !== "on") {
      setDestResolved(false);
      return;
    }
    setShowFlash(true);
    /* شبیه‌سازی تشخیص آی‌پی جدید: بعد از ۲ ثانیه نوار آی‌پی → آی‌پی و کشور مقصد */
    const destId = setTimeout(() => setDestResolved(true), 2000);
    const flashId = setTimeout(() => setShowFlash(false), 4500);
    return () => {
      clearTimeout(destId);
      clearTimeout(flashId);
    };
  }, [vpn]);

  /* ── بنر نسخهٔ جدید حذف شد — آپدیت از سمت مدیریت منتشر می‌شه ── */

  /* ── نوتیف گوشی: بنر heads-up بعد از ۵ ثانیه خودش محو می‌شه ── */
  useEffect(() => {
    if (!push) return;
    const id = setTimeout(() => setPush(null), 5000);
    return () => clearTimeout(id);
  }, [push]);

  /* ── پاپ‌آپ در صف: تا از پنل خارج نشده و صفحهٔ کاربر دیده نشه، باز نمی‌شه ── */
  useEffect(() => {
    if (isAdmin) return;
    if (pendingOta && ota) {
      setOtaState("offer");
      setPendingOta(false);
      return;
    }
    if (pendingPopupId) {
      const n = notices.find((x) => x.id === pendingPopupId);
      if (n) setPopupNotice(n);
      setPendingPopupId(null);
    }
  }, [screen, isAdmin, pendingOta, pendingPopupId, ota, notices]);

  /* ── دیدن پاپ‌آپ یعنی پیام خونده شد ── */
  useEffect(() => {
    if (!popupNotice) return;
    setNotices((list) => list.map((x) => (x.id === popupNotice.id ? { ...x, read: true } : x)));
  }, [popupNotice]);

  /* ── دانلود پچ OTA: نوار پیشرفت شبیه‌سازی می‌شه ── */
  useEffect(() => {
    if (otaState !== "progress") return;
    const id = setInterval(() => {
      setOtaProgress((p) => {
        const next = p + 2.5 + Math.random() * 6;
        if (next >= 100) {
          clearInterval(id);
          setTimeout(() => setOtaState("done"), 600);
          return 100;
        }
        return next;
      });
    }, 170);
    return () => clearInterval(id);
  }, [otaState]);

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

  /* ── خرید: سفارش ثبت می‌شه و پس از بررسی تأیید می‌شه ── */
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

  /* ── اعلان‌ها: تحویل روی دستگاه (push / popup / inbox) ── */
  const sendNotice = (n: { title: string; body: string; kind: NoticeKind; audience: NoticeAudience; channels: NoticeChannel[] }) => {
    const matches = n.audience === "all" || (n.audience === "premium" ? premium : !premium);
    const notice: Notice = { ...n, id: `n-${Date.now()}`, at: Date.now(), read: false };
    setNotices((list) => [notice, ...list]);
    if (!matches) return;
    if (n.channels.includes("push")) setPush({ n: notice, k: Date.now() });
    if (n.channels.includes("popup")) {
      if (isAdmin) setPendingPopupId(notice.id);
      else setPopupNotice(notice);
    }
  };

  const openNotice = (n: Notice) => {
    setNotices((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
  };

  const markAllNotices = () => {
    setNotices((list) => list.map((x) => ({ ...x, read: true })));
    showToast(t.markAll);
  };

  /* ── OTA: انتشار آپدیت → پاپ‌آپ روی دستگاه کاربر ── */
  const publishOta = (r: { version: string; notes: string; modules: OtaModule[]; sizeMb: number }) => {
    const rel: OtaRelease = { ...r, at: Date.now() };
    setOta(rel);
    setOtaProgress(0);
    if (isAdmin) setPendingOta(true);
    else setOtaState("offer");
  };

  const dismissOta = () => setOtaState(null);

  const finishOta = () => {
    if (ota) setAppVersion(ota.version);
    setOta(null);
    setOtaState(null);
    setOtaProgress(0);
  };

  const tick = () => {
    const p = (performance.now() - holdStart.current) / HOLD_MS;
    if (p >= 1) {
      fired.current = true;
      if (navigator.vibrate) navigator.vibrate(60);
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
    setPassHash(DEMO_AUTH);
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
    setNotices(SEED_NOTICES());
    setPush(null);
    setPopupNotice(null);
    setPendingPopupId(null);
    setOta(null);
    setOtaState(null);
    setOtaProgress(0);
    setPendingOta(false);
    setAppVersion(APP_VERSION);
  };

  const themeVars = THEMES[theme].vars as CSSProperties;
  const steps: { i: LucideIcon; t: React.ReactNode; done: boolean }[] = [
    {
      i: Power,
      t: "دکمهٔ پاور رو بزن تا وصل بشی — پینگ‌ها هر ۳ ثانیه زنده به‌روز می‌شن و کم‌پینگ‌ترین سرور آزاد خودکار انتخاب می‌شه",
      done: vpn !== "off",
    },
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
      t: "Account → خرید پرمیوم: تعرفه ۳ ماهه ۴۰۰ رو انتخاب و پرداخت کن؛ سفارش با شناسهٔ دستگاه ثبت می‌شه و پس از تأیید، حسابت همون لحظه پرمیوم می‌شه",
      done: premium,
    },
    {
      i: Fingerprint,
      t: "تنظیمات → شبیه‌سازی نصب مجدد: ببین حجم رایگان روی دستگاه قفل می‌مونه (ضدچیت)",
      done: trialLocked,
    },
    {
      i: Gift,
      t: "از Account → دعوت دوستان: «شبیه‌سازی ورود دوست» رو بزن، روز هدیه جمع کن و Claim کن؛ بعد «پشتیبانی آنلاین» رو باز کن و با دستیار هوشمند چت کن",
      done: friends.length > freshFriends().length && giftDays === 0,
    },
    {
      i: Bell,
      t: "از خانه، زنگولهٔ بالا رو بزن: اعلان‌ها و پیام‌های تیم میانبر رو بخون و Mark all کن",
      done: unread === 0,
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
            سفارش روی سرور ثبت می‌شه و پس از تأیید، کاربر همون لحظه پرمیوم می‌شه.
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
            <b className="text-foreground">پرمیوم‌کردن کاربر:</b> کاربر از Account → خرید پرمیوم تعرفه رو انتخاب و
            پرداخت می‌کنه؛ سفارش با شناسهٔ دستگاه ثبت می‌شه و پس از تأیید تیم میانبر، حسابش بلافاصله پرمیوم می‌شه.
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
                    unread={unread}
                    onOpenInbox={() => setScreen("inbox")}
                    origin={vpn === "on" && destResolved ? DEST : ORIGIN}
                    flashOrigin={ORIGIN}
                    showFlash={showFlash}
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
                    unread={unread}
                    onOpenInbox={() => setScreen("inbox")}
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
                {screen === "inbox" && (
                  <InboxScreen lang={lang} notices={notices} onOpen={openNotice} onMarkAll={markAllNotices} onBack={() => setScreen("home")} />
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
                    version={appVersion}
                    onBack={() => setScreen("home")}
                  />
                )}
                {screen === "split" && (
                  <SplitScreen lang={lang} split={split} setSplit={setSplit} onBack={() => setScreen("account")} />
                )}
                {screen === "login" && (
                  <AdminLogin
                    check={(u, p) => authHash(`${u}|${p}`) === passHash}
                    onSuccess={() => {
                      setUnlocked(true);
                      setScreen("admin");
                      /* ورود موفق — سفارش‌های در انتظار اعلام می‌شه */
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
                    notices={notices}
                    onSendNotice={sendNotice}
                    appVersion={appVersion}
                    onPublishOta={publishOta}
                    onApprove={approveOrder}
                    onReject={rejectOrder}
                    onDevicePremium={devicePremium}
                    onChangePass={setPassHash}
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

              {/* اعلان‌ها: نوتیف heads-up گوشی + پاپ‌آپ داخل اپ + پاپ‌آپ آپدیت OTA */}
              {push && <PushBanner n={push.n} onOpen={() => { setPush(null); setScreen("inbox"); }} />}
              {popupNotice && (
                <NoticePopup
                  lang={lang}
                  n={popupNotice}
                  onClose={() => setPopupNotice(null)}
                  onInbox={() => {
                    setPopupNotice(null);
                    setScreen("inbox");
                  }}
                />
              )}
              {ota && otaState && <OtaPopup lang={lang} rel={ota} state={otaState} progress={otaProgress} onStart={() => setOtaState("progress")} onLater={dismissOta} onDone={finishOta} />}

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

        {/* ── TEMP: logo picker — local preview only, never committed ── */}
        <div
          dir="rtl"
          className="fixed bottom-24 left-3 z-50 w-[300px] rounded-2xl border border-gold/40 bg-[#0A102A]/95 p-3 shadow-2xl backdrop-blur"
        >
          <p className="mb-2 text-xs font-bold text-gold">
            انتخاب لوگو — یکی را بگو (A تا E)
            <span className="ms-1 font-normal text-dim">موقتی</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["A", "گردنهٔ خورشید"],
              ["B", "شیر و خورشید"],
              ["C", "طاق ایرانی"],
              ["D", "شمسهٔ هشت‌پر"],
              ["E", "سپر مسیر"],
            ].map(([k, name]) => (
              <a
                key={k}
                href={`/logo-preview/${k.toLowerCase()}.svg`}
                target="_blank"
                rel="noreferrer"
                className="group rounded-xl border border-panel-edge bg-panel p-1.5 text-center transition-colors hover:border-glow/60"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local SVG preview */}
                <img
                  src={`/logo-preview/${k.toLowerCase()}.svg`}
                  alt={`logo ${k}`}
                  className="mx-auto h-16 w-16 rounded-lg"
                />
                <span className="mt-1 block text-[10px] font-bold text-ink group-hover:text-glow">
                  {k} · {name}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
