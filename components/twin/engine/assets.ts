/**
 * The asset loader: one GLTFLoader with Meshopt and KTX2 wired, a cache keyed by asset id, and
 * reference counting. `acquire` an asset to use it and `release` it when done; when the last user
 * lets go, its geometry, materials and textures are disposed and the GPU memory is returned.
 *
 * Assets are the GLBs written by scripts/twin/build-assets.mjs and listed in data/assets.json.
 * Each holds up to three meshes named <name>_LOD0.._LOD2 (CONTRACTS section 2).
 */
import * as THREE from "three/webgpu";
import {
  Fn,
  attribute,
  dFdx,
  dFdy,
  dot,
  float,
  log2,
  mat4,
  materialColor,
  materialEmissive,
  materialOpacity,
  materialRoughness,
  max,
  mix,
  normalLocal,
  normalWorld,
  positionLocal,
  sin,
  transformNormal,
  transformNormalToView,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { ASSETS } from "../data/site";
import type { AssetEntry } from "../data/types";
import { air } from "../world/air";
import { groundMaterial, groundTextureUrls } from "../world/ground";
import { tierSettings } from "./tiers";

/**
 * One drawable piece of a LOD: a geometry with one material, and where it sits in the asset.
 * `instanced` is the same material for drawing many copies (engine/instances.ts).
 */
export type AssetPart = { geometry: THREE.BufferGeometry; material: THREE.Material; instanced: THREE.Material; matrix: THREE.Matrix4 };

/** Names of the four per-copy attributes that hold the columns of a copy's matrix. */
export const INSTANCE_COLUMNS = ["twinInstance0", "twinInstance1", "twinInstance2", "twinInstance3"] as const;

/**
 * What an asset is, from its id prefix: it decides how its materials are finished.
 * ground: the blended ground material (world/ground.ts) in place of the file's own.
 * flora:  moves in the wind (the mesh carries `_wind` weights); cut-out leaves are softened at their edges.
 * built:  everything else.
 */
export type AssetKind = "ground" | "flora" | "built";

export function assetKind(id: string): AssetKind {
  const prefix = id.slice(0, id.indexOf("."));
  return prefix === "ground" ? "ground" : prefix === "flora" ? "flora" : "built";
}

export type LoadedAsset = {
  entry: AssetEntry;
  kind: AssetKind;
  /** Whether copies cast shadows: built things, trees and bananas. Undergrowth is seated by occlusion instead; its shadows are noise at a high price. */
  castsShadow: boolean;
  /** Parts per level; null where the asset has no such level. */
  lods: [AssetPart[] | null, AssetPart[] | null, AssetPart[] | null];
  /** Bit mask of the levels present (bit 0 = LOD0), as engine/lod.ts wants it. */
  levels: number;
  /** Bounding sphere of LOD0 in the asset's own frame. */
  centre: THREE.Vector3;
  radius: number;
  textures: THREE.Texture[];
  /** Addresses of textures loaded beside the file (the ground's layers), released with the asset. */
  shared: string[];
};

type Slot = { refs: number; promise: Promise<LoadedAsset>; loaded: LoadedAsset | null };

const TRANSCODER_PATH = "/vendor/twin/basis/";
const TEXTURE_SLOTS = ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap", "alphaMap"] as const;

const slots = new Map<string, Slot>();
let loader: GLTFLoader | null = null;
let ktx2: KTX2Loader | null = null;
let ktx2For: unknown = null;
let bytesLoaded = 0;

function getLoader(): GLTFLoader {
  if (!loader) {
    loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  return loader;
}

/** Scale a texture down to the tier's size cap. The file stays as built; only this copy is smaller. */
async function capTexture(texture: THREE.Texture, cap: number) {
  const image = texture.image as ImageBitmap | undefined;
  if (!image || typeof createImageBitmap !== "function" || !(image instanceof ImageBitmap)) return;
  const longest = Math.max(image.width, image.height);
  if (longest <= cap) return;
  const k = cap / longest;
  const small = await createImageBitmap(image, { resizeWidth: Math.max(1, Math.round(image.width * k)), resizeHeight: Math.max(1, Math.round(image.height * k)), resizeQuality: "high" });
  texture.image = small;
  texture.needsUpdate = true;
  image.close();
}

/** A file that has not arrived and decoded in this long is treated as failed, milliseconds. */
const LOAD_TIMEOUT_MS = 45_000;

/**
 * A copy of a glTF material that places each vertex by a per-copy matrix read from the geometry's
 * `twinInstance0..3` attributes.
 *
 * three's own InstancedMesh is not used: it ties every instanced mesh to a shader of its own (its
 * id is part of the shader cache key and its matrices are a uniform buffer of that mesh), so 15
 * draws meant 15 shader builds and 15 programs. On a browser that compiles shaders on the main
 * thread (Firefox) each of those held the page for about 90 ms. Reading the matrix from a named
 * attribute makes the shader depend only on the material and the vertex layout, so every draw of
 * a material, at every LOD and in every zone, shares one build and one program.
 */
function instancedMaterial(material: THREE.Material, kind: AssetKind, entry: AssetEntry, hasWind: boolean): THREE.Material {
  const source = material as unknown as Record<string, unknown> & { isNodeMaterial?: boolean; isMeshPhysicalMaterial?: boolean; isMeshBasicMaterial?: boolean; alphaTest?: number; name?: string };
  let node: THREE.NodeMaterial;
  if (source.isNodeMaterial) {
    // (already a node material of the twin's own making: the ground)
    node = material as THREE.NodeMaterial;
  } else {
    node = source.isMeshPhysicalMaterial ? new THREE.MeshPhysicalNodeMaterial() : source.isMeshBasicMaterial ? new THREE.MeshBasicNodeMaterial() : new THREE.MeshStandardNodeMaterial();
    // (the same copy three's renderer makes when it meets a classic material)
    const target = node as unknown as Record<string, unknown>;
    for (const key in source) {
      if (key !== "uuid" && key !== "type") target[key] = source[key];
    }
    if (!source.isMeshBasicMaterial) {
      // rain: surfaces darken and take a sheen, the more the more they face the sky
      const wet = air.wetness.mul(normalWorld.y.max(0).mul(0.6).add(0.4));
      node.colorNode = materialColor.mul(vec4(vec3(mix(1, kind === "flora" ? 0.86 : 0.7, wet)), 1));
      (node as THREE.MeshStandardNodeMaterial).roughnessNode = materialRoughness.mul(mix(1, kind === "flora" ? 0.92 : 0.5, wet));
      // lamp surfaces glow only while the lamps are lit
      if (source.name?.startsWith("EMIT_")) (node as THREE.MeshStandardNodeMaterial).emissiveNode = materialEmissive.mul(air.lamps);
    }
    if (kind === "flora" && entry.bounds.max[1] - entry.bounds.min[1] < 3.2 && !source.isMeshBasicMaterial) {
      // undergrowth takes most of its shading from straight up, as the ground does: a clump's own
      // normals point every way, and the undersides of its blades came out near black
      (node as THREE.MeshStandardNodeMaterial).normalNode = transformNormalToView(normalWorld.mul(0.35).add(vec3(0, 0.75, 0)).normalize());
    }
    if ((source.alphaTest ?? 0) > 0) {
      // cut-out leaves: with multisampling on, let the edge fade over the samples instead of stair-stepping;
      // and cut a little lower than the file says, because a scaled-down cut-out thins out and a far tree goes bare
      node.alphaToCoverage = true;
      node.alphaTest = Math.min(source.alphaTest ?? 0.5, 0.32);
      // the further the cut-out is scaled down, the more of each leaf averages away: make up for it
      const map = (source as { map?: THREE.Texture | null }).map;
      if (map?.isTexture) {
        const image = map.image as { width?: number; height?: number } | null;
        const texels = uv().mul(vec2(image?.width ?? 1024, image?.height ?? 1024));
        const level = log2(max(dot(dFdx(texels), dFdx(texels)), dot(dFdy(texels), dFdy(texels))).max(1)).mul(0.5);
        node.opacityNode = materialOpacity.mul(level.mul(0.42).add(1));
      }
    }
  }

  const matrix = mat4(attribute(INSTANCE_COLUMNS[0], "vec4"), attribute(INSTANCE_COLUMNS[1], "vec4"), attribute(INSTANCE_COLUMNS[2], "vec4"), attribute(INSTANCE_COLUMNS[3], "vec4"));
  const height = Math.max(0.2, entry.bounds.max[1] - entry.bounds.min[1]);
  node.positionNode = Fn(() => {
    normalLocal.assign(transformNormal(normalLocal, matrix));
    const placed = matrix.mul(positionLocal).xyz;
    if (kind !== "flora" || !hasWind) return placed;

    // wind: the whole plant leans and recovers in slow gusts, and its leaves flutter. `_wind` holds,
    // per vertex, how far it leans with the plant, how much it flutters, and a phase.
    const weights = attribute<"vec3">("_wind", "vec3") as unknown as THREE.Node<"vec3">;
    const root = (attribute<"vec4">(INSTANCE_COLUMNS[3], "vec4") as unknown as THREE.Node<"vec4">).xyz;
    const phase = root.x.mul(0.37).add(root.z.mul(0.21)).add(weights.z.mul(6.283));
    const t = air.windTime;
    const gust = sin(t.mul(0.31).add(root.x.mul(0.05)).add(root.z.mul(0.03))).mul(0.5).add(0.5);
    const strength = air.windStrength.mul(mix(0.35, 1, gust));
    const sway = sin(t.mul(1.1).add(phase)).mul(0.6).add(sin(t.mul(2.3).add(phase.mul(1.7))).mul(0.4)).add(0.35);
    const lean = sway.mul(weights.x).mul(strength).mul(float(0.045 * Math.pow(height, 0.7)));
    const flutter = sin(t.mul(7).add(placed.x.mul(3.1)).add(placed.z.mul(2.7)).add(placed.y.mul(1.9)))
      .mul(weights.y)
      .mul(strength)
      .mul(float(Math.min(0.035, height * 0.03)));
    return placed.add(vec3(air.windDir.x.mul(lean), flutter, air.windDir.y.mul(lean)));
  })();
  return node;
}

async function load(entry: AssetEntry): Promise<LoadedAsset> {
  // (a texture decoder that fails to start leaves the loader waiting for ever: seen when the
  // Basis transcoder's .wasm was answered with the sign-in page)
  let timer = 0;
  const late = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(`asset ${entry.id}: not loaded after ${LOAD_TIMEOUT_MS / 1000} s`)), LOAD_TIMEOUT_MS);
  });
  const gltf = await Promise.race([getLoader().loadAsync(entry.url), late]).finally(() => window.clearTimeout(timer));
  gltf.scene.updateMatrixWorld(true);

  const kind = assetKind(entry.id);
  const lods: LoadedAsset["lods"] = [null, null, null];
  const textures = new Set<THREE.Texture>();
  const instancedFor = new Map<THREE.Material, THREE.Material>();

  // the ground is drawn with the twin's blended material; its file carries only the mesh
  let ground: THREE.Material | null = null;
  const shared: string[] = [];
  if (kind === "ground") {
    const patch = entry.id.slice(entry.id.indexOf(".") + 1);
    const urls = groundTextureUrls(patch);
    shared.push(...urls);
    const loaded = await Promise.all(urls.map((url) => acquireTexture(url)));
    for (const t of loaded) textures.add(t);
    ground = groundMaterial(patch, loaded);
  }

  gltf.scene.traverse((node) => {
    // (the exporter writes the level as an extra; the name is the fallback)
    const named = /_LOD([012])$/.exec(String(node.userData?.name ?? node.name));
    const level = typeof node.userData?.lod === "number" ? node.userData.lod : named ? Number(named[1]) : -1;
    if (level < 0 || level > 2) return;
    const parts: AssetPart[] = [];
    node.traverse((child) => {
      const mesh = child as unknown as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = ground ?? (mesh.material as THREE.Material);
      let instanced = instancedFor.get(material);
      if (!instanced) instancedFor.set(material, (instanced = instancedMaterial(material, kind, entry, mesh.geometry.hasAttribute("_wind"))));
      parts.push({ geometry: mesh.geometry, material, instanced, matrix: mesh.matrixWorld.clone() });
      if (ground) return;
      for (const slot of TEXTURE_SLOTS) {
        const texture = (material as unknown as Record<string, THREE.Texture | null>)[slot];
        if (texture?.isTexture) textures.add(texture);
      }
    });
    if (parts.length) lods[level] = parts;
  });
  if (!lods[0]) throw new Error(`asset ${entry.id}: no LOD0 mesh in ${entry.url}`);

  const cap = tierSettings().textureSize;
  await Promise.all([...textures].map((t) => capTexture(t, cap)));
  // (a file's own textures tile, and are seen at glancing angles on roofs and walls)
  if (!ground) for (const t of textures) t.anisotropy = 4;

  const box = new THREE.Box3(new THREE.Vector3(...entry.bounds.min), new THREE.Vector3(...entry.bounds.max));
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  bytesLoaded += entry.bytes;
  return {
    entry,
    kind,
    castsShadow: kind === "built" || /^flora\.(acacia|banana)\./.test(entry.id),
    shared,
    lods,
    levels: (lods[0] ? 1 : 0) | (lods[1] ? 2 : 0) | (lods[2] ? 4 : 0),
    centre: sphere.center,
    radius: sphere.radius,
    textures: [...textures],
  };
}

