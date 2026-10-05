/**
 * Data-quality pass over the Project Atlas records (2026-10-05). Dry run by default.
 *
 *   npx tsx --env-file=.env scripts/apply-atlas-data-quality.ts [--apply]
 *
 * 1. Photographs: each project's own pictures from the company website
 *    (scripts/fetch-project-images.mjs wrote .cache/project-images.json). Stock photographs are
 *    removed: a project without a company photograph shows the neutral placeholder.
 * 2. Region names written two ways ("Region III" / "Region III (Central Luzon)") become one.
 * 3. Unverified figures on the older records are removed: contract values, "safe man-hours",
 *    workforce, generation and road-length numbers and dated milestones that appear on no company
 *    page. (49 of 52 records carried a "safe man-hours" figure.) Tumauini is left as it is: it is
 *    the user's own project and its figures are theirs.
 * 4. Completion dates and tunnel lengths the company DOES publish are filled in.
 * 5. Featured projects: 12 verified flagships (the spotlight shows one a day), down from 29.
 * 6. The duplicate project code and the two pairs of stacked markers.
 */
import fs from "fs";
import path from "path";
import { prisma } from "../lib/db/prisma";

const APPLY = process.argv.includes("--apply");
const PLACEHOLDER = "/project-images/scic-project-placeholder.png";
const KEEP_AS_IS = new Set(["tumauini-hepp"]);

const REGION: Record<string, string> = {
  "Region I": "Region I (Ilocos Region)",
  "Region I (Ilocos)": "Region I (Ilocos Region)",
  "Region II": "Region II (Cagayan Valley)",
  "Region III": "Region III (Central Luzon)",
  "Region IV-A": "Region IV-A (CALABARZON)",
  "Region VII": "Region VII (Central Visayas)",
  "Region X": "Region X (Northern Mindanao)",
  "Region XI": "Region XI (Davao Region)",
  NCR: "NCR (Metro Manila)",
};

/** Completion (YYYY-MM) as the company's completed-works pages give it */
const COMPLETED: Record<string, string> = {
  "bakun-hydro": "2000-04", "caliraya-hydro": "2004-08", "botocan-hydro": "2004-08", "kalayaan-hydro": "2004-08",
  "cabulig-hydro": "2012-12", "catuiran-hydro": "2018-12", "sabangan-hydro": "2015-05", "manolo-fortich": "2018-12",
  "mariveles-500kv": "2022-04", "sta-rita-ccpp": "1999-11", "pagbilao-unit3": "2014-10", "apex-mining-maco": "2019-01",
  "laoag-bongo": "2007-06", "monde-nissin": "2019-07", "jti-flex": "2018-09", "subic-flour-mill": "2017-02",
  "sr-cebu": "2013-10", "sr-davao": "2013-10", "hq-mandaluyong": "2006-08", "sctex-pkg1": "2007-12",
};
/** Tunnel lengths the company publishes (completed mining-and-tunnelling and renewable pages) */
const TUNNEL: Record<string, string> = {
  "bakun-hydro": "10.5 km", "manolo-fortich": "6 km", "catuiran-hydro": "3.2 km", "sabangan-hydro": "3.1 km", "botocan-hydro": "1.18 km",
};
const FEATURED = new Set([
  "tumauini-hepp", "pagudpud-wind", "toledo-solar", "sfex-tunnel", "bakun-hydro", "kalayaan-hydro",
  "marikina-north-stp", "mariveles-500kv", "maersk-calamba", "prdp-bohol-highway", "morong-discovery-park", "balingasag-thermal",
]);
const UNVERIFIED_METRICS = ["contractValue", "safeManHours", "workforcePeak", "generationOutput", "roadLength", "tunnelLength"];
const MOVE: Record<string, [number, number]> = {
  // (was on top of the Valenzuela interceptor marker; still within Valenzuela City, still "approximate")
  "meralco-hdd-pnr-north-1-batch-1": [14.6985, 120.9742],
  // (was on top of the Marikina North STP marker; the station is beside the plant)
  "marikina-north-pumping-station": [14.6689, 121.1024],
};

