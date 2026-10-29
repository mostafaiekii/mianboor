"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ClipboardPaste,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  Plus,
  Server,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { COUNTRIES, Flag } from "./flag";
import type { ConfigItem, ParsedLink } from "./types";

export function parseLink(link: string): ParsedLink | null {
  const t = link.trim();
  const m = t.match(/^([a-z0-9]+):\/\//i);
  if (!m) return null;
  const map: Record<string, string> = {
    vless: "VLESS",
    vmess: "VMESS",
    trojan: "Trojan",
    ss: "Shadowsocks",
    wireguard: "WireGuard",
    hy2: "Hysteria2",
  };
  const protocol = map[m[1].toLowerCase()] || m[1].toUpperCase();
  const hash = t.split("#")[1];
  const host = (t.split("@")[1] || "").split(/[:?#/]/)[0];
  let name = "";
  try {
    name = hash ? decodeURIComponent(hash) : "";
  } catch {
    name = hash || "";
  }
  return { protocol, host, name };
}

export function AdminLogin({
  check,
  onSuccess,
  onCancel,
}: {
  check: (u: string, p: string) => boolean;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [show, setShow] = useState(false);
  const [left, setLeft] = useState(5);
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!lockUntil) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [lockUntil]);

  const locked = lockUntil > now;
  const wait = Math.ceil((lockUntil - now) / 1000);

  const submit = () => {
    if (locked) return;
    if (check(u.trim(), p)) {
      onSuccess();
      return;
    }
    const n = left - 1;
    setShake((s) => s + 1);
    if (n <= 0) {
      setLockUntil(Date.now() + 30000);
      setNow(Date.now());
      setLeft(5);
      setErr("Too many attempts. Locked.");
    } else {
      setLeft(n);
      setErr(`Wrong username or password · ${n} tries left`);
    }
    setP("");
  };

  const key = (e: React.KeyboardEvent) => e.key === "Enter" && submit();

  return (
    <div className="flex flex-1 flex-col px-6 pt-2">
      <button type="button" onClick={onCancel} aria-label="Close" className="w-fit text-dim hover:text-ink">
        <ChevronLeft className="size-6" />
      </button>
      <div className="mt-10 flex flex-col items-center text-center">
        <span className="grid size-16 place-items-center rounded-2xl border border-gold/40 bg-gold/10">
          <Lock className="size-7 text-gold" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-bold text-ink">Restricted</h2>
        <p className="mt-1 text-sm text-dim">Authorized personnel only</p>
      </div>
      <div key={shake} className={shake ? "shake mt-8 flex flex-col gap-3" : "mt-8 flex flex-col gap-3"}>
        <input
          aria-label="Username"
          value={u}
          onChange={(e) => setU(e.target.value)}
          onKeyDown={key}
          disabled={locked}
          placeholder="Username"
          autoComplete="off"
          className="rounded-xl border border-panel-edge bg-panel px-4 py-3 text-base text-ink outline-none placeholder:text-dim focus:border-gold/60 disabled:opacity-50"
        />
        <div className="flex items-center rounded-xl border border-panel-edge bg-panel pr-3 focus-within:border-gold/60">
          <input
            aria-label="Password"
            type={show ? "text" : "password"}
            value={p}
            onChange={(e) => setP(e.target.value)}
            onKeyDown={key}
            disabled={locked}
            placeholder="Password"
            autoComplete="off"
            className="w-full bg-transparent px-4 py-3 text-base text-ink outline-none placeholder:text-dim disabled:opacity-50"
          />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label="Show password" className="text-dim hover:text-ink">
            {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
        <div className="min-h-6 text-sm text-danger">{locked ? `Locked · try again in ${wait}s` : err}</div>
        <button
          type="button"
          onClick={submit}
          disabled={locked}
          className="rounded-xl bg-gold py-3 font-display text-base font-bold text-night disabled:opacity-40"
        >
          Unlock
        </button>
      </div>
    </div>
  );
}

function AddConfigSheet({ onClose, onAdd }: { onClose: () => void; onAdd: (c: Omit<ConfigItem, "id" | "ping" | "enabled">) => void }) {
  const [link, setLink] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("de");
  const [premium, setPremium] = useState(false);
  const [err, setErr] = useState("");
  const parsed = parseLink(link);

  const sample = "vless://8f2e1c9a@fr1.mianboor.app:443?security=reality&sni=cdn.example.com#France-Paris";

  const save = () => {
    if (!parsed) {
      setErr("Paste a valid link (vless://, vmess://, trojan://, ss://)");
      return;
    }
    onAdd({
      name: name.trim() || parsed.name || `${COUNTRIES[country] ?? "New"} Server`,
      country,
      protocol: parsed.protocol,
      host: parsed.host || "unknown",
      premium,
    });
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-night/70 backdrop-blur-sm">
      <div className="sheet-in flex flex-col gap-3 rounded-t-3xl border-t border-panel-edge bg-panel px-5 pt-4 pb-6">
        <div className="mx-auto h-1 w-10 rounded-full bg-ink/20" />
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-ink">Add config</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-dim hover:text-ink">
            <X className="size-5" />
          </button>
        </div>
        <textarea
          aria-label="Config link"
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            setErr("");
            const pr = parseLink(e.target.value);
            if (pr?.name && !name) setName(pr.name);
            if (pr?.name) {
              const hit = Object.entries(COUNTRIES).find(([, v]) => pr.name.toLowerCase().includes(v.toLowerCase().split(" ")[0]));
              if (hit) setCountry(hit[0]);
            }
          }}
          rows={3}
          placeholder="vless://… or vmess://…"
          className="resize-none rounded-xl border border-panel-edge bg-night px-3 py-3 font-mono text-sm break-all text-ink outline-none placeholder:text-dim focus:border-gold/60"
        />
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setLink(sample);
              setName("France - Paris");
              setCountry("fr");
              setErr("");
            }}
            className="flex items-center gap-2 text-sm font-medium text-gold"
          >
            <ClipboardPaste className="size-4" /> Paste from clipboard
          </button>
          {parsed && (
            <span className="rounded-full bg-glow/15 px-2 py-0.5 text-sm font-semibold text-glow">{parsed.protocol}</span>
          )}
        </div>
        <input
          aria-label="Display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Display name (e.g. Germany - Berlin)"
          className="rounded-xl border border-panel-edge bg-night px-3 py-3 text-sm text-ink outline-none placeholder:text-dim focus:border-gold/60"
        />
        <div className="scroll-hide flex gap-2 overflow-x-auto pb-1">
          {Object.keys(COUNTRIES).map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setCountry(c)}
              aria-label={COUNTRIES[c]}
              className={
                country === c
                  ? "rounded-full ring-2 ring-gold ring-offset-2 ring-offset-panel"
                  : "rounded-full opacity-60 hover:opacity-100"
              }
            >
              <Flag code={c} size={30} />
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl bg-night px-3 py-3">
          <span className="flex items-center gap-2 text-sm text-ink">
            <Crown className="size-4 fill-gold text-gold" /> Premium only
          </span>
          <Switch checked={premium} onCheckedChange={setPremium} aria-label="Premium only" />
        </div>
        {err && <div className="text-sm text-danger">{err}</div>}
        <button type="button" onClick={save} className="rounded-xl bg-gold py-3 font-display text-base font-bold text-night">
          Save &amp; publish
        </button>
      </div>
    </div>
  );
}