function dispose(asset: LoadedAsset) {
  const seen = new Set<unknown>();
  for (const parts of asset.lods) {
    for (const part of parts ?? []) {
      if (!seen.has(part.geometry)) part.geometry.dispose();
      if (!seen.has(part.material)) part.material.dispose();
      if (!seen.has(part.instanced)) part.instanced.dispose();
      seen.add(part.geometry).add(part.material).add(part.instanced);
    }
  }
  const kept = new Set(asset.shared.map((url) => sharedTextures.get(url)?.texture));
  for (const texture of asset.textures) {
    if (kept.has(texture)) continue; // (a shared texture goes when its last user does, below)
    texture.dispose();
    (texture.image as { close?: () => void } | null)?.close?.();
  }
  for (const url of asset.shared) releaseTexture(url);
  bytesLoaded -= asset.entry.bytes;
}

// ---- textures loaded beside the files (KTX2), shared between assets ---------------------------------

const sharedTextures = new Map<string, { refs: number; promise: Promise<THREE.Texture>; texture: THREE.Texture | null }>();

function acquireTexture(url: string): Promise<THREE.Texture> {
  let slot = sharedTextures.get(url);
  if (!slot) {
    if (!ktx2) return Promise.reject(new Error("assets.configure() has not been called"));
    const created = { refs: 0, texture: null as THREE.Texture | null, promise: ktx2.loadAsync(url) as Promise<THREE.Texture> };
    created.promise.then(
      (texture) => {
        created.texture = texture;
        if (created.refs === 0) texture.dispose();
      },
      () => {
        if (sharedTextures.get(url) === created) sharedTextures.delete(url);
      },
    );
    sharedTextures.set(url, created);
    slot = created;
  }
  slot.refs++;
  return slot.promise;
}

