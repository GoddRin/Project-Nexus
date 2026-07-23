import { PageHeader } from "@/components/shared/PageHeader";
import PhilippinesWeatherClient from "./PhilippinesWeatherClient";
import { getMergedStorms } from "@/lib/weather/storms";
import { fetchPagasaSignals } from "@/lib/weather/pagasa";

export const dynamic = "force-dynamic";

export default async function PhilippinesWeatherPage() {
  // Fetch all data in parallel with safe error boundaries
  const [weatherResult, stormsResult, initialPagasaSignals] = await Promise.all([
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=16.9833&longitude=122.0833&current=wind_speed_10m,pressure_msl&timezone=Asia%2FManila&forecast_days=1",
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
    getMergedStorms().catch((err) => {
      console.error("Error getting merged storms:", err);
      return { storms: [], source: "fallback", parClear: true, sourcesChecked: [], sourcesWithData: [] };
    }),

    // 3. PAGASA signal data (real-time bulletin scraping)
    fetchPagasaSignals().catch((err) => {
      console.error("Error fetching PAGASA signals:", err);
      return {
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
        movementDirection: "",
        movementSpeedKph: 0,
        bulletinUrls: [],
        fetchedAt: new Date().toISOString(),
        source: "unavailable" as const,
      };
    }),
  ]);

  const initialStorms = stormsResult?.storms ?? [];
  const safePagasaSignals = initialPagasaSignals ?? {
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
    movementDirection: "",
    movementSpeedKph: 0,
    bulletinUrls: [],
    fetchedAt: new Date().toISOString(),
    source: "unavailable" as const,
  };

  const localWindSpeed = weatherResult?.wind_speed_10m ?? 12.5;
  const localPressure = weatherResult?.pressure_msl ?? 1011.0;

  console.log(
    "Server Page: storms:", initialStorms.length,
    "| PAGASA signal:", safePagasaSignals.siteSignalNumber,
    "| TC:", safePagasaSignals.tcName || "none",
    "| Source:", safePagasaSignals.source
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
        initialPagasaSignals={safePagasaSignals}
        apiKey={windyApiKey}
      />
    </div>
  );
}
