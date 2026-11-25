/**
 * DeleteSessionModal.jsx — Destructive Session Deletion Confirmation Dialog
 * Displays the targeted session's title, formatted date range, and total number
 * of response rows that will be removed. Places `autoFocus` on the safe `Cancel`
 * button per accessibility best practices for destructive confirmations.
 */

import { useEffect, useId, useRef } from 'react';
import { AlertTriangle, CalendarRange, Trash2, X } from 'lucide-react';
import { useLang } from '../../context/LangContext.jsx';

export default function DeleteSessionModal({
  isOpen,
  session,
  formattedDateRange,
  onClose,
  onConfirm,
}) {
  const { t } = useLang();
  const headingId = useId();
  const dialogRef = useRef(null);
  const pressedOutsideRef = useRef(false);

  // Sync React `isOpen` state with native `<dialog>` modal lifecycle
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (isOpen && session) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, session]);

  const handleExplicitClose = () => {
    if (dialogRef.current?.open) {
      dialogRef.current.close();
      return;
    }
    onClose?.();
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

  const handleConfirmDelete = () => {
    if (session) {
      onConfirm?.(session.id);
    }
    handleExplicitClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal-dialog modal-dialog-compact bento-card elevated"
      aria-labelledby={headingId}
      onClose={onClose}
      onPointerDown={handleDialogPointerDown}
      onPointerUp={handleDialogPointerUp}
      {...{ closedby: 'any' }}
    >
      {/* Modal header */}
      <header className="modal-header hairline-bottom">
        <div className="modal-header-copy">
          <span className="mono-tag danger-tag">
            <AlertTriangle size={12} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('modal.deleteSessionKicker')}</span>
          </span>
          <h1 id={headingId} className="font-editorial modal-title">
            {t('modal.deleteSessionTitle')}
          </h1>
          <p className="modal-subtitle">{t('modal.deleteSessionConfirm')}</p>
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

      {/* Summary box showing exactly which session & response count will be removed */}
      {session && (
        <div className="modal-body">
          <div className="delete-session-summary hairline">
            <p className="delete-session-title">{session.title}</p>

            <div className="delete-session-meta">
              <span className="font-mono-label delete-session-dates tabular-nums">
                <CalendarRange size={13} strokeWidth={1.5} aria-hidden="true" />
                <span>{formattedDateRange}</span>
              </span>

              <span className="font-mono-label delete-session-count tabular-nums">
                {t('modal.deleteSessionResponses', {
                  count: session.responses?.length ?? 0,
                })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action footer: safe `Cancel` button receives initial `autoFocus` */}
      <footer className="modal-footer hairline-top">
        <button
          type="button"
          className="btn"
          autoFocus
          onClick={handleExplicitClose}
        >
          <span>{t('modal.cancel')}</span>
        </button>

        <button
          type="button"
          className="btn danger"
          onClick={handleConfirmDelete}
        >
          <Trash2 size={15} strokeWidth={1.5} aria-hidden="true" />
          <span>{t('modal.delete')}</span>
        </button>
      </footer>
    </dialog>
  );
}
