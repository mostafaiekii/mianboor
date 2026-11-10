'use strict';
/**
 * پروکسی سیستم ویندوز — همان کاری که v2rayN می‌کند:
 * تنظیم رجیستری WinINet (HKCU\...\Internet Settings) + اطلاع‌رسانی به سیستم
 * با InternetSetOption (SETTINGS_CHANGED / REFRESH) تا مرورگرها فوری بفهمند.
 * روی غیر-ویندوز همهٔ توابع no-op هستند (برای توسعه/تست روی لینوکس).
 */

const { spawnSync } = require('child_process');

const INET_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';
const OVERRIDE = 'localhost;127.*;192.168.*;10.*;172.16.*;<local>';

function isWindows() {
  return process.platform === 'win32';
}

function reg(args) {
  try {
    return spawnSync('reg.exe', args, { windowsHide: true, timeout: 8000 });
  } catch {
    return null;
  }
}

function refreshWinInet() {
  if (!isWindows()) return;
  const ps =
    "$sig='[DllImport(\"wininet.dll\", SetLastError=true)] public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength);'; " +
    '$t=Add-Type -MemberDefinition $sig -Name WinINet -Namespace Proxy -PassThru; ' +
    '[void]$t::InternetSetOption([IntPtr]::Zero,39,[IntPtr]::Zero,0); ' +
    '[void]$t::InternetSetOption([IntPtr]::Zero,37,[IntPtr]::Zero,0);';
  try {
    spawnSync('powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', ps],
      { windowsHide: true, timeout: 10000 });
  } catch {}
}

/** روشن/خاموش کردن پروکسی سیستم روی پورت HTTP لوکال */
function setSystemProxy(enabled, httpPort) {
  if (!isWindows()) return { ok: true, noop: true };
  if (enabled) {
    reg(['add', INET_KEY, '/v', 'ProxyEnable', '/t', 'REG_DWORD', '/d', '1', '/f']);
    reg(['add', INET_KEY, '/v', 'ProxyServer', '/t', 'REG_SZ', '/d', `127.0.0.1:${httpPort}`, '/f']);
    reg(['add', INET_KEY, '/v', 'ProxyOverride', '/t', 'REG_SZ', '/d', OVERRIDE, '/f']);
  } else {
    reg(['add', INET_KEY, '/v', 'ProxyEnable', '/t', 'REG_DWORD', '/d', '0', '/f']);
    reg(['delete', INET_KEY, '/v', 'ProxyServer', '/f']);
  }
  refreshWinInet();
  return { ok: true };
}

module.exports = { isWindows, setSystemProxy, refreshWinInet };
