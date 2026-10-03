/**
 * Sets every Project Atlas record's client to what could be verified, clears the ones that could
 * not, corrects the SFEX expansion record to the company's own text and removes its duplicate.
 * (2026-10-03, at the user's request: "do not input the client if it's unverified".)
 *
 *   npx tsx --env-file=.env scripts/verify-atlas-clients.ts          # dry run
 *   npx tsx --env-file=.env scripts/verify-atlas-clients.ts --apply
 *
 * "Client" here is the party Sta. Clara's contract is with, as the company itself states it. On a
 * subcontract that is the main contractor (Bakun: Transfield, not the plant's owner).
 *
 * Sources (all read on 2026-10-03):
 *   [done]   https://staclara.com.ph/what-we-do/completed/<sector>/   the company's completed-works pages
 *   [ongoing] https://staclara.com.ph/what-we-do/ongoing/<sector>/    the company's ongoing-works pages
 *   [news]   a news post on staclara.com.ph (named beside the entry)
 *   [edcop]  edcop.ph project pages (EDCOP is the design subconsultant engaged by Sta. Clara, and
 *            names who awarded Sta. Clara the EPC contract)
 *   [press]  independent press / the client's own announcement (named beside the entry)
 *   null     nothing found that names Sta. Clara's client: left empty rather than guessed
 */
import fs from "fs";
import path from "path";
import { prisma } from "../lib/db/prisma";

const APPLY = process.argv.includes("--apply");

