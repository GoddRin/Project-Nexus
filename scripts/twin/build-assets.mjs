/**
 * Twin v2 asset build: source GLBs from Blender to the compressed GLBs the app loads.
 *
 *   node scripts/twin/build-assets.mjs [--force] [--only=<asset id>] [--webp]
 *
 * For each assets-src/twin/export/<asset id>.glb (written by scripts/blender/twin/export_asset.py,
 * with its <asset id>.asset.json beside it):
 *   dedupe, weld, prune, resample animations, resize and compress textures, quantize and Meshopt-
 *   compress geometry, then write public/models/twin/<folder>/<name>.glb and the asset's row in
 *   components/twin/data/assets.json (docs/twin-v2/CONTRACTS.md section 4.1). The row's url carries
 *   ?v=<hash of the file>, so a changed file is a new address and an unchanged one stays cached.
 *
 * Textures: KTX2 when KTX-Software's `ktx` is on the PATH (UASTC for normal maps and for the base
 * colour of people, vehicles, equipment and hero structures; ETC1S for everything else), otherwise
 * WebP. `--webp` forces WebP.
 *
 * It then rebuilds components/twin/data/zones/index.json from the zone files and checks that every
 * placement names a built asset and every credit id has a row in public/models/twin/CREDITS.md.
 *
 * Idempotent: a source is rebuilt only when it, its sidecar, its class budget, the texture mode or
 * this script's PIPELINE version changed (assets-src/twin/export/.build-state.json holds the
 * hashes). A second run in a row does no work. Exit code 1 if an asset is over budget or a check fails.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Logger, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, resample, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

/** Raise when a change to this script should rebuild every asset. */
const PIPELINE = 1;

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = path.join(ROOT, "assets-src", "twin", "export");
const OUT = path.join(ROOT, "public", "models", "twin");
const DATA = path.join(ROOT, "components", "twin", "data");
const STATE_FILE = path.join(SRC, ".build-state.json");
const ASSETS_FILE = path.join(DATA, "assets.json");
const ZONES_DIR = path.join(DATA, "zones");
const CREDITS_FILE = path.join(OUT, "CREDITS.md");

const FORCE = process.argv.includes("--force");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const BUDGETS = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "twin", "asset-budgets.json"), "utf8"));
/** Classes whose base colour is seen close up and gets the higher-quality KTX2 mode. */
const HERO_CLASSES = new Set(["named-person", "crew-person", "heavy-equipment", "light-vehicle", "hero-structure"]);

const sha = (...parts) => {
  const h = createHash("sha256");
  for (const p of parts) h.update(p);
  return h.digest("hex");
};
const readJson = (file, fallback) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback);
/** Write only when the content differs, so an unchanged build touches nothing. */
function writeIfChanged(file, text) {
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === text) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return true;
}
const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

// ---- texture mode ---------------------------------------------------------------------------------

let ktx = null;
if (!process.argv.includes("--webp")) {
  const cli = await import("@gltf-transform/cli");
  if (await cli.commandExists("ktx")) ktx = cli;
}
const TEXTURES = ktx ? "ktx2" : "webp";

// ---- one asset ------------------------------------------------------------------------------------

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;

function outPathFor(id) {
  const [prefix, ...rest] = id.split(".");
  const folder = BUDGETS.folders[prefix];
  if (!folder) throw new Error(`${id}: no folder for the prefix '${prefix}' (scripts/twin/asset-budgets.json "folders")`);
  return { rel: `${folder}/${rest.join(".")}.glb`, name: rest.join(".") };
}

