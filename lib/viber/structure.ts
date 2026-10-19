import type { DayBucket } from "./digest";
import { transcript } from "./digest";
import type { DailyDigest, ReportCategory, ReportItem } from "./types";

const CATEGORIES: ReportCategory[] = [
  "PROGRESS", "EQUIPMENT_ISSUE", "MANPOWER", "MATERIALS", "WEATHER", "SAFETY", "QUALITY", "BLOCKER", "OTHER",
];
const STATUSES = ["DONE", "ONGOING", "BLOCKED", "PLANNED", "UNKNOWN"] as const;

const PROMPT = `You read one day of site reports from a hydroelectric power plant construction project in Tumauini, Isabela, Philippines. The lines are Taglish (Tagalog, English, some Ilocano) from foremen and supervisors. Names are already replaced by aliases; never guess or restore a name.

Return ONLY JSON: {"items":[{"category":"PROGRESS|EQUIPMENT_ISSUE|MANPOWER|MATERIALS|WEATHER|SAFETY|QUALITY|BLOCKER|OTHER","area":"tunnel|weir|intake|penstock|powerhouse|switchyard|surge tank|tailrace|access road|camp|other, or null","summary":"one plain English sentence with the numbers kept exactly as written","equipment":"equipment or tag if named, else null","quantity":"quantity with unit if given, else null","status":"DONE|ONGOING|BLOCKED|PLANNED|UNKNOWN"}]}

Rules: use only what the lines say; do not invent numbers, dates or causes; one item per distinct fact; skip chatter; if a line is unclear, use category OTHER and quote it in the summary.`;

export type Generate = (prompt: string) => Promise<string>;

/** Structures one day. With no AI available (or when it fails) falls back to keyword rules, so the pipeline always works at zero cost. */
export async function structureDay(full: DayBucket, generate?: Generate): Promise<DailyDigest> {
  // Safety lines are split off first: they are structured by rules only and never leave this machine for an AI service.
  const bucket: DayBucket = { ...full, messages: full.messages.filter((m) => !m.safety) };
  const safetyBucket: DayBucket = { ...full, messages: full.messages.filter((m) => m.safety) };
  const sourceText = transcript(bucket);
  let items: ReportItem[] | null = null;
  if (generate) {
    try {
      items = parseItems(await generate(`${PROMPT}\n\nDATE: ${bucket.date}\nLINES:\n${sourceText}`));
    } catch (err) {
      console.warn(`[viber] AI structuring failed for ${bucket.date}, using keyword rules:`, err instanceof Error ? err.message : err);
    }
  }
  if (!items?.length) items = heuristicItems(bucket);
  const safetyItems = heuristicItems(safetyBucket).map((i) => ({ ...i, category: "SAFETY" as const }));
  return { date: full.date, items, sourceText, safetyItems, safetySourceText: transcript(safetyBucket) };
}

export function parseItems(raw: string): ReportItem[] {
  const json = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const data = JSON.parse(json) as { items?: unknown };
  if (!Array.isArray(data.items)) throw new Error("no items array");
  const out: ReportItem[] = [];
  for (const it of data.items) {
    if (!it || typeof it !== "object") continue;
    const r = it as Record<string, unknown>;
    const summary = typeof r.summary === "string" ? r.summary.trim() : "";
    if (!summary) continue;
    const category = CATEGORIES.includes(r.category as ReportCategory) ? (r.category as ReportCategory) : "OTHER";
    const status = (STATUSES as readonly string[]).includes(r.status as string) ? (r.status as ReportItem["status"]) : "UNKNOWN";
    const str = (v: unknown) => (typeof v === "string" && v.trim() && v.trim().toLowerCase() !== "null" ? v.trim() : null);
    out.push({ category, area: str(r.area), summary, equipment: str(r.equipment), quantity: str(r.quantity), status });
  }
  return out;
}

