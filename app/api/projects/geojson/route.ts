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
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 500,
    };

    const validated = ProjectFilterSchema.safeParse(rawParams);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validated.error.format() },
        { status: 400 }
      );
    }

    const geojson = await ProjectAtlasService.getProjectsGeoJSON(validated.data);

    return NextResponse.json(geojson, {
      headers: {
        "Content-Type": "application/geo+json",
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
      },
    });
  } catch (error: any) {
    console.error("GET /api/projects/geojson error:", error);
    return NextResponse.json(
      { type: "FeatureCollection", features: [], error: error.message },
      { status: 500 }
    );
  }
}
