/**
 * AddGraphModal.jsx — Accessible Graph Tile Configuration Modal
 * Built on native `<dialog>` (`showModal()`, `closedby="any"` + coordinate fallback,
 * native `Escape`). Lets organizers pick a survey Metric, Chart Style (5 options),
 * 12-column grid Column Width (`4`, `6`, `8`, `12`), and Optional Custom Title.
 */

import { useEffect, useId, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  BarChartHorizontal,
  ChevronDown,
  PieChart,
  Plus,
  TrendingUp,
  X,
} from 'lucide-react';
import { useLang } from '../../context/LangContext.jsx';

const METRIC_OPTIONS = [
  'score',
  'outcome',
  'comfort',
  'cat1',
  'cat2',
  'sessionTrend',
];

const STYLE_OPTIONS = [
  { key: 'bar', Icon: BarChart3 },
  { key: 'horizontalBar', Icon: BarChartHorizontal },
  { key: 'donut', Icon: PieChart },
  { key: 'line', Icon: TrendingUp },
  { key: 'dualAxis', Icon: Activity },
];

const WIDTH_OPTIONS = [4, 6, 8, 12];

export default function AddGraphModal({ isOpen, onClose, onAdd }) {
  const { t } = useLang();

  // Controlled graph builder state
  const [metricKey, setMetricKey] = useState('score');
  const [chartStyle, setChartStyle] = useState('bar');
  const [colSpan, setColSpan] = useState(6);
  const [customTitle, setCustomTitle] = useState('');

  // Stable IDs for accessible labels and modal heading
  const headingId = useId();
  const metricId = useId();
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

  // Reset form defaults cleanly when the dialog closes
  const resetForm = () => {
    setMetricKey('score');
    setChartStyle('bar');
    setColSpan(6);
    setCustomTitle('');
  };

  const handleDialogClose = () => {
    resetForm();
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

  const handleSubmit = (event) => {
    event.preventDefault();
    onAdd?.({
      metricKey,
      chartStyle,
      colSpan,
      customTitle: customTitle.trim(),
    });
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
            {t('modal.addGraphTitle')}
          </h1>
          <p className="modal-subtitle">{t('modal.addGraphSubtitle')}</p>
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

      {/* Controlled graph configuration form */}
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-body">
          {/* Metric selector */}
          <div className="form-field">
            <label htmlFor={metricId} className="form-label">
              {t('modal.metricLabel')}
            </label>
            <div className="form-select-wrap">
              <select
                id={metricId}
                name="metricKey"
                className="form-select"
                autoFocus
                value={metricKey}
                onChange={(event) => setMetricKey(event.target.value)}
              >
                {METRIC_OPTIONS.map((key) => (
                  <option key={key} value={key}>
                    {t(`charts.metrics.${key}`)}
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

          {/* 5-option Chart Style radio grid */}
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
                      onChange={() => setChartStyle(option.key)}
                    />
                    <StyleIcon size={16} strokeWidth={1.5} aria-hidden="true" />
                    <span>{t(`charts.styles.${option.key}`)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* 12-column grid width radio group (`4`, `6`, `8`, `12`) */}
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

          {/* Optional Custom Title */}
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
              maxLength={60}
              className="form-input"
              placeholder={t('modal.customTitlePlaceholder')}
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
            <Plus size={15} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('modal.createGraph')}</span>
          </button>
        </footer>
      </form>
    </dialog>
  );
}
