/**
 * Site stories: a short, spoken walk through one project, told by the Atlas Navigator.
 *
 * A story is assembled from the project's own record and nothing else: its description, scope of
 * works, metrics, milestones and client. No sentence states a fact that is not in that record, so
 * a story can never drift from what the project panel shows. Where the record is thin the story
 * is simply shorter (a beat with nothing to say is dropped).
 *
 * It is returned in the guided-tour shape so the existing tour player runs it: narration card,
 * word-by-word captions, cached voice, Prev / Next, and Esc to leave at any moment.
 */
import { INITIAL_ATLAS_PROJECTS } from "@/lib/data/scicAtlasInitialProjects";
import { SCIC_PROJECTS, type SCICProject, type ProjectSector } from "@/lib/data/scicProjectsData";
import { findProjectInDataset } from "@/components/atlas/AtlasSearchUtils";
import type { AtlasTourData, AtlasTourStepData } from "./portfolioTours";

export type StoryTone = "professional" | "friendly" | "playful";
export const SITE_STORY_PREFIX = "site-story:";

const ALL_PROJECTS: SCICProject[] = Array.from(
  new Map([...INITIAL_ATLAS_PROJECTS, ...SCIC_PROJECTS].map((p) => [p.id, p])).values()
);

const GENERIC_WORDS = new Set([
  "project", "projects", "power", "plant", "hydro", "hydropower", "hydroelectric", "hepp", "dam", "wind", "farm",
  "water", "treatment", "tunnel", "tunnels", "bridge", "bridges", "road", "roads", "highway", "expressway",
  "ongoing", "completed", "upcoming", "luzon", "visayas", "mindanao", "region", "scic", "site", "the", "and",
]);

/** The project a "tell me the story" request is about: one named in the request, else the selected one. */
export function findStoryProject(query: string | null | undefined, selectedId?: string | null): SCICProject | undefined {
  const cleaned = (query || "")
    .replace(/\b(tell|me|us|the|a|site|story|stories|of|about|behind|for|please|what'?s|what is|give|share|narrate|project)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  let named = cleaned.length >= 4 ? findProjectInDataset(ALL_PROJECTS, cleaned) : undefined;
  if (named) {
    // Only when the words point at ONE project. "Tunnels" or "water treatment" describe several,
    // and a request like that is for a tour of them, not for one project's story.
    const tokens = cleaned.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !GENERIC_WORDS.has(t));
    // (the built-in and database lists can both hold the same project: count names, not rows)
    const names = new Set(
      tokens.length
        ? ALL_PROJECTS.filter((p) => {
            const hay = `${p.name} ${p.shortName}`.toLowerCase();
            return tokens.every((t) => hay.includes(t));
          }).map((p) => p.name.toLowerCase().replace(/\s*\([^)]*\)/g, "").trim())
        : []
    );
    if (names.size !== 1 && named.id !== cleaned && named.code?.toLowerCase() !== cleaned.toLowerCase()) named = undefined;
  }
  return named ?? (selectedId ? findProjectInDataset(ALL_PROJECTS, selectedId) : undefined);
}

// ── text helpers ─────────────────────────────────────────────────────────────
const ABBREVIATIONS = ["Sta", "Sto", "Inc", "Corp", "Co", "Ltd", "No", "St", "Brgy", "Mt", "Engr", "Dr", "approx", "vs"];

function sentences(text: string): string[] {
  let t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return [];
  // keep "Sta. Clara", "Inc." etc. in one piece while splitting
  for (const a of ABBREVIATIONS) t = t.replace(new RegExp(`\\b${a}\\.`, "g"), `${a}\u0001`);
  return t
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/)
    .map((s) => s.replace(/\u0001/g, ".").trim())
    .filter(Boolean);
}

const endStop = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

/** Lower-case the first letter of a scope item so it can sit inside a sentence (acronyms / figures are left alone). */
function inline(item: string): string {
  const t = item.trim().replace(/[.;]+$/, "");
  const first = t.split(/\s+/)[0] || "";
  if (/\d/.test(first) || first === first.toUpperCase()) return t;
  return t.charAt(0).toLowerCase() + t.slice(1);
}

