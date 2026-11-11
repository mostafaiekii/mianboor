'use strict';
/**
 * پرچم‌های گرد کشورها — پورت یک‌به‌یکِ Flags.kt نسخهٔ اندروید.
 * هر پرچم یک SVG با viewBox 36×36 و کلیپ دایره‌ای است؛ همان مختصات همان کانواس.
 * کد خروجی: <svg class="flag">…</svg> — اندازه با CSS کنترل می‌شود.
 */

(function () {
  const C = {
    F_RED: '#BB061E', F_WHITE: '#F8F8F8', F_BLUE: '#1545A2', F_BLACK: '#121212',
    F_RED2: '#D40C1A', F_YELLOW: '#FDC010', F_GREEN: '#05893E', F_NAVY: '#18337D',
    F_GOLD: '#E3A008', F_DARK_GOLD: '#B07C08', GB_RED: '#C8102E',
    GIFT_GOLD_LIGHT: '#FFD54A', GIFT_GOLD_DARK: '#C8A215', GIFT_GOLD_EDGE: '#8A6D00',
    BG: '#3A3F52',
  };

  const COUNTRIES = {
    nl: 'Netherlands', de: 'Germany', fi: 'Finland', gb: 'United Kingdom', tr: 'Turkey',
    us: 'USA', fr: 'France', ae: 'UAE', se: 'Sweden', ch: 'Switzerland', ca: 'Canada',
    sg: 'Singapore', jp: 'Japan', it: 'Italy', es: 'Spain', ru: 'Russia',
    in: 'India', au: 'Australia', ir: 'Iran',
  };

  function countryName(code) {
    if (code === 'gift') return 'هدیه';
    return COUNTRIES[code] || code;
  }

  /** بدنهٔ پرچم در مختصات 36×36 — عین شاخه‌های when(code) کاتلین */
  function body(code) {
    const r = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
    const rr = (x, y, w, h, c, rad) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rad}" fill="${c}"/>`;
    const ci = (cx, cy, rad, c) => `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${c}"/>`;
    const ln = (x1, y1, x2, y2, c, sw, cap) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${sw}"${cap ? ` stroke-linecap="${cap}"` : ''}/>`;
    const pg = (pts, c) => `<path d="M${pts.map((p) => p.join(' ')).join('L')}Z" fill="${c}"/>`;

    switch (code) {
      case 'nl':
        return r(0, 0, 36, 12, C.F_RED) + r(0, 12, 36, 12, C.F_WHITE) + r(0, 24, 36, 12, C.F_BLUE);
      case 'de':
        return r(0, 0, 36, 12, '#000000') + r(0, 12, 36, 12, '#DD0000') + r(0, 24, 36, 12, '#FFCC00');
      case 'fi':
        return r(0, 0, 36, 36, C.F_WHITE) + r(10, 0, 7, 36, C.F_BLUE) + r(0, 14.5, 36, 7, C.F_BLUE);
      case 'gb':
        return r(0, 0, 36, 36, '#012169') +
          ln(0, 0, 36, 36, C.F_WHITE, 7) + ln(36, 0, 0, 36, C.F_WHITE, 7) +
          ln(-1.56, 1.56, 16.44, 19.56, C.GB_RED, 2.6) + ln(19.56, 16.44, 37.56, 34.44, C.GB_RED, 2.6) +
          ln(19.56, 19.56, 1.56, 37.56, C.GB_RED, 2.6) + ln(16.44, 16.44, 34.44, -1.56, C.GB_RED, 2.6) +
          r(12, 0, 12, 36, C.F_WHITE) + r(0, 12, 36, 12, C.F_WHITE) +
          r(14.4, 0, 7.2, 36, C.GB_RED) + r(0, 14.4, 36, 7.2, C.GB_RED);
      case 'tr':
        return r(0, 0, 36, 36, C.F_RED2) + ci(15, 18, 8, C.F_WHITE) + ci(17, 18, 6.4, C.F_RED2) + ci(24.5, 18, 2.6, C.F_WHITE);
      case 'us': {
        let s = r(0, 0, 36, 36, C.F_WHITE);
        for (let i = 0; i <= 6; i++) s += r(0, i * 5.14, 36, 2.57, '#C8102E');
        return s + r(0, 0, 17, 18, C.F_NAVY);
      }
      case 'fr':
        return r(0, 0, 12, 36, C.F_BLUE) + r(12, 0, 12, 36, C.F_WHITE) + r(24, 0, 12, 36, C.F_RED2);
      case 'ae':
        return r(0, 0, 36, 12, C.F_GREEN) + r(0, 12, 36, 12, C.F_WHITE) + r(0, 24, 36, 12, C.F_BLACK) + r(0, 0, 10, 36, C.F_RED2);
      case 'se':
        return r(0, 0, 36, 36, '#0B5C9E') + r(12, 0, 5, 36, C.F_YELLOW) + r(0, 15.5, 36, 5, C.F_YELLOW);
      case 'ch':
        return r(0, 0, 36, 36, '#D52B1E') + r(15.5, 8, 5, 20, C.F_WHITE) + r(8, 15.5, 20, 5, C.F_WHITE);
      case 'ca':
        return r(0, 0, 36, 36, C.F_WHITE) + r(0, 0, 9, 36, '#D80621') + r(27, 0, 9, 36, '#D80621') +
          pg([
            [18, 12.5], [19.6, 15.4], [22.4, 14.2], [21.4, 17.2],
            [24.2, 18.6], [21.4, 20.2], [22.2, 23], [18, 21.6],
            [13.8, 23], [14.6, 20.2], [11.8, 18.6], [14.6, 17.2],
            [13.6, 14.2], [16.4, 15.4],
          ], '#D80621') + r(17.6, 21.6, 0.8, 2, '#D80621');
      case 'sg':
        return r(0, 0, 36, 18, '#ED2939') + r(0, 18, 36, 18, C.F_WHITE) +
          ci(8.5, 9, 4.2, C.F_WHITE) + ci(10.3, 9, 3.5, '#ED2939') +
          [[14.5, 6.6], [16.6, 8.2], [15.8, 10.6], [13.2, 10.6], [12.4, 8.2]]
            .map((p) => ci(p[0], p[1], 0.7, C.F_WHITE)).join('');
      case 'jp':
        return r(0, 0, 36, 36, C.F_WHITE) + ci(18, 18, 7.2, '#D30000');
      case 'it':
        return r(0, 0, 12, 36, C.F_GREEN) + r(12, 0, 12, 36, C.F_WHITE) + r(24, 0, 12, 36, C.F_RED2);
      case 'es':
        return r(0, 0, 36, 9, '#C60B1E') + r(0, 9, 36, 18, '#FFC400') + r(0, 27, 36, 9, '#C60B1E');
      case 'ru':
        return r(0, 0, 36, 12, C.F_WHITE) + r(0, 12, 36, 12, C.F_BLUE) + r(0, 24, 36, 12, C.F_RED2);
      case 'in':
        return r(0, 0, 36, 12, '#FF9933') + r(0, 12, 36, 12, C.F_WHITE) + r(0, 24, 36, 12, '#138808') +
          ci(18, 18, 4.2, C.F_NAVY) + ci(18, 18, 3, C.F_WHITE) + ci(18, 18, 1, C.F_NAVY);
      case 'au':
        return r(0, 0, 36, 36, C.F_NAVY) +
          ln(0, 0, 18, 18, C.F_WHITE, 3) + ln(18, 0, 0, 18, C.F_WHITE, 3) +
          r(7.5, 0, 3, 18, C.F_WHITE) + r(0, 7.5, 18, 3, C.F_WHITE) +
          r(8.4, 0, 1.2, 18, C.F_RED2) + r(0, 8.4, 18, 1.2, C.F_RED2) +
          ci(9, 27, 1.4, C.F_WHITE) + ci(27, 9, 0.9, C.F_WHITE) + ci(24.5, 24, 0.9, C.F_WHITE) +
          ci(30.5, 26.5, 0.9, C.F_WHITE) + ci(27, 31, 0.9, C.F_WHITE);
      case 'ir': {
        // پرچم ایران — شیر و خورشید (عین کانواس اندروید)
        let s = r(0, 0, 36, 12, C.F_GREEN) + r(0, 12, 36, 12, C.F_WHITE) + r(0, 24, 36, 12, C.F_RED2);
        const sx = 19.4, sy = 14.9, rs = 1.5, rIn = rs + 0.45, rOut = rs + 1.45;
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6;
          s += ln(
            (sx + Math.cos(a) * rIn).toFixed(2), (sy + Math.sin(a) * rIn).toFixed(2),
            (sx + Math.cos(a) * rOut).toFixed(2), (sy + Math.sin(a) * rOut).toFixed(2),
            C.F_GOLD, 0.55, 'round',
          );
        }
        s += ci(sx, sy, rs, C.F_GOLD);
        // دم با پوم‌پوم
        s += ln(22.2, 17.4, 23.8, 14.6, C.F_GOLD, 0.9, 'round') + ci(24, 14.3, 0.6, C.F_GOLD);
        // بدن + ران + پاها
        s += rr(13, 16.6, 9, 3.3, C.F_GOLD, 1.5) + ci(20.3, 17.4, 1.8, C.F_GOLD);
        s += r(14, 19.5, 1.05, 3.2, C.F_GOLD) + r(15.9, 19.5, 1.05, 3.2, C.F_GOLD);
        s += r(19.5, 19.5, 1.05, 3.2, C.F_GOLD) + r(21.3, 19.5, 1.05, 3.2, C.F_GOLD);
        // گردن
        s += r(13.2, 15.4, 2.6, 2.4, C.F_GOLD);
        // سر با یال تیره
        s += ci(13.5, 15, 2.15, C.F_DARK_GOLD) + ci(13.5, 15, 1.65, C.F_GOLD);
        s += ci(14.7, 13.2, 0.5, C.F_GOLD) + ci(11.95, 15.6, 0.75, C.F_GOLD);
        // پای جلو + شمشیر ایستاده
        s += ln(14.6, 17.6, 12.5, 16.95, C.F_GOLD, 1, 'round');
        s += r(11.75, 12.4, 0.7, 4, C.F_GOLD);   // تیغه
        s += r(10.9, 16.1, 2.4, 0.55, C.F_GOLD); // محافظ
        s += r(11.9, 16.65, 0.4, 1, C.F_GOLD);   // دسته
        s += ci(12.1, 17.75, 0.42, C.F_GOLD);    // گوی انتهایی
        s += ci(12.1, 16.85, 0.62, C.F_GOLD);    // پنجه
        return s;
      }
      case 'gift': {
        // پرچم طلایی هدیه — گرادیان + جعبهٔ کادو (defs در لایهٔ بیرونی ساخته می‌شود)
        return `<rect x="0" y="0" width="36" height="36" fill="url(#giftG)"/>` +
          `<rect x="0.7" y="0.7" width="34.6" height="34.6" fill="none" stroke="${C.GIFT_GOLD_EDGE}" stroke-opacity="0.55" stroke-width="1.4"/>` +
          ci(14.6, 9.6, 2.3, C.F_WHITE) + ci(21.4, 9.6, 2.3, C.F_WHITE) +
          ci(14.6, 9.6, 0.95, C.F_DARK_GOLD) + ci(21.4, 9.6, 0.95, C.F_DARK_GOLD) +
          rr(8, 11.8, 20, 5.4, C.F_WHITE, 1.4) + rr(10, 17.6, 16, 11.8, C.F_WHITE, 1.4) +
          r(16.5, 11.8, 3, 17.6, C.F_GOLD) + r(8, 13.9, 20, 1.8, C.F_GOLD);
      }
      default:
        return r(0, 0, 36, 36, C.BG);
    }
  }

  let uid = 0;

  /** SVG کامل پرچم گرد — کلاس flag + اندازهٔ دلخواه با استایل */
  function flagSvg(code, cls) {
    const id = `fc${++uid}`;
    const inner = body(code).replace(/url\(#giftG\)/g, `url(#${id}g)`);
    const defs = code === 'gift'
      ? `<defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0" stop-color="${C.GIFT_GOLD_LIGHT}"/><stop offset="1" stop-color="${C.GIFT_GOLD_DARK}"/>` +
        `</linearGradient></defs>`
      : '';
    return `<svg class="flag ${cls || ''}" viewBox="0 0 36 36" aria-hidden="true">` +
      `<defs><clipPath id="${id}"><circle cx="18" cy="18" r="18"/></clipPath></defs>` +
      `<g clip-path="url(#${id})">${code === 'gift' ? '' : `<rect width="36" height="36" fill="${C.BG}"/>`}${defs}${inner}</g>` +
      `<circle cx="18" cy="18" r="17.5" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1"/></svg>`;
  }

  window.MbFlags = { flagSvg, countryName, COUNTRIES };
})();
