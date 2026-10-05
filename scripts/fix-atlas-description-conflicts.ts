/**
 * Two older descriptions contradicted their own records (2026-10-05). Dry run by default.
 *
 *   npx tsx --env-file=.env scripts/fix-atlas-description-conflicts.ts [--apply]
 *
 * - Bakun: the text said a 9.6 km headrace tunnel; the company's completed-works list (and the
 *   record's own tunnel length) says 10.5 km.
 * - Pagbilao Unit 3: the text said a 375 MW unit; the record (and the plant) is 420 MW.
 *
 * Nothing else is reworded: the other older descriptions are shown as "Listed" until each is
 * rewritten from a published source.
 */
import fs from "fs";
import path from "path";
import { prisma } from "../lib/db/prisma";

const APPLY = process.argv.includes("--apply");
const FIX: Record<string, [string, string]> = {
  "bakun-hydro": ["a massive 9.6-kilometer headrace tunnel", "a 10.5-kilometer headrace tunnel"],
  "pagbilao-unit3": ["for the 375 MW supercritical expansion unit", "for the 420 MW Unit 3 expansion"],
};

async function main() {
  for (const [slug, [from, to]] of Object.entries(FIX)) {
    const row = await prisma.project.findFirst({ where: { slug, deletedAt: null } });
    if (!row) throw new Error(`not found: ${slug}`);
    const text = row.description || "";
    if (!text.includes(from)) {
      console.log(`${slug}: already fixed or reworded, skipped`);
      continue;
    }
    console.log(`${slug}: "${from}" -> "${to}"`);
    if (APPLY) await prisma.project.update({ where: { id: row.id }, data: { description: text.replace(from, to) } });
  }
  if (!APPLY) return console.log("dry run: nothing written. Re-run with --apply.");

  const all = await prisma.project.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  const file = path.join(process.cwd(), "lib", "data", "scicAtlasInitialProjects.json");
  const before = JSON.parse(fs.readFileSync(file, "utf8")) as Array<Record<string, unknown>>;
  const keys = Object.keys(before[0]);
  fs.writeFileSync(file, JSON.stringify(all.map((row) => Object.fromEntries(keys.map((k) => [k, (row as Record<string, unknown>)[k] ?? null]))), null, 2) + "\n");
  console.log(`written; ${all.length} projects`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
