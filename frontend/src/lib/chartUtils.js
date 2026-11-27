/**
 * chartUtils.js — Chart.js Registration, Token Reader & Metric Aggregation
 * Registers all Chart.js v4 controllers/elements once, reads live Light/Dark
 * CSS custom properties from `document.documentElement`, aggregates filtered
 * survey responses by metric (`cat1`, `cat2`, `comfort`, `score`, `outcome`,
 * `sessionTrend`), and builds configs for all 5 chart styles (`bar`,
 * `horizontalBar`, `donut`, `line`, `dualAxis`).
 */

import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';

// Register required Chart.js scales, elements, controllers (for mixed dualAxis), and zoom plugin
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  BarController,
  LineController,
  DoughnutController,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

/**
 * Reads live theme tokens from `:root` / `[data-theme="dark"]` so every canvas
 * re-renders sharply with official ESN brand colors on Light/Dark theme toggle.
 */
export function readChartTokens() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      cyan: '#00AEEF',
      magenta: '#EC008C',
      green: '#7AC143',
      orange: '#F47B20',
      darkBlue: '#2E3192',
      cyanSoft: 'rgba(0, 174, 239, 0.22)',
      greenSoft: 'rgba(122, 193, 67, 0.22)',
      grid: 'rgba(242, 239, 233, 0.08)',
      tick: '#989286',
      tooltipBg: '#282622',
      tooltipText: '#F2EFE9',
      tooltipBorder: 'rgba(242, 239, 233, 0.16)',
      surface: '#1B1A17',
      fontSans: 'Inter, sans-serif',
      fontMono: 'JetBrains Mono, monospace',
    };
  }

  const styles = window.getComputedStyle(document.documentElement);
  const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;

  return {
    cyan: read('--esn-cyan', '#00AEEF'),
    magenta: read('--esn-magenta', '#EC008C'),
    green: read('--esn-green', '#7AC143'),
    orange: read('--esn-orange', '#F47B20'),
    darkBlue: read('--esn-dark-blue', '#2E3192'),
    cyanSoft: read('--chart-series-1-soft', 'rgba(0, 174, 239, 0.20)'),
    greenSoft: read('--chart-series-2-soft', 'rgba(122, 193, 67, 0.20)'),
    grid: read('--chart-grid', read('--border-subtle', 'rgba(242, 239, 233, 0.08)')),
    tick: read('--chart-tick', read('--ink-secondary', '#989286')),
    tooltipBg: read('--chart-tooltip-bg', '#282622'),
    tooltipText: read('--chart-tooltip-text', '#F2EFE9'),
    tooltipBorder: read('--chart-tooltip-border', 'rgba(242, 239, 233, 0.16)'),
    surface: read('--bg-surface', '#1B1A17'),
    fontSans: read('--font-sans', 'Inter, sans-serif'),
    fontMono: read('--font-mono', 'JetBrains Mono, monospace'),
  };
}

