import { unstable_cache } from "next/cache";
import { z } from "zod";
import { executeAICascade } from "@/lib/ai/core/providerHarness";
import { prisma } from "@/lib/db/prisma";
import { FLAGSHIP } from "./companyFacts";
import { getTrending } from "./newsAggregator";
import { BRIEF_SLOTS, CACHE_TAGS, SERVER_TTL } from "./refreshPolicy";
import type { BriefSlot, DailyBrief } from "./types";
import { getWeatherGlance } from "./weatherGlance";

/**
 * The AI Daily Brief: three editions a day (06:00, 12:00, 18:00 in Manila), each written once
 * and cached under its slot key ("2026-10-05:MORNING"). The model is given a small context of
 * facts and may only restate them; its answer must be JSON of a fixed shape. If the answer is
 * unusable twice, or no AI engine answers, a plain summary is assembled from the same facts
 * (fallback: true, shown as "Auto summary").
 */

const manilaParts = (now: Date) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false })
      .formatToParts(now)
      .map((x) => [x.type, x.value])
  );
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24 };
};

/** The edition in force now. Before 06:00 it is still the previous day's evening edition. */
export function currentBriefSlot(now: Date = new Date()): { slot: BriefSlot; key: string } {
  const { date, hour } = manilaParts(now);
  if (hour < BRIEF_SLOTS[0].fromHour) {
    const yesterday = manilaParts(new Date(now.getTime() - 24 * 3600_000)).date;
    return { slot: "EVENING", key: `${yesterday}:EVENING` };
  }
  const slot = [...BRIEF_SLOTS].reverse().find((s) => hour >= s.fromHour)!.slot;
  return { slot, key: `${date}:${slot}` };
}

interface BriefContext {
  slot: BriefSlot;
  weather: string | null;
  verdict: "GO" | "CAUTION" | "HOLD" | null;
  alert: string | null;
  progress: { percent: number; asOf: string } | null;
  codDays: number | null;
  codDate: string | null;
  headlines: string[];
}

async function buildContext(slot: BriefSlot): Promise<BriefContext> {
  const [glance, project, ph, energy] = await Promise.all([
    getWeatherGlance("tumauini").catch(() => null),
    prisma.project.findUnique({ where: { slug: FLAGSHIP.slug }, select: { id: true, percentComplete: true, targetCodDate: true } }).catch(() => null),
    getTrending("PH").catch(() => null),
    getTrending("ENERGY").catch(() => null),
  ]);
  const snapshot = project
    ? await prisma.progressSnapshot.findFirst({ where: { projectId: project.id }, orderBy: { snapshotDate: "desc" }, select: { percentComplete: true, snapshotDate: true } }).catch(() => null)
    : null;
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", day: "numeric", month: "long", year: "numeric" }).format(d);
  return {
    slot,
    weather: glance
      ? `${glance.now.label}, ${glance.now.tempC}°C (feels like ${glance.now.feelsLikeC}°C), high ${glance.today.maxC}°C, low ${glance.today.minC}°C, rain chance ${glance.today.rainChance}%, wind ${glance.now.windKph} km/h`
      : null,
    verdict: glance?.operational?.verdict ?? null,
    alert: glance?.alert?.message ?? null,
    // the latest logged reading; the project's own percentComplete column only when there is no reading
    progress: snapshot
      ? { percent: snapshot.percentComplete, asOf: fmt(snapshot.snapshotDate) }
      : typeof project?.percentComplete === "number"
        ? { percent: project.percentComplete, asOf: "the project record" }
        : null,
    codDays: project?.targetCodDate ? Math.ceil((project.targetCodDate.getTime() - Date.now()) / 86_400_000) : null,
    codDate: project?.targetCodDate ? fmt(project.targetCodDate) : null,
    // energy and infrastructure first (the company's own field), then national news
    headlines: [...(energy?.items ?? []).slice(0, 6), ...(ph?.items ?? []).slice(0, 4)].map((h) => `${h.title} (${h.source})`),
  };
}

