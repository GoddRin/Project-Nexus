/**
 * What Atlas remembers about you between visits: the projects and places you look at most.
 *
 * Kept only in this browser (localStorage), never sent anywhere except as a short hint with your
 * own questions, so he can open with "back to Tumauini?" and suggest what you usually look at.
 * Clearing the browser's site data forgets it.
 */
const KEY = "atlas.navigator.memory";
const MAX_PROJECTS = 30;

interface Memory {
  projects: Record<string, { name: string; count: number; last: number }>;
  regions: Record<string, number>;
}

function read(): Memory {
  try {
    if (typeof window === "undefined") return { projects: {}, regions: {} };
    const raw = JSON.parse(window.localStorage.getItem(KEY) || "{}") as Partial<Memory>;
    return { projects: raw.projects ?? {}, regions: raw.regions ?? {} };
  } catch {
    return { projects: {}, regions: {} };
  }
}

function write(m: Memory): void {
  try {
    const entries = Object.entries(m.projects).sort((a, b) => b[1].last - a[1].last).slice(0, MAX_PROJECTS);
    window.localStorage.setItem(KEY, JSON.stringify({ projects: Object.fromEntries(entries), regions: m.regions }));
  } catch {
    // storage unavailable: nothing is remembered
  }
}

/** Note that a project was opened (counted at most once every 10 minutes per project). */
export function rememberProject(p: { id: string; name: string; region?: string | null }): void {
  const m = read();
  const now = Date.now();
  const prev = m.projects[p.id];
  if (prev && now - prev.last < 10 * 60 * 1000) {
    prev.last = now;
  } else {
    m.projects[p.id] = { name: p.name, count: (prev?.count ?? 0) + 1, last: now };
    if (p.region) m.regions[p.region] = (m.regions[p.region] ?? 0) + 1;
  }
  write(m);
}

/** The project and region this user comes back to (only once they have, at least twice). */
export function favourites(): { project?: { id: string; name: string }; region?: string } {
  const m = read();
  const project = Object.entries(m.projects)
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count || b[1].last - a[1].last)[0];
  const region = Object.entries(m.regions).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])[0];
  return {
    project: project ? { id: project[0], name: project[1].name } : undefined,
    region: region?.[0],
  };
}

/** A short hint for the assistant: what this user usually looks at. */
export function interestsSummary(): string[] {
  const m = read();
  const projects = Object.values(m.projects)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .filter((p) => p.count >= 2)
    .map((p) => p.name);
  const regions = Object.entries(m.regions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .filter(([, n]) => n >= 2)
    .map(([r]) => r);
  return [...projects, ...regions];
}

/** Project names without the bracketed extras: "Tumauini Hydroelectric Power Project" */
export const shortProjectName = (name: string) => name.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
