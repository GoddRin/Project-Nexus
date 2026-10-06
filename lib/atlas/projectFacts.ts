import type { SCICProject } from "@/lib/data/scicProjectsData";

/**
 * Small facts read off a project record, shared by the map's tools (time slider, compare,
 * export, verification badge) so they all agree.
 */

export type Verification = "verified" | "unconfirmed" | "listed";

/**
 * How far a record can be trusted:
 *  - "verified": rewritten from a published source, named in the description's "Source:" line
 *    (Sta. Clara's own website for most; a news post, press release or designer's page for a few);
 *  - "unconfirmed": kept on the map, but no public source confirms the company's involvement;
 *  - "listed": an older record, its client checked where a source exists, its text not yet rewritten.
 */
export function verificationOf(p: Pick<SCICProject, "description">): Verification {
  const d = p.description || "";
  if (/Not confirmed by public sources/.test(d)) return "unconfirmed";
  if (/Source: /.test(d)) return "verified";
  return "listed";
}

export const VERIFICATION_LABEL: Record<Verification, { label: string; hint: string }> = {
  verified: { label: "Verified", hint: "Details taken from a published source, named at the end of the description" },
  unconfirmed: { label: "Unconfirmed", hint: "No public source confirms Sta. Clara's involvement in this project" },
  listed: { label: "Listed", hint: "On record; details not yet checked against a published source" },
};

