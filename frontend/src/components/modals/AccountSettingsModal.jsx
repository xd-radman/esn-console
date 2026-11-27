/**
 * AccountSettingsModal.jsx — Notion-Style Centered Account Settings Dialog
 * Portaled to `document.body` using the native `<dialog>` element (`showModal()`,
 * `closedby="any"` + Safari pointer-coordinate backdrop fallback, and native
 * `Escape` dismissal). Displays the user's monogram avatar, read-only Google
 * email, current role pill (`Admin` / `Member`), and a Display Name (`full_name`)
 * field (editable for Admins, locked read-only for Members). All validation,
 * uniqueness, and save outcomes dispatch bottom-right toasts via `useToast()`
 * so the modal layout stays completely static.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  LoaderCircle,
  Lock,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLang } from '../../context/LangContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

/**
 * Derives a two-letter uppercase monogram from a display name or fallback.
 */
function buildInitials(name, fallback) {
  const trimmed = name?.trim();
  if (!trimmed) {
    return fallback;
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export default function AccountSettingsModal({ isOpen, onClose }) {
  const { user, profile, isAdmin, refreshProfile } = useAuth();
  const { t } = useLang();
  const { showToast } = useToast();

  // Resolve current identity defaults from `public.profiles` or Google OAuth metadata
  const displayEmail = profile?.email || user?.email || '';
  const emailPrefix = displayEmail.includes('@')
    ? displayEmail.split('@')[0]
    : displayEmail;
  const googleName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  const initialFullName =
    profile?.full_name?.trim() || googleName.trim() || emailPrefix;

  // Controlled display name input and save spinner state
  const [fullName, setFullName] = useState(initialFullName);
  const [isSaving, setIsSaving] = useState(false);

  // Track whether the trimmed input differs from the saved `public.profiles.full_name`
  const savedName = (profile?.full_name || '').trim();
  const trimmedInput = fullName.trim();
  const hasChanges = trimmedInput.length > 0 && trimmedInput !== savedName;

  const headingId = useId();
  const nameInputId = useId();
  const emailInputId = useId();
  const emailHintId = useId();

  const dialogRef = useRef(null);
  const nameInputRef = useRef(null);
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

  // Reset form state whenever the dialog closes so next open initializes fresh from `profile`
  const handleDialogClose = () => {
    setFullName(initialFullName);
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

  // Pointer-coordinate backdrop dismiss fallback for Safari (lacks `closedby="any"`)
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

  // Validate non-empty & unique username, persist to `public.profiles`, and notify via toast
  const handleSubmit = async (event) => {
    event.preventDefault();

    // Hard guard: prevent non-admin members or unchanged inputs from firing requests or toasts
    if (!isAdmin || !hasChanges) {
      return;
    }

    const trimmedName = trimmedInput;

    if (!supabase || !user?.id) {
      showToast(t('settings.saveError'), 'error');
      return;
    }

    setIsSaving(true);
    try {
      // Pre-check case-insensitive username uniqueness against other profiles
      const { data: existingMatch, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('full_name', trimmedName)
        .neq('id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('[ESN Console] Failed to verify username uniqueness:', checkError);
      } else if (existingMatch) {
        showToast(t('settings.usernameTaken'), 'error');
        nameInputRef.current?.focus();
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: trimmedName })
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505') {
          showToast(t('settings.usernameTaken'), 'error');
          nameInputRef.current?.focus();
          return;
        }
        console.error('[ESN Console] Failed to update full_name:', error);
        showToast(error.message || t('settings.saveError'), 'error');
        return;
      }

      await refreshProfile();
      setFullName(trimmedName);
      showToast(t('settings.savedSuccess'), 'success');
    } catch (error) {
      console.error('[ESN Console] Unexpected error saving profile:', error);
      showToast(
        error instanceof Error ? error.message : t('settings.saveError'),
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const previewMonogram = buildInitials(
    fullName || initialFullName,
    t('profile.monogram')
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      className="modal-dialog modal-dialog-settings bento-card elevated"
      aria-labelledby={headingId}
      onClose={handleDialogClose}
      onPointerDown={handleDialogPointerDown}
      onPointerUp={handleDialogPointerUp}
      {...{ closedby: 'any' }}
    >
      {/* Modal header with Swiss kicker, level-1 heading, and explicit close button */}
      <header className="modal-header hairline-bottom">
        <div className="modal-header-copy">
          <span className="mono-tag">{t('settings.kicker')}</span>
          <h1 id={headingId} className="font-editorial modal-title">
            {t('settings.title')}
          </h1>
          <p className="modal-subtitle">{t('settings.subtitle')}</p>
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

      <form className="modal-form" onSubmit={handleSubmit} noValidate>
        <div className="modal-body">
          {/* Profile identity preview card with live monogram and role pill */}
          <div className="settings-profile-card">
            <div className="profile-monogram settings-monogram" aria-hidden="true">
              {previewMonogram}
            </div>

            <div className="settings-profile-meta">
              <span className="settings-profile-name">
                {fullName.trim() || initialFullName}
              </span>
              <div className="settings-profile-role-row">
                <span className="font-mono-label settings-role-caption">
                  {t('settings.roleLabel')}
                </span>
                <span
                  className={`profile-role-pill font-mono-label ${isAdmin ? '' : 'member'}`}
                >
                  {isAdmin ? (
                    <ShieldCheck size={12} strokeWidth={1.5} aria-hidden="true" />
                  ) : (
                    <User size={12} strokeWidth={1.5} aria-hidden="true" />
                  )}
                  <span>
                    {isAdmin ? t('auth.roleAdmin') : t('auth.roleMember')}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Static Member lock notice when non-admin profile editing is disabled */}
          {!isAdmin && (
            <div className="limbo-notice" role="status">
              <Lock size={15} strokeWidth={1.5} aria-hidden="true" />
              <span>{t('settings.memberEditLocked')}</span>
            </div>
          )}

          {/* Display Name (`full_name`) input — editable for Admins, locked read-only for Members */}
          <div className="form-field">
            <div className="form-label-row">
              <label htmlFor={nameInputId} className="form-label">
                {t('settings.usernameLabel')}
              </label>
              {isAdmin ? (
                <span className="font-mono-label form-badge required">
                  {t('modal.requiredBadge')}
                </span>
              ) : (
                <span className="font-mono-label form-badge settings-lock-badge">
                  <Lock size={11} strokeWidth={1.5} aria-hidden="true" />
                  <span>{t('auth.readOnlyBadge')}</span>
                </span>
              )}
            </div>

            <input
              ref={nameInputRef}
              id={nameInputId}
              name="full_name"
              type="text"
              autoComplete="name"
              maxLength={80}
              required={isAdmin}
              readOnly={!isAdmin}
              disabled={!isAdmin}
              autoFocus={isAdmin}
              className={`form-input ${
                !isAdmin ? 'settings-readonly-input' : ''
              }`}
              placeholder={t('settings.usernamePlaceholder')}
              value={fullName}
              onChange={(event) => {
                if (!isAdmin) {
                  return;
                }
                setFullName(event.target.value);
              }}
            />
          </div>

          {/* Read-only Google Email field */}
          <div className="form-field">
            <div className="form-label-row">
              <label htmlFor={emailInputId} className="form-label">
                {t('settings.emailLabel')}
              </label>
              <span className="font-mono-label form-badge settings-lock-badge">
                <Lock size={11} strokeWidth={1.5} aria-hidden="true" />
                <span>{t('auth.readOnlyBadge')}</span>
              </span>
            </div>

            <input
              id={emailInputId}
              name="email"
              type="email"
              readOnly
              className="form-input settings-readonly-input"
              value={displayEmail}
              aria-describedby={emailHintId}
            />
            <p id={emailHintId} className="settings-field-hint">
              {t('settings.emailReadonlyHint')}
            </p>
          </div>
        </div>

        {/* Modal action footer — Save button rendered exclusively for Admins */}
        <footer className="modal-footer hairline-top">
          <button type="button" className="btn" onClick={handleExplicitClose}>
            <span>{isAdmin ? t('modal.cancel') : t('modal.closeLabel')}</span>
          </button>

          {isAdmin && (
            <button
              type="submit"
              className="btn primary"
              disabled={!isAdmin || !hasChanges || isSaving}
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
                  <Check size={15} strokeWidth={1.5} aria-hidden="true" />
                  <span>{t('settings.saveBtn')}</span>
                </>
              )}
            </button>
          )}
        </footer>
      </form>
    </dialog>,
    document.body
  );
}
