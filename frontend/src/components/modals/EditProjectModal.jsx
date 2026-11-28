/**
 * EditProjectModal.jsx — Accessible Project Metadata Editor Dialog
 * Built on native `<dialog>` (`showModal()`, `closedby="any"` + Safari coordinate
 * backdrop dismiss fallback, native `Escape`). Lets users with `manage_projects`
 * update a project's Title, optional uppercase Code/Tag (max 5 chars),
 * Description, Status (`Active` / `Inactive`), and curated `lucide-react` Icon
 * while preserving all existing schema columns, KPIs, graphs, and responses.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  Check,
  CircleCheck,
  CircleDashed,
  Compass,
  Globe,
  HeartHandshake,
  LoaderCircle,
  MessagesSquare,
  Music,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useLang } from '../../context/LangContext.jsx';

// Curated 1.5px Lucide icon options matching `NewProjectModal.jsx` and `ProjectCard.jsx`
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

/**
 * Formats user input into an uppercase alphanumeric project tag (max 5 chars).
 */
function sanitizeProjectCodeInput(raw) {
  return String(raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5);
}

/**
 * Derives a 2-letter uppercase initials preview from a title for the code placeholder.
 */
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

export default function EditProjectModal({ isOpen, project, onClose, onSave }) {
  const { lang, t } = useLang();

  // Resolve initial localized values from the selected project
  const initialCopy = project ? project[lang] ?? project.en ?? {} : {};
  const initialTitle = initialCopy.title ?? '';
  const initialSubtitle = initialCopy.subtitle ?? '';
  const initialCode = project?.code ?? '';
  const initialStatus = project?.status === 'inactive' ? 'inactive' : 'active';
  const initialIconKey = project?.iconKey || 'messages-square';

  // Controlled editable project fields (`codeDirty` preserves untouched legacy >5-char codes)
  const [title, setTitle] = useState(initialTitle);
  const [code, setCode] = useState(initialCode);
  const [codeDirty, setCodeDirty] = useState(false);
  const [description, setDescription] = useState(initialSubtitle);
  const [status, setStatus] = useState(initialStatus);
  const [iconKey, setIconKey] = useState(initialIconKey);

  // Validation & submission lock states
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stable IDs for accessible form associations
  const headingId = useId();
  const titleId = useId();
  const codeId = useId();
  const descId = useId();

  const dialogRef = useRef(null);
  const titleInputRef = useRef(null);
  const pressedOutsideRef = useRef(false);

  // Sync React `isOpen` boolean with native `dialog.showModal()` / `dialog.close()`
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isOpen && project) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, project]);

  const handleDialogClose = () => {
    setFormError('');
    setIsSubmitting(false);
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

  // Detect whether any editable field differs from the project's persisted values
  const hasChanges = useMemo(() => {
    if (!project) {
      return false;
    }
    return (
      title.trim() !== initialTitle.trim() ||
      (codeDirty && code !== initialCode) ||
      description.trim() !== initialSubtitle.trim() ||
      status !== initialStatus ||
      iconKey !== initialIconKey
    );
  }, [
    project,
    title,
    code,
    codeDirty,
    description,
    status,
    iconKey,
    initialTitle,
    initialCode,
    initialSubtitle,
    initialStatus,
    initialIconKey,
  ]);

  const autoCodePreview = deriveCodePreview(title);
  const canSubmit = Boolean(project) && Boolean(title.trim()) && hasChanges && !isSubmitting;

  // Validate required title, persist project updates via `updateProject`, and close modal
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!project) {
      return;
    }
    setFormError('');

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError(t('modal.titleRequired'));
      titleInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await onSave?.(project.id, {
        title: trimmedTitle,
        code: codeDirty ? sanitizeProjectCodeInput(code) : undefined,
        subtitle: description.trim(),
        status,
        iconKey,
      });
      if (updated) {
        handleExplicitClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <span className="mono-tag">{t('modal.editProjectKicker')}</span>
          <h1 id={headingId} className="font-editorial modal-title">
            {t('modal.editProjectTitle')}
          </h1>
          <p className="modal-subtitle">{t('modal.editProjectSubtitle')}</p>
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

      {/* Controlled project metadata edit form */}
      <form className="modal-form" onSubmit={handleSubmit} noValidate>
        <div className="modal-body">
          {formError && (
            <div className="settings-status-banner error" role="alert">
              <AlertCircle size={15} strokeWidth={1.5} aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          {/* Side-by-side Project Title (required) & optional Project Code / Tag */}
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
                onChange={(event) => {
                  setCode(sanitizeProjectCodeInput(event.target.value));
                  setCodeDirty(true);
                }}
              />
            </div>
          </div>

          {!code && (
            <p className="form-field-hint">{t('modal.codeClearHint')}</p>
          )}

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

          {/* Status (`Active` | `Inactive`) segmented radio group */}
          <fieldset className="form-fieldset">
            <legend className="form-label">{t('modal.statusLabel')}</legend>

            <div className="status-choice-grid">
              <label className="status-choice active-option">
                <input
                  type="radio"
                  name="editProjectStatus"
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
                  name="editProjectStatus"
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
                      name="editProjectIcon"
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
        </div>

        {/* Modal action footer */}
        <footer className="modal-footer hairline-top">
          <button type="button" className="btn" onClick={handleExplicitClose}>
            <span>{t('modal.cancel')}</span>
          </button>

          <button type="submit" className="btn primary" disabled={!canSubmit}>
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
                <Check size={15} strokeWidth={1.5} aria-hidden="true" />
                <span>{t('modal.saveProjectChanges')}</span>
              </>
            )}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
