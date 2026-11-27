/**
 * ProjectColumnsModal.jsx — Post-Creation Project Column Schema Editor
 * Portaled to `document.body` on native `<dialog>` (`showModal()`, `closedby="any"`
 * + Safari coordinate fallback, native `Escape`). Lets managers (`manage_projects`)
 * add, rename, re-type, or remove columns in `project.config.columns` while
 * preserving original internal `key`s on renamed columns so existing
 * `responses.extra_data` and charts never break.
 * Runs `validateSchemaChanges()` on save:
 * - Hard errors block saving and display inline.
 * - Impact warnings switch to an inline confirmation panel with Cancel / Confirm & Save Anyway.
 * - Clean edits save immediately via `updateProjectColumns()` and fire a bottom-right toast.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  LoaderCircle,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useLang } from '../../context/LangContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  slugifyColumnKey,
  validateSchemaChanges,
} from '../../lib/csvSchema.js';

/**
 * Clones saved `project.config.columns` into editable staged rows with stable `_uid`s.
 */
function buildInitialStagedColumns(columns = []) {
  return (columns ?? []).map((col, idx) => ({
    _uid: `existing_${idx}_${col.key}`,
    key: col.key,
    label: col.label ?? '',
    type: col.type ?? 'text',
    enabled: col.enabled !== false,
    isNew: false,
  }));
}

