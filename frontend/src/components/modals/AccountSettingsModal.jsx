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
  Palette,
  RotateCcw,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import {
  COLOR_PALETTE_PRESETS,
  DEFAULT_ESN_COLORS,
  PALETTE_SLOT_KEYS,
} from '../../lib/colorPalettes.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLang } from '../../context/LangContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
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
  const { user, profile, roleMeta, hasPermission, refreshProfile } = useAuth();
  const { t } = useLang();
  const { palette, savePalette } = useTheme();
  const { showToast } = useToast();

  // Granular permission gate: `new_member` and `visitor` cannot edit their display name,
  // but every user (including visitors) can stage and save their own color palette
  const canEditName = hasPermission('edit_own_name');
  const hasElevatedRole =
    hasPermission('manage_projects') || hasPermission('manage_roles');
  const roleDisplayName = roleMeta?.name || t('auth.roleMember');

  // Resolve current identity defaults from `public.profiles` or Google OAuth metadata
  const displayEmail = profile?.email || user?.email || '';
  const emailPrefix = displayEmail.includes('@')
    ? displayEmail.split('@')[0]
    : displayEmail;
  const googleName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  const initialFullName =
    profile?.full_name?.trim() || googleName.trim() || emailPrefix;

  // Controlled display name, staged palette draft, and save spinner state
  const [fullName, setFullName] = useState(initialFullName);
  const [draftPalette, setDraftPalette] = useState(() => ({
    presetId: palette?.presetId ?? 'esn',
    colors: [...(palette?.colors ?? DEFAULT_ESN_COLORS)],
  }));
  const [isSaving, setIsSaving] = useState(false);

  // Track unsaved edits to either display name (if permitted) or staged color palette
  const savedName = (profile?.full_name || '').trim();
  const trimmedInput = fullName.trim();
  const hasNameChanges =
    canEditName && trimmedInput.length > 0 && trimmedInput !== savedName;

  const savedColors = palette?.colors ?? DEFAULT_ESN_COLORS;
  const hasPaletteChanges =
    draftPalette.presetId !== (palette?.presetId ?? 'esn') ||
    draftPalette.colors.some(
      (hex, idx) => hex.toUpperCase() !== (savedColors[idx] || '').toUpperCase()
    );

  const hasChanges = hasNameChanges || hasPaletteChanges;

  const isDraftDefaultEsn =
    draftPalette.presetId === 'esn' &&
    draftPalette.colors.every(
      (hex, idx) => hex.toUpperCase() === DEFAULT_ESN_COLORS[idx]
    );

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

  // Reset staged name & palette state when the dialog closes without saving
  const handleDialogClose = () => {
    setFullName(initialFullName);
    setDraftPalette({
      presetId: palette?.presetId ?? 'esn',
      colors: [...(palette?.colors ?? DEFAULT_ESN_COLORS)],
    });
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

  // Stage a preset selection locally without applying it until Save Changes is clicked
  const handleSelectDraftPreset = (presetId) => {
    const preset = COLOR_PALETTE_PRESETS.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }
    setDraftPalette({
      presetId: preset.id,
      colors: [...preset.colors],
    });
  };

  // Stage an individual custom color override locally without applying it yet
  const handleChangeDraftColor = (index, hex) => {
    const normalized = hex.trim().toUpperCase();
    setDraftPalette((prev) => {
      const nextColors = [...prev.colors];
      nextColors[index] = normalized;
      return {
        presetId: 'custom',
        colors: nextColors,
      };
    });
  };

  // Stage resetting back to the official ESN palette (applied on Save Changes)
  const handleResetDraftPalette = () => {
    setDraftPalette({
      presetId: 'esn',
      colors: [...DEFAULT_ESN_COLORS],
    });
  };

  // Persist staged display name (when permitted & changed) and/or staged color palette
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!hasChanges || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      if (hasNameChanges) {
        const trimmedName = trimmedInput;

        if (!supabase || !user?.id) {
          showToast(t('settings.saveError'), 'error');
          return;
        }

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
      }

      if (hasPaletteChanges) {
        const savedOk = await savePalette(draftPalette);
        if (!savedOk) {
          return;
        }
      }

      showToast(
        hasNameChanges ? t('settings.savedSuccess') : t('palette.savedSuccess'),
        'success'
      );
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
                  className={`profile-role-pill font-mono-label ${
                    hasElevatedRole ? '' : 'member'
                  }`}
                >
                  {hasElevatedRole ? (
                    <ShieldCheck size={12} strokeWidth={1.5} aria-hidden="true" />
                  ) : (
                    <User size={12} strokeWidth={1.5} aria-hidden="true" />
                  )}
                  <span>{roleDisplayName}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Static lock notice when user lacks `edit_own_name` permission */}
          {!canEditName && (
            <div className="limbo-notice" role="status">
              <Lock size={15} strokeWidth={1.5} aria-hidden="true" />
              <span>{t('settings.memberEditLocked')}</span>
            </div>
          )}

          {/* Display Name (`full_name`) input — gated by `edit_own_name` permission */}
          <div className="form-field">
            <div className="form-label-row">
              <label htmlFor={nameInputId} className="form-label">
                {t('settings.usernameLabel')}
              </label>
              {canEditName ? (
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
              required={canEditName}
              readOnly={!canEditName}
              disabled={!canEditName}
              autoFocus={canEditName}
              className={`form-input ${
                !canEditName ? 'settings-readonly-input' : ''
              }`}
              placeholder={t('settings.usernamePlaceholder')}
              value={fullName}
              onChange={(event) => {
                if (!canEditName) {
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

          {/* Appearance & Color Palette section (available to all users) */}
          <section className="palette-section hairline-top" aria-label={t('palette.sectionTitle')}>
            <div className="palette-section-header">
              <div className="palette-section-heading">
                <Palette size={15} strokeWidth={1.5} aria-hidden="true" />
                <span className="form-label">{t('palette.sectionTitle')}</span>
              </div>
              <button
                type="button"
                className="btn ghost palette-reset-btn"
                disabled={isDraftDefaultEsn}
                onClick={handleResetDraftPalette}
              >
                <RotateCcw size={13} strokeWidth={1.5} aria-hidden="true" />
                <span>{t('palette.resetDefault')}</span>
              </button>
            </div>

            <p className="settings-field-hint">{t('palette.sectionSubtitle')}</p>

            {/* 5 Curated Preset Swatch Cards (staged until Save Changes) */}
            <div className="palette-preset-grid">
              {COLOR_PALETTE_PRESETS.map((preset) => {
                const isSelected = draftPalette.presetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`palette-preset-card ${isSelected ? 'is-active' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => handleSelectDraftPreset(preset.id)}
                  >
                    <div className="palette-preset-top">
                      <span className="palette-preset-name">{t(preset.labelKey)}</span>
                      {isSelected && (
                        <Check
                          size={13}
                          strokeWidth={1.75}
                          aria-hidden="true"
                          className="palette-preset-check"
                        />
                      )}
                    </div>
                    <div className="palette-dots-row" aria-hidden="true">
                      {preset.colors.map((hex, idx) => (
                        <span
                          key={`${preset.id}_${idx}`}
                          className="palette-dot"
                          style={{ '--swatch-color': hex }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 5 Individual Custom Color Overrides (staged until Save Changes) */}
            <div className="palette-custom-block">
              <span className="font-mono-label palette-custom-kicker">
                {t('palette.customizeLabel')}
              </span>
              <div className="palette-custom-grid">
                {draftPalette.colors.map((hex, idx) => (
                  <label key={PALETTE_SLOT_KEYS[idx]} className="palette-slot-card">
                    <span className="palette-slot-swatch-wrap">
                      <input
                        type="color"
                        className="palette-color-input"
                        aria-label={t(PALETTE_SLOT_KEYS[idx])}
                        value={hex}
                        onChange={(event) =>
                          handleChangeDraftColor(idx, event.target.value)
                        }
                      />
                    </span>
                    <span className="palette-slot-name">{t(PALETTE_SLOT_KEYS[idx])}</span>
                    <span className="font-mono-label palette-slot-hex tabular-nums">
                      {hex}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Modal action footer — Save Changes applies name edits (if permitted) and/or staged palette for all users */}
        <footer className="modal-footer hairline-top">
          <button type="button" className="btn" onClick={handleExplicitClose}>
            <span>{t('modal.cancel')}</span>
          </button>

          <button
            type="submit"
            className="btn primary"
            disabled={!hasChanges || isSaving}
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
        </footer>
      </form>
    </dialog>,
    document.body
  );
}
