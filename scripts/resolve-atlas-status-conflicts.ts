/**
 * Six records were marked completed while the company's website still lists them as ongoing.
 * Each was checked against other published sources on 5 October 2026. Dry run by default.
 *
 *   npx tsx --env-file=.env scripts/resolve-atlas-status-conflicts.ts [--apply]
 *
 * Completed (a source outside the company's list says so):
 *   siguil-hydro      Alsons Power, 6 Feb 2025: "completed the 14.5 MW Siguil Hydro Power Plant" in 2024
 *   maersk-calamba    Maersk, 4 Nov 2024: the Calamba distribution centre was inaugurated on 30 Oct 2024
 *   masinloc-bess     press reports: Masinloc Phase 2 reached substantial completion by Sept 2024
 *   upper-wawa-roads  Prime Infra / press, 21 June 2025: the Upper Wawa Dam project is complete
 *                     (no date is published for the access roads themselves, so none is set)
 * Ongoing (nothing found that says they are finished, so the company's list stands):
 *   marilao-substation, magdiwang-reservoir
 */
import fs from "fs";
import path from "path";
import { prisma } from "../lib/db/prisma";

const APPLY = process.argv.includes("--apply");
const OLD = [
  "The company still shows it on its ongoing list and gives no completion date.",
  "The company shows it on its ongoing list and gives no completion date.",
  "The company shows the expansion on its ongoing list and gives no completion date.",
  "The company shows it on its ongoing list and does not publish the floor area, the completion date or the contract value.",
];
const FIX: Record<string, { status: "COMPLETED" | "ONGOING"; end?: string; note: string; milestone?: string }> = {
  "siguil-hydro": {
    status: "COMPLETED", end: "2024-09",
    note: "The plant's owner, Alsons Power, reported in February 2025 that the plant was completed in 2024 (the company's own list still shows it as ongoing).",
    milestone: "Plant completed (Alsons Power, reported February 2025)",
  },
  "maersk-calamba": {
    status: "COMPLETED", end: "2024-10",
    note: "Maersk inaugurated the facility on 30 October 2024 (the company's own list still shows it as ongoing). The company does not publish the floor area or the contract value.",
    milestone: "Facility inaugurated by Maersk (30 October 2024)",
  },
  "masinloc-bess": {
    status: "COMPLETED", end: "2024-09",
    note: "Press reports give the Masinloc Phase 2 battery as substantially complete by September 2024 (the company's own list still shows it as ongoing).",
    milestone: "Substantial completion (press reports, September 2024)",
  },
  "upper-wawa-roads": {
    status: "COMPLETED",
    note: "The Upper Wawa Dam project as a whole was reported complete in June 2025; no completion date is published for the access roads themselves (the company's own list still shows them as ongoing).",
  },
  "marilao-substation": {
    status: "ONGOING",
    note: "The company shows it on its ongoing list, and no published source was found that reports the substation finished, so it is recorded as ongoing.",
  },
  "magdiwang-reservoir": {
    status: "ONGOING",
    note: "The company shows it on its ongoing list, and no published source was found that reports the work finished, so it is recorded as ongoing.",
  },
};

async function main() {
  for (const [slug, f] of Object.entries(FIX)) {
    const row = await prisma.project.findFirst({ where: { slug, deletedAt: null } });
    if (!row) throw new Error(`not found: ${slug}`);
    let text = row.description || "";
    const old = OLD.find((o) => text.includes(o));
    if (old) text = text.replace(old, f.note);
    else if (!text.includes(f.note)) throw new Error(`${slug}: sentence to replace not found`);
    const data: Record<string, unknown> = { status: f.status, description: text };
    if (f.end) {
      data.projectEndDate = new Date(`${f.end}-01T00:00:00Z`);
      data.keyMilestones = [{ date: f.end, title: f.milestone, status: "ACHIEVED" }];
    } else {
      data.projectEndDate = null;
    }
    console.log(`${slug}: ${row.status} -> ${f.status}${f.end ? `, completed ${f.end}` : ""}`);
    if (APPLY) await prisma.project.update({ where: { id: row.id }, data: data as never });
  }
  if (!APPLY) return console.log("dry run: nothing written. Re-run with --apply.");
  const all = await prisma.project.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  const file = path.join(process.cwd(), "lib", "data", "scicAtlasInitialProjects.json");
  const before = JSON.parse(fs.readFileSync(file, "utf8")) as Array<Record<string, unknown>>;
  const keys = Object.keys(before[0]);
  fs.writeFileSync(file, JSON.stringify(all.map((r) => Object.fromEntries(keys.map((k) => [k, (r as Record<string, unknown>)[k] ?? null]))), null, 2) + "\n");
  console.log(`written; ${all.length} projects`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
