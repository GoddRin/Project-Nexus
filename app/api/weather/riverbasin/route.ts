import { NextResponse } from "next/server";
import { fetchRiverBasinTelemetry } from "@/lib/weather/riverbasin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchRiverBasinTelemetry();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("[RiverBasin API Route Error]:", error);
    const errMsg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      {
        success: false,
        error: errMsg,
        updatedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
