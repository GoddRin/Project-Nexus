import { NextRequest, NextResponse } from "next/server";
import { fetchPanahonEndpoint, fetchPanahonImage, getLayerTtlSeconds } from "@/lib/weather/panahon";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const endpointPath = `/api/v1/${path.join("/")}`;
    const searchParams = request.nextUrl.searchParams;

    const queryParams: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      queryParams[key] = val;
    });

    // Check if binary image stream endpoint
    if (
      endpointPath.endsWith("/radar") ||
      endpointPath.endsWith("/himawari-image") ||
      endpointPath.endsWith("/nwp-image")
    ) {
      const imgResult = await fetchPanahonImage(endpointPath, queryParams);
      if (imgResult) {
        return new NextResponse(new Uint8Array(imgResult.buffer), {
          headers: {
            "Content-Type": imgResult.contentType,
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        });
      } else {
        return new NextResponse(null, { status: 404 });
      }
    }

    const result = await fetchPanahonEndpoint(endpointPath, queryParams);

    if (result.data === null) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          source: "unavailable",
          error: result.error || "PANaHON service unavailable",
        },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        }
      );
    }

    const ttl = getLayerTtlSeconds(endpointPath);
    const swr = ttl * 2;

    return NextResponse.json(
      {
        ...(typeof result.data === "object" && result.data !== null ? result.data : { raw: result.data }),
        _panahonSource: result.source,
        _panahonError: result.error || null,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${ttl}, stale-while-revalidate=${swr}`,
        },
      }
    );
  } catch (error) {
    console.error("[PANaHON Route Error]:", error);
    const errMsg = error instanceof Error ? error.message : "Proxy Error";
    return NextResponse.json(
      { success: false, data: null, error: errMsg },
      { status: 500 }
    );
  }
}
