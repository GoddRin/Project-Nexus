import { NextRequest, NextResponse } from "next/server";
import { getTyphoonNewsFeed } from "@/lib/weather/news/tvNewsService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  try {
    const feed = await getTyphoonNewsFeed(force);

    return NextResponse.json(feed, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("[TV News API] Error fetching news feed:", error);
    const errMsg = error instanceof Error ? error.message : "Failed to load TV news feeds";
    return NextResponse.json(
      {
        error: errMsg,
        threatLevel: "NORMAL",
        updateIntervalHours: 6,
        nextRefreshAt: new Date(Date.now() + 3600000).toISOString(),
        cachedAt: new Date().toISOString(),
        featuredVideo: null,
        channels: {
          pagasa: [],
          gma: [],
          abscbn: [],
          tv5: [],
        },
        latestBulletins: [],
        sourcesChecked: [],
        isPAGASAFallbackForecast: true,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