async function buildAsset(id, glb, side) {
  const budget = BUDGETS.classes[side.class];
  if (!budget) throw new Error(`${id}: unknown class '${side.class}'`);
  const { rel, name } = outPathFor(id);
  const doc = await io.readBinary(glb);
  doc.setLogger(new Logger(Logger.Verbosity.WARN));
  const root = doc.getRoot();

  // LOD meshes: nodes named <name>_LOD<n>; the mesh takes the node's name (CONTRACTS section 2)
  const lods = [null, null, null];
  for (const node of root.listNodes()) {
    const m = /_LOD([012])$/.exec(node.getName());
    if (!m || !node.getMesh()) continue;
    if (node.getName() !== `${name}_LOD${m[1]}`) throw new Error(`${id}: node '${node.getName()}' should be named '${name}_LOD${m[1]}'`);
    node.getMesh().setName(node.getName());
    lods[Number(m[1])] = node;
  }
  if (!lods[0]) throw new Error(`${id}: no node named ${name}_LOD0`);

  const size = budget.texture;
  await doc.transform(dedup(), weld(), prune({ keepExtras: true }), ...(root.listAnimations().length ? [resample()] : []));
  if (ktx) {
    // UASTC keeps normal maps and close-up colour clean; ETC1S is a quarter of the size for the rest
    const hero = HERO_CLASSES.has(side.class);
    const uastc = hero ? /^(normalTexture|baseColorTexture)$/ : /^normalTexture$/;
    const etc1s = hero ? /^(?!normalTexture$|baseColorTexture$).*$/ : /^(?!normalTexture$).*$/;
    await doc.transform(
      ktx.toktx({ ...ktx.UASTC_DEFAULTS, mode: ktx.Mode.UASTC, encoder: sharp, slots: uastc, resize: [size, size], level: 2, rdo: true, zstd: 18 }),
      ktx.toktx({ ...ktx.ETC1S_DEFAULTS, mode: ktx.Mode.ETC1S, encoder: sharp, slots: etc1s, resize: [size, size], quality: 160 }),
    );
  } else {
    await doc.transform(
      textureCompress({ encoder: sharp, targetFormat: "webp", resize: [size, size], slots: /^normalTexture$/, quality: 92, effort: 80 }),
      textureCompress({ encoder: sharp, targetFormat: "webp", resize: [size, size], slots: /^(?!normalTexture$).*$/, quality: 82, effort: 80 }),
    );
  }
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: "medium" }), prune({ keepExtras: true }));

  const tris = lods.map((node) => {
    if (!node) return 0;
    let n = 0;
    for (const prim of node.getMesh().listPrimitives()) n += (prim.getIndices() ? prim.getIndices().getCount() : prim.getAttribute("POSITION").getCount()) / 3;
    return Math.round(n);
  });
  const materials = root.listMaterials().length;

  const problems = [];
  tris.forEach((n, level) => {
    const allowed = budget.tris[level] ?? (level === 2 ? budget.lod2Optional ?? null : null);
    if (n > 0 && allowed !== null && n > allowed) problems.push(`LOD${level} has ${n} triangles, budget ${allowed}`);
    if (n === 0 && budget.tris[level] !== null) problems.push(`LOD${level} is missing`);
  });
  if (materials > budget.materials) problems.push(`${materials} materials, budget ${budget.materials}`);
  if (!side.bounds) problems.push("no bounds in the sidecar");

  const bytes = await io.writeBinary(doc);
  const hash = sha(bytes).slice(0, 10);
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);

  /** @type {import("../../components/twin/data/types").AssetEntry} */
  const entry = {
    id,
    url: `/models/twin/${rel}?v=${hash}`,
    bytes: bytes.byteLength,
    tris,
    lodDistances: side.lodDistances,
    bounds: side.bounds,
    materials,
    credits: side.credits ?? [],
  };
  return { entry, problems };
}

// ---- run ------------------------------------------------------------------------------------------

const state = readJson(STATE_FILE, {});
const previous = new Map(readJson(ASSETS_FILE, []).map((e) => [e.id, e]));
const entries = new Map();
const failures = [];
let built = 0;
let upToDate = 0;

const sources = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter((f) => f.endsWith(".glb")).sort() : [];
for (const fileName of sources) {
  const id = fileName.slice(0, -4);
  if (ONLY && id !== ONLY) {
    if (previous.has(id)) entries.set(id, previous.get(id));
    continue;
  }
  const sidePath = path.join(SRC, `${id}.asset.json`);
  if (!fs.existsSync(sidePath)) {
    failures.push(`${id}: no ${id}.asset.json beside the source (export it with export_asset.py)`);
    continue;
  }
  const glb = fs.readFileSync(path.join(SRC, fileName));
  const sideText = fs.readFileSync(sidePath, "utf8");
  const side = JSON.parse(sideText);
  const key = sha(glb, sideText, JSON.stringify(BUDGETS.classes[side.class] ?? null), TEXTURES, String(PIPELINE));
  const was = state[id];
  const outFile = path.join(OUT, outPathFor(id).rel);
  if (!FORCE && was?.key === key && previous.has(id) && fs.existsSync(outFile) && fs.statSync(outFile).size === previous.get(id).bytes) {
    entries.set(id, previous.get(id));
    upToDate++;
    continue;
  }
  const t0 = Date.now();
  try {
    const { entry, problems } = await buildAsset(id, glb, side);
    entries.set(id, entry);
    state[id] = { key };
    built++;
    console.log(`built  ${id.padEnd(28)} ${kb(glb.byteLength).padStart(9)} -> ${kb(entry.bytes).padStart(8)}  tris ${entry.tris.join("/")}  ${TEXTURES}  ${Date.now() - t0} ms`);
    for (const p of problems) failures.push(`${id}: ${p}`);
  } catch (e) {
    failures.push(`${id}: ${e.message}`);
  }
}

