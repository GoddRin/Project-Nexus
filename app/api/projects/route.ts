import { NextRequest, NextResponse } from "next/server";
import { ProjectAtlasService } from "@/lib/services/projectAtlasService";
import { ProjectFilterSchema } from "@/lib/validations/projectAtlasSchema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    let bounds: [number, number, number, number] | undefined = undefined;
    const boundsParam = searchParams.get("bounds");
    if (boundsParam) {
      const parts = boundsParam.split(",").map(Number);
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        bounds = parts as [number, number, number, number];
      }
    }

    const rawParams = {
      category: searchParams.get("category") || "ALL",
      status: searchParams.get("status") || "ALL",
      islandGroup: searchParams.get("islandGroup") || "ALL",
      region: searchParams.get("region") || undefined,
      province: searchParams.get("province") || undefined,
      search: searchParams.get("search") || undefined,
      featuredOnly: searchParams.get("featuredOnly") === "true",
      bounds,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 200,
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1,
    };

    const validated = ProjectFilterSchema.safeParse(rawParams);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validated.error.format() },
        { status: 400 }
      );
    }

    const projects = await ProjectAtlasService.getAllProjects(validated.data);

    // Compute counts efficiently without issuing a second roundtrip query
    let counts: any = null;
    const isUnfiltered =
      (!validated.data.category || validated.data.category === "ALL") &&
      (!validated.data.status || validated.data.status === "ALL") &&
      (!validated.data.islandGroup || validated.data.islandGroup === "ALL") &&
      !validated.data.region &&
      !validated.data.province &&
      !validated.data.search &&
      !validated.data.featuredOnly &&
      !validated.data.bounds;

    if (isUnfiltered && projects.length > 0) {
      const byCategory: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      const byIsland: Record<string, number> = {};
      const byProvince = new Set<string>();

      for (const p of projects) {
        const cat = p.category || "OTHER";
        const stat = p.status || "ONGOING";
        const isl = p.islandGroup || "LUZON";
        byCategory[cat] = (byCategory[cat] || 0) + 1;
        byStatus[stat] = (byStatus[stat] || 0) + 1;
        byIsland[isl] = (byIsland[isl] || 0) + 1;
        if (p.province) byProvince.add(p.province);
      }

      counts = {
        total: projects.length,
        byCategory,
        byStatus,
        byIsland,
        totalProvinces: byProvince.size,
      };
    } else {
      counts = await ProjectAtlasService.getProjectCounts().catch(() => null);
    }

    return NextResponse.json(
      {
        total: projects.length,
        counts,
        data: projects,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
        },
      }
    );
  } catch (error: any) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json(
      { error: "Failed to fetch project portfolio", message: error.message },
      { status: 500 }
    );
  }
}
