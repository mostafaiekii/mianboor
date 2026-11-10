'use strict';
/**
 * پارسر لینک‌های کانفیگ — پورت دقیق XrayConfigBuilder.kt نسخهٔ اندروید.
 * vmess / vless / trojan / shadowsocks → خروجیِ آمادهٔ outbound برای Xray-core.
 */

function b64decode(input) {
  let s = String(input || '').trim().replace(/-/g, '+').replace(/_/g, '/').replace(/\r/g, '').replace(/\n/g, '').replace(/ /g, '');
  const pad = (4 - (s.length % 4)) % 4;
  s += '='.repeat(pad);
  return Buffer.from(s, 'base64').toString('utf8');
}

/** decode با حفظِ + (لینک‌های اشتراکی + را معمولاً literal می‌فرستند) */
function dec(s) {
  try { return decodeURIComponent(String(s).replace(/\+/g, '%2B')); } catch { return String(s); }
}

function splitFragment(rest) {
  const i = rest.indexOf('#');
  if (i >= 0) return [rest.substring(0, i), rest.substring(i + 1)];
  return [rest, null];
}

function parseQuery(q) {
  const out = {};
  if (!q) return out;
  for (const p of q.split('&')) {
    const i = p.indexOf('=');
    if (i <= 0) continue;
    out[dec(p.substring(0, i))] = dec(p.substring(i + 1));
  }
  return out;
}

/** Bracket-aware host:port splitter (IPv6-safe) */
function splitHostPort(hp) {
  const s = String(hp || '').trim();
  if (s.startsWith('[')) {
    const close = s.indexOf(']');
    if (close < 0) return null;
    const host = s.substring(1, close);
    const portPart = s.substring(close + 1).replace(/^:/, '');
    const port = parseInt(portPart, 10);
    if (!port) return null;
    return [host, port];
  }
  const i = s.lastIndexOf(':');
  if (i <= 0) return null;
  const port = parseInt(s.substring(i + 1), 10);
  if (!port) return null;
  return [s.substring(0, i), port];
}

// ---------------------------------------------------------------------------
// Stream settings — همان پوشش نسخهٔ اندروید: tls/reality/xtls + ws/grpc/h2/httpupgrade/xhttp/tcp-http
// ---------------------------------------------------------------------------

