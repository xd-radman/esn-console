/**
 * ToastViewport.jsx — Portaled Bottom-Right Toast Notification Stack
 * Renders active toasts from `ToastContext` in a fixed bottom-right stack
 * portaled to `document.body`. Uses `popover="manual"` when supported so toasts
 * promote into the browser Top Layer above open `<dialog>` modals, with a
 * fixed-position fallback and pre-mounted ARIA live region for screen readers.
 */

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CircleCheck, Info, X } from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';

export default function ToastViewport({ toasts = [], onDismiss }) {
  const { t } = useLang();
  const stackRef = useRef(null);

  // Promote/re-promote the manual popover container into the Top Layer whenever
  // a new toast arrives so it always renders above open `<dialog>` modals
  useEffect(() => {
    const el = stackRef.current;
    if (!el) {
      return;
    }

    const supportsPopover =
      typeof HTMLElement !== 'undefined' &&
      Object.hasOwn(HTMLElement.prototype, 'popover') &&
      typeof el.showPopover === 'function';

    if (!supportsPopover) {
      return;
    }

    if (toasts.length > 0) {
      try {
        if (el.matches(':popover-open')) {
          el.hidePopover();
        }
        el.showPopover();
      } catch {
        // Ignore if element is temporarily detached
      }
    } else if (el.matches(':popover-open')) {
      try {
        el.hidePopover();
      } catch {
        // Ignore if already hidden
      }
    }
  }, [toasts]);

  if (typeof document === 'undefined') {
    return null;
  }

  const latestMessage = toasts.length > 0 ? toasts[toasts.length - 1].message : '';

  return createPortal(
    <div
      className="toast-viewport-root"
      role="region"
      aria-label={t('toast.regionLabel')}
    >
      {/* Pre-mounted ARIA live region fallback for browsers without `document.ariaNotify()` */}
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        {latestMessage}
      </div>

      <div
        ref={stackRef}
        popover="manual"
        className={`toast-stack ${toasts.length > 0 ? 'has-toasts' : ''}`}
      >
        {toasts.map((toast) => {
          const VariantIcon =
            toast.variant === 'error'
              ? AlertCircle
              : toast.variant === 'info'
                ? Info
                : CircleCheck;

          return (
            <div
              key={toast.id}
              className={`toast-item bento-card elevated variant-${toast.variant}`}
            >
              <span className="toast-item-icon" aria-hidden="true">
                <VariantIcon size={17} strokeWidth={1.5} />
              </span>

              <p className="toast-item-text">{toast.message}</p>

              <button
                type="button"
                className="btn ghost toast-dismiss-btn"
                aria-label={t('toast.dismissLabel')}
                onClick={() => onDismiss?.(toast.id)}
              >
                <X size={14} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
