import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { Role, ProjectAuditAction } from "@prisma/client";
import { NextRequest } from "next/server";

export interface AtlasAuthResult {
  isAuthenticated: boolean;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewAudit: boolean;
  role: Role | "PUBLIC";
  user: {
    id: string;
    clerkId: string;
    name: string;
    email: string;
  } | null;
  error?: string;
}

/**
 * Server-side authorization resolution for Project Atlas.
 * Resolves Clerk identity -> Database User -> Application Roles.
 * Client-provided roles, user IDs, or headers are never trusted.
 */
export async function getAtlasAuth(projectId?: string): Promise<AtlasAuthResult> {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return {
        isAuthenticated: false,
        canView: true,
        canEdit: false,
        canDelete: false,
        canViewAudit: false,
        role: "PUBLIC",
        user: null,
      };
    }

    const clerkId = clerkUser.id;
    let dbUser = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        memberships: {
          select: {
            projectId: true,
            role: true,
          },
        },
      },
    });

    // Auto-provision if user exists in Clerk but not yet synced to Prisma User table
    if (!dbUser) {
      const email =
        clerkUser.emailAddresses[0]?.emailAddress || `${clerkId}@projectnexus.dev`;
      const name = clerkUser.firstName
        ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
        : email;

      dbUser = await prisma.user.create({
        data: {
          clerkId,
          email,
          name,
        },
        include: {
          memberships: {
            select: {
              projectId: true,
              role: true,
            },
          },
        },
      });
    }

    // Determine highest active role across memberships
    const roles = dbUser.memberships.map((m) => m.role);
    const hasAdmin = roles.includes(Role.ADMINISTRATOR);
    const hasIT = roles.includes(Role.IT_SUPPORT);
    const hasPM = roles.includes(Role.PROJECT_MANAGER);

    // If specific project requested, check project-scoped membership
    let projectRole: Role | undefined = undefined;
    if (projectId) {
      const pm = dbUser.memberships.find((m) => m.projectId === projectId);
      if (pm) projectRole = pm.role;
    }

    // Capabilities matrix
    const canDelete = hasAdmin || projectRole === Role.ADMINISTRATOR;
    const canEdit =
      hasAdmin ||
      hasIT ||
      hasPM ||
      projectRole === Role.ADMINISTRATOR ||
      projectRole === Role.IT_SUPPORT ||
      projectRole === Role.PROJECT_MANAGER;
    const canViewAudit = hasAdmin || hasIT;

    let primaryRole: Role = Role.EMPLOYEE;
    if (hasAdmin) primaryRole = Role.ADMINISTRATOR;
    else if (hasIT) primaryRole = Role.IT_SUPPORT;
    else if (hasPM) primaryRole = Role.PROJECT_MANAGER;
    else if (roles.length > 0) primaryRole = roles[0];

    return {
      isAuthenticated: true,
      canView: true,
      canEdit,
      canDelete,
      canViewAudit,
      role: primaryRole,
      user: {
        id: dbUser.id,
        clerkId: dbUser.clerkId,
        name: dbUser.name,
        email: dbUser.email,
      },
    };
  } catch (err: any) {
    console.error("AtlasAuth resolution error:", err);
    return {
      isAuthenticated: false,
      canView: true,
      canEdit: false,
      canDelete: false,
      canViewAudit: false,
      role: "PUBLIC",
      user: null,
      error: err.message,
    };
  }
}

/**
 * Extract safe IP address and User Agent from request
 */
export function extractClientMeta(request: NextRequest): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ipAddress = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : realIp
    ? realIp.trim()
    : null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 255) || null;

  return { ipAddress, userAgent };
}

/**
 * Calculate field-level before/after diff for Project updates.
 * Excludes sensitive fields, tokens, image binary payloads, and internal metadata.
 */
export function calculateProjectDiff(
  before: Record<string, any>,
  after: Record<string, any>
): Record<string, { before: any; after: any }> | null {
  const diff: Record<string, { before: any; after: any }> = {};

  const IGNORED_FIELDS = new Set([
    "id",
    "createdAt",
    "updatedAt",
    "createdById",
    "updatedById",
    "deletedAt",
    "deletedById",
    "lastKnownUpdatedAt",
    "auditLogs",
    "users",
    "tickets",
    "assets",
  ]);

  for (const key of Object.keys(after)) {
    if (IGNORED_FIELDS.has(key)) continue;

    const beforeVal = before[key];
    const afterVal = after[key];

    // Normalize date strings
    const bStr =
      beforeVal instanceof Date
        ? beforeVal.toISOString()
        : JSON.stringify(beforeVal ?? null);
    const aStr =
      afterVal instanceof Date
        ? afterVal.toISOString()
        : JSON.stringify(afterVal ?? null);

    if (bStr !== aStr) {
      diff[key] = {
        before: beforeVal instanceof Date ? beforeVal.toISOString() : (beforeVal ?? null),
        after: afterVal instanceof Date ? afterVal.toISOString() : (afterVal ?? null),
      };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
}