async function main() {
  const imgFile = path.join(process.cwd(), ".cache", "project-images.json");
  const images: Record<string, { page: string; images: string[] }> = fs.existsSync(imgFile) ? JSON.parse(fs.readFileSync(imgFile, "utf8")) : {};
  const rows = await prisma.project.findMany({ where: { deletedAt: null } });
  const n = { images: 0, stock: 0, region: 0, figures: 0, dates: 0, featuredOn: 0, featuredOff: 0, moved: 0, code: 0 };

  for (const r of rows) {
    const data: Record<string, unknown> = {};
    const verified = /Source: Sta\. Clara International Corporation/.test(r.description || "");

    const pics = images[r.slug]?.images ?? [];
    if (pics.length) {
      // a photograph the record already had of the project itself stays in front
      const own = r.featuredImage && r.featuredImage.startsWith("/project-images/scic-") && !r.featuredImage.includes("placeholder") ? [r.featuredImage] : [];
      const all = [...own, ...pics];
      if (r.featuredImage !== all[0] || JSON.stringify(r.gallery) !== JSON.stringify(all)) {
        data.featuredImage = all[0];
        data.gallery = all;
        n.images++;
      }
    } else if (/unsplash\.com/.test(r.featuredImage || "") || (r.gallery || []).some((g) => /unsplash\.com/.test(g))) {
      data.featuredImage = PLACEHOLDER;
      data.gallery = [];
      n.stock++;
    }

    if (r.region && REGION[r.region]) {
      data.region = REGION[r.region];
      n.region++;
    }

    if (!verified && !KEEP_AS_IS.has(r.slug)) {
      const metrics = { ...((r.metrics as Record<string, unknown>) || {}) };
      let changed = false;
      for (const k of UNVERIFIED_METRICS) if (k in metrics) { delete metrics[k]; changed = true; }
      if (TUNNEL[r.slug]) { metrics.tunnelLength = TUNNEL[r.slug]; changed = true; }
      const done = COMPLETED[r.slug];
      const milestones = done ? [{ date: done, title: "Completed (per the company's project list)", status: "ACHIEVED" }] : [];
      if (changed || r.projectValue || JSON.stringify(r.keyMilestones) !== JSON.stringify(milestones)) {
        data.metrics = metrics;
        data.projectValue = null;
        data.keyMilestones = milestones;
        n.figures++;
      }
      if (done) {
        const end = new Date(`${done}-01T00:00:00Z`);
        if (!r.projectEndDate || r.projectEndDate.getTime() !== end.getTime()) { data.projectEndDate = end; n.dates++; }
      }
    }

    const feat = FEATURED.has(r.slug);
    if (r.featured !== feat) { data.featured = feat; feat ? n.featuredOn++ : n.featuredOff++; }
    if (MOVE[r.slug] && (r.latitude !== MOVE[r.slug][0] || r.longitude !== MOVE[r.slug][1])) { data.latitude = MOVE[r.slug][0]; data.longitude = MOVE[r.slug][1]; n.moved++; }
    if (r.slug === "apex-mining-maco" && r.projectCode === "SCIC-MINE-01") { data.projectCode = "SCIC-MINE-02"; n.code++; }

    if (Object.keys(data).length && APPLY) await prisma.project.update({ where: { id: r.id }, data: data as never });
  }
  console.log(JSON.stringify(n));
  const missing = [...FEATURED].filter((s) => !rows.some((r) => r.slug === s));
  if (missing.length) throw new Error(`featured slugs not found: ${missing.join(", ")}`);
  if (!APPLY) return console.log("dry run: nothing written. Re-run with --apply.");

  const all = await prisma.project.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  const file = path.join(process.cwd(), "lib", "data", "scicAtlasInitialProjects.json");
  const before = JSON.parse(fs.readFileSync(file, "utf8")) as Array<Record<string, unknown>>;
  const keys = Object.keys(before[0]);
  fs.writeFileSync(file, JSON.stringify(all.map((row) => Object.fromEntries(keys.map((k) => [k, (row as Record<string, unknown>)[k] ?? null]))), null, 2) + "\n");
  console.log(`written; ${all.length} projects`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
