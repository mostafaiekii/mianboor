/** Shared types for the Mianboor UI demo. */

export type VpnState = "off" | "connecting" | "on";

export type Screen = "home" | "servers" | "account" | "settings" | "split" | "login" | "admin" | "referral" | "support" | "inbox";

export interface ConfigItem {
  id: number;
  name: string;
  country: string;
  protocol: string;
  host: string;
  ping: number;
  premium: boolean;
  enabled: boolean;
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
  via: "gateway" | "telegram";
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

export const PLAN_DAYS: Record<PlanId, number> = { p1: 30, p3: 90, p6: 180 };

export const FREE_QUOTA_GB = 5;
