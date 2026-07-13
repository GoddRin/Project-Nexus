import { NextRequest, NextResponse } from "next/server";
import { getMergedStorms } from "@/lib/weather/storms";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mockParam = searchParams.get("mock");
  const isMock = mockParam === "true";

  try {
    const { storms, source } = await getMergedStorms(isMock);
    
    console.log(`Typhoon API: Returning ${storms.length} storms, source: ${source}`);

    return NextResponse.json(
      { storms, source },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching/parsing storm data:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { storms: [], source: "unavailable", error: errMsg },
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
