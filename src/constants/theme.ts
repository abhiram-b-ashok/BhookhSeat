export const colors = {
  background: '#1a1a2e',
  header: '#242444',
  surface: '#2a2a4a',
  primary: '#4fc3f7',
  text: '#ffffff',
  textSecondary: '#a0a0b0',
  alert: '#ff5252',
  onPrimary: '#1a1a2e', // text on primary-coloured buttons
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 30,
} as const;

export const radii = {
  sm: 8,
  md: 10,
  lg: 12,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.textSecondary },
  body: { fontSize: 16, color: colors.text },
  caption: { fontSize: 14, color: colors.textSecondary },
} as const;