const CLIENTS: Record<string, [client: string | null, source: string]> = {
  "tumauini-hepp": ["Philnew Hydro Power Corporation (PHPC)", "[edcop] DED of 11.3MW Tumauini HEPP: \"PHPC has awarded to SCIC the EPC contract\"; confirmed by the user"],
  "mangima-hydro": ["Mangima Hydro Power Corporation (MHPC)", "[edcop] DED of 12 MW Mangima HEPP: \"MHPC has awarded to SCIC the EPC contract\""],
  "bakun-hydro": ["Transfield Philippines, Inc.", "[done] mining-and-tunnelling-works (Sta. Clara was subcontractor for civil and tunnel works)"],
  "botocan-hydro": ["CBK Hydro Power Consortium", "[done] renewable-energy-power-plants"],
  "caliraya-hydro": ["CBK Hydro Power Consortium", "[done] renewable-energy-power-plants"],
  "kalayaan-hydro": ["CBK Hydro Power Consortium", "[done] renewable-energy-power-plants"],
  "cabulig-hydro": ["Mindanao Energy Systems, Inc.", "[done] renewable-energy-power-plants"],
  "catuiran-hydro": ["Catuiran Hydro Power Corp.", "[done] renewable-energy-power-plants"],
  "loboc-hydro": ["Sta. Clara Power Corporation", "[done] renewable-energy-power-plants"],
  "manolo-fortich": ["Hedcor Bukidnon, Inc. / Aboitiz Power Corporation", "[done] renewable-energy-power-plants"],
  "sabangan-hydro": ["Hedcor Sabangan, Inc. / Aboitiz Power Corporation", "[done] renewable-energy-power-plants"],
  "siguil-hydro": ["Siguil Hydro Power Corporation", "[ongoing] renewable-energy-power-plants"],
  "kiangan-mini-hydro": ["Kiangan Mini Hydro Corporation", "[ongoing] renewable-energy-power-plants"],
  "pagudpud-wind": ["Bayog Wind Power Corporation (ACEN)", "[news] 160MW Balaoi Caunayan Wind Project Groundbreaking Ceremony (Jan 2022); PBBM Commissions Largest Wind Project (Aug 2023)"],
  "pagudpud-balaoi-wind": ["Bayog Wind Power Corporation (ACEN)", "[news] same two posts: the company treats Balaoi-Caunayan and the 160 MW Pagudpud wind farm as one project"],
  "marilao-substation": ["National Grid Corporation of the Philippines (NGCP)", "[ongoing] energy-power-plants-transmission-lines-and-substations"],
  "mariveles-500kv": ["National Grid Corporation of the Philippines (NGCP)", "[done] energy-power-plants-transmission-lines-and-substations"],
  "masinloc-bess": ["Fluence Energy, Inc.", "[ongoing] energy: Masinloc 20MW BESS Expansion Project"],
  "sta-rita-ccpp": ["First Philippine Balfour Beatty Inc.", "[done] site-development-works"],
  "pagbilao-unit3": ["Team Energy Corporation", "[done] site-development-works"],
  "la-mesa-wtp": ["Maynilad Water Services, Inc. (MWSI)", "[ongoing] water-and-wastewater-systems"],
  "magdiwang-reservoir": ["Maynilad Water Services, Inc. (MWSI)", "[ongoing] water-and-wastewater-systems"],
  "morong-wtp": ["Morong Power & Water Corporation", "[done] water-and-wastewater-systems"],
  "morong-wtp-network": ["Morong Power & Water Corporation", "[done] water-and-wastewater-systems"],
  "davao-wtp": ["Apo Agua Infrastructura, Inc.", "[news] Sta. Clara ... Tapped by Apo Agua for the Davao City Bulk Water Supply Project (Dec 2022)"],
  "eastbay-wtp": ["Manila Water Company, Inc.", "[press] ACCIONA: contract awarded by Manila Water to the ACCIONA - PrimeBMD - Sta. Clara consortium"],
  "maco-tmf": ["Apex Mining Company, Inc.", "[ongoing] mining-and-tunnelling-works"],
  "apex-mining-maco": ["Apex Mining Company, Inc.", "[done] mining-and-tunnelling-works (Maco tailings facility works for Apex)"],
  "slex-tr4": ["South Luzon Tollway Corporation", "[ongoing] roads-bridges-and-railways"],
  "upper-wawa-roads": ["Wawa Joint Venture Corp., Inc.", "[ongoing] roads-bridges-and-railways"],
  "lrt1-cavite": ["Bouygues Travaux Publics Philippines, Inc.", "[ongoing] roads-bridges-and-railways"],
  "nscr-cp02": ["Sumitomo Mitsui Construction Co. Ltd.", "[ongoing] roads-bridges-and-railways"],
  "sfex-tunnel": ["NLEX Corporation", "[done] roads-bridges-and-railways"],
  "sctex-pkg1": ["Obayashi Corporation", "[done] roads-bridges-and-railways"],
  "laoag-bongo": ["TOYO Construction Co., Ltd.", "[done] flood-control-and-dams (Sta. Clara was subcontractor)"],
  "prdp-bohol": ["Provincial Government of Bohol (Philippine Rural Development Project)", "[news] Bohol LGU & SCIC Breaks Ground for the Largest PRDP Project To Date (Feb 2025)"],
  "prdp-bohol-highway": ["Provincial Government of Bohol (Philippine Rural Development Project)", "[news] same post"],
  "morong-discovery": ["Bases Conversion and Development Authority (BCDA)", "[news] Morong Discovery Park Package 1 groundbreaking (Sep 2023)"],
  "morong-discovery-park": ["Bases Conversion and Development Authority (BCDA)", "[news] same post"],
  "jti-flex": ["JTI International Manufacturing Corporation", "[done] buildings"],
  "monde-nissin": ["Monde Nissin Corporation", "[done] buildings"],
  "sr-cebu": ["Kareila Management Corporation", "[done] buildings"],
  "sr-davao": ["Kareila Management Corporation", "[done] buildings"],
  "hq-mandaluyong": ["BC Manila", "[done] buildings (Highway 54 Plaza)"],
  "subic-flour-mill": ["Mabuhay Interflour Mill Inc.", "[done] buildings"],
  "maersk-calamba": ["Precos, Inc.", "[ongoing] buildings (\"Solid LF main building works\"); [news] Maersk-LF Logistics' South Luzon Mega Facility (Dec 2022)"],
  "pmftc-tanauan": ["Philip Morris Fortune Tobacco Corporation (PMFTC)", "[news] SCIC Secures Deal for PMFTC Batangas Factory Extension Project (Dec 2022)"],
  "pasig-city-hall": ["City Government of Pasig", "[press] contract signed 13 Jan 2025 with the Pasig City Hall Construction Consortium, of which Sta. Clara is a member"],

  "hibale-dam": ["National Irrigation Administration (NIA) Region VII", "[press] NIA Region VII and the Provincial Government of Bohol (July 2025): the zoned earthfill dam and structures were awarded to Sta. Clara in October 2024"],

  // Nothing found that names Sta. Clara's client. Left empty.
  "maladugao-hydro": [null, "[news] the Oct 2022 post names the partner (Investco BHPI Inc.) but not who awarded the contract"],
  "malitbog-siloo-hydro": [null, "no source found"],
  "kapangan-hepp": [null, "no source found linking Sta. Clara to a client (press names a different contractor for this plant)"],
  "kalayaan-wind-farm": [null, "Sta. Clara appears as Menard's client on this project; who Sta. Clara's own client is was not found"],
  "libmanan-wind": [null, "no source found"],
  "quezon-north-wind": [null, "no source found"],
  "balog-balog-dam": [null, "no source found"],
  "cagayan-corridor": [null, "no source found"],
  "bcib-interlink": [null, "press reports only a POSCO E&C - Sta. Clara bid (Sep 2025); no award found"],
  "mindanao-rail": [null, "no source found"],
  "hann-reserve": [null, "no source found"],
  "san-simon-rolling-mill": [null, "no source found"],
  "ups-clark-hub": [null, "a consultant's page says Sta. Clara is building the UPS warehouse at Clark; who the contract is with is not stated"],
};

