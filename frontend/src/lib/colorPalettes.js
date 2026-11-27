/**
 * colorPalettes.js — Curated ESN & Custom Color Palette Registry + CSS Token Engine
 * Defines the 5 core brand/chart color slots (matching ESN Cyan, Magenta, Green,
 * Orange, and Dark Blue in `tokens.css`), 5 curated Swiss/editorial presets, and
 * pure helpers to validate, compute soft tints, and apply overrides to `:root`.
 */

// Official ESN brand hex values matching `tokens.css` Light defaults
export const DEFAULT_ESN_COLORS = [
  '#00AEEF', // Slot 1: Primary Accent / ESN Cyan
  '#EC008C', // Slot 2: Accent 2 / ESN Magenta
  '#7AC143', // Slot 3: Accent 3 / ESN Green
  '#F47B20', // Slot 4: Accent 4 / ESN Orange
  '#2E3192', // Slot 5: Accent 5 / ESN Dark Blue
];

// 5 curated presets available in Account Settings -> Appearance & Color Palette
export const COLOR_PALETTE_PRESETS = [
  {
    id: 'esn',
    labelKey: 'palette.presets.esn',
    colors: [...DEFAULT_ESN_COLORS],
  },
  {
    id: 'nordic',
    labelKey: 'palette.presets.nordic',
    colors: ['#3B82A6', '#8E5572', '#5F8D75', '#C88A3B', '#283655'],
  },
  {
    id: 'terracotta',
    labelKey: 'palette.presets.terracotta',
    colors: ['#C85A32', '#7E2E42', '#6B7D4E', '#D1933A', '#3D2B24'],
  },
  {
    id: 'botanical',
    labelKey: 'palette.presets.botanical',
    colors: ['#1E8E68', '#1F7A8C', '#6B9952', '#C9972B', '#184A3C'],
  },
  {
    id: 'monochrome',
    labelKey: 'palette.presets.monochrome',
    colors: ['#2563EB', '#4B5563', '#6B7280', '#9CA3AF', '#1F2937'],
  },
];

export const PALETTE_SLOT_KEYS = [
  'palette.slots.primary',
  'palette.slots.accent2',
  'palette.slots.accent3',
  'palette.slots.accent4',
  'palette.slots.accent5',
];

export const DEFAULT_PALETTE = {
  presetId: 'esn',
  colors: [...DEFAULT_ESN_COLORS],
};

// CSS custom properties managed dynamically when a non-default palette is active
const MANAGED_CSS_VARS = [
  '--esn-cyan',
  '--esn-magenta',
  '--esn-green',
  '--esn-orange',
  '--esn-dark-blue',
  '--accent-primary',
  '--accent-primary-hover',
  '--accent-primary-soft',
  '--accent-primary-border',
  '--accent-primary-ink',
  '--accent-secondary',
  '--accent-deep',
  '--focus-ring',
  '--chart-series-1',
  '--chart-series-2',
  '--chart-series-3',
  '--chart-series-4',
  '--chart-series-5',
  '--chart-series-1-soft',
  '--chart-series-2-soft',
  '--chart-series-3-soft',
  '--chart-series-4-soft',
  '--chart-series-5-soft',
];

/**
 * Checks whether a string is a valid 6-digit `#RRGGBB` hex color.
 */
