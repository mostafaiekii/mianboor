'use strict';
/**
 * کانفیگ کاملِ اتصال — پورت buildConfigJson نسخهٔ اندروید (نسخهٔ اصلی ویندوز):
 *  - ماژول DNS با کش + queryStrategy=UseIPv4 (بدون AAAA)
 *  - هِج DNS لوکال (UDP/53)
 *  - بستن QUIC (UDP/443) تا مرورگر روی HTTP/2-TCP بماند
 *  - LAN/localhost → مستقیم (شبکهٔ داخلی از تونل بیرون می‌ماند)
 *  - بقیهٔ ترافیک → پروکسی
 */

const PRIVATE_IPS = [
  '127.0.0.0/8', '::1/128',
  '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '169.254.0/16',
  'fe80::/10', 'fc00::/7',
];

function buildMainConfig(parsed, socksPort, httpPort) {
  const outbound = JSON.parse(JSON.stringify(parsed.outbound));
  outbound.tag = 'proxy';

  // سرعت: بدون Nagle + TCP Fast Open (مثل اندروید)
  const stream = (outbound.streamSettings = outbound.streamSettings || {});
  stream.sockopt = { tcpFastOpen: true, tcpNoDelay: true };

  const sniffing = { enabled: true, destOverride: ['http', 'tls'] };

  const socksIn = {
    tag: 'socks-in', listen: '127.0.0.1', port: socksPort,
    protocol: 'socks', settings: { auth: 'noauth', udp: true }, sniffing,
  };
  const httpIn = {
    tag: 'http-in', listen: '127.0.0.1', port: httpPort,
    protocol: 'http', settings: {}, sniffing,
  };

  const dns = {
    queryStrategy: 'UseIPv4',
    disableCache: false,
    servers: ['8.8.8.8', '1.1.1.1'],
  };

  const rules = [
    // هِج DNS: کوئری‌های UDP/53 از ماژول DNS محلی جواب می‌گیرند
    { type: 'field', inboundTag: ['socks-in'], port: 53, network: 'udp', outboundTag: 'dns-out' },
    // بستن QUIC → مرورگر روی HTTP/2-TCP ادامه می‌دهد
    { type: 'field', port: 443, network: 'udp', outboundTag: 'block' },
    // شبکهٔ داخلی/لوکال → مستقیم
    { type: 'field', ip: PRIVATE_IPS, outboundTag: 'direct' },
    // همهٔ ترافیک → پروکسی
    { type: 'field', port: '0-65535', outboundTag: 'proxy' },
  ];

  return {
    log: { loglevel: 'warning' },
    dns,
    inbounds: [socksIn, httpIn],
    outbounds: [
      outbound,
      { tag: 'direct', protocol: 'freedom', settings: {} },
      { tag: 'block', protocol: 'blackhole', settings: {} },
      { tag: 'dns-out', protocol: 'dns', settings: {} },
    ],
    routing: { domainStrategy: 'AsIs', rules },
  };
}

module.exports = { buildMainConfig };
