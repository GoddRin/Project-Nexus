import React from "react";
import { OpsSnapshotCard } from "@/components/home/ops/OpsSnapshotCard";
import { getOpsSnapshot } from "@/lib/home/ops";
import { DailyBriefCard } from "@/components/home/brief/DailyBriefCard";
import { WeatherGlanceCard } from "@/components/home/weather/WeatherGlanceCard";
import { getDailyBrief } from "@/lib/home/dailyBrief";
import { withMockAlert } from "@/lib/home/devMocks";
import { getWeatherGlance } from "@/lib/home/weatherGlance";

/** Server loader for the weather card: both sites, fetched together (each is cached ten minutes) */
export async function WeatherGlanceSection({ mockAlert }: { mockAlert?: string }) {
  const [tumauini, manila] = await Promise.all([getWeatherGlance("tumauini").catch(() => null), getWeatherGlance("manila").catch(() => null)]);
  return <WeatherGlanceCard initial={{ tumauini: withMockAlert(tumauini, mockAlert), manila }} />;
}

/** Server loader for the brief card (the AI is asked at most once per edition; see lib/home/dailyBrief.ts) */
export async function DailyBriefSection() {
  const [brief, site] = await Promise.all([getDailyBrief(), getWeatherGlance("tumauini").catch(() => null)]);
  return <DailyBriefCard initial={brief} outlook={site?.outlook ?? []} />;
}

/** Server loader for the operations card (left out if the site records cannot be read) */
export async function OpsSection() {
  const ops = await getOpsSnapshot();
  return ops ? <OpsSnapshotCard initial={ops} /> : null;
}