function createNewStagedColumn() {
  return {
    _uid: `new_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    key: null,
    label: '',
    type: 'category',
    enabled: true,
    isNew: true,
  };
}

export default function ProjectColumnsModal({
  isOpen,
  onClose,
  project,
  graphs = [],
  responses = [],
  onSave,
}) {
  const { t } = useLang();
  const { showToast } = useToast();

  const savedColumns = project?.config?.columns ?? [];

  // Staged column rows, inline hard errors, pending warning confirmation state, and save lock
  const [stagedColumns, setStagedColumns] = useState(() =>
    buildInitialStagedColumns(savedColumns)
  );
  const [validationErrors, setValidationErrors] = useState([]);
  const [pendingWarnings, setPendingWarnings] = useState([]);
  const [pendingFinalColumns, setPendingFinalColumns] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const headingId = useId();
  const dialogRef = useRef(null);
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

  // Reset staged edits and warnings when the modal closes
  const handleDialogClose = () => {
    setStagedColumns(buildInitialStagedColumns(savedColumns));
    setValidationErrors([]);
    setPendingWarnings([]);
    setPendingFinalColumns(null);
    setIsSaving(false);
    onClose?.();
  };

  const handleExplicitClose = () => {
    if (dialogRef.current?.open) {
      dialogRef.current.close();
      return;
    }
    handleDialogClose();
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

  // Mutate a staged column row and clear stale errors/warnings
  const handleUpdateRow = (uid, field, value) => {
    setValidationErrors([]);
    setPendingWarnings([]);
    setPendingFinalColumns(null);
    setStagedColumns((prev) =>
      prev.map((col) => (col._uid === uid ? { ...col, [field]: value } : col))
    );
  };

  const handleRemoveRow = (uid) => {
    setValidationErrors([]);
    setPendingWarnings([]);
    setPendingFinalColumns(null);
    setStagedColumns((prev) => prev.filter((col) => col._uid !== uid));
  };

  const handleAddRow = () => {
    setValidationErrors([]);
    setPendingWarnings([]);
    setPendingFinalColumns(null);
    setStagedColumns((prev) => [...prev, createNewStagedColumn()]);
  };

  // Commit prepared columns to Supabase via `onSave`, close modal, and toast on success
  const commitSave = async (finalColumns) => {
    setIsSaving(true);
    try {
      const ok = await onSave?.(finalColumns);
      if (ok) {
        showToast(t('schemaModal.savedToast'), 'success');
        handleExplicitClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Run smart pre-save validation: preserve existing `key`s, generate keys for new columns
  const handleAttemptSave = async (event) => {
    event.preventDefault();
    setValidationErrors([]);

    // Preserve all existing keys first so newly generated keys never collide with them
    const usedKeys = new Set(
      stagedColumns.map((col) => col.key).filter(Boolean)
    );

    const preparedColumns = stagedColumns.map((col) => {
      const trimmedLabel = String(col.label ?? '').trim();
      let resolvedKey = col.key;
      if (!resolvedKey) {
        resolvedKey = slugifyColumnKey(trimmedLabel || 'column', usedKeys);
        usedKeys.add(resolvedKey);
      }
      return {
        key: resolvedKey,
        label: trimmedLabel,
        type: col.type,
        enabled: col.enabled !== false,
      };
    });

    const { errors, warnings } = validateSchemaChanges(
      savedColumns,
      preparedColumns,
      graphs,
      responses,
      project?.config?.kpis ?? []
    );

    // 1. Hard errors: block save and display inline
    if (errors.length > 0) {
      setValidationErrors(errors);
      setPendingWarnings([]);
      setPendingFinalColumns(null);
      return;
    }

    // 2. Impact warnings: pause and ask for explicit confirmation
    if (warnings.length > 0) {
      setPendingWarnings(warnings);
      setPendingFinalColumns(preparedColumns);
      return;
    }

    // 3. Clean save: persist immediately
    await commitSave(preparedColumns);
  };

  const activeCount = stagedColumns.filter(
    (col) => col.type !== 'ignore' && col.enabled !== false
  ).length;
  const isConfirmingWarnings = pendingWarnings.length > 0 && pendingFinalColumns !== null;

  if (typeof document === 'undefined' || !project) {
    return null;
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      className="modal-dialog modal-dialog-project bento-card elevated"
      aria-labelledby={headingId}
      onClose={handleDialogClose}
      onPointerDown={handleDialogPointerDown}
      onPointerUp={handleDialogPointerUp}
      {...{ closedby: 'any' }}
    >
      {/* Modal header */}
      <header className="modal-header hairline-bottom">
        <div className="modal-header-copy">
          <div className="team-header-tags">
            <span className="mono-tag">{t('schemaModal.kicker')}</span>
            <span className="font-mono-label team-count-tag tabular-nums">
              {t('schemaModal.activeTotalCount', {
                active: activeCount,
                total: stagedColumns.length,
              })}
            </span>
          </div>
          <h1 id={headingId} className="font-editorial modal-title">
            {t('schemaModal.title')}
          </h1>
          <p className="modal-subtitle">{t('schemaModal.subtitle')}</p>
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

      <form className="modal-form" onSubmit={handleAttemptSave} noValidate>
        <div className="modal-body">
          {/* Hard validation errors blocking save */}
          {validationErrors.length > 0 && (
            <div className="settings-status-banner error" role="alert">
              <AlertCircle size={15} strokeWidth={1.5} aria-hidden="true" />
              <div className="schema-feedback-list">
                {validationErrors.map((err, idx) => (
                  <p key={`${err.code}_${idx}`}>{err.message}</p>
                ))}
              </div>
            </div>
          )}

          {/* Impact warning confirmation state (shown only when warnings are detected) */}
          {isConfirmingWarnings ? (
            <div className="schema-warning-panel" role="alert">
              <div className="schema-warning-header">
                <AlertTriangle size={18} strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <h2 className="schema-warning-title">
                    {t('schemaModal.warningTitle')}
                  </h2>
                  <p className="schema-warning-subtitle">
                    {t('schemaModal.warningSubtitle')}
                  </p>
                </div>
              </div>

              <ul className="schema-warning-list">
                {pendingWarnings.map((warn, idx) => (
                  <li key={`${warn.code}_${idx}`}>{warn.message}</li>
                ))}
              </ul>
            </div>
          ) : (
            /* Editable column blueprint list */
            <>
              <div className="schema-column-list">
                {stagedColumns.map((col) => {
                  const isEnabled = col.enabled !== false;
                  const isDimmed = col.type === 'ignore' || !isEnabled;
                  const toggleLabel = isEnabled
                    ? t('schemaModal.disableColumnAria', {
                        label: col.label || col.key || t('modal.colLabelAria'),
                      })
                    : t('schemaModal.enableColumnAria', {
                        label: col.label || col.key || t('modal.colLabelAria'),
                      });

                  return (
                    <div
                      key={col._uid}
                      className={`schema-column-row ${
                        isDimmed ? 'is-ignored' : ''
                      }`}
                    >
                      <input
                        type="text"
                        className="form-input schema-col-input"
                        aria-label={t('modal.colLabelAria')}
                        placeholder={t('modal.colLabelPlaceholder')}
                        value={col.label}
                        onChange={(event) =>
                          handleUpdateRow(col._uid, 'label', event.target.value)
                        }
                      />

                      <div className="schema-type-wrap">
                        <select
                          className="team-role-select schema-type-select"
                          aria-label={t('modal.colTypeAria')}
                          value={col.type}
                          onChange={(event) =>
                            handleUpdateRow(col._uid, 'type', event.target.value)
                          }
                        >
                          <option value="category">{t('modal.colTypes.category')}</option>
                          <option value="number">{t('modal.colTypes.number')}</option>
                          <option value="text">{t('modal.colTypes.text')}</option>
                          <option value="ignore">{t('modal.colTypes.ignore')}</option>
                        </select>
                        <ChevronDown
                          size={14}
                          strokeWidth={1.5}
                          aria-hidden="true"
                          className="team-role-chevron"
                        />
                      </div>

                      <button
                        type="button"
                        className={`btn ghost schema-toggle-btn ${
                          isEnabled ? 'is-enabled' : 'is-disabled'
                        }`}
                        aria-pressed={isEnabled}
                        aria-label={toggleLabel}
                        title={toggleLabel}
                        onClick={() => handleUpdateRow(col._uid, 'enabled', !isEnabled)}
                      >
                        {isEnabled ? (
                          <Eye size={14} strokeWidth={1.5} aria-hidden="true" />
                        ) : (
                          <EyeOff size={14} strokeWidth={1.5} aria-hidden="true" />
                        )}
                      </button>

                      <button
                        type="button"
                        className="btn ghost schema-remove-btn"
                        aria-label={t('modal.removeColumnAria')}
                        onClick={() => handleRemoveRow(col._uid)}
                      >
                        <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className="btn schema-add-col-btn"
                onClick={handleAddRow}
              >
                <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
                <span>{t('modal.addColumnBtn')}</span>
              </button>
            </>
          )}
        </div>

        {/* Footer switching cleanly between standard Save and Warning Confirmation */}
        <footer className="modal-footer hairline-top">
          {isConfirmingWarnings ? (
            <>
              <button
                type="button"
                className="btn"
                disabled={isSaving}
                onClick={() => {
                  setPendingWarnings([]);
                  setPendingFinalColumns(null);
                }}
              >
                <span>{t('modal.cancel')}</span>
              </button>

              <button
                type="button"
                className="btn danger"
                disabled={isSaving}
                onClick={() => commitSave(pendingFinalColumns)}
              >
                {isSaving ? (
                  <>
                    <LoaderCircle
                      size={15}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="auth-spinner"
                    />
                    <span>{t('settings.saving')}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={15} strokeWidth={1.5} aria-hidden="true" />
                    <span>{t('schemaModal.confirmSaveAnyway')}</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn" onClick={handleExplicitClose}>
                <span>{t('modal.cancel')}</span>
              </button>

              <button type="submit" className="btn primary" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <LoaderCircle
                      size={15}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="auth-spinner"
                    />
                    <span>{t('settings.saving')}</span>
                  </>
                ) : (
                  <>
                    <Check size={15} strokeWidth={1.5} aria-hidden="true" />
                    <span>{t('settings.saveBtn')}</span>
                  </>
                )}
              </button>
            </>
          )}
        </footer>
      </form>
    </dialog>,
    document.body
  );
}
