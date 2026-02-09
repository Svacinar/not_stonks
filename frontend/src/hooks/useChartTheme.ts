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
        text: 'hsl(30, 12%, 88%)',
        textMuted: 'hsl(220, 4%, 50%)',
        grid: 'rgba(255, 255, 255, 0.04)',
        tooltipBackground: 'rgba(10, 13, 17, 0.92)',
        tooltipText: 'hsl(30, 12%, 88%)',
        tooltipBorder: 'rgba(201, 168, 76, 0.3)',
        spendingLine: 'hsl(153, 41%, 38%)',
        spendingFill: 'hsla(153, 41%, 38%, 0.12)',
        incomeLine: 'hsl(44, 52%, 54%)',
        incomeFill: 'hsla(44, 52%, 54%, 0.12)',
        spendingRGB: '64, 145, 108',
        incomeRGB: '201, 168, 76',
      };
    }
    return {
      text: 'hsl(0, 0%, 10%)',
      textMuted: 'hsl(30, 3%, 41%)',
      grid: 'rgba(0, 0, 0, 0.05)',
      tooltipBackground: 'rgba(255, 255, 255, 0.95)',
      tooltipText: 'hsl(0, 0%, 10%)',
      tooltipBorder: 'rgba(201, 168, 76, 0.3)',
      spendingLine: 'hsl(153, 41%, 30%)',
      spendingFill: 'hsla(153, 41%, 30%, 0.1)',
      incomeLine: 'hsl(44, 52%, 54%)',
      incomeFill: 'hsla(44, 52%, 54%, 0.1)',
      spendingRGB: '45, 106, 79',
      incomeRGB: '201, 168, 76',
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
            family: 'Satoshi, system-ui, sans-serif',
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
            weight: 300,
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
            weight: 300,
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
        borderWidth: 2,
        borderCapStyle: 'round' as const,
        borderJoinStyle: 'round' as const,
      },
      point: {
        radius: 0, // Hidden by default, appear on hover
        borderWidth: 2,
        hoverRadius: 6,
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
    cutout: '65%',
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: colors.text,
          font: {
            family: 'Satoshi, system-ui, sans-serif',
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
