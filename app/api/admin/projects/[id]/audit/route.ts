import { NextRequest, NextResponse } from "next/server";
import { getAtlasAuth } from "@/lib/auth/atlasAuth";
import { ProjectAtlasService } from "@/lib/services/projectAtlasService";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/projects/[id]/audit
 * Paginated audit trail for a specific project.
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

    if (!auth.canViewAudit) {
      return NextResponse.json(
        { error: "Forbidden. Only administrators and IT support can inspect audit trails." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const pageSize = searchParams.get("pageSize")
      ? parseInt(searchParams.get("pageSize")!, 10)
      : 25;

    const result = await ProjectAtlasService.getProjectAuditLogs(id, page, pageSize);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("GET /api/admin/projects/[id]/audit error:", error);
    return NextResponse.json(
      { error: "Failed to fetch project audit logs", message: error.message },
      { status: 500 }
    );
  }
}
