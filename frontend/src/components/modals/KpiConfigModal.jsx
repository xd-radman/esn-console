/**
 * KpiConfigModal.jsx — Customizable KPI Box Creator & Editor Modal
 * Portaled to `document.body` on native `<dialog>` (`showModal()`, `closedby="any"`
 * + Safari coordinate fallback, native `Escape`). Supports both Add and Edit KPI
 * modes with Title (auto-suggested until manually edited), optional Lucide icon
 * picker (`None` + 10 monochrome icons), Data Source column selector, dynamic
 * Operation selector filtered by column type, conditional Target Value input
 * with datalist autocomplete (`value_pct`), and a live preview tile.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Hash,
  Percent,
  Plus,
  Slash,
  Star,
  Tag,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { useLang } from '../../context/LangContext.jsx';
import { computeKpiValue, getActiveColumns } from '../../lib/csvSchema.js';

// Shared icon registry exported for `SummaryStrip.jsx` so tile & picker icons stay in sync
// eslint-disable-next-line react-refresh/only-export-components
export const KPI_ICON_OPTIONS = [
  { key: 'none', Icon: Slash },
  { key: 'users', Icon: Users },
  { key: 'hash', Icon: Hash },
  { key: 'percent', Icon: Percent },
  { key: 'trending-up', Icon: TrendingUp },
  { key: 'bar-chart-3', Icon: BarChart3 },
  { key: 'activity', Icon: Activity },
  { key: 'star', Icon: Star },
  { key: 'check-circle-2', Icon: CheckCircle2 },
  { key: 'tag', Icon: Tag },
  { key: 'clock', Icon: Clock },
];

// eslint-disable-next-line react-refresh/only-export-components
export const KPI_ICON_MAP = Object.fromEntries(
  KPI_ICON_OPTIONS.filter((item) => item.key !== 'none').map((item) => [
    item.key,
    item.Icon,
  ])
);

const NUMERIC_OPS = [
  'avg',
  'median',
  'std',
  'min',
  'max',
  'sum',
  'non_empty_count',
];

const CATEGORY_TEXT_OPS = [
  'top_value',
  'unique_count',
  'value_pct',
  'non_empty_count',
];

/**
 * Returns the list of valid KPI operations for the selected column source.
 */
function getOperationsForColumn(columnKey, columns) {
  if (!columnKey || columnKey === '__all__') {
    return ['total_count'];
  }
  const col = (columns ?? []).find((item) => item?.key === columnKey);
  if (col?.type === 'number') {
    return NUMERIC_OPS;
  }
  return CATEGORY_TEXT_OPS;
}

/**
 * Builds a clean auto-suggested KPI title from the chosen column & operation.
 */
function buildSuggestedTitle(columnKey, operation, columns, t) {
  if (columnKey === '__all__' || operation === 'total_count') {
    return t('kpi.totalResponses');
  }
  const col = (columns ?? []).find((item) => item?.key === columnKey);
  const colLabel = col?.label || columnKey;
  const opLabel = t(`kpi.ops.${operation}`);
  return `${colLabel} · ${opLabel}`;
}

