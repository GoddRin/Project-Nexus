import type { Role } from "@prisma/client";

/** Roles that may publish to the Newsroom */
export const NEWS_PUBLISHER_ROLES: Role[] = ["ADMINISTRATOR", "PROJECT_MANAGER", "HR", "SAFETY"];
