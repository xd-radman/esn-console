/**
 * NewProjectModal.jsx — Accessible Project Creation & Template Cloning Dialog
 * Built on the native HTML `<dialog>` element (`showModal()`, top-layer backdrop,
 * native `Escape` handling, and automatic focus restoration to `+ New Project`).
 * Supports light-dismiss via `closedby="any"` plus a pointer-coordinate fallback
 * for browsers without `closedBy` support, and deep-clones template projects
 * with `structuredClone` so nested `en`/`tr` copy and `defaultGraphs` stay isolated.
 */

import { useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  Compass,
  Globe,
  HeartHandshake,
  MessagesSquare,
  Music,
  Plus,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useLang } from '../../context/LangContext.jsx';
import { translations } from '../../lib/i18n.js';

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

// Standard Bento graph configuration assigned when "Blank Project" is chosen
const BLANK_TEMPLATE = {
  id: '',
  code: '',
  status: 'active',
  iconKey: 'messages-square',
  en: {
    title: '',
    subtitle: translations.en.modal.defaultSubtitle,
    category: translations.en.modal.defaultCategory,
  },
  tr: {
    title: '',
    subtitle: translations.tr.modal.defaultSubtitle,
    category: translations.tr.modal.defaultCategory,
  },
  sessionsCount: 0,
  responsesCount: 0,
  defaultGraphs: [
    { metricKey: 'score', chartStyle: 'bar-vertical', colSpan: 6 },
    { metricKey: 'outcome', chartStyle: 'donut', colSpan: 6 },
  ],
};

// Map Turkish diacritics before ASCII slug/code normalization
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

/**
 * Generates a unique URL-safe kebab-case slug (`id`) from the entered project title.
 */
