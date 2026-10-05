/**
 * Start-of-work milestones for the timeline's "under construction" phase (2026-10-05).
 * Dry run by default.
 *
 *   npx tsx --env-file=.env scripts/add-atlas-start-milestones.ts [--apply]
 *
 * Only starts a published source dates are added; every other record keeps no start date and
 * simply appears on the timeline when it was finished. Each milestone names its source.
 */
import fs from "fs";
import path from "path";
import { prisma } from "../lib/db/prisma";

const APPLY = process.argv.includes("--apply");
const ADD: Record<string, { date: string; title: string }> = {
  "maersk-calamba": { date: "2022-12", title: "Groundbreaking ceremony (company news post, December 2022)" },
  "siguil-hydro": { date: "2019", title: "Construction started (Alsons Power)" },
  "pasig-city-hall": { date: "2025-01-13", title: "Contract signed with the Pasig City Hall Construction Consortium" },
  "hibale-dam": { date: "2024-10", title: "Contract awarded (NIA Region VII)" },
  "pmftc-tanauan": { date: "2022-12", title: "Contract secured (company news post, December 2022)" },
  "davao-wtp": { date: "2022-12", title: "Tapped by Apo Agua (company news post, December 2022)" },
};

async function main() {
  for (const [slug, m] of Object.entries(ADD)) {
    const row = await prisma.project.findFirst({ where: { slug, deletedAt: null } });
    if (!row) throw new Error(`not found: ${slug}`);
    const list = (Array.isArray(row.keyMilestones) ? row.keyMilestones : []) as Array<{ date: string; title: string; status: string }>;
    if (list.some((x) => x.title === m.title)) {
      console.log(`${slug}: already there`);
      continue;
    }
    const next = [...list, { ...m, status: "ACHIEVED" }].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    console.log(`${slug}: + ${m.date} ${m.title}`);
    if (APPLY) await prisma.project.update({ where: { id: row.id }, data: { keyMilestones: next as never } });
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
