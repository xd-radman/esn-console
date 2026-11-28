/**
 * NewProjectModal.jsx — Dual-Mode Dynamic-Schema Project Creation Dialog
 * Built on native `<dialog>` (`showModal()`, `closedby="any"` + Safari coordinate
 * fallback, native `Escape`). Lets organizers define a project's metadata
 * (Title, Description, Initial Status, Icon) and its dynamic `config.columns`
 * blueprint via two Swiss segmented modes:
 * - **Upload CSV**: Drop/select a `.csv` file, infer column types via PapaParse
 *   + `inferColumnsFromCSV()`, edit labels/types/ignore flags, and optionally
 *   import the uploaded rows immediately as Session 1.
 * - **Manual Columns**: Start with 1 blank column row and add custom `Category`,
 *   `Number`, or `Text` columns before any CSV exists.
 */

import { useEffect, useId, useRef, useState } from 'react';
import Papa from 'papaparse';
import {
  AlertCircle,
  Award,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  Compass,
  FileSpreadsheet,
  Globe,
  HeartHandshake,
  LoaderCircle,
  MessagesSquare,
  Music,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useLang } from '../../context/LangContext.jsx';
import { inferColumnsFromCSV, slugifyColumnKey } from '../../lib/csvSchema.js';

// Curated 1.5px Lucide icon options exposed in the modal icon picker
const ICON_OPTIONS = [
  { key: 'messages-square', labelKey: 'modal.icons.messagesSquare', Icon: MessagesSquare },
  { key: 'compass', labelKey: 'modal.icons.compass', Icon: Compass },
  { key: 'users', labelKey: 'modal.icons.users', Icon: Users },
  { key: 'sparkles', labelKey: 'modal.icons.sparkles', Icon: Sparkles },
  { key: 'globe', labelKey: 'modal.icons.globe', Icon: Globe },
  { key: 'music', labelKey: 'modal.icons.music', Icon: Music },
  { key: 'award', labelKey: 'modal.icons.award', Icon: Award },
  { key: 'heart-handshake', labelKey: 'modal.icons.heartHandshake', Icon: HeartHandshake },
];

// Turkish diacritic map for clean ASCII uppercase initials preview
const TR_CHAR_MAP = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};

// Formats custom project code input to uppercase alphanumeric (max 5 chars)
function sanitizeProjectCodeInput(raw) {
  return String(raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5);
}

// Derives 2-letter uppercase initials from the title for the optional code placeholder
function deriveCodePreview(rawTitle) {
  const words = String(rawTitle ?? '')
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TR_CHAR_MAP[ch] ?? ch)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`;
  }
  if (words.length === 1) {
    return words[0].slice(0, 2);
  }
  return '';
}

// Creates a fresh manual column row with a unique client-side ID
function createBlankColumnRow() {
  return {
    _uid: `col_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    type: 'category',
    sourceHeader: null,
  };
}