/** The SFEX expansion, as the company's roads and tunnelling pages give it */
const SFEX = {
  keep: "sfex-tunnel",
  remove: "tipo-expressway", // a second copy of the same project (its text named a "Jalandoni Bridge" and twin tunnels)
  data: {
    name: "Subic Freeport Expressway (SFEX) Capacity Expansion Project",
    client: "NLEX Corporation",
    status: "COMPLETED",
    description:
      "Sole General Contractor to NLEX Corporation, completed March 2021. Scope: a 108 m road tunnel, the 180 m Jadjad Bridge, the 23.7 m Argonaut Bridge, earthworks, roadworks, drainage structures and electrical works. The company's tunnelling page gives the bypass tunnel as 12.3 m in diameter and 110 m long, built with excavation, rock bolting, wire mesh, shotcrete, steel ribs and concrete lining. Source: Sta. Clara International Corporation website (https://staclara.com.ph/what-we-do/completed/roads-bridges-and-railways/ and .../mining-and-tunnelling-works/), checked 3 October 2026.",
    municipality: "Hermosa, Bataan to the Subic Bay Freeport (SBMA)",
    location: "Hermosa, Bataan to SBMA",
    capacity: "108 m tunnel, 180 m and 23.7 m bridges",
    projectValue: null,
    projectEndDate: new Date("2021-03-01T00:00:00Z"),
    engineeringScope: [
      "Road tunnel (108 m; bypass tunnel 12.3 m diameter x 110 m long per the tunnelling page)",
      "Tunnel excavation, rock bolting, wire mesh, shotcrete, steel ribs and concrete lining",
      "Jadjad Bridge (180 m)",
      "Argonaut Bridge (23.7 m)",
      "Earthworks and roadworks",
      "Drainage structures",
      "Electrical works",
    ],
    keyMilestones: [{ date: "2021-03", title: "Completed (per the company's project list)", status: "ACHIEVED" }],
    metrics: { capacity: "108 m tunnel, 180 m and 23.7 m bridges" },
  },
};

async function main() {
  const rows = await prisma.project.findMany({ where: { deletedAt: null }, select: { id: true, slug: true, name: true, client: true, description: true } });
  const mine = (r: { description: string | null }) => /Source: Sta\. Clara International Corporation website/.test(r.description || "");
  let set = 0, cleared = 0, same = 0;
  const unknown: string[] = [];
  for (const r of rows) {
    if (r.slug === SFEX.remove) continue;
    const entry = CLIENTS[r.slug];
    if (!entry) {
      if (!mine(r)) unknown.push(r.slug); // records added today already carry the company's client
      continue;
    }
    const [client] = entry;
    if ((r.client ?? null) === client) { same++; continue; }
    console.log(`${client === null ? "CLEAR" : "SET  "} ${r.slug.padEnd(26)} ${JSON.stringify(r.client)} -> ${JSON.stringify(client)}`);
    if (client === null) cleared++; else set++;
    if (APPLY) await prisma.project.update({ where: { id: r.id }, data: { client } });
  }
  if (unknown.length) throw new Error(`records with no decision: ${unknown.join(", ")}`);
  console.log(`\nclients: ${set} corrected, ${cleared} cleared (unverified), ${same} already right`);

  const keep = rows.find((r) => r.slug === SFEX.keep);
  const dup = rows.find((r) => r.slug === SFEX.remove);
  console.log(`SFEX: correct "${keep?.name}"; remove duplicate "${dup?.name ?? "(already gone)"}"`);
  if (!APPLY) return console.log("\ndry run: nothing written. Re-run with --apply.");

  if (keep) await prisma.project.update({ where: { id: keep.id }, data: SFEX.data });
  if (dup) await prisma.project.update({ where: { id: dup.id }, data: { deletedAt: new Date() } });

  const all = await prisma.project.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  const file = path.join(process.cwd(), "lib", "data", "scicAtlasInitialProjects.json");
  const before = JSON.parse(fs.readFileSync(file, "utf8")) as Array<Record<string, unknown>>;
  const keys = Object.keys(before[0]);
  fs.writeFileSync(file, JSON.stringify(all.map((row) => Object.fromEntries(keys.map((k) => [k, (row as Record<string, unknown>)[k] ?? null]))), null, 2) + "\n");
  console.log(`written; JSON copy now has ${all.length} projects (was ${before.length})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
