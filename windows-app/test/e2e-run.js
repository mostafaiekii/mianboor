'use strict';
/**
 * E2E میانپور ویندوز — ورودی الکترون.
 * اپ واقعی (src/main.js) بالا می‌آید با MB_DEV + پروفایل جدا، بعد سناریوی
 * سیزده‌مرحله‌ای داخل webContents اجرا می‌شود و نتیجه در فایل JSON نوشته می‌شود.
 * لینک‌ها از env می‌آیند (MB_E2E_GOOD / MB_E2E_DEAD).
 */
process.env.MB_DEV = '1';

require('../src/main.js'); // ← اپ واقعی — بدون این هیچ پنجره‌ای ساخته نمی‌شود
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const RESULT = process.env.MB_E2E_RESULT || path.join(os_tmp(), 'mb-e2e-result.json');
function os_tmp() { return require('os').tmpdir(); }

const GOOD = process.env.MB_E2E_GOOD;
const DEAD = process.env.MB_E2E_DEAD;

async function driver() {
  const S = window.__mbState, A = window.__mbActions, mb = window.mb;
  const out = { steps: [] };
  const ok = (n, cond, info) => out.steps.push({ n, ok: !!cond, info: String(info || '') });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function waitFor(fn, ms, iv = 300) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      try { const v = await fn(); if (v) return v; } catch {}
      await wait(iv);
    }
    return null;
  }

  // ۱) بوت — پل و وضعیت اولیه
  ok('01-boot', typeof S === 'function' && typeof mb.getState === 'function' && typeof mb.connect === 'function');
  let st = S();
  ok('02-idle-empty', st.phase === 'idle' && st.configs.length === 0 && st.version, 'v=' + st.version);

  // ۳) ورود دو کانفیگ (سلام + مرده)
  A.openImport();
  await wait(150);
  document.getElementById('impText').value = window.__MB_LINKS__;
  document.getElementById('impGo').click();
  const added = await waitFor(() => S().configs.length === 2, 5000);
  ok('03-import-2', !!added, 'n=' + S().configs.length);

  const good = S().configs.find((c) => c.name === 'LocalXray');
  const dead = S().configs.find((c) => c.name === 'DeadXray');
  ok('04-configs-present', !!good && !!dead);

  // ۵) پینگ واقعی کانفیگ سالم — عدد واقعی از دل تونل
  const resG = await mb.pingBatch([{ id: good.id, link: good.link }]);
  ok('05-ping-real', resG[0].ms > 0 && resG[0].ms < 900, 'ms=' + resG[0].ms);
  st = S();
  ok('06-ping-state-synced', st.pings[good.id] && st.pings[good.id].ms === resG[0].ms);

  // ۷) پینگ کانفیگ مرده — صادقانه ۹۹۹ (نه عدد الکی)
  const resD = await mb.pingBatch([{ id: dead.id, link: dead.link }]);
  ok('07-ping-dead-honest-999', resD[0].ms === 999, 'ms=' + resD[0].ms);

  // ۸) اتصال هوشمند = کمترین پینگ واقعی
  st = S();
  const bestId = [good, dead].reduce((a, c) => ((st.pings[c.id] ? st.pings[c.id].ms : 9999) < (a ? (st.pings[a.id] ? st.pings[a.id].ms : 9999) : 99999) ? c : a), null);
  A.smartConnect();
  await wait(400);
  st = S();
  ok('08-smart-connect', st.selectedId === (bestId && bestId.id), 'sel=' + st.selectedId + ' best=' + (bestId && bestId.id));

  // ۹) اتصال واقعی → «متصل» فقط بعد از اثبات ترافیک از دل تونل
  A.toggleConnect();
  const conn = await waitFor(() => S().phase === 'connected', 30000);
  ok('09-connect-honest', !!conn, 'phase=' + S().phase + (S().error ? ' err=' + S().error : ''));

  // ۱۰) مصرف واقعی از StatsService هسته
  const usage = await waitFor(async () => {
    const u = await mb.getUsage();
    return u && u.down + u.up > 0 ? u : null;
  }, 12000);
  ok('10-usage-real', !!usage, usage ? 'down=' + usage.down + ' up=' + usage.up : 'no bytes');

  // ۱۱) قطع
  await mb.disconnect();
  await wait(300);
  ok('11-disconnect', S().phase === 'idle');

  // ۱۲) کانفیگ مرده → خطای صادقانه، هرگز «متصل» دروغین
  await mb.selectConfig(dead.id);
  await mb.connect();
  const err = await waitFor(() => S().phase === 'error', 30000);
  ok('12-dead-honest-error', !!err && /تونل|نامعتبر|بالا نیامد|کار نمی/.test(S().error || ''), (S().error || '').slice(0, 60));
  await mb.disconnect().catch(() => {});
  await wait(200);

  // ۱۳) تم و زبان + منتخب‌ها + اضطراری (بدون کرش)
  await mb.setSetting('theme', 'forest');
  await wait(250);
  const th = document.documentElement.getAttribute('data-theme') === 'forest';
  await mb.setSetting('lang', 'en');
  await wait(350);
  const lr = document.documentElement.getAttribute('dir') === 'ltr';
  await mb.setSetting('lang', 'fa');
  await wait(200);
  await mb.setSetting('favorites', [good.id]);
  st = S();
  ok('13-ui-prefs', th && lr && (st.settings.favorites || []).includes(good.id), 'theme+ltr+favs');

  return out;
}

app.whenReady().then(async () => {
  console.error('[e2e] whenReady fired');
  let win = null;
  for (let i = 0; i < 60; i++) {
    win = BrowserWindow.getAllWindows()[0];
    if (win) {
      try {
        const ready = await win.webContents.executeJavaScript(
          'typeof window.__mbState === "function" && typeof window.mb === "object" && window.mb ? true : false'
        );
        if (ready) { console.error('[e2e] bridge ready at poll', i); break; }
        console.error('[e2e] poll', i, 'window exists, bridge not ready yet');
      } catch (e) {
        console.error('[e2e] poll', i, 'executeJavaScript failed:', String(e && e.message).slice(0, 120));
      }
    } else if (i % 5 === 0) {
      console.error('[e2e] poll', i, 'no window yet');
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!win) {
    fs.writeFileSync(RESULT, JSON.stringify({ ok: false, error: 'window/bridge never became ready' }));
    app.exit(1);
    return;
  }
  try {
    await win.webContents.executeJavaScript(
      'window.__MB_LINKS__ = ' + JSON.stringify([GOOD, DEAD].join('\n')) + '; true'
    );
    const out = await win.webContents.executeJavaScript('(' + driver.toString() + ')()');
    const okAll = out.steps.every((s) => s.ok);
    fs.writeFileSync(RESULT, JSON.stringify({ ok: okAll, steps: out.steps }, null, 1));
    app.exit(okAll ? 0 : 1);
  } catch (e) {
    fs.writeFileSync(RESULT, JSON.stringify({ ok: false, error: String((e && e.message) || e) }));
    app.exit(1);
  }
});
