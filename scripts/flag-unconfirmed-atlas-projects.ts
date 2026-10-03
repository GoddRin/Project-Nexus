/**
 * Flags the Project Atlas records for which no public source confirms Sta. Clara's involvement
 * (2026-10-03, the user's decision: keep them, but say so). The line is added to the record's
 * description, which is what the assistant reads, so it says so when asked.
 *
 *   npx tsx --env-file=.env scripts/flag-unconfirmed-atlas-projects.ts [--apply]
 *
 * To clear a flag once a project is confirmed, remove the line from its description (Admin portal).
 */
import fs from "fs";
import path from "path";
import { prisma } from "../lib/db/prisma";

const APPLY = process.argv.includes("--apply");
export const UNCONFIRMED_NOTE =
  "Not confirmed by public sources: as of 3 October 2026, no public source (the company's website, news posts or press) confirms Sta. Clara's involvement in this project or names its client. The details in this record are unverified.";

const SLUGS = [
  "kapangan-hepp", "libmanan-wind", "balog-balog-dam", "malitbog-siloo-hydro", "quezon-north-wind",
  "mindanao-rail", "cagayan-corridor", "hann-reserve", "san-simon-rolling-mill",
];

async function main() {
  for (const slug of SLUGS) {
    const p = await prisma.project.findUnique({ where: { slug } });
    if (!p) throw new Error(`missing ${slug}`);
    const has = (p.description || "").includes("Not confirmed by public sources");
    console.log(`${has ? "already flagged" : "FLAG           "} ${slug.padEnd(24)} ${p.name}`);
    if (APPLY && !has) await prisma.project.update({ where: { id: p.id }, data: { description: `${(p.description || "").trim()} ${UNCONFIRMED_NOTE}`.trim() } });
  }
  if (!APPLY) return console.log("\ndry run: nothing written. Re-run with --apply.");
  const all = await prisma.project.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  const file = path.join(process.cwd(), "lib", "data", "scicAtlasInitialProjects.json");
  const keys = Object.keys((JSON.parse(fs.readFileSync(file, "utf8")) as Array<Record<string, unknown>>)[0]);
  fs.writeFileSync(file, JSON.stringify(all.map((row) => Object.fromEntries(keys.map((k) => [k, (row as Record<string, unknown>)[k] ?? null]))), null, 2) + "\n");
  console.log(`\nwritten; ${all.length} projects`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
