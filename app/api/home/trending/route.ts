import type { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, homeJson } from "@/lib/home/apiResponse";
import { getAllTrending, getTrending } from "@/lib/home/newsAggregator";

const query = z.object({ category: z.enum(["PH", "ENERGY", "BUSINESS", "WORLD"]).optional() });

/** GET /api/home/trending[?category=PH|ENERGY|BUSINESS|WORLD] -> { data: TrendingResult } or, with no category, every category */
export async function GET(request: NextRequest) {
  const parsed = query.safeParse({ category: request.nextUrl.searchParams.get("category")?.toUpperCase() ?? undefined });
  if (!parsed.success) return badRequest("category must be PH, ENERGY, BUSINESS or WORLD");
  return homeJson({ data: parsed.data.category ? await getTrending(parsed.data.category) : await getAllTrending() });
}
