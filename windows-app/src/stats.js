'use strict';
/**
 * خواندن آمار واقعی ترافیک از هستهٔ Xray — از طریق CLI رسمی (xray api statsquery).
 * هر فراخوانی یک پروسهٔ کوتاه می‌زند و JSON آمار inboundها را می‌آورد؛
 * جمع uplink/downlink دو inbound (socks + http) = مصرف واقعی کاربر.
 * اگر هر چیزی شکست خورد → null (UI همان ۰ قبلی را نشان می‌دهد).
 */
const { execFile } = require('child_process');
const { xrayBin } = require('./xray');

function queryStats(apiPort) {
  return new Promise((resolve) => {
    let done = false;
    const fin = (v) => { if (!done) { done = true; resolve(v); } };
    try {
      // ساختار خروجی: {"stat":[{"name":"inbound>>>socks-in>>>traffic>>>uplink","value":"123"},...]}
      const p = execFile(xrayBin(), ['api', 'statsquery', '--server=127.0.0.1:' + apiPort, 'pattern: ""'],
        { windowsHide: true, timeout: 3500, maxBuffer: 1 << 20 },
        (err, stdout) => {
          if (err || !stdout) return fin(null);
          try {
            const j = JSON.parse(stdout);
            const arr = Array.isArray(j.stat) ? j.stat : [];
            let up = 0, down = 0;
            for (const st of arr) {
              const name = String(st.name || '');
              const v = parseInt(st.value, 10) || 0;
              if (!name.startsWith('inbound>>>')) continue;
              if (name.includes('>>>traffic>>>uplink')) up += v;
              else if (name.includes('>>>traffic>>>downlink')) down += v;
            }
            fin({ up, down });
          } catch { fin(null); }
        });
      p.on('error', () => fin(null));
    } catch { fin(null); }
  });
}

module.exports = { queryStats };