function buildUniqueSlug(rawTitle, existingProjects) {
  const normalized = rawTitle
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TR_CHAR_MAP[ch] ?? ch)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const baseSlug = normalized || 'esn-project';
  const takenIds = new Set(existingProjects.map((project) => project.id));

  if (!takenIds.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  while (takenIds.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseSlug}-${suffix}`;
}

/**
 * Generates a short uppercase Swiss code (`ESN-XX-NN`) from title initials and index.
 */
function buildProjectCode(rawTitle, existingProjects) {
  const cleanWords = rawTitle
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TR_CHAR_MAP[ch] ?? ch)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  let initials = 'PR';
  if (cleanWords.length >= 2) {
    initials = `${cleanWords[0][0]}${cleanWords[1][0]}`;
  } else if (cleanWords.length === 1) {
    initials = cleanWords[0].slice(0, 2).padEnd(2, 'X');
  }

  const takenCodes = new Set(existingProjects.map((project) => project.code));
  let index = existingProjects.length + 1;
  let candidate = `ESN-${initials}-${String(index).padStart(2, '0')}`;

  while (takenCodes.has(candidate)) {
    index += 1;
    candidate = `ESN-${initials}-${String(index).padStart(2, '0')}`;
  }
  return candidate;
}

export default function NewProjectModal({ isOpen, onClose, onCreate, projects = [] }) {
  const { lang, t } = useLang();

  // Controlled form field states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duplicateFrom, setDuplicateFrom] = useState('blank');
  const [status, setStatus] = useState('active');
  const [iconKey, setIconKey] = useState('messages-square');
  const [hasCustomIcon, setHasCustomIcon] = useState(false);

  // Validation state (shown only after blur or submit attempt, cleared on input)
  const [titleTouched, setTitleTouched] = useState(false);
  const [titleError, setTitleError] = useState('');

  // Stable IDs linking labels, heading, and error description to controls
  const headingId = useId();
  const titleId = useId();
  const titleErrorId = useId();
  const descId = useId();
  const duplicateId = useId();

  // Refs for native `<dialog>` lifecycle and validation focus routing
  const dialogRef = useRef(null);
  const titleInputRef = useRef(null);
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

  // Reset controlled fields whenever the dialog finishes closing so next open starts fresh
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDuplicateFrom('blank');
    setStatus('active');
    setIconKey('messages-square');
    setHasCustomIcon(false);
    setTitleTouched(false);
    setTitleError('');
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

  // Coordinate-based light-dismiss fallback for browsers without `<dialog closedby="any">`
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

  // Clear validation message immediately as soon as the user types a non-empty title
  const handleTitleChange = (event) => {
    const nextValue = event.target.value;
    setTitle(nextValue);
    if (titleError && nextValue.trim()) {
      setTitleError('');
    }
  };

  // Validate required title only after the user leaves the input after interacting
  const handleTitleBlur = () => {
    if (titleTouched && !title.trim()) {
      setTitleError(t('modal.titleRequired'));
    }
  };

  // Update template source and inherit its icon if the user hasn't manually picked one
  const handleDuplicateChange = (event) => {
    const nextSourceId = event.target.value;
    setDuplicateFrom(nextSourceId);

    if (!hasCustomIcon) {
      const matched = projects.find((item) => item.id === nextSourceId);
      setIconKey(matched ? matched.iconKey : 'messages-square');
    }
  };

  // Validate, deep-clone the selected template with `structuredClone`, and emit new project
  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (!trimmedTitle) {
      setTitleTouched(true);
      setTitleError(t('modal.titleRequired'));
      titleInputRef.current?.focus();
      return;
    }

    const sourceTemplate =
      duplicateFrom === 'blank'
        ? BLANK_TEMPLATE
        : projects.find((item) => item.id === duplicateFrom) ?? BLANK_TEMPLATE;

    // Deep-clone so nested `en`, `tr`, and `defaultGraphs` arrays never alias the template
    const cloned = structuredClone(sourceTemplate);

    cloned.id = buildUniqueSlug(trimmedTitle, projects);
    cloned.code = buildProjectCode(trimmedTitle, projects);
    cloned.status = status;
    cloned.iconKey = iconKey;

    // Apply entered title to both EN/TR dictionaries so switching languages always shows it
    cloned.en.title = trimmedTitle;
    cloned.tr.title = trimmedTitle;

    if (trimmedDesc) {
      cloned.en.subtitle = trimmedDesc;
      cloned.tr.subtitle = trimmedDesc;
    }

    // New projects start with fresh session/response counters while keeping cloned graph layouts
    cloned.sessionsCount = 0;
    cloned.responsesCount = 0;

    onCreate?.(cloned);
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
      {/* Modal header with Swiss kicker, level-1 dialog heading, and explicit close button */}
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

      {/* Controlled project creation form */}
      <form className="modal-form" onSubmit={handleSubmit} noValidate>
        <div className="modal-body">
          {/* Required Project Title input */}
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
              className={`form-input ${titleError ? 'is-invalid' : ''}`}
              placeholder={t('modal.titlePlaceholder')}
              value={title}
              aria-invalid={Boolean(titleError)}
              aria-describedby={titleError ? titleErrorId : undefined}
              onChange={handleTitleChange}
              onFocus={() => setTitleTouched(true)}
              onBlur={handleTitleBlur}
            />

            {titleError && (
              <p id={titleErrorId} className="form-error" role="alert">
                <AlertCircle size={14} strokeWidth={1.5} aria-hidden="true" />
                <span>{titleError}</span>
              </p>
            )}
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
              rows={3}
              maxLength={220}
              className="form-textarea"
              placeholder={t('modal.descPlaceholder')}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          {/* Template duplication selector (`Blank` + all current projects) */}
          <div className="form-field">
            <label htmlFor={duplicateId} className="form-label">
              {t('modal.duplicateLabel')}
            </label>

            <div className="form-select-wrap">
              <select
                id={duplicateId}
                name="duplicateFrom"
                className="form-select"
                value={duplicateFrom}
                onChange={handleDuplicateChange}
              >
                <option value="blank">{t('modal.blankOption')}</option>
                {projects.map((project) => {
                  const copy = project[lang] ?? project.en;
                  return (
                    <option key={project.id} value={project.id}>
                      {copy.title} ({project.code})
                    </option>
                  );
                })}
              </select>
              <ChevronDown
                size={15}
                strokeWidth={1.5}
                aria-hidden="true"
                className="form-select-chevron"
              />
            </div>
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
                      onChange={() => {
                        setIconKey(option.key);
                        setHasCustomIcon(true);
                      }}
                    />
                    <IconItem size={18} strokeWidth={1.5} aria-hidden="true" />
                    <span className="icon-choice-label">{t(option.labelKey)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>

        {/* Modal action footer */}
        <footer className="modal-footer hairline-top">
          <button type="button" className="btn" onClick={handleExplicitClose}>
            <span>{t('modal.cancel')}</span>
          </button>

          <button type="submit" className="btn primary">
            <Plus size={15} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('modal.create')}</span>
          </button>
        </footer>
      </form>
    </dialog>
  );
}
