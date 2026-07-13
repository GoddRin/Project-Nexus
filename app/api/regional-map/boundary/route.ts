import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/provinces/hires/province-028100000.0.1.json", {
      next: { revalidate: 604800 }, // Cache 7 days
    });

    if (!res.ok) {
      return NextResponse.json({ type: "FeatureCollection", features: [], error: `HTTP ${res.status}` });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching boundary:", error);
    return NextResponse.json({ type: "FeatureCollection", features: [], error: "Boundary unavailable" });
  }
}
