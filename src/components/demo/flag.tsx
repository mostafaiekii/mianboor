/** Circular country flags drawn as inline SVG — no network requests. */

export const COUNTRIES: Record<string, string> = {
  nl: "Netherlands",
  de: "Germany",
  fi: "Finland",
  gb: "United Kingdom",
  tr: "Turkey",
  us: "USA",
  fr: "France",
  ae: "UAE",
  se: "Sweden",
  ch: "Switzerland",
  ca: "Canada",
  sg: "Singapore",
  jp: "Japan",
  it: "Italy",
  es: "Spain",
  ru: "Russia",
  in: "India",
  au: "Australia",
  ir: "Iran",
};

/* Shared palette */
const GREEN = "#05893E";
const RED = "#D40C1A";
const WHITE = "#F8F8F8";
const BLUE = "#1545A2";
const NAVY = "#18337D";
const BLACK = "#121212";
const YELLOW = "#FDC010";
const GOLD = "#E3A008";
const DARK_GOLD = "#B07C08";

/* Lion & Sun emblem (Shiro-Khorshid) — stylized golden mark for the Iranian flag */
function LionSun() {
  const rays: [number, number, number, number][] = [
    [21.4, 13.5, 23.1, 13.5],
    [20.4, 15.9, 21.61, 17.11],
    [18, 16.9, 18, 18.6],
    [15.6, 15.9, 14.39, 17.11],
    [14.6, 13.5, 12.9, 13.5],
    [15.6, 11.1, 14.39, 9.89],
    [18, 10.1, 18, 8.4],
    [20.4, 11.1, 21.61, 9.89],
  ];
  return (
    <>
      {/* sun with rays */}
      <circle cx="18" cy="13.5" r="2.6" fill={GOLD} />
      {rays.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={GOLD} strokeWidth="0.9" strokeLinecap="round" />
      ))}
      {/* lion silhouette */}
      <circle cx="21.2" cy="17.3" r="2" fill={DARK_GOLD} />
      <circle cx="21.4" cy="17.2" r="1.4" fill={GOLD} />
      <rect x="14.6" y="18.2" width="6.6" height="2.9" rx="1.4" fill={GOLD} />
      <rect x="19.6" y="21" width="1" height="3.1" fill={GOLD} />
      <rect x="21.2" y="21" width="1" height="3.1" fill={GOLD} />
      <rect x="14.8" y="21" width="1" height="3.1" fill={GOLD} />
      <rect x="16.4" y="21" width="1" height="3.1" fill={GOLD} />
      <line x1="14.7" y1="19.2" x2="12.9" y2="16.9" stroke={GOLD} strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="12.9" cy="16.9" r="0.55" fill={GOLD} />
      {/* sword */}
      <rect x="23" y="14.6" width="0.8" height="9.5" fill={GOLD} />
      <circle cx="23.4" cy="14.2" r="0.7" fill={GOLD} />
    </>
  );
}