const RULES: Array<[ReportCategory, RegExp]> = [
  ["SAFETY", /injur|nasugatan|accident|aksidente|near[-\s]?miss|hospital|fell|nahulog|collaps|gumuho|fire|sunog|electrocut|nakuryente/i],
  ["EQUIPMENT_ISSUE", /nasira|sira|breakdown|broken|leak|tagas|not\s+working|di\s+gumagana|repair|ayos/i],
  ["BLOCKER", /delay|hold|standby|stand-by|blocked|waiting|walang\s+(?:supply|diesel|material)|di\s+makapag/i],
  ["WEATHER", /rain|ulan|baha|flood|typhoon|bagyo|signal\s*#?\d|water\s*level/i],
  ["MANPOWER", /manpower|pax|workers?|crew|\d+\s*(?:men|tao|katao)/i],
  ["MATERIALS", /deliver|cement|rebar|sand|gravel|diesel|fuel|steel|material/i],
  ["QUALITY", /slump|cylinder|test|inspection|ncr|qa\b|qc\b/i],
  ["PROGRESS", /pour|concret|excavat|backfill|weld|drill|blast|install|tapos|natapos|completed|finished|done|\d+\s*%|\d+\s*(?:m3|cu\.?m|m\b|meters?)/i],
];
const AREAS: Array<[string, RegExp]> = [
  ["tunnel", /tunnel|adit|headrace/i], ["weir", /weir|dam/i], ["intake", /intake/i], ["penstock", /penstock/i],
  ["powerhouse", /powerhouse|power\s*house|turbine|generator/i], ["switchyard", /switchyard/i],
  ["surge tank", /surge/i], ["tailrace", /tailrace/i], ["access road", /access\s*road|road|culvert|riprap|slope/i],
];

/** Keyword fallback: one item per work line, category by first matching rule. Coarse but never wrong about wording, since the summary is the line itself. */
export function heuristicItems(bucket: DayBucket): ReportItem[] {
  return bucket.messages.map((m) => {
    const category = RULES.find(([, re]) => re.test(m.text))?.[0] ?? "OTHER";
    const area = AREAS.find(([, re]) => re.test(m.text))?.[0] ?? null;
    const qty = /(\d+(?:\.\d+)?\s*(?:m3|cu\.?\s?m|m²|m2|sqm|mm|cm|m|kg|tons?|%|pax))/i.exec(m.text)?.[1] ?? null;
    const status: ReportItem["status"] = /tapos|natapos|completed|finished|done/i.test(m.text) ? "DONE"
      : /delay|hold|standby|blocked|nasira|sira/i.test(m.text) ? "BLOCKED"
      : /ongoing|nagpapatuloy|continu/i.test(m.text) ? "ONGOING" : "UNKNOWN";
    return { category, area, summary: m.text.replace(/\n/g, " "), equipment: null, quantity: qty, status };
  });
}

/** Text stored and embedded for one day: a digest header, structured bullets, and the redacted wording. */
export function digestToText(d: DailyDigest): string {
  return renderDigest(`Site report digest for ${d.date} (Tumauini hydroelectric project)`, d.items, d.sourceText);
}

/** The restricted companion text for a day's injury and safety-event lines, or null when there were none. */
export function safetyDigestToText(d: DailyDigest): string | null {
  if (!d.safetyItems.length) return null;
  return renderDigest(`Safety events reported on ${d.date} (Tumauini hydroelectric project, restricted)`, d.safetyItems, d.safetySourceText);
}

function renderDigest(title: string, items: ReportItem[], wording: string): string {
  const lines = [title];
  for (const i of items) {
    const bits = [i.category, i.area, i.equipment, i.quantity, i.status !== "UNKNOWN" ? i.status : null].filter(Boolean);
    lines.push(`- [${bits.join(" | ")}] ${i.summary}`);
  }
  lines.push("", "Original wording (names and numbers redacted):", wording);
  return lines.join("\n");
}
