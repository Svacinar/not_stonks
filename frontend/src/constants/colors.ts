/**
 * Bank colors for identifying transactions by bank source.
 * These correspond to CSS variables: --bank-csob, --bank-raiffeisen, --bank-revolut
 */
export const BANK_COLORS: Record<string, string> = {
  CSOB: '#005BAC',
  Raiffeisen: '#FFD100',
  Revolut: '#0666EB',
} as const;

/**
 * Chart color palette for visualizations.
 * Use these colors in order for consistent styling across charts.
 * These correspond to CSS variables: --chart-1 through --chart-12
 */
export const CHART_COLORS_HEX = [
  '#22c55e', // chart-1: green
  '#3b82f6', // chart-2: blue
  '#eab308', // chart-3: amber
  '#a855f7', // chart-4: purple
  '#ef4444', // chart-5: red
  '#06b6d4', // chart-6: cyan
  '#64748b', // chart-7: slate
  '#6b7280', // chart-8: gray
  '#ec4899', // chart-9: pink
  '#14b8a6', // chart-10: teal
  '#f97316', // chart-11: orange
  '#84cc16', // chart-12: lime
] as const;

/**
 * Chart colors using CSS variables for theme-aware colors.
 * Use these for components that need to respond to theme changes.
 */
export const CHART_COLORS_HSL = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
  'hsl(var(--chart-7))',
  'hsl(var(--chart-8))',
  'hsl(var(--chart-9))',
  'hsl(var(--chart-10))',
  'hsl(var(--chart-11))',
  'hsl(var(--chart-12))',
] as const;

/**
 * Bank colors using CSS variables for theme-aware colors.
 */
export const BANK_COLORS_HSL: Record<string, string> = {
  CSOB: 'hsl(var(--bank-csob))',
  Raiffeisen: 'hsl(var(--bank-raiffeisen))',
  Revolut: 'hsl(var(--bank-revolut))',
} as const;

/**
 * Uncategorized/fallback color for categories without assigned colors.
 * Corresponds to CSS variable: --uncategorized
 * Hex value: #9ca3af (gray-400 equivalent)
 */
export const UNCATEGORIZED_COLOR = '#9ca3af';

/**
 * Uncategorized color using CSS variable for theme-aware styling.
 */
export const UNCATEGORIZED_COLOR_HSL = 'hsl(var(--uncategorized))';

/**
 * Income/success color for charts (emerald-500).
 * Used for income line charts and positive values.
 */
export const INCOME_COLOR = '#10b981';

/**
 * Income/success color using CSS variable for theme-aware styling.
 */
export const INCOME_COLOR_HSL = 'hsl(var(--success))';
