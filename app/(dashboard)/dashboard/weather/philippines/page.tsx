import { PageHeader } from "@/components/shared/PageHeader";
import PhilippinesWeatherClient from "./PhilippinesWeatherClient";
import { getMergedStorms } from "@/lib/weather/storms";
import { fetchPagasaSignals } from "@/lib/weather/pagasa";

export const dynamic = "force-dynamic";

export default async function PhilippinesWeatherPage() {
  // Fetch all data in parallel for speed
  const [weatherResult, { storms: initialStorms }, initialPagasaSignals] = await Promise.all([
    // 1. Live local conditions for Tumauini from Open-Meteo
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=16.9833&longitude=122.0833&current=wind_speed_10m,surface_pressure&timezone=Asia%2FManila&forecast_days=1",
      { cache: "no-store" }
    )
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        return data?.current ?? null;
      })
      .catch((err) => {
        console.error("Error fetching live local conditions:", err);
        return null;
      }),

    // 2. Centralized merged storm data
    getMergedStorms(),

    // 3. PAGASA signal data (real-time bulletin scraping)
    fetchPagasaSignals(),
  ]);

  const localWindSpeed = weatherResult?.wind_speed_10m ?? 12.5;
  const localPressure = weatherResult?.surface_pressure ?? 1011.0;

  console.log(
    "Server Page: storms:", initialStorms.length,
    "| PAGASA signal:", initialPagasaSignals.siteSignalNumber,
    "| TC:", initialPagasaSignals.tcName || "none",
    "| Source:", initialPagasaSignals.source
  );

  // Extract Windy API key from environment
  const windyApiKey = process.env.NEXT_PUBLIC_WINDY_API_KEY || "";

  return (
    <div className="relative max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Philippines Weather & Typhoon Monitor"
        subtitle="Regional satellite overlays, real-time PAGASA & JTWC tracking, and site alert matrix."
      />
      <PhilippinesWeatherClient
        localWindSpeed={localWindSpeed}
        localPressure={localPressure}
        initialStorms={initialStorms}
        initialPagasaSignals={initialPagasaSignals}
        apiKey={windyApiKey}
      />
    </div>
  );
}
