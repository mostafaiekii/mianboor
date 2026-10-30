/** Soft themes for the Mianboor demo — applied as CSS-variable overrides on the phone frame. */

export type ThemeName = "midnight" | "forest" | "rose" | "slate" | "sand";

export interface ThemeDef {
  name: { en: string; fa: string };
  light?: boolean;
  /** CSS custom properties overriding the demo palette for this theme. */
  vars: Record<string, string>;
}

const shared = {
  "--mb-gold": "oklch(0.84 0.15 85)",
  "--mb-danger": "oklch(0.7 0.19 22)",
  "--mb-up": "oklch(0.72 0.13 300)",
};

export const THEMES: Record<ThemeName, ThemeDef> = {
  midnight: {
    name: { en: "Midnight", fa: "نیمه‌شب" },
    vars: {
      "--mb-night": "oklch(0.17 0.045 270)",
      "--mb-panel": "oklch(0.22 0.05 268)",
      "--mb-panel-edge": "oklch(0.3 0.05 268)",
      "--mb-ink": "oklch(0.96 0.01 265)",
      "--mb-dim": "oklch(0.79 0.03 265)",
      "--mb-glow": "oklch(0.84 0.15 168)",
      "--mb-on-glow": "oklch(0.2 0.05 200)",
      ...shared,
    },
  },
  forest: {
    name: { en: "Forest", fa: "جنگل" },
    vars: {
      "--mb-night": "oklch(0.16 0.035 160)",
      "--mb-panel": "oklch(0.21 0.04 160)",
      "--mb-panel-edge": "oklch(0.29 0.04 160)",
      "--mb-ink": "oklch(0.96 0.01 150)",
      "--mb-dim": "oklch(0.78 0.025 150)",
      "--mb-glow": "oklch(0.82 0.15 145)",
      "--mb-on-glow": "oklch(0.17 0.05 150)",
      ...shared,
    },
  },
  rose: {
    name: { en: "Rose", fa: "رز" },
    vars: {
      "--mb-night": "oklch(0.17 0.04 340)",
      "--mb-panel": "oklch(0.22 0.045 340)",
      "--mb-panel-edge": "oklch(0.3 0.045 340)",
      "--mb-ink": "oklch(0.96 0.01 340)",
      "--mb-dim": "oklch(0.78 0.03 340)",
      "--mb-glow": "oklch(0.83 0.13 15)",
      "--mb-on-glow": "oklch(0.19 0.06 350)",
      ...shared,
    },
  },
  slate: {
    name: { en: "Slate", fa: "سنگ" },
    vars: {
      "--mb-night": "oklch(0.18 0.012 260)",
      "--mb-panel": "oklch(0.23 0.014 260)",
      "--mb-panel-edge": "oklch(0.31 0.014 260)",
      "--mb-ink": "oklch(0.96 0.005 260)",
      "--mb-dim": "oklch(0.78 0.012 260)",
      "--mb-glow": "oklch(0.82 0.09 130)",
      "--mb-on-glow": "oklch(0.18 0.03 130)",
      ...shared,
    },
  },
  sand: {
    name: { en: "Sand · light", fa: "ماسه · روشن" },
    light: true,
    vars: {
      "--mb-night": "oklch(0.94 0.015 85)",
      "--mb-panel": "oklch(0.975 0.01 85)",
      "--mb-panel-edge": "oklch(0.85 0.02 85)",
      "--mb-ink": "oklch(0.27 0.03 80)",
      "--mb-dim": "oklch(0.5 0.025 80)",
      "--mb-glow": "oklch(0.56 0.11 170)",
      "--mb-on-glow": "oklch(0.97 0.015 85)",
      "--mb-gold": "oklch(0.56 0.12 85)",
      "--mb-danger": "oklch(0.55 0.19 22)",
      "--mb-up": "oklch(0.5 0.12 300)",
    },
  },
};

export const THEME_ORDER: ThemeName[] = ["midnight", "forest", "rose", "slate", "sand"];