function capitalizeWord(str) {
  if (!str) {
    return 'Other';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Aggregates filtered responses into `{ labels, values, secondaryValues, colors, centerReadout }`
 * tailored to each supported ESN survey metric.
 */
export function aggregateMetric(metricKey, responses, sessions, t, tokens) {
  const palette = [
    tokens.cyan,
    tokens.green,
    tokens.orange,
    tokens.magenta,
    tokens.darkBlue,
  ];

  const total = responses.length;

  // Per-session trend: count bars + positive outcome rate (%) line across sessions
  if (metricKey === 'sessionTrend') {
    const targetSessions =
      sessions.length > 0
        ? sessions
        : Array.from(
            responses.reduce((map, row) => {
              if (!map.has(row.sessionId)) {
                map.set(row.sessionId, {
                  id: row.sessionId,
                  title: row.sessionTitle,
                  responses: [],
                });
              }
              map.get(row.sessionId).responses.push(row);
              return map;
            }, new Map()).values()
          );

    const labels = targetSessions.map((session) =>
      session.title.length > 22 ? `${session.title.slice(0, 21)}…` : session.title
    );
    const values = targetSessions.map((session) => session.responses.length);
    const secondaryValues = targetSessions.map((session) => {
      const count = session.responses.length;
      if (!count) {
        return 0;
      }
      const yesCount = session.responses.filter((row) => row.outcome === 'yes').length;
      return Math.round((yesCount / count) * 100);
    });

    const overallYes = responses.filter((row) => row.outcome === 'yes').length;
    const positivePct = total ? Math.round((overallYes / total) * 100) : 0;

    return {
      labels,
      values,
      secondaryValues,
      secondaryLabel: t('charts.positiveRateLabel'),
      colors: labels.map((_, idx) => palette[idx % palette.length]),
      centerReadout: {
        value: `${positivePct}%`,
        label: t('charts.positiveCenterLabel'),
      },
    };
  }

  // Satisfaction Score (1..5 scale)
  if (metricKey === 'score') {
    const buckets = [1, 2, 3, 4, 5];
    const counts = buckets.map(
      (level) => responses.filter((row) => Number(row.score) === level).length
    );
    const labels = buckets.map((level) => `${level} / 5`);
    const colors = [
      tokens.magenta,
      tokens.orange,
      tokens.darkBlue,
      tokens.cyan,
      tokens.green,
    ];
    const topCount = Math.max(...counts, 0);
    const topPct = total ? Math.round((topCount / total) * 100) : 0;

    return {
      labels,
      values: counts,
      secondaryValues: counts.map((c) => (total ? Math.round((c / total) * 100) : 0)),
      secondaryLabel: t('charts.shareLabel'),
      colors,
      centerReadout: {
        value: `${topPct}%`,
        label: t('charts.topShareCenterLabel'),
      },
    };
  }

  // Positive Outcome (`yes`, `maybe`, `no`)
  if (metricKey === 'outcome') {
    const keys = ['yes', 'maybe', 'no'];
    const counts = keys.map(
      (key) => responses.filter((row) => row.outcome === key).length
    );
    const positivePct = total ? Math.round((counts[0] / total) * 100) : 0;

    return {
      labels: keys.map((key) => t(`charts.values.${key}`)),
      values: counts,
      secondaryValues: counts.map((c) => (total ? Math.round((c / total) * 100) : 0)),
      secondaryLabel: t('charts.shareLabel'),
      colors: [tokens.green, tokens.orange, tokens.magenta],
      centerReadout: {
        value: `${positivePct}%`,
        label: t('charts.positiveCenterLabel'),
      },
    };
  }

  // Comfort Level (`high`, `medium`, `low`)
  if (metricKey === 'comfort') {
    const keys = ['high', 'medium', 'low'];
    const counts = keys.map(
      (key) => responses.filter((row) => row.comfort === key).length
    );
    const highPct = total ? Math.round((counts[0] / total) * 100) : 0;

    return {
      labels: keys.map((key) => t(`charts.values.${key}`)),
      values: counts,
      secondaryValues: counts.map((c) => (total ? Math.round((c / total) * 100) : 0)),
      secondaryLabel: t('charts.shareLabel'),
      colors: [tokens.cyan, tokens.orange, tokens.magenta],
      centerReadout: {
        value: `${highPct}%`,
        label: t('charts.values.high'),
      },
    };
  }

  // Categorical distribution (`cat1` or `cat2`)
  const freq = new Map();
  for (const row of responses) {
    const val = String(row[metricKey] ?? '').trim().toLowerCase() || 'other';
    freq.set(val, (freq.get(val) ?? 0) + 1);
  }

  const sortedEntries = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
  const labels = sortedEntries.map(([key]) => capitalizeWord(key));
  const values = sortedEntries.map(([, count]) => count);
  const topPct = total && values[0] ? Math.round((values[0] / total) * 100) : 0;

  return {
    labels,
    values,
    secondaryValues: values.map((c) => (total ? Math.round((c / total) * 100) : 0)),
    secondaryLabel: t('charts.shareLabel'),
    colors: labels.map((_, idx) => palette[idx % palette.length]),
    centerReadout: {
      value: `${topPct}%`,
      label: labels[0] ?? t('charts.topShareCenterLabel'),
    },
  };
}

/**
 * Builds complete `{ chartType, data, options, centerReadout }` for `react-chartjs-2`'s
 * `<Chart />` component across all 5 styles (`bar`, `horizontalBar`, `donut`, `line`, `dualAxis`).
 */
export function buildChartConfig({ metricKey, chartStyle, responses, sessions, t }) {
  const tokens = readChartTokens();
  const agg = aggregateMetric(metricKey, responses, sessions, t, tokens);

  const baseTooltip = {
    backgroundColor: tokens.tooltipBg,
    titleColor: tokens.tooltipText,
    bodyColor: tokens.tooltipText,
    borderColor: tokens.tooltipBorder,
    borderWidth: 1,
    padding: 10,
    cornerRadius: 7,
    titleFont: { family: tokens.fontMono, size: 11, weight: '600' },
    bodyFont: { family: tokens.fontSans, size: 12 },
  };

  const baseLegend = {
    display: chartStyle === 'donut' || chartStyle === 'dualAxis',
    position: 'bottom',
    labels: {
      color: tokens.tick,
      boxWidth: 10,
      boxHeight: 10,
      usePointStyle: true,
      pointStyle: 'circle',
      padding: 14,
      font: { family: tokens.fontMono, size: 11 },
    },
  };

  // Build interactive drag-to-zoom, Ctrl+wheel/pinch zoom, and Shift+drag pan config for Cartesian charts
  const buildZoomConfig = (axisMode) => ({
    pan: {
      enabled: true,
      mode: axisMode,
      modifierKey: 'shift',
    },
    zoom: {
      wheel: {
        enabled: true,
        modifierKey: 'ctrl',
      },
      pinch: {
        enabled: true,
      },
      drag: {
        enabled: true,
        backgroundColor: tokens.cyanSoft,
        borderColor: tokens.cyan,
        borderWidth: 1,
      },
      mode: axisMode,
    },
  });

  // Shared metadata returned for click-to-select count & share % readouts
  const meta = {
    labels: agg.labels,
    values: agg.values,
    total: responses.length,
  };

  // 1. Donut with centered % readout
  if (chartStyle === 'donut') {
    return {
      chartType: 'doughnut',
      isZoomable: false,
      meta,
      centerReadout: agg.centerReadout,
      data: {
        labels: agg.labels,
        datasets: [
          {
            label: t('charts.responseCountLabel'),
            data: agg.values,
            backgroundColor: agg.colors,
            borderColor: tokens.surface,
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: baseLegend,
          tooltip: baseTooltip,
        },
      },
    };
  }

  // 2. Dual-Axis Trend Combo (Response count bars on left `y`, % line on right `y1`)
  if (chartStyle === 'dualAxis') {
    return {
      chartType: 'bar',
      isZoomable: true,
      meta,
      centerReadout: null,
      data: {
        labels: agg.labels,
        datasets: [
          {
            type: 'bar',
            label: t('charts.responseCountLabel'),
            data: agg.values,
            backgroundColor: tokens.cyanSoft,
            borderColor: tokens.cyan,
            borderWidth: 1.5,
            borderRadius: 6,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'line',
            label: agg.secondaryLabel,
            data: agg.secondaryValues,
            borderColor: tokens.green,
            backgroundColor: tokens.green,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.32,
            yAxisID: 'y1',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: baseLegend,
          tooltip: baseTooltip,
          zoom: buildZoomConfig('x'),
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: tokens.tick, font: { family: tokens.fontMono, size: 11 } },
          },
          y: {
            beginAtZero: true,
            position: 'left',
            grid: { color: tokens.grid },
            ticks: {
              precision: 0,
              color: tokens.tick,
              font: { family: tokens.fontMono, size: 11 },
            },
          },
          y1: {
            beginAtZero: true,
            max: 100,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: {
              color: tokens.green,
              font: { family: tokens.fontMono, size: 11 },
              callback: (value) => `${value}%`,
            },
          },
        },
      },
    };
  }

  // 3. Line Chart
  if (chartStyle === 'line') {
    return {
      chartType: 'line',
      isZoomable: true,
      meta,
      centerReadout: null,
      data: {
        labels: agg.labels,
        datasets: [
          {
            label: t('charts.responseCountLabel'),
            data: agg.values,
            borderColor: tokens.cyan,
            backgroundColor: tokens.cyanSoft,
            borderWidth: 2,
            pointBackgroundColor: tokens.cyan,
            pointBorderColor: tokens.surface,
            pointBorderWidth: 1.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: baseLegend,
          tooltip: baseTooltip,
          zoom: buildZoomConfig('x'),
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: tokens.tick, font: { family: tokens.fontMono, size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: tokens.grid },
            ticks: {
              precision: 0,
              color: tokens.tick,
              font: { family: tokens.fontMono, size: 11 },
            },
          },
        },
      },
    };
  }

  // 4 & 5. Vertical Bar (`bar`) and Horizontal Bar (`horizontalBar`)
  const isHorizontal = chartStyle === 'horizontalBar';

  return {
    chartType: 'bar',
    isZoomable: true,
    meta,
    centerReadout: null,
    data: {
      labels: agg.labels,
      datasets: [
        {
          label: t('charts.responseCountLabel'),
          data: agg.values,
          backgroundColor: agg.colors,
          borderRadius: 6,
          maxBarThickness: 40,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: isHorizontal ? 'y' : 'x',
      plugins: {
        legend: baseLegend,
        tooltip: baseTooltip,
        zoom: buildZoomConfig(isHorizontal ? 'y' : 'x'),
      },
      scales: {
        x: {
          beginAtZero: isHorizontal,
          grid: { color: isHorizontal ? tokens.grid : 'transparent', display: isHorizontal },
          ticks: {
            precision: isHorizontal ? 0 : undefined,
            color: tokens.tick,
            font: { family: tokens.fontMono, size: 11 },
          },
        },
        y: {
          beginAtZero: !isHorizontal,
          grid: { color: isHorizontal ? 'transparent' : tokens.grid, display: !isHorizontal },
          ticks: {
            precision: !isHorizontal ? 0 : undefined,
            color: tokens.tick,
            font: { family: tokens.fontMono, size: 11 },
          },
        },
      },
    },
  };
}
