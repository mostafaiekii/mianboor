/** Shared types for the Mianboor UI demo. */

export type VpnState = "off" | "connecting" | "on";

export type Screen = "home" | "servers" | "account" | "settings" | "login" | "admin";

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
