/**
 * Exact, instant answers for the questions asked most: "how many projects are there in Mindanao",
 * "how many ongoing hydropower projects in Region II", and the follow-up "and how many of those
 * are ongoing?".
 *
 * These are answered straight from the project records, without the language model: the count is
 * exact by construction, it takes a fraction of a second, and it does not depend on the AI
 * providers' free-tier limits (which made such questions slow, or time out, when they were busy).
 * A question with anything this parser does not understand (capacity, value, dates, clients,
 * comparisons...) returns null and goes to the model as usual.
 */
import { ProjectAtlasService } from "@/lib/services/projectAtlasService";

type Turn = { role: string; content: string };

interface Scope {
  island?: "LUZON" | "VISAYAS" | "MINDANAO";
  regionKeys?: string[];
  regionLabel?: string;
  province?: string;
  status?: "ONGOING" | "COMPLETED" | "UPCOMING";
  category?: string;
}

const CATEGORY_WORDS: Array<[RegExp, string, string, string]> = [
  // pattern, kind id, English label, Tagalog-friendly label. Later matches win.
  // The records file wind farms under HYDROPOWER ("Hydropower & Renewable Energy"), so "hydro",
  // "wind" and "solar" are told apart by the project's name (see matchesKind).
  [/\brenewables?\b|\bclean energy\b/i, "HYDROPOWER", "hydro and renewable energy", "renewable energy"],
  [/\bhydro(power|electric)?\b|\bhepp?\b|\bdams?\b/i, "HYDRO", "hydropower", "hydropower"],
  [/\bwind\b/i, "WIND", "wind power", "wind power"],
  [/\bsolar\b/i, "SOLAR", "solar", "solar"],
  [/\bwater\b|\bwtp\b|\bbulk water\b|\bflood\b|\birrigation\b/i, "WATER_RESOURCES", "water", "water"],
  [/\broads?\b|\bhighways?\b|\bexpressways?\b/i, "ROADS_HIGHWAYS", "road and highway", "road at highway"],
  [/\bbridges?\b/i, "BRIDGES", "bridge", "bridge"],
  [/\brail\b|\btrain\b|\btransit\b|\blrt\b|\bmrt\b/i, "RAIL_TRANSIT", "rail and transit", "rail at transit"],
  [/\bbuildings?\b/i, "BUILDINGS", "building", "building"],
  [/\bindustrial\b/i, "INDUSTRIAL", "industrial", "industrial"],
  [/\bgrid\b|\btransmission\b|\bsubstation\b|\bpower plants?\b/i, "ENERGY_GRID", "energy and grid", "energy at grid"],
  [/\btunnel(s|ling|ing)?\b|\bmining\b/i, "MINING_TUNNELING", "tunnelling and mining", "tunnelling at mining"],
];

/** Kinds that are not a category of their own in the records (picked out by project name) */
const NAMED_KINDS = new Set(["HYDRO", "WIND", "SOLAR"]);
function matchesKind(p: { category: string; name: string }, kind: string): boolean {
  if (kind === "HYDRO") return p.category === "HYDROPOWER" && !/\bwind\b|\bsolar\b/i.test(p.name);
  if (kind === "WIND") return /\bwind\b/i.test(p.name);
  if (kind === "SOLAR") return /\bsolar\b/i.test(p.name);
  return p.category === kind;
}

const STATUS_WORDS: Array<[RegExp, Scope["status"], string, string]> = [
  [/\bongoing\b|\bon-going\b|\bactive\b|\bunder construction\b|\bin progress\b|\bcurrently being built\b/i, "ONGOING", "ongoing", "ongoing"],
  [/\bcompleted?\b|\bfinished\b|\bdone\b|\bturned over\b/i, "COMPLETED", "completed", "tapos na"],
  [/\bupcoming\b|\bplanned\b|\bfuture\b|\bnot yet started\b/i, "UPCOMING", "upcoming", "paparating"],
];

const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12, xiii: 13 };
const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13 };
const REGION_ALIASES: Record<string, string> = {
  ncr: "ncr", "metro manila": "ncr", "national capital region": "ncr",
  car: "car", cordillera: "car",
  mimaropa: "4b", calabarzon: "4a", soccsksargen: "12", caraga: "13", barmm: "barmm", bangsamoro: "barmm",
  ilocos: "1", "cagayan valley": "2", "central luzon": "3", bicol: "5", "western visayas": "6", "central visayas": "7",
  "eastern visayas": "8", "zamboanga peninsula": "9", "northern mindanao": "10", davao: "11",
};

