/**
 * Role helpers for RBAC authorization.
 * All role checks should go through these functions, not inline string comparisons.
 */

export type AppRole =
  | "ADMINISTRATOR"
  | "IT_SUPPORT"
  | "PROJECT_MANAGER"
  | "ENGINEER"
  | "SUPERVISOR"
  | "WAREHOUSE"
  | "SAFETY"
  | "HR"
  | "EMPLOYEE"
  | "GUARD"
  | "GUEST";

/** Roles with full project administration privileges */
const ADMIN_ROLES: AppRole[] = ["ADMINISTRATOR"];

/** Roles that can manage operational data (tickets, assets, docs) */
const MANAGER_ROLES: AppRole[] = [
  "ADMINISTRATOR",
  "IT_SUPPORT",
  "PROJECT_MANAGER",
];

/** Roles that can create/edit their own content */
const CONTRIBUTOR_ROLES: AppRole[] = [
  ...MANAGER_ROLES,
  "ENGINEER",
  "SUPERVISOR",
  "WAREHOUSE",
  "SAFETY",
  "HR",
  "GUARD",
];

export function isAdmin(role: AppRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function hasRole(requiredRole: AppRole, currentRole?: AppRole): boolean {
  if (!currentRole) return false;
  // Temporary implementation until hierarchy is built
  return currentRole === requiredRole;
}

export function isManager(role: AppRole): boolean {
  return MANAGER_ROLES.includes(role);
}

export function isContributor(role: AppRole): boolean {
  return CONTRIBUTOR_ROLES.includes(role);
}

export function canViewProject(): boolean {
  // Everyone can view, including GUEST
  return true;
}

export function canEditProject(role: AppRole): boolean {
  return MANAGER_ROLES.includes(role);
}
