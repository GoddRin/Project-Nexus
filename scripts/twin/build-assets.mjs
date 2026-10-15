/**
 * Twin v2 asset build: source GLBs from Blender to the compressed GLBs the app loads.
 *
 *   node scripts/twin/build-assets.mjs [--force] [--only=<asset id>] [--webp]
 *
 * For each assets-src/twin/export/<asset id>.glb (written by scripts/blender/twin/export_asset.py,
 * with its <asset id>.asset.json beside it):
 *   dedupe, weld, prune, resample animations, drop the material extensions that make a plain material
 *   "physical" (unless the sidecar asks for them), resize and compress textures, quantize and Meshopt-
 *   compress geometry, then write public/models/twin/<folder>/<name>.glb and the asset's row in
 *   components/twin/data/assets.json (docs/twin-v2/CONTRACTS.md section 4.1). The row's url carries
 *   ?v=<hash of the file>, so a changed file is a new address and an unchanged one stays cached.
 *
 * Textures: KTX2 when KTX-Software's `ktx` is on the PATH, otherwise WebP (`--webp` forces WebP).
 * Since P02e: ETC1S at the class's full size for everything, normal maps in ETC1S's normal mode (X in
 * red, green and blue, Y in alpha; the material is marked `twinNormalXY` in its extras and the app
 * rebuilds Z, components/twin/engine/normals.ts), except hero structures' trim sheets, which keep
 * UASTC for normal maps and base colour. A 1K sheet loses the fine detail; ETC1S at 2K keeps it at a
 * third of the size (the P02c texture trial).
 *
 * Shared textures (P02e): an image used by more than one placed asset (not by people, animals or
 * vehicles, which load as actors) is encoded once into public/models/twin/shared/<hash>.ktx2 and left
 * out of each file; the material lists it in its extras as `twinShared`, and the app loads it by
 * address, once, for every asset that uses it (components/twin/engine/assets.ts).
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
import { KHRTextureBasisu } from "@gltf-transform/extensions";
import { dedup, getTextureColorSpace, listTextureInfo, listTextureSlots, meshopt, prune, resample, textureCompress, weld } from "@gltf-transform/functions";
import { execFileSync } from "node:child_process";
import os from "node:os";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

/** Raise when a change to this script should rebuild every asset. */
const PIPELINE = 3;

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
/** Classes whose trim sheets keep the higher-quality UASTC mode for normal maps and base colour (P02e: everything else is ETC1S). */
const UASTC_CLASSES = new Set(["hero-structure"]);
/** Assets drawn as actors (components/twin/engine/actors.ts): they keep every texture in their own file. */
const ACTOR = /^(char|fauna|veh)\./;
/** ETC1S quality: the texture trial's setting, at which a 2K normal map is 0.73 MB with a mean error of 1.7 degrees. */
const ETC1S_QUALITY = 255;
const SHARED_DIR = path.join(OUT, "shared");
const KTX_CACHE = path.join(SRC, ".ktx-cache");

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

// ---- ETC1S encoding --------------------------------------------------------------------------------

/**
 * One image as an ETC1S KTX2 file at most `size` pixels on its longer side (sides a multiple of 4), with
 * mipmaps. `kind`: "normal" (normal mode: X in RGB, Y in alpha, Z rebuilt in the shader), "srgb" (colour)
 * or "linear" (roughness, metalness, occlusion). Results are cached by input, so an unchanged image is
 * not encoded again.
 */
