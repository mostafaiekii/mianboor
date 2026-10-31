"use client";

/*
 * ────────────────────────────────────────────────────────────────
 *  مین‌بور — پیشنهادهای لوگو با اقتباس از نشان تاریخی «شیر و خورشید»
 *  همهٔ طرح‌ها وکتور (SVG) و بدون هیچ حروفی هستند.
 * ────────────────────────────────────────────────────────────────
 */

const GOLD = "#E9B949";
const GOLD_DEEP = "#D99A26";
const GOLD_LIGHT = "#F6CE6B";
const DETAIL = "#8A5F12";
const BROWN = "#4A2E0A";
const INK = "#22301F";
const CREAM = "#F7F1E3";

type SvgProps = { size?: number };

/* ── کمکی‌ها ── */

/* گرد کردن برای جلوگیری از اختلاف اعشار سرور/کلاینت (hydration) */
const R = (x: number) => Math.round(x * 1000) / 1000;

const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [R(cx + r * Math.cos(a)), R(cy + r * Math.sin(a))];
};

/** پرتوهای خطی دور خورشید */
function LineRays({
  cx,
  cy,
  r1,
  r2,
  count,
  stroke,
  width,
  start = 0,
}: {
  cx: number;
  cy: number;
  r1: number;
  r2: number;
  count: number;
  stroke: string;
  width: number;
  start?: number;
}) {
  return (
    <g stroke={stroke} strokeWidth={width} strokeLinecap="round">
      {Array.from({ length: count }, (_, i) => {
        const a = start + (360 / count) * i;
        const [x1, y1] = polar(cx, cy, r1, a);
        const [x2, y2] = polar(cx, cy, r2, a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
    </g>
  );
}

/** پرتوهای مثلثی (شعله‌ای) دور خورشید */
function TriRays({
  cx,
  cy,
  r1,
  r2,
  count,
  fill,
  half = 6,
}: {
  cx: number;
  cy: number;
  r1: number;
  r2: number;
  count: number;
  fill: string;
  half?: number;
}) {
  return (
    <g fill={fill}>
      {Array.from({ length: count }, (_, i) => {
        const a = (360 / count) * i;
        const pt = (r: number, d: number) => {
          const t = ((a + d) * Math.PI) / 180;
          return `${R(cx + r * Math.cos(t)).toFixed(1)},${R(cy + r * Math.sin(t)).toFixed(1)}`;
        };
        return <polygon key={i} points={`${pt(r1, -half)} ${pt(r2, 0)} ${pt(r1, half)}`} />;
      })}
    </g>
  );
}

/** هالهٔ جداکننده دور سیلوئت (تا شیر از خورشیدِ پشتش تفکیک بشه) */
function Halo({ id, color, r = 6 }: { id: string; color: string; r?: number }) {
  return (
    <filter id={id} x="-30%" y="-30%" width="160%" height="160%">
      <feMorphology in="SourceAlpha" operator="dilate" radius={r} result="d" />
      <feFlood floodColor={color} result="f" />
      <feComposite in="f" in2="d" operator="in" result="h" />
      <feMerge>
        <feMergeNode in="h" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}

/** چهرهٔ آرام خورشید (چشمِ بسته) */
function SunFace({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g stroke={DETAIL} strokeWidth={5} fill="none" strokeLinecap="round">
      <path d={`M ${cx - 33} ${cy - 3} Q ${cx - 25} ${cy + 4} ${cx - 17} ${cy - 3}`} />
      <path d={`M ${cx + 17} ${cy - 3} Q ${cx + 25} ${cy + 4} ${cx + 33} ${cy - 3}`} />
      <path d={`M ${cx - 7} ${cy + 21} Q ${cx} ${cy + 27} ${cx + 7} ${cy + 21}`} />
    </g>
  );
}

/** شیرِ ایستاده رو به چپ — یالِ تیغه‌ای، دُمِ بالا، شمشیر جلوی سینه */
function LionParts({ fill, sword = false }: { fill: string; sword?: boolean }) {
  return (
    <g>
      {sword && (
        <g>
          {/* شمشیر — تیغه رو به بالا */}
          <line x1={138} y1={332} x2={94} y2={166} stroke={fill} strokeWidth={8.5} strokeLinecap="round" />
          <line x1={119} y1={311.3} x2={144.2} y2={304.7} stroke={fill} strokeWidth={8} strokeLinecap="round" />
          <circle cx={140} cy={340} r={7} fill={fill} />
          {/* پنجهٔ برافراشته روی دسته */}
          <line x1={198} y1={314} x2={150} y2={336} stroke={fill} strokeWidth={13} strokeLinecap="round" />
          <circle cx={147} cy={338} r={8} fill={fill} />
        </g>
      )}
      {/* دُم بالا */}
      <path
        d="M 318 300 C 346 288 356 264 346 242 C 343 234 338 229 332 226"
        fill="none"
        stroke={fill}
        strokeWidth={12}
        strokeLinecap="round"
      />
      <circle cx={331} cy={226} r={9} fill={fill} />
      {/* بدن */}
      <ellipse cx={252} cy={334} rx={76} ry={42} fill={fill} />
      <circle cx={198} cy={290} r={42} fill={fill} />
      <circle cx={308} cy={326} r={44} fill={fill} />
      {/* پاها */}
      <rect x={200} y={340} width={15} height={66} rx={7} fill={fill} />
      <rect x={226} y={344} width={15} height={62} rx={7} fill={fill} />
      <rect x={280} y={344} width={16} height={62} rx={7} fill={fill} />
      <rect x={304} y={338} width={16} height={68} rx={7} fill={fill} />
      <rect x={192} y={400} width={26} height={11} rx={5} fill={fill} />
      <rect x={218} y={402} width={25} height={11} rx={5} fill={fill} />
      <rect x={273} y={402} width={27} height={11} rx={5} fill={fill} />
      <rect x={300} y={398} width={27} height={11} rx={5} fill={fill} />
      {/* یالِ تیغه‌ای + سر */}
      <TriRays cx={170} cy={210} r1={30} r2={52} count={13} half={7.5} fill={fill} />
      <circle cx={170} cy={210} r={40} fill={fill} />
      <circle cx={178} cy={216} r={30} fill={fill} />
      <ellipse cx={148} cy={228} rx={15} ry={12} fill={fill} />
    </g>
  );
}

/** سرِ شیر روبرو — یالِ تیغه‌ای مثل خورشید */
function LionFace({ cx, cy, r, light = GOLD_LIGHT }: { cx: number; cy: number; r: number; light?: string }) {
  const eye = R(r * 0.26);
  return (
    <g>
      <TriRays cx={cx} cy={cy} r1={R(r * 0.93)} r2={R(r * 1.34)} count={16} half={6.5} fill={GOLD} />
      <circle cx={cx} cy={cy} r={R(r * 0.93)} fill={GOLD_DEEP} />
      {/* گوش‌ها */}
      <circle cx={R(cx - r * 0.52)} cy={R(cy - r * 0.6)} r={R(r * 0.2)} fill={light} />
      <circle cx={R(cx - r * 0.52)} cy={R(cy - r * 0.6)} r={R(r * 0.09)} fill={DETAIL} />
      <circle cx={R(cx + r * 0.52)} cy={R(cy - r * 0.6)} r={R(r * 0.2)} fill={light} />
      <circle cx={R(cx + r * 0.52)} cy={R(cy - r * 0.6)} r={R(r * 0.09)} fill={DETAIL} />
      {/* صورت */}
      <circle cx={cx} cy={cy} r={R(r * 0.66)} fill={light} />
      <ellipse
        cx={R(cx - eye)}
        cy={R(cy - r * 0.1)}
        rx={R(r * 0.11)}
        ry={R(r * 0.145)}
        fill={BROWN}
        transform={`rotate(8 ${R(cx - eye)} ${R(cy - r * 0.1)})`}
      />
      <ellipse
        cx={R(cx + eye)}
        cy={R(cy - r * 0.1)}
        rx={R(r * 0.11)}
        ry={R(r * 0.145)}
        fill={BROWN}
        transform={`rotate(-8 ${R(cx + eye)} ${R(cy - r * 0.1)})`}
      />
      <circle cx={R(cx - eye + r * 0.04)} cy={R(cy - r * 0.16)} r={R(r * 0.035)} fill="#FFFFFF" opacity="0.85" />
      <circle cx={R(cx + eye + r * 0.04)} cy={R(cy - r * 0.16)} r={R(r * 0.035)} fill="#FFFFFF" opacity="0.85" />
      {/* بینی */}
      <path
        d={`M ${cx - r * 0.2} ${cy + r * 0.2} L ${cx + r * 0.2} ${cy + r * 0.2}
            Q ${cx + r * 0.235} ${cy + r * 0.2} ${cx + r * 0.215} ${cy + r * 0.265}
            L ${cx + r * 0.085} ${cy + r * 0.43} Q ${cx} ${cy + r * 0.49} ${cx - r * 0.085} ${cy + r * 0.43}
            L ${cx - r * 0.215} ${cy + r * 0.265} Q ${cx - r * 0.235} ${cy + r * 0.2} ${cx - r * 0.2} ${cy + r * 0.2} Z`}
        fill={BROWN}
      />
      <line x1={cx} y1={R(cy + r * 0.47)} x2={cx} y2={R(cy + r * 0.6)} stroke={BROWN} strokeWidth={R(r * 0.05)} strokeLinecap="round" />
      <path
        d={`M ${cx} ${cy + r * 0.6} Q ${cx - r * 0.17} ${cy + r * 0.67} ${cx - r * 0.23} ${cy + r * 0.52}`}
        fill="none"
        stroke={BROWN}
        strokeWidth={r * 0.05}
        strokeLinecap="round"
      />
      <path
        d={`M ${cx} ${cy + r * 0.6} Q ${cx + r * 0.17} ${cy + r * 0.67} ${cx + r * 0.23} ${cy + r * 0.52}`}
        fill="none"
        stroke={BROWN}
        strokeWidth={r * 0.05}
        strokeLinecap="round"
      />
      {/* سبیل‌نماهای نقطه‌ای */}
      {(
        [
          [-0.5, 0.24],
          [-0.42, 0.36],
          [-0.33, 0.47],
          [0.5, 0.24],
          [0.42, 0.36],
          [0.33, 0.47],
        ] as const
      ).map(([dx, dy], i) => (
        <circle key={i} cx={R(cx + dx * r)} cy={R(cy + dy * r)} r={R(r * 0.024)} fill={DETAIL} opacity="0.65" />
      ))}
    </g>
  );
}

/* ────────────────────────────────────────────────
   ۱) نشان کلاسیک — شیرِ شمشیربه‌دست زیر خورشیدِ خندان
   ──────────────────────────────────────────────── */
export function LogoClassic({ size = 512 }: SvgProps) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} role="img" aria-label="نشان کلاسیک شیر و خورشید">
      <defs>
        <linearGradient id="l1bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#173122" />
          <stop offset="1" stopColor="#0A1710" />
        </linearGradient>
        <radialGradient id="l1sun" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#FCE9A8" />
          <stop offset="1" stopColor="#E9A81F" />
        </radialGradient>
        <Halo id="l1h" color="#0D1D13" r={6} />
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#l1bg)" />
      {/* پرتوهای خورشید — یک‌درمیان صاف و شعله‌ای */}
      <g transform="translate(285 168)">
        {Array.from({ length: 16 }, (_, i) =>
          i % 2 === 0 ? (
            <path key={i} transform={`rotate(${i * 22.5})`} d="M -7.5 -52 L 0 -100 L 7.5 -52 Z" fill={GOLD} />
          ) : (
            <path
              key={i}
              transform={`rotate(${i * 22.5})`}
              d="M -8 -52 C -12 -73 -8 -88 0 -103 C 8 -88 12 -73 8 -52 Z"
              fill={GOLD}
            />
          )
        )}
      </g>
      <circle cx="285" cy="168" r="60" fill="url(#l1sun)" />
      <SunFace cx={285} cy={168} />
      {/* خط زمین */}
      <line x1="96" y1="410" x2="400" y2="410" stroke={GOLD} strokeWidth="6" strokeLinecap="round" opacity="0.4" />
      {/* شیرِ شمشیربه‌دست */}
      <g filter="url(#l1h)">
        <LionParts fill={GOLD} sword />
      </g>
      <circle cx="180" cy="206" r="5" fill="#0D1D13" />
    </svg>
  );
}

/* ────────────────────────────────────────────────
   ۲) خورشیدشیر — چهرهٔ شیر که یالش پرتوهای خورشیده
   ──────────────────────────────────────────────── */
export function LogoSunmane({ size = 512 }: SvgProps) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} role="img" aria-label="خورشیدشیر">
      <defs>
        <linearGradient id="l2bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#221A10" />
          <stop offset="1" stopColor="#120D07" />
        </linearGradient>
        <radialGradient id="l2face" cx="0.5" cy="0.4" r="0.75">
          <stop offset="0" stopColor="#FCE9A8" />
          <stop offset="1" stopColor="#EFBD3D" />
        </radialGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#l2bg)" />
      <LionFace cx={256} cy={266} r={100} light="url(#l2face)" />
    </svg>
  );
}