/** A project's name short enough for a map label or a one-line list ("Bakun AC Hydroelectric Power Plant") */
export function shortLabelOf(name: string, max = 40): string {
  const plain = name.replace(/\s*\([^)]*\)/g, "").trim() || name;
  // ("X - civil works" keeps X; a one- or two-word lead such as "Maersk - LF Logistics ..." is kept whole)
  const lead = plain.split(/\s+[-–]\s+/)[0].trim();
  const base = lead.split(/\s+/).length >= 3 ? lead : plain.replace(/\s+[-–]\s+/g, " ");
  if (base.length <= max) return base;
  const cut = base.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 12))}…`;
}

/** The year a completed project was finished (from its completion date or milestone), else null */
export function completionYearOf(p: SCICProject): number | null {
  if (p.status !== "COMPLETED") return null;
  const fromDate = p.projectEndDate ? new Date(p.projectEndDate).getUTCFullYear() : NaN;
  if (Number.isFinite(fromDate) && fromDate > 1900) return fromDate;
  if (p.completionYear && p.completionYear > 1900) return p.completionYear;
  const done = (p.keyMilestones || []).find((m) => m.status === "ACHIEVED" && /complet|inaugurat|commission/i.test(m.title));
  const y = done ? Number(String(done.date).slice(0, 4)) : NaN;
  return Number.isFinite(y) && y > 1900 ? y : null;
}

const START_MILESTONE = /ground-?\s?break|construction (start|began|commenc)|contract (signed|signing|award|secured)|awarded|tapped/i;

/**
 * The year work on a project is known to have started: its start date, or a dated milestone for
 * the groundbreaking or the contract. Most records publish neither, and then this is null.
 */
export function startYearOf(p: SCICProject): number | null {
  const fromDate = p.projectStartDate ? new Date(p.projectStartDate).getUTCFullYear() : NaN;
  if (Number.isFinite(fromDate) && fromDate > 1900) return fromDate;
  const years = (p.keyMilestones || [])
    .filter((m) => START_MILESTONE.test(m.title))
    .map((m) => Number(String(m.date).slice(0, 4)))
    .filter((y) => Number.isFinite(y) && y > 1900);
  return years.length ? Math.min(...years) : null;
}

/**
 * Is the project on the map in a given year? Completed work appears in its completion year, or
 * from its start year when that is known (then it shows as under construction until it is done);
 * current work appears from its start year when known, otherwise only at "today"; completed work
 * with no published date is shown throughout (hiding it would wrongly suggest it did not exist).
 */
export function visibleInYear(p: SCICProject, year: number, thisYear: number): boolean {
  if (year >= thisYear) return true;
  const start = startYearOf(p);
  if (p.status !== "COMPLETED") return start !== null && year >= start;
  const y = completionYearOf(p);
  if (y === null) return true;
  return y <= year || (start !== null && year >= start);
}

/** In that year the project had started but was not yet finished */
export function underConstructionIn(p: SCICProject, year: number, thisYear: number): boolean {
  if (year >= thisYear) return p.status === "ONGOING";
  const start = startYearOf(p);
  if (start === null || year < start) return false;
  if (p.status !== "COMPLETED") return true;
  const y = completionYearOf(p);
  return y !== null && y > year;
}

/** What Atlas says for a year of the journey: the year, then the works finished in it */
export function timelineLine(year: number, names: string[]): string {
  const list = names.slice(0, 3).map((n) => shortLabelOf(n, 60));
  const more = names.length - list.length;
  const joined =
    list.length <= 1 ? list[0] || "" : `${list.slice(0, -1).join(", ")}${more > 0 ? ", " : " and "}${list[list.length - 1]}`;
  return `${year}. ${joined}${more > 0 ? `, and ${more} more` : ""}.`;
}

export interface EraChapter {
  from: number;
  to: number;
  title: string;
}

/**
 * The portfolio's eras, read from the records: a chapter runs while completions keep coming, and
 * a new one starts after three quiet years or once a chapter is eight years long. Each is named
 * after the kinds of work finished most in it.
 */
export function eraChaptersOf(projects: SCICProject[], minYear: number, maxYear: number, labelOf: (p: SCICProject) => string): EraChapter[] {
  const byYear = new Map<number, SCICProject[]>();
  for (const p of projects) {
    const y = completionYearOf(p);
    if (y !== null && y >= minYear && y <= maxYear) byYear.set(y, [...(byYear.get(y) || []), p]);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  if (!years.length) return [];
  const spans: Array<[number, number]> = [];
  let from = years[0];
  let last = years[0];
  for (const y of years.slice(1)) {
    if (y - last >= 3 || y - from >= 8) {
      spans.push([from, last]);
      from = y;
    }
    last = y;
  }
  spans.push([from, last]);
  return spans.map(([a, b], i) => {
    const to = i === spans.length - 1 ? maxYear : spans[i + 1][0] - 1;
    const count = new Map<string, number>();
    for (let y = a; y <= b; y++) for (const p of byYear.get(y) || []) count.set(labelOf(p), (count.get(labelOf(p)) || 0) + 1);
    const top = [...count.entries()].sort((x, z) => z[1] - x[1]).slice(0, 2).map(([l]) => l);
    return { from: i === 0 ? minYear : a, to, title: top.length > 1 ? `${top[0]} and ${top[1].toLowerCase()}` : top[0] || "" };
  });
}

/** Megawatts, read from the capacity text ("3 x 55 MW" -> 165, "5,012 kW (about 5 MW)" -> 5.012) */
export function capacityMwOf(p: Pick<SCICProject, "metrics">): number | null {
  const text = String(p.metrics?.capacity || "");
  if (!text) return null;
  const multi = text.match(/(\d+)\s*[xX×]\s*([\d,.]+)\s*MW/);
  if (multi) return Number(multi[1]) * parseFloat(multi[2].replace(/,/g, ""));
  const kw = text.match(/([\d,.]+)\s*kW/i);
  if (kw && !/MW/i.test(text.slice(0, text.indexOf(kw[0])))) return parseFloat(kw[1].replace(/,/g, "")) / 1000;
  const mw = text.match(/([\d,.]+)\s*MW/i);
  return mw ? parseFloat(mw[1].replace(/,/g, "")) : null;
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The list on screen as a spreadsheet (CSV, opens in Excel). Only what the records hold. */
export function projectsToCsv(projects: SCICProject[]): string {
  const head = ["Code", "Project", "Category", "Status", "Island group", "Region", "Province", "City / Municipality", "Capacity / size", "Client", "Completed (year)", "Latitude", "Longitude", "Record status"];
  const rows = projects.map((p) => [
    p.code, p.name, String(p.sector).replace(/_/g, " "), p.status, p.islandGroup, p.region, p.province, p.municipality,
    p.metrics?.capacity || "", p.client || "", completionYearOf(p) ?? "", p.coordinates.lat, p.coordinates.lng, VERIFICATION_LABEL[verificationOf(p)].label,
  ]);
  // (the BOM lets Excel read the peso sign, en dashes and "ñ" correctly)
  return "﻿" + [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

// ── Starred projects and saved views: this browser only (localStorage) ──
const STAR_KEY = "atlas.starred";
const VIEW_KEY = "atlas.savedViews";

export function readStarred(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(STAR_KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
export function writeStarred(ids: string[]): void {
  try {
    window.localStorage.setItem(STAR_KEY, JSON.stringify(ids.slice(0, 200)));
  } catch {
    // private window: stars last for this visit only
  }
}

export interface SavedView {
  name: string;
  /** the query string of the shareable link (filters and selection) */
  query: string;
  savedAt: number;
}
export function readSavedViews(): SavedView[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(VIEW_KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => x && typeof x.name === "string" && typeof x.query === "string") : [];
  } catch {
    return [];
  }
}
export function writeSavedViews(views: SavedView[]): void {
  try {
    window.localStorage.setItem(VIEW_KEY, JSON.stringify(views.slice(0, 30)));
  } catch {
    // private window
  }
}