export default function NewProjectModal({ isOpen, onClose, onCreate }) {
  const { t } = useLang();

  // Core project metadata fields
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [iconKey, setIconKey] = useState('messages-square');

  // Dual-mode schema definition state (`'csv'` | `'manual'`)
  const [schemaMode, setSchemaMode] = useState('csv');

  // Upload CSV tab state: file metadata, parsed raw rows, inferred columns, and Session 1 toggle
  const [csvFileName, setCsvFileName] = useState('');
  const [csvRawRows, setCsvRawRows] = useState([]);
  const [csvColumns, setCsvColumns] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importNow, setImportNow] = useState(true);
  const [sessionOneTitle, setSessionOneTitle] = useState('Session 1');

  // Manual Columns tab state: starts with 1 blank editable row
  const [manualColumns, setManualColumns] = useState(() => [createBlankColumnRow()]);

  // Validation & submission lock states
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stable IDs for accessible form associations and tablist
  const headingId = useId();
  const titleId = useId();
  const codeId = useId();
  const descId = useId();
  const csvTabId = useId();
  const manualTabId = useId();
  const sessionOneId = useId();

  const dialogRef = useRef(null);
  const titleInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const csvTabRef = useRef(null);
  const manualTabRef = useRef(null);
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

  // Reset all controlled fields whenever the dialog closes
  const resetForm = () => {
    setTitle('');
    setCode('');
    setDescription('');
    setStatus('active');
    setIconKey('messages-square');
    setSchemaMode('csv');
    setCsvFileName('');
    setCsvRawRows([]);
    setCsvColumns([]);
    setIsDragOver(false);
    setImportNow(true);
    setSessionOneTitle('Session 1');
    setManualColumns([createBlankColumnRow()]);
    setFormError('');
    setIsSubmitting(false);
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

  // Keyboard navigation (`ArrowLeft` / `ArrowRight` / `Home` / `End`) for schema mode tabs
  const handleTabKeyDown = (event) => {
    if (
      event.key === 'ArrowRight' ||
      event.key === 'ArrowLeft' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      event.preventDefault();
      let nextMode;
      if (event.key === 'Home') {
        nextMode = 'csv';
      } else if (event.key === 'End') {
        nextMode = 'manual';
      } else {
        nextMode = schemaMode === 'csv' ? 'manual' : 'csv';
      }
      setSchemaMode(nextMode);
      setFormError('');
      if (nextMode === 'csv') {
        csvTabRef.current?.focus();
      } else {
        manualTabRef.current?.focus();
      }
    }
  };

  // Parse a selected or dropped `.csv` file with PapaParse and infer its column blueprint
  const processCsvFile = async (file) => {
    if (!file) {
      return;
    }
    setFormError('');
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

      if (headers.length === 0) {
        setFormError(t('modal.csvNoHeaders'));
        return;
      }

      const inferred = inferColumnsFromCSV(headers, rows).map((col, idx) => ({
        _uid: `csv_${idx}_${col.key}`,
        label: col.label,
        type: col.type,
        sourceHeader: col.label,
      }));

      setCsvFileName(file.name);
      setCsvRawRows(rows);
      setCsvColumns(inferred);
    } catch {
      setFormError(t('modal.csvParseError'));
    }
  };

  const handleFileInputChange = (event) => {
    const file = event.target.files?.[0];
    processCsvFile(file);
    event.target.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer?.files?.[0];
    processCsvFile(file);
  };

  // Shared column row mutators targeting the currently active mode's column array
  const activeColumnList = schemaMode === 'csv' ? csvColumns : manualColumns;
  const setActiveColumnList =
    schemaMode === 'csv' ? setCsvColumns : setManualColumns;

  const handleUpdateColumn = (uid, field, value) => {
    setFormError('');
    setActiveColumnList((prev) =>
      prev.map((col) => (col._uid === uid ? { ...col, [field]: value } : col))
    );
  };

  const handleRemoveColumn = (uid) => {
    setFormError('');
    setActiveColumnList((prev) => prev.filter((col) => col._uid !== uid));
  };

  const handleAddManualColumn = () => {
    setFormError('');
    setManualColumns((prev) => [...prev, createBlankColumnRow()]);
  };

  // Validate title + active columns, slugify keys, and emit dynamic project payload
  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError(t('modal.titleRequired'));
      titleInputRef.current?.focus();
      return;
    }

    const candidateRows = schemaMode === 'csv' ? csvColumns : manualColumns;
    const activeRows = candidateRows.filter((col) => col.type !== 'ignore');

    if (activeRows.length === 0) {
      setFormError(t('modal.schemaAtLeastOne'));
      return;
    }

    // Validate non-empty and unique labels across all active columns (case-insensitive)
    const seenLabels = new Set();
    for (const col of activeRows) {
      const trimmedLabel = String(col.label ?? '').trim();
      if (!trimmedLabel) {
        setFormError(t('modal.schemaBlankLabel'));
        return;
      }
      const normalized = trimmedLabel.toLowerCase();
      if (seenLabels.has(normalized)) {
        setFormError(t('modal.schemaDuplicateLabel', { label: trimmedLabel }));
        return;
      }
      seenLabels.add(normalized);
    }

    // Generate clean, unique snake_case keys via `slugifyColumnKey`
    const usedKeys = new Set();
    const finalColumns = activeRows.map((col) => {
      const trimmedLabel = String(col.label).trim();
      const key = slugifyColumnKey(trimmedLabel, usedKeys);
      usedKeys.add(key);
      return {
        key,
        label: trimmedLabel,
        type: col.type,
        sourceHeader: col.sourceHeader,
      };
    });

    // If importing CSV rows now, remap any renamed headers so `normalizeRowToSchema` finds every cell
    let initialImport = null;
    if (schemaMode === 'csv' && importNow && csvRawRows.length > 0) {
      const remappedRows = csvRawRows.map((rawRow) => {
        const mapped = { ...rawRow };
        for (const col of finalColumns) {
          if (
            col.sourceHeader &&
            col.sourceHeader !== col.label &&
            Object.hasOwn(rawRow, col.sourceHeader)
          ) {
            mapped[col.label] = rawRow[col.sourceHeader];
          }
        }
        return mapped;
      });

      initialImport = {
        sessionTitle: sessionOneTitle.trim() || t('modal.sessionOneDefault'),
        rows: remappedRows,
      };
    }

    const cleanColumns = finalColumns.map(({ key, label, type }) => ({
      key,
      label,
      type,
    }));

    setIsSubmitting(true);
    try {
      const created = await onCreate?.({
        title: trimmedTitle,
        code: sanitizeProjectCodeInput(code),
        subtitle: description.trim(),
        status,
        iconKey,
        columns: cleanColumns,
        initialImport,
      });
      if (created) {
        handleExplicitClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCsvMode = schemaMode === 'csv';
  const activeTabId = isCsvMode ? csvTabId : manualTabId;
  const activeCount = activeColumnList.filter((col) => col.type !== 'ignore').length;
  const autoCodePreview = deriveCodePreview(title);

  return (
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
          <span className="mono-tag">{t('modal.newProjectKicker')}</span>
          <h1 id={headingId} className="font-editorial modal-title">
            {t('modal.newProjectTitle')}
          </h1>
          <p className="modal-subtitle">{t('modal.newProjectSubtitle')}</p>
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

      {/* Controlled project & schema creation form */}
      <form className="modal-form" onSubmit={handleSubmit} noValidate>
        <div className="modal-body">
          {/* Inline validation error banner */}
          {formError && (
            <div className="settings-status-banner error" role="alert">
              <AlertCircle size={15} strokeWidth={1.5} aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          {/* Side-by-side Project Title (required) & optional uppercase Project Code/Tag */}
          <div className="form-title-code-row">
            <div className="form-field">
              <div className="form-label-row">
                <label htmlFor={titleId} className="form-label">
                  {t('modal.titleLabel')}
                </label>
                <span className="font-mono-label form-badge required">
                  {t('modal.requiredBadge')}
                </span>
              </div>

              <input
                ref={titleInputRef}
                id={titleId}
                name="title"
                type="text"
                required
                maxLength={80}
                autoFocus
                className="form-input"
                placeholder={t('modal.titlePlaceholder')}
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (formError) {
                    setFormError('');
                  }
                }}
              />
            </div>

            <div className="form-field">
              <div className="form-label-row">
                <label htmlFor={codeId} className="form-label">
                  {t('modal.codeLabel')}
                </label>
                <span className="font-mono-label form-badge">
                  {t('modal.optionalBadge')}
                </span>
              </div>

              <input
                id={codeId}
                name="code"
                type="text"
                maxLength={5}
                className="form-input form-input-mono"
                placeholder={
                  autoCodePreview
                    ? t('modal.codeAutoPlaceholder', { auto: autoCodePreview })
                    : t('modal.codePlaceholder')
                }
                value={code}
                onChange={(event) =>
                  setCode(sanitizeProjectCodeInput(event.target.value))
                }
              />
            </div>
          </div>

          {/* Optional Description textarea */}
          <div className="form-field">
            <div className="form-label-row">
              <label htmlFor={descId} className="form-label">
                {t('modal.descLabel')}
              </label>
              <span className="font-mono-label form-badge">
                {t('modal.optionalBadge')}
              </span>
            </div>

            <textarea
              id={descId}
              name="description"
              rows={2}
              maxLength={220}
              className="form-textarea"
              placeholder={t('modal.descPlaceholder')}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          {/* Initial Status (`Active` | `Inactive`) radio group */}
          <fieldset className="form-fieldset">
            <legend className="form-label">{t('modal.statusLabel')}</legend>

            <div className="status-choice-grid">
              <label className="status-choice active-option">
                <input
                  type="radio"
                  name="initialStatus"
                  value="active"
                  className="visually-hidden"
                  checked={status === 'active'}
                  onChange={() => setStatus('active')}
                />
                <CircleCheck size={15} strokeWidth={1.5} aria-hidden="true" />
                <span>{t('status.active')}</span>
              </label>

              <label className="status-choice inactive-option">
                <input
                  type="radio"
                  name="initialStatus"
                  value="inactive"
                  className="visually-hidden"
                  checked={status === 'inactive'}
                  onChange={() => setStatus('inactive')}
                />
                <CircleDashed size={15} strokeWidth={1.5} aria-hidden="true" />
                <span>{t('status.inactive')}</span>
              </label>
            </div>
          </fieldset>

          {/* Curated 8-icon Lucide radio picker */}
          <fieldset className="form-fieldset">
            <legend className="form-label">{t('modal.iconLabel')}</legend>

            <div className="icon-picker-grid">
              {ICON_OPTIONS.map((option) => {
                const IconItem = option.Icon;
                return (
                  <label key={option.key} className="icon-choice">
                    <input
                      type="radio"
                      name="projectIcon"
                      value={option.key}
                      className="visually-hidden"
                      checked={iconKey === option.key}
                      onChange={() => setIconKey(option.key)}
                    />
                    <IconItem size={18} strokeWidth={1.5} aria-hidden="true" />
                    <span className="icon-choice-label">{t(option.labelKey)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Dual-Mode Column Schema Builder: Upload CSV | Manual Columns */}
          <div className="schema-builder-section">
            <div className="form-label-row">
              <span className="form-label">{t('modal.schemaSectionLabel')}</span>
              <span className="font-mono-label form-badge tabular-nums">
                {t('modal.activeColumnsCount', { count: activeCount })}
              </span>
            </div>

            <div
              className="team-modal-tabs"
              role="tablist"
              aria-label={t('modal.schemaModeLabel')}
              onKeyDown={handleTabKeyDown}
            >
              <button
                ref={csvTabRef}
                id={csvTabId}
                type="button"
                role="tab"
                aria-selected={isCsvMode}
                tabIndex={isCsvMode ? 0 : -1}
                className="team-modal-tab"
                onClick={() => {
                  setSchemaMode('csv');
                  setFormError('');
                }}
              >
                <Upload size={14} strokeWidth={1.5} aria-hidden="true" />
                <span>{t('modal.uploadCsvTab')}</span>
              </button>

              <button
                ref={manualTabRef}
                id={manualTabId}
                type="button"
                role="tab"
                aria-selected={!isCsvMode}
                tabIndex={!isCsvMode ? 0 : -1}
                className="team-modal-tab"
                onClick={() => {
                  setSchemaMode('manual');
                  setFormError('');
                }}
              >
                <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
                <span>{t('modal.manualColumnsTab')}</span>
              </button>
            </div>

            <div
              className="schema-tab-panel"
              role="tabpanel"
              aria-labelledby={activeTabId}
            >
              {isCsvMode ? (
                <>
                  {/* CSV file picker & drag-and-drop dropzone */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="visually-hidden"
                    onChange={handleFileInputChange}
                  />
                  <div
                    className={`schema-dropzone ${isDragOver ? 'is-dragover' : ''}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                  >
                    <FileSpreadsheet size={20} strokeWidth={1.5} aria-hidden="true" />
                    <p className="schema-dropzone-text">
                      {csvFileName ? csvFileName : t('modal.csvDropzoneHint')}
                    </p>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={14} strokeWidth={1.5} aria-hidden="true" />
                      <span>
                        {csvFileName
                          ? t('modal.csvReplaceBtn')
                          : t('modal.csvChooseBtn')}
                      </span>
                    </button>
                  </div>

                  {/* Summary badge & editable inferred columns */}
                  {csvColumns.length > 0 && (
                    <>
                      <div className="schema-file-summary font-mono-label tabular-nums">
                        <span>
                          {t('modal.csvDetectedSummary', {
                            rows: csvRawRows.length,
                            cols: csvColumns.length,
                          })}
                        </span>
                      </div>

                      <div className="schema-column-list">
                        {csvColumns.map((col) => (
                          <div
                            key={col._uid}
                            className={`schema-column-row ${
                              col.type === 'ignore' ? 'is-ignored' : ''
                            }`}
                          >
                            <input
                              type="text"
                              className="form-input schema-col-input"
                              aria-label={t('modal.colLabelAria')}
                              placeholder={t('modal.colLabelPlaceholder')}
                              value={col.label}
                              onChange={(event) =>
                                handleUpdateColumn(
                                  col._uid,
                                  'label',
                                  event.target.value
                                )
                              }
                            />

                            <div className="schema-type-wrap">
                              <select
                                className="team-role-select schema-type-select"
                                aria-label={t('modal.colTypeAria')}
                                value={col.type}
                                onChange={(event) =>
                                  handleUpdateColumn(
                                    col._uid,
                                    'type',
                                    event.target.value
                                  )
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
                              className="btn ghost schema-remove-btn"
                              aria-label={t('modal.removeColumnAria')}
                              onClick={() => handleRemoveColumn(col._uid)}
                            >
                              <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Friendly optional Session 1 immediate import checkbox */}
                      {csvRawRows.length > 0 && (
                        <div className="schema-import-box">
                          <label className="schema-checkbox-row">
                            <input
                              type="checkbox"
                              checked={importNow}
                              onChange={(event) => setImportNow(event.target.checked)}
                            />
                            <span>{t('modal.importNowCheckbox')}</span>
                          </label>

                          {importNow && (
                            <div className="form-field schema-session-field">
                              <label htmlFor={sessionOneId} className="form-label">
                                {t('modal.sessionOneLabel')}
                              </label>
                              <input
                                id={sessionOneId}
                                type="text"
                                maxLength={80}
                                className="form-input schema-col-input"
                                placeholder={t('modal.sessionOneDefault')}
                                value={sessionOneTitle}
                                onChange={(event) =>
                                  setSessionOneTitle(event.target.value)
                                }
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                /* Manual Columns Tab */
                <>
                  <div className="schema-column-list">
                    {manualColumns.map((col) => (
                      <div key={col._uid} className="schema-column-row">
                        <input
                          type="text"
                          className="form-input schema-col-input"
                          aria-label={t('modal.colLabelAria')}
                          placeholder={t('modal.colLabelPlaceholder')}
                          value={col.label}
                          onChange={(event) =>
                            handleUpdateColumn(col._uid, 'label', event.target.value)
                          }
                        />

                        <div className="schema-type-wrap">
                          <select
                            className="team-role-select schema-type-select"
                            aria-label={t('modal.colTypeAria')}
                            value={col.type}
                            onChange={(event) =>
                              handleUpdateColumn(col._uid, 'type', event.target.value)
                            }
                          >
                            <option value="category">{t('modal.colTypes.category')}</option>
                            <option value="number">{t('modal.colTypes.number')}</option>
                            <option value="text">{t('modal.colTypes.text')}</option>
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
                          className="btn ghost schema-remove-btn"
                          aria-label={t('modal.removeColumnAria')}
                          disabled={manualColumns.length <= 1}
                          onClick={() => handleRemoveColumn(col._uid)}
                        >
                          <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn schema-add-col-btn"
                    onClick={handleAddManualColumn}
                  >
                    <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
                    <span>{t('modal.addColumnBtn')}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Modal action footer */}
        <footer className="modal-footer hairline-top">
          <button type="button" className="btn" onClick={handleExplicitClose}>
            <span>{t('modal.cancel')}</span>
          </button>

          <button type="submit" className="btn primary" disabled={isSubmitting}>
            {isSubmitting ? (
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
                <Plus size={15} strokeWidth={1.5} aria-hidden="true" />
                <span>{t('modal.create')}</span>
              </>
            )}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
