/**
 * ChartTile.jsx — Individual Bento Chart.js Card
 * Renders one configurable chart inside the 12-column `ChartGrid` using its
 * `span-4` / `span-6` / `span-8` / `span-12` CSS class. Recomputes Chart.js
 * datasets and theme colors whenever `theme`, `lang`, `responses`, or `sessions`
 * change, and displays a clean empty-data state when 0 responses are present.
 */

import { useMemo } from 'react';
import { Chart } from 'react-chartjs-2';
import { BarChart3, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { buildChartConfig } from '../lib/chartUtils.js';

const ALLOWED_SPANS = new Set([4, 6, 8, 12]);

export default function ChartTile({ graph, responses = [], sessions = [], onRemove }) {
  const { theme } = useTheme();
  const { t } = useLang();

  const spanClass = ALLOWED_SPANS.has(graph.colSpan) ? `span-${graph.colSpan}` : 'span-6';
  const resolvedTitle = graph.customTitle || t(`charts.metrics.${graph.metricKey}`);
  const styleLabel = t(`charts.styles.${graph.chartStyle}`);

  // Rebuild Chart.js data & options from live CSS custom properties on theme/data change
  const chartConfig = useMemo(() => {
    if (responses.length === 0) {
      return null;
    }
    return buildChartConfig({
      metricKey: graph.metricKey,
      chartStyle: graph.chartStyle,
      responses,
      sessions,
      t,
      theme,
    });
  }, [graph.metricKey, graph.chartStyle, responses, sessions, t, theme]);

  return (
    <article className={`bento-card chart-tile ${spanClass}`}>
      {/* Tile header: editorial title, mono style badge, and remove button */}
      <header className="chart-tile-header">
        <div className="chart-tile-heading">
          <h3 className="font-editorial chart-tile-title">{resolvedTitle}</h3>
          <span className="font-mono-label chart-tile-meta">{styleLabel}</span>
        </div>

        <button
          type="button"
          className="btn ghost chart-tile-delete"
          aria-label={t('charts.deleteGraphAria', { title: resolvedTitle })}
          onClick={() => onRemove?.(graph.id)}
        >
          <X size={15} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </header>

      {/* Responsive Chart.js canvas container or graceful zero-response empty state */}
      {!chartConfig ? (
        <div className="chart-tile-empty">
          <BarChart3 size={22} strokeWidth={1.5} aria-hidden="true" />
          <p>{t('charts.noData')}</p>
        </div>
      ) : (
        <div
          className={`chart-canvas-wrap ${
            graph.chartStyle === 'donut' ? 'is-donut' : ''
          }`}
        >
          <Chart
            key={`${graph.id}-${graph.chartStyle}-${theme}`}
            type={chartConfig.chartType}
            data={chartConfig.data}
            options={chartConfig.options}
          />

          {/* Centered percentage readout overlaid cleanly inside the Donut cutout */}
          {graph.chartStyle === 'donut' && chartConfig.centerReadout && (
            <div className="donut-center-readout" aria-hidden="true">
              <span className="font-editorial donut-center-value tabular-nums">
                {chartConfig.centerReadout.value}
              </span>
              <span className="font-mono-label donut-center-label">
                {chartConfig.centerReadout.label}
              </span>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
