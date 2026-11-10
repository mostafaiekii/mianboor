'use strict';
/* رابط کاربری میانپور ویندوز */

const $ = (id) => document.getElementById(id);
const api = window.mianboor;

let appState = null;
let pingBusy = false;
const pingResults = {}; // id -> {ok, ms, reason, testing}

// ---------------------------------------------------------------------------

function chipFor(phase) {
  const chip = $('chip');
  chip.className = 'chip';
  if (phase === 'connected') { chip.classList.add('connected'); return 'متصل'; }
  if (phase === 'connecting') { chip.classList.add('connecting'); return 'در حال اتصال…'; }
  if (phase === 'error') { chip.classList.add('error'); return 'خطا'; }
  return 'قطع';
}

function fmtPing(p) {
  if (!p) return { text: '—', cls: 'ping testing', title: 'تست نشده' };
  if (p.testing) return { text: '…', cls: 'ping testing', title: 'در حال تست' };
  if (p.ok && p.ms != null) {
    const cls = p.ms < 400 ? 'ping' : p.ms < 1000 ? 'ping warn' : 'ping bad';
    return { text: p.ms + ' ms', cls, title: 'پینگ واقعی از دل تونل' };
  }
  return { text: '✗', cls: 'ping bad', title: p.reason || 'تونل کار نکرد' };
}

function render() {
  const s = appState;
  if (!s) return;

  $('chipText').textContent = chipFor(s.phase);
  $('chip').className = 'chip ' + (s.phase === 'connected' ? 'connected' : s.phase === 'connecting' ? 'connecting' : s.phase === 'error' ? 'error' : '');

  const sel = (s.configs || []).find((c) => c.id === s.selectedId);
  $('selName').textContent = sel ? sel.name : 'سروری انتخاب نشده';

  const btn = $('btnConnect');
  if (s.phase === 'connecting') { btn.textContent = 'در حال اتصال…'; btn.disabled = true; btn.classList.remove('stop'); }
  else if (s.phase === 'connected') { btn.textContent = 'قطع اتصال'; btn.disabled = false; btn.classList.add('stop'); }
  else { btn.textContent = 'اتصال'; btn.disabled = false; btn.classList.remove('stop'); }

  const err = $('errLine');
  if (s.phase === 'error' && s.error) { err.hidden = false; err.textContent = s.error; }
  else err.hidden = true;

  $('sysProxy').checked = !!(s.settings && s.settings.sysProxy);

  if (s.socksPort) {
    $('portInfo').hidden = false;
    $('socksPortTxt').textContent = s.socksPort;
    $('httpPortTxt').textContent = s.httpPort;
  } else {
    $('portInfo').hidden = true;
  }

  // لیست سرورها
  const ul = $('servers');
  ul.innerHTML = '';
  const cfgs = s.configs || [];
  if (!cfgs.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.innerHTML = 'هنوز کانفیگی نداری.<br/>از «افزودن کانفیگ» لینک کانفیگ یا سابسکریپشن را وارد کن.';
    ul.appendChild(li);
    return;
  }
  for (const c of cfgs) {
    const li = document.createElement('li');
    li.className = 'server' + (c.id === s.selectedId ? ' selected' : '');
    li.setAttribute('role', 'button');
    li.setAttribute('aria-label', 'انتخاب ' + c.name);

    const info = document.createElement('div');
    info.className = 'info';
    const nm = document.createElement('div');
    nm.className = 'name'; nm.textContent = c.name;
    const hs = document.createElement('div');
    hs.className = 'host'; hs.textContent = `${c.protocol} · ${c.host}:${c.port}`;
    info.appendChild(nm); info.appendChild(hs);

    const fromLive = (pingResults[c.id] || null);
    const stored = (s.pings && s.pings[c.id]) || null;
    const p = fmtPing(fromLive || stored);
    const badge = document.createElement('span');
    badge.className = p.cls; badge.textContent = p.text; badge.title = p.title;

    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '✕'; del.title = 'حذف';
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (c.id === s.selectedId && (s.phase === 'connected' || s.phase === 'connecting')) {
        await api.disconnect();
      }
      delete pingResults[c.id];
      await api.removeConfig(c.id);
      await refresh();
    });

    li.appendChild(info); li.appendChild(badge); li.appendChild(del);
    li.addEventListener('click', async () => {
      if (c.id === s.selectedId) return;
      await api.selectConfig(c.id);
      await refresh();
    });
    ul.appendChild(li);
  }
}