function buildStreamSettings(network, security, q) {
  const stream = {};
  const sec = String(security || '').toLowerCase();

  if (sec === 'tls') {
    const tls = {
      serverName: (q.sni && q.sni.trim()) || (q.host && q.host.trim()) || '',
      allowInsecure: q.allowInsecure === '1' || q.allowInsecure === 'true',
    };
    if (q.alpn && q.alpn.trim()) {
      tls.alpn = q.alpn.split(',').map((a) => a.trim()).filter(Boolean);
    }
    if (q.fp && q.fp.trim()) tls.fingerprint = q.fp.trim();
    stream.security = 'tls';
    stream.tlsSettings = tls;
  } else if (sec === 'reality') {
    stream.security = 'reality';
    stream.realitySettings = {
      serverName: (q.sni && q.sni.trim()) || '',
      fingerprint: (q.fp && q.fp.trim()) || 'chrome',
      publicKey: q.pbk || '',
      shortId: q.sid || '',
      spiderX: q.spx || '',
    };
  } else if (sec === 'xtls') {
    // legacy — مثل اندروید: tls ساده
    stream.security = 'tls';
    stream.tlsSettings = { serverName: (q.sni && q.sni.trim()) || '', allowInsecure: false };
  } else {
    stream.security = 'none';
  }

  const net = network || 'tcp';
  if (net === 'ws') {
    const ws = { path: (q.path && q.path.trim()) || '/' };
    if (q.host && q.host.trim()) ws.headers = { Host: q.host.trim() };
    stream.network = 'ws';
    stream.wsSettings = ws;
  } else if (net === 'grpc') {
    stream.network = 'grpc';
    stream.grpcSettings = {
      serviceName: (q.serviceName && q.serviceName.trim()) || (q.path && q.path.trim()) || '',
    };
    if (q.mode === 'multi') stream.grpcSettings.multiMode = true;
  } else if (net === 'h2' || net === 'http') {
    const h2 = { path: (q.path && q.path.trim()) || '/' };
    if (q.host && q.host.trim()) h2.host = q.host.split(',').map((a) => a.trim()).filter(Boolean);
    stream.network = 'h2';
    stream.httpSettings = h2;
  } else if (net === 'httpupgrade') {
    const hu = { path: (q.path && q.path.trim()) || '/' };
    if (q.host && q.host.trim()) hu.host = q.host.trim();
    stream.network = 'httpupgrade';
    stream.httpupgradeSettings = hu;
  } else if (net === 'xhttp' || net === 'splithttp') {
    const xh = { path: (q.path && q.path.trim()) || '/' };
    if (q.host && q.host.trim()) xh.host = q.host.trim();
    stream.network = 'xhttp';
    stream.xhttpSettings = xh;
  } else if (net === 'tcp') {
    if (q.headerType === 'http') {
      const req = { version: '1.1', method: 'GET', path: [(q.path && q.path.trim()) || '/'] };
      if (q.host && q.host.trim()) req.headers = { Host: q.host.split(',').map((a) => a.trim()).filter(Boolean) };
      stream.network = 'tcp';
      stream.tcpSettings = { header: { type: 'http', request: req } };
    } else {
      stream.network = 'tcp';
    }
  } else {
    // kcp / quic و بقیه — مثل اندروید پشتیبانی نمی‌شوند
    return null;
  }
  return stream;
}

// ---------------------------------------------------------------------------
// vmess://<base64 json>
// ---------------------------------------------------------------------------

