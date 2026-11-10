'use strict';
/**
 * میانپور ویندوز — لایهٔ نمایش
 * بازسازی دقیق MainActivity/HomeScreen/ServersScreen/SettingsScreen/EmergencyScreen اندروید:
 *  - حلقهٔ پاور با ضربان/تنفس/کمان چرخان
 *  - پینگ زندهٔ بی‌صدا (اسکن چرخشی دسته‌ای — عین موتور v2.9.5 اندروید)
 *  - اتصال هوشمند، منتخب‌ها، مرتب‌سازی، تب‌ها
 *  - پنل تنظیمات با ۵ تم + دو زبان
 *  - بخش اضطراری با تست واقعی هر کانفیگ
 */

const $ = (id) => document.getElementById(id);

const state = {
  phase: 'idle',            // idle | connecting | connected | error
  selectedId: null,
  serverName: '',
  error: '',
  version: '',
  configs: [],
  pings: {},                // id → { ms, at }  (ms === 999 یعنی مرده)
  settings: { theme: 'midnight', lang: 'fa', livePing: true, sysProxy: true, sortMode: 'ping', favorites: [] },
  socksPort: 0,
  httpPort: 0,
};

let connStart = 0;          // برای تایمر اتصال
let flashUntil = 0;         // چیپ لحظهٔ اتصال
let usage = { down: 0, up: 0 };
let screen = 'home';
let testing = new Set();    // idهایی که الان زیر پینگ واقعی‌اند
let pingCursor = 0;
let firstSweep = true;
let pingLoopTimer = null;
let msgTimer = null;
let msgIdx = 0;
let tab = 'all';
let query = '';
let impTab = 'link';
let deleteArm = null;       // id حذف مسلح‌شده
let emgState = { busy: false, logs: [], mirrors: [], links: [], verdicts: {}, fromCache: false, done: false };

const t = () => window.MbI18n.strings(state.settings.lang);
const rtl = () => state.settings.lang !== 'en';
const themeName = () => window.MbI18n[state.settings.lang === 'en' ? 'THEMES_EN' : 'THEMES_FA'];

// ── کمکی‌ها — پورت HomeScreen.kt ────────────────────────────────────────