// What the model must return. Shape and substance are checked strictly (a headline, at least
// three real bullets, a known mood); length is then brought within the limits by trimming at a
// word boundary rather than by throwing a good answer away: a fourth bullet is dropped.
const HEADLINE_MAX = 90;
const BULLET_MAX = 160;
function clip(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

const briefSchema = z
  .object({
    headline: z.string().trim().min(8).max(240),
    bullets: z.array(z.string().trim().min(8).max(400)).min(3).max(6),
    mood: z.enum(["CALM", "WATCH", "ALERT"]),
  })
  .transform((b) => ({ headline: clip(b.headline, HEADLINE_MAX), bullets: b.bullets.slice(0, 3).map((x) => clip(x, BULLET_MAX)), mood: b.mood }));

const SYSTEM = `You write the daily brief on the front page of Project Nexus, the internal portal of Sta. Clara International Corporation (SCIC), a Philippine engineering and construction company.
Rules, all mandatory:
- Use ONLY the facts in the CONTEXT block. Never add a number, name, date, place, forecast or event that is not written there. If a fact is missing, do not mention the topic.
- Do not give advice that depends on facts you were not given. Do not speculate.
- Plain, calm, professional English. No emojis, no exclamation marks, no marketing language.
- Output the word BRIEF on the first line, then ONE JSON object on the following lines, and nothing else (no code fence, no commentary): {"headline": string (at most 90 characters), "bullets": [string, string, string] (each at most 160 characters), "mood": "CALM" | "WATCH" | "ALERT"}
- bullets[0] is about site weather and the work verdict (and the weather alert, if there is one); bullets[1] is about Tumauini HEPP progress or its commercial operation date; bullets[2] is about one or two of the news headlines, naming the publisher. For bullets[2] choose headlines about energy, infrastructure, construction, the economy or government policy; never a promotion, a product launch, a celebrity or an entertainment item. If a bullet's facts are missing, use another fact from the context instead.
- The headline is a short plain statement of the day's main point for a construction company (for example the site's work status), not a list of topics, and it does not begin with "Morning", "Midday", "Evening", "Update" or "Brief".
- mood: ALERT when a wind signal is up or the verdict is HOLD; WATCH when the verdict is CAUTION; otherwise CALM.`;

function contextText(c: BriefContext): string {
  const lines = [
    `Edition: ${c.slot.toLowerCase()}`,
    c.weather ? `Tumauini site weather now: ${c.weather}` : null,
    c.verdict ? `Site work verdict today: ${c.verdict}` : null,
    c.alert ? `Weather alert: ${c.alert}` : "Weather alert: none over the site",
    c.progress ? `Tumauini HEPP overall progress: ${c.progress.percent}% (as of ${c.progress.asOf})` : null,
    c.codDate ? `Tumauini HEPP target commercial operation date: ${c.codDate}${c.codDays !== null ? ` (${c.codDays >= 0 ? `${c.codDays} days from today` : `${Math.abs(c.codDays)} days ago`})` : ""}` : null,
    c.headlines.length ? `News headlines:\n${c.headlines.map((h) => `- ${h}`).join("\n")}` : null,
  ];
  return `CONTEXT\n${lines.filter(Boolean).join("\n")}`;
}

/**
 * The first {...} block of a model answer, with any code fence or lead-in word around it ignored.
 * (The answer is asked to open with the word BRIEF because the shared AI harness treats a reply
 * that is nothing but JSON as a leaked tool result and discards it: see isUsableAnswer.)
 */
function extractJson(text: string): unknown {
  const body = text.replace(/```(?:json)?/gi, "");
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in the answer");
  return JSON.parse(body.slice(start, end + 1));
}

/** The automatic summary: the same facts, set in fixed sentences */
export function templateBrief(c: BriefContext): Omit<DailyBrief, "generatedAt"> {
  // three lines in a fixed order (site, flagship, news), the order the card labels them in
  const bullets: string[] = [];
  if (c.alert) bullets.push(clip(`${c.alert}${c.verdict ? ` Work verdict: ${c.verdict}.` : ""}`, 160));
  else if (c.weather) bullets.push(clip(`Tumauini site: ${c.weather}.${c.verdict ? ` Work verdict: ${c.verdict}.` : ""}`, 160));
  if (c.progress) {
    bullets.push(clip(`Tumauini HEPP stands at ${c.progress.percent}% overall progress${c.codDate ? `; target commercial operation ${c.codDate}${c.codDays !== null && c.codDays >= 0 ? `, ${c.codDays} days away` : ""}` : ""}.`, 160));
  }
  for (const h of c.headlines) {
    if (bullets.length >= 3) break;
    bullets.push(clip(`In the news: ${h}`, 160));
  }
  while (bullets.length < 3) bullets.push("No further updates are on record for this edition.");
  const mood = c.alert || c.verdict === "HOLD" ? "ALERT" : c.verdict === "CAUTION" ? "WATCH" : "CALM";
  const headline = c.alert
    ? "Weather alert over the Tumauini site"
    : c.verdict === "HOLD"
      ? "Site work on hold for weather at Tumauini"
      : c.verdict === "CAUTION"
        ? "Work proceeds with caution at Tumauini"
        : c.weather
          ? "Conditions are favourable at Tumauini"
          : "Today at Sta. Clara International";
  return { slot: c.slot, headline, bullets: bullets.slice(0, 3), mood, model: "template", fallback: true };
}

/** Longest the page waits for the AI before the automatic summary is used instead */
const AI_BUDGET_MS = 30_000;

async function askModel(c: BriefContext): Promise<Omit<DailyBrief, "generatedAt">> {
  let message = contextText(c);
  let lastError: unknown;
  const deadline = Date.now() + AI_BUDGET_MS;
  for (let attempt = 0; attempt < 2; attempt++) {
    const left = deadline - Date.now();
    if (left < 2000) break;
    const result = await Promise.race([
      executeAICascade({ systemInstruction: SYSTEM, history: [], message, temperature: 0.2 }, "NEXUS"),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("the AI did not answer in time")), left)),
    ]);
    try {
      const parsed = briefSchema.parse(extractJson(result.text));
      const t = result.telemetry;
      return { slot: c.slot, ...parsed, model: [t?.provider, t?.model].filter(Boolean).join(" · ") || "AI", fallback: false };
    } catch (err) {
      lastError = err;
      message = `${contextText(c)}\n\nYour previous answer was not valid. Return the word BRIEF, then valid JSON only, exactly in the shape described, within the length limits.`;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("the model's answer was not valid");
}

/** Development aid: one uncached attempt, with the raw answer and what the checks made of it */
export async function explainBriefAttempt(): Promise<Record<string, unknown>> {
  const { slot } = currentBriefSlot();
  const t0 = Date.now();
  const context = await buildContext(slot);
  const contextMs = Date.now() - t0;
  try {
    const result = await executeAICascade({ systemInstruction: SYSTEM, history: [], message: contextText(context), temperature: 0.2 }, "NEXUS");
    const check = briefSchema.safeParse((() => { try { return extractJson(result.text); } catch (e) { return { parseError: String(e) }; } })());
    return { contextMs, aiMs: Date.now() - t0 - contextMs, telemetry: result.telemetry, raw: result.text, valid: check.success, issues: check.success ? undefined : check.error.issues, parsed: check.success ? check.data : undefined };
  } catch (err) {
    return { contextMs, aiMs: Date.now() - t0 - contextMs, threw: err instanceof Error ? err.message : String(err) };
  }
}

/** Written at most once per slot (cached); a failed attempt is not cached */
const cachedAiBrief = unstable_cache(
  async (slotKey: string, slot: BriefSlot): Promise<DailyBrief> => ({ ...(await askModel(await buildContext(slot))), generatedAt: new Date().toISOString() }),
  ["home-daily-brief", "v3"],
  { revalidate: SERVER_TTL.brief, tags: [CACHE_TAGS.brief] }
);

// After a failure the AI is left alone for ten minutes (per slot), so an outage does not put a
// slow model call in front of every page view; the automatic summary is served meanwhile.
const failedAt = new Map<string, number>();
const RETRY_AFTER_MS = 10 * 60_000;

export async function getDailyBrief(now: Date = new Date()): Promise<DailyBrief> {
  const { slot, key } = currentBriefSlot(now);
  const lastFail = failedAt.get(key) ?? 0;
  if (Date.now() - lastFail > RETRY_AFTER_MS) {
    try {
      return await cachedAiBrief(key, slot);
    } catch (err) {
      failedAt.set(key, Date.now());
      console.warn("[home] daily brief: AI unavailable, serving the automatic summary:", err instanceof Error ? err.message : err);
    }
  }
  return { ...templateBrief(await buildContext(slot)), generatedAt: new Date().toISOString() };
}
