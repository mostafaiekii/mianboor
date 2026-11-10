'use strict';
/**
 * میانپور — نسخهٔ ویندوز (Electron)
 * اتصال = هستهٔ Xray (پروسهٔ لوکال) + تنظیم خودکار پروکسی سیستم (v2rayN-style).
 * پینگ = تست واقعی از دل تونل (پورت RealPing.kt اندروید).
 * v1.1: آمار واقعی ترافیک + بخش اضطراری + پینگ زندهٔ دسته‌ای + تم/زبان.
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, Notification, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const { Store } = require('./store');
const { parseLink, parseLinks, cryptoHash } = require('./parse');
const { buildMainConfig } = require('./config');
const { findFreePort, XrayRunner, xrayAvailable, xrayBin } = require('./xray');
const { realPing, realPingQueue, verifyThroughSocks } = require('./ping');
const { setSystemProxy, isWindows } = require('./proxy');
const { queryStats } = require('./stats');
const { EmergencyGate } = require('./emergency');

// ---------------------------------------------------------------------------

const APP_VERSION = (() => {
  try { return require('../package.json').version; } catch { return '1.1.0'; }
})();
const DEV = !!process.env.MB_DEV;

let win = null;
let tray = null;
let quitting = false;
let store = null;
let emgGate = null;
let runner = null;          // هستهٔ اتصال اصلی
let apiPort = 0;            // پورت سرویس آمار
let pingBusy = false;

const state = {
  phase: 'idle',            // idle | connecting | connected | error
  selectedId: null,
  serverName: '',
  socksPort: 0,
  httpPort: 0,
  sysProxyApplied: false,
  error: '',
  version: APP_VERSION,
  platform: process.platform,
};

const logLines = [];
function log(line) {
  const ts = new Date().toLocaleTimeString('en-GB');
  logLines.push(`[${ts}] ${line}`);
  if (logLines.length > 200) logLines.splice(0, logLines.length - 200);
  send('log', { line: `[${ts}] ${line}` });
}

function send(type, payload) {
  try { if (win && !win.isDestroyed()) win.webContents.send('mianboor:event', { type, payload }); } catch {}
}

function broadcast() { send('state', stateWithUi()); }

function stateWithUi() {
  return Object.assign({}, state, {
    configs: store ? store.data.configs : [],
    pings: store ? store.data.pings : {},
    settings: store ? store.data.settings : {},
  });
}

function setState(patch) {
  Object.assign(state, patch);
  broadcast();
}

// ---------------------------------------------------------------------------

function createWindow() {
  win = new BrowserWindow({
    width: 430,
    height: 800,
    minWidth: 380,
    minHeight: 620,
    frame: false,                     // بدون نوار عنوان ویندوز — تیتربار خود اپ
    backgroundColor: '#080E23',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    title: 'میانپور',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });

  win.on('close', (e) => {
    // اگر وصل است، در پس‌زمینه بماند (اتصال قطع نشود)
    if (!quitting) {
      e.preventDefault();
      win.hide();
      if (state.phase === 'connected' && !win.__notifiedHide) {
        win.__notifiedHide = true;
        try {
          if (Notification.isSupported()) {
            new Notification({
              title: 'میانپور',
              body: 'اپ در پس‌زمینه فعال است و اتصال برقرار می‌ماند — برای خروج کامل از آیکون تری استفاده کنید.',
            }).show();
          }
        } catch {}
      }
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  if (!fs.existsSync(iconPath)) return;
  try {
    tray = new Tray(iconPath);
    tray.setToolTip('میانپور');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'نمایش میانپور', click: () => { if (win) { win.show(); win.focus(); } } },
      { label: 'خروج کامل', click: () => { app.quit(); } },
    ]));
    tray.on('double-click', () => { if (win) { win.show(); win.focus(); } });
  } catch (e) {
    log('tray error: ' + e.message);
  }
}

// ---------------------------------------------------------------------------
// اتصال / قطع
// ---------------------------------------------------------------------------

function cleanupConnection() {
  if (runner) {
    try { runner.stop(); } catch {}
    runner = null;
  }
  apiPort = 0;
  if (state.sysProxyApplied) {
    try { setSystemProxy(false); } catch {}
    state.sysProxyApplied = false;
  }
}

function gotSelectedConfig() {
  const id = state.selectedId;
  return store.data.configs.find((c) => c.id === id) || null;
}

async function connect() {
  if (state.phase === 'connecting') return;

  if (!xrayAvailable()) {
    setState({ phase: 'error', error: 'هستهٔ Xray پیدا نشد — فایل xray.exe کنار اپ باید باشد.' });
    return;
  }
  const cfgRow = gotSelectedConfig();
  if (!cfgRow) {
    setState({ phase: 'error', error: 'اول یک کانفیگ از لیست انتخاب کن.' });
    return;
  }
  const parsed = parseLink(cfgRow.link, cfgRow.name);
  if (!parsed) {
    setState({ phase: 'error', error: 'این لینک قابل خواندن نیست (نوع پشتیبانی‌شده: vmess/vless/trojan/ss).' });
    return;
  }

  cleanupConnection();
  setState({ phase: 'connecting', error: '', serverName: parsed.name });

  const socksPort = await findFreePort(10808);
  const httpPort = await findFreePort(socksPort + 1);
  apiPort = await findFreePort(httpPort + 1);
  const cfg = buildMainConfig(parsed, socksPort, httpPort, apiPort);
  log(`اتصال به «${parsed.name}» (${parsed.protocol} ${parsed.host}:${parsed.port}) — پورت‌ها ${socksPort}/${httpPort}`);

  runner = new XrayRunner({ config: cfg, log });
  const oldRunner = runner;
  runner.start();
  setState({ socksPort, httpPort });

  const ready = await runner.waitReady(socksPort, 7000);
  if (!ready || oldRunner.exited) {
    cleanupConnection();
    setState({ phase: 'error', error: 'هستهٔ Xray با این کانفیگ بالا نیامد — کانفیگ احتمالاً نامعتبر است.' });
    return;
  }

  if (runner.exited) {
    cleanupConnection();
    setState({ phase: 'error', error: 'هستهٔ Xray بسته شد — کانفیگ نامعتبر است.' });
    return;
  }

  runner.proc.on('exit', () => {
    if (!quitting && runner && !runner.userStopped && state.phase === 'connected') {
      cleanupConnection();
      setState({ phase: 'error', error: 'اتصال قطع شد (هستهٔ Xray بسته شد).' });
    }
  });

  // ── قرارداد صادقانهٔ اندروید v2.9.6: قبل از اعلام «متصل»، ترافیک واقعی باید از دل تونل رد شود ──
  const tunnelOk = await verifyThroughSocks(socksPort, 6000);
  if (!tunnelOk || runner.exited) {
    cleanupConnection();
    setState({ phase: 'error', error: 'هسته بالا آمد ولی تونل واقعی ترافیک رد نکرد — این کانفیگ کار نمی‌کند.' });
    return;
  }

  if (store.data.settings.sysProxy) {
    const r = setSystemProxy(true, httpPort);
    state.sysProxyApplied = !!(r && r.ok && !r.noop); // روی غیر-ویندوز noop است — صادقانه گزارش نمی‌شود
    log(`پروکسی سیستم: ${state.sysProxyApplied ? 'روشن شد' : 'تنظیم نشد'}`);
  } else {
    log('پروکسی سیستم: خاموش (تنظیم دستی: SOCKS ' + socksPort + ' / HTTP ' + httpPort + ')');
  }

  setState({ phase: 'connected' });
  log('✓ متصل شد');
}

function disconnect() {
  log('قطع اتصال توسط کاربر');
  cleanupConnection();
  setState({ phase: 'idle', error: '' });
}

// ---------------------------------------------------------------------------
// پینگ واقعی
// ---------------------------------------------------------------------------

async function pingBatch(items) {
  const out = [];
  const parallel = Math.max(1, Math.min(4, items.length));
  const byId = {};
  await realPingQueue(items, {
    parallel,
    log: () => {},   // پینگ زندهٔ بی‌صدا — لاگ نمی‌ریزد
    onDone: (id, res) => { byId[id] = res; },
  });
  items.forEach((it) => {
    const r = byId[it.id];
    const ms = r && r.ok ? r.ms : 999;
    store.data.pings[it.id] = { ms, ok: !!(r && r.ok), at: Date.now() };
    out.push({ id: it.id, ms });
  });
  store.save();
  broadcast();
  return out;
}

async function pingAll() {
  if (pingBusy) return { ok: false, error: 'تست قبلی هنوز در جریان است' };
  pingBusy = true;
  send('ping:started', {});
  try {
    const items = store.data.configs.map((c) => ({ id: c.id, link: c.link }));
    await pingBatch(items);
  } finally {
    pingBusy = false;
    send('ping:finished', {});
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// افزودن کانفیگ / سابسکریپشن
// ---------------------------------------------------------------------------

function guessCountry(host) {
  // حداقلی: از نام سرور اگر کد کشور داشت؛ وگرنه ir (خنثی)
  const m = /\b(nl|de|fi|gb|tr|us|fr|ae|se|ch|ca|sg|jp|it|es|ru|in|au)\b/i.exec(String(host || ''));
  return m ? m[1].toLowerCase() : 'ir';
}

function addParsedList(parsedList, source, defaultCountry) {
  let added = 0;
  for (const p of parsedList) {
    if (!p.id) p.id = cryptoHash(p.rawLink);
    if (store.data.configs.some((c) => c.id === p.id)) continue;
    store.data.configs.push({
      id: p.id, name: p.name, protocol: p.protocol,
      host: p.host, port: p.port,
      country: defaultCountry || guessCountry(p.host + ' ' + p.name),
      link: p.rawLink, source: source || 'manual', addedAt: Date.now(),
    });
    added++;
  }
  if (added && !store.data.settings.selectedId) {
    store.data.settings.selectedId = store.data.configs[0].id;
    state.selectedId = store.data.settings.selectedId;
  }
  store.save();
  log(`${source === 'sub' ? 'سابسکریپشن' : 'ورود دستی'}: ${added} کانفیگ تازه اضافه شد`);
  return added;
}

async function addLinks(text) {
  const list = parseLinks(text);
  if (!list.length) return { ok: false, error: 'هیچ لینک معتبری پیدا نشد (vmess/vless/trojan/ss)' };
  const added = addParsedList(list, 'manual');
  broadcast();
  return { ok: true, added };
}

async function addSubscription(url) {
  const u = String(url || '').trim();
  if (!/^https?:\/\//i.test(u)) return { ok: false, error: 'آدرس سابسکریپشن باید با http:// یا https:// شروع شود' };
  try {
    const resp = await fetch(u, { signal: AbortSignal.timeout(20000) });
    if (!resp.ok) return { ok: false, error: `سرور جواب ${resp.status} داد` };
    let text = await resp.text();
    text = text.trim();
    if (!/^(vmess|vless|trojan|ss):\/\//im.test(text)) {
      try {
        const decoded = Buffer.from(text.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, ''), 'base64').toString('utf8');
        if (/^(vmess|vless|trojan|ss):\/\//im.test(decoded)) text = decoded;
      } catch {}
    }
    const list = parseLinks(text);
    if (!list.length) return { ok: false, error: 'محتوای سابسکریپشن هیچ کانفیگ قابل‌خواندی نداشت' };
    const added = addParsedList(list, 'sub');
    broadcast();
    return { ok: true, added, total: list.length };
  } catch (e) {
    return { ok: false, error: 'دریافت سابسکریپشن شکست خورد: ' + e.message };
  }
}

// ---------------------------------------------------------------------------
// اضطراری
// ---------------------------------------------------------------------------

async function emergencyRescue() {
  const logs = [];
  const log = (m) => {
    logs.push(m);
    send('emg:log', m);
  };
  const res = await emgGate.rescue(log);
  if (res) {
    store.data.emergency = { links: res.links, mirrors: res.mirrors, savedAt: Date.now() };
    store.save();
  }
  return {
    mirrors: res ? res.mirrors : [],
    links: res ? res.links : [],
    fromCache: res ? !!res.fromCache : false,
    savedAt: res ? res.savedAt : '',
    logs,
  };
}

async function emergencyConnect(link) {
  const parsed = parseLink(link, null);
  if (!parsed) return { ok: false, error: 'لینک اضطراری قابل خواندن نبود' };
  const id = cryptoHash(link);
  if (!store.data.configs.some((c) => c.id === id)) {
    store.data.configs.push({
      id, name: parsed.name, protocol: parsed.protocol,
      host: parsed.host, port: parsed.port,
      country: guessCountry(parsed.host + ' ' + parsed.name),
      link, source: 'emergency', addedAt: Date.now(),
    });
    store.save();
  }
  store.data.settings.selectedId = id;
  state.selectedId = id;
  await connect();
  broadcast();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

function registerIpc() {
  ipcMain.handle('get-state', () => Object.assign({}, stateWithUi(), {
    logs: logLines.slice(-80),
    xrayOk: xrayAvailable(),
  }));

  ipcMain.handle('add-links', (_e, text) => addLinks(text));
  ipcMain.handle('add-subscription', (_e, url) => addSubscription(url));

  ipcMain.handle('remove-config', (_e, id) => {
    store.data.configs = store.data.configs.filter((c) => c.id !== id);
    delete store.data.pings[id];
    if ((store.data.settings.favorites || []).includes(id)) {
      store.data.settings.favorites = store.data.settings.favorites.filter((x) => x !== id);
    }
    if (store.data.settings.selectedId === id) store.data.settings.selectedId = null;
    store.save();
    if (state.selectedId === id) state.selectedId = store.data.settings.selectedId;
    broadcast();
    return { ok: true };
  });

  ipcMain.handle('select-config', (_e, id) => {
    store.data.settings.selectedId = id;
    store.save();
    setState({ selectedId: id, error: '' });
    return { ok: true };
  });

  ipcMain.handle('connect', () => connect());
  ipcMain.handle('disconnect', () => { disconnect(); return { ok: true }; });
  ipcMain.handle('ping-batch', (_e, items) => pingBatch(Array.isArray(items) ? items : []));
  ipcMain.handle('ping-all', () => pingAll());

  ipcMain.handle('set-setting', (_e, k, v) => {
    const keys = ['theme', 'lang', 'livePing', 'sysProxy', 'sortMode', 'favorites'];
    if (!keys.includes(k)) return { ok: false };
    store.data.settings[k] = v;
    store.save();
    if (k === 'sysProxy' && state.phase === 'connected') {
      if (v) {
        const r = setSystemProxy(true, state.httpPort);
        state.sysProxyApplied = !!(r && r.ok);
      } else if (state.sysProxyApplied) {
        setSystemProxy(false);
        state.sysProxyApplied = false;
      }
    }
    broadcast();
    return { ok: true };
  });

  ipcMain.handle('get-usage', async () => {
    if (state.phase !== 'connected' || !apiPort || !runner || runner.exited) return { down: 0, up: 0 };
    const s = await queryStats(apiPort);
    return s || { down: 0, up: 0 };
  });

  ipcMain.handle('emergency:rescue', () => emergencyRescue());
  ipcMain.handle('emergency:ping', async (_e, link) => {
    const r = await realPing(link, {});
    return r && r.ok ? r.ms : null;
  });
  ipcMain.handle('emergency:connect', (_e, link) => emergencyConnect(link));

  ipcMain.handle('open-external', (_e, url) => {
    if (/^https?:\/\//i.test(String(url))) shell.openExternal(url);
    return { ok: true };
  });

  ipcMain.handle('win', (_e, action) => {
    if (!win) return { ok: false };
    if (action === 'min') win.minimize();
    else if (action === 'max') { win.isMaximized() ? win.unmaximize() : win.maximize(); }
    else if (action === 'close') win.hide();
    return { ok: true };
  });

  if (DEV) {
    ipcMain.handle('dev:shot', async (_e, name) => {
      if (!win) return { ok: false };
      const img = await win.webContents.capturePage();
      const dir = process.env.MB_SHOT_DIR || '/tmp/mb-shots';
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, name + '.png');
      fs.writeFileSync(file, img.toPNG());
      return { ok: true, file };
    });
    ipcMain.handle('dev:quit', () => { setTimeout(() => app.exit(0), 150); return { ok: true }; });
  }
}

// ---------------------------------------------------------------------------
// app lifecycle
// ---------------------------------------------------------------------------

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });

  app.whenReady().then(() => {
    if (DEV && process.env.MB_USER_DATA) {
      // تست E2E — پروفایل جدا تا به دادهٔ واقعی دست نزند
      try { app.setPath('userData', process.env.MB_USER_DATA); } catch {}
    }
    app.setAppUserModelId('ir.mianboor.windows');
    const userData = app.getPath('userData');
    store = new Store(path.join(userData, 'mianboor-configs.json'));
    emgGate = new EmergencyGate(path.join(userData, 'emergency-cache.json'));
    state.selectedId = store.data.settings.selectedId;
    if (!isWindows()) log('هشدار: روی غیر-ویندوز، پروکسی سیستم تنظیم نمی‌شود (فقط برای توسعه/تست).');

    registerIpc();
    createWindow();
    createTray();

    if (!xrayAvailable()) {
      log('!! باینری Xray پیدا نشد: ' + xrayBin());
    }
    broadcast();
  });

  app.on('before-quit', () => {
    quitting = true;
    try { if (runner) runner.stop(); } catch {}
    if (state.sysProxyApplied) {
      try { setSystemProxy(false); } catch {} // spawnSync — تا قبل از بستن تمام می‌شود
      state.sysProxyApplied = false;
    }
  });

  app.on('window-all-closed', () => {
    if (quitting) app.quit();
  });
}
