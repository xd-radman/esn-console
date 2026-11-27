/**
 * DeleteProjectModal.jsx — Type-to-Confirm Destructive Project Deletion Dialog
 * Portaled to `document.body` on native `<dialog>` (`showModal()`, `closedby="any"`
 * + Safari coordinate fallback, native `Escape`). Displays the target project's
 * title, code, and exact blast radius (sessions & responses count), and requires
 * typing the exact project title (case-sensitive trimmed match) to unlock
 * permanent deletion.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CalendarRange,
  Database,
  LoaderCircle,
  Trash2,
  X,
} from 'lucide-react';
import { useLang } from '../../context/LangContext.jsx';

export default function DeleteProjectModal({
  isOpen,
  project,
  sessionsCount = 0,
  responsesCount = 0,
  onClose,
  onConfirm,
}) {
  const { lang, t } = useLang();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const headingId = useId();
  const inputId = useId();
  const dialogRef = useRef(null);
  const pressedOutsideRef = useRef(false);

  const projectCopy = project ? project[lang] ?? project.en : null;
  const projectTitle = projectCopy?.title ?? project?.slug ?? '';

  // Sync React `isOpen` state with native `<dialog>` modal lifecycle
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
    setConfirmText('');
    setIsDeleting(false);
    onClose?.();
  };

  const handleExplicitClose = () => {
    if (isDeleting) {
      return;
    }
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
    if (!isDeleting && pressedOutsideRef.current && isPointerOutsideDialog(event)) {
      dialogRef.current?.close();
    }
    pressedOutsideRef.current = false;
  };

  // Exact case-sensitive trimmed match against the project title
  const isConfirmed =
    projectTitle.trim().length > 0 &&
    confirmText.trim() === projectTitle.trim();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!project || !isConfirmed || isDeleting) {
      return;
    }
    setIsDeleting(true);
    try {
      const deleted = await onConfirm?.(project.id);
      if (deleted) {
        setIsDeleting(false);
        if (dialogRef.current?.open) {
          dialogRef.current.close();
        } else {
          handleDialogClose();
        }
      } else {
        setIsDeleting(false);
      }
    } catch {
      setIsDeleting(false);
    }
  };

  if (typeof document === 'undefined' || !project) {
    return null;
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      className="modal-dialog modal-dialog-compact bento-card elevated"
      aria-labelledby={headingId}
      onClose={handleDialogClose}
      onPointerDown={handleDialogPointerDown}
      onPointerUp={handleDialogPointerUp}
      {...{ closedby: 'any' }}
    >
      {/* Modal header with danger kicker */}
      <header className="modal-header hairline-bottom">
        <div className="modal-header-copy">
          <span className="mono-tag danger-tag">
            <AlertTriangle size={12} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('modal.deleteProjectKicker')}</span>
          </span>
          <h1 id={headingId} className="font-editorial modal-title">
            {t('modal.deleteProjectTitle')}
          </h1>
          <p className="modal-subtitle">{t('modal.deleteProjectSubtitle')}</p>
        </div>

        <button
          type="button"
          className="btn ghost modal-close-btn"
          aria-label={t('modal.closeLabel')}
          disabled={isDeleting}
          onClick={handleExplicitClose}
        >
          <X size={17} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </header>

      <form className="modal-form" onSubmit={handleSubmit} noValidate>
        <div className="modal-body">
          {/* Blast-radius warning banner showing project code, title, sessions & responses */}
          <div className="delete-project-warning" role="alert">
            <div className="delete-project-identity">
              <span className="mono-tag">{project.code}</span>
              <p className="delete-project-name">{projectTitle}</p>
            </div>

            <p className="delete-project-blast-note">
              {t('modal.deleteProjectWarning')}
            </p>

            <div className="delete-project-metrics tabular-nums">
              <span className="font-mono-label delete-project-stat">
                <CalendarRange size={13} strokeWidth={1.5} aria-hidden="true" />
                <span>
                  {t('modal.deleteProjectSessions', { count: sessionsCount })}
                </span>
              </span>
              <span className="font-mono-label delete-project-stat">
                <Database size={13} strokeWidth={1.5} aria-hidden="true" />
                <span>
                  {t('modal.deleteProjectResponses', { count: responsesCount })}
                </span>
              </span>
            </div>
          </div>

          {/* Type-to-confirm input requiring the exact project title */}
          <div className="form-field">
            <label htmlFor={inputId} className="form-label">
              {t('modal.deleteProjectTypePrompt', { title: projectTitle })}
            </label>
            <input
              id={inputId}
              type="text"
              className="form-input"
              autoComplete="off"
              spellCheck={false}
              disabled={isDeleting}
              placeholder={projectTitle}
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
            />
          </div>
        </div>

        {/* Action footer: Cancel receives initial focus; crimson Delete unlocks only on exact match */}
        <footer className="modal-footer hairline-top">
          <button
            type="button"
            className="btn"
            autoFocus
            disabled={isDeleting}
            onClick={handleExplicitClose}
          >
            <span>{t('modal.cancel')}</span>
          </button>

          <button
            type="submit"
            className="btn danger"
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting ? (
              <>
                <LoaderCircle
                  size={15}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="auth-spinner"
                />
                <span>{t('modal.deletingProject')}</span>
              </>
            ) : (
              <>
                <Trash2 size={15} strokeWidth={1.5} aria-hidden="true" />
                <span>{t('modal.deletePermanently')}</span>
              </>
            )}
          </button>
        </footer>
      </form>
    </dialog>,
    document.body
  );
}
