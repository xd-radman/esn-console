/**
 * ErrorToast.jsx — Accessible Dismissible Supabase Write-Error Toast
 * Mounted inside a consistent `<div role="region">` in `App.jsx` (outside
 * modal dialogs). Uses native `popover="manual"` when supported (so outside
 * clicks never accidentally dismiss error messages), announces visible text
 * via `document.ariaNotify()` with an `aria-live="assertive"` fallback, and
 * provides an explicit keyboard-focusable Close button.
 */

import { useEffect, useRef } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';

export default function ErrorToast({ error, onDismiss }) {
  const { t } = useLang();
  const popoverRef = useRef(null);

  const message = error
    ? error.kind === 'permission'
      ? t('toast.permissionDenied')
      : t('toast.writeFailed')
    : '';

  // Sync visibility with the native Top-Layer Popover API (`popover="manual"`)
  // and announce visible text to screen readers via `ariaNotify()` when available
  useEffect(() => {
    const el = popoverRef.current;
    if (!el) {
      return;
    }

    const supportsPopover =
      typeof HTMLElement !== 'undefined' &&
      Object.hasOwn(HTMLElement.prototype, 'popover') &&
      typeof el.showPopover === 'function';

    if (error) {
      if (supportsPopover && !el.matches(':popover-open')) {
        try {
          el.showPopover();
        } catch {
          // Ignore if element is already in top layer or detached
        }
      }

      if (typeof document !== 'undefined' && typeof document.ariaNotify === 'function') {
        document.ariaNotify(`${t('toast.errorTitle')}. ${message}`);
      }
    } else if (supportsPopover && el.matches(':popover-open')) {
      try {
        el.hidePopover();
      } catch {
        // Ignore if already hidden
      }
    }
  }, [error, message, t]);

  return (
    <div
      className="toast-region"
      role="region"
      aria-label={t('toast.regionLabel')}
    >
      {/* Pre-mounted ARIA live region fallback for browsers without `document.ariaNotify()` */}
      <div className="visually-hidden" aria-live="assertive" aria-atomic="true">
        {error ? `${t('toast.errorTitle')}: ${message}` : ''}
      </div>

      {/* Persistent manual popover toast card (visible only while `error` is set) */}
      <div
        ref={popoverRef}
        popover="manual"
        className={`toast-card bento-card elevated ${error ? 'is-visible' : ''}`}
        hidden={!error}
      >
        {error && (
          <>
            <span className="toast-icon" aria-hidden="true">
              <AlertCircle size={18} strokeWidth={1.5} />
            </span>

            <div className="toast-content">
              <p className="toast-title">{t('toast.errorTitle')}</p>
              <p className="toast-message">{message}</p>
            </div>

            <button
              type="button"
              className="btn ghost toast-dismiss-btn"
              aria-label={t('toast.dismissLabel')}
              onClick={onDismiss}
            >
              <X size={15} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
