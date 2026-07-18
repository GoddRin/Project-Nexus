import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Live local conditions for Tumauini HEPP (lat 16.9833, lon 122.0833)
// Fetches current wind speed and MSLP from Open-Meteo (no API key required)
export async function GET() {
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=16.9833&longitude=122.0833&current=wind_speed_10m,wind_direction_10m,pressure_msl,temperature_2m,relative_humidity_2m,weather_code&timezone=Asia%2FManila&forecast_days=1";

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });

    if (!res.ok) {
      // Fallback to wttr.in
      const wttrRes = await fetch(
        "https://wttr.in/Tumauini?format=j1",
        { cache: "no-store" }
      );

      if (wttrRes.ok) {
        const wttr = await wttrRes.json();
        const cc = wttr?.current_condition?.[0];
        if (cc) {
          return NextResponse.json(
            {
              wind_speed_10m: parseFloat(cc.windspeedKmph ?? "0"),
              wind_direction_10m: parseFloat(cc.winddirDegree ?? "0"),
              pressure_msl: 1013.25, // wttr.in doesn't return MSLP — use standard atmosphere
              temperature_2m: parseFloat(cc.temp_C ?? "0"),
              relative_humidity_2m: parseFloat(cc.humidity ?? "0"),
              fetchedAt: new Date().toISOString(),
              source: "wttr",
            },
            {
              headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate",
                Pragma: "no-cache",
              },
            }
          );
        }
      }

      return NextResponse.json(
        { error: "Failed to fetch conditions", fetchedAt: new Date().toISOString(), source: "error" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const current = data?.current ?? {};

    return NextResponse.json(
      {
        wind_speed_10m: current.wind_speed_10m ?? null,
        wind_direction_10m: current.wind_direction_10m ?? null,
        pressure_msl: current.pressure_msl ?? null,
        temperature_2m: current.temperature_2m ?? null,
        relative_humidity_2m: current.relative_humidity_2m ?? null,
        weather_code: current.weather_code ?? null,
        fetchedAt: new Date().toISOString(),
        source: "open-meteo",
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err) {
    console.error("[Conditions API] Error fetching live conditions:", err);
    return NextResponse.json(
      { error: "Internal error", fetchedAt: new Date().toISOString(), source: "error" },
      { status: 500 }
    );
  }
}
