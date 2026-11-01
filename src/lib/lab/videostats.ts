import type { LabEvent } from "./protocol";

/* ────────────────────────────────────────────────────────────────────────────
 * آمار زندهٔ سشن‌های ویدیوی تونل (سمت سرور، در حافظهٔ پروسه)
 * مرورگر هر ۵۰۰ms با /api/lab/video-stats?sid=… پول می‌کند و پخش‌کننده و
 * نمودارها را با همین داده‌ها زنده نگه می‌دارد.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface VidStat {
  sid: string;
  name: string;
  bytes: number;
  chunks: number;
  requests: number;
  seeks: number;
  startedAt: number;
  lastActivityAt: number;
  done: boolean;
  error: string | null;
  mode: "hops" | "inline" | null;
  msBridge: number;
  log: LabEvent[];
  ring: { t: number; b: number }[];
}

const regs = new Map<string, VidStat>();
const MAX_SESSIONS = 48;

export function vidRegister(sid: string, name: string, rangeStart: number): VidStat {
  const existing = regs.get(sid);
  if (existing && existing.name === name) {
    existing.requests++;
    if (rangeStart > 0) existing.seeks++;
    existing.lastActivityAt = Date.now();
    return existing;
  }
  const s: VidStat = {
    sid,
    name,
    bytes: 0,
    chunks: 0,
    requests: 1,
    seeks: 0,
    startedAt: Date.now(),
    lastActivityAt: Date.now(),
    done: false,
    error: null,
    mode: null,
    msBridge: 0,
    log: [],
    ring: [],
  };
  regs.set(sid, s);
  if (regs.size > MAX_SESSIONS) {
    const oldest = regs.keys().next().value;
    if (oldest) regs.delete(oldest);
  }
  return s;
}

export function vidGet(sid: string): VidStat | null {
  return regs.get(sid) ?? null;
}

export function vidLog(s: VidStat, hop: LabEvent["hop"], msg: string): void {
  s.log.push({ t: Date.now() - s.startedAt, hop, msg });
  if (s.log.length > 80) s.log.splice(0, s.log.length - 80);
}

export function vidCount(s: VidStat, n: number): void {
  s.bytes += n;
  s.chunks++;
  s.lastActivityAt = Date.now();
  s.ring.push({ t: Date.now(), b: s.bytes });
  if (s.ring.length > 40) s.ring.shift();
}

export function vidDone(s: VidStat, error?: string): void {
  s.done = true;
  if (error) s.error = error;
}

/** سرعت لحظه‌ای بر پایهٔ پنجرهٔ ۲/۵ ثانیه‌ای آخر — بایت بر ثانیه */
export function vidBps(s: VidStat): number {
  const now = Date.now();
  let ref: { t: number; b: number } | null = null;
  for (const r of s.ring) {
    if (now - r.t <= 2500) {
      ref = r;
      break;
    }
  }
  if (!ref || now - ref.t < 400) return 0;
  const dt = (now - ref.t) / 1000;
  return Math.max(0, Math.round((s.bytes - ref.b) / dt));
}

/** اگر جریان بدون close رها شد (مثلاً سک مرورگر)، بعد از ۶ ثانیه بی‌تحرکی «منقضی» حساب کن */
export function vidActive(s: VidStat): boolean {
  if (s.done) return false;
  return Date.now() - s.lastActivityAt < 6000;
}
