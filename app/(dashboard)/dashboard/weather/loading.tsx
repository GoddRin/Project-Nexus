import { PageHeader } from "@/components/shared/PageHeader";

export default function WeatherLoading() {
  return (
    <div className="relative">
      <PageHeader
        title="Weather Forecast"
        subtitle="Live site conditions and 7-day forecast."
      />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass-card flex h-[300px] animate-pulse items-center justify-center p-6 lg:col-span-1">
          <div className="h-12 w-12 rounded-full bg-white/10" />
        </div>

        <div className="glass-card flex h-[300px] animate-pulse items-center justify-center p-6 lg:col-span-2">
          <div className="h-12 w-12 rounded-full bg-white/10" />
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-4 h-6 w-32 rounded bg-white/10 animate-pulse" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass-card h-40 w-48 shrink-0 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
