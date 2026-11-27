/**
 * TeamPermissionsModal.jsx — Admin-Only Team & Permissions Roster Dialog
 * Portaled to `document.body` using the native `<dialog>` element (`showModal()`,
 * `closedby="any"` + Safari pointer-coordinate backdrop fallback, and native
 * `Escape` dismissal). Uses `roleHierarchy.js` (`canManageUser`, `getAssignableRoles`)
 * to protect same-level and higher-ranked accounts, stages role edits in
 * `pendingRoles` with explicit Confirm / Cancel buttons, and dispatches
 * auto-dismissing bottom-right toasts via `useToast()`.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Check,
  ChevronDown,
  LoaderCircle,
  Lock,
  Search,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import {
  canManageUser,
  getAssignableRoles,
} from '../../lib/roleHierarchy.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLang } from '../../context/LangContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

/**
 * Derives a two-letter uppercase monogram from a member's full name or email.
 */
function buildMemberInitials(fullName, email) {
  const trimmed = fullName?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }
  return (email || 'ES').slice(0, 2).toUpperCase();
}

export default function TeamPermissionsModal({ isOpen, onClose }) {
  const { user, profile, isAdmin } = useAuth();
  const { t } = useLang();
  const { showToast } = useToast();

  // Roster rows fetched from `public.profiles`, load state, and staged role map
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [pendingRoles, setPendingRoles] = useState({});

  // Real-time search query and sort order (`name_asc` | `name_desc` | `role_admin` | `role_member`)
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');

  const headingId = useId();
  const searchInputId = useId();
  const sortSelectId = useId();
  const dialogRef = useRef(null);
  const pressedOutsideRef = useRef(false);

  const actorRole = profile?.role || (isAdmin ? 'admin' : 'member');
  const assignableRoles = useMemo(
    () => getAssignableRoles(actorRole),
    [actorRole]
  );

  // Filter by `full_name` or `email` (case-insensitive) and sort in real time
  const visibleMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? members.filter((member) => {
          const name = (member.full_name || '').toLowerCase();
          const email = (member.email || '').toLowerCase();
          return name.includes(query) || email.includes(query);
        })
      : members;

    const getName = (member) =>
      (member.full_name?.trim() || member.email?.split('@')[0] || member.email || '').toLowerCase();
    const isMemberAdmin = (member) =>
      String(member.role || '').trim().toLowerCase() === 'admin';

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name_desc') {
        return getName(b).localeCompare(getName(a));
      }
      if (sortBy === 'role_admin') {
        const roleDiff = (isMemberAdmin(a) ? 0 : 1) - (isMemberAdmin(b) ? 0 : 1);
        return roleDiff !== 0 ? roleDiff : getName(a).localeCompare(getName(b));
      }
      if (sortBy === 'role_member') {
        const roleDiff = (isMemberAdmin(a) ? 1 : 0) - (isMemberAdmin(b) ? 1 : 0);
        return roleDiff !== 0 ? roleDiff : getName(a).localeCompare(getName(b));
      }
      return getName(a).localeCompare(getName(b));
    });
  }, [members, searchQuery, sortBy]);

  // Sync React `isOpen` boolean with native `dialog.showModal()` / `dialog.close()`
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isOpen && isAdmin) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, isAdmin]);

  // Fetch all active team profiles whenever an Admin opens the modal
  useEffect(() => {
    if (!isOpen || !isAdmin || !supabase) {
      return undefined;
    }

    let isActive = true;

    async function loadTeam() {
      setIsLoading(true);
      setLoadError(null);
      setPendingRoles({});
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('role', 'pending')
          .order('email', { ascending: true });

        if (!isActive) {
          return;
        }

        if (error) {
          console.error('[ESN Console] Failed to load team profiles:', error);
          setLoadError(t('team.loadError'));
          setMembers([]);
          return;
        }

        setMembers(data ?? []);
      } catch (error) {
        if (!isActive) {
          return;
        }
        console.error('[ESN Console] Unexpected error loading team profiles:', error);
        setLoadError(t('team.loadError'));
        setMembers([]);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadTeam();

    return () => {
      isActive = false;
    };
  }, [isOpen, isAdmin, t]);

  const handleDialogClose = () => {
    setLoadError(null);
    setUpdatingId(null);
    setPendingRoles({});
    setSearchQuery('');
    setSortBy('name_asc');
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

  // Stage a role change locally without saving until Confirm is clicked
  const handleStageRole = (memberId, savedRole, nextRole) => {
    setPendingRoles((prev) => {
      if (nextRole === savedRole) {
        const next = { ...prev };
        delete next[memberId];
        return next;
      }
      return { ...prev, [memberId]: nextRole };
    });
  };

  // Cancel a staged role change for a single row
  const handleCancelStage = (memberId) => {
    setPendingRoles((prev) => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });
  };

  // Commit the staged role change to `public.profiles` and fire a bottom-right toast
  const handleConfirmRole = async (member, stagedRole) => {
    const isSelf = member.id === user?.id;
    if (
      !supabase ||
      !isAdmin ||
      !stagedRole ||
      !canManageUser(actorRole, member.role, isSelf)
    ) {
      return;
    }

    setUpdatingId(member.id);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: stagedRole })
        .eq('id', member.id);

      if (error) {
        console.error('[ESN Console] Failed to update member role:', error);
        showToast(t('team.roleUpdateError'), 'error');
        return;
      }

      setMembers((prev) =>
        prev.map((row) =>
          row.id === member.id ? { ...row, role: stagedRole } : row
        )
      );
      handleCancelStage(member.id);

      const memberLabel =
        member.full_name?.trim() ||
        member.email?.split('@')[0] ||
        member.email ||
        'Member';
      const roleLabel =
        stagedRole === 'admin' ? t('auth.roleAdmin') : t('auth.roleMember');

      showToast(
        t('team.roleUpdated', { name: memberLabel, role: roleLabel }),
        'success'
      );
    } catch (error) {
      console.error('[ESN Console] Unexpected error updating member role:', error);
      showToast(t('team.roleUpdateError'), 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  if (typeof document === 'undefined' || !isAdmin) {
    return null;
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      className="modal-dialog modal-dialog-team bento-card elevated"
      aria-labelledby={headingId}
      onClose={handleDialogClose}
      onPointerDown={handleDialogPointerDown}
      onPointerUp={handleDialogPointerUp}
      {...{ closedby: 'any' }}
    >
      {/* Modal header with Swiss kicker, title, member count, and close button */}
      <header className="modal-header hairline-bottom">
        <div className="modal-header-copy">
          <div className="team-header-tags">
            <span className="mono-tag">{t('team.kicker')}</span>
            {!isLoading && (
              <span className="font-mono-label team-count-tag tabular-nums">
                {t('team.memberCount', { count: members.length })}
              </span>
            )}
          </div>
          <h1 id={headingId} className="font-editorial modal-title">
            {t('team.title')}
          </h1>
          <p className="modal-subtitle">{t('team.subtitle')}</p>
        </div>

        <button
          type="button"
          className="btn ghost modal-close-btn"
          aria-label={t('modal.closeLabel')}
          autoFocus
          onClick={handleExplicitClose}
        >
          <X size={17} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </header>

      <div className="modal-body team-modal-body">
        {/* Load failure banner if initial fetch fails */}
        {loadError && (
          <div className="settings-status-banner error" role="alert">
            <AlertCircle size={15} strokeWidth={1.5} aria-hidden="true" />
            <span>{loadError}</span>
          </div>
        )}

        {/* Compact search & sort toolbar shown when members exist */}
        {!isLoading && members.length > 0 && (
          <search className="team-toolbar">
            <div className="team-search-wrap">
              <label htmlFor={searchInputId} className="visually-hidden">
                {t('team.searchLabel')}
              </label>
              <Search
                size={15}
                strokeWidth={1.5}
                aria-hidden="true"
                className="team-search-icon"
              />
              <input
                id={searchInputId}
                type="search"
                className="form-input team-search-input"
                placeholder={t('team.searchPlaceholder')}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <div className="team-sort-wrap">
              <label htmlFor={sortSelectId} className="visually-hidden">
                {t('team.sortLabel')}
              </label>
              <select
                id={sortSelectId}
                className="team-role-select team-sort-select"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="name_asc">{t('team.sortNameAsc')}</option>
                <option value="name_desc">{t('team.sortNameDesc')}</option>
                <option value="role_admin">{t('team.sortRoleAdmin')}</option>
                <option value="role_member">{t('team.sortRoleMember')}</option>
              </select>
              <ChevronDown
                size={14}
                strokeWidth={1.5}
                aria-hidden="true"
                className="team-role-chevron"
              />
            </div>
          </search>
        )}

        {/* Loading state, empty state, no-matches state, or Notion-style member roster */}
        {isLoading ? (
          <div className="team-empty-state" role="status" aria-live="polite">
            <LoaderCircle
              size={18}
              strokeWidth={1.5}
              aria-hidden="true"
              className="auth-spinner"
            />
            <span className="font-mono-label">{t('team.loading')}</span>
          </div>
        ) : members.length === 0 ? (
          <div className="team-empty-state">
            <Users size={20} strokeWidth={1.5} aria-hidden="true" />
            <p>{t('team.emptyList')}</p>
          </div>
        ) : visibleMembers.length === 0 ? (
          <div className="team-empty-state">
            <Search size={20} strokeWidth={1.5} aria-hidden="true" />
            <p>{t('team.noMatches')}</p>
          </div>
        ) : (
          <div className="team-roster-wrap">
            <table className="team-roster-table">
              <thead>
                <tr>
                  <th scope="col" className="font-mono-label">
                    {t('team.memberCol')}
                  </th>
                  <th scope="col" className="font-mono-label team-role-col-head">
                    {t('team.roleCol')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleMembers.map((member) => {
                  const isSelf = member.id === user?.id;
                  const savedRole =
                    String(member.role || '').trim().toLowerCase() === 'admin'
                      ? 'admin'
                      : 'member';
                  const stagedRole = pendingRoles[member.id] ?? savedRole;
                  const hasPendingChange = stagedRole !== savedRole;
                  const canManage = canManageUser(actorRole, savedRole, isSelf);

                  const memberName =
                    member.full_name?.trim() ||
                    member.email?.split('@')[0] ||
                    member.email;
                  const initials = buildMemberInitials(
                    member.full_name,
                    member.email
                  );
                  const isRowUpdating = updatingId === member.id;

                  // Include savedRole in options so locked rows always render their current label
                  const roleOptions = assignableRoles.includes(savedRole)
                    ? assignableRoles
                    : [savedRole, ...assignableRoles];

                  return (
                    <tr key={member.id} className="team-roster-row">
                      <td>
                        <div className="team-member-cell">
                          <span className="team-avatar" aria-hidden="true">
                            {initials}
                          </span>
                          <div className="team-member-info">
                            <div className="team-member-name-row">
                              <span className="team-member-name">
                                {memberName}
                              </span>
                              {isSelf && (
                                <span className="team-you-pill font-mono-label">
                                  ({t('team.youBadge')})
                                </span>
                              )}
                            </div>
                            <span className="team-member-email">
                              {member.email}
                            </span>
                            {isSelf ? (
                              <span className="team-self-hint">
                                {t('team.selfDemoteHint')}
                              </span>
                            ) : !canManage ? (
                              <span className="team-hierarchy-hint">
                                <Lock size={11} strokeWidth={1.5} aria-hidden="true" />
                                <span>{t('team.hierarchyLockedHint')}</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="team-role-cell">
                        <div className="team-role-controls">
                          <div className="team-role-select-wrap">
                            <select
                              aria-label={`${memberName} — ${t('team.roleCol')}`}
                              className="team-role-select"
                              value={stagedRole}
                              disabled={!canManage || isRowUpdating}
                              onChange={(event) =>
                                handleStageRole(
                                  member.id,
                                  savedRole,
                                  event.target.value
                                )
                              }
                            >
                              {roleOptions.map((roleKey) => (
                                <option key={roleKey} value={roleKey}>
                                  {roleKey === 'admin'
                                    ? t('auth.roleAdmin')
                                    : t('auth.roleMember')}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={14}
                              strokeWidth={1.5}
                              aria-hidden="true"
                              className="team-role-chevron"
                            />
                          </div>

                          {/* Explicit Confirm / Cancel buttons revealed when a role change is staged */}
                          {hasPendingChange && canManage && (
                            <div className="team-confirm-group">
                              <button
                                type="button"
                                className="btn primary team-confirm-btn"
                                disabled={isRowUpdating}
                                aria-label={t('team.confirmRole')}
                                title={t('team.confirmRole')}
                                onClick={() =>
                                  handleConfirmRole(member, stagedRole)
                                }
                              >
                                {isRowUpdating ? (
                                  <LoaderCircle
                                    size={14}
                                    strokeWidth={1.5}
                                    aria-hidden="true"
                                    className="auth-spinner"
                                  />
                                ) : (
                                  <Check size={14} strokeWidth={1.5} aria-hidden="true" />
                                )}
                              </button>

                              <button
                                type="button"
                                className="btn ghost team-cancel-btn"
                                disabled={isRowUpdating}
                                aria-label={t('team.cancelRole')}
                                title={t('team.cancelRole')}
                                onClick={() => handleCancelStage(member.id)}
                              >
                                <X size={14} strokeWidth={1.5} aria-hidden="true" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal footer */}
      <footer className="modal-footer hairline-top">
        <button type="button" className="btn" onClick={handleExplicitClose}>
          <span>{t('modal.closeLabel')}</span>
        </button>
      </footer>
    </dialog>,
    document.body
  );
}
