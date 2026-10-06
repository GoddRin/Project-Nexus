import type { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, homeJson } from "@/lib/home/apiResponse";
import { getWeatherGlance } from "@/lib/home/weatherGlance";

const query = z.object({ site: z.enum(["tumauini", "manila"]).default("tumauini") });

/** GET /api/home/weather?site=tumauini|manila -> { data: WeatherGlance | null } */
export async function GET(request: NextRequest) {
  const parsed = query.safeParse({ site: request.nextUrl.searchParams.get("site") ?? undefined });
  if (!parsed.success) return badRequest("site must be tumauini or manila");
  return homeJson({ data: await getWeatherGlance(parsed.data.site) });
}