/* ────────────────────────────────────────────────
   ۳) نشان سه‌رنگ — مدال دایره‌ای با حلقهٔ پرچم
   ──────────────────────────────────────────────── */
export function LogoBadge({ size = 512 }: SvgProps) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} role="img" aria-label="نشان سه‌رنگ شیر و خورشید">
      <defs>
        <radialGradient id="l3bg" cx="0.5" cy="0.42" r="0.75">
          <stop offset="0" stopColor="#1B3A26" />
          <stop offset="1" stopColor="#0C1B12" />
        </radialGradient>
        <radialGradient id="l3sun" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#FCE9A8" />
          <stop offset="1" stopColor="#E9A81F" />
        </radialGradient>
        <Halo id="l3h" color="#0F2318" r={5} />
      </defs>
      <rect width="512" height="512" rx="112" fill="#0F1216" />
      {/* حلقهٔ سه‌رنگ: سبز / سرخ / سفیدِ عاجی */}
      <g fill="none" strokeWidth="26">
        <path d="M 18 256 A 238 238 0 0 1 375 50" stroke="#1F7A45" />
        <path d="M 375 50 A 238 238 0 0 1 494 256" stroke="#C8102E" />
        <path d="M 494 256 A 238 238 0 0 1 18 256" stroke="#F3EFE4" />
      </g>
      <circle cx="18" cy="256" r="7" fill={GOLD} />
      <circle cx="494" cy="256" r="7" fill={GOLD} />
      <circle cx="375" cy="50" r="7" fill={GOLD} />
      <circle cx="256" cy="256" r="196" fill="url(#l3bg)" />
      <circle cx="256" cy="256" r="168" fill="none" stroke={GOLD} strokeWidth="3" opacity="0.5" />
      {/* خورشید پشت سر شیر */}
      <TriRays cx={256} cy={238} r1={48} r2={78} count={12} half={7} fill={GOLD} />
      <circle cx="256" cy="238" r="52" fill="url(#l3sun)" />
      <g transform="translate(116.5 127.6) scale(0.62)">
        <g filter="url(#l3h)">
          <LionParts fill={GOLD} sword />
        </g>
      </g>
      <circle cx="228.1" cy="255.3" r="3" fill="#0F2318" />
      <line x1="150" y1="383" x2="362" y2="383" stroke={GOLD} strokeWidth="4" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

