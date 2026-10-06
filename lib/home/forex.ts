import { unstable_cache } from "next/cache";
import { withLastGood } from "./lastGood";
import { CACHE_TAGS, SERVER_TTL, UPSTREAM_TIMEOUT_MS, USER_AGENT } from "./refreshPolicy";
import type { ForexRate } from "./types";

/** Philippine pesos per US dollar (open.er-api.com, free, no key). Cached six hours. */
async function loadPhpUsd(): Promise<ForexRate> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    cache: "no-store",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`ER-API ${res.status}`);
  const json = (await res.json()) as { result?: string; rates?: Record<string, number>; time_last_update_unix?: number };
  const rate = json.rates?.PHP;
  if (json.result !== "success" || typeof rate !== "number" || !(rate > 0)) throw new Error("ER-API gave no PHP rate");
  return {
    phpPerUsd: Math.round(rate * 100) / 100,
    asOf: new Date((json.time_last_update_unix ?? Date.now() / 1000) * 1000).toISOString(),
  };
}

const cached = unstable_cache(loadPhpUsd, ["home-forex-php-usd"], { revalidate: SERVER_TTL.forex, tags: [CACHE_TAGS.forex] });

/** Null when the rate cannot be had: the footer then leaves the figure out */
export async function getPhpUsd(): Promise<ForexRate | null> {
  return (await withLastGood("forex", cached)).data;
}
