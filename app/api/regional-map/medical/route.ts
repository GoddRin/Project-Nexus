import { NextResponse } from "next/server";
import { fetchOverpass } from "@/lib/overpass";

export async function GET() {
  const query = `[out:json][timeout:25];
node["amenity"~"^(hospital|clinic)$"](16.0,120.5,18.5,122.5);
out body;`;

  try {
    const elements = await fetchOverpass(query, { next: { revalidate: 86400 } });
    return NextResponse.json({ elements });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Error fetching medical features from Overpass:", err);
    return NextResponse.json({ elements: [], error: err.message || "Overpass API unavailable" });
  }
}
