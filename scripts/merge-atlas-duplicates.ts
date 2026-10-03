/**
 * Merges four pairs of records that describe the same project (2026-10-03). One record of each
 * pair is kept and rewritten from Sta. Clara's own text; the other is soft-deleted (restorable).
 *
 *   npx tsx --env-file=.env scripts/merge-atlas-duplicates.ts          # dry run
 *   npx tsx --env-file=.env scripts/merge-atlas-duplicates.ts --apply
 *
 * The old texts disagreed with the company and with each other (the two Bohol records gave the
 * road as 21.5 km and 24.5 km; the company's post says 12.656 km), and carried contract values,
 * turbine counts and dates that appear on no company page. Only what the company states is kept.
 * Coordinates are from OpenStreetMap; where the facility is not mapped the record says so.
 */
import fs from "fs";
import path from "path";
import { prisma } from "../lib/db/prisma";

const APPLY = process.argv.includes("--apply");
const CHECKED = "checked 3 October 2026";

const MERGES: Array<{ keep: string; remove: string; data: Record<string, unknown> }> = [
  {
    keep: "pagudpud-wind",
    remove: "pagudpud-balaoi-wind",
    data: {
      name: "Pagudpud Wind Farm (160 MW, Balaoi-Caunayan) - Civil Works Balance of Plant",
      category: "WIND_POWER",
      status: "COMPLETED",
      client: "Bayog Wind Power Corporation (ACEN)",
      description:
        `Civil works balance of plant for the 160 MW Pagudpud (Balaoi-Caunayan) wind farm, which the company describes as the Philippines' largest wind power plant project. Groundbreaking was held on 11 December 2021 with Bayog Wind Power Corporation; the wind farm was inaugurated on 26 May 2023 by President Ferdinand Marcos Jr. and is set to supply about 124,000 homes. The company does not publish the number of turbines, the road length or the contract value. Map position: the wind farm's access road in Barangay Balaoi, as mapped in OpenStreetMap. Source: Sta. Clara International Corporation news posts "160MW Balaoi Caunayan Wind Project Groundbreaking Ceremony" (January 2022) and "PBBM Commissions Largest Wind Project in the Philippines" (August 2023), ${CHECKED}.`,
      latitude: 18.61947,
      longitude: 120.85643,
      barangay: "Balaoi and Caunayan",
      municipality: "Pagudpud",
      province: "Ilocos Norte",
      location: "Balaoi and Caunayan, Pagudpud, Ilocos Norte",
      capacity: "160 MW",
      capacityMw: 160,
      projectValue: null,
      projectEndDate: new Date("2023-05-26T00:00:00Z"),
      engineeringScope: ["Civil works balance of plant (BOP)"],
      keyMilestones: [
        { date: "2021-12-11", title: "Groundbreaking ceremony", status: "ACHIEVED" },
        { date: "2023-05-26", title: "Inaugurated by President Ferdinand Marcos Jr.", status: "ACHIEVED" },
      ],
      metrics: { capacity: "160 MW" },
    },
  },
  {
    keep: "morong-discovery-park",
    remove: "morong-discovery",
    data: {
      name: "Morong Discovery Park Package 1 (Roads, Utilities and Preparatory Works)",
      status: "ONGOING",
      client: "Bases Conversion and Development Authority (BCDA)",
      description:
        `Roads, utilities and preparatory works package for Phase 1 of Morong Discovery Park (formerly Bataan Technology Park), a 100-hectare site that will house the Philippine Marine Corps' new headquarters under the AFP Modernization Program. Scope: site development works, the entire road network within the park, structures (guardhouses, watchtowers, elevated water tanks), two sewage treatment plants and other utility works. Groundbreaking was held on 16 August 2023. The company's post expected Phase 1 to be completed by October 2024; no completion has been published since. Map position: Morong Discovery Park as mapped in OpenStreetMap. Source: Sta. Clara International Corporation news post on the Morong Discovery Park Package 1 groundbreaking (September 2023), ${CHECKED}.`,
      latitude: 14.71045,
      longitude: 120.28576,
      barangay: "Mabayo",
      municipality: "Morong",
      province: "Bataan",
      location: "Morong Discovery Park, Mabayo, Morong, Bataan",
      capacity: "100-hectare site",
      projectValue: null,
      engineeringScope: [
        "Site development works",
        "The entire road network within the park",
        "Guardhouses, watchtowers and elevated water tanks",
        "Two sewage treatment plants",
        "Other utility works",
      ],
      keyMilestones: [{ date: "2023-08-16", title: "Groundbreaking ceremony (BCDA)", status: "ACHIEVED" }],
      metrics: { capacity: "100-hectare site" },
    },
  },
  {
    keep: "prdp-bohol-highway",
    remove: "prdp-bohol",
    data: {
      name: "Desamparados-Tabuan Farm-to-Market Road and Four Bridges (Bohol PRDP)",
      status: "ONGOING",
      client: "Provincial Government of Bohol (Philippine Rural Development Project)",
      description:
        `General contractor for the 12.656 km Desamparados-Tabuan farm-to-market road and four bridges connecting the towns of Calape and Antequera in the first district of Bohol, which the company calls the largest Philippine Rural Development Project (PRDP) to date at PHP 625 million. It is funded by a World Bank loan and implemented by the Local Government of Bohol through its Provincial Project Management and Implementation Unit. Groundbreaking was held on 23 January 2025. The company states no completion date. Map position: approximate, at Desamparados, Calape, one end of the road. Source: Sta. Clara International Corporation news post "Bohol LGU & SCIC Breaks Ground for the Largest PRDP Project To Date" (February 2025), ${CHECKED}.`,
      latitude: 9.88774,
      longitude: 123.87006,
      barangay: "Desamparados to Tabuan",
      municipality: "Calape and Antequera",
      province: "Bohol",
      location: "Desamparados (Calape) to Tabuan (Antequera), Bohol",
      capacity: "12.656 km road, four bridges",
      projectValue: "PHP 625 million",
      engineeringScope: ["12.656 km farm-to-market road: rehabilitation and construction", "Four bridges"],
      keyMilestones: [{ date: "2025-01-23", title: "Groundbreaking ceremony", status: "ACHIEVED" }],
      metrics: { capacity: "12.656 km road, four bridges", contractValue: "PHP 625 million" },
    },
  },
  {
    keep: "morong-wtp",
    remove: "morong-wtp-network",
    data: {
      name: "Morong Water Treatment Plant (25 MLD)",
      status: "COMPLETED",
      client: "Morong Power & Water Corporation",
      description:
        `Sole Contractor to Morong Power & Water Corporation for the 25 MLD Morong Water Treatment Plant: the treatment plant and pipeline distribution providing clear water to Morong town proper and to Subic Water. The company lists it under completed works and gives no completion date or contract value. Map position: approximate, at Barangay Sabang, Morong, which the company names (the plant itself is not mapped). Source: Sta. Clara International Corporation website (https://staclara.com.ph/what-we-do/completed/water-and-wastewater-systems/), ${CHECKED}.`,
      latitude: 14.68443,
      longitude: 120.26381,
      barangay: "Sabang",
      municipality: "Morong",
      province: "Bataan",
      location: "Sabang, Morong, Bataan",
      capacity: "25 MLD",
      projectValue: null,
      projectEndDate: null,
      engineeringScope: ["Water treatment plant (25 MLD)", "Pipeline distribution to Morong town proper and Subic Water"],
      keyMilestones: [],
      metrics: { capacity: "25 MLD" },
    },
  },
];

