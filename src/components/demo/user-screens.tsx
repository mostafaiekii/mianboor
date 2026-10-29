"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  GitBranch,
  Power,
  Search,
  Settings,
  ShieldCheck,
  User,
  Wifi,
  Zap,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Flag } from "./flag";
import type { ConfigItem, VpnState } from "./types";

export function pingTone(p: number): string {
  return p < 60 ? "text-glow" : p < 100 ? "text-gold" : "text-danger";
}

export function Bars({ ping }: { ping: number }) {
  const n = ping < 40 ? 4 : ping < 60 ? 3 : ping < 100 ? 2 : 1;
  return (
    <span className="flex h-3 items-end gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          style={{ height: `${i * 25}%` }}
          className={i <= n ? "w-1 rounded-sm bg-glow" : "w-1 rounded-sm bg-ink/20"}
        />
      ))}
    </span>
  );
}

function fmt(sec: number): string {
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function HomeScreen({
  state,
  onToggle,
  seconds,
  server,
  onPickServer,
}: {
  state: VpnState;
  onToggle: () => void;
  seconds: number;
  server: ConfigItem | null;
  onPickServer: () => void;
}) {
  const on = state === "on";
  const busy = state === "connecting";
  const label = on ? "Connected" : busy ? "Connecting…" : "Not connected";
  return (
    <div className="flex flex-1 flex-col px-6 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-7 text-glow" />
          <span className="font-display text-xl font-extrabold tracking-tight text-ink">MIANBOOR</span>
        </div>
        <Settings className="size-6 text-dim" />
      </div>

      <div className="relative mt-8 flex h-52 items-center justify-center">
        <div className={on ? "breathe absolute size-56 rounded-full bg-glow/30 blur-3xl" : "absolute size-56 rounded-full bg-transparent"} />
        <button
          type="button"
          onClick={onToggle}
          aria-label={on ? "Disconnect" : "Connect"}
          className={
            on
              ? "relative grid size-48 place-items-center rounded-full border-4 border-glow bg-night shadow-[0_0_40px_oklch(0.84_0.15_168/0.55)] transition-all"
              : busy
                ? "spin-ring relative grid size-48 place-items-center rounded-full border-4 border-glow/30 border-t-glow bg-night transition-all"
                : "relative grid size-48 place-items-center rounded-full border-4 border-panel-edge bg-night transition-all hover:border-glow/50"
          }
        >
          <span className={busy ? "unspin grid size-36 place-items-center rounded-full bg-panel" : "grid size-36 place-items-center rounded-full bg-panel"}>
            <Power className={on ? "size-14 text-glow" : "size-14 text-dim"} strokeWidth={2.4} />
          </span>
        </button>
      </div>

      <div className="mt-6 text-center">
        <div className={on ? "font-display text-2xl font-bold text-glow" : "font-display text-2xl font-bold text-ink"}>{label}</div>
        <div className="mt-1 font-display text-base tabular-nums text-dim">{on ? fmt(seconds) : "Tap to protect your connection"}</div>
      </div>

      <button
        type="button"
        onClick={onPickServer}
        className="mt-6 flex items-center gap-4 rounded-2xl border border-panel-edge bg-panel p-4 text-left transition-colors hover:border-glow/40"
      >
        {server ? <Flag code={server.country} size={40} /> : <span className="size-10 rounded-full bg-ink/10" />}
        <span className="flex-1">
          <span className="block text-base font-semibold text-ink">{server ? server.name : "No server available"}</span>
          {server && (
            <span className="mt-1 flex items-center gap-2 text-sm text-dim">
              <Bars ping={server.ping} /> {server.ping} ms
            </span>
          )}
        </span>
        <ChevronRight className="size-5 text-dim" />
      </button>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-panel-edge bg-panel p-4">
          <div className="flex items-center gap-2 text-sm text-dim">
            <ArrowDown className="size-4 text-glow" /> Download
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-ink tabular-nums">
            {on ? "48.2" : "0.0"} <span className="text-sm font-medium text-dim">Mbps</span>
          </div>
        </div>
        <div className="rounded-2xl border border-panel-edge bg-panel p-4">
          <div className="flex items-center gap-2 text-sm text-dim">
            <ArrowUp className="size-4 text-up" /> Upload
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-ink tabular-nums">
            {on ? "12.6" : "0.0"} <span className="text-sm font-medium text-dim">Mbps</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ServersScreen({
  configs,
  selectedId,
  onSelect,
  onBack,
}: {
  configs: ConfigItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onBack: () => void;
}) {
  const [q, setQ] = useState("");
  const list = configs.filter((c) => c.enabled && c.name.toLowerCase().includes(q.toLowerCase()));
  const best = [...configs.filter((c) => c.enabled)].sort((a, b) => a.ping - b.ping)[0];
  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 pt-2">
      <button type="button" onClick={onBack} aria-label="Back" className="w-fit text-dim hover:text-ink">
        <ChevronLeft className="size-6" />
      </button>
      <h2 className="mt-3 font-display text-2xl font-bold text-ink">Select Location</h2>
      <label className="mt-4 flex items-center gap-3 rounded-xl border border-panel-edge bg-panel px-4 py-3">
        <Search className="size-4 text-dim" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search countries…"
          aria-label="Search countries"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-dim"
        />
      </label>
      <button
        type="button"
        onClick={() => best && onSelect(best.id)}
        className="mt-3 flex items-center gap-3 rounded-xl border border-glow/30 bg-glow/10 px-4 py-3 text-left"
      >
        <Zap className="size-5 fill-glow text-glow" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">Smart Connect</span>
          <span className="block text-sm text-dim">Fastest server for you</span>
        </span>
        <ChevronRight className="size-4 text-dim" />
      </button>
      <div className="mt-4 text-sm text-dim">Locations · {list.length}</div>
      <div className="scroll-hide mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-3">
        {list.map((c) => {
          const sel = c.id === selectedId;
          return (
            <button
              type="button"
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={
                sel
                  ? "flex items-center gap-3 rounded-xl border border-glow/40 bg-panel px-3 py-3 text-left"
                  : "flex items-center gap-3 rounded-xl border border-panel-edge bg-panel px-3 py-3 text-left hover:border-ink/20"
              }
            >
              <Flag code={c.country} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{c.name}</span>
                <span className="block text-sm text-dim">{c.protocol}</span>
              </span>
              <span className={`w-12 text-right text-sm tabular-nums ${pingTone(c.ping)}`}>{c.ping} ms</span>
              {c.premium ? <Crown className="size-4 fill-gold text-gold" /> : <span className="size-4" />}
              <span className={sel ? "grid size-5 place-items-center rounded-full bg-glow" : "size-5 rounded-full border-2 border-ink/25"}>
                {sel && <Check className="size-3.5 text-on-glow" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
        {list.length === 0 && <div className="py-8 text-center text-sm text-dim">No servers match.</div>}
      </div>
    </div>
  );
}

export function AccountScreen() {
  const [kill, setKill] = useState(true);
  const [auto, setAuto] = useState(true);
  const used = 18.4;
  const total = 50;
  const r = 44;
  const circ = 2 * Math.PI * r;
  const rows = [
    { icon: ShieldCheck, t: "Kill Switch", d: "Blocks internet if VPN drops", v: kill, set: setKill },
    { icon: Wifi, t: "Auto Connect", d: "On unsecured Wi-Fi", v: auto, set: setAuto },
  ];
  return (
    <div className="scroll-hide flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pt-2 pb-3">
      <h2 className="font-display text-2xl font-bold text-ink">Account</h2>
      <div className="flex items-center gap-4 rounded-2xl border border-panel-edge bg-panel p-4">
        <span className="grid size-12 place-items-center rounded-full bg-ink/10">
          <User className="size-6 text-ink" />
        </span>
        <span className="flex-1">
          <span className="flex items-center gap-2 text-base font-semibold text-ink">
            <Crown className="size-4 fill-gold text-gold" /> Premium Plan
          </span>
          <span className="block text-sm text-dim">Expires in 23 days</span>
        </span>
        <ChevronRight className="size-5 text-dim" />
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-panel-edge bg-panel p-4">
        <div>
          <div className="text-sm text-dim">Data usage</div>
          <div className="mt-1 text-sm text-dim">Resets Nov 20</div>
        </div>
        <svg viewBox="0 0 110 110" className="size-28">
          <circle cx="55" cy="55" r={r} fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="9" />
          <circle
            cx="55"
            cy="55"
            r={r}
            fill="none"
            stroke="oklch(0.84 0.15 168)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${(used / total) * circ} ${circ}`}
            transform="rotate(-90 55 55)"
          />
          <text x="55" y="54" textAnchor="middle" className="fill-ink font-display" style={{ fontSize: 17, fontWeight: 800 }}>
            18.4 GB
          </text>
          <text x="55" y="71" textAnchor="middle" className="fill-dim" style={{ fontSize: 10 }}>
            of 50 GB
          </text>
        </svg>
      </div>
      {rows.map(({ icon: I, t, d, v, set }) => (
        <div key={t} className="flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-4">
          <I className="size-5 text-dim" />
          <span className="flex-1">
            <span className="block text-sm font-semibold text-ink">{t}</span>
            <span className="block text-sm text-dim">{d}</span>
          </span>
          <Switch checked={v} onCheckedChange={set} aria-label={t} />
        </div>
      ))}
      <div className="flex items-center gap-3 rounded-2xl border border-panel-edge bg-panel p-4">
        <GitBranch className="size-5 text-dim" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">Split Tunneling</span>
          <span className="block text-sm text-dim">Choose apps that use VPN</span>
        </span>
        <ChevronRight className="size-5 text-dim" />
      </div>
      <button type="button" className="mt-1 rounded-2xl bg-glow py-3 font-display text-base font-bold text-on-glow">
        Renew Subscription
      </button>
    </div>
  );
}
