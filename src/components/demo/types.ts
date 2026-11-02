/** Shared types for the Mianboor UI demo. */

export type VpnState = "off" | "connecting" | "on" | "blocked";

export type GuardianId =
  | "ads"
  | "trackers"
  | "adult"
  | "yt"
  | "gambling"
  | "gov"
  | "pay"
  | "social"
  | "crypto"
  | "fake";

/** گاردین: true = این دسته مسدود است */
export type GuardianState = Record<GuardianId, boolean>;

/** دسته‌های گاردین — مثل اپ‌های امنیتی مدرن */
export const GUARDIAN_IDS: GuardianId[] = [
  "ads",
  "trackers",
  "adult",
  "yt",
  "gambling",
  "gov",
  "pay",
  "social",
  "crypto",
  "fake",
];

export const GUARDIAN_DEFAULT: GuardianState = {
  ads: true,
  trackers: true,
  adult: true,
  yt: false,
  gambling: false,
  gov: false,
  pay: false,
  social: false,
  crypto: false,
  fake: false,
};

/** اشتراک‌گذاری نقطه اتصال (هات‌اسپات) */
export interface TetherState {
  on: boolean;
  port: number;
}

/** مرتب‌سازی لیست سرورها */
export type SortMode = "ping" | "az";

export type Screen =
  | "home"
  | "servers"
  | "account"
  | "settings"
  | "split"
  | "login"
  | "admin"
  | "referral"
  | "support"
  | "inbox"
  | "wallet"
  | "privacy"
  | "guardian"
  | "version";

export interface ConfigItem {
  id: number;
  name: string;
  country: string;
  protocol: string;
  host: string;
  ping: number;
  premium: boolean;
  enabled: boolean;
  /** سرور واردشده توسط کاربر (لینک اشتراک/کانفیگ شخصی) */
  custom?: boolean;
}

export interface ParsedLink {
  protocol: string;
  host: string;
  name: string;
}

/* ── Entitlements & anti-fraud ── */

export type PlanId = "p1" | "p3" | "p6";

export interface Entitlement {
  plan: "free" | PlanId;
  expiresAt?: number;
}

export interface Order {
  id: string;
  plan: PlanId;
  price: number;
  device: string;
  via: "gateway" | "telegram" | "wallet";
  at: number;
  status: "pending" | "approved" | "rejected";
}

export interface DeviceRecord {
  id: string;
  premium: boolean;
  premiumUntil?: number;
  trialUsed: boolean;
  reinstalls: number;
  seen: string;
}

/* ── Notifications (admin → user) ── */

export type NoticeKind = "info" | "gift" | "warn" | "update";
export type NoticeChannel = "inbox" | "popup" | "push";
export type NoticeAudience = "all" | "free" | "premium";

export interface Notice {
  id: string;
  title: string;
  body: string;
  kind: NoticeKind;
  audience: NoticeAudience;
  channels: NoticeChannel[];
  at: number;
  read: boolean;
}

/* ── OTA update (partial patch) ── */

export type OtaModule = "engine" | "servers" | "ui";

export interface OtaRelease {
  version: string;
  notes: string;
  modules: OtaModule[];
  sizeMb: number;
  at: number;
}

/* ── Split tunneling ── */

export type SplitMode = "exclude" | "include";

export interface SplitApp {
  id: string;
  name: string;
  nameFa: string;
  color: string;
  letter: string;
}

export interface SplitState {
  mode: SplitMode;
  apps: string[];
  /** نشانی‌های IP/CIDR علامت‌گذاری‌شده (تقسیم تونل بر پایه آی‌پی) */
  addresses: string[];
  /** مسدود کردن اتصالات داخلی .ir حین اتصال */
  blockIr: boolean;
}

/* ── v2 features ── */

/** حالت ضد-فیلترینگ: عادی یا سخت‌گیر (fragment) */
export type StealthMode = "normal" | "strict";

/** DNS انتخابی کاربر */
export type DnsMode = "auto" | "cf" | "google" | "custom";

/** نتیجهٔ اسپیدتست یک سرور (Mbps) */
export interface SpeedResult {
  down: number;
  up: number;
}

/** تراکنش کیف پول */
export type WalletTxKind = "topup" | "redeem" | "pay";

export interface WalletTx {
  id: string;
  kind: WalletTxKind;
  amount: number; // + شارژ / − پرداخت
  label: string;
  at: number;
}

export interface Wallet {
  balance: number; // تومان
  txs: WalletTx[];
  usedCodes: string[];
}

/** یک روز از نمودار مصرف ۱۴ روزه */
export interface UsageDay {
  label: string;
  gb: number;
}

/** دستگاه‌های حساب کاربر (مدیریت از سمت کاربر) */
export interface MyDevice {
  id: string;
  name: string;
  self?: boolean;
  lastSeen: string;
}

export const PLAN_DAYS: Record<PlanId, number> = { p1: 30, p3: 90, p6: 180 };

export const PLAN_PRICES: Record<PlanId, number> = { p1: 200_000, p3: 400_000, p6: 700_000 };

export const FREE_QUOTA_GB = 5;

/** کدهای هدیه کیف پول (دمو) — مبلغ به تومان */
export const WALLET_CODES: Record<string, number> = {
  MIANBOOR50: 50_000,
  WELCOME100: 100_000,
  GIFT250: 250_000,
};

/** کدهای تخفیف پلن (دمو) — درصد تخفیف */
export const PROMO_CODES: Record<string, number> = {
  MIANBOOR20: 20,
  WINTER30: 30,
};

/** پروکسی تلگرام (MTProto یا SOCKS) */
export interface TgProxy {
  id: string;
  title: string;
  server: string;
  port: number;
  kind: "mtproto" | "socks";
  secret: string | null;
  country: string;
  ping: number;
}

/** لیست جایگزین دمو — وقتی API در دسترس نیست (ok:false / demo:true / قطعی شبکه)
 *  یکی از ردیف‌ها عمداً country:"gift" است تا پرچم طلایی هدیه + 🎁 هم در دمو دیده شود
 *  (در اپ واقعی، پروکسی‌های تازه‌افزوده‌شده پیش‌فرض gift هستند). */
export const TG_PROXY_FALLBACK: TgProxy[] = [
  { id: "tp1", title: "پروکسی طلایی تلگرام", server: "91.107.213.199", port: 443, kind: "mtproto", secret: "ee1603010200ee1603010200aabbccdd", country: "fi", ping: 64 },
  { id: "tp2", title: "پروکسی تلگرام اروپا", server: "5.188.206.14", port: 8443, kind: "mtproto", secret: "dd0000000000000aabbccddeeff00112233445566778899aabbccddeeff0011", country: "nl", ping: 98 },
  { id: "tp3", title: "پروکسی تلگرام ترکیه", server: "soc.mianboor.xyz", port: 1080, kind: "socks", secret: null, country: "tr", ping: 143 },
  { id: "tp4", title: "پروکسی هدیه — لوکیشن نامشخص", server: "95.161.76.100", port: 443, kind: "mtproto", secret: "eeAbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_AbCdEfGh", country: "gift", ping: 187 },
];

/** آستانهٔ هشدار مصرف رایگان */
export const QUOTA_WARN_PCT = 0.8;
