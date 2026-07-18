import { NextResponse } from "next/server";
import { fetchPagasaSignals } from "@/lib/weather/pagasa";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const signalData = await fetchPagasaSignals();
    return NextResponse.json(signalData, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Error in PAGASA signals API:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        hasActiveBulletin: false,
        tcName: "",
        tcCategory: "",
        siteSignalNumber: 0,
        signals: [],
        position: null,
        movement: "",
        maxWindsKph: 0,
        gustsKph: 0,
        forecastPositions: [],
        bulletinUrls: [],
        fetchedAt: new Date().toISOString(),
        source: "unavailable" as const,
        error: errMsg,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  }
}