/** Region keys found in a text: "Region IV-A" -> "4a", "Region II" -> "2", "CAR" -> "car" ... */
function regionKeys(text: string): string[] {
  const t = ` ${text.toLowerCase()} `;
  const keys = new Set<string>();
  for (const m of t.matchAll(/\bregion\s+(xiii|xii|xi|ix|x|viii|vii|vi|iv|v|iii|ii|i|\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen)(?:\s*-?\s*([ab])\b)?/g)) {
    const raw = m[1];
    const n = ROMAN[raw] ?? NUMBER_WORDS[raw] ?? Number(raw);
    if (n) keys.add(`${n}${m[2] ?? ""}`);
  }
  for (const [alias, key] of Object.entries(REGION_ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`).test(t)) keys.add(key);
  }
  // "Region IV" asked for covers IV-A and IV-B
  return [...keys];
}

const ISLANDS: Array<[RegExp, Scope["island"], string]> = [
  [/\bluzon\b/i, "LUZON", "Luzon"],
  [/\bvisayas\b/i, "VISAYAS", "the Visayas"],
  [/\bmindanao\b/i, "MINDANAO", "Mindanao"],
];

/** Is this a plain counting question we can answer exactly? */
function isCountQuestion(q: string): boolean {
  return /\bhow many\b|\bnumber of\b|\bcount of\b|\bhow much projects\b|\bilan(g)?\b/i.test(q);
}

/** Anything that asks for more than a count goes to the model */
function hasUnsupportedQualifier(q: string): boolean {
  return /\b(mw|megawatt|capacity|value|cost|budget|worth|peso|billion|million|client|owner|year|since|before|after|between|more than|less than|over|under|above|below|per|each|average|largest|biggest|smallest|compare|versus|vs|kilomet|km|percent|%|employees|workers|people|staff|man-hours|safety)\b/i.test(q);
}

function parseScope(text: string, provinces: string[]): Scope {
  const scope: Scope = {};
  for (const [re, id] of ISLANDS) if (re.test(text)) scope.island = id;
  const keys = regionKeys(text);
  if (keys.length) scope.regionKeys = keys;
  // a region's own name is not a province: "Cagayan Valley" is Region II, not Cagayan province
  // ("Davao Region", "Ilocos Region", "Central Luzon" likewise)
  let lower = text.toLowerCase();
  for (const alias of Object.keys(REGION_ALIASES)) if (alias.includes(" ")) lower = lower.replace(new RegExp(`\\b${alias}\\b`, "g"), " ");
  lower = lower.replace(/\b(davao|ilocos|bicol|caraga) region\b/g, " ");
  const province = provinces.find((p) => p.length >= 4 && new RegExp(`\\b${p.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lower));
  if (province) scope.province = province;
  for (const [re, id] of STATUS_WORDS) if (re.test(text)) scope.status = id;
  for (const [re, id] of CATEGORY_WORDS) if (re.test(text)) scope.category = id;
  return scope;
}

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);
const statusLabel = (s?: Scope["status"]) => STATUS_WORDS.find((x) => x[1] === s)?.[2] ?? "";
const statusLabelTl = (s?: Scope["status"]) => STATUS_WORDS.find((x) => x[1] === s)?.[3] ?? "";
const categoryLabel = (c?: string) => CATEGORY_WORDS.find((x) => x[1] === c)?.[2] ?? "";
const categoryLabelTl = (c?: string) => CATEGORY_WORDS.find((x) => x[1] === c)?.[3] ?? "";

