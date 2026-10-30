"use client";

import { useEffect, useState } from "react";
import {
  AppWindow,
  Ban,
  BellRing,
  Check,
  ChevronLeft,
  ClipboardPaste,
  Crown,
  Eye,
  EyeOff,
  Fingerprint,
  Inbox,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Megaphone,
  Plus,
  ReceiptText,
  Rocket,
  Search,
  Server,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { COUNTRIES, Flag } from "./flag";
import {
  PLAN_DAYS,
  type ConfigItem,
  type DeviceRecord,
  type Notice,
  type NoticeAudience,
  type NoticeChannel,
  type NoticeKind,
  type OtaModule,
  type Order,
  type ParsedLink,
  type PlanId,
} from "./types";

const PLAN_LABEL: Record<PlanId, string> = { p1: "1 month", p3: "3 months", p6: "6 months" };
const PLAN_PRICE: Record<PlanId, number> = { p1: 200000, p3: 400000, p6: 700000 };

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

/* ── Orders tab ── */

function StatusChip({ status }: { status: Order["status"] }) {
  if (status === "pending")
    return (
      <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-gold">
        <Loader2 className="size-3 animate-spin" /> PENDING
      </span>
    );
  if (status === "approved")
    return (
      <span className="flex items-center gap-1 rounded-full bg-glow/15 px-2 py-0.5 text-[11px] font-bold text-glow">
        <Check className="size-3" /> APPROVED
      </span>
    );
  return (
    <span className="flex items-center gap-1 rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-bold text-danger">
      <X className="size-3" /> REJECTED
    </span>
  );
}

function OrdersTab({
  orders,
  onApprove,
  onReject,
}: {
  orders: Order[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const list = [...orders].sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1) || b.at - a.at);
  return (
    <div className="scroll-hide mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-5 pb-20">
      {list.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-panel-edge bg-panel px-4 py-8 text-center">
          <ReceiptText className="size-8 text-dim" />
          <div className="text-sm font-semibold text-ink">No orders yet</div>
          <div className="text-sm leading-6 text-dim">
            When a user taps “Go Premium” and pays, the order lands here — approve it to make them premium instantly.
          </div>
        </div>
      )}
      {list.map((o) => (
        <div
          key={o.id}
          className={o.status === "pending" ? "rounded-xl border border-gold/40 bg-panel px-3 py-3" : "rounded-xl border border-panel-edge bg-panel/60 px-3 py-3 opacity-80"}
        >
          <div className="flex items-center justify-between">
            <span dir="ltr" className="font-mono text-sm font-semibold text-ink">
              {o.id}
            </span>
            <StatusChip status={o.status} />
          </div>
          <div dir="ltr" className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-dim">
            <span className="font-semibold text-ink">{PLAN_LABEL[o.plan]}</span>
            <span className="tabular-nums">{PLAN_PRICE[o.plan].toLocaleString("en-US")} T</span>
            <span className="flex items-center gap-1">
              <Fingerprint className="size-3.5" /> {o.device}
            </span>
            <span>· {o.via === "gateway" ? "gateway" : "telegram"}</span>
            <span>· {new Date(o.at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          {o.status === "pending" && (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onApprove(o.id)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gold py-2 text-sm font-bold text-night"
              >
                <Crown className="size-4 fill-night" /> Approve premium
              </button>
              <button
                type="button"
                onClick={() => onReject(o.id)}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-danger/50 px-4 py-2 text-sm font-bold text-danger"
              >
                <Ban className="size-4" /> Reject
              </button>
            </div>
          )}
          {o.status === "approved" && (
            <div className="mt-2 text-xs text-dim">
              Premium active on {o.device} · {PLAN_DAYS[o.plan]} days
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Users tab — devices, premium management (Telegram purchases) ── */

const HARDENING = [
  "R8 + ProGuard — code, strings & APIs obfuscated",
  "Client token sealed at build time (CI secrets)",
  "TLS-protected calls to mianboor APIs",
  "No config link is ever rendered in the UI",
  "Config raw links kept only in private app storage",
];

function UsersTab({
  devices,
  ownDeviceId,
  onDevicePremium,
  onChangePass,
}: {
  devices: DeviceRecord[];
  ownDeviceId: string;
  onDevicePremium: (id: string, days: number) => void;
  onChangePass: (p: string) => void;
}) {
  const [np, setNp] = useState("");
  const [q, setQ] = useState("");
  const [blockRoot, setBlockRoot] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const list = devices.filter((d) => d.id.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="scroll-hide mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-20">
      {/* users — premium management */}
      <div className="rounded-xl border border-panel-edge bg-panel p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Users className="size-4 text-glow" /> Users · devices
        </div>
        <div className="mt-1 text-xs leading-5 text-dim">
          خرید تلگرامی؟ کد دستگاه کاربر رو (صفحه حساب) بگیر، اینجا سرچ کن و روز پرمیوم بده — با sync بعدی فعال می‌شه.
        </div>
        <label className="mt-3 flex items-center gap-2 rounded-lg bg-night px-3 py-2">
          <Search className="size-3.5 text-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="MB-…"
            dir="ltr"
            aria-label="Search device"
            className="w-full bg-transparent font-mono text-sm text-ink outline-none placeholder:text-dim"
          />
        </label>
        <div className="mt-3 flex flex-col gap-2">
          {list.map((d) => (
            <div key={d.id} className="rounded-lg bg-night px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span dir="ltr" className="min-w-0 flex-1 truncate font-mono text-xs text-ink">
                  {d.id}
                </span>
                {d.id === ownDeviceId && (
                  <span className="shrink-0 rounded-full bg-glow/15 px-2 py-0.5 text-[10px] font-bold text-glow">THIS DEVICE</span>
                )}
                <span
                  className={
                    d.premium
                      ? "shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold"
                      : "shrink-0 rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-bold text-dim"
                  }
                >
                  {d.premium ? "PREMIUM" : "FREE"}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-dim">
                <span>seen {d.seen}</span>
                {d.premium && d.premiumUntil && (
                  <span>· until {new Date(d.premiumUntil).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                {[30, 90, 180].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => {
                      onDevicePremium(d.id, days);
                      setToast(`${d.id} → premium +${days}d`);
                    }}
                    className="rounded-md border border-glow/40 bg-glow/10 px-2 py-1 text-[11px] font-bold text-glow hover:bg-glow/20"
                  >
                    +{days}d
                  </button>
                ))}
                {d.premium && (
                  <button
                    type="button"
                    onClick={() => {
                      onDevicePremium(d.id, 0);
                      setToast(`${d.id} → free`);
                    }}
                    className="rounded-md border border-danger/40 px-2 py-1 text-[11px] font-bold text-danger hover:bg-danger/10"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="rounded-lg bg-night px-3 py-4 text-center text-xs text-dim">
              دستگاهی پیدا نشد — دستگاه‌ها با باز شدن اپ کاربران اینجا ثبت می‌شن.
            </div>
          )}
        </div>
      </div>

      {/* hardening checklist */}
      <div className="rounded-xl border border-panel-edge bg-panel p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <ShieldCheck className="size-4 text-glow" /> App hardening
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {HARDENING.map((h) => (
            <div key={h} className="flex items-start gap-2 text-sm leading-5 text-dim">
              <Check className="mt-0.5 size-3.5 shrink-0 text-glow" strokeWidth={3} />
              <span dir="ltr">{h}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-panel-edge bg-panel px-4 py-3.5">
        <span className="text-sm font-semibold text-ink">Block rooted devices</span>
        <Switch checked={blockRoot} onCheckedChange={setBlockRoot} aria-label="Block rooted devices" />
      </div>

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

      {toast && (
        <div className="fixed inset-x-0 top-16 z-40 flex justify-center">
          <span className="screen-in rounded-full bg-ink px-4 py-2 text-sm font-semibold text-night">{toast}</span>
        </div>
      )}
    </div>
  );
}

/* ── Notifs tab — compose & send notifications to users (inbox / popup / push) ── */

const CHANNEL_META: { id: NoticeChannel; icon: typeof Inbox; label: string; sub: string }[] = [
  { id: "inbox", icon: Inbox, label: "Inbox", sub: "Saved in user's messages" },
  { id: "popup", icon: AppWindow, label: "Popup", sub: "Dialog on next app open" },
  { id: "push", icon: BellRing, label: "Push", sub: "Device notification" },
];

const KIND_LABEL: Record<NoticeKind, string> = { info: "Info", gift: "Gift", warn: "Warning", update: "Update" };
const AUD_LABEL: Record<NoticeAudience, string> = { all: "Everyone", free: "Free users", premium: "Premium users" };

function NotifsTab({
  notices,
  onSend,
}: {
  notices: Notice[];
  onSend: (n: { title: string; body: string; kind: NoticeKind; audience: NoticeAudience; channels: NoticeChannel[] }) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<NoticeKind>("info");
  const [audience, setAudience] = useState<NoticeAudience>("all");
  const [channels, setChannels] = useState<NoticeChannel[]>(["inbox"]);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const tm = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(tm);
  }, [toast]);

  const toggle = (c: NoticeChannel) =>
    setChannels((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  const send = () => {
    if (!title.trim() || !body.trim()) {
      setErr("Title and message are required");
      return;
    }
    if (channels.length === 0) {
      setErr("Pick at least one delivery method");
      return;
    }
    onSend({ title: title.trim(), body: body.trim(), kind, audience, channels });
    setTitle("");
    setBody("");
    setErr("");
    setToast("Notification sent ✅");
  };

  return (
    <div className="scroll-hide mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-20">
      {/* composer */}
      <div className="rounded-xl border border-panel-edge bg-panel p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Megaphone className="size-4 text-glow" /> New notification
        </div>
        <input
          aria-label="Notification title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setErr("");
          }}
          placeholder="Title — e.g. Weekend gift 🎁"
          className="mt-3 w-full rounded-lg border border-panel-edge bg-night px-3 py-2.5 text-sm text-ink outline-none placeholder:text-dim focus:border-gold/60"
        />
        <textarea
          aria-label="Notification message"
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setErr("");
          }}
          rows={3}
          placeholder="Message text…"
          className="mt-2 w-full resize-none rounded-lg border border-panel-edge bg-night px-3 py-2.5 text-sm leading-6 text-ink outline-none placeholder:text-dim focus:border-gold/60"
        />

        <div className="mt-3 text-xs font-semibold text-dim">Type</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(Object.keys(KIND_LABEL) as NoticeKind[]).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setKind(k)}
              className={
                kind === k
                  ? "rounded-full border border-glow/40 bg-glow/15 px-3 py-1.5 text-xs font-bold text-glow"
                  : "rounded-full border border-panel-edge bg-night px-3 py-1.5 text-xs text-dim hover:text-ink"
              }
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>

        <div className="mt-3 text-xs font-semibold text-dim">Audience</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(Object.keys(AUD_LABEL) as NoticeAudience[]).map((a) => (
            <button
              type="button"
              key={a}
              onClick={() => setAudience(a)}
              className={
                audience === a
                  ? "rounded-full border border-glow/40 bg-glow/15 px-3 py-1.5 text-xs font-bold text-glow"
                  : "rounded-full border border-panel-edge bg-night px-3 py-1.5 text-xs text-dim hover:text-ink"
              }
            >
              {AUD_LABEL[a]}
            </button>
          ))}
        </div>

        <div className="mt-3 text-xs font-semibold text-dim">Delivery</div>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {CHANNEL_META.map(({ id, icon: I, label, sub }) => (
            <button
              type="button"
              key={id}
              onClick={() => toggle(id)}
              aria-pressed={channels.includes(id)}
              className={
                channels.includes(id)
                  ? "flex flex-col items-center gap-1 rounded-xl border border-glow/40 bg-glow/10 px-2 py-2.5 text-center"
                  : "flex flex-col items-center gap-1 rounded-xl border border-panel-edge bg-night px-2 py-2.5 text-center hover:border-ink/20"
              }
            >
              <I className={channels.includes(id) ? "size-4 text-glow" : "size-4 text-dim"} />
              <span className={channels.includes(id) ? "text-xs font-bold text-ink" : "text-xs font-semibold text-dim"}>{label}</span>
              <span className="text-[10px] leading-3.5 text-dim">{sub}</span>
            </button>
          ))}
        </div>

        {err && <div className="mt-2 text-sm text-danger">{err}</div>}
        <button
          type="button"
          onClick={send}
          className="mt-3 w-full rounded-lg bg-gold py-2.5 font-display text-sm font-bold text-night"
        >
          Send to users
        </button>
      </div>

      {/* history */}
      <div className="rounded-xl border border-panel-edge bg-panel p-4">
        <div className="flex items-center justify-between text-sm font-semibold text-ink">
          <span>Sent</span>
          <span className="text-xs font-medium text-dim">{notices.length}</span>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {notices.slice(0, 6).map((n) => {
            const meta = CHANNEL_META;
            return (
              <div key={n.id} className="rounded-lg bg-night px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{n.title}</span>
                  <span className="shrink-0 text-[11px] text-dim">
                    {new Date(n.at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="mt-1 line-clamp-2 text-xs leading-5 text-dim">{n.body}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-glow/15 px-2 py-0.5 text-[10px] font-bold text-glow">{KIND_LABEL[n.kind]}</span>
                  <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-bold text-dim">{AUD_LABEL[n.audience]}</span>
                  {meta
                    .filter((c) => n.channels.includes(c.id))
                    .map((c) => (
                      <c.icon key={c.id} className="size-3.5 text-dim" aria-label={c.label} />
                    ))}
                </div>
              </div>
            );
          })}
          {notices.length === 0 && (
            <div className="rounded-lg bg-night px-3 py-4 text-center text-xs text-dim">Nothing sent yet.</div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed inset-x-0 top-16 z-40 flex justify-center">
          <span className="screen-in rounded-full bg-ink px-4 py-2 text-sm font-semibold text-night">{toast}</span>
        </div>
      )}
    </div>
  );
}

/* ── Update tab — publish OTA releases; users download only changed parts ── */

const MODULE_META: { id: OtaModule; label: string; size: number }[] = [
  { id: "engine", label: "Connection engine", size: 3.8 },
  { id: "servers", label: "Server list", size: 1.2 },
  { id: "ui", label: "UI", size: 2.1 },
];

function OtaTab({
  appVersion,
  onPublish,
}: {
  appVersion: string;
  onPublish: (r: { version: string; notes: string; modules: OtaModule[]; sizeMb: number }) => void;
}) {
  const [version, setVersion] = useState("1.7.0");
  const [notes, setNotes] = useState("");
  const [mods, setMods] = useState<OtaModule[]>(["servers"]);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const tm = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(tm);
  }, [toast]);

  const size = MODULE_META.filter((m) => mods.includes(m.id)).reduce((s, m) => s + m.size, 0);

  const publish = () => {
    if (!version.trim()) {
      setErr("Version is required");
      return;
    }
    if (mods.length === 0) {
      setErr("Pick at least one changed part");
      return;
    }
    onPublish({
      version: version.trim(),
      notes: notes.trim() || "Stability improvements & fixes.",
      modules: mods,
      sizeMb: Math.round(size * 10) / 10,
    });
    setErr("");
    setNotes("");
    setToast("Update published — users get a popup 🚀");
  };

  return (
    <div className="scroll-hide mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-20">
      {/* current version */}
      <div className="rounded-xl border border-panel-edge bg-panel p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">Current version</span>
          <span dir="ltr" className="rounded-full bg-glow/15 px-2.5 py-0.5 font-mono text-xs font-bold text-glow">
            v{appVersion}
          </span>
        </div>
        <div className="mt-1.5 text-xs leading-5 text-dim">
          Users auto-install only the changed parts in the background — the app keeps running, no reinstall needed.
        </div>
      </div>

      {/* release composer */}
      <div className="rounded-xl border border-panel-edge bg-panel p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Rocket className="size-4 text-gold" /> Release an update
        </div>
        <input
          aria-label="New version"
          dir="ltr"
          value={version}
          onChange={(e) => {
            setVersion(e.target.value);
            setErr("");
          }}
          placeholder="e.g. 1.7.0"
          className="mt-3 w-full rounded-lg border border-panel-edge bg-night px-3 py-2.5 font-mono text-sm text-ink outline-none placeholder:text-dim focus:border-gold/60"
        />
        <textarea
          aria-label="Changelog"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Changelog — shown in the user's popup…"
          className="mt-2 w-full resize-none rounded-lg border border-panel-edge bg-night px-3 py-2.5 text-sm leading-6 text-ink outline-none placeholder:text-dim focus:border-gold/60"
        />

        <div className="mt-3 text-xs font-semibold text-dim">Changed parts — only these download</div>
        <div className="mt-1.5 flex flex-col gap-1.5">
          {MODULE_META.map((m) => {
            const on = mods.includes(m.id);
            return (
              <button
                type="button"
                key={m.id}
                onClick={() => setMods((ms) => (on ? ms.filter((x) => x !== m.id) : [...ms, m.id]))}
                aria-pressed={on}
                className={
                  on
                    ? "flex items-center justify-between rounded-lg border border-glow/40 bg-glow/10 px-3 py-2"
                    : "flex items-center justify-between rounded-lg border border-panel-edge bg-night px-3 py-2 hover:border-ink/20"
                }
              >
                <span className="flex items-center gap-2">
                  <span className={on ? "grid size-4 place-items-center rounded-full bg-glow" : "size-4 rounded-full border-2 border-ink/25"}>
                    {on && <Check className="size-3 text-on-glow" strokeWidth={3} />}
                  </span>
                  <span className={on ? "text-sm font-semibold text-ink" : "text-sm text-dim"}>{m.label}</span>
                </span>
                <span dir="ltr" className="font-mono text-xs text-dim">
                  {m.size.toFixed(1)} MB
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-lg bg-night px-3 py-2 text-sm">
          <span className="text-dim">Patch size</span>
          <span dir="ltr" className="font-mono font-bold text-ink">
            {size.toFixed(1)} MB
          </span>
        </div>

        {err && <div className="mt-2 text-sm text-danger">{err}</div>}
        <button
          type="button"
          onClick={publish}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-2.5 font-display text-sm font-bold text-night"
        >
          <Rocket className="size-4" /> Publish update
        </button>
      </div>

      {toast && (
        <div className="fixed inset-x-0 top-16 z-40 flex justify-center">
          <span className="screen-in rounded-full bg-ink px-4 py-2 text-sm font-semibold text-night">{toast}</span>
        </div>
      )}
    </div>
  );
}

/* ── Panel shell ── */

export function AdminPanel({
  configs,
  setConfigs,
  orders,
  devices,
  ownDeviceId,
  notices,
  onSendNotice,
  appVersion,
  onPublishOta,
  onApprove,
  onReject,
  onDevicePremium,
  onExit,
  onChangePass,
}: {
  configs: ConfigItem[];
  setConfigs: React.Dispatch<React.SetStateAction<ConfigItem[]>>;
  orders: Order[];
  devices: DeviceRecord[];
  ownDeviceId: string;
  notices: Notice[];
  onSendNotice: (n: { title: string; body: string; kind: NoticeKind; audience: NoticeAudience; channels: NoticeChannel[] }) => void;
  appVersion: string;
  onPublishOta: (r: { version: string; notes: string; modules: OtaModule[]; sizeMb: number }) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDevicePremium: (id: string, days: number) => void;
  onExit: () => void;
  onChangePass: (p: string) => void;
}) {
  const [tab, setTab] = useState<"configs" | "orders" | "users" | "notifs" | "update">("configs");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const active = configs.filter((c) => c.enabled).length;
  const pending = orders.filter((o) => o.status === "pending").length;

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

      <div className="mx-5 mt-4 grid grid-cols-4 gap-2">
        {[
          { i: Server, v: configs.length, l: "Configs" },
          { i: Server, v: active, l: "Live" },
          { i: Users, v: orders.length, l: "Orders" },
          { i: Users, v: devices.filter((d) => d.premium).length, l: "Premium" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-panel-edge bg-panel px-3 py-2">
            <div className="font-display text-xl font-bold text-ink tabular-nums">{s.v}</div>
            <div className="text-xs text-dim">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="mx-5 mt-4 grid grid-cols-5 gap-0.5 rounded-xl bg-panel p-1">
        {(["configs", "orders", "users", "notifs", "update"] as const).map((tb) => (
          <button
            type="button"
            key={tb}
            onClick={() => setTab(tb)}
            className={
              tab === tb
                ? "relative rounded-lg bg-night py-2 text-[13px] font-semibold text-ink"
                : "relative rounded-lg py-2 text-[13px] text-dim hover:text-ink"
            }
          >
            {tb === "configs" ? "Configs" : tb === "orders" ? "Orders" : tb === "users" ? "Users" : tb === "notifs" ? "Notifs" : "Update"}
            {tb === "orders" && pending > 0 && (
              <span className="absolute -top-1.5 -end-1 grid size-5 place-items-center rounded-full bg-gold text-[10px] font-bold text-night">
                {pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "configs" && (
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
      )}

      {tab === "orders" && <OrdersTab orders={orders} onApprove={onApprove} onReject={onReject} />}
      {tab === "users" && <UsersTab devices={devices} ownDeviceId={ownDeviceId} onDevicePremium={onDevicePremium} onChangePass={onChangePass} />}
      {tab === "notifs" && <NotifsTab notices={notices} onSend={onSendNotice} />}
      {tab === "update" && <OtaTab appVersion={appVersion} onPublish={onPublishOta} />}

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