async function main() {
  for (const m of MERGES) {
    const keep = await prisma.project.findUnique({ where: { slug: m.keep } });
    const dup = await prisma.project.findUnique({ where: { slug: m.remove } });
    if (!keep) throw new Error(`missing ${m.keep}`);
    console.log(`KEEP   ${m.keep.padEnd(24)} "${keep.name}" -> "${m.data.name}"  (${keep.latitude},${keep.longitude} -> ${m.data.latitude},${m.data.longitude})`);
    console.log(`REMOVE ${m.remove.padEnd(24)} "${dup?.name ?? "(not found)"}"${dup?.deletedAt ? " (already removed)" : ""}`);
    if (!APPLY) continue;
    const region = keep.region;
    await prisma.project.update({
      where: { id: keep.id },
      data: {
        ...m.data,
        locationDescription: `${m.data.name} - ${m.data.location} (${region})`,
        // a photograph of the project itself is kept; a stock photograph is not
        featuredImage: keep.featuredImage?.startsWith("/project-images/") ? keep.featuredImage : dup?.featuredImage?.startsWith("/project-images/") ? dup.featuredImage : keep.featuredImage,
      } as never,
    });
    if (dup && !dup.deletedAt) await prisma.project.update({ where: { id: dup.id }, data: { deletedAt: new Date() } });
  }
  if (!APPLY) return console.log("\ndry run: nothing written. Re-run with --apply.");

  const all = await prisma.project.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  const file = path.join(process.cwd(), "lib", "data", "scicAtlasInitialProjects.json");
  const before = JSON.parse(fs.readFileSync(file, "utf8")) as Array<Record<string, unknown>>;
  const keys = Object.keys(before[0]);
  fs.writeFileSync(file, JSON.stringify(all.map((row) => Object.fromEntries(keys.map((k) => [k, (row as Record<string, unknown>)[k] ?? null]))), null, 2) + "\n");
  console.log(`\nwritten; JSON copy now has ${all.length} projects (was ${before.length})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
