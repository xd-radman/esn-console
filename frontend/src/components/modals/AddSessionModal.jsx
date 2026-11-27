/**
 * AddSessionModal.jsx — Accessible New Session Modal Dialog
 * Built on native `<dialog>` (`showModal()`, `closedby="any"` + pointer fallback,
 * native `Escape` dismissal, and automatic focus restoration). Validates a
 * required session title and date range (`endDate >= startDate`) before
 * returning `{ title, startDate, endDate }` to `ProjectDashboard`.
 */

import { useEffect, useId, useRef, useState } from 'react';
import Papa from 'papaparse';
import { AlertCircle, FileSpreadsheet, Plus, Upload, X } from 'lucide-react';
import { useLang } from '../../context/LangContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { validateCSVHeadersAgainstSchema } from '../../lib/csvSchema.js';

/**
 * Returns today's local calendar date formatted as `YYYY-MM-DD` for `<input type="date">`.
 */
function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AddSessionModal({
  isOpen,
  onClose,
  onAdd,
  columns = [],
  canAttachCsv = false,
}) {
  const { t } = useLang();
  const { showToast } = useToast();

  // Controlled input state for session title, ISO calendar dates, and optional validated CSV
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(getTodayIsoDate);
  const [endDate, setEndDate] = useState(getTodayIsoDate);
  const [csvAttachment, setCsvAttachment] = useState(null);

  // Field-level validation messages shown on blur/submit and cleared on edit
  const [titleError, setTitleError] = useState('');
  const [dateError, setDateError] = useState('');

  // Stable IDs for accessible label, heading, and error associations
  const headingId = useId();
  const titleId = useId();
  const titleErrorId = useId();
  const startDateId = useId();
  const endDateId = useId();
  const dateErrorId = useId();

  // Refs for native `<dialog>`, validation focus routing, file input, and backdrop fallback
  const dialogRef = useRef(null);
  const titleInputRef = useRef(null);
  const endDateInputRef = useRef(null);
  const csvFileInputRef = useRef(null);
  const pressedOutsideRef = useRef(false);

  // Sync React `isOpen` boolean with native `dialog.showModal()` / `dialog.close()`
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

  // Reset form fields cleanly whenever the dialog finishes closing
  const resetForm = () => {
    const today = getTodayIsoDate();
    setTitle('');
    setStartDate(today);
    setEndDate(today);
    setCsvAttachment(null);
    setTitleError('');
    setDateError('');
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

  // Parse and strictly validate an optional CSV file against `project.config.columns`
  const handleCsvAttach = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    try {
      const csvText = await file.text();
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });
      const headers = (parsed.meta?.fields ?? [])
        .map((field) => String(field ?? '').trim())
        .filter(Boolean);
      const rows = Array.isArray(parsed.data) ? parsed.data : [];

      if (headers.length === 0 || rows.length === 0) {
        showToast(t('toast.csvEmpty'), 'error');
        return;
      }

      const { valid, missingColumns, extraColumns } =
        validateCSVHeadersAgainstSchema(headers, columns);

      if (!valid) {
        setCsvAttachment(null);
        showToast(
          t('dashboard.csvMissingColumns', {
            columns: missingColumns.join(', '),
          }),
          'error'
        );
        return;
      }

      setCsvAttachment({
        fileName: file.name,
        rows,
        extraColumns,
      });
    } catch {
      showToast(t('dashboard.csvUploadError'), 'error');
    }
  };

  // Validate title, required dates, and chronological order (`endDate >= startDate`)
  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError(t('modal.sessionTitleRequired'));
      titleInputRef.current?.focus();
      return;
    }

    if (!startDate || !endDate) {
      setDateError(t('modal.dateRequired'));
      endDateInputRef.current?.focus();
      return;
    }

    if (endDate < startDate) {
      setDateError(t('modal.dateRangeError'));
      endDateInputRef.current?.focus();
      return;
    }

    onAdd?.({
      title: trimmedTitle,
      startDate,
      endDate,
      csvAttachment,
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
          <span className="mono-tag">{t('modal.addSessionKicker')}</span>
          <h1 id={headingId} className="font-editorial modal-title">
            {t('modal.addSessionTitle')}
          </h1>
          <p className="modal-subtitle">{t('modal.addSessionSubtitle')}</p>
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

      {/* Controlled session creation form */}
      <form className="modal-form" onSubmit={handleSubmit} noValidate>
        <div className="modal-body">
          {/* Required Session Title */}
          <div className="form-field">
            <div className="form-label-row">
              <label htmlFor={titleId} className="form-label">
                {t('modal.sessionTitleLabel')}
              </label>
              <span className="font-mono-label form-badge required">
                {t('modal.requiredBadge')}
              </span>
            </div>

            <input
              ref={titleInputRef}
              id={titleId}
              name="sessionTitle"
              type="text"
              required
              maxLength={80}
              autoFocus
              className={`form-input ${titleError ? 'is-invalid' : ''}`}
              placeholder={t('modal.sessionTitlePlaceholder')}
              value={title}
              aria-invalid={Boolean(titleError)}
              aria-describedby={titleError ? titleErrorId : undefined}
              onChange={(event) => {
                setTitle(event.target.value);
                if (titleError && event.target.value.trim()) {
                  setTitleError('');
                }
              }}
            />

            {titleError && (
              <p id={titleErrorId} className="form-error" role="alert">
                <AlertCircle size={14} strokeWidth={1.5} aria-hidden="true" />
                <span>{titleError}</span>
              </p>
            )}
          </div>

          {/* Start & End calendar date inputs with `endDate >= startDate` validation */}
          <div className="form-date-row">
            <div className="form-field">
              <label htmlFor={startDateId} className="form-label">
                {t('modal.startDate')}
              </label>
              <input
                id={startDateId}
                name="startDate"
                type="date"
                required
                className={`form-input ${dateError ? 'is-invalid' : ''}`}
                value={startDate}
                aria-invalid={Boolean(dateError)}
                aria-describedby={dateError ? dateErrorId : undefined}
                onChange={(event) => {
                  const nextStart = event.target.value;
                  setStartDate(nextStart);
                  if (dateError && nextStart && endDate && endDate >= nextStart) {
                    setDateError('');
                  }
                }}
              />
            </div>

            <div className="form-field">
              <label htmlFor={endDateId} className="form-label">
                {t('modal.endDate')}
              </label>
              <input
                ref={endDateInputRef}
                id={endDateId}
                name="endDate"
                type="date"
                required
                min={startDate || undefined}
                className={`form-input ${dateError ? 'is-invalid' : ''}`}
                value={endDate}
                aria-invalid={Boolean(dateError)}
                aria-describedby={dateError ? dateErrorId : undefined}
                onChange={(event) => {
                  const nextEnd = event.target.value;
                  setEndDate(nextEnd);
                  if (dateError && startDate && nextEnd && nextEnd >= startDate) {
                    setDateError('');
                  }
                }}
              />
            </div>
          </div>

          {dateError && (
            <p id={dateErrorId} className="form-error" role="alert">
              <AlertCircle size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>{dateError}</span>
            </p>
          )}

          {/* Optional schema-validated CSV attachment for immediate import into this session */}
          {canAttachCsv && columns.length > 0 && (
            <div className="form-field">
              <div className="form-label-row">
                <span className="form-label">{t('modal.attachCsvLabel')}</span>
                <span className="font-mono-label form-badge">
                  {t('modal.optionalBadge')}
                </span>
              </div>

              <input
                ref={csvFileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="visually-hidden"
                onChange={handleCsvAttach}
              />

              {csvAttachment ? (
                <div className="session-csv-chip">
                  <FileSpreadsheet size={15} strokeWidth={1.5} aria-hidden="true" />
                  <span className="session-csv-chip-name">
                    {csvAttachment.fileName}
                  </span>
                  <span className="font-mono-label session-csv-chip-meta tabular-nums">
                    {t('modal.csvRowsReady', { count: csvAttachment.rows.length })}
                  </span>
                  <button
                    type="button"
                    className="btn ghost chart-selection-clear"
                    aria-label={t('modal.removeCsvAria')}
                    onClick={() => setCsvAttachment(null)}
                  >
                    <X size={13} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn session-csv-attach-btn"
                  onClick={() => csvFileInputRef.current?.click()}
                >
                  <Upload size={14} strokeWidth={1.5} aria-hidden="true" />
                  <span>{t('modal.attachCsvBtn')}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal action footer */}
        <footer className="modal-footer hairline-top">
          <button type="button" className="btn" onClick={handleExplicitClose}>
            <span>{t('modal.cancel')}</span>
          </button>

          <button type="submit" className="btn primary">
            <Plus size={15} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('modal.createSession')}</span>
          </button>
        </footer>
      </form>
    </dialog>
  );
}