function appendLog(line) {
  const box = $('logBox');
  const div = document.createElement('div');
  div.textContent = line;
  box.appendChild(div);
  while (box.childNodes.length > 200) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}

// ---------------------------------------------------------------------------

async function refresh() {
  const s = await api.getState();
  // اگر تست پینگ در جریان است، نتایج لحظه‌ای را نگه دار
  s.configs = s.configs || [];
  appState = s;
  for (const c of s.configs) {
    if (pingBusy && pingResults[c.id] && pingResults[c.id].testing) continue;
  }
  render();
}

// ---------------------------------------------------------------------------

$('btnConnect').addEventListener('click', async () => {
  const s = appState;
  if (!s) return;
  if (s.phase === 'connected') {
    await api.disconnect();
  } else if (s.phase === 'idle' || s.phase === 'error') {
    if (!s.selectedId) {
      alert('اول یک سرور از لیست انتخاب کن.');
      return;
    }
    await api.connect();
  }
  setTimeout(refresh, 250);
});

$('btnPing').addEventListener('click', async () => {
  if (pingBusy) return;
  pingBusy = true;
  $('btnPing').disabled = true;
  for (const c of (appState ? appState.configs : [])) pingResults[c.id] = { testing: true };
  render();
  try { await api.pingAll(); } catch {}
  pingBusy = false;
  $('btnPing').disabled = false;
  await refresh();
});

$('btnAdd').addEventListener('click', () => {
  const p = $('addPanel');
  p.hidden = !p.hidden;
  if (!p.hidden) $('addText').focus();
});

$('btnAddCancel').addEventListener('click', () => { $('addPanel').hidden = true; });

$('btnAddGo').addEventListener('click', async () => {
  const btn = $('btnAddGo');
  const msg = $('addMsg');
  btn.disabled = true;
  msg.className = 'addmsg';
  msg.textContent = 'در حال افزودن…';
  try {
    const text = $('addText').value.trim();
    if (!text) { msg.textContent = 'چیزی وارد نشده.'; msg.classList.add('bad'); return; }
    // اگر با http شروع شد → سابسکریپشن، وگرنه لینک مستقیم
    let res;
    if (/^https?:\/\//i.test(text) && !/^(vmess|vless|trojan|ss):\/\//im.test(text)) {
      res = await api.addSubscription(text);
    } else {
      res = await api.addLinks(text);
    }
    if (res && res.ok) {
      msg.className = 'addmsg ok';
      msg.textContent = `✓ ${res.added} کانفیگ اضافه شد${res.total != null ? ` (از ${res.total} عدد)` : ''}`;
      $('addText').value = '';
      await refresh();
    } else {
      msg.className = 'addmsg bad';
      msg.textContent = (res && res.error) || 'خطای نامشخص';
    }
  } catch (e) {
    msg.className = 'addmsg bad';
    msg.textContent = 'خطا: ' + e.message;
  } finally {
    btn.disabled = false;
  }
});

$('sysProxy').addEventListener('change', async (e) => {
  await api.setSysProxy(e.target.checked);
  setTimeout(refresh, 200);
});

// ---------------------------------------------------------------------------

api.onEvent((ev) => {
  if (ev.type === 'state') {
    appState = Object.assign({}, appState || {}, ev.payload);
    render();
  } else if (ev.type === 'ping:started') {
    pingBusy = true;
  } else if (ev.type === 'ping:done') {
    const { id, res } = ev.payload;
    pingResults[id] = res;
    if (appState) { appState.pings = appState.pings || {}; appState.pings[id] = res; }
    render();
  } else if (ev.type === 'ping:finished') {
    pingBusy = false;
    $('btnPing').disabled = false;
  } else if (ev.type === 'log') {
    appendLog(ev.payload.line);
  }
});

refresh();
