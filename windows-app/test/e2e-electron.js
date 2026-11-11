'use strict';
/**
 * ارکستراتور E2E — از بیرون الکترون:
 *   ۱) سرور Xray لوکال (vless ساده روی 127.0.0.1) بالا می‌آورد = تونل «واقعاً کارکننده»
 *   ۲) اپ را با MB_USER_DATA جدا زیر Xvfb اجرا می‌کند
 *   ۳) نتیجهٔ سیزده‌مرحله‌ای را از فایل نتیجه می‌خواند و گزارش می‌دهد
 * اجرا: node test/e2e-electron.js   (روی لینوکس بدون DISPLAY خودش xvfb می‌گذارد؟ نه —
 * از بیرون: xvfb-run -a node test/e2e-electron.js)
 */

const { spawn, spawnSync } = require('child_process');
const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const XRAY = path.join(ROOT, 'xray', process.platform === 'win32' ? 'xray.exe' : 'xray');
const RESULT = path.join(os.tmpdir(), 'mb-e2e-result.json');
const SRV_PORT = 18443;
const UUID = '123e4567-e89b-12d3-a456-426614174000';

const GOOD = `vless://${UUID}@127.0.0.1:${SRV_PORT}?type=tcp&security=none#LocalXray`;
const DEAD = `vless://123e4567-e89b-12d3-a456-426614174001@127.0.0.1:9?type=tcp&security=none#DeadXray`;

function waitPort(port, timeoutMs) {
  const t0 = Date.now();
  return new Promise((resolve) => {
    const attempt = () => {
      const s = net.connect({ host: '127.0.0.1', port });
      s.once('connect', () => { s.destroy(); resolve(true); });
      s.once('error', () => {
        s.destroy();
        if (Date.now() - t0 > timeoutMs) resolve(false);
        else setTimeout(attempt, 150);
      });
    };
    attempt();
  });
}

async function main() {
  try { fs.unlinkSync(RESULT); } catch {}
  if (!fs.existsSync(XRAY)) {
    console.error('✗ باینری Xray پیدا نشد:', XRAY);
    console.error('  برای E2E هسته را بگذار: windows-app/xray/' + (process.platform === 'win32' ? 'xray.exe' : 'xray'));
    process.exit(1);
  }

  // ── سرور تونل واقعی ──
  const srvCfg = {
    log: { loglevel: 'warning' },
    inbounds: [{
      tag: 'srv-in', listen: '127.0.0.1', port: SRV_PORT, protocol: 'vless',
      settings: { clients: [{ id: UUID, level: 0 }], decryption: 'none' },
    }],
    outbounds: [{ tag: 'direct', protocol: 'freedom', settings: {} }],
  };
  const srvCfgPath = path.join(os.tmpdir(), `mb-e2e-server-${Date.now()}.json`);
  fs.writeFileSync(srvCfgPath, JSON.stringify(srvCfg));
  const srv = spawn(XRAY, ['run', '-c', srvCfgPath], { stdio: 'ignore' });
  const up = await waitPort(SRV_PORT, 6000);
  if (!up) {
    console.error('✗ سرور تست لوکال بالا نیامد');
    try { srv.kill(); } catch {}
    process.exit(1);
  }
  console.log('✓ سرور Xray لوکال روی 127.0.0.1:' + SRV_PORT + ' بالا آمد (تونل واقعی)');

  // ── اپ الکترون ──
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mb-e2e-profile-'));
  const electronBin = require('electron');
  const args = [path.join(__dirname, 'e2e-run.js')];
  const env = Object.assign({}, process.env, {
    MB_DEV: '1',
    MB_USER_DATA: profile,
    MB_E2E_RESULT: RESULT,
    MB_E2E_GOOD: GOOD,
    MB_E2E_DEAD: DEAD,
    ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
  });
  const cmd = process.platform === 'linux' && !process.env.DISPLAY ? 'xvfb-run' : electronBin;
  const spawnArgs = process.platform === 'linux' && !process.env.DISPLAY ? ['-a', electronBin, ...args] : args;
  console.log('… اجرای اپ الکترون (E2E سیزده‌مرحله‌ای)');

  const child = spawn(cmd, spawnArgs, { env, stdio: ['ignore', 'inherit', 'inherit'] });

  const t0 = Date.now();
  let done = false;
  while (Date.now() - t0 < 150000) {
    if (fs.existsSync(RESULT)) { done = true; break; }
    if (child.exitCode !== null && !fs.existsSync(RESULT)) { /* ممکن است فایل قبل از exit نوشته شده باشد */ }
    await new Promise((r) => setTimeout(r, 500));
  }

  try { srv.kill(); fs.unlinkSync(srvCfgPath); } catch {}
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}

  if (!done) {
    console.error('✗ E2E زمان‌کشید — فایل نتیجه ساخته نشد');
    try { child.kill('SIGKILL'); } catch {}
    process.exit(1);
  }

  const res = JSON.parse(fs.readFileSync(RESULT, 'utf8'));
  console.log('\n═══ E2E — ۱۳ گام ═══');
  for (const s of res.steps) {
    console.log((s.ok ? '  ✓ ' : '  ✗ ') + s.n + (s.info ? ' — ' + s.info : ''));
  }
  console.log(res.ok ? '\nE2E: ALL GREEN' : '\nE2E: FAILED');
  process.exit(res.ok ? 0 : 1);
}

main().catch((e) => { console.error('orchestrator crashed:', e); process.exit(1); });
