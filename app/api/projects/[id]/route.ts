import { NextRequest, NextResponse } from "next/server";
import { ProjectAtlasService } from "@/lib/services/projectAtlasService";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing project ID or slug" }, { status: 400 });
    }

    // Try finding by slug first, then by ID
    let project = await ProjectAtlasService.getProjectBySlug(id);
    if (!project) {
      project = await ProjectAtlasService.getProjectById(id);
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
      },
    });
  } catch (error: any) {
    console.error("GET /api/projects/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