function parseVmess(link, fallbackName) {
  const json = b64decode(link.replace(/^vmess:\/\//, ''));
  const j = JSON.parse(json);
  const host = String(j.add || '');
  const port = parseInt(j.port, 10) || 0;
  if (!host || port <= 0) return null;

  const user = {
    id: String(j.id || ''),
    alterId: parseInt(j.aid != null ? j.aid : (j.alterId || 0), 10) || 0,
    security: String(j.scy || 'auto'),
    level: 0,
  };
  const settings = { vnext: [{ address: host, port, users: [user] }] };

  const q = {
    type: String(j.net || 'tcp'),
    security: String(j.tls || ''),
    sni: String(j.sni || ''),
    host: String(j.host || ''),
    path: String(j.path || ''),
    alpn: String(j.alpn || ''),
    fp: String(j.fp || ''),
  };
  const stream = buildStreamSettings(String(j.net || 'tcp'), String(j.tls || ''), q);

  const outbound = { protocol: 'vmess', settings };
  if (stream) outbound.streamSettings = stream;

  return {
    name: (String(j.ps || '').trim()) || fallbackName,
    protocol: 'vmess',
    host,
    port,
    rawLink: link,
    outbound,
  };
}

// ---------------------------------------------------------------------------
// vless://uuid@host:port?params#name | trojan://pass@host:port?params#name
// ---------------------------------------------------------------------------

function parseUserPassLink(link, fallbackName, protocol) {
  const rest = link.replace(new RegExp('^' + protocol + ':\\/\\/'), '');
  const [body, fragment] = splitFragment(rest);
  const qIdx = body.indexOf('?');
  const authority = qIdx >= 0 ? body.substring(0, qIdx) : body;
  const query = parseQuery(qIdx >= 0 ? body.substring(qIdx + 1) : '');

  const atIdx = authority.lastIndexOf('@');
  if (atIdx <= 0) return null;
  const secret = dec(authority.substring(0, atIdx));
  const hp = splitHostPort(authority.substring(atIdx + 1));
  if (!hp) return null;
  const [host, port] = hp;

  const security = query.security != null ? query.security : (protocol === 'trojan' ? 'tls' : '');
  const network = query.type || 'tcp';

  let settings;
  if (protocol === 'vless') {
    const user = { id: secret, encryption: 'none', level: 0 };
    if (query.flow && query.flow.trim()) user.flow = query.flow.trim();
    settings = { vnext: [{ address: host, port, users: [user] }] };
  } else {
    settings = { servers: [{ address: host, port, password: secret }] };
  }

  const stream = buildStreamSettings(network, security, query);
  const outbound = { protocol, settings };
  if (stream) outbound.streamSettings = stream;

  let name = fallbackName;
  if (fragment) {
    const f = dec(fragment).trim();
    if (f) name = f;
  }
  return { name, protocol, host, port, rawLink: link, outbound };
}

// ---------------------------------------------------------------------------
// ss://
// ---------------------------------------------------------------------------

function parseShadowsocks(link, fallbackName) {
  const rest = link.replace(/^ss:\/\//, '');
  const [body, fragment] = splitFragment(rest);
  const qIdx = body.indexOf('?');
  const mainPart = qIdx >= 0 ? body.substring(0, qIdx) : body;
  const query = parseQuery(qIdx >= 0 ? body.substring(qIdx + 1) : '');

  // مثل اندروید: کانفیگ‌های plugin دار (simple-obfs / v2ray-plugin) پشتیبانی نمی‌شوند
  if (query.plugin && query.plugin.trim()) return null;

  const atIdx = mainPart.lastIndexOf('@');
  let decoded;
  let hostPort;
  if (atIdx > 0) {
    // SIP002: [base64(method:pass)]@host:port
    const userInfo = mainPart.substring(0, atIdx);
    hostPort = mainPart.substring(atIdx + 1);
    decoded = userInfo.includes(':') ? userInfo : b64decode(userInfo);
  } else {
    // کاملاً base64: base64(method:pass@host:port)
    decoded = b64decode(mainPart);
    const dAt = decoded.lastIndexOf('@');
    if (dAt <= 0) return null;
    hostPort = decoded.substring(dAt + 1);
  }

  const colon = decoded.indexOf(':');
  if (colon <= 0) return null;
  const method = decoded.substring(0, colon);
  const password = decoded.substring(colon + 1);
  const hp = splitHostPort(hostPort);
  if (!hp) return null;
  const [host, port] = hp;

  const outbound = {
    protocol: 'shadowsocks',
    settings: { servers: [{ address: host, port, method, password }] },
  };

  let name = fallbackName;
  if (fragment) {
    const f = dec(fragment).trim();
    if (f) name = f;
  }
  return { name, protocol: 'shadowsocks', host, port, rawLink: link, outbound };
}

// ---------------------------------------------------------------------------

function parseLink(raw, fallbackName) {
  const link = String(raw || '').trim();
  try {
    if (link.startsWith('vmess://')) return parseVmess(link, fallbackName);
    if (link.startsWith('vless://')) return parseUserPassLink(link, fallbackName, 'vless');
    if (link.startsWith('trojan://')) return parseUserPassLink(link, fallbackName, 'trojan');
    if (link.startsWith('ss://')) return parseShadowsocks(link, fallbackName);
    return null;
  } catch {
    return null;
  }
}

/** چند لینک (هر خط یکی) → لیست سرورهای تازه (بدون تکرار) */
function parseLinks(text) {
  const out = [];
  const seen = new Set();
  for (const lineRaw of String(text || '').split(/[\r\n]+/)) {
    const line = lineRaw.trim();
    if (!line) continue;
    const parsed = parseLink(line, '');
    if (!parsed) continue;
    const key = cryptoHash(line);
    if (seen.has(key)) continue;
    seen.add(key);
    parsed.id = key;
    out.push(parsed);
  }
  return out;
}

const crypto = require('crypto');
function cryptoHash(s) {
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);
}

module.exports = { parseLink, parseLinks, buildStreamSettings, b64decode, cryptoHash };