// rows whose source is not on this machine are kept as long as their file is still there
for (const [id, entry] of previous) {
  if (entries.has(id)) continue;
  const file = path.join(ROOT, "public", entry.url.split("?")[0]);
  if (fs.existsSync(file) && !sources.includes(`${id}.glb`)) {
    entries.set(id, entry);
    console.log(`kept   ${id} (no source on this machine)`);
  }
}

const list = [...entries.values()].sort((a, b) => a.id.localeCompare(b.id));
const wroteAssets = writeIfChanged(ASSETS_FILE, JSON.stringify(list, null, 1) + "\n");
if (built > 0) {
  fs.mkdirSync(SRC, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 1) + "\n");
}

// ---- credits ----------------------------------------------------------------------------------------

const creditIds = new Set(
  (fs.existsSync(CREDITS_FILE) ? fs.readFileSync(CREDITS_FILE, "utf8") : "")
    .split("\n")
    .filter((l) => l.startsWith("|"))
    .map((l) => l.split("|")[1].trim().replace(/`/g, "")),
);
for (const e of list) {
  if (e.credits.length === 0) failures.push(`${e.id}: no credits (every asset needs a row in public/models/twin/CREDITS.md)`);
  for (const c of e.credits) if (!creditIds.has(c)) failures.push(`${e.id}: credit '${c}' has no row in public/models/twin/CREDITS.md`);
}

// ---- zone index -------------------------------------------------------------------------------------

const zoneIndex = [];
if (fs.existsSync(ZONES_DIR)) {
  for (const f of fs.readdirSync(ZONES_DIR).filter((n) => n.endsWith(".json") && n !== "index.json").sort()) {
    const zone = JSON.parse(fs.readFileSync(path.join(ZONES_DIR, f), "utf8"));
    if (`${zone.id}.json` !== f) failures.push(`zones/${f}: its id is '${zone.id}'`);
    const used = [...new Set(zone.placements.map((p) => p.asset))].sort();
    for (const a of used) if (!entries.has(a)) failures.push(`zone ${zone.id}: places '${a}', which is not a built asset`);
    if (zone.shell && !entries.has(zone.shell)) failures.push(`zone ${zone.id}: shell '${zone.shell}' is not a built asset`);
    zoneIndex.push({
      id: zone.id,
      location: zone.id.split(".")[0],
      title: zone.title,
      bounds: zone.bounds,
      streamIn: zone.streamIn,
      streamOut: zone.streamOut,
      shell: zone.shell,
      ...(zone.test ? { test: true } : {}),
      assets: used,
      placements: zone.placements.length,
    });
  }
}
const wroteZones = writeIfChanged(path.join(ZONES_DIR, "index.json"), JSON.stringify(zoneIndex, null, 1) + "\n");

// ---- report -----------------------------------------------------------------------------------------

const total = list.reduce((n, e) => n + e.bytes, 0);
console.log(`${built} built, ${upToDate} up to date, ${list.length} assets, ${kb(total)} in all; textures as ${TEXTURES}${ktx ? "" : " (KTX-Software not found)"}`);
console.log(`assets.json ${wroteAssets ? "written" : "unchanged"}; zones/index.json ${wroteZones ? "written" : "unchanged"} (${zoneIndex.length} zones)`);
if (built === 0 && !wroteAssets && !wroteZones) console.log("Nothing to do.");
if (failures.length) {
  console.error(`\n${failures.length} problem(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