/* ────────────────────────────────────────────────
   ۴) طلوع شیر — سیلوئت مینیمال روی زمینهٔ روشن
   ──────────────────────────────────────────────── */
export function LogoRise({ size = 512 }: SvgProps) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} role="img" aria-label="طلوع شیر و خورشید">
      <defs>
        <Halo id="l4h" color={CREAM} r={7} />
      </defs>
      <rect width="512" height="512" rx="112" fill={CREAM} />
      <LineRays cx={256} cy={352} r1={92} r2={138} count={11} stroke={INK} width={7} start={195} />
      <path d="M 178 352 A 78 78 0 0 1 334 352 Z" fill={INK} />
      <line x1="96" y1="352" x2="416" y2="352" stroke={INK} strokeWidth="8" strokeLinecap="round" />
      <g transform="translate(125.7 126) scale(0.55)">
        <g filter="url(#l4h)">
          <LionParts fill={INK} />
        </g>
      </g>
      <circle cx="224.7" cy="239.3" r="3.4" fill={CREAM} />
    </svg>
  );
}

/* ────────────────────────────────────────────────
   ۵) سپر شیر و خورشید — حس امنیت و محافظت
   ──────────────────────────────────────────────── */
const SHIELD =
  "M 256 52 C 302 78 358 94 414 97 L 414 264 C 414 372 348 438 256 464 C 164 438 98 372 98 264 L 98 97 C 154 94 210 78 256 52 Z";

