/**
 * ToastContext.jsx — Auto-Dismissing Bottom-Right Toast Notification Provider
 * Exposes `showToast(message, variant = 'success' | 'error' | 'info')` and
 * `dismissToast(id)` across the entire app, automatically dismissing each toast
 * after 3.5 seconds while cleaning up all active timers on unmount.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ToastViewport from '../components/ToastViewport.jsx';

const ToastContext = createContext(null);

// Default auto-dismiss duration (3.5 seconds)
const TOAST_DURATION_MS = 3500;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Map of active `toastId -> timeoutId` so every timer is cleared on dismiss or unmount
  const timersRef = useRef(new Map());

  // Clear any pending timers on provider unmount
  useEffect(() => {
    const timerMap = timersRef.current;
    return () => {
      for (const timeoutId of timerMap.values()) {
        window.clearTimeout(timeoutId);
      }
      timerMap.clear();
    };
  }, []);

  const dismissToast = useCallback((id) => {
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message, variant = 'success') => {
      if (!message) {
        return null;
      }
      const id = `toast_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);

      const timeoutId = window.setTimeout(() => {
        timersRef.current.delete(id);
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, TOAST_DURATION_MS);

      timersRef.current.set(id, timeoutId);

      // Announce visible message via native `ariaNotify()` when supported
      if (typeof document !== 'undefined' && typeof document.ariaNotify === 'function') {
        document.ariaNotify(message);
      }

      return id;
    },
    []
  );

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      dismissToast,
    }),
    [toasts, showToast, dismissToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

/**
 * Custom hook returning `{ showToast, dismissToast, toasts }`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}
