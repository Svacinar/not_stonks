import { useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Chart theme configuration for Chart.js
 * Provides theme-aware colors for text, grid lines, tooltips, and legends
 */
interface ChartThemeColors {
  /** Text color for axis labels, legend, etc. */
  text: string;
  /** Secondary/muted text color */
  textMuted: string;
  /** Grid line color */
  grid: string;
  /** Tooltip background color */
  tooltipBackground: string;
  /** Tooltip text color */
  tooltipText: string;
  /** Tooltip border color */
  tooltipBorder: string;
}

/**
 * Hook that provides theme-aware colors for Chart.js charts.
 * Automatically updates when the theme changes.
 */
export function useChartTheme() {
  const { resolvedTheme } = useTheme();

  const colors = useMemo((): ChartThemeColors => {
    if (resolvedTheme === 'dark') {
      return {
        text: 'hsl(210, 40%, 98%)', // foreground in dark mode
        textMuted: 'hsl(215, 20%, 65%)', // muted-foreground in dark mode
        grid: 'hsl(217, 33%, 25%)', // slightly lighter than border for visibility
        tooltipBackground: 'hsl(222, 84%, 8%)', // slightly lighter than card background
        tooltipText: 'hsl(210, 40%, 98%)', // foreground in dark mode
        tooltipBorder: 'hsl(217, 33%, 17%)', // border in dark mode
      };
    }
    return {
      text: 'hsl(222, 84%, 5%)', // foreground in light mode
      textMuted: 'hsl(215, 16%, 47%)', // muted-foreground in light mode
      grid: 'hsl(214, 32%, 91%)', // border in light mode
      tooltipBackground: 'hsl(0, 0%, 100%)', // white background
      tooltipText: 'hsl(222, 84%, 5%)', // foreground in light mode
      tooltipBorder: 'hsl(214, 32%, 91%)', // border in light mode
    };
  }, [resolvedTheme]);

  /**
   * Get default chart options with theme-aware styling.
   * Merge these with your specific chart options.
   */
  const getDefaultOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: colors.text,
          font: {
            family: 'system-ui, -apple-system, sans-serif',
          },
        },
      },
      tooltip: {
        backgroundColor: colors.tooltipBackground,
        titleColor: colors.tooltipText,
        bodyColor: colors.tooltipText,
        borderColor: colors.tooltipBorder,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          weight: 'bold' as const,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: colors.textMuted,
        },
        grid: {
          color: colors.grid,
        },
        border: {
          color: colors.grid,
        },
      },
      y: {
        ticks: {
          color: colors.textMuted,
        },
        grid: {
          color: colors.grid,
        },
        border: {
          color: colors.grid,
        },
      },
    },
  }), [colors]);

  return {
    colors,
    resolvedTheme,
    getDefaultOptions,
  };
}
