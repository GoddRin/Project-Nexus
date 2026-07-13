import { PageHeader } from "@/components/shared/PageHeader";
import { fetchWeather, getWeatherInfo, fetchHistoricalWeather } from "@/lib/weather/fetchWeather";
import { EmptyState } from "@/components/shared/EmptyState";
import { CloudLightning, Wind, Droplets, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { WeatherChart } from "./WeatherChart";
import { HistoricalWeatherCharts } from "./HistoricalWeatherCharts";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function WeatherPage() {
  const weather = await fetchWeather();

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
  const currentRecommendation = getWeatherInfo(current.weather_code);
  const CurrentIcon = currentRecommendation.icon;

  const intentStyles = {
    favorable: "bg-flow-teal/10 text-flow-teal ring-flow-teal/30",
    caution: "bg-signal-amber/10 text-signal-amber ring-signal-amber/30",
    suspend: "bg-signal-red/10 text-signal-red ring-signal-red/30",
  };

  return (
    <div className="relative">
      <PageHeader
        title="Weather Forecast"
        subtitle="Live site conditions and 7-day forecast for Tumauini, Isabela."
      />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Current Conditions Expanded */}
        <div className={cn(
          "glass-card p-6 relative overflow-hidden border-t-2 lg:col-span-1 flex flex-col justify-between",
          currentRecommendation.intent === "favorable" && "border-t-flow-teal shadow-[inset_0_30px_30px_-30px_rgba(31,182,166,0.15)]",
          currentRecommendation.intent === "caution" && "border-t-signal-amber shadow-[inset_0_30px_30px_-30px_rgba(232,163,61,0.15)]",
          currentRecommendation.intent === "suspend" && "border-t-signal-red shadow-[inset_0_30px_30px_-30px_rgba(214,72,63,0.15)]"
        )}>
          <div>
            <h2 className="text-lg font-semibold tracking-wide text-text-primary mb-6">Current Conditions</h2>
            <div className="flex items-center gap-6 mb-8">
              <CurrentIcon className={cn(
                "h-16 w-16 drop-shadow-lg",
                currentRecommendation.intent === "favorable" && "text-flow-teal",
                currentRecommendation.intent === "caution" && "text-signal-amber",
                currentRecommendation.intent === "suspend" && "text-signal-red"
              )} />
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-5xl font-bold tracking-tight text-text-primary">
                    {Math.round(current.temperature_2m)}°
                  </span>
                  <span className="text-xl font-medium text-text-muted">C</span>
                </div>
                <p className="text-base font-medium text-text-primary mt-1">
                  {currentRecommendation.conditionLabel}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Feels like {Math.round(current.apparent_temperature)}°C
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg dark:bg-white/[0.03] bg-black/[0.03] p-4 ring-1 ring-border-hairline">
                <div className="flex items-center gap-2 text-text-muted mb-2">
                  <Wind className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wider font-mono font-medium">Wind</span>
                </div>
                <span className="text-lg font-semibold text-text-primary">{current.wind_speed_10m} <span className="text-xs text-text-muted">km/h</span></span>
              </div>
              <div className="rounded-lg dark:bg-white/[0.03] bg-black/[0.03] p-4 ring-1 ring-border-hairline">
                <div className="flex items-center gap-2 text-text-muted mb-2">
                  <Droplets className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wider font-mono font-medium">Humidity</span>
                </div>
                <span className="text-lg font-semibold text-text-primary">{current.relative_humidity_2m}%</span>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-lg dark:bg-white/[0.03] bg-black/[0.03] p-4 ring-1 ring-border-hairline">
            <p className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wider font-mono">Site Recommendation</p>
            <div className={cn(
              "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold ring-1",
              intentStyles[currentRecommendation.intent]
            )}>
              {currentRecommendation.label}
            </div>
          </div>
        </div>

        {/* Hourly Chart */}
        <div className="glass-card p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold tracking-wide text-text-primary mb-4">Hourly Forecast (Next 24h)</h2>
          <WeatherChart hourly={hourly} />
        </div>
      </div>

      {/* Forecast Cards */}
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold tracking-wide text-text-primary">
            {daily.time.length >= 7 ? "7-Day Forecast" : `${daily.time.length}-Day Forecast`}
          </h2>
          {daily.time.length < 7 && (
            <span className="text-xs font-medium text-signal-amber bg-signal-amber/10 px-2 py-1 rounded-md border border-signal-amber/20">
              Limited by fallback provider
            </span>
          )}
        </div>
        <div className="flex overflow-x-auto pb-4 gap-4 scrollbar-thin scrollbar-track-white/[0.02] scrollbar-thumb-white/10">
          {daily.time.map((dateStr, i) => {
            const date = new Date(dateStr);
            const isToday = new Date().toDateString() === date.toDateString();
            const rec = getWeatherInfo(daily.weather_code[i]);
            const DayIcon = rec.icon;

            return (
              <div key={dateStr} className={cn(
                "glass-card shrink-0 w-64 p-5 flex flex-col justify-between transition-all duration-300 hover:dark:bg-white/[0.04] bg-black/[0.04]",
                isToday && "ring-1 ring-flow-teal/30 bg-flow-teal/[0.02]"
              )}>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-medium text-text-primary">
                      {isToday ? "Today" : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <DayIcon className={cn(
                      "h-6 w-6",
                      rec.intent === "favorable" && "text-flow-teal",
                      rec.intent === "caution" && "text-signal-amber",
                      rec.intent === "suspend" && "text-signal-red"
                    )} />
                  </div>
                  
                  <div className="flex items-end gap-3 mb-2">
                    <span className="font-display text-2xl font-bold text-text-primary">
                      {Math.round(daily.temperature_2m_max[i])}°
                    </span>
                    <span className="text-sm font-medium text-text-muted mb-1">
                      / {Math.round(daily.temperature_2m_min[i])}°C
                    </span>
                  </div>
                  
                  <p className="text-sm text-text-primary mb-4">{rec.conditionLabel}</p>

                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Droplets className="h-3.5 w-3.5 text-signal-amber" />
                    <span>{daily.precipitation_probability_max[i]}% precipitation</span>
                  </div>
                </div>

                <div className={cn(
                  "mt-4 inline-block rounded px-2 py-1 text-[10px] uppercase tracking-wider font-semibold ring-1 font-mono",
                  intentStyles[rec.intent]
                )}>
                  {rec.intent === "favorable" ? "Favorable" : rec.intent === "caution" ? "Caution" : "Suspend"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historical Data */}
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
