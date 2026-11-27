/**
 * roleHierarchy.js — Dynamic Role Hierarchy & Extensible Permission Registry
 * Centralizes the `PERMISSION_CATALOG`, default baseline permissions for custom
 * roles, and pure helper functions operating against the live `rolesMap` loaded
 * from `public.roles` (with safe built-in fallbacks).
 */

// Extensible catalog of all site-wide permissions; add new permissions here once
export const PERMISSION_CATALOG = [
  {
    key: 'view_workspace',
    labelKey: 'permissions.view_workspace.label',
    descKey: 'permissions.view_workspace.desc',
  },
  {
    key: 'edit_own_name',
    labelKey: 'permissions.edit_own_name.label',
    descKey: 'permissions.edit_own_name.desc',
  },
  {
    key: 'manage_projects',
    labelKey: 'permissions.manage_projects.label',
    descKey: 'permissions.manage_projects.desc',
  },
  {
    key: 'manage_sessions',
    labelKey: 'permissions.manage_sessions.label',
    descKey: 'permissions.manage_sessions.desc',
  },
  {
    key: 'manage_responses',
    labelKey: 'permissions.manage_responses.label',
    descKey: 'permissions.manage_responses.desc',
  },
  {
    key: 'manage_graphs',
    labelKey: 'permissions.manage_graphs.label',
    descKey: 'permissions.manage_graphs.desc',
  },
  {
    key: 'use_predictor',
    labelKey: 'permissions.use_predictor.label',
    descKey: 'permissions.use_predictor.desc',
  },
  {
    key: 'manage_roles',
    labelKey: 'permissions.manage_roles.label',
    descKey: 'permissions.manage_roles.desc',
  },
];

// Shared baseline permissions assigned to every newly created custom role
export const CUSTOM_ROLE_BASELINE_PERMISSIONS = {
  view_workspace: true,
  use_predictor: true,
  edit_own_name: false,
  manage_projects: false,
  manage_sessions: false,
  manage_responses: false,
  manage_graphs: false,
  manage_roles: false,
};

// Helper maps for all-true (Owner / top leadership fallback) and all-false (Pending / New Member)
const ALL_PERMISSIONS_TRUE = Object.fromEntries(
  PERMISSION_CATALOG.map((item) => [item.key, true])
);

const ALL_PERMISSIONS_FALSE = Object.fromEntries(
  PERMISSION_CATALOG.map((item) => [item.key, false])
);

// Safe fallback definitions used only before `public.roles` loads or for legacy slugs
export const FALLBACK_ROLES_MAP = {
  owner: {
    slug: 'owner',
    name: 'Owner',
    level: 100,
    is_system: true,
    default_permissions: { ...ALL_PERMISSIONS_TRUE },
  },
  admin: {
    slug: 'admin',
    name: 'Admin',
    level: 95,
    is_system: true,
    default_permissions: { ...ALL_PERMISSIONS_TRUE },
  },
  president: {
    slug: 'president',
    name: 'President',
    level: 90,
    is_system: true,
    default_permissions: { ...ALL_PERMISSIONS_TRUE },
  },
  vice_president: {
    slug: 'vice_president',
    name: 'Vice President',
    level: 80,
    is_system: true,
    default_permissions: { ...ALL_PERMISSIONS_TRUE },
  },
  visitor: {
    slug: 'visitor',
    name: 'Visitor',
    level: 20,
    is_system: true,
    default_permissions: { ...CUSTOM_ROLE_BASELINE_PERMISSIONS },
  },
  new_member: {
    slug: 'new_member',
    name: 'New Member',
    level: 10,
    is_system: true,
    default_permissions: { ...ALL_PERMISSIONS_FALSE },
  },
  member: {
    slug: 'member',
    name: 'Member',
    level: 10,
    is_system: true,
    default_permissions: { ...ALL_PERMISSIONS_FALSE },
  },
  pending: {
    slug: 'pending',
    name: 'Pending',
    level: 0,
    is_system: true,
    default_permissions: { ...ALL_PERMISSIONS_FALSE },
  },
};

// Map Turkish diacritics before ASCII slug normalization
const TR_CHAR_MAP = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};

/**
 * Normalizes a role slug for case-insensitive map lookups.
 */
export function normalizeRoleSlug(roleSlug) {
  return String(roleSlug || '').trim().toLowerCase();
}

/**
 * Formats an unknown snake_case role slug into a readable Title Case label.
 */
