'use strict';
/**
 * میانپور — نسخهٔ ویندوز (Electron)
 * اتصال = هستهٔ Xray (پروسهٔ لوکال) + تنظیم خودکار پروکسی سیستم.
 * پینگ = تست واقعی از دل تونل (مثل نسخهٔ اندروید).
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, Notification, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const { Store } = require('./store');
const { parseLink, parseLinks, cryptoHash } = require('./parse');
const { buildMainConfig } = require('./config');
const { findFreePort, XrayRunner, xrayAvailable, xrayBin } = require('./xray');
const { realPing, realPingQueue } = require('./ping');
const { setSystemProxy, isWindows } = require('./proxy');

// ---------------------------------------------------------------------------

const APP_VERSION = (() => {
  try { return require('../package.json').version; } catch { return '1.0.0'; }
})();

let win = null;
let tray = null;
let quitting = false;
let store = null;
let runner = null;          // هستهٔ اتصال اصلی
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

function broadcast() { send('state', state); }

function setState(patch) {
  Object.assign(state, patch);
  broadcast();
}

// ---------------------------------------------------------------------------

function createWindow() {
  win = new BrowserWindow({
    width: 440,
    height: 780,
    minWidth: 380,
    minHeight: 560,
    autoHideMenuBar: true,
    backgroundColor: '#0e1411',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    title: 'میانپور',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  win.setMenuBarVisibility(false);
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
    setState({ phase: 'error', error: 'اول یک سرور از لیست انتخاب کن.' });
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
  const cfg = buildMainConfig(parsed, socksPort, httpPort);
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

  // مراقب مرگ ناگهانی هسته در همان لحظهٔ اتصال باش
  if (runner.exited) {
    cleanupConnection();
    setState({ phase: 'error', error: 'هستهٔ Xray بسته شد — کانفیگ نامعتبر است.' });
    return;
  }

  runner.proc.on('exit', () => {
    // مرگ ناگهانی هسته هنگام اتصال برقرار → پاک‌سازی و اطلاع
    if (!quitting && !runner.userStopped && state.phase === 'connected') {
      cleanupConnection();
      setState({ phase: 'error', error: 'اتصال قطع شد (هستهٔ Xray بسته شد).' });
    }
  });

  if (store.data.settings.sysProxy) {
    const r = setSystemProxy(true, httpPort);
    state.sysProxyApplied = !!(r && r.ok);
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
// پینگ
// ---------------------------------------------------------------------------

async function pingAll() {
  if (pingBusy) return { ok: false, error: 'تست قبلی هنوز در جریان است' };
  pingBusy = true;
  send('ping:started', {});
  try {
    const items = store.data.configs.map((c) => ({ id: c.id, link: c.link }));
    await realPingQueue(items, {
      parallel: 3,
      log,
      onDone: (id, res) => {
        store.data.pings[id] = Object.assign({}, res, { at: Date.now() });
        store.save();
        send('ping:done', { id, res });
      },
    });
  } finally {
    pingBusy = false;
    send('ping:finished', {});
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// افزودن کانفیگ / سابسکریپشن
// ---------------------------------------------------------------------------

function addParsedList(parsedList, sourceLabel) {
  let added = 0;
  for (const p of parsedList) {
    if (!p.id) p.id = cryptoHash(p.rawLink);
    if (store.data.configs.some((c) => c.id === p.id)) continue;
    store.data.configs.push({ id: p.id, name: p.name, protocol: p.protocol, host: p.host, port: p.port, link: p.rawLink, addedAt: Date.now() });
    added++;
  }
  if (added && !store.data.settings.selectedId) {
    store.data.settings.selectedId = store.data.configs[0].id;
    state.selectedId = store.data.settings.selectedId;
  }
  store.save();
  log(`${sourceLabel}: ${added} کانفیگ تازه اضافه شد`);
  return added;
}

async function addLinks(text) {
  const list = parseLinks(text);
  if (!list.length) return { ok: false, error: 'هیچ لینک معتبری پیدا نشد (vmess/vless/trojan/ss)' };
  const added = addParsedList(list, 'لینک دستی');
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
    // اگر متنِ لینک نبود، احتمالاً base64 است
    if (!/^(vmess|vless|trojan|ss):\/\//im.test(text)) {
      try {
        const decoded = Buffer.from(text.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, ''), 'base64').toString('utf8');
        if (/^(vmess|vless|trojan|ss):\/\//im.test(decoded)) text = decoded;
      } catch {}
    }
    const list = parseLinks(text);
    if (!list.length) return { ok: false, error: 'محتوای سابسکریپشن هیچ کانفیگ قابل‌خواندی نداشت' };
    const added = addParsedList(list, 'سابسکریپشن');
    return { ok: true, added, total: list.length };
  } catch (e) {
    return { ok: false, error: 'دریافت سابسکریپشن شکست خورد: ' + e.message };
  }
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

function registerIpc() {
  ipcMain.handle('get-state', () => {
    return Object.assign({}, state, {
      configs: store.data.configs,
      pings: store.data.pings,
      settings: store.data.settings,
      logs: logLines.slice(-80),
      xrayOk: xrayAvailable(),
    });
  });

  ipcMain.handle('add-links', (_e, text) => addLinks(text));
  ipcMain.handle('add-subscription', (_e, url) => addSubscription(url));

  ipcMain.handle('remove-config', (_e, id) => {
    store.data.configs = store.data.configs.filter((c) => c.id !== id);
    delete store.data.pings[id];
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
  ipcMain.handle('ping-all', () => pingAll());

  ipcMain.handle('set-sysproxy', (_e, v) => {
    store.data.settings.sysProxy = !!v;
    store.save();
    if (state.phase === 'connected') {
      if (v) {
        const r = setSystemProxy(true, state.httpPort);
        state.sysProxyApplied = !!(r && r.ok);
      } else if (state.sysProxyApplied) {
        setSystemProxy(false);
        state.sysProxyApplied = false;
      }
      broadcast();
    }
    return { ok: true };
  });
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
    app.setAppUserModelId('ir.mianboor.windows');
    store = new Store(path.join(app.getPath('userData'), 'mianboor-configs.json'));
    state.selectedId = store.data.settings.selectedId;
    if (!isWindows()) log('هشدار: روی غیر-ویندوز، پروکسی سیستم تنظیم نمی‌شود (فقط برای توسعه).');

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
    log('خروج — قطع اتصال و پاک‌سازی پروکسی سیستم…');
    try { if (runner) runner.stop(); } catch {}
    if (state.sysProxyApplied) {
      try { setSystemProxy(false); } catch {} // spawnSync — تا قبل از بستن تمام می‌شود
      state.sysProxyApplied = false;
    }
  });

  app.on('window-all-closed', () => {
    // با تری زنده می‌مانیم؛ فقط خروج کامل از منوی تری
    if (quitting) app.quit();
  });
}