export default function KpiConfigModal({
  isOpen,
  onClose,
  onSave,
  initialKpi = null,
  columns = [],
  responses = [],
}) {
  const { t } = useLang();

  const activeColumns = useMemo(
    () => getActiveColumns(columns),
    [columns]
  );

  const isEditMode = Boolean(initialKpi);

  // Controlled KPI builder state initialized from `initialKpi` (Edit) or defaults (Add)
  const [columnKey, setColumnKey] = useState(
    () => initialKpi?.columnKey ?? '__all__'
  );
  const [operation, setOperation] = useState(
    () => initialKpi?.operation ?? 'total_count'
  );
  const [targetValue, setTargetValue] = useState(
    () => initialKpi?.targetValue ?? ''
  );
  const [icon, setIcon] = useState(() => initialKpi?.icon ?? 'users');
  const [title, setTitle] = useState(
    () =>
      initialKpi?.title ??
      buildSuggestedTitle('__all__', 'total_count', activeColumns, t)
  );
  const [hasCustomTitle, setHasCustomTitle] = useState(Boolean(initialKpi));

  const headingId = useId();
  const titleId = useId();
  const columnId = useId();
  const operationId = useId();
  const targetId = useId();
  const datalistId = useId();

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

  const validOperations = useMemo(
    () => getOperationsForColumn(columnKey, activeColumns),
    [columnKey, activeColumns]
  );

  const effectiveOperation = validOperations.includes(operation)
    ? operation
    : validOperations[0];

  // Collect unique non-empty values for `targetValue` datalist suggestions
  const uniqueColumnValues = useMemo(() => {
    if (effectiveOperation !== 'value_pct' || !columnKey || columnKey === '__all__') {
      return [];
    }
    const seen = new Map();
    for (const row of responses) {
      const raw = row?.extra_data?.[columnKey];
      const trimmed = raw === null || raw === undefined ? '' : String(raw).trim();
      if (!trimmed) {
        continue;
      }
      const norm = trimmed.toLowerCase();
      if (!seen.has(norm)) {
        seen.set(norm, trimmed);
      }
    }
    return Array.from(seen.values()).slice(0, 40);
  }, [effectiveOperation, columnKey, responses]);

  // Live preview computed against the current session's filtered responses
  const previewResult = useMemo(
    () =>
      computeKpiValue(
        {
          columnKey,
          operation: effectiveOperation,
          targetValue,
        },
        responses,
        activeColumns
      ),
    [columnKey, effectiveOperation, targetValue, responses, activeColumns]
  );

  const handleExplicitClose = () => {
    if (dialogRef.current?.open) {
      dialogRef.current.close();
      return;
    }
    onClose?.();
  };

  // Safari coordinate-based backdrop dismiss fallback
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

  // Update column selection, auto-adjust valid operation, and auto-suggest title
  const handleColumnChange = (nextColumnKey) => {
    const nextOps = getOperationsForColumn(nextColumnKey, activeColumns);
    const nextOp = nextOps.includes(operation) ? operation : nextOps[0];
    setColumnKey(nextColumnKey);
    setOperation(nextOp);
    setTargetValue('');
    if (!hasCustomTitle) {
      setTitle(buildSuggestedTitle(nextColumnKey, nextOp, activeColumns, t));
    }
  };

  const handleOperationChange = (nextOp) => {
    setOperation(nextOp);
    if (!hasCustomTitle) {
      setTitle(buildSuggestedTitle(columnKey, nextOp, activeColumns, t));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }
    if (effectiveOperation === 'value_pct' && !targetValue.trim()) {
      return;
    }

    onSave?.({
      id:
        initialKpi?.id ||
        `kpi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      title: trimmedTitle,
      icon: icon || 'none',
      columnKey,
      operation: effectiveOperation,
      targetValue: effectiveOperation === 'value_pct' ? targetValue.trim() : '',
    });
    handleExplicitClose();
  };

  const PreviewIcon = icon !== 'none' ? KPI_ICON_MAP[icon] ?? null : null;
  const canSubmit =
    title.trim().length > 0 &&
    (effectiveOperation !== 'value_pct' || targetValue.trim().length > 0);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      className="modal-dialog modal-dialog-project bento-card elevated"
      aria-labelledby={headingId}
      onClose={onClose}
      onPointerDown={handleDialogPointerDown}
      onPointerUp={handleDialogPointerUp}
      {...{ closedby: 'any' }}
    >
      <header className="modal-header hairline-bottom">
        <div className="modal-header-copy">
          <span className="mono-tag">{t('kpi.modalKicker')}</span>
          <h1 id={headingId} className="font-editorial modal-title">
            {isEditMode ? t('kpi.editTitle') : t('kpi.addTitle')}
          </h1>
          <p className="modal-subtitle">{t('kpi.modalSubtitle')}</p>
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

      <form className="modal-form" onSubmit={handleSubmit} noValidate>
        <div className="modal-body">
          {/* Live KPI Preview */}
          <div className="kpi-preview-box">
            <span className="font-mono-label kpi-preview-kicker">
              {t('kpi.livePreview')}
            </span>
            <div className="kpi-preview-tile">
              <span className="font-mono-label dashboard-kpi-label">
                {PreviewIcon && (
                  <PreviewIcon size={14} strokeWidth={1.5} aria-hidden="true" />
                )}
                <span>{title.trim() || t('kpi.titlePlaceholder')}</span>
              </span>
              <p className="font-editorial dashboard-kpi-value tabular-nums">
                <span>{previewResult.displayValue}</span>
                {previewResult.subtext && (
                  <span className="dashboard-kpi-unit">
                    {previewResult.subtext}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Data Source / Column selector */}
          <div className="form-field">
            <label htmlFor={columnId} className="form-label">
              {t('kpi.dataSourceLabel')}
            </label>
            <div className="form-select-wrap">
              <select
                id={columnId}
                className="form-select"
                value={columnKey}
                onChange={(event) => handleColumnChange(event.target.value)}
              >
                <option value="__all__">{t('kpi.allResponsesOption')}</option>
                {activeColumns.map((col) => (
                  <option key={col.key} value={col.key}>
                    {col.label} ({t(`modal.colTypes.${col.type}`)})
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

          {/* Operation / Calculation selector dynamically filtered by column type */}
          <div className="form-field">
            <label htmlFor={operationId} className="form-label">
              {t('kpi.operationLabel')}
            </label>
            <div className="form-select-wrap">
              <select
                id={operationId}
                className="form-select"
                value={effectiveOperation}
                onChange={(event) => handleOperationChange(event.target.value)}
              >
                {validOperations.map((opKey) => (
                  <option key={opKey} value={opKey}>
                    {t(`kpi.ops.${opKey}`)}
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

          {/* Conditional Target Value input with datalist autocomplete for `value_pct` */}
          {effectiveOperation === 'value_pct' && (
            <div className="form-field">
              <div className="form-label-row">
                <label htmlFor={targetId} className="form-label">
                  {t('kpi.targetValueLabel')}
                </label>
                <span className="font-mono-label form-badge required">
                  {t('modal.requiredBadge')}
                </span>
              </div>
              <input
                id={targetId}
                type="text"
                list={datalistId}
                className="form-input"
                placeholder={t('kpi.targetValuePlaceholder')}
                value={targetValue}
                onChange={(event) => setTargetValue(event.target.value)}
              />
              <datalist id={datalistId}>
                {uniqueColumnValues.map((val) => (
                  <option key={val} value={val} />
                ))}
              </datalist>
            </div>
          )}

          {/* Required KPI Title */}
          <div className="form-field">
            <div className="form-label-row">
              <label htmlFor={titleId} className="form-label">
                {t('kpi.titleLabel')}
              </label>
              <span className="font-mono-label form-badge required">
                {t('modal.requiredBadge')}
              </span>
            </div>
            <input
              id={titleId}
              type="text"
              maxLength={48}
              required
              className="form-input"
              placeholder={t('kpi.titlePlaceholder')}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setHasCustomTitle(true);
              }}
            />
          </div>

          {/* Optional Lucide Icon Picker (`None` + 10 monochrome icons) */}
          <fieldset className="form-fieldset">
            <legend className="form-label">{t('kpi.iconLabel')}</legend>
            <div className="kpi-icon-grid">
              {KPI_ICON_OPTIONS.map((item) => {
                const IconComp = item.Icon;
                return (
                  <label key={item.key} className="icon-choice kpi-icon-choice">
                    <input
                      type="radio"
                      name="kpiIcon"
                      value={item.key}
                      className="visually-hidden"
                      checked={icon === item.key}
                      onChange={() => setIcon(item.key)}
                    />
                    <IconComp size={16} strokeWidth={1.5} aria-hidden="true" />
                    <span className="icon-choice-label">
                      {t(`kpi.icons.${item.key}`)}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>

        <footer className="modal-footer hairline-top">
          <button type="button" className="btn" onClick={handleExplicitClose}>
            <span>{t('modal.cancel')}</span>
          </button>

          <button type="submit" className="btn primary" disabled={!canSubmit}>
            {isEditMode ? (
              <>
                <Check size={15} strokeWidth={1.5} aria-hidden="true" />
                <span>{t('settings.saveBtn')}</span>
              </>
            ) : (
              <>
                <Plus size={15} strokeWidth={1.5} aria-hidden="true" />
                <span>{t('kpi.addBtn')}</span>
              </>
            )}
          </button>
        </footer>
      </form>
    </dialog>,
    document.body
  );
}
