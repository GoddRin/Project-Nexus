import { NextRequest, NextResponse } from "next/server";
import { getAtlasAuth, extractClientMeta } from "@/lib/auth/atlasAuth";
import {
  ProjectAtlasService,
  ConcurrencyConflictError,
} from "@/lib/services/projectAtlasService";
import { ProjectUpdateSchema } from "@/lib/validations/projectAtlasSchema";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/projects/[id]
 * Fetch single project with audit details and recent audit logs.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing project ID" }, { status: 400 });
    }

    const auth = await getAtlasAuth(id);
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    if (!auth.canEdit && !auth.canViewAudit) {
      return NextResponse.json(
        { error: "Forbidden. Administrative access required." },
        { status: 403 }
      );
    }

    const project = await ProjectAtlasService.getAdminProjectById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error: any) {
    console.error("GET /api/admin/projects/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch project details", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/projects/[id]
 * Update project with optimistic concurrency verification and UPDATE audit diff.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing project ID" }, { status: 400 });
    }

    const auth = await getAtlasAuth(id);
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    if (!auth.canEdit) {
      return NextResponse.json(
        { error: "Forbidden. You do not have permission to edit this project." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const validated = ProjectUpdateSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.format() },
        { status: 400 }
      );
    }

    const lastKnownUpdatedAt =
      validated.data.lastKnownUpdatedAt ||
      request.headers.get("if-unmodified-since") ||
      undefined;

    const meta = extractClientMeta(request);
    const updated = await ProjectAtlasService.updateProject(
      id,
      validated.data,
      auth.user.id,
      lastKnownUpdatedAt,
      meta
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT /api/admin/projects/[id] error:", error);

    if (error instanceof ConcurrencyConflictError) {
      return NextResponse.json(
        {
          error: "Conflict",
          message: error.message,
          code: "STALE_RECORD",
        },
        { status: 409 }
      );
    }

    if (error.message.includes("already in use") || error.message.includes("unique")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to update project" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/projects/[id]
 * Soft delete / archive project. Preserves audit history and relations.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing project ID" }, { status: 400 });
    }

    const auth = await getAtlasAuth(id);
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    // Only administrators are permitted to delete/archive projects
    if (!auth.canDelete) {
      return NextResponse.json(
        { error: "Forbidden. Only administrators are authorized to archive or delete projects." },
        { status: 403 }
      );
    }

    const meta = extractClientMeta(request);
    const result = await ProjectAtlasService.softDeleteProject(id, auth.user.id, meta);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("DELETE /api/admin/projects/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to archive project" },
      { status: 500 }
    );
  }
}
