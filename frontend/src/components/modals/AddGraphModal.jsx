/**
 * AddGraphModal.jsx — Flexible 1-Column & 2-Column Graph Builder (Add + Edit Modes)
 * Built on native `<dialog>` (`showModal()`, `closedby="any"` + coordinate fallback,
 * native `Escape`). Supports creating new Bento chart tiles and editing existing
 * graphs with full statistical aggregations (`count`, `avg`, `sum`, `median`, `std`,
 * `min`, `max`), optional Secondary Axis for Dual-Axis Trend charts, and Max Groups
 * truncation (`Top 8`, `Top 12`, `All`) persisted in `project_graphs.config`.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  BarChartHorizontal,
  Check,
  ChevronDown,
  PieChart,
  Plus,
  TrendingUp,
  X,
} from 'lucide-react';
import { useLang } from '../../context/LangContext.jsx';
import { getActiveColumns, resolveGraphConfig } from '../../lib/csvSchema.js';

const STYLE_OPTIONS = [
  { key: 'bar', Icon: BarChart3 },
  { key: 'horizontalBar', Icon: BarChartHorizontal },
  { key: 'donut', Icon: PieChart },
  { key: 'line', Icon: TrendingUp },
  { key: 'dualAxis', Icon: Activity },
];

const WIDTH_OPTIONS = [4, 6, 8, 12];

const NUMERIC_AGGREGATIONS = ['avg', 'sum', 'median', 'std', 'min', 'max'];

const MAX_GROUP_OPTIONS = [
  { value: 8, labelKey: 'modal.maxGroupsTop8' },
  { value: 12, labelKey: 'modal.maxGroupsTop12' },
  { value: 0, labelKey: 'modal.maxGroupsAll' },
];

export default function AddGraphModal({
  isOpen,
  onClose,
  onAdd,
  onUpdate,
  editingGraph = null,
  columns = [],
}) {
  const { t } = useLang();
  const isEditMode = Boolean(editingGraph);

  // All project-wide enabled columns can serve as X-Axis / Group By; only `number` columns can serve as numeric Y-Axis values
  const activeColumns = useMemo(
    () => getActiveColumns(columns),
    [columns]
  );
  const numericColumns = useMemo(
    () => activeColumns.filter((col) => col.type === 'number'),
    [activeColumns]
  );

  // Compute initial form defaults from `editingGraph` (Edit mode) or smart project defaults (Add mode)
  const initialState = useMemo(() => {
    if (editingGraph) {
      const resolved = resolveGraphConfig(editingGraph, columns);
      return {
        chartStyle: editingGraph.chartStyle || 'bar',
        colSpan: editingGraph.colSpan || 6,
        customTitle: editingGraph.customTitle || '',
        xAxisKey: resolved.xAxisKey,
        yAxisKey: resolved.yAxisKey,
        aggregation: resolved.aggregation,
        secondaryYAxisKey: resolved.secondaryYAxisKey,
        secondaryAggregation: resolved.secondaryAggregation,
        maxGroups: resolved.maxGroups,
      };
    }

    const firstCategory = activeColumns.find((col) => col.type === 'category');
    const defaultX = firstCategory?.key ?? activeColumns[0]?.key ?? '__session__';
    const defaultSecondaryY = numericColumns[0]?.key ?? '__count__';

    return {
      chartStyle: 'bar',
      colSpan: 6,
      customTitle: '',
      xAxisKey: defaultX,
      yAxisKey: '__count__',
      aggregation: 'count',
      secondaryYAxisKey: defaultSecondaryY,
      secondaryAggregation: defaultSecondaryY === '__count__' ? 'count' : 'avg',
      maxGroups: 0,
    };
  }, [editingGraph, columns, activeColumns, numericColumns]);

  // Controlled graph builder state (remounted fresh on each open via modal `key`)
  const [chartStyle, setChartStyle] = useState(initialState.chartStyle);
  const [colSpan, setColSpan] = useState(initialState.colSpan);
  const [customTitle, setCustomTitle] = useState(initialState.customTitle);
  const [xAxisKey, setXAxisKey] = useState(initialState.xAxisKey);
  const [yAxisKey, setYAxisKey] = useState(initialState.yAxisKey);
  const [aggregation, setAggregation] = useState(initialState.aggregation);
  const [secondaryYAxisKey, setSecondaryYAxisKey] = useState(
    initialState.secondaryYAxisKey
  );
  const [secondaryAggregation, setSecondaryAggregation] = useState(
    initialState.secondaryAggregation
  );
  const [maxGroups, setMaxGroups] = useState(initialState.maxGroups);

  // Keep selected axis keys valid if the underlying project schema changes
  const effectiveXAxisKey =
    xAxisKey === '__session__' || activeColumns.some((col) => col.key === xAxisKey)
      ? xAxisKey
      : '__session__';

  const effectiveYAxisKey =
    yAxisKey === '__count__' || numericColumns.some((col) => col.key === yAxisKey)
      ? yAxisKey
      : '__count__';

  const effectiveAggregation =
    effectiveYAxisKey === '__count__' ? 'count' : aggregation;

  const effectiveSecondaryYAxisKey =
    secondaryYAxisKey === '__count__' ||
    numericColumns.some((col) => col.key === secondaryYAxisKey)
      ? secondaryYAxisKey
      : '__count__';

  const effectiveSecondaryAggregation =
    effectiveSecondaryYAxisKey === '__count__' ? 'count' : secondaryAggregation;

  const showMaxGroups =
    chartStyle === 'donut' ||
    chartStyle === 'bar' ||
    chartStyle === 'horizontalBar';

  // Auto-generated fallback title preview shown in the Custom Title input placeholder
  const autoTitlePreview = useMemo(() => {
    const xLabel =
      effectiveXAxisKey === '__session__'
        ? t('modal.sessionsAxisShort')
        : activeColumns.find((col) => col.key === effectiveXAxisKey)?.label ||
          effectiveXAxisKey;

    if (effectiveYAxisKey === '__count__') {
      return effectiveXAxisKey === '__session__'
        ? t('charts.sessionVolumeTitle')
        : xLabel;
    }

    const yLabel =
      numericColumns.find((col) => col.key === effectiveYAxisKey)?.label ||
      effectiveYAxisKey;
    const aggShort = t(`charts.aggShort.${effectiveAggregation}`);
    return t('charts.autoTitleBy', { agg: aggShort, y: yLabel, x: xLabel });
  }, [
    effectiveXAxisKey,
    effectiveYAxisKey,
    effectiveAggregation,
    activeColumns,
    numericColumns,
    t,
  ]);

  // Stable IDs for accessible form labels and heading
  const headingId = useId();
  const xAxisId = useId();
  const yAxisId = useId();
  const aggId = useId();
  const secondaryYAxisId = useId();
  const secondaryAggId = useId();
  const maxGroupsId = useId();
  const titleId = useId();

  const dialogRef = useRef(null);
  const pressedOutsideRef = useRef(false);

  // Sync React `isOpen` boolean with native `<dialog>` modal lifecycle
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handleDialogClose = () => {
    onClose?.();
  };

  const handleExplicitClose = () => {
    if (dialogRef.current?.open) {
      dialogRef.current.close();
      return;
    }
    handleDialogClose();
  };

  // Pointer-coordinate light-dismiss fallback for browsers without `<dialog closedby>`
  const isPointerOutsideDialog = (event) => {
    const dialog = dialogRef.current;
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
      dialogRef.current?.close();
    }
    pressedOutsideRef.current = false;
  };

  // Adapt default maxGroups when switching to Donut in Add mode
  const handleChartStyleChange = (nextStyle) => {
    setChartStyle(nextStyle);
    if (!isEditMode && nextStyle === 'donut' && maxGroups === 0) {
      setMaxGroups(8);
    }
  };

  // Keep primary aggregation aligned with Response Count vs numeric column selection
  const handleYAxisChange = (nextYKey) => {
    setYAxisKey(nextYKey);
    if (nextYKey === '__count__') {
      setAggregation('count');
    } else if (aggregation === 'count') {
      setAggregation('avg');
    }
  };

  // Keep secondary aggregation aligned with Response Count vs numeric column selection
  const handleSecondaryYAxisChange = (nextSecKey) => {
    setSecondaryYAxisKey(nextSecKey);
    if (nextSecKey === '__count__') {
      setSecondaryAggregation('count');
    } else if (secondaryAggregation === 'count') {
      setSecondaryAggregation('avg');
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = {
      metricKey: effectiveXAxisKey,
      chartStyle,
      colSpan,
      customTitle: customTitle.trim(),
      config: {
        xAxisKey: effectiveXAxisKey,
        yAxisKey: effectiveYAxisKey,
        aggregation: effectiveAggregation,
        secondaryYAxisKey:
          chartStyle === 'dualAxis' ? effectiveSecondaryYAxisKey : '__count__',
        secondaryAggregation:
          chartStyle === 'dualAxis' ? effectiveSecondaryAggregation : 'count',
        maxGroups: showMaxGroups ? Number(maxGroups) : 0,
      },
    };

    if (isEditMode && editingGraph?.id) {
      onUpdate?.(editingGraph.id, payload);
    } else {
      onAdd?.(payload);
    }
    handleExplicitClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal-dialog bento-card elevated"
      aria-labelledby={headingId}
      onClose={handleDialogClose}
      onPointerDown={handleDialogPointerDown}
      onPointerUp={handleDialogPointerUp}
      {...{ closedby: 'any' }}
    >
      {/* Modal header */}
      <header className="modal-header hairline-bottom">
        <div className="modal-header-copy">
          <span className="mono-tag">{t('modal.addGraphKicker')}</span>
          <h1 id={headingId} className="font-editorial modal-title">
            {isEditMode ? t('modal.editGraphTitle') : t('modal.addGraphTitle')}
          </h1>
          <p className="modal-subtitle">
            {isEditMode ? t('modal.editGraphSubtitle') : t('modal.addGraphSubtitle')}
          </p>
        </div>

        <button
          type="button"
          className="btn ghost modal-close-btn"
          aria-label={t('modal.closeLabel')}
          onClick={handleExplicitClose}
        >
          <X size={17} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </header>

      {/* Controlled 1-column / 2-column graph configuration form */}
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-body">
          {/* 1. Chart Style (5 options) */}
          <fieldset className="form-fieldset">
            <legend className="form-label">{t('modal.styleLabel')}</legend>
            <div className="chart-style-grid">
              {STYLE_OPTIONS.map((option) => {
                const StyleIcon = option.Icon;
                return (
                  <label key={option.key} className="style-choice">
                    <input
                      type="radio"
                      name="chartStyle"
                      value={option.key}
                      className="visually-hidden"
                      checked={chartStyle === option.key}
                      onChange={() => handleChartStyleChange(option.key)}
                    />
                    <StyleIcon size={16} strokeWidth={1.5} aria-hidden="true" />
                    <span>{t(`charts.styles.${option.key}`)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* 2. Card Width (`4`, `6`, `8`, `12` columns) */}
          <fieldset className="form-fieldset">
            <legend className="form-label">{t('modal.widthLabel')}</legend>
            <div className="width-choice-grid">
              {WIDTH_OPTIONS.map((span) => (
                <label key={span} className="width-choice font-mono-label tabular-nums">
                  <input
                    type="radio"
                    name="colSpan"
                    value={span}
                    className="visually-hidden"
                    checked={colSpan === span}
                    onChange={() => setColSpan(span)}
                  />
                  <span>{t('modal.widthCols', { count: span })}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* 3. X-Axis / Group By + optional Max Groups selector */}
          <div className={showMaxGroups ? 'graph-axis-grid' : 'form-field'}>
            <div className="form-field">
              <label htmlFor={xAxisId} className="form-label">
                {t('modal.xAxisLabel')}
              </label>
              <div className="form-select-wrap">
                <select
                  id={xAxisId}
                  name="xAxisKey"
                  className="form-select"
                  autoFocus
                  value={effectiveXAxisKey}
                  onChange={(event) => setXAxisKey(event.target.value)}
                >
                  <option value="__session__">{t('modal.sessionsAxisOption')}</option>
                  {activeColumns.map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={15}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="form-select-chevron"
                />
              </div>
            </div>

            {showMaxGroups && (
              <div className="form-field">
                <label htmlFor={maxGroupsId} className="form-label">
                  {t('modal.maxGroupsLabel')}
                </label>
                <div className="form-select-wrap">
                  <select
                    id={maxGroupsId}
                    name="maxGroups"
                    className="form-select"
                    value={String(maxGroups)}
                    onChange={(event) => setMaxGroups(Number(event.target.value))}
                  >
                    {MAX_GROUP_OPTIONS.map((opt) => (
                      <option key={opt.value} value={String(opt.value)}>
                        {t(opt.labelKey)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={15}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="form-select-chevron"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. Y-Axis / Value + Statistical Aggregation */}
          <div className="graph-axis-grid">
            <div className="form-field">
              <label htmlFor={yAxisId} className="form-label">
                {t('modal.yAxisLabel')}
              </label>
              <div className="form-select-wrap">
                <select
                  id={yAxisId}
                  name="yAxisKey"
                  className="form-select"
                  value={effectiveYAxisKey}
                  onChange={(event) => handleYAxisChange(event.target.value)}
                >
                  <option value="__count__">{t('modal.responseCountOption')}</option>
                  {numericColumns.map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={15}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="form-select-chevron"
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor={aggId} className="form-label">
                {t('modal.aggregationLabel')}
              </label>
              <div className="form-select-wrap">
                <select
                  id={aggId}
                  name="aggregation"
                  className="form-select"
                  disabled={effectiveYAxisKey === '__count__'}
                  value={effectiveAggregation}
                  onChange={(event) => setAggregation(event.target.value)}
                >
                  {effectiveYAxisKey === '__count__' ? (
                    <option value="count">{t('charts.agg.count')}</option>
                  ) : (
                    NUMERIC_AGGREGATIONS.map((aggKey) => (
                      <option key={aggKey} value={aggKey}>
                        {t(`charts.agg.${aggKey}`)}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown
                  size={15}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="form-select-chevron"
                />
              </div>
            </div>
          </div>

          {/* 5. Secondary Axis (shown only for Dual-Axis Trend charts) */}
          {chartStyle === 'dualAxis' && (
            <div className="graph-secondary-box">
              <span className="font-mono-label graph-secondary-kicker">
                {t('modal.secondaryAxisSection')}
              </span>
              <div className="graph-axis-grid">
                <div className="form-field">
                  <label htmlFor={secondaryYAxisId} className="form-label">
                    {t('modal.secondaryYAxisLabel')}
                  </label>
                  <div className="form-select-wrap">
                    <select
                      id={secondaryYAxisId}
                      name="secondaryYAxisKey"
                      className="form-select"
                      value={effectiveSecondaryYAxisKey}
                      onChange={(event) =>
                        handleSecondaryYAxisChange(event.target.value)
                      }
                    >
                      <option value="__count__">{t('modal.responseCountOption')}</option>
                      {numericColumns.map((col) => (
                        <option key={col.key} value={col.key}>
                          {col.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={15}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="form-select-chevron"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor={secondaryAggId} className="form-label">
                    {t('modal.aggregationLabel')}
                  </label>
                  <div className="form-select-wrap">
                    <select
                      id={secondaryAggId}
                      name="secondaryAggregation"
                      className="form-select"
                      disabled={effectiveSecondaryYAxisKey === '__count__'}
                      value={effectiveSecondaryAggregation}
                      onChange={(event) => setSecondaryAggregation(event.target.value)}
                    >
                      {effectiveSecondaryYAxisKey === '__count__' ? (
                        <option value="count">{t('charts.agg.count')}</option>
                      ) : (
                        NUMERIC_AGGREGATIONS.map((aggKey) => (
                          <option key={aggKey} value={aggKey}>
                            {t(`charts.agg.${aggKey}`)}
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown
                      size={15}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="form-select-chevron"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. Optional Custom Title with auto-generated fallback preview */}
          <div className="form-field">
            <div className="form-label-row">
              <label htmlFor={titleId} className="form-label">
                {t('modal.customTitleLabel')}
              </label>
              <span className="font-mono-label form-badge">
                {t('modal.optionalBadge')}
              </span>
            </div>
            <input
              id={titleId}
              name="customTitle"
              type="text"
              maxLength={80}
              className="form-input"
              placeholder={autoTitlePreview}
              value={customTitle}
              onChange={(event) => setCustomTitle(event.target.value)}
            />
          </div>
        </div>

        {/* Modal action footer */}
        <footer className="modal-footer hairline-top">
          <button type="button" className="btn" onClick={handleExplicitClose}>
            <span>{t('modal.cancel')}</span>
          </button>
          <button type="submit" className="btn primary">
            {isEditMode ? (
              <Check size={15} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Plus size={15} strokeWidth={1.5} aria-hidden="true" />
            )}
            <span>
              {isEditMode ? t('modal.saveGraphChanges') : t('modal.createGraph')}
            </span>
          </button>
        </footer>
      </form>
    </dialog>
  );
}