function releaseTexture(url: string) {
  const slot = sharedTextures.get(url);
  if (!slot || --slot.refs > 0) return;
  sharedTextures.delete(url);
  slot.texture?.dispose();
}

export const assets = {
  /** Tell the loader which renderer it serves, so KTX2 textures are transcoded to a format it has. */
  configure(renderer: THREE.WebGPURenderer) {
    if (ktx2For === renderer) return;
    ktx2?.dispose();
    ktx2 = new KTX2Loader().setTranscoderPath(TRANSCODER_PATH);
    ktx2.detectSupport(renderer as unknown as Parameters<KTX2Loader["detectSupport"]>[0]);
    ktx2For = renderer;
    getLoader().setKTX2Loader(ktx2);
  },

  /** Load an asset, or share the copy already loaded. Every `acquire` needs one `release`. */
  acquire(id: string): Promise<LoadedAsset> {
    let slot = slots.get(id);
    if (!slot) {
      const entry = ASSETS.get(id);
      if (!entry) return Promise.reject(new Error(`unknown asset '${id}'`));
      const created: Slot = { refs: 0, loaded: null, promise: load(entry) };
      created.promise.then(
        (asset) => {
          created.loaded = asset;
          // released while it was still loading
          if (created.refs === 0) dispose(asset);
        },
        () => {
          if (slots.get(id) === created) slots.delete(id);
        },
      );
      slots.set(id, created);
      slot = created;
    }
    slot.refs++;
    return slot.promise;
  },

  /** Let go of an asset. The last release disposes its geometry, materials and textures. */
  release(id: string) {
    const slot = slots.get(id);
    if (!slot) return;
    if (--slot.refs > 0) return;
    slots.delete(id);
    if (slot.loaded) dispose(slot.loaded);
  },

  /** A KTX2 texture that is not part of an asset file. Every `texture` needs one `releaseTexture`. */
  texture: acquireTexture,
  releaseTexture,

  /** Assets in the cache and the download size of those that have finished loading. */
  stats(): { cached: number; bytes: number } {
    return { cached: slots.size, bytes: bytesLoaded };
  },
};
