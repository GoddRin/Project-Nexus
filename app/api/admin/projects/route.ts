import { NextRequest, NextResponse } from "next/server";
import { getAtlasAuth, extractClientMeta } from "@/lib/auth/atlasAuth";
import { ProjectAtlasService } from "@/lib/services/projectAtlasService";
import {
  ProjectAdminFilterSchema,
  ProjectCreateSchema,
} from "@/lib/validations/projectAtlasSchema";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/projects
 * Paginated, filtered administrative project listing.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAtlasAuth();
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    if (!auth.canEdit && !auth.canViewAudit) {
      return NextResponse.json(
        { error: "Forbidden. Administrative access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rawParams = {
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1,
      pageSize: searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 25,
      search: searchParams.get("search") || undefined,
      category: searchParams.get("category") || "ALL",
      status: searchParams.get("status") || "ALL",
      islandGroup: searchParams.get("islandGroup") || "ALL",
      region: searchParams.get("region") || undefined,
      sortBy: searchParams.get("sortBy") || "name",
      sortDirection: searchParams.get("sortDirection") || "asc",
      includeDeleted: searchParams.get("includeDeleted") === "true",
    };

    const validated = ProjectAdminFilterSchema.safeParse(rawParams);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validated.error.format() },
        { status: 400 }
      );
    }

    const result = await ProjectAtlasService.getAdminProjects(validated.data);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("GET /api/admin/projects error:", error);
    return NextResponse.json(
      { error: "Failed to fetch administrative projects", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/projects
 * Create a new project with server-side validation and transactional CREATE audit log.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAtlasAuth();
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    if (!auth.canEdit) {
      return NextResponse.json(
        { error: "Forbidden. You do not have permission to create projects." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const validated = ProjectCreateSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.format() },
        { status: 400 }
      );
    }

    const meta = extractClientMeta(request);
    const createdProject = await ProjectAtlasService.createProject(
      validated.data,
      auth.user.id,
      meta
    );

    return NextResponse.json(createdProject, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/projects error:", error);
    const status = error.message.includes("already exists") ? 409 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to create project" },
      { status }
    );
  }
}
