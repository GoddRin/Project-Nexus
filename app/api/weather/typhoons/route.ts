import { NextRequest, NextResponse } from "next/server";
import { getMergedStorms } from "@/lib/weather/storms";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mockParam = searchParams.get("mock");
  const isMock = mockParam === "true";

  try {
    const result = await getMergedStorms(isMock);

    console.log(
      `[Typhoon API] ${result.storms.length} storm(s) | source: ${result.source} | PAR clear: ${result.parClear} | checked: [${result.sourcesChecked.join(", ")}] | data from: [${result.sourcesWithData.join(", ")}]`
    );

    return NextResponse.json(
      {
        storms: result.storms,
        source: result.source,
        parClear: result.parClear,
        sourcesChecked: result.sourcesChecked,
        sourcesWithData: result.sourcesWithData,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching/parsing storm data:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        storms: [],
        source: "error",
        parClear: true,
        sourcesChecked: [],
        sourcesWithData: [],
        error: errMsg,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }
}