export function LogoShield({ size = 512 }: SvgProps) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} role="img" aria-label="سپر شیر و خورشید">
      <defs>
        <clipPath id="l5c">
          <path d={SHIELD} />
        </clipPath>
        <radialGradient id="l5sun" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#FCE9A8" />
          <stop offset="1" stopColor="#E9A81F" />
        </radialGradient>
        <radialGradient id="l5face" cx="0.5" cy="0.4" r="0.75">
          <stop offset="0" stopColor="#FCE9A8" />
          <stop offset="1" stopColor="#EFBD3D" />
        </radialGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="#0F1216" />
      <g clipPath="url(#l5c)">
        <rect x="98" y="52" width="316" height="200" fill="#16402A" />
        <rect x="98" y="252" width="316" height="14" fill="#EFE8D5" />
        <rect x="98" y="266" width="316" height="198" fill="#5E1420" />
        <TriRays cx={256} cy={152} r1={30} r2={68} count={12} half={7} fill={GOLD} />
        <circle cx="256" cy="152" r="34" fill="url(#l5sun)" />
      </g>
      <LionFace cx={256} cy={348} r={58} light="url(#l5face)" />
      <path d={SHIELD} fill="none" stroke="#EFE8D5" strokeWidth="14" strokeLinejoin="round" />
    </svg>
  );
}

