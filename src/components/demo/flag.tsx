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

/* ------------------------------------------------------------------ */
/* Lion & Sun (Shiro-Khorshid) — proper emblem for the Iranian flag:   */
/* golden lion facing the hoist, sword upright in the forepaw,         */
/* radiant sun rising behind the back. All inside the white band.      */
/* ------------------------------------------------------------------ */
function LionSun() {
  const cx = 19.4, cy = 14.9, rSun = 1.5;
  const rays: React.ReactNode[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    rays.push(
      <line
        key={i}
        x1={cx + Math.cos(a) * (rSun + 0.45)}
        y1={cy + Math.sin(a) * (rSun + 0.45)}
        x2={cx + Math.cos(a) * (rSun + 1.45)}
        y2={cy + Math.sin(a) * (rSun + 1.45)}
        stroke={GOLD}
        strokeWidth="0.55"
        strokeLinecap="round"
      />,
    );
  }
  return (
    <>
      {/* sun rising behind the lion's back */}
      {rays}
      <circle cx={cx} cy={cy} r={rSun} fill={GOLD} />
      {/* tail with tuft */}
      <line x1="22.2" y1="17.4" x2="23.8" y2="14.6" stroke={GOLD} strokeWidth="0.9" strokeLinecap="round" />
      <circle cx="24" cy="14.3" r="0.6" fill={GOLD} />
      {/* body + haunch + legs */}
      <rect x="13" y="16.6" width="9" height="3.3" rx="1.5" fill={GOLD} />
      <circle cx="20.3" cy="17.4" r="1.8" fill={GOLD} />
      <rect x="14" y="19.5" width="1.05" height="3.2" fill={GOLD} />
      <rect x="15.9" y="19.5" width="1.05" height="3.2" fill={GOLD} />
      <rect x="19.5" y="19.5" width="1.05" height="3.2" fill={GOLD} />
      <rect x="21.3" y="19.5" width="1.05" height="3.2" fill={GOLD} />
      {/* neck bridges head and body */}
      <rect x="13.2" y="15.4" width="2.6" height="2.4" fill={GOLD} />
      {/* head with dark mane */}
      <circle cx="13.5" cy="15" r="2.15" fill={DARK_GOLD} />
      <circle cx="13.5" cy="15" r="1.65" fill={GOLD} />
      <circle cx="14.7" cy="13.2" r="0.5" fill={GOLD} />
      <circle cx="11.95" cy="15.6" r="0.75" fill={GOLD} />
      {/* raised foreleg gripping the sword */}
      <line x1="14.6" y1="17.6" x2="12.5" y2="16.95" stroke={GOLD} strokeWidth="1" strokeLinecap="round" />
      <rect x="11.75" y="12.4" width="0.7" height="4" fill={GOLD} />
      <rect x="10.9" y="16.1" width="2.4" height="0.55" fill={GOLD} />
      <rect x="11.9" y="16.65" width="0.4" height="1" fill={GOLD} />
      <circle cx="12.1" cy="17.75" r="0.42" fill={GOLD} />
      <circle cx="12.1" cy="16.85" r="0.62" fill={GOLD} />
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
      <rect y="12" width="36" height="12" fill="#DD0000" />
      <rect y="24" width="36" height="12" fill="#FFCC00" />
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
      {/* Union Jack — proper geometry: St Andrew white diagonals, counterchanged
          St Patrick red diagonals, St George white-fimbriated red cross on top */}
      <rect width="36" height="36" fill="#012169" />
      <path d="M0 0L36 36M36 0L0 36" stroke={WHITE} strokeWidth="7" />
      <path d="M-1.56 1.56L16.44 19.56" stroke="#C8102E" strokeWidth="2.6" />
      <path d="M19.56 16.44L37.56 34.44" stroke="#C8102E" strokeWidth="2.6" />
      <path d="M19.56 19.56L1.56 37.56" stroke="#C8102E" strokeWidth="2.6" />
      <path d="M16.44 16.44L34.44 -1.56" stroke="#C8102E" strokeWidth="2.6" />
      <rect x="12" width="12" height="36" fill={WHITE} />
      <rect y="12" width="36" height="12" fill={WHITE} />
      <rect x="14.4" width="7.2" height="36" fill="#C8102E" />
      <rect y="14.4" width="36" height="7.2" fill="#C8102E" />
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