function formatFallbackRoleName(slug) {
  if (!slug) {
    return 'Member';
  }
  return slug
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Returns metadata `{ slug, name, level, is_system, default_permissions }`
 * for a role slug from the live `rolesMap` with safe fallback defaults.
 */
export function getRoleMeta(roleSlug, rolesMap = {}) {
  const slug = normalizeRoleSlug(roleSlug);
  if (slug && rolesMap && rolesMap[slug]) {
    return rolesMap[slug];
  }
  if (slug && FALLBACK_ROLES_MAP[slug]) {
    return FALLBACK_ROLES_MAP[slug];
  }
  return {
    slug: slug || 'new_member',
    name: formatFallbackRoleName(slug),
    level: 0,
    is_system: false,
    default_permissions: { ...ALL_PERMISSIONS_FALSE },
  };
}

/**
 * Returns the numeric authority level of `roleSlug` from `rolesMap`.
 */
export function getRoleLevel(roleSlug, rolesMap = {}) {
  const meta = getRoleMeta(roleSlug, rolesMap);
  const numeric = Number(meta?.level);
  return Number.isFinite(numeric) ? numeric : 0;
}

/**
 * Resolves the effective permission map for a user profile:
 * - `owner` always receives `true` for every permission in `PERMISSION_CATALOG`.
 * - All other roles merge `rolesMap[profile.role].default_permissions` with any
 *   per-user overrides stored in `profile.permissions`.
 */
export function resolveUserPermissions(profile, rolesMap = {}) {
  const slug = normalizeRoleSlug(profile?.role);
  if (slug === 'owner') {
    return { ...ALL_PERMISSIONS_TRUE };
  }

  const roleDefaults = getRoleMeta(slug, rolesMap)?.default_permissions ?? {};
  const userOverrides =
    profile?.permissions && typeof profile.permissions === 'object'
      ? profile.permissions
      : {};

  const resolved = {};
  for (const { key } of PERMISSION_CATALOG) {
    if (Object.hasOwn(userOverrides, key) && typeof userOverrides[key] === 'boolean') {
      resolved[key] = userOverrides[key];
    } else {
      resolved[key] = Boolean(roleDefaults[key]);
    }
  }
  return resolved;
}

/**
 * Returns `true` only when `actorRole` strictly outranks `targetRole` and the
 * target is not the actor themselves. Automatically protects same-level and
 * higher-ranked accounts across all system and custom roles.
 */
export function canManageUser(actorRole, targetRole, isSelf = false, rolesMap = {}) {
  if (isSelf) {
    return false;
  }
  return getRoleLevel(actorRole, rolesMap) > getRoleLevel(targetRole, rolesMap);
}

/**
 * Returns `true` when `actorRole` is allowed to edit `targetRole`'s default
 * permissions: `targetRole` must not be `'pending'` and `actorRole` must
 * strictly outrank `targetRole` (`getRoleLevel(actor) > targetRole.level`).
 */
export function canEditRole(actorRole, targetRole, rolesMap = {}) {
  if (!targetRole) {
    return false;
  }
  const targetSlug = normalizeRoleSlug(
    typeof targetRole === 'string' ? targetRole : targetRole.slug
  );
  if (!targetSlug || targetSlug === 'pending') {
    return false;
  }
  const targetLevel =
    typeof targetRole === 'object' && targetRole.level !== undefined
      ? Number(targetRole.level) || 0
      : getRoleLevel(targetSlug, rolesMap);
  return getRoleLevel(actorRole, rolesMap) > targetLevel;
}

/**
 * Returns all roles from `rolesMap` with `level > 0 && level < actorLevel`
 * sorted by `level` descending (so Owner/President/VP automatically see all
 * lower system roles plus every newly created custom role).
 */
export function getAssignableRoles(actorRole, rolesMap = {}) {
  const actorLevel = getRoleLevel(actorRole, rolesMap);
  const sourceEntries =
    rolesMap && Object.keys(rolesMap).length > 0
      ? Object.values(rolesMap)
      : Object.values(FALLBACK_ROLES_MAP);

  return sourceEntries
    .filter((role) => {
      const lvl = Number(role?.level) || 0;
      return lvl > 0 && lvl < actorLevel;
    })
    .sort((a, b) => {
      const levelDiff = (Number(b.level) || 0) - (Number(a.level) || 0);
      if (levelDiff !== 0) {
        return levelDiff;
      }
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
}

/**
 * Converts a human-readable custom role name (e.g. "Event Coordinator") into
 * a clean snake_case slug (`event_coordinator`). Optionally appends a numeric
 * suffix if `existingSlugs` already contains the base slug.
 */
export function slugifyRoleName(name, existingSlugs = null) {
  const base = String(name || '')
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TR_CHAR_MAP[ch] ?? ch)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const cleanSlug = base || 'custom_role';
  if (!existingSlugs) {
    return cleanSlug;
  }

  const taken =
    existingSlugs instanceof Set
      ? existingSlugs
      : new Set(Object.keys(existingSlugs));

  if (!taken.has(cleanSlug)) {
    return cleanSlug;
  }

  let suffix = 2;
  while (taken.has(`${cleanSlug}_${suffix}`)) {
    suffix += 1;
  }
  return `${cleanSlug}_${suffix}`;
}