/* ────────────────────────────────────────────────
   ۶) شیر خوابیده — اقتباس از نقش‌برجسته‌های تخت‌جمشید
   ──────────────────────────────────────────────── */
export function LogoCouchant({ size = 512 }: SvgProps) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} role="img" aria-label="شیر خوابیده و خورشید">
      <defs>
        <linearGradient id="l6bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1B212B" />
          <stop offset="1" stopColor="#0E1116" />
        </linearGradient>
        <radialGradient id="l6sun" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#FCE9A8" />
          <stop offset="1" stopColor="#E9A81F" />
        </radialGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#l6bg)" />
      {/* خورشید بالای پشت شیر */}
      <LineRays cx={300} cy={170} r1={56} r2={86} count={12} stroke={GOLD} width={6.5} />
      <circle cx="300" cy="170" r="44" fill="url(#l6sun)" />
      <line x1="96" y1="402" x2="410" y2="402" stroke={GOLD} strokeWidth="6" strokeLinecap="round" opacity="0.35" />
      <g fill={GOLD}>
        {/* دُم رو زمین */}
        <path d="M 382 352 C 406 364 402 390 372 394" fill="none" stroke={GOLD} strokeWidth={12} strokeLinecap="round" />
        <circle cx="370" cy="394" r="9" />
        {/* بدنِ خوابیده — سینهٔ قوی و بدنِ کوتاه */}
        <circle cx="338" cy="346" r="50" />
        <ellipse cx="272" cy="352" rx="72" ry="38" />
        <circle cx="200" cy="338" r="46" />
        {/* پنجه‌های کشیده رو جلو */}
        <rect x="114" y="366" width="90" height="18" rx="9" />
        <rect x="126" y="386" width="72" height="14" rx="7" />
        {/* یالِ تیغه‌ای و سرِ برافراشته */}
        <TriRays cx={152} cy={262} r1={34} r2={56} count={13} half={7.5} fill={GOLD} />
        <circle cx="152" cy="262" r="44" />
        <circle cx="146" cy="266" r="36" />
        <ellipse cx="110" cy="274" rx="17" ry="12" />
      </g>
      <circle cx="132" cy="256" r="5" fill="#0E1116" />
    </svg>
  );
}

