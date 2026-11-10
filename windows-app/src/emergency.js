'use strict';
/**
 * دروازهٔ اضطراری — پورت دقیق EmergencyGate.kt نسخهٔ اندروید:
 *   ۱) کشف دامنه‌ها از نقشهٔ CDN (jsDelivr + GitHub raw)
 *   ۲) کاوش زنده بودن هر دامنه (هر پاسخ HTTP حتی 401/404 یعنی مسیر باز است)
 *   ۳) دریافت استخر: توکن → seeds عمومی (بدون توکن)
 *   ۴) کش اضطراری محلی برای لحظهٔ قطعی کامل
 * نسخهٔ ویندوز توکن ندارد → مسیر seeds عمومی.
 */
const fs = require('fs');
const path = require('path');

const CDN_MAP = 'https://cdn.jsdelivr.net/gh/mostafaiekii/mianboor@main/emergency/pool.json';
const RAW_MAP = 'https://raw.githubusercontent.com/mostafaiekii/mianboor/main/emergency/pool.json';
const POOL_PATH = '/api/emergency/pool';

function b64decode(input) {
  let s = String(input || '').trim().replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
  const pad = (4 - (s.length % 4)) % 4;
  s += '='.repeat(pad);
  try { return Buffer.from(s, 'base64').toString('utf8'); } catch { return ''; }
}

function isCfg(l) {
  return l.startsWith('vless://') || l.startsWith('vmess://') ||
    l.startsWith('trojan://') || l.startsWith('ss://');
}

function protoOf(link) {
  if (link.startsWith('vless://')) return 'VLESS';
  if (link.startsWith('vmess://')) return 'VMess';
  if (link.startsWith('trojan://')) return 'Trojan';
  if (link.startsWith('ss://')) return 'Shadowsocks';
  return '';
}

async function httpGet(url, timeoutMs) {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return await resp.text();
  } catch { return null; }
}

async function httpStatus(url, timeoutMs) {
  try {
    const resp = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(timeoutMs) });
    return resp.status;
  } catch { return 0; }
}

/** ۱) کشف دامنه‌ها */
async function discover(log) {
  const found = new Set();
  for (const mapUrl of [CDN_MAP, RAW_MAP]) {
    const where = mapUrl.includes('jsdelivr') ? 'CDN jsDelivr' : 'GitHub raw';
    const body = await httpGet(mapUrl, 6000);
    if (!body) { log(`✗ ${where} پاسخ نداد`); continue; }
    try {
      const arr = JSON.parse(body).mirrors;
      if (!Array.isArray(arr)) { log(`✗ ${where} نقشهٔ نامعتبر`); continue; }
      let n = 0;
      for (const m of arr) {
        const v = String(m).trim().replace(/\/+$/, '');
        if (v.startsWith('http') && !found.has(v)) { found.add(v); n++; }
      }
      log(`✓ ${where} — ${n} دامنهٔ جدید`);
    } catch { log(`✗ ${where} نقشهٔ نامعتبر`); }
  }
  return [...found];
}

/** ۳) استخر اضطراری از یک دامنهٔ زنده */
async function fetchPool(base, log) {
  const b = base.replace(/\/+$/, '');
  const links = [];
  const mirrors = [];

  // seeds عمومی — بدون توکن؛ حتی اگر توکن عوض شده باشد کار می‌کند
  const body = await httpGet(b + POOL_PATH, 8000);
  if (!body) { log(`✗ ${b} — بدون پاسخ (seeds)`); return null; }
  try {
    const j = JSON.parse(body);
    if (!mirrors.length && Array.isArray(j.mirrors)) {
      for (const m of j.mirrors) {
        const v = String(m).trim().replace(/\/+$/, '');
        if (v && !mirrors.includes(v)) mirrors.push(v);
      }
    }
    if (Array.isArray(j.seeds)) {
      for (const seed of j.seeds) {
        const l = b64decode(seed).trim();
        if (isCfg(l)) links.push({ link: l, name: `EMG-${String(links.length + 1).padStart(2, '0')}`, proto: protoOf(l) });
      }
    }
    if (links.length) log(`✓ ${b} — ${links.length} کانفیگ از seeds عمومی`);
    else log(`✗ ${b} — استخر خالی`);
  } catch { log(`✗ ${b} — پاسخ نامعتبر`); }

  return links.length ? { base: b, mirrors, links } : null;
}

class EmergencyGate {
  constructor(cacheFile) {
    this.cacheFile = cacheFile;
  }

  /** کل جریان: کشف → کاوش → دریافت → (شکست؟) حافظهٔ اضطراری */
  async rescue(log) {
    log('— کشف دامنه‌های ممکن…');
    const candidates = await discover(log);
    log(`— ${candidates.length} دامنهٔ کاندید؛ کاوش…`);
    const mirrors = [];
    for (const base of candidates) {
      const st = await httpStatus(base + POOL_PATH, 4000);
      const alive = st > 0;
      log(alive ? `✓ زنده: ${base}` : `✗ مرده: ${base}`);
      if (!alive) continue;
      const pool = await fetchPool(base, log);
      if (pool) {
        this.cachePut(pool);
        return { ...pool, mirrors: [...new Set([...pool.mirrors, ...mirrors])], fromCache: false, savedAt: '' };
      }
    }
    const cached = this.cacheGet();
    if (cached) {
      log(`— شبکه قطع بود؛ ${cached.links.length} کانفیگ از حافظهٔ اضطراری`);
      return cached;
    }
    return null;
  }

  cachePut(pool) {
    try {
      fs.mkdirSync(path.dirname(this.cacheFile), { recursive: true });
      fs.writeFileSync(this.cacheFile, JSON.stringify({
        links: pool.links, mirrors: pool.mirrors, savedAt: Date.now(),
      }));
    } catch {}
  }

  cacheGet() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
      if (!Array.isArray(raw.links) || !raw.links.length) return null;
      const links = raw.links.filter((e) => e && isCfg(e.link))
        .map((e) => ({ link: e.link, name: e.name || 'EMG', proto: e.proto || protoOf(e.link) }));
      if (!links.length) return null;
      return {
        base: 'cache', mirrors: raw.mirrors || [], links,
        fromCache: true,
        savedAt: raw.savedAt ? new Date(raw.savedAt).toLocaleString('fa-IR') : '—',
      };
    } catch { return null; }
  }
}

module.exports = { EmergencyGate };
