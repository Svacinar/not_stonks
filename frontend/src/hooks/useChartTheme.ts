import { useMemo, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { ChartArea } from 'chart.js';

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
  /** Primary/spending chart line color */
  spendingLine: string;
  /** Primary/spending chart fill color (with alpha) */
  spendingFill: string;
  /** Income/success chart line color */
  incomeLine: string;
  /** Income/success chart fill color (with alpha) */
  incomeFill: string;
  /** RGB values for gradient creation */
  spendingRGB: string;
  incomeRGB: string;
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
        grid: 'hsla(217, 33%, 30%, 0.3)', // subtle grid lines
        tooltipBackground: 'hsla(222, 84%, 8%, 0.95)', // glass effect
        tooltipText: 'hsl(210, 40%, 98%)', // foreground in dark mode
        tooltipBorder: 'hsla(217, 33%, 40%, 0.3)', // subtle border
        spendingLine: 'hsl(217, 91%, 65%)', // chart-2 in dark mode
        spendingFill: 'hsla(217, 91%, 65%, 0.15)', // chart-2 with alpha for dark mode
        incomeLine: 'hsl(152, 70%, 50%)', // success in dark mode
        incomeFill: 'hsla(152, 70%, 50%, 0.15)', // success with alpha for dark mode
        spendingRGB: '96, 165, 250', // blue-400 RGB
        incomeRGB: '52, 211, 153', // emerald-400 RGB
      };
    }
    return {
      text: 'hsl(222, 84%, 5%)', // foreground in light mode
      textMuted: 'hsl(215, 16%, 47%)', // muted-foreground in light mode
      grid: 'hsla(214, 32%, 70%, 0.2)', // very subtle grid lines
      tooltipBackground: 'hsla(0, 0%, 100%, 0.95)', // glass effect
      tooltipText: 'hsl(222, 84%, 5%)', // foreground in light mode
      tooltipBorder: 'hsla(214, 32%, 80%, 0.5)', // subtle border
      spendingLine: 'hsl(217, 91%, 60%)', // chart-2 in light mode
      spendingFill: 'hsla(217, 91%, 60%, 0.1)', // chart-2 with alpha for light mode
      incomeLine: 'hsl(152, 76%, 45%)', // success in light mode
      incomeFill: 'hsla(152, 76%, 45%, 0.1)', // success with alpha for light mode
      spendingRGB: '59, 130, 246', // blue-500 RGB
      incomeRGB: '16, 185, 129', // emerald-500 RGB
    };
  }, [resolvedTheme]);

  /**
   * Create a vertical gradient for line chart fills
   */
  const createGradient = useCallback((
    ctx: CanvasRenderingContext2D,
    chartArea: ChartArea,
    rgb: string,
    startOpacity = 0.4,
    endOpacity = 0
  ) => {
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, `rgba(${rgb}, ${startOpacity})`);
    gradient.addColorStop(0.5, `rgba(${rgb}, ${startOpacity * 0.4})`);
    gradient.addColorStop(1, `rgba(${rgb}, ${endOpacity})`);
    return gradient;
  }, []);

  /**
   * Get default chart options with theme-aware styling.
   * Merge these with your specific chart options.
   */
  const getDefaultOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        labels: {
          color: colors.text,
          font: {
            family: 'system-ui, -apple-system, sans-serif',
            weight: 500,
          },
          padding: 16,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: colors.tooltipBackground,
        titleColor: colors.tooltipText,
        bodyColor: colors.tooltipText,
        borderColor: colors.tooltipBorder,
        borderWidth: 1,
        padding: 16,
        cornerRadius: 12,
        titleFont: {
          weight: 600 as const,
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
        boxPadding: 6,
        usePointStyle: true,
        // Add blur effect via CSS on the canvas
        displayColors: true,
      },
    },
    scales: {
      x: {
        ticks: {
          color: colors.textMuted,
          font: {
            size: 11,
            weight: 500,
          },
          padding: 8,
        },
        grid: {
          display: false, // Hide vertical grid lines for cleaner look
        },
        border: {
          display: false,
        },
      },
      y: {
        ticks: {
          color: colors.textMuted,
          font: {
            size: 11,
            weight: 500,
          },
          padding: 12,
        },
        grid: {
          color: colors.grid,
          lineWidth: 1,
        },
        border: {
          display: false,
        },
      },
    },
    // Smooth animations
    animation: {
      duration: 750,
      easing: 'easeOutQuart' as const,
    },
    transitions: {
      active: {
        animation: {
          duration: 200,
        },
      },
    },
  }), [colors]);

  /**
   * Get modern line chart specific options
   */
  const getLineChartOptions = useMemo(() => ({
    ...getDefaultOptions,
    elements: {
      line: {
        tension: 0.4, // Smoother curves
        borderWidth: 3,
        borderCapStyle: 'round' as const,
        borderJoinStyle: 'round' as const,
      },
      point: {
        radius: 5, // Show points for visibility (especially with single data point)
        borderWidth: 2,
        hoverRadius: 8,
        hoverBorderWidth: 3,
        hoverBackgroundColor: colors.tooltipBackground,
        hitRadius: 20, // Larger hit area for better UX
      },
    },
    hover: {
      mode: 'index' as const,
      intersect: false,
    },
  }), [getDefaultOptions, colors.tooltipBackground]);

  /**
   * Get modern bar chart specific options
   */
  const getBarChartOptions = useMemo(() => ({
    ...getDefaultOptions,
    elements: {
      bar: {
        borderRadius: 8,
        borderSkipped: false as const,
      },
    },
    datasets: {
      bar: {
        maxBarThickness: 60,
        categoryPercentage: 0.7,
        barPercentage: 0.8,
      },
    },
  }), [getDefaultOptions]);

  /**
   * Get modern pie chart specific options
   */
  const getPieChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: colors.text,
          font: {
            family: 'system-ui, -apple-system, sans-serif',
            weight: 500,
            size: 12,
          },
          padding: 12,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: colors.tooltipBackground,
        titleColor: colors.tooltipText,
        bodyColor: colors.tooltipText,
        borderColor: colors.tooltipBorder,
        borderWidth: 1,
        padding: 16,
        cornerRadius: 12,
        titleFont: {
          weight: 600 as const,
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
      },
    },
    elements: {
      arc: {
        borderWidth: 0,
        hoverBorderWidth: 0,
        hoverOffset: 8,
      },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 750,
      easing: 'easeOutQuart' as const,
    },
  }), [colors]);

  return {
    colors,
    resolvedTheme,
    getDefaultOptions,
    getLineChartOptions,
    getBarChartOptions,
    getPieChartOptions,
    createGradient,
  };
}