/* ────────────────────────────────────────────────
   گالری انتخاب
   ──────────────────────────────────────────────── */

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const faNum = (n: number) => String(n).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

type LogoItem = {
  id: number;
  name: string;
  tag: string;
  desc: string;
  Comp: ComponentType<SvgProps>;
};

const LOGOS: LogoItem[] = [
  {
    id: 1,
    name: "نشان کلاسیک",
    tag: "اصیل و تاریخی",
    desc: "شیرِ شمشیربه‌دست زیر خورشیدِ خندان — اقتباس مستقیم از نشان تاریخی شیر و خورشید با طلای سلطنتی روی سبزِ تیره.",
    Comp: LogoClassic,
  },
  {
    id: 2,
    name: "خورشیدشیر",
    tag: "مدرن و مینیمال",
    desc: "چهرهٔ شیر که یالش شده پرتوهای خورشید — ترکیبِ شیر و خورشید در یک نشانِ واحد؛ خوانا در همهٔ سایزها.",
    Comp: LogoSunmane,
  },
  {
    id: 3,
    name: "نشان سه‌رنگ",
    tag: "رسمی و مدالی",
    desc: "مدالِ دایره‌ای با حلقهٔ سه‌رنگِ پرچم (سبز، عاجی، سرخ) و شیر و خورشیدِ طلایی در مرکز — حسِ نشانِ رسمی.",
    Comp: LogoBadge,
  },
  {
    id: 4,
    name: "طلوع شیر",
    tag: "آرام و روشن",
    desc: "سایه‌نمای شیر بر خطِ افق و خورشیدِ طلوع — تک‌رنگ و مینیمال روی زمینهٔ کرم؛ حسِ پوسترهای هنری.",
    Comp: LogoRise,
  },
  {
    id: 5,
    name: "سپر شیر و خورشید",
    tag: "امنیت و محافظت",
    desc: "سپرِ سبز-سرخ با نوارِ عاجی، خورشیدِ تابان و سرِ شیر — حسِ محافظت و امنیت؛ فرمِ آشنا برای یک VPN.",
    Comp: LogoShield,
  },
  {
    id: 6,
    name: "شیر خوابیده",
    tag: "تخت‌جمشیدی",
    desc: "شیرِ آرامِ خوابیده با سرِ برافراشته و خورشیدِ تابان بالای پشتش — اقتباس از نقش‌برجسته‌ها و مُهرهای هخامنشی.",
    Comp: LogoCouchant,
  },
];

