/**
 * Route geometry for the line-type projects (expressway, railway, transmission line), from
 * OpenStreetMap through the public Overpass API. Free, no key.
 *
 *   node scripts/fetch-line-project-geometry.mjs            # report what OSM holds (writes nothing public)
 *   node scripts/fetch-line-project-geometry.mjs --write    # merge into public/data/atlas-flowlines.geojson
 *
 * Only routes whose two ends the company itself publishes are drawn, and each is the project's
 * corridor as mapped in OSM, not a claim about which metres Sta. Clara built. A route that OSM
 * does not hold under a recognisable name is left out rather than guessed.
 * Raw answers are kept in .cache/geo/lines-<slug>.json.
 */
import fs from "node:fs";
import path from "node:path";

const WRITE = process.argv.includes("--write");
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

// bbox = south,west,north,east
const ROUTES = [
  {
    slug: "sfex-tunnel", kind: "road", label: "Subic Freeport Expressway", year: 2021,
    q: `way["highway"~"motorway|trunk"]["name"~"Subic Freeport Expressway|Subic.Tipo",i](14.78,120.25,14.90,120.50);`,
    keep: (t) => t.highway === "motorway",
  },
  {
    slug: "mariveles-500kv", kind: "transmission", label: "Mariveles - Balsik 500 kV transmission line", year: 2022,
    q: `way["power"="line"]["voltage"~"500000"](14.42,120.42,14.92,120.62);`,
    // (the bounding box also holds four other 500 kV lines: only the one mapped under this name)
    keep: (t) => /Mariveles.Balsik/.test(t.name || ""),
  },
  {
    slug: "tuguegarao-lallo", kind: "transmission", label: "Tuguegarao - Lal-lo 230 kV line",
    q: `way["power"="line"]["voltage"~"230000"](17.58,121.60,18.25,121.85);`,
    // (OSM names no Tuguegarao - Lal-lo line here, only Santiago - Tuguegarao and unnamed ways: not drawn)
    keep: (t) => /Lal-?lo|Magapit/i.test(t.name || ""),
  },
  {
    slug: "nscr-cp02", kind: "rail", label: "North-South Commuter Railway (under construction)", year: 9999,
    q: `way["railway"~"rail|construction|proposed"]["name"~"North.South Commuter|NSCR|PNR Clark",i](14.78,120.79,14.87,120.95);`,
    // (the mapped ways run on past both ends: clipped to Bocaue station - Malolos station)
    clip: [120.812, 14.796, 120.928, 14.858],
  },
  {
    slug: "slex-tr4", kind: "road", label: "SLEX Toll Road 4 (under construction)", year: 9999,
    q: `way["highway"~"motorway|construction|proposed"]["name"~"Toll Road 4|TR4|South Luzon Expressway",i](13.88,121.28,14.10,121.65);`,
    // (only the part mapped as under construction or proposed: the toll road being built)
    keep: (t) => t.highway === "construction" || t.highway === "proposed",
    clip: [121.28, 13.88, 121.65, 14.10],
  },
];

async function overpass(query) {
  const body = `[out:json][timeout:60];(${query});out tags geom;`;
  let last;
  for (const url of OVERPASS) {
    try {
      const res = await fetch(url, { method: "POST", body: "data=" + encodeURIComponent(body), headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "scic-atlas-geometry/1.0" } });
      if (!res.ok) throw new Error(`${res.status}`);
      return await res.json();
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

const km = (line) => {
  let d = 0;
  for (let i = 1; i < line.length; i++) {
    const [x1, y1] = line[i - 1], [x2, y2] = line[i];
    const dx = (x2 - x1) * 111.32 * Math.cos(((y1 + y2) / 2) * Math.PI / 180), dy = (y2 - y1) * 110.57;
    d += Math.hypot(dx, dy);
  }
  return d;
};

const out = [];
for (const r of ROUTES) {
  const cache = path.join(".cache", "geo", `lines-${r.slug}.json`);
  let json;
  if (fs.existsSync(cache)) json = JSON.parse(fs.readFileSync(cache, "utf8"));
  else {
    json = await overpass(r.q);
    fs.mkdirSync(path.dirname(cache), { recursive: true });
    fs.writeFileSync(cache, JSON.stringify(json));
    await new Promise((res) => setTimeout(res, 1500));
  }
  const ways = (json.elements || []).filter((e) => e.type === "way" && e.geometry?.length > 1 && (!r.keep || r.keep(e.tags || {})));
  const inside = ([x, y]) => !r.clip || (x >= r.clip[0] && y >= r.clip[1] && x <= r.clip[2] && y <= r.clip[3]);
  const lines = ways
    .flatMap((w) => {
      // split each way where it leaves the clip box, keeping the runs inside it
      const runs = [[]];
      for (const p of w.geometry) {
        const c = [+p.lon.toFixed(5), +p.lat.toFixed(5)];
        if (inside(c)) runs[runs.length - 1].push(c);
        else if (runs[runs.length - 1].length) runs.push([]);
      }
      return runs;
    })
    .filter((l) => l.length > 1);
  const total = lines.reduce((a, l) => a + km(l), 0);
  const names = [...new Set(ways.map((w) => [w.tags?.name, w.tags?.operator, w.tags?.voltage, w.tags?.highway || w.tags?.railway || w.tags?.power, w.tags?.construction].filter(Boolean).join(" | ")))];
  console.log(`\n${r.slug}: ${ways.length} ways, ${total.toFixed(1)} km`);
  for (const n of names.slice(0, 12)) console.log("   ", n);
  out.push({ r, ways, lines });
}

if (WRITE) {
  const file = path.join("public", "data", "atlas-flowlines.geojson");
  const fc = JSON.parse(fs.readFileSync(file, "utf8"));
  const keep = new Set(JSON.parse(process.env.KEEP || "[]"));
  fc.features = fc.features.filter((f) => !f.properties?.project);
  for (const { r, lines } of out) {
    if (!keep.has(r.slug) || !lines.length) continue;
    fc.features.push({ type: "Feature", // year: when the works were completed (the timeline shows the route from then); 9999 = still being built
    properties: { kind: r.kind, name: r.label, project: r.slug, year: r.year, source: "OpenStreetMap contributors" }, geometry: { type: "MultiLineString", coordinates: lines } });
  }
  fs.writeFileSync(file, JSON.stringify(fc));
  console.log(`\nwritten ${file}: ${fc.features.length} features`);
}
