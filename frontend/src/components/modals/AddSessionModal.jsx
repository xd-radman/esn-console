/**
 * AddSessionModal.jsx — Accessible New Session Modal Dialog
 * Built on native `<dialog>` (`showModal()`, `closedby="any"` + pointer fallback,
 * native `Escape` dismissal, and automatic focus restoration). Validates a
 * required session title and date range (`endDate >= startDate`) before
 * returning `{ title, startDate, endDate }` to `ProjectDashboard`.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, Plus, X } from 'lucide-react';
import { useLang } from '../../context/LangContext.jsx';

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

export default function AddSessionModal({ isOpen, onClose, onAdd }) {
  const { t } = useLang();

  // Controlled input state for session title and ISO calendar dates
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(getTodayIsoDate);
  const [endDate, setEndDate] = useState(getTodayIsoDate);

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

  // Refs for native `<dialog>`, validation focus routing, and backdrop fallback
  const dialogRef = useRef(null);
  const titleInputRef = useRef(null);
  const endDateInputRef = useRef(null);
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
