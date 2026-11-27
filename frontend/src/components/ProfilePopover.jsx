/**
 * ProfilePopover.jsx — Account Overview Popover Card
 * Displays the authenticated Supabase user's identity (`full_name` or email
 * prefix), `email`, dynamic `Admin` vs `Member` role pill, status/access
 * summary strip, and a wired Sign Out action. Dismisses automatically on
 * outside pointer press (`mousedown`) or `Escape`.
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CircleCheck,
  KeyRound,
  LogOut,
  Settings,
  Shield,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Derives a two-letter uppercase monogram from the display name or fallback.
 */
function getInitials(name, fallback) {
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

export default function ProfilePopover({
  id,
  isOpen,
  onClose,
  triggerRef,
  onOpenSettings,
  onOpenTeam,
}) {
  const { t } = useLang();
  const { user, profile, roleMeta, hasPermission, isLimbo, signOut } = useAuth();
  const navigate = useNavigate();

  const canManageRoles = hasPermission('manage_roles');
  const hasElevatedAccess =
    hasPermission('manage_projects') || hasPermission('manage_roles');
  const roleDisplayName = roleMeta?.name || t('auth.roleMember');

  // Reference to the popover card DOM node for outside-click detection
  const popoverRef = useRef(null);

  // Resolve real authenticated display identity from `public.profiles` or Google OAuth metadata
  const displayEmail = profile?.email || user?.email || t('profile.email');
  const emailPrefix = displayEmail.includes('@')
    ? displayEmail.split('@')[0]
    : displayEmail;
  const googleName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  const displayName =
    profile?.full_name?.trim() || googleName.trim() || emailPrefix || t('profile.name');
  const monogram = getInitials(displayName, t('profile.monogram'));

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

  // Sign out via Supabase Auth, close the popover, and navigate back to `/login`
  const handleSignOut = async () => {
    onClose();
    await signOut();
    navigate('/login', { replace: true });
  };

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
      {/* Top identity block: monogram avatar, real name, email, and dynamic Admin/Member pill */}
      <div className="profile-identity">
        <div className="profile-monogram" aria-hidden="true">
          {monogram}
        </div>

        <div className="profile-details">
          <div className="profile-name-row">
            <span className="profile-name">{displayName}</span>
            <span
              className={`profile-role-pill font-mono-label ${
                hasElevatedAccess ? '' : 'member'
              }`}
            >
              {hasElevatedAccess ? (
                <ShieldCheck size={12} strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <User size={12} strokeWidth={1.5} aria-hidden="true" />
              )}
              <span>{roleDisplayName}</span>
            </span>
          </div>
          <span className="profile-email">{displayEmail}</span>
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
            <span>
              {hasElevatedAccess
                ? t('profile.accessFull')
                : isLimbo
                  ? t('limbo.statusPending')
                  : t('auth.readOnlyBadge')}
            </span>
          </dd>
        </div>
      </dl>

      <hr className="profile-divider" />

      {/* Account action buttons opening centered Notion-style settings modals */}
      <div className="profile-actions">
        <button
          type="button"
          className="profile-action-btn"
          onClick={() => {
            onClose();
            onOpenSettings?.();
          }}
        >
          <Settings size={15} strokeWidth={1.5} aria-hidden="true" />
          <span>{t('profile.accountSettings')}</span>
        </button>

        {canManageRoles && (
          <button
            type="button"
            className="profile-action-btn"
            onClick={() => {
              onClose();
              onOpenTeam?.();
            }}
          >
            <Shield size={15} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('team.menuLabel')}</span>
          </button>
        )}
      </div>

      <hr className="profile-divider" />

      {/* Wired Supabase Sign-Out action row */}
      <div className="profile-actions">
        <button
          type="button"
          className="profile-action-btn signout"
          onClick={handleSignOut}
        >
          <LogOut size={15} strokeWidth={1.5} aria-hidden="true" />
          <span>{t('auth.signOut')}</span>
        </button>
      </div>
    </div>
  );
}
