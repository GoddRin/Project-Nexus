/**
 * The asset loader: one GLTFLoader with Meshopt and KTX2 wired, a cache keyed by asset id, and
 * reference counting. `acquire` an asset to use it and `release` it when done; when the last user
 * lets go, its geometry, materials and textures are disposed and the GPU memory is returned.
 *
 * Assets are the GLBs written by scripts/twin/build-assets.mjs and listed in data/assets.json.
 * Each holds up to three meshes named <name>_LOD0.._LOD2 (CONTRACTS section 2).
 */
import * as THREE from "three/webgpu";
import { Fn, attribute, mat4, normalLocal, positionLocal, transformNormal } from "three/tsl";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { ASSETS } from "../data/site";
import type { AssetEntry } from "../data/types";
import { tierSettings } from "./tiers";

/**
 * One drawable piece of a LOD: a geometry with one material, and where it sits in the asset.
 * `instanced` is the same material for drawing many copies (engine/instances.ts).
 */
export type AssetPart = { geometry: THREE.BufferGeometry; material: THREE.Material; instanced: THREE.Material; matrix: THREE.Matrix4 };

/** Names of the four per-copy attributes that hold the columns of a copy's matrix. */
export const INSTANCE_COLUMNS = ["twinInstance0", "twinInstance1", "twinInstance2", "twinInstance3"] as const;

export type LoadedAsset = {
  entry: AssetEntry;
  /** Parts per level; null where the asset has no such level. */
  lods: [AssetPart[] | null, AssetPart[] | null, AssetPart[] | null];
  /** Bit mask of the levels present (bit 0 = LOD0), as engine/lod.ts wants it. */
  levels: number;
  /** Bounding sphere of LOD0 in the asset's own frame. */
  centre: THREE.Vector3;
  radius: number;
  textures: THREE.Texture[];
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
function instancedMaterial(material: THREE.Material): THREE.Material {
  const source = material as unknown as Record<string, unknown> & { isMeshPhysicalMaterial?: boolean; isMeshBasicMaterial?: boolean };
  const node: THREE.NodeMaterial = source.isMeshPhysicalMaterial ? new THREE.MeshPhysicalNodeMaterial() : source.isMeshBasicMaterial ? new THREE.MeshBasicNodeMaterial() : new THREE.MeshStandardNodeMaterial();
  // (the same copy three's renderer makes when it meets a classic material)
  const target = node as unknown as Record<string, unknown>;
  for (const key in source) {
    if (key !== "uuid" && key !== "type") target[key] = source[key];
  }
  const matrix = mat4(attribute(INSTANCE_COLUMNS[0], "vec4"), attribute(INSTANCE_COLUMNS[1], "vec4"), attribute(INSTANCE_COLUMNS[2], "vec4"), attribute(INSTANCE_COLUMNS[3], "vec4"));
  node.positionNode = Fn(() => {
    normalLocal.assign(transformNormal(normalLocal, matrix));
    return matrix.mul(positionLocal).xyz;
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

  const lods: LoadedAsset["lods"] = [null, null, null];
  const textures = new Set<THREE.Texture>();
  const instancedFor = new Map<THREE.Material, THREE.Material>();
  gltf.scene.traverse((node) => {
    // (the exporter writes the level as an extra; the name is the fallback)
    const named = /_LOD([012])$/.exec(String(node.userData?.name ?? node.name));
    const level = typeof node.userData?.lod === "number" ? node.userData.lod : named ? Number(named[1]) : -1;
    if (level < 0 || level > 2) return;
    const parts: AssetPart[] = [];
    node.traverse((child) => {
      const mesh = child as unknown as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as THREE.Material;
      let instanced = instancedFor.get(material);
      if (!instanced) instancedFor.set(material, (instanced = instancedMaterial(material)));
      parts.push({ geometry: mesh.geometry, material, instanced, matrix: mesh.matrixWorld.clone() });
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

  const box = new THREE.Box3(new THREE.Vector3(...entry.bounds.min), new THREE.Vector3(...entry.bounds.max));
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  bytesLoaded += entry.bytes;
  return {
    entry,
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
  for (const texture of asset.textures) {
    texture.dispose();
    (texture.image as { close?: () => void } | null)?.close?.();
  }
  bytesLoaded -= asset.entry.bytes;
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

  /** Assets in the cache and the download size of those that have finished loading. */
  stats(): { cached: number; bytes: number } {
    return { cached: slots.size, bytes: bytesLoaded };
  },
};
