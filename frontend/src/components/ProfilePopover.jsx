/**
 * ProfilePopover.jsx — Account Overview Popover Card
 * Layout-only account surface anchored to the circular profile button in `Header.jsx`.
 * Displays coordinator identity, role badge, status/access summary strip, and
 * placeholder account actions (wired to real Supabase Auth in Phase 4).
 * Dismisses automatically on outside pointer press (`mousedown`) or `Escape`.
 */

import { useEffect, useRef } from 'react';
import {
  Building2,
  CircleCheck,
  KeyRound,
  LogOut,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';

export default function ProfilePopover({ id, isOpen, onClose, triggerRef }) {
  const { t } = useLang();

  // Reference to the popover card DOM node for outside-click detection
  const popoverRef = useRef(null);

  // Attach document-level `mousedown` and `Escape` listeners only while open
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDownOutside = (event) => {
      const target = event.target;
      // Ignore clicks inside the popover itself or on the trigger button (handled by toggle)
      if (
        popoverRef.current?.contains(target) ||
        triggerRef?.current?.contains(target)
      ) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        // Restore keyboard focus to the circular profile button on Escape dismissal
        triggerRef?.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={popoverRef}
      id={id}
      className="profile-popover bento-card elevated"
      role="group"
      aria-label={t('profile.triggerLabel')}
    >
      {/* Top identity block: monogram avatar, coordinator name, email, and role pill */}
      <div className="profile-identity">
        <div className="profile-monogram" aria-hidden="true">
          {t('profile.monogram')}
        </div>

        <div className="profile-details">
          <div className="profile-name-row">
            <span className="profile-name">{t('profile.name')}</span>
            <span className="profile-role-pill font-mono-label">
              <ShieldCheck size={12} strokeWidth={1.5} aria-hidden="true" />
              <span>{t('profile.roleAdmin')}</span>
            </span>
          </div>
          <span className="profile-email">{t('profile.email')}</span>
        </div>
      </div>

      {/* Two-column status & access level summary strip */}
      <dl className="profile-status-strip">
        <div className="profile-status-cell">
          <dt className="font-mono-label">{t('profile.statusLabel')}</dt>
          <dd className="profile-status-value active">
            <CircleCheck size={13} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('profile.statusActive')}</span>
          </dd>
        </div>

        <div className="profile-status-cell">
          <dt className="font-mono-label">{t('profile.accessLabel')}</dt>
          <dd className="profile-status-value">
            <KeyRound size={13} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('profile.accessFull')}</span>
          </dd>
        </div>
      </dl>

      <hr className="profile-divider" />

      {/* Layout-only account action buttons (connected to Supabase in Phase 4) */}
      <div className="profile-actions">
        <button type="button" className="profile-action-btn" onClick={onClose}>
          <Settings size={15} strokeWidth={1.5} aria-hidden="true" />
          <span>{t('profile.accountSettings')}</span>
          <span className="profile-action-tag font-mono-label">
            {t('profile.authPreviewTag')}
          </span>
        </button>

        <button type="button" className="profile-action-btn" onClick={onClose}>
          <Building2 size={15} strokeWidth={1.5} aria-hidden="true" />
          <span>{t('profile.sectionWorkspace')}</span>
        </button>
      </div>

      <hr className="profile-divider" />

      {/* Sign-out action row */}
      <div className="profile-actions">
        <button
          type="button"
          className="profile-action-btn signout"
          onClick={onClose}
        >
          <LogOut size={15} strokeWidth={1.5} aria-hidden="true" />
          <span>{t('profile.signOut')}</span>
        </button>
      </div>
    </div>
  );
}
