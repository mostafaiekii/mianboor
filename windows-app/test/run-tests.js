'use strict';
/**
 * تست‌های واحد میانپور ویندوز — بدون وابستگی خارجی، بدون هسته.
 * اجرا: npm test  →  node test/run-tests.js
 * هر خط ✓/✗ چاپ می‌شود؛ خروج از فرایند = تعداد شکست‌ها.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const { parseLink, parseLinks } = require('../src/parse');
const { buildMainConfig } = require('../src/config');
const { Store } = require('../src/store');
const { EmergencyGate } = require('../src/emergency');
const { findFreePort, xrayAvailable } = require('../src/xray');
const { httpsThroughSocks } = require('../src/ping');

let passed = 0, failed = 0;
function T(name, cond, info) {
  if (cond) { passed++; console.log('  ✓ ' + name + (info ? ' — ' + info : '')); }
  else { failed++; console.log('  ✗ ' + name + (info ? ' — ' + info : '')); }
}

async function main() {
  // ── ۱. پارسر — vless reality با همهٔ پارامترها ──
  {
    const link = 'vless://d342d11e-3333-4321-8765-abcdef123456@1.2.3.4:443?type=tcp&security=reality&sni=www.google.com&fp=chrome&pbk=SbVKOEMjK0sIlbwg4akyBg5mL5KZgY8i4L8TjODRinv&sid=6ba85179&spx=%2F&flow=xtls-rprx-vision#RealityTest';
    const p = parseLink(link, '');
    T('vless reality: parse ok', !!p && p.protocol === 'vless', p ? `${p.host}:${p.port}` : '');
    const rs = p && p.outbound.streamSettings.realitySettings;
    T('vless reality: sni/fp/pbk/sid/spx', !!rs && rs.serverName === 'www.google.com' && rs.fingerprint === 'chrome' &&
      rs.publicKey === 'SbVKOEMjK0sIlbwg4akyBg5mL5KZgY8i4L8TjODRinv' && rs.shortId === '6ba85179' && rs.spiderX === '/');
    T('vless reality: flow', p && p.outbound.settings.vnext[0].users[0].flow === 'xtls-rprx-vision');
  }

  // ── ۲. پارسر — vless ws + tls ──
  {
    const link = 'vless://d342d11e-3333-4321-8765-abcdef123456@5.6.7.8:443?type=ws&security=tls&sni=cdn.example.com&host=cdn.example.com&path=%2Fwspath&alpn=h2,http%2F1.1#WsTest';
    const p = parseLink(link, '');
    const ss = p && p.outbound.streamSettings;
    T('vless ws+tls: tls serverName', ss && ss.tlsSettings.serverName === 'cdn.example.com');
    T('vless ws+tls: alpn split', ss && Array.isArray(ss.tlsSettings.alpn) && ss.tlsSettings.alpn.length === 2);
    T('vless ws: path/host', ss && ss.wsSettings.path === '/wspath' && ss.wsSettings.headers.Host === 'cdn.example.com');
  }

  // ── ۳. پارسر — vmess base64 ──
  {
    const j = { v: '2', ps: 'VmessTest', add: '9.9.9.9', port: '443', id: 'd342d11e-3333-4321-8765-abcdef123456', aid: '0', net: 'tcp', tls: 'tls', sni: 'vm.example.com', scy: 'auto' };
    const link = 'vmess://' + Buffer.from(JSON.stringify(j)).toString('base64');
    const p = parseLink(link, '');
    T('vmess: parse + name', !!p && p.protocol === 'vmess' && p.name === 'VmessTest');
    T('vmess: tls sni', p && p.outbound.streamSettings.tlsSettings.serverName === 'vm.example.com');
    T('vmess: vnext user', p && p.outbound.settings.vnext[0].users[0].security === 'auto');
  }

  // ── ۴. پارسر — trojan (پیش‌فرض tls) ──
  {
    const p = parseLink('trojan://pass123@t.example.com:443?sni=t.example.com#TrojanTest', '');
    T('trojan: default tls + password', p && p.outbound.streamSettings.security === 'tls' &&
      p.outbound.settings.servers[0].password === 'pass123');
  }

  // ── ۵. پارسر — ss SIP002 ──
  {
    const userInfo = Buffer.from('aes-256-gcm:testpass').toString('base64').replace(/=+$/, '');
    const p = parseLink(`ss://${userInfo}@1.1.1.1:8388#SSTest`, '');
    T('ss SIP002: method/pass', p && p.outbound.settings.servers[0].method === 'aes-256-gcm' &&
      p.outbound.settings.servers[0].password === 'testpass');
  }

  // ── ۶. پارسر — موارد نامعتبر ──
  {
    T('invalid: garbage → null', parseLink('https://example.com/whatever', '') === null);
    T('invalid: ss with plugin → null', parseLink('ss://' + Buffer.from('aes-128-gcm:x').toString('base64') + '@1.1.1.1:443?plugin=obfs-local%3Bobfs%3Dhttp', '') === null);
    T('invalid: vless بدون @ → null', parseLink('vless://no-at-sign-here', '') === null);
  }

  // ── ۷. parseLinks — دده‌اش + id ──
  {
    const text = 'vless://d342d11e-3333-4321-8765-abcdef123456@1.2.3.4:443?type=tcp&security=reality&sni=a.com&pbk=k&sid=s&spx=%2F#A\n' +
      'vless://d342d11e-3333-4321-8765-abcdef123456@1.2.3.4:443?type=tcp&security=reality&sni=a.com&pbk=k&sid=s&spx=%2F#A\n' +
      'garbage-line';
    const list = parseLinks(text);
    T('parseLinks: dedupe + skip invalid', list.length === 1 && list[0].id && list[0].id.length === 16);
  }

  // ── ۸. کانفیگ اصلی ──
  {
    const parsed = parseLink('vless://d342d11e-3333-4321-8765-abcdef123456@1.2.3.4:443?type=tcp&security=reality&sni=a.com&pbk=k&sid=s&spx=%2F#A', '');
    const cfg = buildMainConfig(parsed, 10808, 10809, 34567);
    const proxy = cfg.outbounds[0];
    T('mainConfig: proxy tag + sockopt', proxy.tag === 'proxy' && proxy.streamSettings.sockopt.tcpFastOpen === true && proxy.streamSettings.sockopt.tcpNoDelay === true);
    T('mainConfig: dns module (UseIPv4)', cfg.dns && cfg.dns.queryStrategy === 'UseIPv4' && Array.isArray(cfg.dns.servers) && cfg.dns.servers.length >= 2);
    T('mainConfig: QUIC block + LAN direct', cfg.routing.rules.some((r) => r.outboundTag === 'block' && r.port === 443 && r.network === 'udp') &&
      cfg.routing.rules.some((r) => r.outboundTag === 'direct' && Array.isArray(r.ip)));
    T('mainConfig: stats api + policy', cfg.api && cfg.api.services.includes('StatsService') && !!cfg.policy.system.statsInboundDownlink);
    T('mainConfig: api inbound port', cfg.inbounds.some((i) => i.tag === 'api' && i.port === 34567));
  }

  // ── ۹. Store ──
  {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mb-store-'));
    const file = path.join(dir, 'cfg.json');
    const s1 = new Store(file);
    s1.data.configs.push({ id: 'x1', name: 'N', protocol: 'vless', host: 'h', port: 1, country: 'de', link: 'vless://x', source: 'manual', addedAt: 1 });
    s1.data.settings.theme = 'forest';
    s1.save();
    const s2 = new Store(file);
    T('store: roundtrip', s2.data.configs.length === 1 && s2.data.configs[0].id === 'x1' && s2.data.settings.theme === 'forest');

    fs.writeFileSync(file, '{{{corrupt!!');
    const s3 = new Store(file);
    const renamed = fs.readdirSync(dir).some((f) => f.startsWith('cfg.json.corrupt-'));
    T('store: corrupt → recover to defaults', s3.data.configs.length === 0 && renamed);

    const s4 = new Store(path.join(dir, 'missing.json'));
    T('store: fresh defaults', s4.data.settings.theme === 'midnight' && s4.data.settings.lang === 'fa' && s4.data.settings.livePing === true);
    fs.rmSync(dir, { recursive: true, force: true });
  }

  // ── ۱۰. EmergencyGate — کش ──
  {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mb-emg-'));
    const gate = new EmergencyGate(path.join(dir, 'emg.json'));
    const pool = { links: [{ link: 'vless://d342d11e-3333-4321-8765-abcdef123456@1.2.3.4:443#E', name: 'EMG-01', proto: 'VLESS' }], mirrors: ['https://a.example.com'] };
    gate.cachePut(pool);
    const got = gate.cacheGet();
    T('emg cache: roundtrip + fromCache', got && got.fromCache === true && got.links.length === 1 && got.links[0].name === 'EMG-01' && got.savedAt !== '—');

    fs.writeFileSync(path.join(dir, 'emg.json'), 'not-json');
    T('emg cache: corrupt → null without crash', new EmergencyGate(path.join(dir, 'emg.json')).cacheGet() === null);

    fs.writeFileSync(path.join(dir, 'emg2.json'), JSON.stringify({ links: [{ link: 'garbage' }], savedAt: Date.now() }));
    T('emg cache: non-config links filtered', new EmergencyGate(path.join(dir, 'emg2.json')).cacheGet() === null);
    fs.rmSync(dir, { recursive: true, force: true });
  }

  // ── ۱۱. زیرساخت ──
  {
    const p1 = await findFreePort(25000);
    T('findFreePort: returns usable port', Number.isInteger(p1) && p1 > 1024);
    let rejected = false;
    try { await httpsThroughSocks(1, 'https://example.com/x', 1500); } catch { rejected = true; }
    T('dead socks endpoint: rejects without hang', rejected);
    T('xray binary: present for E2E', xrayAvailable(), 'فقط نشانه است — تست‌های واحد مستقل از هسته‌اند');
  }

  console.log(`\nunit: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('runner crashed:', e); process.exit(1); });
