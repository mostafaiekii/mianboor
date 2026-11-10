'use strict';
/** ذخیره‌سازی سادهٔ JSON در پوشهٔ userData اپ */

const fs = require('fs');
const path = require('path');

class Store {
  constructor(file) {
    this.file = file;
    this.data = {
      configs: [],
      pings: {}, // id -> {ok, ms, reason, at}
      settings: { sysProxy: true, selectedId: null },
    };
    this.load();
  }

  load() {
    try {
      const j = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (j && Array.isArray(j.configs)) {
        this.data = Object.assign(this.data, j);
        this.data.settings = Object.assign({ sysProxy: true, selectedId: null }, j.settings || {});
      }
    } catch {}
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
    } catch (e) {
      console.error('store save failed:', e.message);
    }
  }
}

module.exports = { Store };