function fmtTimer(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (n) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s)}`;
}

function fmtBytes(b) {
  b = Number(b) || 0;
  if (b < 1024) return `${b} B`;
  const kb = b / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 100 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function pingColor(ping) {
  return ping <= 110 ? 'var(--glow)' : ping <= 200 ? 'var(--gold)' : 'var(--danger)';
}

function pingBars(ping) {
  return ping <= 70 ? 4 : ping <= 110 ? 3 : ping <= 200 ? 2 : 1;
}

function displayMs(id) {
  const p = state.pings[id];
  if (testing.has(id)) return { txt: '…', cls: 'var(--dim)' };
  if (!p) return { txt: '—', cls: 'var(--dim)' };
  return { txt: ltrRun(`${p.ms} ms`), cls: pingColor(p.ms) };
}

/** عدد + واحد به‌صورت قطعهٔ LTR تا در متن RTL برعکس نشود */
function ltrRun(txt) {
  return `\u2066${txt}\u2069`;
}

function toast(msg) {
  $('toastPill').textContent = msg;
  $('toast').classList.add('show');
  clearTimeout(toast._tm);
  toast._tm = setTimeout(() => $('toast').classList.remove('show'), 2200);
}

// ── اعمال تم و زبان ─────────────────────────────────────────────────────

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.settings.theme);
}

function applyLang() {
  const s = t();
  document.documentElement.setAttribute('dir', rtl() ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', state.settings.lang);
  $('brandTitle').textContent = rtl() ? 'میانبر' : 'MIANBOOR';
  $('brandSub').textContent = rtl() ? 'Mianboor' : 'میانبر';
  $('brandSub').style.letterSpacing = rtl() ? '1px' : '1.2px';
  $('srvTitle').textContent = s.selectLocation;
  $('setH1').textContent = s.settings;
  $('searchIn').placeholder = s.search;
  $('smartA').textContent = s.smart;
  $('metaLive').textContent = s.livePing;
  $('sortPill').textContent = state.settings.sortMode === 'az' ? s.sortAz : s.sortPing;
  $('impTitle').textContent = s.importTitle;
  $('impTabLink').textContent = s.importLinkTab;
  $('impTabSub').textContent = s.importSubTab;
  $('impText').placeholder = impTab === 'link' ? s.importLinkHint : s.importSubHint;
  $('impName').placeholder = s.importName;
  $('impGo').textContent = impTab === 'link' ? s.importAdd : s.importFetch;
  $('emgH1').textContent = s.emgTitle;
  $('emgSub').textContent = s.emgSub;
  $('emgBtn').innerHTML = window.MbIcons.icon('key') + `<span>${emgState.busy ? s.emgSearching : s.emgStart}</span>`;
  $('emgBtn').disabled = emgState.busy;
  $('emgLogT').textContent = s.emgLog;
  $('emgMirrorT').textContent = s.emgMirrors;
  $('emgPoolT').textContent = s.emgPool;
  $('emgNote').textContent = emgState.fromCache ? s.emgCache(emgState.savedAt || '—') : '';
  $('langT').textContent = s.lang;
  $('themeT').textContent = s.theme;
  $('themeD').textContent = s.themeSub;
  $('sysProxyT').textContent = s.sysProxy;
  $('sysProxyD').textContent = s.sysProxySub;
  $('livePingT').textContent = s.livePingSet;
  $('livePingD').textContent = s.livePingSetDesc;
  $('portsT').textContent = s.portsRow;
  $('portsD').textContent = s.portsSub(
    state.socksPort || 10808,
    state.httpPort || (state.socksPort ? state.socksPort + 1 : 10809),
  );
  $('verT').textContent = s.versionRow;
  $('verD').textContent = s.aboutLine(state.version || '1.1.0');
  $('favTitle').textContent = s.favSection;
  document.querySelectorAll('.lang-btn').forEach((b) => b.classList.toggle('active', b.dataset.lang === state.settings.lang));
  renderTabs();
  renderNav();
  renderRing();
  renderStatus();
  renderServerCard();
  renderFavStrip();
  renderUsageLabels();
  renderSettingsIcons();
  renderThemeRow();
  renderEmergency();
  renderServers();
}

// ── حلقهٔ پاور — عین PowerRing ──────────────────────────────────────────

function renderRing() {
  const area = $('ringArea');
  const on = state.phase === 'connected';
  const busy = state.phase === 'connecting';
  area.classList.toggle('on', on);
  const r = 86;
  const c = (2 * Math.PI * r).toFixed(1);
  let svg;
  if (busy) {
    const dash = ((96 / 360) * c).toFixed(1);
    svg = `<svg viewBox="0 0 176 176">
      <circle cx="88" cy="88" r="${r}" fill="none" stroke="var(--glow)" stroke-opacity=".25" stroke-width="4"/>
      <circle class="spin" cx="88" cy="88" r="${r}" fill="none" stroke="var(--glow)" stroke-width="4"
        stroke-linecap="round" stroke-dasharray="${dash} ${c}" transform="rotate(-90 88 88)"
        style="transform-origin:88px 88px;transform-box:view-box"/>
    </svg>`;
  } else if (on) {
    svg = `<svg viewBox="0 0 176 176">
      <circle cx="88" cy="88" r="${r}" fill="none" stroke="var(--glow)" stroke-opacity=".25" stroke-width="9"/>
      <circle cx="88" cy="88" r="${r}" fill="none" stroke="var(--glow)" stroke-width="4"/>
    </svg>`;
  } else {
    svg = `<svg viewBox="0 0 176 176">
      <circle cx="88" cy="88" r="${r}" fill="none" stroke="var(--panelEdge)" stroke-width="4"/>
    </svg>`;
  }
  $('powerRing').innerHTML = svg + `<span class="power-core">${window.MbIcons.icon('power')}</span>`;
}

// ── وضعیت + چیپ‌ها ─────────────────────────────────────────────────────

function renderStatus() {
  const s = t();
  const line = $('statusLine');
  const on = state.phase === 'connected';
  const busy = state.phase === 'connecting';
  line.classList.toggle('on', on);
  $('statusMain').textContent = state.phase === 'error' ? s.errGeneric : busy ? s.connecting : on ? s.connected : s.notConnected;
  $('statusMain').style.color = state.phase === 'error' ? 'var(--danger)' : on ? 'var(--glow)' : 'var(--ink)';

  if (busy) {
    const msgs = s.connectingMsgs;
    $('statusSub').textContent = msgs[msgIdx % msgs.length];
  } else {
    $('statusSub').textContent = on ? fmtTimer(Math.floor((Date.now() - connStart) / 1000)) : s.tapProtect;
  }

  // چیپ‌ها: فلش اتصال / خطا
  const zone = $('chipZone');
  zone.innerHTML = '';
  if (on && Date.now() < flashUntil && state.serverName) {
    const srv = state.configs.find((c) => c.id === state.selectedId);
    const cc = srv ? srv.country : 'ir';
    const chip = document.createElement('div');
    chip.className = 'pill-chip';
    chip.innerHTML =
      window.MbFlags.flagSvg('ir') +
      `<span>${s.connectFlash(window.MbFlags.countryName('ir'), window.MbFlags.countryName(cc))}</span>` +
      `<span class="arrow">←</span>` +
      window.MbFlags.flagSvg(cc);
    zone.appendChild(chip);
  } else if (state.phase === 'error' && state.error) {
    const chip = document.createElement('div');
    chip.className = 'pill-chip warn';
    chip.innerHTML = window.MbIcons.icon('shieldAlert') + `<span style="direction:rtl">${state.error}</span>`;
    zone.appendChild(chip);
  }
}

function renderServerCard() {
  const srv = state.configs.find((c) => c.id === state.selectedId) || null;
  const s = t();
  $('srvFlag').innerHTML = srv ? window.MbFlags.flagSvg(srv.country) : '';
  $('srvName').textContent = srv ? srv.name : '—';
  if (srv) {
    const d = displayMs(srv.id);
    const bars = pingBars(state.pings[srv.id] ? state.pings[srv.id].ms : 999);
    let barsHtml = '<span class="bars">';
    for (let i = 1; i <= 4; i++) barsHtml += `<i class="${i <= bars ? 'on' : ''}"></i>`;
    barsHtml += '</span>';
    // عین اندروید: متن پینگ روی کارت خانه همیشه dim است
    $('srvSub').innerHTML = `${barsHtml}<span style="margin-inline-start:8px;color:var(--dim)">${d.txt}</span>`;
    $('srvChev').style.visibility = 'visible';
  } else {
    $('srvSub').innerHTML = `<span>${s.noServers}</span>`;
    $('srvChev').style.visibility = 'hidden';
  }
}

function renderFavStrip() {
  const favs = state.configs.filter((c) => (state.settings.favorites || []).includes(c.id));
  const strip = $('favStrip');
  if (!favs.length) { strip.hidden = true; return; }
  strip.hidden = false;
  $('favCount').textContent = String(favs.length);
  const row = $('favRow');
  row.innerHTML = '';
  favs.forEach((f) => {
    const d = displayMs(f.id);
    const chip = document.createElement('button');
    chip.className = 'fav-chip' + (state.selectedId === f.id ? ' sel' : '');
    chip.innerHTML = window.MbFlags.flagSvg(f.country) +
      `<span>${escapeHtml(f.name)}</span><span class="ms" style="color:${d.cls}">${d.txt}</span>`;
    chip.onclick = () => selectConfig(f.id);
    row.appendChild(chip);
  });
}

function renderUsageLabels() {
  const s = t();
  $('dlLbl').innerHTML = window.MbIcons.icon('arrDown') + `<span style="color:var(--glow)"></span><span>${s.download}</span>`;
  $('dlLbl').querySelector('.ic').style.color = 'var(--glow)';
  $('ulLbl').innerHTML = window.MbIcons.icon('arrUp') + `<span>${s.upload}</span>`;
  $('ulLbl').querySelector('.ic').style.color = 'var(--up)';
  $('dlVal').textContent = state.phase === 'connected' ? fmtBytes(usage.down) : '0 B';
  $('ulVal').textContent = state.phase === 'connected' ? fmtBytes(usage.up) : '0 B';
}

// ── سرورها ─────────────────────────────────────────────────────────────

function escapeHtml(x) {
  return String(x ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function renderTabs() {
  const s = t();
  const all = state.configs;
  const manual = all.filter((c) => c.source !== 'sub' && c.source !== 'emergency');
  const subs = all.filter((c) => c.source === 'sub' || c.source === 'emergency');
  const tabs = [
    ['all', s.tabAll, all.length],
    ['manual', s.tabManual, manual.length],
    ['sub', s.tabSub, subs.length],
  ];
  const box = $('tabs3');
  box.innerHTML = '';
  tabs.forEach(([key, label, n]) => {
    const b = document.createElement('button');
    b.className = 'tab-btn' + (tab === key ? ' active' : '');
    b.innerHTML = `<span>${label}</span><span class="cnt">${n}</span>`;
    b.onclick = () => { tab = key; renderTabs(); renderServers(); };
    box.appendChild(b);
  });
}

function sortConfigs(list) {
  const az = state.settings.sortMode === 'az';
  const favs = state.settings.favorites || [];
  const key = (c) => (state.pings[c.id] ? state.pings[c.id].ms : 9999);
  const sorted = [...list].sort((a, b) => (az ? a.name.localeCompare(b.name) : key(a) - key(b)));
  return sorted.filter((c) => favs.includes(c.id)).concat(sorted.filter((c) => !favs.includes(c.id)));
}

function liveConfigs() {
  const s = t();
  let list = state.configs;
  if (tab === 'manual') list = list.filter((c) => c.source !== 'sub' && c.source !== 'emergency');
  if (tab === 'sub') list = list.filter((c) => c.source === 'sub' || c.source === 'emergency');
  if (query) list = list.filter((c) => (c.name + ' ' + window.MbFlags.countryName(c.country)).toLowerCase().includes(query.toLowerCase()));
  return sortConfigs(list);
}

function renderServers() {
  const s = t();
  const list = liveConfigs();
  $('metaCount').textContent = `${s.locations} · ${list.length}`;
  $('sortPill').textContent = state.settings.sortMode === 'az' ? s.sortAz : s.sortPing;

  // اتصال هوشمند — بهترین پینگ زندهٔ واقعی
  const pool = state.configs;
  const best = pool.length ? pool.reduce((acc, c) => {
    const m = state.pings[c.id] ? state.pings[c.id].ms : 9999;
    const am = acc ? (state.pings[acc.id] ? state.pings[acc.id].ms : 9999) : 99999;
    return m < am ? c : acc;
  }, null) : null;
  $('smartB').innerHTML = best
    ? `${s.smartFastest} · <span dir="ltr" style="unicode-bidi:isolate">${state.pings[best.id] ? state.pings[best.id].ms : '—'} ms</span>`
    : s.noMatch;

  const box = $('srvList');
  box.innerHTML = '';
  if (!state.configs.length) {
    box.innerHTML = `<div class="empty-hint">${s.noServers}</div>`;
    return;
  }
  if (!list.length) {
    box.innerHTML = `<div class="empty-hint">${s.noMatch}</div>`;
    return;
  }
  const favs = state.settings.favorites || [];
  list.forEach((c) => {
    const sel = c.id === state.selectedId;
    const d = displayMs(c.id);
    const isBest = best && best.id === c.id;
    const row = document.createElement('div');
    row.className = 'srv-row' + (sel ? ' sel' : '');
    row.innerHTML =
      window.MbFlags.flagSvg(c.country) +
      `<div class="info"><div class="nm">${escapeHtml(c.name)}</div><div class="proto">${escapeHtml(c.protocol)}</div></div>` +
      `<span class="ms" style="color:${d.cls};opacity:${testing.has(c.id) ? '.45' : '1'}">${d.txt}</span>` +
      `<button class="star ${(favs.includes(c.id) ? 'fav' : '')}" title="★">${window.MbIcons.icon('star')}</button>` +
      (isBest ? `<span class="best-badge">${s.best}</span>` : '') +
      `<button class="del" title="✕">${window.MbIcons.icon('trash')}</button>` +
      `<span class="radio">${sel ? window.MbIcons.icon('check') : ''}</span>`;

    row.onclick = () => selectConfig(c.id);
    row.querySelector('.star').onclick = (e) => { e.stopPropagation(); toggleFav(c.id); };
    const del = row.querySelector('.del');
    del.onclick = (e) => {
      e.stopPropagation();
      if (deleteArm === c.id) {
        window.mb.removeConfig(c.id);
        deleteArm = null;
        toast(t().deleted);
      } else {
        deleteArm = c.id;
        del.style.color = 'var(--danger)';
        setTimeout(() => { deleteArm = null; del.style.color = ''; }, 2400);
      }
    };
    box.appendChild(row);
  });
}

function renderNav() {
  const s = t();
  const items = [
    ['home', 'home', s.home],
    ['servers', 'globe', s.servers],
    ['emergency', 'shieldAlert', s.emergency],
    ['settings', 'settings', s.settings],
  ];
  const nav = $('bottomNav');
  nav.innerHTML = '';
  items.forEach(([key, icon, label]) => {
    const b = document.createElement('button');
    b.className = 'nav-btn' + (screen === key ? ' active' : '');
    b.innerHTML = window.MbIcons.icon(icon) + `<span>${label}</span>`;
    b.onclick = () => goto(key);
    nav.appendChild(b);
  });
}

function goto(name) {
  screen = name;
  document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
  $('scr-' + name).classList.add('active');
  renderNav();
  if (name === 'servers') kickPingLoop(true);
  if (name === 'emergency' && emgState.links.length) renderEmergency();
}

// ── موتور پینگ زندهٔ بی‌صدا — عین v2.9.5 (اول ۴تایی، بعد ۲تایی، چرخشی) ──

async function kickPingLoop(immediate) {
  if (pingLoopTimer) { clearTimeout(pingLoopTimer); pingLoopTimer = null; }
  if (immediate) { firstSweep = true; pingCursor = 0; }
  await pingTick();
}

async function pingTick() {
  pingLoopTimer = null;
  if (state.settings.livePing && screen === 'servers' && state.configs.length) {
    const targets = state.configs;
    const n = firstSweep ? Math.min(4, targets.length) : Math.min(2, targets.length);
    firstSweep = false;
    const batch = [];
    for (let i = 0; i < n; i++) batch.push(targets[(pingCursor + i) % targets.length]);
    pingCursor = (pingCursor + n) % targets.length;
    batch.forEach((b) => testing.add(b.id));
    renderServers(); renderServerCard();
    try {
      const res = await window.mb.pingBatch(batch.map((b) => ({ id: b.id, link: b.link })));
      res.forEach((r) => {
        testing.delete(r.id);
        state.pings[r.id] = { ms: r.ms, at: Date.now() };
      });
    } catch {}
    batch.forEach((b) => testing.delete(b.id));
    renderServers(); renderServerCard(); renderFavStrip();
  }
  pingLoopTimer = setTimeout(pingTick, 6000);
}

// ── عملیات ─────────────────────────────────────────────────────────────

async function selectConfig(id) {
  await window.mb.selectConfig(id);
  goto('home');
}

async function toggleConnect() {
  if (state.phase === 'connecting') return;
  if (state.phase === 'connected') {
    await window.mb.disconnect();
  } else {
    msgIdx = 0;
    await window.mb.connect();
  }
}

function toggleFav(id) {
  const favs = new Set(state.settings.favorites || []);
  if (favs.has(id)) favs.delete(id); else favs.add(id);
  state.settings.favorites = [...favs];
  window.mb.setSetting('favorites', state.settings.favorites);
  renderServers(); renderFavStrip();
}

// ── اتصال هوشمند ───────────────────────────────────────────────────────

function smartConnect() {
  const pool = state.configs;
  if (!pool.length) { toast(t().noMatch); return; }
  const best = pool.reduce((acc, c) => {
    const m = state.pings[c.id] ? state.pings[c.id].ms : 9999;
    const am = acc ? (state.pings[acc.id] ? state.pings[acc.id].ms : 9999) : 99999;
    return m < am ? c : acc;
  }, null);
  if (best) selectConfig(best.id);
}

// ── تنظیمات ────────────────────────────────────────────────────────────

function renderSettingsIcons() {
  $('themeIc').innerHTML = window.MbIcons.icon('palette');
  $('themeIc').querySelector('.ic').style.color = 'var(--dim)';
  $('sysProxyIc').innerHTML = window.MbIcons.icon('globe');
  $('sysProxyIc').querySelector('.ic').style.color = 'var(--dim)';
  $('livePingIc').innerHTML = window.MbIcons.icon('activity');
  $('livePingIc').querySelector('.ic').style.color = 'var(--dim)';
  $('portsIc').innerHTML = window.MbIcons.icon('server');
  $('portsIc').querySelector('.ic').style.color = 'var(--dim)';
  $('infoIc').innerHTML = window.MbIcons.icon('info');
  $('infoIc').querySelector('.ic').style.color = 'var(--dim)';
  $('searchIc').innerHTML = window.MbIcons.icon('search');
  $('btnImport').innerHTML = window.MbIcons.icon('plus');
  $('btnReping').innerHTML = window.MbIcons.icon('rotate');
  $('smartZsq').innerHTML = window.MbIcons.icon('zap');
  document.querySelector('#swSysProxy').classList.toggle('on', !!state.settings.sysProxy);
  document.querySelector('#swLivePing').classList.toggle('on', !!state.settings.livePing);
}

function renderThemeRow() {
  const row = $('themeRow');
  row.innerHTML = '';
  const names = ['midnight', 'forest', 'rose', 'slate', 'sand'];
  const palette = {
    midnight: ['#080E23', '#49E9B8'], forest: ['#001208', '#81DD85'], rose: ['#1A0815', '#FFA3AC'],
    slate: ['#0E1217', '#B1D092'], sand: ['#F0EBE0', '#04896A'],
  };
  names.forEach((name) => {
    const [night, glow] = palette[name];
    const opt = document.createElement('button');
    opt.className = 'theme-opt' + (state.settings.theme === name ? ' active' : '');
    opt.innerHTML = `<span class="sw" style="background:${night}"><i style="background:${glow}"></i></span>` +
      `<span class="nm">${themeName()[name]}</span>`;
    opt.onclick = async () => {
      state.settings.theme = name;
      window.mb.setSetting('theme', name);
      applyTheme();
      renderThemeRow();
    };
    row.appendChild(opt);
  });
}

// ── اضطراری — عین EmergencyScreen ──────────────────────────────────────

function renderEmergency() {
  const s = t();
  $('emgBtn').innerHTML = window.MbIcons.icon(emgState.busy ? 'refresh' : 'key') +
    `<span>${emgState.busy ? s.emgSearching : s.emgStart}</span>`;
  if (emgState.busy) $('emgBtn').querySelector('.ic').classList.add('spin');
  $('emgBtn').disabled = emgState.busy;
  $('emgNote').hidden = !emgState.fromCache;
  $('emgNote').textContent = emgState.fromCache ? s.emgCache(emgState.savedAt || '—') : '';

  $('emgLogCard').hidden = !emgState.logs.length;
  $('emgLog').textContent = emgState.logs.join('\n');
  $('emgLog').scrollTop = 1e6;

  $('emgMirrorsZone').hidden = !emgState.mirrors.length;
  const mlist = $('emgMirrorList');
  mlist.innerHTML = '';
  emgState.mirrors.slice(0, 8).forEach((m) => {
    const row = document.createElement('div');
    row.className = 'mirror-row';
    row.innerHTML = `<span>${escapeHtml(m)}</span>`;
    row.onclick = () => window.mb.openExternal(m);
    mlist.appendChild(row);
  });

  $('emgPoolZone').hidden = !emgState.links.length;
  const box = $('emgPoolList');
  box.innerHTML = '';
  emgState.links.forEach((e, i) => {
    const v = emgState.verdicts[i];
    const card = document.createElement('div');
    card.className = 'panel-card emg-row';
    const verdict = v === undefined
      ? `<div class="emg-verdict testing">${s.emgRowTesting}</div>`
      : v
        ? `<div class="emg-verdict ok">✓ <span dir="ltr" style="unicode-bidi:isolate">${v} ms</span> — ${s.emgRowOkTail}</div>`
        : `<div class="emg-verdict dead">${s.emgRowDead}</div>`;
    card.innerHTML =
      `<div class="top">
        <span class="emg-ic">${window.MbIcons.icon('shieldAlert')}</span>
        <div class="info"><div class="nm">${escapeHtml(e.name)}</div><div class="proto">${escapeHtml(e.proto)}</div></div>
      </div>${verdict}
      <div class="emg-actions">
        <button class="go">${s.emgConnect}</button>
        <button class="cp">${emgState.copiedIdx === i ? s.emgCopied : s.emgCopy}</button>
      </div>`;
    card.querySelector('.go').onclick = async () => {
      await window.mb.emergencyConnect(e.link);
      goto('home');
    };
    card.querySelector('.cp').onclick = async () => {
      await navigator.clipboard.writeText(e.link);
      emgState.copiedIdx = i;
      renderEmergency();
    };
    box.appendChild(card);
  });

  if (emgState.done) {
    const ok = Object.values(emgState.verdicts).filter(Boolean).length;
    const n = Object.keys(emgState.verdicts).length;
    if (n && !emgState.doneShown) {
      emgState.doneShown = true;
      emgState.logs.push(s.emgRealDone(ok, n));
      renderEmergency();
    }
  }
}

async function runEmergency() {
  const s = t();
  emgState = { busy: true, logs: [], mirrors: [], links: [], verdicts: {}, fromCache: false, done: false, doneShown: false };
  renderEmergency();
  try {
    const res = await window.mb.emergencyRescue();
    emgState.mirrors = res.mirrors || [];
    emgState.links = res.links || [];
    emgState.fromCache = !!res.fromCache;
    emgState.savedAt = res.savedAt || '';
    emgState.logs = res.logs || [];
    renderEmergency();
    if (!emgState.links.length) {
      toast(s.emgEmpty.slice(0, 60) + '…');
      emgState.busy = false;
      renderEmergency();
      return;
    }
    // تست واقعی هر کانفیگ — عین v2.9.4 اندروید
    emgState.logs.push(s.emgRealScan);
    renderEmergency();
    const batchN = 3;
    for (let i = 0; i < emgState.links.length; i += batchN) {
      const slice = emgState.links.slice(i, i + batchN).map((e, j) => ({ idx: i + j, link: e.link }));
      const results = await Promise.all(slice.map(async (x) => ({ idx: x.idx, ms: await window.mb.emergencyPing(x.link) })));
      results.forEach((r) => { emgState.verdicts[r.idx] = r.ms; });
      renderEmergency();
    }
  } catch (e) {
    emgState.logs.push('✗ ' + (e && e.message ? e.message : e));
  }
  emgState.busy = false;
  emgState.done = true;
  renderEmergency();
}

// ── رویدادهای اصلی ─────────────────────────────────────────────────────

function applyState(st) {
  const wasConnected = state.phase === 'connected';
  Object.assign(state, {
    phase: st.phase, selectedId: st.selectedId, serverName: st.serverName,
    error: st.error || '', version: st.version,
    configs: st.configs || [], socksPort: st.socksPort || 0, httpPort: st.httpPort || 0,
  });
  if (st.pings) {
    for (const [id, p] of Object.entries(st.pings)) {
      if (!state.pings[id] || (p.at && (!state.pings[id].at || p.at > state.pings[id].at))) {
        state.pings[id] = { ms: p.ms, at: p.at || 0 };
      }
    }
  }
  if (st.settings) {
    const langChanged = st.settings.lang !== state.settings.lang;
    const themeChanged = st.settings.theme !== state.settings.theme;
    state.settings = Object.assign(state.settings, st.settings);
    if (langChanged || themeChanged) {
      applyTheme();
      applyLang();
    }
  }
  if (state.phase === 'connected' && !wasConnected && !connStart) connStart = Date.now();
  if (state.phase !== 'connected') { connStart = 0; usage = { down: 0, up: 0 }; }
  if (state.phase === 'connected' && !wasConnected) {
    flashUntil = Date.now() + 4000;
    stopMsgRotation();
  }
  if (state.phase === 'connecting' && !wasConnected && state.phase !== 'connected') startMsgRotation();
  if (state.phase !== 'connecting') stopMsgRotation();
  applyTheme();
  renderRing(); renderStatus(); renderServerCard(); renderFavStrip();
  renderUsageLabels(); renderServers(); renderTabs();
  document.querySelector('#swSysProxy').classList.toggle('on', !!state.settings.sysProxy);
  document.querySelector('#swLivePing').classList.toggle('on', !!state.settings.livePing);
  $('portsD').textContent = t().portsSub(state.socksPort || 10808, state.httpPort || (state.socksPort ? state.socksPort + 1 : 10809));
}

let msgRotateTimer = null;
function startMsgRotation() {
  stopMsgRotation();
  msgRotateTimer = setInterval(() => {
    if (state.phase !== 'connecting') return stopMsgRotation();
    msgIdx = (msgIdx + 1) % t().connectingMsgs.length;
    renderStatus();
  }, 2200);
}
function stopMsgRotation() {
  if (msgRotateTimer) { clearInterval(msgRotateTimer); msgRotateTimer = null; }
}

// تایمر ثانیه‌شمار + مصرف
setInterval(() => {
  if (state.phase === 'connected') renderStatus();
}, 1000);
setInterval(async () => {
  if (state.phase !== 'connected') return;
  try {
    usage = await window.mb.getUsage();
    renderUsageLabels();
  } catch {}
}, 1500);

// ── شیت ورود کانفیگ ────────────────────────────────────────────────────

function openImport() {
  $('importScrim').classList.add('show');
  setImpTab(impTab);
  setTimeout(() => $('impText').focus(), 80);
}
function closeImport() {
  $('importScrim').classList.remove('show');
  $('impText').value = '';
  $('impName').value = '';
  $('impMsg').textContent = '';
  $('impMsg').className = 'imp-msg';
}
function setImpTab(key) {
  impTab = key;
  document.querySelectorAll('.imp-tab').forEach((b) => b.classList.toggle('active', b.dataset.imp === key));
  const s = t();
  $('impText').placeholder = key === 'link' ? s.importLinkHint : s.importSubHint;
  $('impName').style.display = key === 'link' ? 'none' : 'none'; // نام برای هر دو اختیاری — ساده نگه می‌داریم
  $('impGo').textContent = key === 'link' ? s.importAdd : s.importFetch;
}
function impMsg(txt, ok) {
  const el = $('impMsg');
  el.textContent = txt;
  el.className = 'imp-msg ' + (ok ? 'ok' : 'bad');
}
async function importGo() {
  const s = t();
  const text = $('impText').value.trim();
  if (!text) { impMsg(s.importInvalid, false); return; }
  $('impGo').disabled = true;
  try {
    if (impTab === 'link') {
      const r = await window.mb.addLinks(text);
      if (r.ok) { impMsg(`${s.importAdded} (+${r.added})`, true); setTimeout(closeImport, 900); renderTabs(); renderServers(); }
      else impMsg(r.error || s.importInvalid, false);
    } else {
      impMsg(s.importFetching, true);
      const r = await window.mb.addSubscription(text);
      if (r.ok) { impMsg(`${s.importSubOk} (+${r.added})`, true); setTimeout(closeImport, 900); renderTabs(); renderServers(); }
      else impMsg(r.error || s.importSubFail, false);
    }
  } finally {
    $('impGo').disabled = false;
  }
}

// ── راه‌اندازی ─────────────────────────────────────────────────────────

function wire() {
  $('powerRing').onclick = toggleConnect;
  $('serverCard').onclick = () => goto('servers');
  $('smartBtn').onclick = smartConnect;
  $('btnImport').onclick = openImport;
  $('btnReping').onclick = async () => {
    const b = $('btnReping');
    b.classList.add('busy');
    firstSweep = true; pingCursor = 0;
    await kickPingLoop(true);
    // یک اسکن کامل — همه به‌ترتیب دسته‌های ۴تایی
    const targets = state.configs;
    for (let i = 0; i < targets.length; i += 4) {
      const slice = targets.slice(i, i + 4);
      slice.forEach((c) => testing.add(c.id));
      renderServers();
      try {
        const res = await window.mb.pingBatch(slice.map((c) => ({ id: c.id, link: c.link })));
        res.forEach((r) => { testing.delete(r.id); state.pings[r.id] = { ms: r.ms, at: Date.now() }; });
      } catch {}
      slice.forEach((c) => testing.delete(c.id));
      renderServers(); renderServerCard();
    }
    b.classList.remove('busy');
  };
  $('sortPill').onclick = () => {
    state.settings.sortMode = state.settings.sortMode === 'az' ? 'ping' : 'az';
    window.mb.setSetting('sortMode', state.settings.sortMode);
    renderServers();
    $('sortPill').textContent = state.settings.sortMode === 'az' ? t().sortAz : t().sortPing;
  };
  $('searchIn').oninput = (e) => { query = e.target.value.trim(); renderServers(); };
  document.querySelectorAll('.lang-btn').forEach((b) => {
    b.onclick = async () => {
      state.settings.lang = b.dataset.lang;
      await window.mb.setSetting('lang', state.settings.lang);
      applyLang();
    };
  });
  document.querySelectorAll('.imp-tab').forEach((b) => { b.onclick = () => setImpTab(b.dataset.imp); });
  $('impGo').onclick = importGo;
  $('importScrim').onclick = (e) => { if (e.target === $('importScrim')) closeImport(); };
  $('swSysProxy').onclick = async () => {
    state.settings.sysProxy = !state.settings.sysProxy;
    $('swSysProxy').classList.toggle('on', state.settings.sysProxy);
    await window.mb.setSetting('sysProxy', state.settings.sysProxy);
  };
  $('swLivePing').onclick = async () => {
    state.settings.livePing = !state.settings.livePing;
    $('swLivePing').classList.toggle('on', state.settings.livePing);
    await window.mb.setSetting('livePing', state.settings.livePing);
    if (state.settings.livePing && screen === 'servers') kickPingLoop(true);
  };
  $('emgBtn').onclick = runEmergency;

  // نوار عنوان
  $('winMin').onclick = () => window.mb.win('min');
  $('winMax').onclick = () => window.mb.win('max');
  $('winClose').onclick = () => window.mb.win('close');
  document.querySelector('.titlebar').addEventListener('dblclick', () => window.mb.win('max'));

  window.mb.onEvent((evt) => {
    if (evt.type === 'state') applyState(evt.payload);
    else if (evt.type === 'emg:log') {
      emgState.logs.push(evt.payload);
      renderEmergency();
    } else if (evt.type === 'emg:reset') {
      emgState = { busy: true, logs: [], mirrors: [], links: [], verdicts: {}, fromCache: false, done: false, doneShown: false };
      renderEmergency();
    }
  });
}

async function boot() {
  wire();
  const st = await window.mb.getState();
  applyState(st);
  applyTheme();
  applyLang();
  renderRing();
  renderStatus();
  kickPingLoop(false);
  // قابل آزمایش: وضعیت و اکشن‌ها برای تست E2E
  window.__mbState = () => JSON.parse(JSON.stringify(state));
  window.__mbActions = { goto, openImport, closeImport, setImpTab, importGo, runEmergency, smartConnect, toggleConnect, applyLang, selectConfig };
}
boot();
