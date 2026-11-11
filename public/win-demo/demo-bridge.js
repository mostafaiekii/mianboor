'use strict';
/**
 * دموی مرورگری میانپور ویندوز — پل شبیه‌سازی‌شده
 *
 * ⚠️ صداقت: این فایل فقط برای «پیش‌نمایش زندهٔ رابط» است. همهٔ اعداد پینگ،
 * اتصال و مصرف اینجا «شبیه‌سازی» می‌شوند. در exe واقعی، همین رابط به
 * هستهٔ Xray واقعی وصل است (ping.js / xray.js / stats.js) و اعداد واقعی‌اند.
 * رفتار واقعیِ اثبات‌شده = اسکرین‌شات‌های تست E2E که زیر همین دمو هستند.
 */
(function () {
  if (window.mb) return; // داخل electron واقعی دست نزن

  const now = () => Date.now();
  let listeners = [];

  // ── وضعیت اولیه — ۵ سرور نمونه ──
  // پینگ پایه هر سرور ثابته + لرزش خفیف؛ یک سرور عمداً «مرده»ست تا
  // حالت واقعی «TCP بازه ولی تونل مرده» (999) هم دیده شود.
  const seed = [
    { id: 'demo-de-1', name: 'آلمان — فرانکفورت ۱', protocol: 'VLESS', host: 'demo1.mianboor.example', port: 443, country: 'de', base: 78, alive: true },
    { id: 'demo-nl-1', name: 'هلند — آمستردام', protocol: 'VLESS', host: 'demo2.mianboor.example', port: 443, country: 'nl', base: 112, alive: true },
    { id: 'demo-tr-1', name: 'ترکیه — استانبول', protocol: 'VMess', host: 'demo3.mianboor.example', port: 2053, country: 'tr', base: 156, alive: true },
    { id: 'demo-fi-1', name: 'فنلاند — هلسینکی', protocol: 'Trojan', host: 'demo4.mianboor.example', port: 443, country: 'fi', base: 134, alive: true },
    { id: 'demo-de-2', name: 'آلمان — فرانکفورت ۲ (مرده)', protocol: 'VLESS', host: 'demo5.mianboor.example', port: 443, country: 'de', base: 999, alive: false },
  ];

  const state = {
    phase: 'idle',
    selectedId: 'demo-de-1',
    serverName: seed[0].name,
    error: '',
    version: '1.1.0-demo',
    configs: seed.map((s) => ({
      id: s.id, name: s.name, protocol: s.protocol, host: s.host, port: s.port,
      country: s.country, link: 'demo://' + s.id, source: 'demo', addedAt: now(),
    })),
    pings: {},
    settings: {
      selectedId: 'demo-de-1', sysProxy: true, theme: 'midnight', lang: 'fa',
      livePing: true, sortMode: 'ping', favorites: ['demo-de-1'],
    },
    socksPort: 10808,
    httpPort: 10809,
  };

  function emit(type, payload) {
    listeners.forEach((cb) => { try { cb({ type, payload }); } catch {} });
  }
  function pushState() {
    emit('state', JSON.parse(JSON.stringify(snapshot())));
  }
  function snapshot() {
    return {
      phase: state.phase, selectedId: state.selectedId, serverName: state.serverName,
      error: state.error, version: state.version, configs: state.configs,
      pings: state.pings, settings: state.settings,
      socksPort: state.socksPort, httpPort: state.httpPort,
    };
  }

  // ── پینگ شبیه‌سازی‌شده ──
  function simPing(cfg) {
    const s = seed.find((x) => x.id === cfg.id);
    if (!s) return 999;
    if (!s.alive) return 999; // قرمز: TCP بازه ولی تونل مرده
    const jitter = Math.round((Math.random() - 0.5) * 14);
    return Math.max(38, s.base + jitter);
  }

  // ── جریان اتصال شبیه‌سازی‌شده ──
  let connTimer = null;
  let usageTimer = null;
  const usage = { down: 0, up: 0 };

  function startConnect() {
    if (state.phase === 'connecting') return;
    state.error = '';
    state.phase = 'connecting';
    pushState();
    clearTimeout(connTimer);
    connTimer = setTimeout(() => {
      // قرارداد صادقانه: در دمو هم اول «اثبات ترافیک» شبیه‌سازی می‌شود
      state.phase = 'connected';
      connStart = now();
      usage.down = 0; usage.up = 0;
      pushState();
      clearInterval(usageTimer);
      usageTimer = setInterval(() => {
        if (state.phase !== 'connected') return clearInterval(usageTimer);
        usage.down += Math.round(24000 + Math.random() * 90000); // ~۱ مگابایت بر ثانیه
        usage.up += Math.round(8000 + Math.random() * 24000);
      }, 1000);
    }, 2600);
  }
  let connStart = 0;

  function stopConnect(silent) {
    clearTimeout(connTimer);
    clearInterval(usageTimer);
    state.phase = 'idle';
    usage.down = 0; usage.up = 0;
    if (!silent) pushState();
  }

  // ── پل mb ──
  window.mb = {
    getState: async () => JSON.parse(JSON.stringify(snapshot())),

    connect: async () => { startConnect(); return { ok: true }; },

    disconnect: async () => { stopConnect(); return { ok: true }; },

    selectConfig: async (id) => {
      const c = state.configs.find((x) => x.id === id);
      if (!c) return { ok: false };
      state.selectedId = id;
      state.serverName = c.name;
      state.settings.selectedId = id;
      // عین رفتار واقعی: انتخاب سرورِ جدید در حین اتصال → قطع می‌شود
      if (state.phase === 'connected' || state.phase === 'connecting') stopConnect(true);
      pushState();
      return { ok: true };
    },

    removeConfig: async (id) => {
      state.configs = state.configs.filter((c) => c.id !== id);
      delete state.pings[id];
      state.settings.favorites = state.settings.favorites.filter((f) => f !== id);
      if (state.selectedId === id) {
        state.selectedId = state.configs.length ? state.configs[0].id : null;
        state.serverName = state.configs.length ? state.configs[0].name : '';
        state.settings.selectedId = state.selectedId;
      }
      pushState();
      return { ok: true };
    },

    addLinks: async (text) => {
      const lines = String(text || '').split(/\n+/).map((l) => l.trim()).filter(Boolean);
      let added = 0, bad = 0;
      const protos = { vmess: 'VMess', vless: 'VLESS', trojan: 'Trojan', ss: 'Shadowsocks' };
      lines.forEach((line) => {
        const m = line.match(/^(vmess|vless|trojan|ss):\/\//i);
        if (!m) { bad++; return; }
        const proto = protos[m[1].toLowerCase()];
        let host = 'unknown', port = 443, name = '';
        try {
          if (m[1].toLowerCase() === 'vmess') {
            const json = JSON.parse(atob(line.slice(8).replace(/#.*$/, '')));
            host = json.add || 'unknown'; port = Number(json.port) || 443; name = json.ps || '';
          } else {
            const u = new URL(line);
            host = u.hostname; port = Number(u.port) || 443;
            name = decodeURIComponent(u.hash || '').replace(/^#/, '');
          }
        } catch {}
        const country = guessCountry(host);
        const id = 'u' + Math.random().toString(36).slice(2, 10);
        state.configs.push({
          id, name: name || (host + ':' + port), protocol: proto, host, port,
          country, link: line, source: 'link', addedAt: now(),
        });
        seed.push({ id, name: name || host, protocol: proto, host, port, country, base: 60 + Math.round(Math.random() * 140), alive: Math.random() > 0.2 });
        added++;
      });
      if (added) pushState();
      return { ok: added > 0, added, bad };
    },

    addSubscription: async () => ({
      ok: false,
      msg: 'در دموی مرورگر، سابسکریپشن غیرفعال است — در exe واقعی دانلود و پارس می‌شود.',
    }),

    pingBatch: async (items) => {
      await sleep(220 + Math.round(Math.random() * 380));
      return items.map((it) => {
        const c = state.configs.find((x) => x.id === it.id) || it;
        return { id: it.id, ms: simPing(c), ok: simPing(c) !== 999 };
      });
    },

    setSetting: async (k, v) => {
      state.settings[k] = v;
      pushState();
      return { ok: true };
    },

    getUsage: async () => ({ down: usage.down, up: usage.up }),

    // ── اضطراری — شبیه‌سازی کامل جریان واقعی ──
    emergencyRescue: async () => {
      emit('emg:reset', {});
      const logs = [];
      logs.push('۱/۳ کشف دامنه‌ها از CDN (jsDelivr → فال‌بک raw)…');
      await sleep(700);
      logs.push('✓ ۳ دامنه پیدا شد');
      logs.push('۲/۳ بررسی زنده‌بودن دامنه‌ها…');
      await sleep(800);
      logs.push('✓ ۲ دامنه پاسخ داد (مسیر باز است)');
      logs.push('۳/۳ دریافت کانفیگ‌های اضطراری از اولین دامنهٔ زنده…');
      await sleep(800);
      logs.push('✓ ۴ کانفیگ دریافت شد');
      emit('emg:log', logs[0]); emit('emg:log', logs[1]); emit('emg:log', logs[2]);
      emit('emg:log', logs[3]); emit('emg:log', logs[4]); emit('emg:log', logs[5]);
      return {
        mirrors: ['mianboor.vercel.app (نمونه)', 'mianboor-git-main.vercel.app (نمونه)'],
        links: [
          { name: 'اضطراری — آلمان ۱', proto: 'VLESS Reality', link: 'demo://emg-1' },
          { name: 'اضطراری — هلند', proto: 'VLESS WS+CDN', link: 'demo://emg-2' },
          { name: 'اضطراری — ترکیه', proto: 'VMess', link: 'demo://emg-3' },
          { name: 'اضطراری — فنلاند', proto: 'Trojan', link: 'demo://emg-4' },
        ],
        fromCache: false, savedAt: '', logs,
      };
    },

    emergencyPing: async () => {
      await sleep(500 + Math.round(Math.random() * 900));
      return Math.random() > 0.25 ? 80 + Math.round(Math.random() * 160) : 0;
    },

    emergencyConnect: async () => {
      startConnect();
      return { ok: true };
    },

    openExternal: async () => ({ ok: true }),

    win: async () => ({ ok: true }),

    devShot: async () => ({ ok: false }),
    devQuit: async () => ({ ok: false }),

    onEvent: (cb) => { listeners.push(cb); },
  };

  function guessCountry(host) {
    const h = String(host).toLowerCase();
    if (/de\b|germany|frankfurt/.test(h)) return 'de';
    if (/nl\b|netherlands|amsterdam/.test(h)) return 'nl';
    if (/tr\b|turkey|istanbul/.test(h)) return 'tr';
    if (/fi\b|finland|helsinki/.test(h)) return 'fi';
    if (/us\b|america|virginia/.test(h)) return 'us';
    if (/uk\b|gb\b|london/.test(h)) return 'gb';
    if (/fr\b|france|paris/.test(h)) return 'fr';
    if (/ae\b|dubai/.test(h)) return 'ae';
    if (/se\b|sweden/.test(h)) return 'se';
    if (/ch\b|swiss|zurich/.test(h)) return 'ch';
    return 'de';
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
})();