function SizeRow({ Comp }: { Comp: ComponentType<SvgProps> }) {
  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-end justify-center gap-5">
        {[96, 64, 48].map((s) => (
          <div key={s} className="flex flex-col items-center gap-1.5">
            <Comp size={s} />
            <span className="text-[10px] text-neutral-500" dir="ltr">
              {s}px
            </span>
          </div>
        ))}
        <div className="flex flex-col items-center gap-1.5">
          <span className="inline-block rounded-xl p-1.5" style={{ background: "#F3EFE4" }}>
            <Comp size={44} />
          </span>
          <span className="text-[10px] text-neutral-500">زمینهٔ روشن</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="inline-block rounded-xl bg-black/50 p-1.5">
            <Comp size={44} />
          </span>
          <span className="text-[10px] text-neutral-500">زمینهٔ تیره</span>
        </div>
      </div>
    </div>
  );
}

export function LogoGallery() {
  return (
    <div dir="rtl" className="flex min-h-screen flex-col bg-[#0B0D10] text-neutral-100">
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:py-14">
        <header className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E9B949]/30 bg-[#E9B949]/10 px-4 py-1.5 text-xs font-medium text-[#E9B949]">
            مین‌بور — انتخاب آیکون جدید
          </span>
          <h1 className="mt-5 text-3xl font-bold sm:text-4xl">
            لوگوی <span className="text-[#E9B949]">شیر و خورشید</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-neutral-400 sm:text-base">
            شش نمونه با اقتباس از نشان تاریخی شیر و خورشید — بدون هیچ حرفی، فقط نشانِ خودمان.
            هر کدوم رو که پسندیدی بگو تا همون رو به‌عنوان آیکون رسمی اپ ست کنم.
          </p>
        </header>

        {/* نوار مقایسهٔ سریع */}
        <div className="mt-9 rounded-3xl border border-white/10 bg-[#11141A] p-4 sm:p-5">
          <p className="mb-3 text-center text-xs text-neutral-500">مقایسهٔ سریع در سایز لانچر</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {LOGOS.map(({ id, Comp }) => (
              <div key={id} className="flex flex-col items-center gap-1">
                <Comp size={56} />
                <span className="text-[11px] text-neutral-400">{faNum(id)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* کارت‌ها */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {LOGOS.map(({ id, name, tag, desc, Comp }) => (
            <article key={id} className="rounded-3xl border border-white/10 bg-[#12151A] p-5 sm:p-6">
              <header className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-[#E9B949]/40 bg-[#E9B949]/10 text-sm font-bold text-[#E9B949]">
                  {faNum(id)}
                </span>
                <div>
                  <h2 className="text-lg font-bold leading-6">{name}</h2>
                  <p className="mt-0.5 text-xs font-medium text-[#E9B949]/80">{tag}</p>
                  <p className="mt-2 text-xs leading-6 text-neutral-400 sm:text-[13px]">{desc}</p>
                </div>
              </header>
              <div className="mt-5 flex justify-center rounded-2xl border border-white/5 bg-[#0C0E12] p-6">
                <Comp size={216} />
              </div>
              <SizeRow Comp={Comp} />
            </article>
          ))}
        </div>

        <p className="mt-8 rounded-2xl border border-[#E9B949]/20 bg-[#E9B949]/5 px-5 py-4 text-center text-sm leading-7 text-neutral-300">
          ✔ هیچ‌کدوم حرف M یا هیچ حرف دیگه‌ای نداره — شماره‌اش رو بگو (مثلاً «۳») تا همون رو بسازم و جای آیکون اپ بذارم.
        </p>
      </main>

      <footer className="mt-auto border-t border-white/5 py-6 text-center text-xs text-neutral-600">
        پیش‌نمایش انتخاب لوگو — صفحهٔ دموی اپ بعد از انتخاب برمی‌گرده
      </footer>
    </div>
  );
}
