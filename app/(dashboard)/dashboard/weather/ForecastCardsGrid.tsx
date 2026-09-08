"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  Wind,
  Clock,
  CheckCircle2,
  Droplets,
  X,
  Maximize2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SerializableDayOperationalEvaluation, WeatherData } from "@/lib/weather/fetchWeather";

interface ForecastCardsGridProps {
  evaluations: SerializableDayOperationalEvaluation[];
  hourly?: WeatherData["hourly"];
}

const iconMap = {
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  Wind,
};

function resolveIcon(iconName?: string) {
  if (!iconName) return Cloud;
  return iconMap[iconName as keyof typeof iconMap] || Cloud;
}

const intentStyles = {
  favorable: "bg-flow-teal/10 text-flow-teal ring-flow-teal/30",
  caution: "bg-signal-amber/10 text-signal-amber ring-signal-amber/30",
  suspend: "bg-signal-red/10 text-signal-red ring-signal-red/30",
};

const intentBadges = {
  favorable: "bg-flow-teal/15 text-flow-teal border-flow-teal/30",
  caution: "bg-signal-amber/15 text-signal-amber border-signal-amber/30",
  suspend: "bg-signal-red/15 text-signal-red border-signal-red/30",
};

export function ForecastCardsGrid({ evaluations, hourly }: ForecastCardsGridProps) {
  const [selectedDay, setSelectedDay] = useState<SerializableDayOperationalEvaluation | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDay(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Compute hourly breakdown for the selected day's shifts
  const getSelectedDayHourly = (dayIndex: number) => {
    if (!hourly || !Array.isArray(hourly.time)) return [];

    const startIdx = dayIndex * 24;
    const nextStartIdx = (dayIndex + 1) * 24;

    const hoursData = [];

    // Day shift: 07:00 to 16:00
    for (let h = 7; h <= 15; h++) {
      const idx = startIdx + h;
      if (idx < hourly.time.length) {
        hoursData.push({
          hourLabel: `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? "PM" : "AM"}`,
          shift: "Day Shift",
          isDay: true,
          temp: Math.round(hourly.temperature_2m?.[idx] ?? 25),
          precip: hourly.precipitation?.[idx] ?? 0,
          prob: hourly.precipitation_probability?.[idx] ?? 0,
          wind: Math.round(hourly.wind_speed_10m?.[idx] ?? 0),
          code: hourly.weather_code?.[idx] ?? 0,
        });
      }
    }

    // Night shift: 19:00 to 04:00 (hours 19-23 today, 0-3 tomorrow)
    for (let h = 19; h <= 23; h++) {
      const idx = startIdx + h;
      if (idx < hourly.time.length) {
        hoursData.push({
          hourLabel: `${h % 12 === 0 ? 12 : h % 12} PM`,
          shift: "Night Shift",
          isDay: false,
          temp: Math.round(hourly.temperature_2m?.[idx] ?? 23),
          precip: hourly.precipitation?.[idx] ?? 0,
          prob: hourly.precipitation_probability?.[idx] ?? 0,
          wind: Math.round(hourly.wind_speed_10m?.[idx] ?? 0),
          code: hourly.weather_code?.[idx] ?? 0,
        });
      }
    }

    for (let h = 0; h <= 3; h++) {
      const idx = nextStartIdx + h;
      if (idx < hourly.time.length) {
        hoursData.push({
          hourLabel: `${h === 0 ? 12 : h} AM`,
          shift: "Night Shift",
          isDay: false,
          temp: Math.round(hourly.temperature_2m?.[idx] ?? 22),
          precip: hourly.precipitation?.[idx] ?? 0,
          prob: hourly.precipitation_probability?.[idx] ?? 0,
          wind: Math.round(hourly.wind_speed_10m?.[idx] ?? 0),
          code: hourly.weather_code?.[idx] ?? 0,
        });
      }
    }

    return hoursData;
  };

  const selectedHourly = selectedDay ? getSelectedDayHourly(selectedDay.dayIndex) : [];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 group/grid">
        {evaluations.slice(0, 7).map((evalData) => {
          const date = new Date(evalData.dateStr);
          const DayIcon = resolveIcon(evalData.iconName);
          const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
          const monthDay = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

          return (
            <div
              key={evalData.dateStr}
              onClick={() => setSelectedDay(evalData)}
              className={cn(
                "glass-card p-4 flex flex-col justify-between rounded-xl relative overflow-hidden transition-all duration-300 ease-out cursor-pointer group select-none",
                // Spotlight Dimming: when hovering any card in the grid, other cards gently dim
                "group-hover/grid:opacity-40 hover:!opacity-100",
                // Elevation & Smooth Scaling on hover
                "hover:-translate-y-2 hover:scale-[1.03] hover:z-20",
                // Shimmer Flash: glossy light sheen sweeping across the card face on hover
                "before:absolute before:inset-0 before:-translate-x-full hover:before:translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/[0.18] before:to-transparent before:transition-transform before:duration-700 before:ease-in-out before:pointer-events-none",
                // Ambient Status Glow Halo matching intent
                evalData.intent === "favorable" && "border-t-2 border-t-flow-teal hover:border-flow-teal hover:shadow-[0_0_35px_-5px_rgba(31,182,166,0.4)]",
                evalData.intent === "caution" && "border-t-2 border-t-signal-amber hover:border-signal-amber hover:shadow-[0_0_35px_-5px_rgba(232,163,61,0.4)]",
                evalData.intent === "suspend" && "border-t-2 border-t-signal-red hover:border-signal-red hover:shadow-[0_0_35px_-5px_rgba(214,72,63,0.4)]",
                evalData.isToday && "ring-2 ring-flow-teal/50 bg-flow-teal/[0.03]"
              )}
            >
              <div>
                {/* Card Header: Day, Date & Icon */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-sm text-text-primary flex items-center gap-1.5">
                      {evalData.isToday ? "Today" : weekday}
                      {evalData.isToday && (
                        <span className="h-1.5 w-1.5 rounded-full bg-flow-teal animate-pulse" />
                      )}
                    </div>
                    <div className="text-[11px] text-text-muted font-medium">
                      {monthDay}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        "p-1.5 rounded-lg ring-1 shrink-0 transition-transform duration-300 group-hover:scale-110",
                        evalData.intent === "favorable" && "bg-flow-teal/10 text-flow-teal ring-flow-teal/20",
                        evalData.intent === "caution" && "bg-signal-amber/10 text-signal-amber ring-signal-amber/20",
                        evalData.intent === "suspend" && "bg-signal-red/10 text-signal-red ring-signal-red/20"
                      )}
                    >
                      <DayIcon className="h-5 w-5" />
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-text-muted/60 p-1">
                      <Maximize2 className="h-3 w-3" />
                    </div>
                  </div>
                </div>

                {/* Temperature & Daily Shift Total Rain Pill */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-2xl font-bold text-text-primary tracking-tight">
                      {evalData.tempMax}°
                    </span>
                    <span className="text-xs font-semibold text-text-muted">
                      / {evalData.tempMin}°C
                    </span>
                  </div>

                  <div
                    title={`Day Shift: ${evalData.dayShiftPrecipMm} mm • Night Shift: ${evalData.nightShiftPrecipMm} mm`}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold ring-1 shrink-0",
                      evalData.rainfallExpectedMm === 0
                        ? "bg-flow-teal/10 text-flow-teal ring-flow-teal/20"
                        : evalData.rainfallExpectedMm < 5
                        ? "bg-flow-teal/10 text-flow-teal ring-flow-teal/20"
                        : evalData.rainfallExpectedMm < 15
                        ? "bg-signal-amber/10 text-signal-amber ring-signal-amber/20"
                        : "bg-signal-red/10 text-signal-red ring-signal-red/20"
                    )}
                  >
                    <Droplets className="h-3 w-3" />
                    <span>{evalData.rainfallExpectedMm} mm</span>
                  </div>
                </div>

                {/* Shift-Aware Condition Label (Fixed 40px Height for Rock-Solid Row Alignment) */}
                <div className="h-10 flex items-center mb-3">
                  <p 
                    title={evalData.conditionLabel}
                    className="text-xs font-medium text-text-primary leading-snug line-clamp-2"
                  >
                    {evalData.conditionLabel}
                  </p>
                </div>

                {/* Shift Rainfall Telemetry Box (Day 7A–4P vs Night 7P–4A) */}
                <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.03] p-2.5 ring-1 ring-border-hairline mb-3 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-text-muted uppercase tracking-wider font-semibold">
                    <span>Shift Rain</span>
                    <span className="font-normal text-[9px] text-text-muted/70">Day & Night</span>
                  </div>

                  {/* 2-Column Equal Split: Day Shift vs Night Shift */}
                  <div className="grid grid-cols-2 gap-1.5 text-center">
                    {/* Day Shift (07:00–16:00) */}
                    <div className="rounded bg-black/[0.02] dark:bg-white/[0.03] px-1 py-1.5 ring-1 ring-border-hairline/60 flex flex-col justify-between min-h-[5.25rem]">
                      <div>
                        <span className="text-[10px] text-text-muted font-mono font-medium block">Day Shift</span>
                        <span className="text-[8.5px] text-text-muted/70 font-mono block">07:00–16:00</span>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-bold font-mono block my-0.5",
                          evalData.shiftBreakdown.dayShift.precipSumMm === 0
                            ? "text-flow-teal"
                            : evalData.shiftBreakdown.dayShift.precipSumMm < 3
                            ? "text-flow-teal"
                            : evalData.shiftBreakdown.dayShift.precipSumMm < 10
                            ? "text-signal-amber"
                            : "text-signal-red"
                        )}
                      >
                        {evalData.shiftBreakdown.dayShift.precipSumMm} mm
                      </span>
                      <div className="text-[9px] font-mono border-t border-border-hairline/40 pt-1">
                        {evalData.shiftBreakdown.dayShift.rainWindow ? (
                          <span className="text-signal-amber font-semibold flex items-center justify-center gap-0.5">
                            <Clock className="h-2.5 w-2.5 shrink-0" />
                            {evalData.shiftBreakdown.dayShift.rainWindow}
                          </span>
                        ) : (
                          <span className="text-flow-teal/80 flex items-center justify-center gap-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                            Dry
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Night Shift (19:00–04:00) */}
                    <div className="rounded bg-black/[0.02] dark:bg-white/[0.03] px-1 py-1.5 ring-1 ring-border-hairline/60 flex flex-col justify-between min-h-[5.25rem]">
                      <div>
                        <span className="text-[10px] text-text-muted font-mono font-medium block">Night Shift</span>
                        <span className="text-[8.5px] text-text-muted/70 font-mono block">19:00–04:00</span>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-bold font-mono block my-0.5",
                          evalData.shiftBreakdown.nightShift.precipSumMm === 0
                            ? "text-flow-teal"
                            : evalData.shiftBreakdown.nightShift.precipSumMm < 3
                            ? "text-flow-teal"
                            : evalData.shiftBreakdown.nightShift.precipSumMm < 10
                            ? "text-signal-amber"
                            : "text-signal-red"
                        )}
                      >
                        {evalData.shiftBreakdown.nightShift.precipSumMm} mm
                      </span>
                      <div className="text-[9px] font-mono border-t border-border-hairline/40 pt-1">
                        {evalData.shiftBreakdown.nightShift.rainWindow ? (
                          <span className="text-signal-amber font-semibold flex items-center justify-center gap-0.5">
                            <Clock className="h-2.5 w-2.5 shrink-0" />
                            {evalData.shiftBreakdown.nightShift.rainWindow}
                          </span>
                        ) : (
                          <span className="text-flow-teal/80 flex items-center justify-center gap-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                            Dry
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Uniform Telemetry Baseline Row */}
                  <div className="flex items-center justify-between text-[9.5px] font-mono pt-1.5 border-t border-border-hairline/60 text-text-muted">
                    <span className="truncate max-w-[125px] font-medium text-text-muted/90">
                      {evalData.intent === "favorable" ? "Normal schedule" : "Caution: plan pours"}
                    </span>
                    <span className="font-semibold text-[9px] text-text-muted/70 shrink-0">
                      Gusts {evalData.dayShiftMaxWindKph}kph
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer: Operational Status Badge */}
              <div className="pt-2 border-t border-border-hairline">
                <div
                  className={cn(
                    "w-full text-center rounded-lg py-1.5 text-[11px] uppercase tracking-wider font-bold ring-1 font-mono transition-colors flex items-center justify-center gap-1.5",
                    intentStyles[evalData.intent]
                  )}
                >
                  <span>{evalData.badgeLabel}</span>
                  <span className="text-[9px] opacity-70">↗</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Animated Shift Inspection Modal / Dialog */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedDay(null)}
          >
            <motion.div
              className={cn(
                "w-full max-w-2xl glass-card rounded-2xl border border-border-hairline shadow-2xl p-6 relative overflow-hidden max-h-[90vh] flex flex-col bg-slate-950/95",
                selectedDay.intent === "suspend" && "border-t-4 border-t-signal-red",
                selectedDay.intent === "caution" && "border-t-4 border-t-signal-amber",
                selectedDay.intent === "favorable" && "border-t-4 border-t-flow-teal"
              )}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-border-hairline shrink-0">
                <div className="flex items-center gap-3.5">
                  <div
                    className={cn(
                      "p-2.5 rounded-xl ring-1 shrink-0",
                      selectedDay.intent === "favorable" && "bg-flow-teal/10 text-flow-teal ring-flow-teal/20",
                      selectedDay.intent === "caution" && "bg-signal-amber/10 text-signal-amber ring-signal-amber/20",
                      selectedDay.intent === "suspend" && "bg-signal-red/10 text-signal-red ring-signal-red/20"
                    )}
                  >
                    {(() => {
                      const ModalIcon = resolveIcon(selectedDay.iconName);
                      return <ModalIcon className="h-8 w-8" />;
                    })()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-text-primary tracking-tight">
                        {new Date(selectedDay.dateStr).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </h2>
                      {selectedDay.isToday && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-flow-teal/20 text-flow-teal">
                          TODAY
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-text-muted mt-0.5">
                      {selectedDay.conditionLabel} • High: {selectedDay.tempMax}°C / Low: {selectedDay.tempMin}°C
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold uppercase font-mono border tracking-wider",
                      intentBadges[selectedDay.intent]
                    )}
                  >
                    {selectedDay.badgeLabel} DIRECTIVE
                  </span>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body: Scrollable */}
              <div className="space-y-4 overflow-y-auto py-4 pr-1">
                {/* 1. Full Operational Directive Banner */}
                <div
                  className={cn(
                    "rounded-xl p-4 border flex items-start gap-3",
                    selectedDay.intent === "favorable" && "bg-flow-teal/[0.06] border-flow-teal/30 text-flow-teal",
                    selectedDay.intent === "caution" && "bg-signal-amber/[0.06] border-signal-amber/30 text-signal-amber",
                    selectedDay.intent === "suspend" && "bg-signal-red/[0.06] border-signal-red/30 text-signal-red"
                  )}
                >
                  <div className="p-1.5 rounded-lg bg-black/20 shrink-0 mt-0.5">
                    {selectedDay.intent === "favorable" ? (
                      <ShieldCheck className="h-5 w-5" />
                    ) : selectedDay.intent === "caution" ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : (
                      <ShieldAlert className="h-5 w-5" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-bold block">
                      Full Construction Site Operational Advisory
                    </span>
                    <p className="text-sm font-medium text-text-primary leading-relaxed">
                      {selectedDay.operationalGuidance}
                    </p>
                  </div>
                </div>

                {/* 2. Side-by-Side In-Depth Shift Intelligence Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Day Shift Card */}
                  <div className="rounded-xl bg-black/30 dark:bg-white/[0.02] border border-border-hairline p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-border-hairline/60 pb-2">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-flow-teal" />
                        <div>
                          <h3 className="font-bold text-sm text-text-primary">Day Shift</h3>
                          <span className="text-[10px] font-mono text-text-muted">07:00 AM – 4:00 PM (9h)</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-flow-teal bg-flow-teal/10 px-2 py-0.5 rounded border border-flow-teal/20">
                        {selectedDay.shiftBreakdown.dayShift.precipSumMm} mm
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="rounded-lg bg-black/20 p-2 border border-border-hairline/40">
                        <span className="text-[10px] text-text-muted block">Rain Timing</span>
                        <span className="font-bold text-text-primary">
                          {selectedDay.shiftBreakdown.dayShift.rainWindow ? (
                            <span className="text-signal-amber">{selectedDay.shiftBreakdown.dayShift.rainWindow}</span>
                          ) : (
                            <span className="text-flow-teal">Dry working shift</span>
                          )}
                        </span>
                      </div>

                      <div className="rounded-lg bg-black/20 p-2 border border-border-hairline/40">
                        <span className="text-[10px] text-text-muted block">Max Wind Gusts</span>
                        <span className="font-bold text-text-primary">
                          {selectedDay.shiftBreakdown.dayShift.maxWindKph} km/h
                        </span>
                      </div>

                      <div className="rounded-lg bg-black/20 p-2 border border-border-hairline/40">
                        <span className="text-[10px] text-text-muted block">Rain Probability</span>
                        <span className="font-bold text-text-primary">
                          {selectedDay.shiftBreakdown.dayShift.precipProbMax}% peak
                        </span>
                      </div>

                      <div className="rounded-lg bg-black/20 p-2 border border-border-hairline/40">
                        <span className="text-[10px] text-text-muted block">Average Temp</span>
                        <span className="font-bold text-text-primary">
                          {selectedDay.shiftBreakdown.dayShift.tempAvg}°C
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-text-muted pt-1 border-t border-border-hairline/40">
                      <span className="font-semibold text-text-primary">Condition: </span>
                      {selectedDay.shiftBreakdown.dayShift.label}
                    </div>
                  </div>

                  {/* Night Shift Card */}
                  <div className="rounded-xl bg-black/30 dark:bg-white/[0.02] border border-border-hairline p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-border-hairline/60 pb-2">
                      <div className="flex items-center gap-2">
                        <Cloud className="h-4 w-4 text-signal-amber" />
                        <div>
                          <h3 className="font-bold text-sm text-text-primary">Night Shift</h3>
                          <span className="text-[10px] font-mono text-text-muted">7:00 PM – 4:00 AM (9h)</span>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-mono font-bold px-2 py-0.5 rounded border",
                          selectedDay.shiftBreakdown.nightShift.precipSumMm >= 10
                            ? "text-signal-red bg-signal-red/10 border-signal-red/20"
                            : selectedDay.shiftBreakdown.nightShift.precipSumMm >= 3
                            ? "text-signal-amber bg-signal-amber/10 border-signal-amber/20"
                            : "text-flow-teal bg-flow-teal/10 border-flow-teal/20"
                        )}
                      >
                        {selectedDay.shiftBreakdown.nightShift.precipSumMm} mm
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="rounded-lg bg-black/20 p-2 border border-border-hairline/40">
                        <span className="text-[10px] text-text-muted block">Rain Timing</span>
                        <span className="font-bold text-text-primary">
                          {selectedDay.shiftBreakdown.nightShift.rainWindow ? (
                            <span className="text-signal-amber">{selectedDay.shiftBreakdown.nightShift.rainWindow}</span>
                          ) : (
                            <span className="text-flow-teal">Dry overnight shift</span>
                          )}
                        </span>
                      </div>

                      <div className="rounded-lg bg-black/20 p-2 border border-border-hairline/40">
                        <span className="text-[10px] text-text-muted block">Max Wind Gusts</span>
                        <span className="font-bold text-text-primary">
                          {selectedDay.shiftBreakdown.nightShift.maxWindKph} km/h
                        </span>
                      </div>

                      <div className="rounded-lg bg-black/20 p-2 border border-border-hairline/40">
                        <span className="text-[10px] text-text-muted block">Rain Probability</span>
                        <span className="font-bold text-text-primary">
                          {selectedDay.shiftBreakdown.nightShift.precipProbMax}% peak
                        </span>
                      </div>

                      <div className="rounded-lg bg-black/20 p-2 border border-border-hairline/40">
                        <span className="text-[10px] text-text-muted block">Average Temp</span>
                        <span className="font-bold text-text-primary">
                          {selectedDay.shiftBreakdown.nightShift.tempAvg}°C
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-text-muted pt-1 border-t border-border-hairline/40">
                      <span className="font-semibold text-text-primary">Condition: </span>
                      {selectedDay.shiftBreakdown.nightShift.label}
                    </div>
                  </div>
                </div>

                {/* 3. Hour-by-Hour Shift Visual Timeline */}
                {selectedHourly.length > 0 && (
                  <div className="rounded-xl bg-black/30 dark:bg-white/[0.02] border border-border-hairline p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider font-mono text-text-muted flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-flow-teal" /> Hourly Shift Progression Timeline
                      </span>
                      <span className="text-[10px] font-mono text-text-muted">
                        Day Shift (7A–4P) • Night Shift (7P–4A)
                      </span>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                      {selectedHourly.map((item, idx) => {
                        const hasRain = item.precip >= 0.3;
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "flex flex-col items-center justify-between p-2 rounded-lg border min-w-[4.25rem] text-center shrink-0 font-mono transition-colors",
                              hasRain
                                ? "bg-signal-amber/10 border-signal-amber/30 text-signal-amber"
                                : item.isDay
                                ? "bg-black/20 border-border-hairline/60 text-text-primary"
                                : "bg-white/[0.02] border-border-hairline/40 text-text-muted"
                            )}
                          >
                            <span className="text-[10px] font-bold block">{item.hourLabel}</span>
                            <span className="text-[9px] text-text-muted block">{item.temp}°C</span>
                            <div className="my-1">
                              {hasRain ? (
                                <Droplets className="h-3.5 w-3.5 text-signal-amber mx-auto" />
                              ) : item.isDay ? (
                                <Sun className="h-3.5 w-3.5 text-flow-teal mx-auto" />
                              ) : (
                                <Cloud className="h-3.5 w-3.5 text-text-muted mx-auto" />
                              )}
                            </div>
                            <span className="text-[10px] font-bold block">
                              {item.precip > 0 ? `${item.precip.toFixed(1)}mm` : "0 mm"}
                            </span>
                            <span className="text-[8px] text-text-muted block">
                              {item.prob}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. Civil Engineering Protocols Checklist */}
                <div className="rounded-xl bg-black/20 border border-border-hairline p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-flow-teal" />
                    <div>
                      <span className="text-text-muted text-[10px] block">Crane Lift Limit:</span>
                      <span className="font-semibold text-text-primary">
                        {selectedDay.dayShiftMaxWindKph <= 28 ? "Permitted (< 28 kph)" : "Restricted (> 28 kph)"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-signal-amber" />
                    <div>
                      <span className="text-text-muted text-[10px] block">Concrete Pouring:</span>
                      <span className="font-semibold text-text-primary">
                        {selectedDay.shiftBreakdown.dayShift.precipSumMm < 3
                          ? "Favorable Day Pours"
                          : "Tarp & Monitor Rain"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-flow-teal" />
                    <div>
                      <span className="text-text-muted text-[10px] block">Ground Earthworks:</span>
                      <span className="font-semibold text-text-primary">
                        {selectedDay.shiftBreakdown.dayShift.precipSumMm < 5 ? "Normal Operations" : "Haul Road Advisory"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-border-hairline flex items-center justify-between text-xs font-mono text-text-muted shrink-0">
                <span>SCIC Tumauini HEPP Meteorological Telemetry</span>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-text-primary font-semibold transition-colors"
                >
                  Close Inspection
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
