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
};

const BODIES: Record<string, React.ReactNode> = {
  nl: (
    <>
      <rect width="36" height="12" fill="oklch(0.5 0.2 25)" />
      <rect y="12" width="36" height="12" fill="oklch(0.98 0 0)" />
      <rect y="24" width="36" height="12" fill="oklch(0.42 0.16 262)" />
    </>
  ),
  de: (
    <>
      <rect width="36" height="12" fill="oklch(0.18 0 0)" />
      <rect y="12" width="36" height="12" fill="oklch(0.55 0.22 27)" />
      <rect y="24" width="36" height="12" fill="oklch(0.84 0.17 85)" />
    </>
  ),
  fi: (
    <>
      <rect width="36" height="36" fill="oklch(0.98 0 0)" />
      <rect x="10" width="7" height="36" fill="oklch(0.42 0.16 258)" />
      <rect y="14.5" width="36" height="7" fill="oklch(0.42 0.16 258)" />
    </>
  ),
  gb: (
    <>
      <rect width="36" height="36" fill="oklch(0.35 0.13 265)" />
      <path d="M0 0L36 36M36 0L0 36" stroke="oklch(0.98 0 0)" strokeWidth="7" />
      <path d="M0 0L36 36M36 0L0 36" stroke="oklch(0.55 0.22 27)" strokeWidth="2.5" />
      <rect x="13" width="10" height="36" fill="oklch(0.98 0 0)" />
      <rect y="13" width="36" height="10" fill="oklch(0.98 0 0)" />
      <rect x="15" width="6" height="36" fill="oklch(0.55 0.22 27)" />
      <rect y="15" width="36" height="6" fill="oklch(0.55 0.22 27)" />
    </>
  ),
  tr: (
    <>
      <rect width="36" height="36" fill="oklch(0.55 0.22 27)" />
      <circle cx="15" cy="18" r="8" fill="oklch(0.98 0 0)" />
      <circle cx="17" cy="18" r="6.4" fill="oklch(0.55 0.22 27)" />
      <circle cx="24.5" cy="18" r="2.6" fill="oklch(0.98 0 0)" />
    </>
  ),
  us: (
    <>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} y={i * 5.14} width="36" height="2.57" fill="oklch(0.55 0.22 27)" />
      ))}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={"w" + i} y={i * 5.14 + 2.57} width="36" height="2.57" fill="oklch(0.98 0 0)" />
      ))}
      <rect width="17" height="18" fill="oklch(0.35 0.13 265)" />
    </>
  ),
  fr: (
    <>
      <rect width="12" height="36" fill="oklch(0.42 0.16 262)" />
      <rect x="12" width="12" height="36" fill="oklch(0.98 0 0)" />
      <rect x="24" width="12" height="36" fill="oklch(0.55 0.22 27)" />
    </>
  ),
  ae: (
    <>
      <rect width="36" height="12" fill="oklch(0.55 0.15 150)" />
      <rect y="12" width="36" height="12" fill="oklch(0.98 0 0)" />
      <rect y="24" width="36" height="12" fill="oklch(0.18 0 0)" />
      <rect width="10" height="36" fill="oklch(0.55 0.22 27)" />
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