/** "₱2.85 Billion" → "2.85 billion pesos" (reads correctly aloud and on screen) */
function money(v: string): string | null {
  const t = v.trim();
  if (!/(₱|PHP)\s*\d/i.test(t)) return null; // not an amount ("Tender / Preparation" etc.): leave it out
  const note = (t.match(/\(([^)]+)\)/) || [])[0] || "";
  const amount = t
    .replace(note, "")
    .replace(/₱|PHP/gi, "")
    .trim()
    .replace(/\b(Billion|Million|Trillion)\b/g, (w) => w.toLowerCase());
  return `${amount} pesos${note ? ` ${note}` : ""}`;
}

/** True when a metric starts with an actual figure (records sometimes hold free-form text instead). */
const startsWithNumber = (v: string | undefined): boolean => !!v && /^[~≈]?\s*\d/.test(v.trim());
/** One plain figure with the expected unit ("11.3 MW", "62.4 GWh / year"), not a multi-part summary. */
const plainFigure = (v: string | undefined, unit: RegExp): boolean => !!v && startsWithNumber(v) && unit.test(v) && !/[•|;]/.test(v);

const lowerUnits = (v: string) => v.trim().replace(/\bSafe Hours\b/i, "safe hours");

function trimTo(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const parts = sentences(text);
  let out = "";
  for (const s of parts) {
    if ((out + " " + s).trim().length > maxChars) break;
    out = (out + " " + s).trim();
  }
  return out || parts[0] || text;
}

// ── sector flavour (tone only: none of these lines states a fact about the project) ──
const CLOSERS: Record<ProjectSector, { friendly: string; playful: string }> = {
  HYDRO_RENEWABLE: {
    friendly: "Water in, power out, and nothing burned to get there.",
    playful: "The river does the hard work. We just built it a very good office.",
  },
  WIND_POWER: {
    friendly: "Fuel that arrives by itself, most days.",
    playful: "Free fuel, delivered daily, weather permitting.",
  },
  INFRASTRUCTURE_ROADS: {
    friendly: "Fewer hours on the road for everyone who uses it.",
    playful: "A shortcut that took years to build, so you can save twenty minutes. Worth it.",
  },
  RAILWAYS_TRANSIT: {
    friendly: "Built so more people can get where they are going.",
    playful: "The one construction site people will be glad to be stuck in traffic near, eventually.",
  },
  WATER_DAMS: {
    friendly: "Water where it is needed, when it is needed.",
    playful: "It is the kind of project nobody notices until the water stops. That is the compliment.",
  },
  POWER_GRID: {
    friendly: "Power is only useful once it reaches someone. This is the reaching part.",
    playful: "Not glamorous, but try running a city without it.",
  },
  MINING_TUNNELING: {
    friendly: "Most of this work is where nobody will ever see it.",
    playful: "The light at the end of this tunnel is an actual project milestone.",
  },
  BUILDINGS_INDUSTRIAL: {
    friendly: "Built to be worked in, every day, for decades.",
    playful: "Four walls and a roof, only with rather more engineering than that sounds.",
  },
};

function statusPhrase(p: SCICProject): { builtFor: string } {
  const done = p.status === "COMPLETED";
  return { builtFor: done ? "It was built for" : p.status === "ONGOING" ? "It is being built for" : "It is planned for" };
}

/** True when the record has enough in it to tell a story worth hearing. */
export function hasSiteStory(p: SCICProject | null | undefined): boolean {
  if (!p || !p.coordinates) return false;
  const desc = sentences(p.description || "");
  const material = (p.engineeringScope?.length ?? 0) + (p.keyMilestones?.length ?? 0) + Object.keys(p.metrics || {}).length;
  return desc.length >= 1 && (p.description || "").length >= 60 && material >= 3;
}

