'use strict';
/**
 * مدیریت هستهٔ Xray — راه‌اندازی/توقف پروسه + انتظار برای بالا آمدن.
 * باینری در windows-app/xray/ کنار اپ است (xray.exe روی ویندوز، xray روی لینوکس).
 */

const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');

function xrayDir() {
  return path.join(__dirname, '..', 'xray');
}

function xrayBin() {
  return path.join(xrayDir(), process.platform === 'win32' ? 'xray.exe' : 'xray');
}

function xrayAvailable() {
  try { fs.accessSync(xrayBin(), fs.constants.X_OK); return true; } catch { return false; }
}

/** پورت آزاد — اول پورتِ ترجیحی، اگر اشغال بود تصادفی */
function findFreePort(preferred) {
  return new Promise((resolve) => {
    const tryPreferred = () => {
      const srv = net.createServer();
      srv.once('error', () => randomFree());
      srv.once('listening', () => srv.close(() => resolve(preferred)));
      srv.listen(preferred, '127.0.0.1');
    };
    const randomFree = () => {
      const srv = net.createServer();
      srv.once('error', () => resolve(preferred + 7));
      srv.once('listening', () => {
        const p = srv.address().port;
        srv.close(() => resolve(p));
      });
      srv.listen(0, '127.0.0.1');
    };
    tryPreferred();
  });
}

/** TCP-probe: تا پورت لوکال باز شود صبر کن */
function waitPortOpen(port, timeoutMs = 6000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const attempt = () => {
      const s = net.connect({ host: '127.0.0.1', port });
      s.once('connect', () => { s.destroy(); resolve(true); });
      s.once('error', () => {
        s.destroy();
        if (Date.now() - start > timeoutMs) resolve(false);
        else setTimeout(attempt, 150);
      });
    };
    attempt();
  });
}

class XrayRunner {
  constructor({ config, log }) {
    this.config = config;
    this.log = log || (() => {});
    this.proc = null;
    this.cfgPath = null;
    this.exited = false;
    this.exitCode = null;
    this.userStopped = false;
  }

  start() {
    const bin = xrayBin();
    this.cfgPath = path.join(os.tmpdir(), `mianboor-xray-${Date.now()}-${Math.floor(Math.random() * 1e6)}.json`);
    fs.writeFileSync(this.cfgPath, JSON.stringify(this.config));
    const env = Object.assign({}, process.env, { XRAY_LOCATION_ASSET: xrayDir() });
    this.proc = spawn(bin, ['run', '-c', this.cfgPath], { windowsHide: true, env });
    this.proc.stdout.on('data', (d) => this.log('[xray] ' + String(d).trim()));
    this.proc.stderr.on('data', (d) => this.log('[xray] ' + String(d).trim()));
    this.proc.on('exit', (code) => {
      this.exited = true;
      this.exitCode = code;
      this.log(`[xray] فرایند بسته شد (code ${code})`);
      try { fs.unlinkSync(this.cfgPath); } catch {}
    });
    this.proc.on('error', (e) => {
      this.exited = true;
      this.log('[xray] خطای اجرا: ' + e.message);
    });
    return this.proc;
  }

  async waitReady(socksPort, timeoutMs) {
    return waitPortOpen(socksPort, timeoutMs || 6000);
  }

  stop() {
    this.userStopped = true;
    try { if (this.proc) this.proc.kill(); } catch {}
  }
}

module.exports = { xrayDir, xrayBin, xrayAvailable, findFreePort, waitPortOpen, XrayRunner };
