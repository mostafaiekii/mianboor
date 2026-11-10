'use strict';
/**
 * ذخیره‌سازی — userData/mianboor-configs.json
 * کانفیگ‌ها + آخرین پینگ واقعی هر کدام + تنظیمات (تم/زبان/منتخب‌ها/…)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULTS = {
  configs: [],           // { id, name, protocol, host, port, country, link, source, addedAt }
  pings: {},             // id → { ms, ok, at }
  emergency: { links: [], mirrors: [], savedAt: 0 },
  settings: {
    selectedId: null,
    sysProxy: true,
    theme: 'midnight',
    lang: 'fa',
    livePing: true,
    sortMode: 'ping',
    favorites: [],
  },
};

class Store {
  constructor(file) {
    this.file = file;
    this.data = JSON.parse(JSON.stringify(DEFAULTS));
    try {
      if (fs.existsSync(file)) {
        const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
        this.data = Object.assign(this.data, raw);
        this.data.settings = Object.assign(JSON.parse(JSON.stringify(DEFAULTS.settings)), raw.settings || {});
      }
    } catch (e) {
      // فایل خراب → از نو
      try { fs.renameSync(file, file + '.corrupt-' + Date.now()); } catch {}
    }
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = this.file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 1));
      fs.renameSync(tmp, this.file);
    } catch {}
  }

  static hash(s) {
    return crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 12);
  }
}

module.exports = { Store };
