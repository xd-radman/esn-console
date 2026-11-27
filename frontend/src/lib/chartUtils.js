/**
 * chartUtils.js — Universal Schema-Driven Chart.js Registration & Config Builder
 * Registers Chart.js v4 controllers, elements, and `chartjs-plugin-zoom` once,
 * reads live Light/Dark CSS custom properties from `document.documentElement`,
 * delegates all 1-column and 2-column statistical aggregations to
 * `computeChartDataset()` in `csvSchema.js`, and builds interactive configs for
 * all 5 chart styles (`bar`, `horizontalBar`, `donut`, `line`, `dualAxis`).
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
import { computeChartDataset, getActiveColumns } from './csvSchema.js';

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

/**
 * Generates 2–3 sensible default starter graph configurations dynamically from
 * a project's `config.columns` (`number` and `category` columns).
 */
export function generateStarterGraphsFromColumns(columns = []) {
  const activeCols = getActiveColumns(columns);
  const numberCols = activeCols.filter((col) => col.type === 'number');
  const categoryCols = activeCols.filter((col) => col.type === 'category');
  const starters = [];

  if (numberCols[0]) {
    starters.push({
      metricKey: '__session__',
      chartStyle: 'dualAxis',
      colSpan: categoryCols[0] ? 8 : 12,
      customTitle: '',
      config: {
        xAxisKey: '__session__',
        yAxisKey: numberCols[0].key,
        aggregation: 'avg',
        secondaryYAxisKey: '__count__',
        secondaryAggregation: 'count',
        maxGroups: 0,
      },
    });
  }

  if (categoryCols[0]) {
    starters.push({
      metricKey: categoryCols[0].key,
      chartStyle: 'donut',
      colSpan: numberCols[0] ? 4 : 6,
      customTitle: '',
      config: {
        xAxisKey: categoryCols[0].key,
        yAxisKey: '__count__',
        aggregation: 'count',
        maxGroups: 8,
      },
    });
  }

  if (numberCols[0] && starters.length < 3) {
    starters.push({
      metricKey: numberCols[0].key,
      chartStyle: 'bar',
      colSpan: 6,
      customTitle: '',
      config: {
        xAxisKey: numberCols[0].key,
        yAxisKey: '__count__',
        aggregation: 'count',
        maxGroups: 12,
      },
    });
  } else if (categoryCols[1] && starters.length < 3) {
    starters.push({
      metricKey: categoryCols[1].key,
      chartStyle: 'horizontalBar',
      colSpan: 6,
      customTitle: '',
      config: {
        xAxisKey: categoryCols[1].key,
        yAxisKey: '__count__',
        aggregation: 'count',
        maxGroups: 12,
      },
    });
  }

  return starters;
}

/**
 * Builds complete `{ chartType, isZoomable, meta, data, options, centerReadout }`
 * for `react-chartjs-2`'s `<Chart />` across all 5 styles (`bar`, `horizontalBar`,
 * `donut`, `line`, `dualAxis`) using `computeChartDataset(...)`.
 */
