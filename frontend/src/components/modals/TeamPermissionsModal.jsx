/**
 * TeamPermissionsModal.jsx — Two-Tab Team & Role Hierarchy Management Dialog
 * Portaled to `document.body` using the native `<dialog>` element (`showModal()`,
 * `closedby="any"` + Safari pointer-coordinate backdrop fallback, and native
 * `Escape` dismissal). Accessible to users holding `manage_roles`:
 * - **Members Tab**: Searchable & sortable user roster -> User Detail &
 *   Per-User Permissions drill-down (read-only identity, dynamic assignable role
 *   dropdown, Swiss toggle switches from `PERMISSION_CATALOG`, Reset to Role
 *   Defaults, and gated Save Changes).
 * - **Roles Tab**: Custom Role Creator (`level: 50`, `CUSTOM_ROLE_BASELINE_PERMISSIONS`)
 *   + Role Directory -> Custom Role Settings drill-down (default permission
 *   toggles + safe Delete Role reassigning existing users to `'visitor'`).
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  LoaderCircle,
  Lock,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import {
  CUSTOM_ROLE_BASELINE_PERMISSIONS,
  PERMISSION_CATALOG,
  canEditRole,
  canManageUser,
  getAssignableRoles,
  getRoleLevel,
  getRoleMeta,
  normalizeRoleSlug,
  resolveUserPermissions,
  slugifyRoleName,
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

/**
 * Normalizes a role's `default_permissions` object against `PERMISSION_CATALOG`.
 */
function normalizePermMap(rawMap = {}) {
  const normalized = {};
  for (const { key } of PERMISSION_CATALOG) {
    normalized[key] = Boolean(rawMap?.[key]);
  }
  return normalized;
}