export function isValidHex(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

/**
 * Normalizes a persisted palette object from localStorage or Supabase `profiles.preferences`.
 */
export function normalizePalette(raw) {
  if (!raw || typeof raw !== 'object') {
    return { presetId: 'esn', colors: [...DEFAULT_ESN_COLORS] };
  }

  const presetId = typeof raw.presetId === 'string' ? raw.presetId : 'esn';
  const presetMatch = COLOR_PALETTE_PRESETS.find((item) => item.id === presetId);

  if (
    Array.isArray(raw.colors) &&
    raw.colors.length === 5 &&
    raw.colors.every(isValidHex)
  ) {
    return {
      presetId,
      colors: raw.colors.map((c) => c.trim().toUpperCase()),
    };
  }

  if (presetMatch) {
    return {
      presetId: presetMatch.id,
      colors: [...presetMatch.colors],
    };
  }

  return { presetId: 'esn', colors: [...DEFAULT_ESN_COLORS] };
}

/**
 * Converts a `#RRGGBB` hex string into an `rgba(r, g, b, alpha)` CSS value.
 */
export function hexToRgba(hex, alpha = 0.16) {
  if (!isValidHex(hex)) {
    return `rgba(0, 174, 239, ${alpha})`;
  }
  const clean = hex.slice(1);
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Lightens (`delta > 0`) or darkens (`delta < 0`) a `#RRGGBB` color by a fixed RGB offset.
 */
function shiftHex(hex, delta) {
  if (!isValidHex(hex)) {
    return hex;
  }
  const clean = hex.slice(1);
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  const r = clamp(parseInt(clean.slice(0, 2), 16) + delta);
  const g = clamp(parseInt(clean.slice(2, 4), 16) + delta);
  const b = clamp(parseInt(clean.slice(4, 6), 16) + delta);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/**
 * Applies the active 5-color palette to `document.documentElement.style`.
 * When using the default `esn` preset, clears inline overrides so `tokens.css`
 * Light/Dark contrast-tuned ESN tokens remain untouched.
 */
export function applyPaletteToRoot(palette, theme = 'dark') {
  if (typeof document === 'undefined') {
    return;
  }

  const rootStyle = document.documentElement.style;
  const normalized = normalizePalette(palette);
  const isOfficialEsn =
    normalized.presetId === 'esn' &&
    normalized.colors.every(
      (hex, idx) => hex.toUpperCase() === DEFAULT_ESN_COLORS[idx]
    );

  if (isOfficialEsn) {
    for (const varName of MANAGED_CSS_VARS) {
      rootStyle.removeProperty(varName);
    }
    return;
  }

  const [c1, c2, c3, c4, c5] = normalized.colors;
  const isDark = theme === 'dark';

  // Map the 5 slots to the core ESN brand tokens (also read by `chartUtils.js`)
  rootStyle.setProperty('--esn-cyan', c1);
  rootStyle.setProperty('--esn-magenta', c2);
  rootStyle.setProperty('--esn-green', c3);
  rootStyle.setProperty('--esn-orange', c4);
  rootStyle.setProperty('--esn-dark-blue', c5);

  // Primary accent tokens driven by Slot 1
  rootStyle.setProperty('--accent-primary', c1);
  rootStyle.setProperty('--accent-primary-hover', shiftHex(c1, isDark ? 18 : -18));
  rootStyle.setProperty('--accent-primary-soft', hexToRgba(c1, isDark ? 0.16 : 0.11));
  rootStyle.setProperty('--accent-primary-border', hexToRgba(c1, isDark ? 0.40 : 0.42));
  rootStyle.setProperty('--accent-primary-ink', shiftHex(c1, isDark ? 36 : -36));

  rootStyle.setProperty('--accent-secondary', c2);
  rootStyle.setProperty('--accent-deep', c5);
  rootStyle.setProperty('--focus-ring', isDark ? c1 : c5);

  // Chart series tokens
  rootStyle.setProperty('--chart-series-1', c1);
  rootStyle.setProperty('--chart-series-2', c3);
  rootStyle.setProperty('--chart-series-3', c4);
  rootStyle.setProperty('--chart-series-4', c2);
  rootStyle.setProperty('--chart-series-5', c5);

  rootStyle.setProperty('--chart-series-1-soft', hexToRgba(c1, isDark ? 0.22 : 0.16));
  rootStyle.setProperty('--chart-series-2-soft', hexToRgba(c3, isDark ? 0.22 : 0.16));
  rootStyle.setProperty('--chart-series-3-soft', hexToRgba(c4, isDark ? 0.22 : 0.16));
  rootStyle.setProperty('--chart-series-4-soft', hexToRgba(c2, isDark ? 0.20 : 0.14));
  rootStyle.setProperty('--chart-series-5-soft', hexToRgba(c5, isDark ? 0.20 : 0.14));
}
