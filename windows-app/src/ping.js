'use strict';
/**
 * پینگ واقعی — پورت RealPing.kt نسخهٔ اندروید:
 * برای هر کانفیگ یک هستهٔ موقتِ Xray بالا می‌آید و از دلِ تونل یک درخواست
 * HTTPS واقعی به generate_204 فرستاده می‌شود. عدد برگشتی = تاخیر واقعی مسیر.
 * اگر عددی برنگشت یعنی TCP باز است ولی تونل واقعاً کار نمی‌کند.
 */

const net = require('net');
const tls = require('tls');
const { parseLink } = require('./parse');
const { findFreePort, XrayRunner } = require('./xray');

const TEST_URLS = [
  'https://cp.cloudflare.com/generate_204',
  'https://www.gstatic.com/generate_204',
];

/** کلاینت SOCKS5 مینیمال (بدون احراز هویت) — CONNECT به مقصد */
function socksConnect(socksPort, targetHost, targetPort, timeoutMs = 9000) {
  return new Promise((resolve, reject) => {
    const s = net.connect({ host: '127.0.0.1', port: socksPort });
    let stage = 0;
    let buf = Buffer.alloc(0);
    const timer = setTimeout(() => { s.destroy(); reject(new Error('socks timeout')); }, timeoutMs);
    const fail = (err) => { clearTimeout(timer); try { s.destroy(); } catch {} reject(err); };
    s.on('error', fail);
    s.on('connect', () => s.write(Buffer.from([0x05, 0x01, 0x00])));
    s.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      if (stage === 0) {
        if (buf.length < 2) return;
        if (buf[0] !== 0x05 || buf[1] !== 0x00) { fail(new Error('socks handshake rejected')); return; }
        stage = 1;
        buf = buf.subarray(2);
        const isV4 = net.isIPv4(targetHost);
        const isV6 = net.isIPv6(targetHost);
        const addrBuf = Buffer.from(targetHost, 'utf8');
        let req;
        if (isV4 || isV6) {
          const atyp = isV4 ? 0x01 : 0x04;
          req = Buffer.concat([Buffer.from([0x05, 0x01, 0x00, atyp]), addrBuf]);
        } else {
          req = Buffer.concat([Buffer.from([0x05, 0x01, 0x00, 0x03, addrBuf.length]), addrBuf]);
        }
        req = Buffer.concat([req, Buffer.from([(targetPort >> 8) & 0xff, targetPort & 0xff])]);
        s.write(req);
      } else {
        if (buf.length < 5) return;
        if (buf[0] !== 0x05 || buf[1] !== 0x00) { fail(new Error('socks connect failed (code ' + buf[1] + ')')); return; }
        const atyp = buf[3];
        let total;
        if (atyp === 0x01) total = 4 + 4 + 2;
        else if (atyp === 0x04) total = 4 + 16 + 2;
        else if (atyp === 0x03) total = 4 + 1 + buf[4] + 2;
        else { fail(new Error('socks bad reply')); return; }
        if (buf.length < total) return;
        clearTimeout(timer);
        s.removeAllListeners('data');
        s.removeAllListeners('error');
        resolve(s);
      }
    });
  });
}

/**
 * HTTPS GET از داخل SOCKS — statusCode برمی‌گرداند.
 * نکتهٔ مهم: https.request با agent:false آپشن createConnection را نادیده
 * می‌گیرد و مستقیم وصل می‌شود (مثبتِ کاذب!) — پس HTTP/1.1 را دستی روی سوکت
 * TLS تونل می‌نویسیم تا «واقعاً» از دل تونل برود.
 */
function httpsThroughSocks(socksPort, urlStr, timeoutMs = 9000) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const host = u.hostname;
    const port = u.port ? Number(u.port) : 443;
    socksConnect(socksPort, host, port).then((raw) => {
      const tlsSock = tls.connect({ socket: raw, servername: host, rejectUnauthorized: false });
      let done = false;
      const finish = (fn, val) => {
        if (done) return; done = true;
        try { tlsSock.destroy(); raw.destroy(); } catch {}
        fn(val);
      };
      const fail = (err) => finish(reject, err);
      tlsSock.once('error', fail);
      tlsSock.setTimeout(timeoutMs, () => fail(new Error('timeout')));
      tlsSock.once('secureConnect', () => {
        tlsSock.write(
          `GET ${u.pathname}${u.search || ''} HTTP/1.1\r\n` +
          `Host: ${host}\r\n` +
          `User-Agent: MianboorPing/1.0\r\n` +
          `Accept: */*\r\n` +
          `Connection: close\r\n\r\n`
        );
      });
      let buf = Buffer.alloc(0);
      tlsSock.on('data', (d) => {
        buf = Buffer.concat([buf, d]);
        const idx = buf.indexOf('\r\n\r\n');
        if (idx < 0) return;
        const head = buf.subarray(0, idx).toString('utf8');
        const m = head.match(/^HTTP\/[\d.]+ (\d{3})/);
        if (m) finish(resolve, parseInt(m[1], 10));
        else fail(new Error('bad http response'));
      });
    }, (e) => reject(e));
  });
}

/**
 * تست واقعی یک لینک → { ok: boolean, ms?: number, reason?: string }
 */
async function realPing(link, log) {
  const logger = log || (() => {});
  const parsed = parseLink(link, 'ping');
  if (!parsed) return { ok: false, reason: 'لینک قابل خواندن نیست' };

  const socksPort = await findFreePort(20000 + Math.floor(Math.random() * 20000));
  const cfg = {
    log: { loglevel: 'none' },
    inbounds: [{
      tag: 'ping-in', listen: '127.0.0.1', port: socksPort,
      protocol: 'socks', settings: { auth: 'noauth', udp: false },
    }],
    outbounds: [parsed.outbound, { tag: 'direct', protocol: 'freedom', settings: {} }],
  };

  const runner = new XrayRunner({ config: cfg, log: logger });
  try {
    runner.start();
    const up = await runner.waitReady(socksPort, 5000);
    if (!up) return { ok: false, reason: 'هستهٔ تست بالا نیامد (کانفیگ نامعتبر)' };
    const t0 = Date.now();
    for (const url of TEST_URLS) {
      try {
        const code = await httpsThroughSocks(socksPort, url, 9000);
        if (code >= 200 && code < 400) return { ok: true, ms: Date.now() - t0 };
      } catch { /* آدرس بعدی */ }
    }
    return { ok: false, reason: 'TCP باز است ولی تونل واقعی ترافیک رد نکرد' };
  } finally {
    runner.stop();
  }
}

/** تست موازی چند لینک — onDone(id, res) بعد از هر کدام صدا زده می‌شود */
async function realPingQueue(items, { parallel = 3, onDone, log } = {}) {
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      const { id, link } = items[i];
      let res;
      try { res = await realPing(link, log); }
      catch (e) { res = { ok: false, reason: e.message }; }
      try { onDone && onDone(id, res); } catch {}
    }
  }
  const n = Math.max(1, Math.min(parallel, items.length));
  await Promise.all(Array.from({ length: n }, worker));
}

module.exports = { realPing, realPingQueue, socksConnect, httpsThroughSocks };
