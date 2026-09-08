import { PageHeader } from "@/components/shared/PageHeader";
import {
  fetchWeather,
  evaluateDayOperationalStatus,
  fetchHistoricalWeather,
  toSerializableEvaluation,
  DayOperationalEvaluation,
} from "@/lib/weather/fetchWeather";
import { fetchPagasaSignals } from "@/lib/weather/pagasa";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Cloud,
  CloudLightning,
  Wind,
  Droplets,
  History,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WeatherChart } from "./WeatherChart";
import { HistoricalWeatherCharts } from "./HistoricalWeatherCharts";
import { ForecastCardsGrid } from "./ForecastCardsGrid";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function WeatherPage() {
  const [weather, pagasaSignals] = await Promise.all([
    fetchWeather(),
    fetchPagasaSignals().catch((err) => {
      console.warn("Failed to fetch PAGASA bulletin in WeatherPage:", err);
      return null;
    }),
  ]);

  if (!weather) {
    return (
      <div className="relative">
        <PageHeader title="Weather Forecast" subtitle="Live site conditions and 7-day forecast." />
        <div className="mt-8 glass-card p-12">
          <EmptyState
            icon={CloudLightning}
            title="Weather data unavailable"
            description="Could not connect to the weather service. Please try again later."
            intent="warning"
          />
        </div>
      </div>
    );
  }

  const { current, daily, hourly } = weather;
  const siteSignalNumber = pagasaSignals?.siteSignalNumber ?? 0;
  const hasActiveTc = pagasaSignals?.hasActiveBulletin ?? false;

  // Evaluate Today's condition using multi-factor shift-aware intelligence
  const todayEval = evaluateDayOperationalStatus({
    dayIndex: 0,
    weather,
    siteSignalNumber,
    isToday: true,
  });

  const TodayIcon = todayEval.icon || Cloud;

  const intentStyles = {
    favorable: "bg-flow-teal/10 text-flow-teal ring-flow-teal/30",
    caution: "bg-signal-amber/10 text-signal-amber ring-signal-amber/30",
    suspend: "bg-signal-red/10 text-signal-red ring-signal-red/30",
  };

  const intentBorders = {
    favorable: "border-t-flow-teal shadow-[inset_0_30px_30px_-30px_rgba(31,182,166,0.15)]",
    caution: "border-t-signal-amber shadow-[inset_0_30px_30px_-30px_rgba(232,163,61,0.15)]",
    suspend: "border-t-signal-red shadow-[inset_0_30px_30px_-30px_rgba(214,72,63,0.15)]",
  };

  // Evaluate all forecast days and convert to plain serializable objects for client component
  const forecastEvaluations = daily.time.map((_, i) =>
    toSerializableEvaluation(
      evaluateDayOperationalStatus({
        dayIndex: i,
        weather,
        siteSignalNumber,
        isToday: i === 0,
      })
    )
  );

  return (
    <div className="relative space-y-8">
      <PageHeader
        title="Weather Forecast"
        subtitle="Live site conditions, PAGASA regional bulletin, and shift-aware operational forecast for SCIC Tumauini HEPP (Day: 07:00–16:00 • Night: 19:00–04:00)."
      />

      {/* Authoritative Meteorological Cross-Reference Banner */}
      <div className="rounded-xl border border-border-hairline bg-black/[0.02] dark:bg-white/[0.02] p-4 backdrop-blur-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-flow-teal/10 p-2 text-flow-teal ring-1 ring-flow-teal/20 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                  DOST-PAGASA Regional Bulletin Cross-Reference
                </span>
                {siteSignalNumber > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold bg-signal-red/10 text-signal-red ring-1 ring-signal-red/30">
                    <AlertTriangle className="h-3 w-3" /> TCWS Signal #{siteSignalNumber} Raised
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold bg-flow-teal/10 text-flow-teal ring-1 ring-flow-teal/30">
                    <CheckCircle2 className="h-3 w-3" /> PAR Clear • No Storm Signals in Isabela
                  </span>
                )}
                <span className="rounded bg-black/[0.04] dark:bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-text-muted">
                  Tumauini HEPP (17.3188°N, 121.9749°E)
                </span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                <strong className="text-text-primary">Synoptic System:</strong> Southwest Monsoon (Habagat) active over western Luzon. 
                Cagayan Valley basin is sheltered by the Sierra Madre range. 
                {hasActiveTc
                  ? ` Tropical Cyclone ${pagasaSignals?.tcName || ""} active outside immediate site threshold.`
                  : " No active tropical cyclone in PAR. Inland mornings remain predominantly clear and favorable with isolated afternoon convective rain showers."}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 text-[11px] text-text-muted border-t border-border-hairline pt-2 lg:border-t-0 lg:pt-0">
            <Info className="h-3.5 w-3.5 text-flow-teal" />
            <span>ECMWF & GFS ensemble tuned for Day (07:00–16:00) & Night (19:00–04:00) shifts</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Current Conditions Card */}
        <div
          className={cn(
            "glass-card p-6 relative overflow-hidden border-t-2 lg:col-span-1 flex flex-col justify-between",
            intentBorders[todayEval.intent]
          )}
        >
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold tracking-wide text-text-primary">Current Conditions</h2>
              <span className="text-[11px] font-mono text-text-muted">Live Telemetry</span>
            </div>

            <div className="flex items-center gap-6 mb-8">
              <TodayIcon
                className={cn(
                  "h-16 w-16 drop-shadow-lg shrink-0",
                  todayEval.intent === "favorable" && "text-flow-teal",
                  todayEval.intent === "caution" && "text-signal-amber",
                  todayEval.intent === "suspend" && "text-signal-red"
                )}
              />
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-5xl font-bold tracking-tight text-text-primary">
                    {Math.round(current.temperature_2m)}°
                  </span>
                  <span className="text-xl font-medium text-text-muted">C</span>
                </div>
                <p className="text-base font-medium text-text-primary mt-1">
                  {todayEval.conditionLabel}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Feels like {Math.round(current.apparent_temperature)}°C • High: {todayEval.tempMax}°C / Low: {todayEval.tempMin}°C
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg dark:bg-white/[0.03] bg-black/[0.03] p-4 ring-1 ring-border-hairline">
                <div className="flex items-center gap-2 text-text-muted mb-2">
                  <Wind className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wider font-mono font-medium">Wind</span>
                </div>
                <span className="text-lg font-semibold text-text-primary">
                  {current.wind_speed_10m} <span className="text-xs text-text-muted">km/h</span>
                </span>
                <p className="text-[10px] text-text-muted mt-1 font-mono">
                  Day Gusts: {todayEval.dayShiftMaxWindKph} km/h
                </p>
              </div>
              <div className="rounded-lg dark:bg-white/[0.03] bg-black/[0.03] p-4 ring-1 ring-border-hairline">
                <div className="flex items-center gap-2 text-text-muted mb-2">
                  <Droplets className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wider font-mono font-medium">Shift Rain</span>
                </div>
                <span className="text-lg font-semibold text-text-primary">
                  {todayEval.dayShiftPrecipMm} <span className="text-xs text-text-muted">mm Day</span>
                </span>
                <p className="text-[10px] text-text-muted mt-1 font-mono">
                  Night Shift: {todayEval.nightShiftPrecipMm} mm
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-lg dark:bg-white/[0.03] bg-black/[0.03] p-4 ring-1 ring-border-hairline space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider font-mono">
                Site Operational Recommendation
              </p>
              <div
                className={cn(
                  "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold ring-1 font-mono uppercase tracking-wider",
                  intentStyles[todayEval.intent]
                )}
              >
                {todayEval.badgeLabel}
              </div>
            </div>

            <p className="text-xs text-text-primary leading-relaxed">
              {todayEval.operationalGuidance}
            </p>

            {todayEval.peakRainWindow && (
              <div className="flex items-center gap-1.5 text-[11px] text-signal-amber pt-1 border-t border-border-hairline">
                <Clock className="h-3 w-3" />
                <span>Peak afternoon rain window: {todayEval.peakRainWindow}</span>
              </div>
            )}
          </div>
        </div>

        {/* Hourly Chart */}
        <div className="glass-card p-6 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold tracking-wide text-text-primary">Hourly Forecast (Next 24h)</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Detailed hourly temperature, rainfall probability, and shift timeline
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-flow-teal">
                <span className="h-2 w-2 rounded-full bg-flow-teal" /> Temp (°C)
              </span>
              <span className="flex items-center gap-1.5 text-signal-amber">
                <span className="h-2 w-2 rounded-full bg-signal-amber" /> Rain Probability (%)
              </span>
            </div>
          </div>
          <WeatherChart hourly={hourly} />
        </div>
      </div>

      {/* 7-Day Shift-Aware Forecast Cards */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-semibold tracking-wide text-text-primary">
              {daily.time.length >= 7 ? "7-Day Forecast" : `${daily.time.length}-Day Forecast`}
            </h2>
            <p className="text-xs text-text-muted">
              Shift-aware operational recommendations calibrated for civil works (Day Shift: 07:00–16:00 • Night Shift: 19:00–04:00).
            </p>
          </div>
          {daily.time.length < 7 && (
            <span className="text-xs font-medium text-signal-amber bg-signal-amber/10 px-2 py-1 rounded-md border border-signal-amber/20 self-start">
              Limited by fallback provider
            </span>
          )}
        </div>

        <ForecastCardsGrid evaluations={forecastEvaluations} hourly={hourly} />
      </div>

      {/* Historical Data Section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold tracking-wide text-text-primary mb-4">Historical Weather & Analytics</h2>
        <Suspense fallback={<HistoricalWeatherSkeleton />}>
          <HistoricalSectionContainer />
        </Suspense>
      </div>
    </div>
  );
}

async function HistoricalSectionContainer() {
  const data = await fetchHistoricalWeather();
  if (!data) {
    return (
      <div className="rounded-xl border border-dashed border-border-hairline dark:bg-white/[0.02] bg-black/[0.02] p-12">
        <EmptyState
          icon={History}
          title="Data unavailable"
          description="Could not load historical weather data from the archive."
          intent="warning"
        />
      </div>
    );
  }
  return <HistoricalWeatherCharts data={data} />;
}

function HistoricalWeatherSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card p-5 h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="glass-card p-6 h-80" />
        <div className="glass-card p-6 h-80" />
      </div>
      <div className="glass-card p-6 h-40" />
    </div>
  );
}
