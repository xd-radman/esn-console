/**
 * ChartTile.jsx — Interactive Bento Chart.js Card
 * Renders one configurable chart inside the 12-column `ChartGrid` with:
 * - Compact icon toolbar: Reset Zoom (`chartjs-plugin-zoom`), Fullscreen Inspect
 *   modal (`<dialog>` portaled to `document.body`), Export PNG (`toBase64Image`),
 *   and Admin-only Remove (`×`).
 * - Click-to-select data point interactivity across all chart types (bars, line
 *   points, and donut slices) displaying a Swiss selection chip with label,
 *   exact count, share %, and quick clear (`×`) button.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Chart } from 'react-chartjs-2';
import {
  BarChart3,
  Download,
  GripVertical,
  Maximize2,
  Pencil,
  RotateCcw,
  X,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { buildChartConfig } from '../lib/chartUtils.js';
import { resolveGraphConfig } from '../lib/csvSchema.js';

const ALLOWED_SPANS = new Set([4, 6, 8, 12]);

export default function ChartTile({
  graph,
  responses = [],
  sessions = [],
  columns = [],
  canRemove = false,
  canReorder = false,
  isDragging = false,
  isDragOver = false,
  dropPlacement = null,
  onGripPointerDown,
  onEdit,
  onRemove,
}) {
  const { theme, palette } = useTheme();
  const { t } = useLang();
  const paletteSignature = palette?.colors?.join(',') ?? '';

  // Refs for inline & expanded Chart.js instances and native `<dialog>` modal
  const chartRef = useRef(null);
  const expandedChartRef = useRef(null);
  const expandDialogRef = useRef(null);
  const pressedOutsideRef = useRef(false);

  // Selected data point chip state and fullscreen inspect state
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const expandHeadingId = useId();

  const spanClass = ALLOWED_SPANS.has(graph.colSpan) ? `span-${graph.colSpan}` : 'span-6';
  const resolvedConfig = useMemo(
    () => resolveGraphConfig(graph, columns),
    [graph, columns]
  );

  // Use custom title when set; otherwise generate an informative axis/aggregation title
  const resolvedTitle = useMemo(() => {
    const trimmed = graph.customTitle?.trim();
    if (trimmed) {
      return trimmed;
    }

    const xLabel =
      resolvedConfig.xAxisKey === '__session__'
        ? t('modal.sessionsAxisShort')
        : (columns ?? []).find((col) => col?.key === resolvedConfig.xAxisKey)?.label ||
          resolvedConfig.xAxisKey;

    if (resolvedConfig.yAxisKey === '__count__') {
      return resolvedConfig.xAxisKey === '__session__'
        ? t('charts.sessionVolumeTitle')
        : xLabel;
    }

    const yLabel =
      (columns ?? []).find((col) => col?.key === resolvedConfig.yAxisKey)?.label ||
      resolvedConfig.yAxisKey;
    const aggShort = t(`charts.aggShort.${resolvedConfig.aggregation}`);
    return t('charts.autoTitleBy', { agg: aggShort, y: yLabel, x: xLabel });
  }, [graph.customTitle, resolvedConfig, columns, t]);

  const styleLabel = t(`charts.styles.${graph.chartStyle}`);

  // Rebuild base Chart.js config from live CSS custom properties, `graph.config`, and active palette
  const baseConfig = useMemo(() => {
    if (responses.length === 0) {
      return null;
    }
    return buildChartConfig({
      graph,
      metricKey: graph.metricKey,
      chartStyle: graph.chartStyle,
      responses,
      sessions,
      columns,
      t,
      theme,
      paletteSignature,
    });
  }, [graph, responses, sessions, columns, t, theme, paletteSignature]);

  // Handle clicking any bar, line point, or donut slice to toggle the selection chip
  const handleChartClick = useCallback(
    (_event, elements) => {
      if (!baseConfig || !elements || elements.length === 0) {
        return;
      }
      const { index } = elements[0];
      const label = baseConfig.meta.labels[index];
      const count = baseConfig.meta.values[index] ?? 0;
      const total = baseConfig.meta.total || 0;
      const isCountSeries = Boolean(baseConfig.meta.isCountSeries);
      const sharePct =
        isCountSeries && total > 0 ? Math.round((count / total) * 100) : null;

      setSelectedPoint((prev) =>
        prev && prev.index === index && prev.label === label
          ? null
          : { index, label, count, sharePct, isCountSeries }
      );
    },
    [baseConfig]
  );

  // Merge click-to-select handler into Chart.js options without mutating `baseConfig`
  const interactiveOptions = useMemo(() => {
    if (!baseConfig) {
      return null;
    }
    return {
      ...baseConfig.options,
      onClick: handleChartClick,
    };
  }, [baseConfig, handleChartClick]);

  // Sync fullscreen inspect `<dialog>` with `isExpanded`
  useEffect(() => {
    const dialog = expandDialogRef.current;
    if (!dialog) {
      return;
    }
    if (isExpanded) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isExpanded]);

  // Reset zoom on either the inline or expanded chart instance
  const handleResetZoom = (targetRef) => {
    targetRef.current?.resetZoom?.();
  };

  // Export the rendered Chart.js canvas as a crisp PNG download
  const handleExportPng = (targetRef) => {
    const instance = targetRef.current;
    if (!instance || typeof instance.toBase64Image !== 'function') {
      return;
    }
    const dataUrl = instance.toBase64Image('image/png', 1);
    const link = document.createElement('a');
    const safeName = resolvedTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    link.download = `${safeName || 'esn-chart'}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Safari coordinate-based backdrop dismiss fallback for the fullscreen inspect dialog
  const isPointerOutsideDialog = (event) => {
    const dialog = expandDialogRef.current;
    if (!dialog || event.target !== dialog) {
      return false;
    }
    const rect = dialog.getBoundingClientRect();
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
  };

  const handleDialogPointerDown = (event) => {
    if ('closedBy' in HTMLDialogElement.prototype) {
      return;
    }
    pressedOutsideRef.current = isPointerOutsideDialog(event);
  };

  const handleDialogPointerUp = (event) => {
    if ('closedBy' in HTMLDialogElement.prototype) {
      return;
    }
    if (pressedOutsideRef.current && isPointerOutsideDialog(event)) {
      expandDialogRef.current?.close();
    }
    pressedOutsideRef.current = false;
  };

  const isZoomable = Boolean(baseConfig?.isZoomable);

  const activePlacement =
    isDragOver &&
    (dropPlacement === 'above' ||
      dropPlacement === 'below' ||
      dropPlacement === 'left' ||
      dropPlacement === 'right')
      ? dropPlacement
      : null;

  const tileClasses = [
    'bento-card',
    'chart-tile',
    spanClass,
    isDragging ? 'is-dragging' : '',
    isDragOver ? 'is-drag-over' : '',
    activePlacement ? `drop-${activePlacement}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={tileClasses}
      data-graph-id={graph.id}
      data-drop-placement={activePlacement ?? undefined}
    >
      {/* Tile header: desktop drag handle, editorial title, mono style badge, and action toolbar */}
      <header className="chart-tile-header">
        <div className="chart-tile-start">
          {canReorder && (
            <span
              className="chart-drag-handle"
              role="img"
              aria-label={t('charts.dragToReorder')}
              title={t('charts.dragToReorder')}
              onPointerDown={(event) => onGripPointerDown?.(graph.id, event)}
            >
              <GripVertical size={16} strokeWidth={1.5} aria-hidden="true" />
            </span>
          )}

          <div className="chart-tile-heading">
            <h3 className="font-editorial chart-tile-title">{resolvedTitle}</h3>
            <span className="font-mono-label chart-tile-meta">{styleLabel}</span>
          </div>
        </div>

        <div className="chart-tile-toolbar">
          {baseConfig && isZoomable && (
            <button
              type="button"
              className="btn ghost chart-tile-action"
              aria-label={t('charts.resetZoom')}
              title={t('charts.resetZoom')}
              onClick={() => handleResetZoom(chartRef)}
            >
              <RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />
            </button>
          )}

          {baseConfig && (
            <>
              <button
                type="button"
                className="btn ghost chart-tile-action"
                aria-label={t('charts.expandChart')}
                title={t('charts.expandChart')}
                onClick={() => setIsExpanded(true)}
              >
                <Maximize2 size={14} strokeWidth={1.5} aria-hidden="true" />
              </button>

              <button
                type="button"
                className="btn ghost chart-tile-action"
                aria-label={t('charts.exportPng')}
                title={t('charts.exportPng')}
                onClick={() => handleExportPng(chartRef)}
              >
                <Download size={14} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </>
          )}

          {canRemove && (
            <>
              <button
                type="button"
                className="btn ghost chart-tile-action"
                aria-label={t('charts.editGraphAria', { title: resolvedTitle })}
                title={t('charts.editGraphAria', { title: resolvedTitle })}
                onClick={() => onEdit?.(graph)}
              >
                <Pencil size={14} strokeWidth={1.5} aria-hidden="true" />
              </button>

              <button
                type="button"
                className="btn ghost chart-tile-delete"
                aria-label={t('charts.deleteGraphAria', { title: resolvedTitle })}
                onClick={() => onRemove?.(graph.id)}
              >
                <X size={15} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Responsive Chart.js canvas container or graceful zero-response empty state */}
      {!baseConfig || !interactiveOptions ? (
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
            ref={chartRef}
            key={`${graph.id}-${graph.chartStyle}-${resolvedConfig.xAxisKey}-${resolvedConfig.yAxisKey}-${resolvedConfig.aggregation}-${resolvedConfig.secondaryYAxisKey}-${theme}-${paletteSignature}`}
            type={baseConfig.chartType}
            data={baseConfig.data}
            options={interactiveOptions}
          />

          {/* Centered percentage readout overlaid cleanly inside the Donut cutout */}
          {graph.chartStyle === 'donut' && baseConfig.centerReadout && (
            <div className="donut-center-readout" aria-hidden="true">
              <span className="font-editorial donut-center-value tabular-nums">
                {baseConfig.centerReadout.value}
              </span>
              <span className="font-mono-label donut-center-label">
                {baseConfig.centerReadout.label}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Sleek Swiss selection chip shown when a bar, line point, or donut slice is clicked */}
      {selectedPoint && baseConfig && (
        <footer className="chart-selection-footer hairline-top">
          <div className="chart-selection-chip">
            <span className="font-mono-label chart-selection-kicker">
              {t('charts.selectedPoint')}
            </span>
            <span className="chart-selection-label">{selectedPoint.label}</span>
            <span className="font-mono-label chart-selection-metric tabular-nums">
              {selectedPoint.isCountSeries && selectedPoint.sharePct !== null
                ? `${selectedPoint.count} · ${selectedPoint.sharePct}%`
                : selectedPoint.count}
            </span>
            <button
              type="button"
              className="btn ghost chart-selection-clear"
              aria-label={t('charts.clearSelection')}
              onClick={() => setSelectedPoint(null)}
            >
              <X size={13} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        </footer>
      )}

      {/* Portaled Fullscreen Inspect `<dialog>` for detailed chart zoom/pan inspection */}
      {typeof document !== 'undefined' &&
        baseConfig &&
        interactiveOptions &&
        createPortal(
          <dialog
            ref={expandDialogRef}
            className="modal-dialog modal-dialog-chart bento-card elevated"
            aria-labelledby={expandHeadingId}
            onClose={() => setIsExpanded(false)}
            onPointerDown={handleDialogPointerDown}
            onPointerUp={handleDialogPointerUp}
            {...{ closedby: 'any' }}
          >
            <header className="modal-header hairline-bottom">
              <div className="modal-header-copy">
                <span className="mono-tag">{styleLabel}</span>
                <h1 id={expandHeadingId} className="font-editorial modal-title">
                  {resolvedTitle}
                </h1>
              </div>

              <div className="chart-tile-toolbar">
                {isZoomable && (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => handleResetZoom(expandedChartRef)}
                  >
                    <RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />
                    <span>{t('charts.resetZoom')}</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => handleExportPng(expandedChartRef)}
                >
                  <Download size={14} strokeWidth={1.5} aria-hidden="true" />
                  <span>{t('charts.exportPng')}</span>
                </button>

                <button
                  type="button"
                  className="btn ghost modal-close-btn"
                  aria-label={t('modal.closeLabel')}
                  autoFocus
                  onClick={() => expandDialogRef.current?.close()}
                >
                  <X size={17} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="modal-body chart-expand-body">
              {isExpanded && (
                <div
                  className={`chart-expand-canvas-wrap ${
                    graph.chartStyle === 'donut' ? 'is-donut' : ''
                  }`}
                >
                  <Chart
                    ref={expandedChartRef}
                    key={`expanded-${graph.id}-${graph.chartStyle}-${resolvedConfig.xAxisKey}-${resolvedConfig.yAxisKey}-${resolvedConfig.aggregation}-${resolvedConfig.secondaryYAxisKey}-${theme}-${paletteSignature}`}
                    type={baseConfig.chartType}
                    data={baseConfig.data}
                    options={interactiveOptions}
                  />
                </div>
              )}

              {selectedPoint && (
                <div className="chart-selection-chip">
                  <span className="font-mono-label chart-selection-kicker">
                    {t('charts.selectedPoint')}
                  </span>
                  <span className="chart-selection-label">
                    {selectedPoint.label}
                  </span>
                  <span className="font-mono-label chart-selection-metric tabular-nums">
                    {selectedPoint.isCountSeries && selectedPoint.sharePct !== null
                      ? `${selectedPoint.count} · ${selectedPoint.sharePct}%`
                      : selectedPoint.count}
                  </span>
                  <button
                    type="button"
                    className="btn ghost chart-selection-clear"
                    aria-label={t('charts.clearSelection')}
                    onClick={() => setSelectedPoint(null)}
                  >
                    <X size={13} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </dialog>,
          document.body
        )}
    </article>
  );
}