async function encodeEtc1s(image, kind, size, uastc = false) {
  const lambda = kind === "normal" ? 4 : 1;
  const key = sha(Buffer.from(image), kind, String(size), String(ETC1S_QUALITY), uastc ? `uastc-rdo${lambda}` : "v1");
  const cached = path.join(KTX_CACHE, `${key.slice(0, 24)}.ktx2`);
  if (fs.existsSync(cached)) return fs.readFileSync(cached);
  const meta = await sharp(Buffer.from(image)).metadata();
  const k = Math.min(1, size / Math.max(meta.width, meta.height));
  const w = Math.max(4, Math.ceil((meta.width * k) / 4) * 4);
  const h = Math.max(4, Math.ceil((meta.height * k) / 4) * 4);
  const stats = await sharp(Buffer.from(image)).stats();
  const alpha = kind !== "normal" && !stats.isOpaque;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "twin-ktx-"));
  const src = path.join(dir, "in.png");
  const dst = path.join(dir, "out.ktx2");
  try {
    await sharp(Buffer.from(image)).resize(w, h, { fit: "fill", kernel: "lanczos3" }).ensureAlpha().png().toFile(src);
    const format = kind === "srgb" ? (alpha ? "R8G8B8A8_SRGB" : "R8G8B8_SRGB") : kind === "normal" ? "R8G8B8A8_UNORM" : alpha ? "R8G8B8A8_UNORM" : "R8G8B8_UNORM";
    const args = ["create", "--format", format, "--assign-tf", kind === "srgb" ? "srgb" : "linear", "--assign-primaries", kind === "srgb" ? "bt709" : "none"];
    if (uastc) args.push("--encode", "uastc", "--uastc-quality", "2", "--uastc-rdo", "--uastc-rdo-l", String(lambda), "--zstd", "18", "--generate-mipmap");
    else args.push("--encode", "basis-lz", "--qlevel", String(ETC1S_QUALITY), "--generate-mipmap");
    if (kind === "normal" && !uastc) args.push("--normal-mode", "--normalize");
    // (a 3-channel format from a 4-channel PNG: drop the alpha the PNG was given above)
    if (!alpha && kind !== "normal") args.push("--input-swizzle", "rgb1");
    args.push(src, dst);
    execFileSync("ktx", args, { stdio: "pipe" });
    const out = fs.readFileSync(dst);
    fs.mkdirSync(KTX_CACHE, { recursive: true });
    fs.writeFileSync(cached, out);
    return out;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** What a texture is, for encoding: from the slots that use it. */
function textureKind(texture) {
  const slots = listTextureSlots(texture);
  if (slots.includes("normalTexture")) return "normal";
  return getTextureColorSpace(texture) === "srgb" ? "srgb" : "linear";
}

// ---- shared textures --------------------------------------------------------------------------------

/**
 * The images used by more than one placed asset, by hash of the image: { kind, size, url }. Worked out
 * from every source before anything is built, so each asset knows which of its images are shared.
 */
async function findShared(sources) {
  const users = new Map();
  for (const fileName of sources) {
    const id = fileName.slice(0, -4);
    if (ACTOR.test(id)) continue;
    const sidePath = path.join(SRC, `${id}.asset.json`);
    if (!fs.existsSync(sidePath)) continue;
    const side = JSON.parse(fs.readFileSync(sidePath, "utf8"));
    if (UASTC_CLASSES.has(side.class) || !BUDGETS.classes[side.class]) continue;
    const doc = await io.readBinary(fs.readFileSync(path.join(SRC, fileName)));
    for (const texture of doc.getRoot().listTextures()) {
      const image = texture.getImage();
      if (!image) continue;
      // (a texture read through a transform cannot be shared as a plain image)
      if (listTextureInfo(texture).some((info) => info.getExtension("KHR_texture_transform"))) continue;
      const hash = sha(Buffer.from(image)).slice(0, 16);
      const entry = users.get(hash) ?? { ids: new Set(), kind: textureKind(texture), size: 0, samplers: new Set() };
      entry.ids.add(id);
      entry.size = Math.max(entry.size, BUDGETS.classes[side.class].texture);
      for (const info of listTextureInfo(texture)) entry.samplers.add(`${info.getTexCoord()}:${info.getWrapS()}:${info.getWrapT()}`);
      users.set(hash, entry);
    }
  }
  const shared = new Map();
  for (const [hash, entry] of users) {
    // (shared only where every use reads it the same way, so one texture object serves them all)
    if (entry.ids.size < 2 || entry.samplers.size !== 1) continue;
    shared.set(hash, { kind: entry.kind, size: entry.size, url: `/models/twin/shared/${hash}.ktx2`, file: path.join(SHARED_DIR, `${hash}.ktx2`), ids: [...entry.ids].sort() });
  }
  return shared;
}

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

async function buildAsset(id, glb, side, shared) {
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

  // Blender writes index-of-refraction and specular extensions on every material. They turn a
  // standard material into three's "physical" one, whose shader is larger to build and to run, for a
  // difference nobody can see on a drum. Kept only for an asset whose sidecar says "physical": true.
  if (!side.physical) {
    for (const extension of root.listExtensionsUsed()) {
      if (extension.extensionName === "KHR_materials_ior" || extension.extensionName === "KHR_materials_specular") extension.dispose();
    }
  }

  const size = budget.texture;
  await doc.transform(dedup(), weld(), prune({ keepExtras: true, keepAttributes: true }), ...(root.listAnimations().length ? [resample()] : []));
  if (ktx && UASTC_CLASSES.has(side.class)) {
    // (the normal map encoded here: gltf-transform leaves rate-distortion off for normal maps)
    for (const texture of root.listTextures()) {
      if (texture.getImage() && textureKind(texture) === "normal") texture.setImage(await encodeEtc1s(texture.getImage(), "normal", size, true)).setMimeType("image/ktx2");
    }
    doc.createExtension(KHRTextureBasisu).setRequired(true);
    // hero structures' trim sheets: UASTC keeps the normal map and the close-up colour clean; rate-distortion
    // at 4 (the P02c trial: a 2K normal map 1.6 MB against 1.9 to 3.2, mean error 1.7 degrees, as ETC1S)
    await doc.transform(
      ktx.toktx({ ...ktx.UASTC_DEFAULTS, mode: ktx.Mode.UASTC, encoder: sharp, slots: /^(normalTexture|baseColorTexture)$/, resize: [size, size], level: 2, rdo: true, rdoLambda: 4, zstd: 18 }),
      ktx.toktx({ ...ktx.ETC1S_DEFAULTS, mode: ktx.Mode.ETC1S, encoder: sharp, slots: /^(?!normalTexture$|baseColorTexture$).*$/, resize: [size, size], quality: 160 }),
    );
  } else if (ktx) {
    doc.createExtension(KHRTextureBasisu).setRequired(true);
    const sharedHere = new Set();
    for (const texture of root.listTextures()) {
      const image = texture.getImage();
      if (!image) continue;
      const kind = textureKind(texture);
      const hash = sha(Buffer.from(image)).slice(0, 16);
      const share = !ACTOR.test(id) && shared.get(hash);
      if (share) {
        // written once beside the files; this file's materials point at it instead of carrying it
        sharedHere.add(hash);
        for (const material of root.listMaterials()) {
          const list = [];
          for (const slot of ["baseColorTexture", "normalTexture", "occlusionTexture", "metallicRoughnessTexture", "emissiveTexture"]) {
            const get = { baseColorTexture: "getBaseColorTexture", normalTexture: "getNormalTexture", occlusionTexture: "getOcclusionTexture", metallicRoughnessTexture: "getMetallicRoughnessTexture", emissiveTexture: "getEmissiveTexture" }[slot];
            if (material[get]() !== texture) continue;
            const info = material[`${get}Info`]();
            const scale = slot === "normalTexture" ? material.getNormalScale() : slot === "occlusionTexture" ? material.getOcclusionStrength() : undefined;
            list.push({ url: share.url, slot, texCoord: info.getTexCoord(), wrapS: info.getWrapS(), wrapT: info.getWrapT(), ...(scale !== undefined && scale !== 1 ? { scale } : {}) });
            material[`set${get.slice(3)}`](null);
          }
          if (!list.length) continue;
          const extras = material.getExtras() ?? {};
          material.setExtras({ ...extras, twinShared: [...(extras.twinShared ?? []), ...list], ...(kind === "normal" ? { twinNormalXY: true } : {}) });
        }
        texture.dispose();
        continue;
      }
      texture.setImage(await encodeEtc1s(image, kind, size)).setMimeType("image/ktx2");
      if (texture.getURI()) texture.setURI(texture.getURI().replace(/\.[^.]+$/, "") + ".ktx2");
      if (kind === "normal") {
        for (const material of root.listMaterials()) {
          if (material.getNormalTexture() === texture) material.setExtras({ ...(material.getExtras() ?? {}), twinNormalXY: true });
        }
      }
    }
    if (!root.listTextures().length) for (const extension of root.listExtensionsUsed()) if (extension.extensionName === "KHR_texture_basisu") extension.dispose();
    if (sharedHere.size) side = { ...side, sharedTextures: [...sharedHere].sort() };
  } else {
    await doc.transform(
      textureCompress({ encoder: sharp, targetFormat: "webp", resize: [size, size], slots: /^normalTexture$/, quality: 92, effort: 80 }),
      textureCompress({ encoder: sharp, targetFormat: "webp", resize: [size, size], slots: /^(?!normalTexture$).*$/, quality: 82, effort: 80 }),
    );
  }
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: "medium" }), prune({ keepExtras: true, keepAttributes: true }));

  const tris = lods.map((node) => {
    if (!node) return 0;
    let n = 0;
    // (the moving parts of a level, such as wheels, are child nodes with meshes of their own)
    node.traverse((one) => {
      for (const prim of one.getMesh()?.listPrimitives() ?? []) n += (prim.getIndices() ? prim.getIndices().getCount() : prim.getAttribute("POSITION").getCount()) / 3;
    });
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
  // (download is a warning, not a failure: P02c set the line, and the slice's assets are still over it)
  if (budget.downloadMB && bytes.byteLength > budget.downloadMB * 1e6) console.warn(`${id}: ${(bytes.byteLength / 1e6).toFixed(2)} MB, download budget ${budget.downloadMB} MB`);
  const hash = sha(bytes).slice(0, 10);
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);

  // (shared textures are downloaded once for all their users; they are not part of this file's bytes)
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
const shared = ktx ? await findShared(sources) : new Map();
const sharedBytes = new Map();
for (const [hash, share] of shared) {
  // encoded from the first user's image (they are the same image) at the largest size any user's class allows
  const user = share.ids[0];
  const doc = await io.readBinary(fs.readFileSync(path.join(SRC, `${user}.glb`)));
  const texture = doc.getRoot().listTextures().find((t) => t.getImage() && sha(Buffer.from(t.getImage())).slice(0, 16) === hash);
  const bytes = await encodeEtc1s(texture.getImage(), share.kind, share.size);
  fs.mkdirSync(SHARED_DIR, { recursive: true });
  if (!fs.existsSync(share.file) || !fs.readFileSync(share.file).equals(bytes)) fs.writeFileSync(share.file, bytes);
  sharedBytes.set(hash, bytes.byteLength);
  console.log(`shared ${hash}  ${share.kind.padEnd(6)} ${kb(bytes.byteLength).padStart(8)}  used by ${share.ids.join(", ")}`);
}
// (shared files no longer used by anything are removed)
if (fs.existsSync(SHARED_DIR)) for (const f of fs.readdirSync(SHARED_DIR)) if (!shared.has(f.replace(/\.ktx2$/, ""))) fs.rmSync(path.join(SHARED_DIR, f));
const sharingOf = (id) => JSON.stringify([...shared].filter(([, s]) => s.ids.includes(id)).map(([h, s]) => [h, s.size, s.kind]));

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
  const key = sha(glb, sideText, JSON.stringify(BUDGETS.classes[side.class] ?? null), TEXTURES, String(PIPELINE), sharingOf(id));
  const was = state[id];
  const outFile = path.join(OUT, outPathFor(id).rel);
  if (!FORCE && was?.key === key && previous.has(id) && fs.existsSync(outFile) && fs.statSync(outFile).size === previous.get(id).bytes) {
    entries.set(id, previous.get(id));
    upToDate++;
    continue;
  }
  const t0 = Date.now();
  try {
    const { entry, problems } = await buildAsset(id, glb, side, shared);
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
  for (const f of fs.readdirSync(ZONES_DIR).filter((n) => n.endsWith(".json") && n !== "index.json" && !n.endsWith(".walk.json")).sort()) {
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
      // named views of the zone, known before the zone itself is fetched (?place=)
      cameras: zone.cameras ?? [],
    });
  }
}
const wroteZones = writeIfChanged(path.join(ZONES_DIR, "index.json"), JSON.stringify(zoneIndex, null, 1) + "\n");

// ---- report -----------------------------------------------------------------------------------------

const total = list.reduce((n, e) => n + e.bytes, 0);
const totalShared = [...sharedBytes.values()].reduce((n, b) => n + b, 0);
console.log(`${built} built, ${upToDate} up to date, ${list.length} assets, ${kb(total)} in all${shared.size ? ` and ${kb(totalShared)} in ${shared.size} shared textures` : ""}; textures as ${TEXTURES}${ktx ? "" : " (KTX-Software not found)"}`);
console.log(`assets.json ${wroteAssets ? "written" : "unchanged"}; zones/index.json ${wroteZones ? "written" : "unchanged"} (${zoneIndex.length} zones)`);
if (built === 0 && !wroteAssets && !wroteZones) console.log("Nothing to do.");
if (failures.length) {
  console.error(`\n${failures.length} problem(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
