export const colors = {
  backdrop: '#141416',
  background: '#000000',
  card: '#1c1c1e',
  border: '#2c2c2e',
  text: '#ffffff',
  textMuted: '#8e8e93',
  accent: '#ff7a1a',
  accentSoft: 'rgba(255, 122, 26, 0.14)',
  accentBorder: 'rgba(255, 122, 26, 0.32)',
  running: '#9d7bff',
  runningSoft: 'rgba(157, 123, 255, 0.14)',
  runningBorder: 'rgba(157, 123, 255, 0.32)',
  trendNeutral: '#c7c7cc',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
} as const;

export const radius = {
  card: 16,
  tile: 18,
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