export function AdminPanel({
  configs,
  setConfigs,
  onExit,
  onChangePass,
}: {
  configs: ConfigItem[];
  setConfigs: React.Dispatch<React.SetStateAction<ConfigItem[]>>;
  onExit: () => void;
  onChangePass: (p: string) => void;
}) {
  const [tab, setTab] = useState<"configs" | "security">("configs");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState("");
  const [np, setNp] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const active = configs.filter((c) => c.enabled).length;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-5 pt-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-gold">
            <KeyRound className="size-4" /> Admin mode
          </div>
          <h2 className="font-display text-2xl font-bold text-ink">Control Panel</h2>
        </div>
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit admin"
          className="grid size-10 place-items-center rounded-full bg-panel text-dim hover:text-danger"
        >
          <LogOut className="size-5" />
        </button>
      </div>

      <div className="mx-5 mt-4 grid grid-cols-3 gap-2">
        {[
          { i: Server, v: configs.length, l: "Configs" },
          { i: Server, v: active, l: "Live" },
          { i: Users, v: "1,284", l: "Users" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-panel-edge bg-panel px-3 py-2">
            <div className="font-display text-xl font-bold text-ink tabular-nums">{s.v}</div>
            <div className="text-sm text-dim">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="mx-5 mt-4 grid grid-cols-2 rounded-xl bg-panel p-1">
        {(["configs", "security"] as const).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(t)}
            className={
              tab === t ? "rounded-lg bg-night py-2 text-sm font-semibold text-ink" : "rounded-lg py-2 text-sm text-dim"
            }
          >
            {t === "configs" ? "Configs" : "Security"}
          </button>
        ))}
      </div>

      {tab === "configs" ? (
        <div className="scroll-hide mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-5 pb-20">
          {configs.map((c) => (
            <div
              key={c.id}
              className={
                c.enabled
                  ? "flex items-center gap-3 rounded-xl border border-panel-edge bg-panel px-3 py-3"
                  : "flex items-center gap-3 rounded-xl border border-panel-edge bg-panel/50 px-3 py-3 opacity-60"
              }
            >
              <Flag code={c.country} size={30} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 truncate text-sm font-semibold text-ink">
                  {c.name} {c.premium && <Crown className="size-3.5 shrink-0 fill-gold text-gold" />}
                </span>
                <span className="block truncate font-mono text-sm text-dim">
                  {c.protocol} · {c.host}
                </span>
              </span>
              <Switch
                checked={c.enabled}
                onCheckedChange={(v) => setConfigs((cs) => cs.map((x) => (x.id === c.id ? { ...x, enabled: v } : x)))}
                aria-label={`Toggle ${c.name}`}
              />
              <button
                type="button"
                aria-label={`Delete ${c.name}`}
                onClick={() => {
                  setConfigs((cs) => cs.filter((x) => x.id !== c.id));
                  setToast("Config removed");
                }}
                className="text-dim hover:text-danger"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3 px-5">
          <div className="rounded-xl border border-panel-edge bg-panel p-4">
            <div className="text-sm font-semibold text-ink">Change admin password</div>
            <input
              aria-label="New password"
              type="password"
              value={np}
              onChange={(e) => setNp(e.target.value)}
              placeholder="New password (min 8)"
              className="mt-3 w-full rounded-lg border border-panel-edge bg-night px-3 py-2 text-sm text-ink outline-none placeholder:text-dim"
            />
            <button
              type="button"
              disabled={np.length < 8}
              onClick={() => {
                onChangePass(np);
                setNp("");
                setToast("Password updated");
              }}
              className="mt-3 w-full rounded-lg bg-gold py-2 text-sm font-bold text-night disabled:opacity-40"
            >
              Update
            </button>
          </div>
          <div className="rounded-xl border border-panel-edge bg-panel p-4 text-sm text-dim">
            Lock after 5 wrong tries · Session ends when app closes · Hidden entry, no visible button.
          </div>
        </div>
      )}

      {tab === "configs" && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="absolute right-5 bottom-4 flex items-center gap-2 rounded-full bg-gold px-5 py-3 font-display text-sm font-bold text-night shadow-lg"
        >
          <Plus className="size-5" strokeWidth={3} /> Add config
        </button>
      )}

      {toast && (
        <div className="absolute inset-x-0 top-2 z-30 flex justify-center">
          <span className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-night">{toast}</span>
        </div>
      )}

      {adding && (
        <AddConfigSheet
          onClose={() => setAdding(false)}
          onAdd={(c) => {
            setConfigs((cs) => [
              { ...c, id: Date.now(), ping: 30 + Math.floor(Math.random() * 40), enabled: true },
              ...cs,
            ]);
            setAdding(false);
            setToast("Published to all users");
          }}
        />
      )}
    </div>
  );
}