function join(parts: string[], and = "and"): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} ${and} ${parts[parts.length - 1]}`;
}

export interface QuickAnswer {
  answer: string;
  scope: Scope;
  /** shows the counted projects on the map (the filters the assistant would have applied) */
  filters: { islandGroup?: string; status?: string; category?: string; province?: string } | null;
  /** ...or, when the map's filters cannot express the question (a region, "wind"), these projects are highlighted */
  highlight?: string[];
}

export async function tryQuickAnswer(query: string, history: Turn[], language?: string): Promise<QuickAnswer | null> {
  const q = (query || "").trim();
  if (!q || q.length > 160) return null;

  // ── Project Manager / Senior Project Manager / Site Leadership questions ──────
  const explicitPMTerm = /\b(project\s+managers?|senior\s+project\s+managers?|lead\s+project\s+managers?|lead\s+pm|pm|site\s+managers?|resident\s+(project\s+)?managers?|project\s+directors?)\b/i.test(q);
  const pmQuestion =
    (/\b(who\s+(is|was|are|were)|name\s+of|what\s+is\s+the\s+name\s+of|tell\s+me\s+the|do\s+we\s+have\s+a|list(\s+of)?)\b/i.test(q) && explicitPMTerm) ||
    (explicitPMTerm && /\b(for|on|of|at|in|per\s+project)\b/i.test(q)) ||
    /\bwho\s+(manages|managed|is\s+managing|is\s+in\s+charge\s+of)\b/i.test(q) ||
    /\bsino\b[^?]*\b(project\s+manager|pm|manager)\b/i.test(q);

  if (pmQuestion) {
    const all = await ProjectAtlasService.getAllProjects({ limit: 500 });
    const stopWords = new Set([
      "who", "is", "was", "are", "were", "our", "the", "a", "an", "for", "on", "of", "at", "in",
      "to", "and", "or", "per", "each", "every", "all", "what", "name", "tell", "me", "list",
      "project", "projects", "manager", "managers", "senior", "lead", "pm", "pms", "site",
      "resident", "director", "directors", "company", "scic", "sta", "clara", "international",
      "corporation", "sino", "ang", "sa", "ng", "natin", "nyo", "hepp", "plant", "power",
      "hydroelectric", "hydro", "wind", "farm", "thermal", "water", "treatment", "wtp", "stp",
      "manages", "managed", "managing", "charge",
    ]);

    const extractCandidateTokens = (text: string) =>
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 3 && !stopWords.has(t));

    let tokens = extractCandidateTokens(q);
    if (tokens.length === 0 && /\b(it|this|that|there|here|the\s+project)\b/i.test(q)) {
      const prevUser = [...history].reverse().find((t) => t.role === "user")?.content ?? "";
      tokens = extractCandidateTokens(prevUser);
    }

    // Check if the query targets a specific project
    const scored =
      tokens.length > 0
        ? all
            .map((p) => {
              const hay = `${p.name} ${p.slug.replace(/-/g, " ")} ${p.projectCode || ""} ${p.municipality} ${p.province}`.toLowerCase();
              const hits = tokens.filter((t) => hay.includes(t)).length;
              return { p, hits };
            })
            .filter((x) => x.hits > 0)
            .sort((a, b) => b.hits - a.hits)
        : [];

    if (scored.length > 0 && scored[0].hits >= 1) {
      const target = scored[0].p;
      if (target.slug === "tumauini-hepp") {
        const written =
          `The verified Project Manager (Resident Project Manager) for the **${target.name}** (${target.capacity || "11.3 MW"}, ${target.municipality}, ${target.province}) is **${target.leadPMName || "Engr. Romeo Sese"}**, under the **${target.leadPMDivision || "SCIC Hydropower Projects Division (Dir. Renin T. Belo)"}**.\n\n` +
          `Key verified site leadership on the Tumauini project also includes **Nathaniel P. Principe** (Deputy Project Manager), **Engr. Noel G. Lavapie** (Project Control & Technical Engineering Head), **Zandre Villaver** (Mechanical Superintendent), **Marvin Sibal** (Safety Officer), and **May Ann Parallag** (Planning Engineer). [Source: Project Atlas Database & Tumauini Accomplishment Reports MAR-54 / WAR-235]`;
        const say = `Our Project Manager on the Tumauini Hydroelectric Power Project is Engineer Romeo Sese, supported by Deputy Project Manager Nathaniel Principe and Project Control Head Engineer Noel Lavapie, under Hydropower Division Director Renin Belo.`;
        const sayTl = `Ang Project Manager natin sa Tumauini Hydroelectric Power Project ay si Engineer Romeo Sese, kasama sina Deputy Project Manager Nathaniel Principe at Engineer Noel Lavapie sa ilalim ni Hydropower Division Director Renin Belo.`;
        return {
          answer: `${written}\n[[SAY: ${say}]]${language === "taglish" ? `\n[[SAY-TL: ${sayTl}]]` : ""}`,
          scope: {},
          filters: null,
          highlight: [target.id],
        };
      }

      if (target.leadPMName) {
        const written =
          `The verified **${target.leadPMRole || "Project Manager"}** for the **${target.name}** (${target.municipality}, ${target.province}) is **${target.leadPMName}**, under the **${target.leadPMDivision || "SCIC Operations Division"}**. [Source: Project Atlas Database & Sta. Clara Official Press Releases]`;
        const say = `The verified Project Manager for ${target.name.replace(/\s*\([^)]*\)\s*/g, " ").trim()} is ${target.leadPMName}.`;
        const sayTl = `Ang verified Project Manager para sa ${target.name.replace(/\s*\([^)]*\)\s*/g, " ").trim()} ay si ${target.leadPMName}.`;
        return {
          answer: `${written}\n[[SAY: ${say}]]${language === "taglish" ? `\n[[SAY-TL: ${sayTl}]]` : ""}`,
          scope: {},
          filters: null,
          highlight: [target.id],
        };
      }

      // Project exists, no individual site PM on public record, but has verified Division Director / Group Manager oversight
      const divText = target.leadPMDivision || "SCIC Operations & Engineering Division (Deputy MD Fernando T. Delgado)";
      const roleText = target.leadPMRole ? ` (${target.leadPMRole})` : "";
      const written =
        `The current Atlas record does not list an individually named site-level Resident Project Manager for **${target.name}** (${target.municipality}, ${target.province}). Under Sta. Clara International Corporation's verified organization structure, this project is overseen by the **${divText}**${roleText}. [Source: Project Atlas Database & Sta. Clara Company Profile]`;
      const say = `The public records don't list an individual site Project Manager for ${target.name.replace(/\s*\([^)]*\)\s*/g, " ").trim()}. It falls under our ${divText.replace(/\s*\([^)]*\)\s*/g, "").trim()}${target.leadPMRole ? `, led by ${target.leadPMRole.replace(/^.*:\s*/, "")}` : ""}.`;
      const sayTl = `Walang nakalista na individual site Project Manager sa public records para sa ${target.name.replace(/\s*\([^)]*\)\s*/g, " ").trim()}, pero ito ay nasa ilalim ng ${divText}.`;
      return {
        answer: `${written}\n[[SAY: ${say}]]${language === "taglish" ? `\n[[SAY-TL: ${sayTl}]]` : ""}`,
        scope: {},
        filters: null,
        highlight: [target.id],
      };
    }

    // General roster question ("who are our project managers per project?", "list our project managers")
    const verifiedPMProjects = all.filter((p) => Boolean(p.leadPMName));
    const written =
      `Here are the **verified Project Managers and Project Execution Leaders** across Sta. Clara International Corporation (SCIC) from official project records and press releases:\n\n` +
      `**Verified Individual Site Project Managers:**\n` +
      `- **Tumauini Hydroelectric Power Project (11.3 MW, Isabela)**: **Engr. Romeo Sese** — *Project Manager (Resident Project Manager)*, with **Nathaniel P. Principe** (*Deputy PM*) and **Engr. Noel G. Lavapie** (*Project Control & Technical Engineering Head*)\n` +
      `- **Pagudpud Wind Farm (160 MW Balaoi-Caunayan, Ilocos Norte)**: **Engr. Ryan Flores** — *Project Manager* (also SCIC QA/QC Manager)\n` +
      `- **Catuiran Hydroelectric Power Plant (8 MW, Oriental Mindoro)**: **Albert B. Mendoza** — *Project Manager*\n` +
      `- **Balingasag Thermal Power Plant (3 x 55 MW, Misamis Oriental)**: **Peter Alan D. Pineda** — *Project Manager*\n\n` +
      `**Verified SCIC Division Directors & Group Managers Overseeing Project Sectors:**\n` +
      `- **Hydropower Projects Division**: **Dir. Renin T. Belo** (*Director for Operations & Director for Hydro Projects* — also led the 8.4 MW Maladugao Upper Cascade HEPP contract)\n` +
      `- **Energy Projects Division**: **Dir. Luisito O. Traboco** (*Director for Energy Projects*)\n` +
      `- **Water Projects Division**: **Dir. Narciso M. Areglado** (*Director for Water Projects* — led the 300+ MLD Davao City Bulk Water Supply WTP contract)\n` +
      `- **Infrastructure Projects Division**: **Dir. Antonio S. Pascua** (*Director for Infrastructure Projects*), with **Deputy MD Miguel Carlos L. Linao** leading the PHP 625M Bohol PRDP Road & 4 Bridges project\n` +
      `- **Buildings & Industrial Plants Group**: **Norman Enriquez** (*Group Manager* — led the 10-hectare Maersk-LF Logistics Calamba Mega Hub and PMFTC Batangas Factory Extension)\n` +
      `- **Special Operations Division**: **SVP Nobukazu Kotake** (led the 10 MW Masinloc Battery Energy Storage System)\n` +
      `- **Operations, Project Control & PM Technical Support**: **Fernando T. Delgado** (*Deputy MD for Operations & Director for Project Control*), **John Rey Cahilig** (*Project Control Manager*), and **Antero Magallon, Jr.** (*Technical Support Services Manager – Project Management*)\n` +
      `[Source: Project Atlas Database & Sta. Clara Company Profile]`;
    const say = `We have four verified site Project Managers on record: Engineer Romeo Sese on the 11.3 megawatt Tumauini Hydro project, Engineer Ryan Flores on the 160 megawatt Pagudpud Wind Farm, Albert Mendoza on the 8 megawatt Catuiran Hydro plant, and Peter Alan Pineda on the Balingasag Thermal plant, along with our Division Directors shown on your screen.`;
    const sayTl = `Apat ang verified site Project Managers sa ating records: sina Engineer Romeo Sese sa Tumauini Hydro, Engineer Ryan Flores sa Pagudpud Wind Farm, Albert Mendoza sa Catuiran Hydro, at Peter Alan Pineda sa Balingasag Thermal, kasama ang ating mga Division Directors na nasa screen.`;
    return {
      answer: `${written}\n[[SAY: ${say}]]${language === "taglish" ? `\n[[SAY-TL: ${sayTl}]]` : ""}`,
      scope: {},
      filters: null,
      highlight: verifiedPMProjects.map((p) => p.id),
    };
  }

  // ── Capacity totals, lists of names, and the largest project ──────────────────
  const capacityQ = /\b(how many|total|combined|sum of|overall)\b[^?]*\b(megawatts?|mw|capacity|generating capacity)\b/i.test(q);
  const listQ =
    /\b(which|what|list|name)\b[^?]*\bprojects?\b/i.test(q) && !/\bhow many\b|\b(most|biggest|largest|status of|about|tell me)\b/i.test(q);
  const largestQ = /\b(biggest|largest)\b[^?]*\b(projects?|plants?|dams?)\b/i.test(q) && !/\b(value|cost|budget|contract|peso|area|length|longest)\b/i.test(q);
  if ((capacityQ || listQ || largestQ) && !/\b(year|since|before|after|between|client|owner|value|cost|budget|per|average|compare|versus|vs)\b/i.test(q)) {
    const all = await ProjectAtlasService.getAllProjects({ limit: 500 });
    const provinceNames = [...new Set(all.map((p) => p.province).filter((p) => p && p !== "Various"))];
    let sc = parseScope(q, provinceNames);
    if (/\b(there|those|them|of those)\b/i.test(q)) {
      const previous = [...history].reverse().find((t) => t.role === "user")?.content ?? "";
      const prev = parseScope(previous, provinceNames);
      sc = { ...prev, ...Object.fromEntries(Object.entries(sc).filter(([, v]) => v !== undefined)) };
    }
    const hasPlace = !!(sc.island || sc.regionKeys || sc.province);
    if (listQ && !hasPlace && !sc.category && !sc.status) return null; // "which projects..." with nothing to narrow it: leave to the model
    const inScopeAll = all.filter((p) => {
      if (sc.island && p.islandGroup !== sc.island) return false;
      if (sc.regionKeys) {
        const keys = regionKeys(p.region || "");
        if (!sc.regionKeys.some((k) => keys.includes(k) || (k.length === 1 && keys.some((x) => x.startsWith(k) && /[ab]$/.test(x))))) return false;
      }
      if (sc.province && !(p.province || "").toLowerCase().includes(sc.province.toLowerCase())) return false;
      if (sc.category && !matchesKind(p, sc.category)) return false;
      if (sc.status && p.status !== sc.status) return false;
      return true;
    });
    const where = sc.province
      ? `in ${sc.province}`
      : sc.regionKeys
      ? `in ${(inScopeAll[0]?.region || `Region ${sc.regionKeys[0].toUpperCase()}`).split("/")[0].trim()}`
      : sc.island
      ? `in ${ISLANDS.find((x) => x[1] === sc.island)![2]}`
      : "across the portfolio";
    const kindWords = [statusLabel(sc.status), categoryLabel(sc.category)].filter(Boolean).join(" ");
    const mw = (p: { capacity?: string | null }) => {
      const m = (p.capacity || "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*MW\b/i);
      return m ? Number(m[1]) : null;
    };
    const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString("en-US");
    const short = (name: string) => name.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
    const useHighlight = !!sc.regionKeys || (!!sc.category && NAMED_KINDS.has(sc.category)) || listQ;
    const filters =
      !useHighlight && inScopeAll.length && (sc.island || sc.status || sc.category || sc.province)
        ? {
            ...(sc.island ? { islandGroup: sc.island } : {}),
            ...(sc.status ? { status: sc.status } : {}),
            ...(sc.category ? { category: sc.category } : {}),
            ...(sc.province ? { province: sc.province } : {}),
          }
        : null;
    const finish = (written: string, say: string, sayTl: string): QuickAnswer => ({
      answer: `${written} [Source: Project Atlas Database]\n[[SAY: ${say}]]${language === "taglish" ? `\n[[SAY-TL: ${sayTl}]]` : ""}`,
      scope: sc,
      filters,
      highlight: useHighlight && inScopeAll.length ? inScopeAll.slice(0, 40).map((p) => p.id) : undefined,
    });

    if (capacityQ) {
      const rated = inScopeAll.map((p) => ({ p, mw: mw(p) })).filter((x): x is { p: (typeof inScopeAll)[number]; mw: number } => x.mw !== null);
      if (!rated.length) {
        return finish(
          `None of the ${kindWords ? kindWords + " " : ""}projects ${where} has a capacity in megawatts in the records.`,
          `The records don't give a megawatt capacity for the ${kindWords ? kindWords + " " : ""}projects ${where}.`,
          `Walang nakatalang megawatt capacity ang mga proyekto ${where.replace(/^in /, "sa ")}.`
        );
      }
      const total = rated.reduce((s, x) => s + x.mw, 0);
      const top = [...rated].sort((a, b) => b.mw - a.mw)[0];
      const unrated = inScopeAll.length - rated.length;
      const written = `The ${kindWords ? kindWords + " " : ""}projects ${where} with a stated capacity add up to ${fmt(total)} MW, across ${rated.length} ${plural(rated.length, "project")}${unrated ? ` (${unrated} more have no megawatt figure in the records)` : ""}. The largest is ${short(top.p.name)} at ${fmt(top.mw)} MW.`;
      const say = `Together that's ${fmt(total)} megawatts ${where}, from ${rated.length} ${plural(rated.length, "project")}. The biggest is ${short(top.p.name)}, at ${fmt(top.mw)} megawatts.`;
      const sayTl = `Lahat-lahat, ${fmt(total)} megawatts ${where.replace(/^in /, "sa ").replace("across the portfolio", "sa buong portfolio")}, mula sa ${rated.length} na proyekto.`;
      return finish(written, say, sayTl);
    }

    if (largestQ) {
      const rated = inScopeAll.map((p) => ({ p, mw: mw(p) })).filter((x): x is { p: (typeof inScopeAll)[number]; mw: number } => x.mw !== null).sort((a, b) => b.mw - a.mw);
      if (!rated.length) return null; // no capacities to rank by: let the model explain
      const [a, b, c] = rated;
      const written = `By capacity, the largest ${kindWords ? kindWords + " " : ""}project ${where} is ${short(a.p.name)} (${a.p.province}) at ${fmt(a.mw)} MW.${b ? ` Next ${c ? "are" : "is"} ${short(b.p.name)} (${fmt(b.mw)} MW)${c ? ` and ${short(c.p.name)} (${fmt(c.mw)} MW)` : ""}.` : ""}`;
      const say = `The biggest ${kindWords ? kindWords + " " : ""}project ${where} is ${short(a.p.name)}, at ${fmt(a.mw)} megawatts.${b ? ` ${short(b.p.name)} comes next with ${fmt(b.mw)}.` : ""}`;
      const sayTl = `Ang pinakamalaki ${where.replace(/^in /, "sa ").replace("across the portfolio", "sa buong portfolio")} ay ang ${short(a.p.name)}, ${fmt(a.mw)} megawatts.`;
      return finish(written, say, sayTl);
    }

    // a list of names
    const n = inScopeAll.length;
    if (!n) {
      return finish(
        `The Atlas records have no ${kindWords ? kindWords + " " : ""}projects ${where}.`,
        `I don't have any ${kindWords ? kindWords + " " : ""}projects ${where} in the records.`,
        `Wala tayong proyekto ${where.replace(/^in /, "sa ")} sa records.`
      );
    }
    const shown = inScopeAll.slice(0, 12);
    const lines = shown.map((p) => `- ${short(p.name)} (${p.province}, ${p.status.toLowerCase()})`).join("\n");
    const written = `There ${n === 1 ? "is" : "are"} ${n} ${kindWords ? kindWords + " " : ""}${plural(n, "project")} ${where}:\n${lines}${n > shown.length ? `\n…and ${n - shown.length} more.` : ""}\n`;
    const names = shown.slice(0, 3).map((p) => short(p.name));
    const say =
      n === 1
        ? `There's one: ${names[0]}.`
        : `There are ${n}. ${n <= 3 ? `They are ${join(names)}.` : `Among them ${join(names)}; the full list is on your screen.`}`;
    const sayTl = `${n} ang proyekto ${where.replace(/^in /, "sa ").replace("across the portfolio", "sa buong portfolio")}. Nasa screen ang buong listahan.`;
    return finish(written, say, sayTl);
  }

  // "Which region (province, island group) has the most projects?"
  const rank = q.match(/\b(?:which|what)\s+(region|province|island(?:\s+group)?)s?\b[^?]*\b(?:most|highest|largest number|biggest number)\b/i);
  if (rank && !hasUnsupportedQualifier(q.replace(/\b(most|largest number|biggest number)\b/gi, ""))) {
    const level = rank[1].toLowerCase().startsWith("island") ? "island" : rank[1].toLowerCase();
    const all = await ProjectAtlasService.getAllProjects({ limit: 500 });
    const filter = parseScope(q, []);
    const pool = all.filter((p) => (!filter.status || p.status === filter.status) && (!filter.category || p.category === filter.category));
    const tally = new Map<string, { label: string; n: number }>();
    for (const p of pool) {
      const names: string[] =
        level === "island"
          ? [p.islandGroup || ""].filter(Boolean)
          : ((level === "region" ? p.region : p.province) || "").split(/\s*(?:\/|&|,| and )\s*/).filter((x) => x && x !== "Various" && x !== "National");
      for (const raw of names) {
        const key = level === "region" ? regionKeys(raw)[0] ?? raw.toLowerCase() : raw.toLowerCase();
        const cur = tally.get(key) ?? { label: raw, n: 0 };
        cur.n += 1;
        if (raw.length > cur.label.length) cur.label = raw; // keep the fullest name: "Region II (Cagayan Valley)"
        tally.set(key, cur);
      }
    }
    const ranked = [...tally.values()].sort((a, b) => b.n - a.n);
    if (!ranked.length) return null;
    const pretty = (label: string) => (level === "island" ? label.charAt(0) + label.slice(1).toLowerCase() : label);
    const kind = [statusLabel(filter.status), categoryLabel(filter.category)].filter(Boolean).join(" ");
    const first = ranked[0];
    const tied = ranked.filter((r) => r.n === first.n);
    const after = ranked.slice(tied.length, tied.length + 2);
    const names = tied.map((r) => pretty(r.label));
    const lead =
      tied.length > 1
        ? `${join(names)} are tied for the most ${kind ? kind + " " : ""}projects, with ${first.n} each`
        : `${names[0]} has the most ${kind ? kind + " " : ""}projects, with ${first.n}`;
    const rest = after.map((r) => `${pretty(r.label)} (${r.n})`);
    const written = `${lead}.${rest.length ? ` Next ${rest.length === 1 ? "is" : "are"} ${join(rest)}.` : ""} [Source: Project Atlas Database]`;
    const say = `${lead}.${tied.length === 1 && after[0] ? ` ${pretty(after[0].label)} comes next with ${after[0].n}.` : ""}`;
    const sayTl =
      tied.length > 1
        ? `Tabla ang ${join(names, "at")}, tig-${first.n} na proyekto.`
        : `Ang ${names[0]} ang may pinakamaraming proyekto, ${first.n} lahat.`;
    return {
      answer: `${written}\n[[SAY: ${say}]]${language === "taglish" ? `\n[[SAY-TL: ${sayTl}]]` : ""}`,
      scope: {},
      filters: null,
    };
  }

  // A follow-up points back at the last answer ("and how many of those are ongoing?", "how many
  // are ongoing there?"). "are there" / "is there" is NOT one: "how many projects are there in
  // Cagayan Valley" is a new question, and reading it as a follow-up carried "solar" over from the
  // question before it and answered "no solar projects in Region II".
  const pointsBack = q.replace(/\b(are|is|were|was) there\b/gi, " ");
  const followUp = /^(and|what about|how about|ilan)\b/i.test(q) || /\b(of those|of them|there|those|them|doon|dun)\b/i.test(pointsBack);
  if (!isCountQuestion(q) && !(followUp && /\b(ongoing|completed|upcoming|active|finished|hydro|wind|water|road|bridge|tunnel)\b/i.test(q))) return null;
  if (hasUnsupportedQualifier(q)) return null;

  const projects = await ProjectAtlasService.getAllProjects({ limit: 500 });
  if (!projects.length) return null;
  const provinces = [...new Set(projects.map((p) => p.province).filter((p) => p && p !== "Various"))];

  let scope = parseScope(q, provinces);
  // A follow-up keeps the place (and sector) of the question before it
  if (followUp) {
    const previous = [...history].reverse().find((t) => t.role === "user")?.content ?? "";
    const prev = parseScope(previous, provinces);
    scope = {
      island: scope.island ?? prev.island,
      regionKeys: scope.regionKeys ?? prev.regionKeys,
      province: scope.province ?? prev.province,
      category: scope.category ?? prev.category,
      status: scope.status,
    };
  }
  const placeGiven = scope.island || scope.regionKeys || scope.province;
  // "how many projects do we have" with no place means the whole portfolio, but only when the
  // question is plainly about projects
  if (!placeGiven && !/\bprojects?\b|\bproyekto\b/i.test(q)) return null;

  const inScope = projects.filter((p) => {
    if (scope.island && p.islandGroup !== scope.island) return false;
    if (scope.regionKeys) {
      const keys = regionKeys(p.region || "");
      if (!scope.regionKeys.some((k) => keys.includes(k) || (k.length === 1 && keys.some((x) => x.startsWith(k) && /[ab]$/.test(x))))) return false;
    }
    // ("Benguet" also counts a project listed as "Ilocos Sur & Benguet")
    if (scope.province && !(p.province || "").toLowerCase().includes(scope.province.toLowerCase())) return false;
    if (scope.category && !matchesKind(p, scope.category)) return false;
    return true;
  });
  const matching = scope.status ? inScope.filter((p) => p.status === scope.status) : inScope;
  const n = matching.length;

  // How the place is said
  let place = "across the portfolio";
  let placeTl = "sa buong portfolio";
  if (scope.province) {
    place = `in ${scope.province}`;
    placeTl = `sa ${scope.province}`;
  } else if (scope.regionKeys) {
    const sample = inScope[0]?.region || projects.find((p) => regionKeys(p.region || "").some((k) => scope.regionKeys!.includes(k)))?.region;
    const label = sample ? sample.split("/")[0].trim() : `Region ${scope.regionKeys[0].toUpperCase()}`;
    place = `in ${label}`;
    placeTl = `sa ${label}`;
  } else if (scope.island) {
    const label = ISLANDS.find((x) => x[1] === scope.island)![2];
    place = `in ${label}`;
    placeTl = `sa ${label.replace(/^the /, "")}`;
  }

  const kind = [statusLabel(scope.status), categoryLabel(scope.category)].filter(Boolean).join(" ");
  const subject = `${kind ? kind + " " : ""}${plural(n, "project")}`;

  // Breakdown by status (when no status was asked for) and the main sector (when none was asked for)
  const byStatus: Record<string, number> = {};
  for (const p of matching) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
  const order = ["ONGOING", "UPCOMING", "COMPLETED", "PLANNING", "ON_HOLD"];
  const statusParts = order.filter((s) => byStatus[s]).map((s) => `${byStatus[s]} ${s.toLowerCase().replace("_", " ")}`);
  const byCategory: Record<string, number> = {};
  for (const p of matching) byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
  const [topCat, topCount] = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  const topLabel = categoryLabel(topCat) || topCat.toLowerCase().replace(/_/g, " ");

  let written: string;
  let say: string;
  let sayTl: string;
  if (n === 0) {
    written = `The Atlas records have no ${kind ? kind + " " : ""}projects ${place}.`;
    say = `I don't have any ${kind ? kind + " " : ""}projects ${place} in the records.`;
    sayTl = `Wala tayong ${kind ? (statusLabelTl(scope.status) + " " + categoryLabelTl(scope.category)).trim() + " na " : ""}proyekto ${placeTl} sa records.`;
  } else {
    const breakdown = !scope.status && statusParts.length > 1 ? `: ${join(statusParts)}` : "";
    const mostly =
      !scope.category && n >= 2 && topCount === n
        ? ` All of them are ${topLabel}.`
        : !scope.category && n >= 3 && topCount * 2 >= n
        ? ` Most of them are ${topLabel} (${topCount} of ${n}).`
        : !scope.category && n >= 3 && topCount >= 2 // ("the biggest group, with 1" says nothing)
        ? ` The biggest group is ${topLabel}, with ${topCount}.`
        : "";
    written = `There ${n === 1 ? "is" : "are"} ${n} Sta. Clara ${subject} ${place}${breakdown}.${mostly} [Source: Project Atlas Database]`;
    say = `We have ${n} ${subject} ${place}${breakdown}.${!scope.category && n >= 3 && topCount * 2 >= n ? ` Mostly ${topLabel}.` : ""}`;
    const tlKind = [statusLabelTl(scope.status), categoryLabelTl(scope.category)].filter(Boolean).join(" ");
    const tlBreakdown = !scope.status && statusParts.length > 1 ? `: ${join(statusParts.map((x) => x.replace("completed", "tapos na")), "at")}` : "";
    sayTl = `Mayroon tayong ${n} ${tlKind ? tlKind + " na " : "na "}proyekto ${placeTl}${tlBreakdown}.`;
  }

  const answer = `${written}\n[[SAY: ${say}]]${language === "taglish" ? `\n[[SAY-TL: ${sayTl}]]` : ""}`;
  const useHighlight = !!scope.regionKeys || (!!scope.category && NAMED_KINDS.has(scope.category));
  const filters =
    !useHighlight && n > 0 && (scope.island || scope.status || scope.category || scope.province)
      ? {
          ...(scope.island ? { islandGroup: scope.island } : {}),
          ...(scope.status ? { status: scope.status } : {}),
          ...(scope.category ? { category: scope.category } : {}),
          ...(scope.province ? { province: scope.province } : {}),
        }
      : null;
  return { answer, scope, filters, highlight: useHighlight && n ? matching.slice(0, 40).map((p) => p.id) : undefined };
}