const BODIES: Record<string, React.ReactNode> = {
  nl: (
    <>
      <rect width="36" height="12" fill={RED} />
      <rect y="12" width="36" height="12" fill={WHITE} />
      <rect y="24" width="36" height="12" fill={BLUE} />
    </>
  ),
  de: (
    <>
      <rect width="36" height="12" fill={BLACK} />
      <rect y="12" width="36" height="12" fill="#DD7C08" />
      <rect y="24" width="36" height="12" fill={YELLOW} />
    </>
  ),
  fi: (
    <>
      <rect width="36" height="36" fill={WHITE} />
      <rect x="10" width="7" height="36" fill={BLUE} />
      <rect y="14.5" width="36" height="7" fill={BLUE} />
    </>
  ),
  gb: (
    <>
      <rect width="36" height="36" fill={NAVY} />
      <path d="M0 0L36 36M36 0L0 36" stroke={WHITE} strokeWidth="7" />
      <path d="M0 0L36 36M36 0L0 36" stroke="#DD7C08" strokeWidth="2.5" />
      <rect x="13" width="10" height="36" fill={WHITE} />
      <rect y="13" width="36" height="10" fill={WHITE} />
      <rect x="15" width="6" height="36" fill="#DD7C08" />
      <rect y="15" width="36" height="6" fill="#DD7C08" />
    </>
  ),
  tr: (
    <>
      <rect width="36" height="36" fill="#D40C1A" />
      <circle cx="15" cy="18" r="8" fill={WHITE} />
      <circle cx="17" cy="18" r="6.4" fill="#D40C1A" />
      <circle cx="24.5" cy="18" r="2.6" fill={WHITE} />
    </>
  ),
  us: (
    <>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} y={i * 5.14} width="36" height="2.57" fill="#C8102E" />
      ))}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={"w" + i} y={i * 5.14 + 2.57} width="36" height="2.57" fill={WHITE} />
      ))}
      <rect width="17" height="18" fill={NAVY} />
    </>
  ),
  fr: (
    <>
      <rect width="12" height="36" fill={BLUE} />
      <rect x="12" width="12" height="36" fill={WHITE} />
      <rect x="24" width="12" height="36" fill={RED} />
    </>
  ),
  ae: (
    <>
      <rect width="36" height="12" fill={GREEN} />
      <rect y="12" width="36" height="12" fill={WHITE} />
      <rect y="24" width="36" height="12" fill={BLACK} />
      <rect width="10" height="36" fill={RED} />
    </>
  ),
  se: (
    <>
      <rect width="36" height="36" fill="#0B5C9E" />
      <rect x="12" width="5" height="36" fill={YELLOW} />
      <rect y="15.5" width="36" height="5" fill={YELLOW} />
    </>
  ),
  ch: (
    <>
      <rect width="36" height="36" fill="#D52B1E" />
      <rect x="15.5" y="8" width="5" height="20" fill={WHITE} />
      <rect x="8" y="15.5" width="20" height="5" fill={WHITE} />
    </>
  ),
  ca: (
    <>
      <rect width="36" height="36" fill={WHITE} />
      <rect width="9" height="36" fill="#D80621" />
      <rect x="27" width="9" height="36" fill="#D80621" />
      <path
        d="M18 12.5 L19.6 15.4 L22.4 14.2 L21.4 17.2 L24.2 18.6 L21.4 20.2 L22.2 23 L18 21.6 L13.8 23 L14.6 20.2 L11.8 18.6 L14.6 17.2 L13.6 14.2 L16.4 15.4 Z"
        fill="#D80621"
      />
      <rect x="17.6" y="21.6" width="0.8" height="2" fill="#D80621" />
    </>
  ),
  sg: (
    <>
      <rect width="36" height="18" fill="#ED2939" />
      <rect y="18" width="36" height="18" fill={WHITE} />
      <circle cx="8.5" cy="9" r="4.2" fill={WHITE} />
      <circle cx="10.3" cy="9" r="3.5" fill="#ED2939" />
      {[
        [14.5, 6.6],
        [16.6, 8.2],
        [15.8, 10.6],
        [13.2, 10.6],
        [12.4, 8.2],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.7" fill={WHITE} />
      ))}
    </>
  ),
  jp: (
    <>
      <rect width="36" height="36" fill={WHITE} />
      <circle cx="18" cy="18" r="7.2" fill="#D30000" />
    </>
  ),
  it: (
    <>
      <rect width="12" height="36" fill={GREEN} />
      <rect x="12" width="12" height="36" fill={WHITE} />
      <rect x="24" width="12" height="36" fill={RED} />
    </>
  ),
  es: (
    <>
      <rect width="36" height="9" fill="#C60B1E" />
      <rect y="9" width="36" height="18" fill="#FFC400" />
      <rect y="27" width="36" height="9" fill="#C60B1E" />
    </>
  ),
  ru: (
    <>
      <rect width="36" height="12" fill={WHITE} />
      <rect y="12" width="36" height="12" fill={BLUE} />
      <rect y="24" width="36" height="12" fill={RED} />
    </>
  ),
  in: (
    <>
      <rect width="36" height="12" fill="#FF9933" />
      <rect y="12" width="36" height="12" fill={WHITE} />
      <rect y="24" width="36" height="12" fill="#138808" />
      <circle cx="18" cy="18" r="4.2" fill={NAVY} />
      <circle cx="18" cy="18" r="3" fill={WHITE} />
      <circle cx="18" cy="18" r="1" fill={NAVY} />
    </>
  ),
  au: (
    <>
      <rect width="36" height="36" fill={NAVY} />
      <line x1="0" y1="0" x2="18" y2="18" stroke={WHITE} strokeWidth="3" />
      <line x1="18" y1="0" x2="0" y2="18" stroke={WHITE} strokeWidth="3" />
      <rect x="7.5" width="3" height="18" fill={WHITE} />
      <rect y="7.5" width="18" height="3" fill={WHITE} />
      <rect x="8.4" width="1.2" height="18" fill={RED} />
      <rect y="8.4" width="18" height="1.2" fill={RED} />
      <circle cx="9" cy="27" r="1.4" fill={WHITE} />
      <circle cx="27" cy="9" r="0.9" fill={WHITE} />
      <circle cx="24.5" cy="24" r="0.9" fill={WHITE} />
      <circle cx="30.5" cy="26.5" r="0.9" fill={WHITE} />
      <circle cx="27" cy="31" r="0.9" fill={WHITE} />
    </>
  ),
  ir: (
    <>
      <rect width="36" height="12" fill={GREEN} />
      <rect y="12" width="36" height="12" fill={WHITE} />
      <rect y="24" width="36" height="12" fill={RED} />
      <LionSun />
    </>
  ),
};

export function Flag({ code, size = 36 }: { code: string; size?: number }) {
  const body = BODIES[code];
  return (
    <svg
      viewBox="0 0 36 36"
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full ring-1 ring-ink/15"
      aria-hidden="true"
    >
      <clipPath id={`flag-clip-${code}`}>
        <circle cx="18" cy="18" r="18" />
      </clipPath>
      <g clipPath={`url(#flag-clip-${code})`}>{body}</g>
    </svg>
  );
}