export default function TeamPermissionsModal({ isOpen, onClose }) {
  const {
    user,
    role: actorRole,
    roleLevel: actorLevel,
    roles,
    rolesMap,
    refreshRoles,
    hasPermission,
  } = useAuth();
  const { t } = useLang();
  const { showToast } = useToast();

  const canManageRoles = hasPermission('manage_roles');
  // Owner (100), President (90), and Vice President (80) can create & edit custom roles
  const canCreateCustomRoles = canManageRoles && actorLevel >= 80;

  // Top-level modal tab (`'members'` | `'roles'`)
  const [activeTab, setActiveTab] = useState('members');

  // Members tab state: roster rows, loading/error, search/sort, and user drill-down
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('role_desc');

  // Selected member drill-down & staged edits (`stagedRole` + `stagedOverrides`)
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [stagedRole, setStagedRole] = useState('');
  const [stagedOverrides, setStagedOverrides] = useState({});
  const [isSavingMember, setIsSavingMember] = useState(false);

  // Roles tab state: new custom role creator + custom role settings drill-down
  const [newRoleName, setNewRoleName] = useState('');
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [selectedRoleSlug, setSelectedRoleSlug] = useState(null);
  const [stagedRolePerms, setStagedRolePerms] = useState({});
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [confirmDeleteRole, setConfirmDeleteRole] = useState(false);
  const [isDeletingRole, setIsDeletingRole] = useState(false);

  const headingId = useId();
  const membersTabId = useId();
  const rolesTabId = useId();
  const searchInputId = useId();
  const sortSelectId = useId();
  const memberRoleSelectId = useId();
  const newRoleInputId = useId();

  const dialogRef = useRef(null);
  const membersTabRef = useRef(null);
  const rolesTabRef = useRef(null);
  const pressedOutsideRef = useRef(false);

  // Assignable lower-ranked roles (auto-includes all custom roles below actorLevel)
  const assignableRoles = useMemo(
    () => getAssignableRoles(actorRole, rolesMap),
    [actorRole, rolesMap]
  );

  // Active roles list ordered by level descending (excluding `'pending'`)
  const visibleRolesList = useMemo(
    () =>
      roles
        .filter(
          (item) =>
            normalizeRoleSlug(item.slug) !== 'pending' &&
            (Number(item.level) || 0) > 0
        )
        .sort((a, b) => {
          const diff = (Number(b.level) || 0) - (Number(a.level) || 0);
          return diff !== 0 ? diff : String(a.name || '').localeCompare(String(b.name || ''));
        }),
    [roles]
  );

  // Resolve currently selected member and custom role from live collections
  const selectedMember = useMemo(
    () => members.find((item) => item.id === selectedMemberId) ?? null,
    [members, selectedMemberId]
  );

  const selectedRole = useMemo(
    () =>
      visibleRolesList.find(
        (item) => normalizeRoleSlug(item.slug) === selectedRoleSlug
      ) ?? null,
    [visibleRolesList, selectedRoleSlug]
  );

  // Filter & sort the Members roster in real time
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

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name_desc') {
        return getName(b).localeCompare(getName(a));
      }
      if (sortBy === 'role_desc') {
        const lvlDiff = getRoleLevel(b.role, rolesMap) - getRoleLevel(a.role, rolesMap);
        return lvlDiff !== 0 ? lvlDiff : getName(a).localeCompare(getName(b));
      }
      if (sortBy === 'role_asc') {
        const lvlDiff = getRoleLevel(a.role, rolesMap) - getRoleLevel(b.role, rolesMap);
        return lvlDiff !== 0 ? lvlDiff : getName(a).localeCompare(getName(b));
      }
      return getName(a).localeCompare(getName(b));
    });
  }, [members, searchQuery, sortBy, rolesMap]);

  // Sync React `isOpen` boolean with native `dialog.showModal()` / `dialog.close()`
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isOpen && canManageRoles) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, canManageRoles]);

  // Fetch all active team profiles & refresh roles whenever modal opens
  useEffect(() => {
    if (!isOpen || !canManageRoles || !supabase) {
      return undefined;
    }

    let isActive = true;

    async function loadTeamData() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [profilesRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .neq('role', 'pending')
            .order('email', { ascending: true }),
          refreshRoles(),
        ]);

        if (!isActive) {
          return;
        }

        if (profilesRes.error) {
          console.error('[ESN Console] Failed to load team profiles:', profilesRes.error);
          setLoadError(t('team.loadError'));
          setMembers([]);
          return;
        }

        setMembers(profilesRes.data ?? []);
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

    loadTeamData();

    return () => {
      isActive = false;
    };
  }, [isOpen, canManageRoles, refreshRoles, t]);

  // Reset all transient modal states on close
  const handleDialogClose = () => {
    setActiveTab('members');
    setLoadError(null);
    setSearchQuery('');
    setSortBy('role_desc');
    setSelectedMemberId(null);
    setStagedRole('');
    setStagedOverrides({});
    setSelectedRoleSlug(null);
    setStagedRolePerms({});
    setNewRoleName('');
    setConfirmDeleteRole(false);
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

  // Arrow-key roving focus for the Members | Roles tablist
  const handleTabKeyDown = (event) => {
    if (
      event.key === 'ArrowRight' ||
      event.key === 'ArrowLeft' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      event.preventDefault();
      let nextTab;
      if (event.key === 'Home') {
        nextTab = 'members';
      } else if (event.key === 'End') {
        nextTab = 'roles';
      } else {
        nextTab = activeTab === 'members' ? 'roles' : 'members';
      }
      setActiveTab(nextTab);
      if (nextTab === 'members') {
        membersTabRef.current?.focus();
      } else {
        rolesTabRef.current?.focus();
      }
    }
  };

  // Open Member Detail drill-down for a manageable user
  const handleOpenMemberDetail = (member) => {
    const savedRole = normalizeRoleSlug(member.role);
    const savedOverrides =
      member.permissions && typeof member.permissions === 'object'
        ? { ...member.permissions }
        : {};
    setSelectedMemberId(member.id);
    setStagedRole(savedRole);
    setStagedOverrides(savedOverrides);
  };

  // Effective staged permissions vs saved permissions for the selected user
  const stagedRoleDefaults = useMemo(
    () => normalizePermMap(getRoleMeta(stagedRole, rolesMap)?.default_permissions),
    [stagedRole, rolesMap]
  );

  const effectiveStagedMemberPerms = useMemo(() => {
    const result = {};
    for (const { key } of PERMISSION_CATALOG) {
      if (Object.hasOwn(stagedOverrides, key) && typeof stagedOverrides[key] === 'boolean') {
        result[key] = stagedOverrides[key];
      } else {
        result[key] = stagedRoleDefaults[key];
      }
    }
    return result;
  }, [stagedOverrides, stagedRoleDefaults]);

  const savedMemberPerms = useMemo(
    () => (selectedMember ? resolveUserPermissions(selectedMember, rolesMap) : {}),
    [selectedMember, rolesMap]
  );

  const hasMemberChanges = useMemo(() => {
    if (!selectedMember) {
      return false;
    }
    const savedRole = normalizeRoleSlug(selectedMember.role);
    if (stagedRole !== savedRole) {
      return true;
    }
    return PERMISSION_CATALOG.some(
      ({ key }) => Boolean(effectiveStagedMemberPerms[key]) !== Boolean(savedMemberPerms[key])
    );
  }, [selectedMember, stagedRole, effectiveStagedMemberPerms, savedMemberPerms]);

  // Toggle a single per-user permission override (keeping overrides minimal vs role defaults)
  const handleToggleMemberPermission = (permKey, checked) => {
    if (!hasPermission(permKey)) {
      return;
    }
    setStagedOverrides((prev) => {
      const next = { ...prev };
      if (checked === Boolean(stagedRoleDefaults[permKey])) {
        delete next[permKey];
      } else {
        next[permKey] = checked;
      }
      return next;
    });
  };

  // Save staged role & per-user permission overrides to `public.profiles`
  const handleSaveMemberDetail = async () => {
    if (!supabase || !selectedMember || !hasMemberChanges) {
      return;
    }
    const isSelf = selectedMember.id === user?.id;
    if (!canManageUser(actorRole, selectedMember.role, isSelf, rolesMap)) {
      return;
    }

    setIsSavingMember(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: stagedRole,
          permissions: stagedOverrides,
        })
        .eq('id', selectedMember.id);

      if (error) {
        console.error('[ESN Console] Failed to update member permissions:', error);
        showToast(error.message || t('team.roleUpdateError'), 'error');
        return;
      }

      setMembers((prev) =>
        prev.map((row) =>
          row.id === selectedMember.id
            ? { ...row, role: stagedRole, permissions: { ...stagedOverrides } }
            : row
        )
      );

      const memberLabel =
        selectedMember.full_name?.trim() ||
        selectedMember.email?.split('@')[0] ||
        selectedMember.email ||
        'Member';

      showToast(t('team.memberSaved', { name: memberLabel }), 'success');
    } catch (error) {
      console.error('[ESN Console] Unexpected error saving member permissions:', error);
      showToast(t('team.roleUpdateError'), 'error');
    } finally {
      setIsSavingMember(false);
    }
  };

  // Create a new custom role (`level: 50`, `is_system: false`) in `public.roles`
  const handleCreateRole = async (event) => {
    event.preventDefault();
    const trimmedName = newRoleName.trim();
    if (!trimmedName || !supabase || !canCreateCustomRoles) {
      return;
    }

    const baseSlug = slugifyRoleName(trimmedName);
    const duplicate = roles.some(
      (item) =>
        normalizeRoleSlug(item.slug) === baseSlug ||
        String(item.name || '').trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      showToast(t('team.roleExists'), 'error');
      return;
    }

    setIsCreatingRole(true);
    try {
      const { error } = await supabase.from('roles').insert({
        slug: baseSlug,
        name: trimmedName,
        level: 50,
        is_system: false,
        default_permissions: { ...CUSTOM_ROLE_BASELINE_PERMISSIONS },
      });

      if (error) {
        console.error('[ESN Console] Failed to create custom role:', error);
        showToast(
          error.code === '23505'
            ? t('team.roleExists')
            : error.message || t('team.roleCreateError'),
          'error'
        );
        return;
      }

      await refreshRoles();
      setNewRoleName('');
      showToast(t('team.roleCreated', { name: trimmedName }), 'success');
    } catch (error) {
      console.error('[ESN Console] Unexpected error creating custom role:', error);
      showToast(t('team.roleCreateError'), 'error');
    } finally {
      setIsCreatingRole(false);
    }
  };

  // Open Role Settings drill-down for any role strictly below the actor's level
  const handleOpenRoleDetail = (roleItem) => {
    if (!canEditRole(actorRole, roleItem, rolesMap)) {
      return;
    }
    setSelectedRoleSlug(normalizeRoleSlug(roleItem.slug));
    setStagedRolePerms(normalizePermMap(roleItem.default_permissions));
    setConfirmDeleteRole(false);
  };

  // Detect whether staged default permissions differ from saved role defaults
  const hasRolePermChanges = useMemo(() => {
    if (!selectedRole) {
      return false;
    }
    const saved = normalizePermMap(selectedRole.default_permissions);
    return PERMISSION_CATALOG.some(
      ({ key }) => Boolean(stagedRolePerms[key]) !== Boolean(saved[key])
    );
  }, [selectedRole, stagedRolePerms]);

  // Save updated `default_permissions` for an editable system or custom role in `public.roles`
  const handleSaveRolePerms = async () => {
    if (
      !supabase ||
      !selectedRole ||
      !canEditRole(actorRole, selectedRole, rolesMap) ||
      !hasRolePermChanges
    ) {
      return;
    }

    setIsSavingRole(true);
    try {
      const { error } = await supabase
        .from('roles')
        .update({ default_permissions: stagedRolePerms })
        .eq('slug', selectedRole.slug);

      if (error) {
        console.error('[ESN Console] Failed to update custom role permissions:', error);
        showToast(error.message || t('team.roleSaveError'), 'error');
        return;
      }

      await refreshRoles();
      showToast(t('team.roleSaved', { name: selectedRole.name }), 'success');
    } catch (error) {
      console.error('[ESN Console] Unexpected error saving custom role:', error);
      showToast(t('team.roleSaveError'), 'error');
    } finally {
      setIsSavingRole(false);
    }
  };

  // Reassign any users on this custom role to `'visitor'`, then delete the role row
  const handleConfirmDeleteRole = async () => {
    if (!supabase || !selectedRole || selectedRole.is_system) {
      return;
    }

    setIsDeletingRole(true);
    try {
      const roleSlug = selectedRole.slug;
      const roleName = selectedRole.name;

      // 1. Safely reassign all members currently holding this role to `'visitor'`
      const { error: reassignError } = await supabase
        .from('profiles')
        .update({ role: 'visitor' })
        .eq('role', roleSlug);

      if (reassignError) {
        console.error('[ESN Console] Failed to reassign members before role delete:', reassignError);
        showToast(reassignError.message || t('team.roleDeleteError'), 'error');
        return;
      }

      // 2. Delete the custom role from `public.roles`
      const { error: deleteError } = await supabase
        .from('roles')
        .delete()
        .eq('slug', roleSlug);

      if (deleteError) {
        console.error('[ESN Console] Failed to delete custom role:', deleteError);
        showToast(deleteError.message || t('team.roleDeleteError'), 'error');
        return;
      }

      // 3. Sync local members state + refresh live roles list
      setMembers((prev) =>
        prev.map((row) =>
          normalizeRoleSlug(row.role) === normalizeRoleSlug(roleSlug)
            ? { ...row, role: 'visitor' }
            : row
        )
      );
      await refreshRoles();
      setSelectedRoleSlug(null);
      setConfirmDeleteRole(false);
      showToast(t('team.roleDeleted', { name: roleName }), 'success');
    } catch (error) {
      console.error('[ESN Console] Unexpected error deleting custom role:', error);
      showToast(t('team.roleDeleteError'), 'error');
    } finally {
      setIsDeletingRole(false);
    }
  };

  if (typeof document === 'undefined' || !canManageRoles) {
    return null;
  }

  const isMembersTab = activeTab === 'members';
  const activeTabId = isMembersTab ? membersTabId : rolesTabId;

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
      {/* Modal header with Swiss kicker, title, count chip, and close button */}
      <header className="modal-header hairline-bottom">
        <div className="modal-header-copy">
          <div className="team-header-tags">
            <span className="mono-tag">{t('team.kicker')}</span>
            {!isLoading && (
              <span className="font-mono-label team-count-tag tabular-nums">
                {isMembersTab
                  ? t('team.memberCount', { count: members.length })
                  : t('team.roleCount', { count: visibleRolesList.length })}
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
        {/* Swiss segmented tab bar: Members | Roles */}
        <div
          className="team-modal-tabs"
          role="tablist"
          aria-label={t('team.tabsLabel')}
          onKeyDown={handleTabKeyDown}
        >
          <button
            ref={membersTabRef}
            id={membersTabId}
            type="button"
            role="tab"
            aria-selected={isMembersTab}
            tabIndex={isMembersTab ? 0 : -1}
            className="team-modal-tab"
            onClick={() => setActiveTab('members')}
          >
            <Users size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('team.membersTab')}</span>
          </button>

          <button
            ref={rolesTabRef}
            id={rolesTabId}
            type="button"
            role="tab"
            aria-selected={!isMembersTab}
            tabIndex={!isMembersTab ? 0 : -1}
            className="team-modal-tab"
            onClick={() => setActiveTab('roles')}
          >
            <Shield size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('team.rolesTab')}</span>
          </button>
        </div>

        {/* Active tab panel */}
        <div className="team-tab-panel" role="tabpanel" aria-labelledby={activeTabId}>
          {isMembersTab ? (
            /* ======================== MEMBERS TAB ======================== */
            selectedMember ? (
              /* View 2: User Detail & Per-User Permissions Drill-Down */
              <div className="team-drilldown">
                <div className="team-drilldown-topbar">
                  <button
                    type="button"
                    className="btn ghost team-back-btn"
                    onClick={() => setSelectedMemberId(null)}
                  >
                    <ArrowLeft size={15} strokeWidth={1.5} aria-hidden="true" />
                    <span>{t('team.backToRoster')}</span>
                  </button>
                </div>

                {/* Read-only user identity card (name & email are never editable here) */}
                <div className="settings-profile-card">
                  <div className="profile-monogram settings-monogram" aria-hidden="true">
                    {buildMemberInitials(selectedMember.full_name, selectedMember.email)}
                  </div>
                  <div className="settings-profile-meta">
                    <span className="settings-profile-name">
                      {selectedMember.full_name?.trim() ||
                        selectedMember.email?.split('@')[0] ||
                        selectedMember.email}
                    </span>
                    <span className="team-member-email">{selectedMember.email}</span>
                  </div>
                </div>

                {/* Assignable Role dropdown (includes all custom roles below actorLevel) */}
                <div className="form-field">
                  <label htmlFor={memberRoleSelectId} className="form-label">
                    {t('team.assignRoleLabel')}
                  </label>
                  <div className="form-select-wrap">
                    <select
                      id={memberRoleSelectId}
                      className="form-select"
                      value={stagedRole}
                      disabled={isSavingMember}
                      onChange={(event) => {
                        setStagedRole(event.target.value);
                        // Reset per-user overrides so switches immediately reflect the new role's defaults
                        setStagedOverrides({});
                      }}
                    >
                      {assignableRoles.map((roleItem) => (
                        <option key={roleItem.slug} value={roleItem.slug}>
                          {roleItem.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={15}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="form-select-chevron"
                    />
                  </div>
                </div>

                {/* Dynamic Swiss toggle switches from PERMISSION_CATALOG */}
                <div className="perm-section">
                  <div className="perm-section-header">
                    <span className="form-label">{t('team.permissionsHeading')}</span>
                    <button
                      type="button"
                      className="btn ghost perm-reset-btn"
                      disabled={Object.keys(stagedOverrides).length === 0 || isSavingMember}
                      onClick={() => setStagedOverrides({})}
                    >
                      <RotateCcw size={13} strokeWidth={1.5} aria-hidden="true" />
                      <span>{t('team.resetDefaults')}</span>
                    </button>
                  </div>

                  <div className="perm-list">
                    {PERMISSION_CATALOG.map((perm) => {
                      const actorHoldsPerm = hasPermission(perm.key);
                      const isChecked = Boolean(effectiveStagedMemberPerms[perm.key]);
                      const isOverridden = Object.hasOwn(stagedOverrides, perm.key);

                      return (
                        <label
                          key={perm.key}
                          className={`perm-row ${!actorHoldsPerm ? 'is-locked' : ''}`}
                        >
                          <div className="perm-row-copy">
                            <span className="perm-row-title">
                              <span>{t(perm.labelKey)}</span>
                              {isOverridden && (
                                <span className="perm-override-pill font-mono-label">
                                  {t('team.overrideBadge')}
                                </span>
                              )}
                            </span>
                            <span className="perm-row-desc">{t(perm.descKey)}</span>
                          </div>

                          <input
                            type="checkbox"
                            role="switch"
                            {...{ switch: '' }}
                            className="perm-switch"
                            checked={isChecked}
                            disabled={!actorHoldsPerm || isSavingMember}
                            onChange={(event) =>
                              handleToggleMemberPermission(perm.key, event.target.checked)
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Drill-down save action bar */}
                <div className="team-drilldown-actions">
                  <button
                    type="button"
                    className="btn primary"
                    disabled={!hasMemberChanges || isSavingMember}
                    onClick={handleSaveMemberDetail}
                  >
                    {isSavingMember ? (
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
                </div>
              </div>
            ) : (
              /* View 1: Searchable & Sortable Members Roster */
              <>
                {loadError && (
                  <div className="settings-status-banner error" role="alert">
                    <AlertCircle size={15} strokeWidth={1.5} aria-hidden="true" />
                    <span>{loadError}</span>
                  </div>
                )}

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
                        <option value="role_desc">{t('team.sortRoleHighest')}</option>
                        <option value="role_asc">{t('team.sortRoleLowest')}</option>
                        <option value="name_asc">{t('team.sortNameAsc')}</option>
                        <option value="name_desc">{t('team.sortNameDesc')}</option>
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
                          const canManage = canManageUser(
                            actorRole,
                            member.role,
                            isSelf,
                            rolesMap
                          );
                          const memberRoleMeta = getRoleMeta(member.role, rolesMap);
                          const memberName =
                            member.full_name?.trim() ||
                            member.email?.split('@')[0] ||
                            member.email;
                          const initials = buildMemberInitials(
                            member.full_name,
                            member.email
                          );
                          const hasCustomOverrides =
                            member.permissions &&
                            Object.keys(member.permissions).length > 0;

                          return (
                            <tr
                              key={member.id}
                              className={`team-roster-row ${
                                canManage ? 'is-manageable' : ''
                              }`}
                              onClick={
                                canManage
                                  ? () => handleOpenMemberDetail(member)
                                  : undefined
                              }
                            >
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
                                      {hasCustomOverrides && (
                                        <span className="perm-override-pill font-mono-label">
                                          {t('team.customPermsTag')}
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
                                <div className="team-roster-role-end">
                                  <span className="profile-role-pill font-mono-label">
                                    <span>{memberRoleMeta.name}</span>
                                  </span>
                                  {canManage && (
                                    <button
                                      type="button"
                                      className="btn ghost team-drill-btn"
                                      aria-label={t('team.manageUserAria', {
                                        name: memberName,
                                      })}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleOpenMemberDetail(member);
                                      }}
                                    >
                                      <ChevronRight
                                        size={15}
                                        strokeWidth={1.5}
                                        aria-hidden="true"
                                      />
                                    </button>
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
              </>
            )
          ) : /* ======================== ROLES TAB ======================== */
          selectedRole ? (
            /* View 2: Custom Role Settings Drill-Down */
            <div className="team-drilldown">
              <div className="team-drilldown-topbar">
                <button
                  type="button"
                  className="btn ghost team-back-btn"
                  onClick={() => {
                    setSelectedRoleSlug(null);
                    setConfirmDeleteRole(false);
                  }}
                >
                  <ArrowLeft size={15} strokeWidth={1.5} aria-hidden="true" />
                  <span>{t('team.backToRoles')}</span>
                </button>
              </div>

              <div className="settings-profile-card">
                <div className="profile-monogram settings-monogram" aria-hidden="true">
                  <Shield size={18} strokeWidth={1.5} />
                </div>
                <div className="settings-profile-meta">
                  <span className="settings-profile-name">{selectedRole.name}</span>
                  <div className="settings-profile-role-row">
                    <span className="team-member-email">{selectedRole.slug}</span>
                    <span
                      className={`profile-role-pill font-mono-label ${
                        selectedRole.is_system ? 'member' : ''
                      }`}
                    >
                      {selectedRole.is_system
                        ? t('team.systemBadge')
                        : t('team.customBadge')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Default permissions toggle switches for this role (restricted to actor's own permissions) */}
              <div className="perm-section">
                <div className="perm-section-header">
                  <span className="form-label">{t('team.defaultPermsHeading')}</span>
                </div>

                <div className="perm-list">
                  {PERMISSION_CATALOG.map((perm) => {
                    const actorHoldsPerm = hasPermission(perm.key);
                    const isChecked = Boolean(stagedRolePerms[perm.key]);

                    return (
                      <label
                        key={perm.key}
                        className={`perm-row ${!actorHoldsPerm ? 'is-locked' : ''}`}
                      >
                        <div className="perm-row-copy">
                          <span className="perm-row-title">{t(perm.labelKey)}</span>
                          <span className="perm-row-desc">{t(perm.descKey)}</span>
                        </div>

                        <input
                          type="checkbox"
                          role="switch"
                          {...{ switch: '' }}
                          className="perm-switch"
                          checked={isChecked}
                          disabled={!actorHoldsPerm || isSavingRole || isDeletingRole}
                          onChange={(event) =>
                            setStagedRolePerms((prev) => ({
                              ...prev,
                              [perm.key]: event.target.checked,
                            }))
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Save Role Changes + Safe Delete Role (shown ONLY for custom `is_system: false` roles) */}
              <div className="team-role-footer-actions">
                {selectedRole.is_system ? (
                  <span className="team-hierarchy-hint">
                    <Lock size={12} strokeWidth={1.5} aria-hidden="true" />
                    <span>{t('team.systemBadge')}</span>
                  </span>
                ) : confirmDeleteRole ? (
                  <div className="team-delete-confirm-bar">
                    <span className="team-delete-warning">
                      {t('team.deleteRoleWarning')}
                    </span>
                    <div className="team-confirm-group">
                      <button
                        type="button"
                        className="btn danger"
                        disabled={isDeletingRole}
                        onClick={handleConfirmDeleteRole}
                      >
                        {isDeletingRole ? (
                          <LoaderCircle
                            size={14}
                            strokeWidth={1.5}
                            aria-hidden="true"
                            className="auth-spinner"
                          />
                        ) : (
                          <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                        )}
                        <span>{t('team.confirmDeleteRole')}</span>
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        disabled={isDeletingRole}
                        onClick={() => setConfirmDeleteRole(false)}
                      >
                        <span>{t('modal.cancel')}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn danger"
                    disabled={isSavingRole}
                    onClick={() => setConfirmDeleteRole(true)}
                  >
                    <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                    <span>{t('team.deleteRoleBtn')}</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn primary"
                  disabled={!hasRolePermChanges || isSavingRole || isDeletingRole}
                  onClick={handleSaveRolePerms}
                >
                  {isSavingRole ? (
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
              </div>
            </div>
          ) : (
            /* View 1: Custom Role Creator + Role Hierarchy List */
            <>
              {canCreateCustomRoles && (
                <form className="role-create-bar" onSubmit={handleCreateRole}>
                  <label htmlFor={newRoleInputId} className="visually-hidden">
                    {t('team.createRoleLabel')}
                  </label>
                  <input
                    id={newRoleInputId}
                    type="text"
                    maxLength={48}
                    className="form-input role-create-input"
                    placeholder={t('team.createRolePlaceholder')}
                    value={newRoleName}
                    onChange={(event) => setNewRoleName(event.target.value)}
                  />
                  <button
                    type="submit"
                    className="btn primary role-create-btn"
                    disabled={!newRoleName.trim() || isCreatingRole}
                  >
                    {isCreatingRole ? (
                      <LoaderCircle
                        size={15}
                        strokeWidth={1.5}
                        aria-hidden="true"
                        className="auth-spinner"
                      />
                    ) : (
                      <Plus size={15} strokeWidth={1.5} aria-hidden="true" />
                    )}
                    <span>{t('team.createRoleBtn')}</span>
                  </button>
                </form>
              )}

              <div className="role-list">
                {visibleRolesList.map((roleItem) => {
                  const isSystem = Boolean(roleItem.is_system);
                  const assignedCount = members.filter(
                    (member) =>
                      normalizeRoleSlug(member.role) ===
                      normalizeRoleSlug(roleItem.slug)
                  ).length;
                  const editable = canEditRole(actorRole, roleItem, rolesMap);

                  return (
                    <div
                      key={roleItem.slug}
                      className={`role-list-card ${editable ? 'is-editable' : ''}`}
                      onClick={
                        editable
                          ? () => handleOpenRoleDetail(roleItem)
                          : undefined
                      }
                    >
                      <div className="role-list-info">
                        <div className="role-list-title-row">
                          <span className="role-list-name">{roleItem.name}</span>
                          <span
                            className={`profile-role-pill font-mono-label ${
                              isSystem ? 'member' : ''
                            }`}
                          >
                            {isSystem ? t('team.systemBadge') : t('team.customBadge')}
                          </span>
                        </div>
                        <span className="team-member-email tabular-nums">
                          {roleItem.slug} · {t('team.levelLabel', { level: roleItem.level })} ·{' '}
                          {t('team.memberCount', { count: assignedCount })}
                        </span>
                      </div>

                      <div className="role-list-end">
                        {editable ? (
                          <button
                            type="button"
                            className="btn ghost team-drill-btn"
                            aria-label={t('team.editRoleAria', { name: roleItem.name })}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOpenRoleDetail(roleItem);
                            }}
                          >
                            <ChevronRight size={15} strokeWidth={1.5} aria-hidden="true" />
                          </button>
                        ) : (
                          <span
                            className="role-system-lock"
                            title={t('team.hierarchyLockedHint')}
                            aria-label={t('team.hierarchyLockedHint')}
                          >
                            <Lock size={14} strokeWidth={1.5} aria-hidden="true" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
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
