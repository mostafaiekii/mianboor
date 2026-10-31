/** Shared types for the Mianboor UI demo. */

export type VpnState = "off" | "connecting" | "on" | "blocked";

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
  | "privacy";

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

/** آستانهٔ هشدار مصرف رایگان */
export const QUOTA_WARN_PCT = 0.8;