export function buildSiteStory(p: SCICProject, tone: StoryTone = "friendly"): AtlasTourData {
  // Some records carry a display name already cut short with an ellipsis: never read that aloud
  const fullName = p.name.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const label = p.shortName && !/(\.\.\.|…)\s*$/.test(p.shortName) ? p.shortName : fullName;
  const place = [p.municipality, p.province].filter(Boolean).join(", ");
  const desc = sentences(p.description || "");
  const scope = (p.engineeringScope || []).filter(Boolean);
  const m = p.metrics || {};
  const center: [number, number] = [p.coordinates.lng, p.coordinates.lat];

  type Beat = { title: string; narration: string; camera: AtlasTourStepData["camera"] };
  const beats: Beat[] = [];

  // 1. The setting
  {
    const opener =
      tone === "professional"
        ? `${p.name}, in ${place}.`
        : tone === "playful"
        ? `Right, ${label}. Come and stand here with me, in ${place}.`
        : `This is ${label}, in ${place}. Let me tell you about it.`;
    beats.push({
      title: "The setting",
      narration: `${opener} ${desc[0] ? endStop(desc[0]) : ""}`.trim(),
      camera: { center, zoom: 11.6, pitch: 30, bearing: 0 },
    });
  }

  // 2. What was built (the rest of the description, in the record's own words)
  if (desc.length > 1) {
    beats.push({
      title: p.status === "COMPLETED" ? "What was built" : p.status === "ONGOING" ? "What is being built" : "What is planned",
      narration: trimTo(desc.slice(1).map(endStop).join(" "), 340),
      camera: { center, zoom: 14.2, pitch: 50, bearing: 20 },
    });
  }

  // 3. The hard part: the scope items with real figures in them say the most
  if (scope.length >= 2) {
    const ranked = [...scope].sort((a, b) => Number(/\d/.test(b)) - Number(/\d/.test(a)) || b.length - a.length);
    const picks = ranked.slice(0, 2).sort((a, b) => scope.indexOf(a) - scope.indexOf(b));
    const lead =
      tone === "professional"
        ? "Two parts of the scope define this project:"
        : tone === "playful"
        ? "Ask anyone on the crew what kept them busy and you will get the same two answers:"
        : "If I had to point out the hard part to another engineer, it would be two things:";
    beats.push({
      title: "The hard part",
      narration: `${lead} the ${inline(picks[0])}, and the ${inline(picks[1])}.`,
      camera: { center, zoom: 15.2, pitch: 58, bearing: -35 },
    });
  }

  // 4. By the numbers
  {
    const parts: string[] = [];
    if (plainFigure(m.capacity, /(MW|kW|MVA|MLD|kV|GWh)\b/i)) {
      parts.push(
        plainFigure(m.generationOutput, /(GWh|MWh)\b/i)
          ? `It is rated at ${m.capacity}, which works out to about ${m.generationOutput!.replace(/\s*\/\s*/g, " per ")}.`
          : `It is rated at ${m.capacity}.`
      );
    } else if (startsWithNumber(m.capacity)) {
      // a multi-part summary: read it as the record states it
      parts.push(`On record: ${m.capacity!.replace(/\s*[•|;]\s*/g, ", ")}.`);
    }
    if (startsWithNumber(m.tunnelLength)) {
      parts.push(/^[~≈]?\s*[\d.,]+\s*(km|m)$/i.test(m.tunnelLength!.trim()) ? `Underground: ${m.tunnelLength} of tunnel.` : `Underground: ${m.tunnelLength}.`);
    }
    if (startsWithNumber(m.roadLength)) {
      parts.push(/^[~≈]?\s*[\d.,]+\s*(km|m)$/i.test(m.roadLength!.trim()) ? `On the surface: ${m.roadLength} of road.` : `On the surface: ${m.roadLength}.`);
    }
    const value = m.contractValue ? money(m.contractValue) : null;
    if (value) parts.push(`The contract is worth ${value}.`);
    const safeHours = startsWithNumber(m.safeManHours) ? lowerUnits(m.safeManHours!) : null;
    if (m.workforcePeak && safeHours) {
      parts.push(`At its busiest, ${m.workforcePeak.toLocaleString("en-US")} people worked here, and the site has logged ${safeHours}.`);
    } else if (m.workforcePeak) {
      parts.push(`At its busiest, ${m.workforcePeak.toLocaleString("en-US")} people worked here.`);
    } else if (safeHours) {
      parts.push(`The site has logged ${safeHours}.`);
    }
    if (parts.length) {
      beats.push({
        title: "By the numbers",
        narration: `${tone === "professional" ? "The figures on record." : "Now the numbers."} ${parts.slice(0, 4).join(" ")}`,
        camera: { center, zoom: 14.6, pitch: 45, bearing: 60 },
      });
    }
  }

  // 5. Where it stands
  {
    const ms = p.keyMilestones || [];
    const achieved = [...ms].reverse().find((x) => x.status === "ACHIEVED");
    const current = ms.find((x) => x.status === "IN_PROGRESS");
    const next = ms.find((x) => x.status === "SCHEDULED");
    const parts: string[] = [];
    if (p.status === "COMPLETED") {
      parts.push(`It was completed${p.completionYear ? ` in ${p.completionYear}` : ""}.`);
      if (achieved) parts.push(`The last milestone on record is ${achieved.title}, ${achieved.date}.`);
    } else if (p.status === "ONGOING") {
      if (achieved) parts.push(`The latest milestone ticked off is ${achieved.title}, ${achieved.date}.`);
      if (current) parts.push(`Right now the team is working toward ${current.title}${current.date ? `, targeted for ${current.date}` : ""}.`);
      else if (next) parts.push(`Next up is ${next.title}${next.date ? `, scheduled for ${next.date}` : ""}.`);
      else if (p.targetCodDate) parts.push(`The target for commercial operation is ${p.targetCodDate}.`);
    } else {
      parts.push("This one is still ahead of us.");
      const upcoming = current || next;
      if (upcoming) parts.push(`The first milestone on the schedule is ${upcoming.title}${upcoming.date ? `, ${upcoming.date}` : ""}.`);
    }
    if (p.client) parts.push(`${statusPhrase(p).builtFor} ${p.client.replace(/[.]+$/, "")}.`);
    if (tone !== "professional") {
      parts.push(CLOSERS[p.sector]?.[tone] ?? "");
      parts.push(tone === "playful" ? "And that is the story. Questions are free." : "And that is the story so far.");
    }
    const narration = parts.filter(Boolean).join(" ");
    if (narration) {
      beats.push({ title: "Where it stands", narration, camera: { center, zoom: 12.6, pitch: 35, bearing: 0 } });
    }
  }

  const keyMetrics: Record<string, string> = {};
  if (m.capacity) keyMetrics["Capacity"] = m.capacity;
  if (m.tunnelLength) keyMetrics["Tunnel"] = m.tunnelLength;
  if (m.roadLength) keyMetrics["Road"] = m.roadLength;
  keyMetrics["Location"] = place;
  keyMetrics["Status"] = p.status === "COMPLETED" ? `Completed${p.completionYear ? ` ${p.completionYear}` : ""}` : p.status === "ONGOING" ? "Under construction" : "Upcoming";

  const total = beats.length;
  const steps: AtlasTourStepData[] = beats.map((b, i) => ({
    step: i + 1,
    totalSteps: total,
    id: `story-${p.id}-${i + 1}`,
    title: `${label}: ${b.title}`,
    subtitle: i === 0 ? "Site story" : b.title,
    narration: b.narration,
    camera: b.camera,
    highlightProjectIds: [p.id],
    selectedProjectId: p.id,
    keyMetrics,
  }));

  return { tourId: `${SITE_STORY_PREFIX}${p.id}`, tourTitle: `${label} Site Story`, totalSteps: total, steps };
}
