/**
 * roleHierarchy.js — Extensible Role Hierarchy & Permission Helpers
 * Defines numeric authority levels for ESN Console roles so same-level and
 * higher-ranked accounts are protected automatically as new tiers are added
 * in the future (e.g., `super_admin` > `admin` > `coordinator` > `member`).
 */

// Numeric authority levels for each workspace role
export const ROLE_LEVELS = {
  pending: 0,
  member: 10,
  admin: 100,
};

// Ordered list of active assignable workspace roles
const ACTIVE_ROLES = ['member', 'admin'];

/**
 * Normalizes a role string and returns its numeric authority level.
 */
export function getRoleLevel(role) {
  const normalized = String(role || '').trim().toLowerCase();
  return ROLE_LEVELS[normalized] ?? 0;
}

/**
 * Returns `true` only when `actorRole` strictly outranks `targetRole` and the
 * target is not the actor themselves. Prevents Admins from modifying other
 * Admins and automatically protects same-level or higher roles in future tiers.
 */
export function canManageUser(actorRole, targetRole, isSelf = false) {
  if (isSelf) {
    return false;
  }
  return getRoleLevel(actorRole) > getRoleLevel(targetRole);
}

/**
 * Returns the list of roles `actorRole` is permitted to assign to managed users.
 *
 * Future multi-tier rule: once 3+ active hierarchy tiers exist (e.g., `super_admin`,
 * `admin`, `coordinator`, `member`), this strictly filters `getRoleLevel(r) < actorLevel`
 * (one level below self and down). For the current 2-tier setup (`member`, `admin`),
 * Admins may assign both `'member'` and `'admin'` so they can promote teammates.
 */
export function getAssignableRoles(actorRole) {
  const actorLevel = getRoleLevel(actorRole);
  if (actorLevel < ROLE_LEVELS.admin) {
    return [];
  }

  // When 3+ active tiers exist, restrict strictly to roles strictly below actorLevel
  if (ACTIVE_ROLES.length >= 3) {
    return ACTIVE_ROLES.filter((role) => getRoleLevel(role) < actorLevel);
  }

  // Current 2-tier setup (`member`, `admin`): allow Admins to assign both tiers
  return [...ACTIVE_ROLES];
}
