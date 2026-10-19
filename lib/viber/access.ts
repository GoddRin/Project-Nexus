import type { Role } from "@prisma/client";

/** Roles that may read the redacted work digests (progress, equipment, manpower, materials, weather). */
const WORK_REPORT_ROLES: ReadonlySet<Role> = new Set<Role>([
  "ADMINISTRATOR", "PROJECT_MANAGER", "ENGINEER", "SUPERVISOR", "SAFETY", "WAREHOUSE",
]);

/** Roles that may also read lines about injuries and safety events. */
const SAFETY_REPORT_ROLES: ReadonlySet<Role> = new Set<Role>(["ADMINISTRATOR", "PROJECT_MANAGER", "SAFETY"]);

export function canReadSiteReports(role: Role | null | undefined): boolean {
  return !!role && WORK_REPORT_ROLES.has(role);
}

export function canReadSafetyReports(role: Role | null | undefined): boolean {
  return !!role && SAFETY_REPORT_ROLES.has(role);
}
