import type { Status } from '../domain/analytics';

// Canonical legacy design tokens (D-050, see 20_Design/DESIGN_FINDINGS_2026-09-19.md).
// All colors and sizes live here so a later restyle stays cheap.
export const colors = {
  backdrop: '#141416',
  background: '#000000',
  card: '#131316',
  cardSecondary: '#1c1c20',
  border: 'rgba(255, 255, 255, 0.05)',
  text: '#ffffff',
  textMuted: '#8e8e93',
  accent: '#fc4c02',
  accentSoft: 'rgba(252, 76, 2, 0.14)',
  accentBorder: 'rgba(252, 76, 2, 0.32)',
  running: '#8c57f5',
  runningSoft: 'rgba(140, 87, 245, 0.14)',
  runningBorder: 'rgba(140, 87, 245, 0.32)',
  trendNeutral: 'rgba(255, 255, 255, 0.78)',
  good: '#8cdb4f',
  warn: '#ffd60a',
  bad: '#ff453a',
  fill: '#1c1c20',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
} as const;

export const radius = {
  card: 20,
  tile: 20,
} as const;

export const typography = {
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
  },
} as const;

/** Traffic-light semantics as a small accent only (D-042). */
export function toneColor(status: Status | null | undefined): string {
  switch (status) {
    case 'green':
      return colors.good;
    case 'yellow':
      return colors.warn;
    case 'red':
      return colors.bad;
    default:
      return colors.textMuted;
  }
}