export function buildChartConfig({
  graph,
  metricKey,
  chartStyle,
  responses,
  sessions,
  columns = [],
  t,
}) {
  const tokens = readChartTokens();
  const palette = [
    tokens.cyan,
    tokens.green,
    tokens.orange,
    tokens.magenta,
    tokens.darkBlue,
  ];

  const resolvedGraph = graph ?? { metricKey, chartStyle };
  const resolvedStyle = resolvedGraph.chartStyle ?? chartStyle ?? 'bar';

  const dataset = computeChartDataset(
    resolvedGraph,
    responses,
    sessions,
    columns
  );

  if (dataset.labels.length === 0) {
    return null;
  }

  const colors = dataset.labels.map((_, idx) => palette[idx % palette.length]);
  const primarySum = dataset.primaryData.reduce((sum, val) => sum + (Number(val) || 0), 0);
  const isPrimaryCount = dataset.config.aggregation === 'count';
  const isSecondaryCount = dataset.config.secondaryAggregation === 'count';

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
    display: resolvedStyle === 'donut' || resolvedStyle === 'dualAxis',
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

  // Interactive drag-to-zoom, Ctrl+wheel/pinch zoom, and Shift+drag pan config
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

  // Shared metadata returned for click-to-select readouts
  const meta = {
    labels: dataset.labels,
    values: dataset.primaryData,
    total: isPrimaryCount ? primarySum : dataset.totalResponses,
    isCountSeries: isPrimaryCount,
  };

  // 1. Donut with centered % readout
  if (resolvedStyle === 'donut') {
    const topIdx = dataset.primaryData.reduce(
      (best, val, idx) => (val > (dataset.primaryData[best] ?? -1) ? idx : best),
      0
    );
    const topPct =
      primarySum > 0 && dataset.primaryData[topIdx]
        ? Math.round((dataset.primaryData[topIdx] / primarySum) * 100)
        : 0;

    return {
      chartType: 'doughnut',
      isZoomable: false,
      meta,
      centerReadout: {
        value: `${topPct}%`,
        label: dataset.labels[topIdx] ?? t('charts.topShareCenterLabel'),
      },
      data: {
        labels: dataset.labels,
        datasets: [
          {
            label: dataset.primaryLabel,
            data: dataset.primaryData,
            backgroundColor: colors,
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

  // 2. Dual-Axis Trend Combo (Primary bars on left `y`, secondary line on right `y1`)
  if (resolvedStyle === 'dualAxis') {
    return {
      chartType: 'bar',
      isZoomable: true,
      meta,
      centerReadout: null,
      data: {
        labels: dataset.labels,
        datasets: [
          {
            type: 'bar',
            label: dataset.primaryLabel,
            data: dataset.primaryData,
            backgroundColor: tokens.cyanSoft,
            borderColor: tokens.cyan,
            borderWidth: 1.5,
            borderRadius: 6,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'line',
            label: dataset.secondaryLabel,
            data: dataset.secondaryData,
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
              precision: isPrimaryCount ? 0 : undefined,
              color: tokens.tick,
              font: { family: tokens.fontMono, size: 11 },
            },
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: {
              precision: isSecondaryCount ? 0 : undefined,
              color: tokens.green,
              font: { family: tokens.fontMono, size: 11 },
            },
          },
        },
      },
    };
  }

  // 3. Line Chart
  if (resolvedStyle === 'line') {
    return {
      chartType: 'line',
      isZoomable: true,
      meta,
      centerReadout: null,
      data: {
        labels: dataset.labels,
        datasets: [
          {
            label: dataset.primaryLabel,
            data: dataset.primaryData,
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
              precision: isPrimaryCount ? 0 : undefined,
              color: tokens.tick,
              font: { family: tokens.fontMono, size: 11 },
            },
          },
        },
      },
    };
  }

  // 4 & 5. Vertical Bar (`bar`) and Horizontal Bar (`horizontalBar`)
  const isHorizontal = resolvedStyle === 'horizontalBar';

  return {
    chartType: 'bar',
    isZoomable: true,
    meta,
    centerReadout: null,
    data: {
      labels: dataset.labels,
      datasets: [
        {
          label: dataset.primaryLabel,
          data: dataset.primaryData,
          backgroundColor: colors,
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
          grid: {
            color: isHorizontal ? tokens.grid : 'transparent',
            display: isHorizontal,
          },
          ticks: {
            precision: isHorizontal && isPrimaryCount ? 0 : undefined,
            color: tokens.tick,
            font: { family: tokens.fontMono, size: 11 },
          },
        },
        y: {
          beginAtZero: !isHorizontal,
          grid: {
            color: isHorizontal ? 'transparent' : tokens.grid,
            display: !isHorizontal,
          },
          ticks: {
            precision: !isHorizontal && isPrimaryCount ? 0 : undefined,
            color: tokens.tick,
            font: { family: tokens.fontMono, size: 11 },
          },
        },
      },
    },
  };
}
