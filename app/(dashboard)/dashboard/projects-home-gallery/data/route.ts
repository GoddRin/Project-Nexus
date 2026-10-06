import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCompanyFeed } from "@/lib/home/companyFeed";
import { getDailyBrief } from "@/lib/home/dailyBrief";
import { getPhpUsd } from "@/lib/home/forex";
import { getAllTrending } from "@/lib/home/newsAggregator";
import { getPortfolioStats } from "@/lib/home/portfolio";
import { getWeatherGlance } from "@/lib/home/weatherGlance";

/**
 * TEMPORARY, development only: the Nexus Home loaders' output without signing in, for checking
 * the data layer. Not available in production; deleted with the gallery before the final phase.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") return new NextResponse(null, { status: 404 });
  const only = request.nextUrl.searchParams.get("only");
  const loaders: Record<string, () => Promise<unknown>> = {
    weather: () => getWeatherGlance("tumauini"),
    manila: () => getWeatherGlance("manila"),
    trending: () => getAllTrending(),
    feed: () => getCompanyFeed({ limit: 12 }),
    portfolio: () => getPortfolioStats(),
    brief: () => getDailyBrief(),
    forex: () => getPhpUsd(),
    flagship: async () => (await import("@/lib/home/flagship")).getFlagship(),
  };
  if (only === "briefdebug") {
    const { explainBriefAttempt } = await import("@/lib/home/dailyBrief");
    return NextResponse.json(await explainBriefAttempt());
  }
  if (only === "prisma") {
    const { prisma } = await import("@/lib/db/prisma");
    const delegate = (prisma as unknown as Record<string, unknown>).newsPost;
    let count: unknown = null;
    try {
      count = await (delegate as { count: () => Promise<number> }).count();
    } catch (err) {
      count = err instanceof Error ? err.message.slice(0, 200) : String(err);
    }
    return NextResponse.json({ hasNewsPostModel: typeof delegate, count });
  }
  if (only === "ai") {
    const { executeAICascade } = await import("@/lib/ai/core/providerHarness");
    const t0 = Date.now();
    try {
      const r = await executeAICascade({ systemInstruction: 'Reply with JSON {"ok": true} only.', history: [], message: "ping", temperature: 0.2 }, "NEXUS");
      return NextResponse.json({ ms: Date.now() - t0, text: r.text.slice(0, 200), telemetry: r.telemetry });
    } catch (err) {
      return NextResponse.json({ ms: Date.now() - t0, threw: err instanceof Error ? err.message : String(err) });
    }
  }
  const out: Record<string, unknown> = {};
  for (const [name, load] of Object.entries(loaders)) {
    if (only && only !== name) continue;
    const t0 = Date.now();
    try {
      out[name] = { ms: Date.now() - t0, data: await load() };
      (out[name] as { ms: number }).ms = Date.now() - t0;
    } catch (err) {
      out[name] = { ms: Date.now() - t0, threw: err instanceof Error ? err.message : String(err) };
    }
  }
  return NextResponse.json(out);
}
