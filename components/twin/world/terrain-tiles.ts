/**
 * The location's terrain (P03a): loading what scripts/twin/build-terrain.mts wrote, drawing it as
 * tiles that pick their level of detail each frame, and answering "how high is the ground here".
 *
 * Two grids: the near square (1 m between points, 1,024 m across) and the far grid (16 m, 16 km
 * across) drawn round it. Each is cut into square tiles; every tile is one copy of one of three
 * shared grids (one per level of detail), displaced on the graphics card from a float texture of
 * the heights (world/terrain-material.ts). So the whole terrain is six draws, and the heights are
 * the same numbers on the card and here: the sampler returns the surface the card draws at its
 * finest level, triangle for triangle (lib/twin/terrain.ts).
 *
 * Level of detail: a tile takes the finest level whose range its nearest point is inside; inside a
 * tile, each vertex slides towards the coarser level as it nears that range's end, so neighbours of
 * different levels meet without cracks (and a skirt hangs from every tile edge to be sure).
 *
 * Also here: roads, drains and weep holes laid over the ground (one file), the ground under the
 * roads (their surface, not the terrain's under it), and picking the terrain with a ray.
 */
import * as THREE from "three/webgpu";
import { MeshBVH, acceleratedRaycast } from "three-mesh-bvh";
import groundFile from "../data/ground.json";
import manifestFile from "../data/terrain/index.json";
import { decodeHeights, sampleHeightGrid, type HeightGrid, type TerrainLayer, type TerrainManifest } from "@/lib/twin/terrain";
import { assets } from "../engine/assets";
import type { AssetEntry } from "../data/types";
import { positionWorld, vec4 } from "three/tsl";
import { civilMaterial, farTerrainMaterial, nearTerrainMaterial, type GroundArrays, type LodRanges, type TerrainGridTextures } from "./terrain-material";

const MANIFESTS = manifestFile as unknown as Record<string, TerrainManifest | string>;

/** Whether a location has a built terrain. */
export function hasTerrain(location: string): boolean {
  return typeof MANIFESTS[location] === "object";
}

/** Levels of detail: for each grid, tile side in points, points apart per level, and the ranges. */
const NEAR_TILE = 64;
const FAR_TILE = 32;
const STEPS = [1, 2, 4];
/** A tile takes level k while its nearest point is within RANGE[k] metres; vertices finish sliding to the next level there. */
const NEAR_RANGE = [110, 330];
const FAR_RANGE = [1400, 3300];
const MORPH_FROM = 0.7;

const nextFrame = () => new Promise<void>((r) => setTimeout(r, 0));

async function fetchHeights(layer: TerrainLayer, signal: AbortSignal): Promise<Float32Array> {
  const res = await fetch(layer.url, { signal });
  if (!res.ok || !res.body) throw new Error(`terrain heights ${res.status}`);
  // (gzipped by the build; the browser's own stream does the work off the page's thread)
  const bytes = new Uint8Array(await new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
  await nextFrame();
  return decodeHeights(bytes, layer.n, layer.offset, layer.scale);
}

/**
 * Normal x and z and how hollow the ground is (0 open, 1 a gully), from the heights, in slices so
 * no frame waits long for it.
 */
async function normalTexture(grid: HeightGrid, hollowScale: number, signal: AbortSignal): Promise<THREE.DataTexture> {
  const { n, spacing, heights: h } = grid;
  const data = new Uint8Array(n * n * 4);
  const at = (i: number, j: number) => h[Math.min(n - 1, Math.max(0, j)) * n + Math.min(n - 1, Math.max(0, i))];
  const R = 3;
  for (let j0 = 0; j0 < n; j0 += 64) {
    if (signal.aborted) throw new DOMException("aborted", "AbortError");
    for (let j = j0; j < Math.min(n, j0 + 64); j++)
      for (let i = 0; i < n; i++) {
        const dx = (at(i + 1, j) - at(i - 1, j)) / (2 * spacing);
        const dz = (at(i, j + 1) - at(i, j - 1)) / (2 * spacing);
        const len = Math.hypot(dx, 1, dz);
        // hollowness: how far the ground lies below the mean of a ring round it
        const ring = (at(i - R, j) + at(i + R, j) + at(i, j - R) + at(i, j + R) + at(i - R, j - R) + at(i + R, j + R) + at(i - R, j + R) + at(i + R, j - R)) / 8;
        const hollow = Math.min(1, Math.max(0, (ring - h[j * n + i]) / hollowScale));
        const k = (j * n + i) * 4;
        data[k] = Math.round((-dx / len) * 127.5 + 127.5);
        data[k + 1] = Math.round((-dz / len) * 127.5 + 127.5);
        data[k + 2] = Math.round(hollow * 255);
        data[k + 3] = 255;
      }
    await nextFrame();
  }
  const texture = new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.colorSpace = THREE.NoColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function heightTexture(grid: HeightGrid): THREE.DataTexture {
  const texture = new THREE.DataTexture(grid.heights, grid.n, grid.n, THREE.RedFormat, THREE.FloatType);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** A tile's grid of `cells` x `cells`, with a skirt round it (position: x, z grid index; y 1 on the skirt). */
function tileGeometry(cells: number): THREE.BufferGeometry {
  const n = cells + 1;
  const positions: number[] = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) positions.push(i, 0, j);
  const index: number[] = [];
  // two triangles a cell, split from its lowest corner to its highest (as the sampler)
  for (let j = 0; j < cells; j++)
    for (let i = 0; i < cells; i++) {
      const a = j * n + i;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      index.push(a, c, d, a, d, b);
    }
  // the skirt: each edge's points again, hanging down, joined to the edge both ways round
  const edge: number[] = [];
  for (let i = 0; i < cells; i++) edge.push(i);
  for (let j = 0; j < cells; j++) edge.push(j * n + cells);
  for (let i = cells; i > 0; i--) edge.push(cells * n + i);
  for (let j = cells; j > 0; j--) edge.push(j * n);
  const first = positions.length / 3;
  for (const v of edge) positions.push(positions[v * 3], 1, positions[v * 3 + 2]);
  for (let e = 0; e < edge.length; e++) {
    const a = edge[e];
    const b = edge[(e + 1) % edge.length];
    const sa = first + e;
    const sb = first + ((e + 1) % edge.length);
    index.push(a, sa, b, b, sa, sb, a, b, sa, b, sb, sa);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(new Float32Array(positions.length).map((_, k) => (k % 3 === 1 ? 1 : 0)), 3));
  geometry.setIndex(index);
  return geometry;
}

type TileSet = {
  /** One draw per level: an instanced copy of the level's grid, its copies written each frame. */
  meshes: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.Material>[];
  attributes: THREE.InstancedBufferAttribute[];
  /** Per tile: first texel (i, j), its box. */
  tiles: { i: number; j: number; box: THREE.Box3 }[];
  ranges: number[];
  last: string[];
};

function makeTiles(grid: HeightGrid, tilePoints: number, ranges: number[], material: THREE.Material, skip: (i: number, j: number) => boolean, name: string): TileSet {
  const per = (grid.n - 1) / tilePoints;
  const tiles: TileSet["tiles"] = [];
  for (let tj = 0; tj < per; tj++)
    for (let ti = 0; ti < per; ti++) {
      const i = ti * tilePoints;
      const j = tj * tilePoints;
      if (skip(i, j)) continue;
      let lo = Infinity;
      let hi = -Infinity;
      for (let jj = j; jj <= j + tilePoints; jj++)
        for (let ii = i; ii <= i + tilePoints; ii++) {
          const v = grid.heights[jj * grid.n + ii];
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      const x0 = grid.min[0] + i * grid.spacing;
      const z0 = grid.min[1] + j * grid.spacing;
      const side = tilePoints * grid.spacing;
      tiles.push({ i, j, box: new THREE.Box3(new THREE.Vector3(x0, lo - 30, z0), new THREE.Vector3(x0 + side, hi + 1, z0 + side)) });
    }
  const meshes: TileSet["meshes"] = [];
  const attributes: THREE.InstancedBufferAttribute[] = [];
  STEPS.forEach((step, level) => {
    const base = tileGeometry(tilePoints / step);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = base.index;
    for (const [key, value] of Object.entries(base.attributes)) geometry.setAttribute(key, value);
    const attribute = new THREE.InstancedBufferAttribute(new Float32Array(tiles.length * 4), 4);
    attribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("tile", attribute);
    geometry.instanceCount = 0;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `terrain:${name}:${level}`;
    mesh.frustumCulled = false;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    meshes.push(mesh);
    attributes.push(attribute);
  });
  return { meshes, attributes, tiles, ranges, last: ["", "", ""] };
}

const frustum = new THREE.Frustum();
const projScreen = new THREE.Matrix4();

function updateTiles(set: TileSet, camera: THREE.Camera, mixed = false) {
  const counts = [0, 0, 0];
  const hashes = [2166136261, 2166136261, 2166136261];
  const p = camera.position;
  for (let t = 0; t < set.tiles.length; t++) {
    const tile = set.tiles[t];
    const d = tile.box.distanceToPoint(p);
    // (mixed: every tile drawn, the levels shared out, so each level has copies to compile with)
    if (!mixed && !frustum.intersectsBox(tile.box)) continue;
    const level = mixed ? t % 3 : d < set.ranges[0] ? 0 : d < set.ranges[1] ? 1 : 2;
    const k = counts[level]++ * 4;
    const array = set.attributes[level].array as Float32Array;
    array[k] = tile.i;
    array[k + 1] = tile.j;
    array[k + 2] = STEPS[level];
    array[k + 3] = level;
    hashes[level] = Math.imul(hashes[level] ^ (tile.i * 4099 + tile.j * 7 + 1), 16777619);
  }
  for (let level = 0; level < 3; level++) {
    const attribute = set.attributes[level];
    const geometry = set.meshes[level].geometry;
    // (written to the card only when the list changed)
    const key = `${counts[level]}:${hashes[level]}`;
    geometry.instanceCount = counts[level];
    if (key !== set.last[level]) {
      set.last[level] = key;
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, Math.max(4, counts[level] * 4));
      attribute.needsUpdate = true;
    }
  }
}

export type Terrain = {
  root: THREE.Group;
  /** Ground height (local Y) at a local position: the roads' surface where they lie, else the terrain's. */
  sampleY: (x: number, z: number) => number;
  /** The terrain alone, without roads (for checks). */
  terrainY: (x: number, z: number) => number;
  /** First hit of a ray on the terrain or a road. */
  raycast: (ray: THREE.Ray) => { distance: number; object: THREE.Object3D } | null;
  /** Pick each tile's level and drop those out of view. Called once a frame after the camera moves. */
  update: (camera: THREE.PerspectiveCamera) => void;
  /** Every tile at a level for a moment (a precompile of all three levels, and checks). */
  forceLevel: (level: number | null) => void;
  manifest: TerrainManifest;
  grids: { near: HeightGrid; far: HeightGrid };
  /**
   * For checks: the height the graphics card draws at each point (x, z), read back from a one-pixel
   * render straight down onto the terrain alone, as drawn for a camera standing there.
   */
  drawnHeights: (renderer: THREE.WebGPURenderer, points: [number, number][]) => Promise<number[]>;
  /** For cost measurements: the near tiles' level ranges, and a plain grey material in place of the ground's. */
  debug: { ranges: (r0: number, r1: number) => void; plain: (on: boolean) => void };
  dispose: () => void;
};

/** When each step of the last load finished, milliseconds after the page opened (for the bench). */
export const terrainTimings: Record<string, number> = {};

export async function loadTerrain(location: string, signal: AbortSignal): Promise<Terrain | null> {
  const manifest = MANIFESTS[location];
  if (typeof manifest !== "object") return null;
  const mark = (step: string) => (terrainTimings[step] = Math.round(performance.now()));
  mark("start");
  const [nearHeights, farHeights] = await Promise.all([fetchHeights(manifest.near, signal), fetchHeights(manifest.far, signal)]);
  mark("heights");
  const near: HeightGrid = { n: manifest.near.n, spacing: manifest.near.spacing, min: manifest.near.min, heights: nearHeights };
  const far: HeightGrid = { n: manifest.far.n, spacing: manifest.far.spacing, min: manifest.far.min, heights: farHeights };
  const nearNormals = await normalTexture(near, 1.5, signal);
  const farNormals = await normalTexture(far, 14, signal);
  mark("normals");

  const arrayInfo = (groundFile as unknown as { array: { cr: string; n: string; layers: GroundArrays["layers"] } }).array;
  const urls = [arrayInfo.cr, arrayInfo.n, manifest.mask.url];
  const textures = await Promise.all(urls.map((u) => assets.texture(u)));
  mark("textures");
  const releaseTextures = () => urls.forEach((u) => assets.releaseTexture(u));
  if (signal.aborted) {
    releaseTextures();
    throw new DOMException("aborted", "AbortError");
  }
  const arrays: GroundArrays = { colour: textures[0], normal: textures[1], layers: arrayInfo.layers };
  const mask = textures[2];

  const nearTextures: TerrainGridTextures = { heights: heightTexture(near), normals: nearNormals, n: near.n, spacing: near.spacing, min: near.min };
  const farTextures: TerrainGridTextures = { heights: heightTexture(far), normals: farNormals, n: far.n, spacing: far.spacing, min: far.min };
  const lodsOf = (ranges: number[], spacing: number, skirt: number[]): LodRanges => ({
    start: [ranges[0] * MORPH_FROM, ranges[1] * MORPH_FROM, 1e9],
    end: [ranges[0], ranges[1], 1e9 + 1],
    skirt: skirt.map((s) => s * spacing),
  });
  const nearMaterial = nearTerrainMaterial({
    grid: nearTextures,
    lods: lodsOf(NEAR_RANGE, near.spacing, [0.6, 1.2, 2.5]),
    arrays,
    mask,
    maskMin: manifest.mask.min,
    maskSize: manifest.mask.size * manifest.mask.texel,
    holes: manifest.holes,
  });
  const half = (near.n - 1) * near.spacing * 0.5;
  const farMaterial = farTerrainMaterial({ grid: farTextures, lods: lodsOf(FAR_RANGE, far.spacing, [0.4, 0.8, 1.6]), hole: half });
  const nearTiles = makeTiles(near, NEAR_TILE, NEAR_RANGE, nearMaterial, () => false, "near");
  // (the far tiles under the near square are not drawn)
  const farTiles = makeTiles(
    far,
    FAR_TILE,
    FAR_RANGE,
    farMaterial,
    (i, j) => {
      const x0 = far.min[0] + i * far.spacing;
      const z0 = far.min[1] + j * far.spacing;
      const side = FAR_TILE * far.spacing;
      return x0 >= -half - 1e-3 && x0 + side <= half + 1e-3 && z0 >= -half - 1e-3 && z0 + side <= half + 1e-3;
    },
    "far",
  );

  const root = new THREE.Group();
  root.name = "terrain";
  for (const mesh of [...nearTiles.meshes, ...farTiles.meshes]) root.add(mesh);

  // roads, drains, weep holes
  const civil = await assets.gltf({ id: `terrain.${location}.civil`, url: manifest.civil.url } as AssetEntry);
  if (signal.aborted) {
    releaseTextures();
    throw new DOMException("aborted", "AbortError");
  }
  mark("civil");
  const roadMeshes: THREE.Mesh[] = [];
  const civilMaterials: THREE.Material[] = [];
  civil.scene.updateMatrixWorld(true);
  // one material for roads and drains (a drain is concrete and mud, where no pothole is drawn), one for weep holes
  const groundWorks = civilMaterial(arrays, { potholes: true, halfWidth: 3 });
  const weepMaterial = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, side: THREE.DoubleSide });
  civilMaterials.push(groundWorks, weepMaterial);
  civil.scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const kind = mesh.name.replace(/_\d+$/, "");
    const material: THREE.Material = kind.startsWith("weep") ? weepMaterial : groundWorks;
    (mesh.material as THREE.Material).dispose();
    mesh.material = material;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    if (kind.startsWith("road")) roadMeshes.push(mesh);
  });
  root.add(civil.scene);

  // the roads' surfaces, for the ground under the roads and for rays
  const roadBvh = roadMeshes.map((mesh) => {
    const geometry = mesh.geometry as unknown as { boundsTree?: unknown };
    geometry.boundsTree = new MeshBVH(mesh.geometry);
    mesh.raycast = acceleratedRaycast;
    return mesh;
  });
  // where a road may lie: a coarse map of 8 m cells, so the ground away from roads costs no ray
  const CELL = 8;
  const roadCells = new Set<number>();
  for (const mesh of roadBvh) {
    const pos = mesh.geometry.getAttribute("position");
    const v = new THREE.Vector3();
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k).applyMatrix4(mesh.matrixWorld);
      roadCells.add(Math.floor(v.x / CELL) * 100003 + Math.floor(v.z / CELL));
    }
  }
  const down = new THREE.Raycaster();
  (down as THREE.Raycaster & { firstHitOnly?: boolean }).firstHitOnly = true;
  const origin = new THREE.Vector3();
  const DOWN = new THREE.Vector3(0, -1, 0);

  const terrainY = (x: number, z: number) => (Math.abs(x - 0) <= half && Math.abs(z) <= half ? sampleHeightGrid(near, x, z) : sampleHeightGrid(far, x, z));
  const sampleY = (x: number, z: number) => {
    const ground = terrainY(x, z);
    if (!roadCells.has(Math.floor(x / CELL) * 100003 + Math.floor(z / CELL))) return ground;
    origin.set(x, ground + 50, z);
    down.set(origin, DOWN);
    down.far = 100;
    const hit = down.intersectObjects(roadBvh, false)[0];
    return hit ? Math.max(hit.point.y, ground) : ground;
  };

  // rays against the terrain: stepped along until under the ground, then halved down to a centimetre
  const raycast = (ray: THREE.Ray) => {
    const p = new THREE.Vector3();
    let prev = 0;
    let t = 0;
    const max = 12000;
    let hitT = -1;
    for (let step = 0; t < max; step++) {
      ray.at(t, p);
      if (p.y < terrainY(p.x, p.z)) {
        let lo = prev;
        let hi = t;
        for (let k = 0; k < 24; k++) {
          const mid = (lo + hi) / 2;
          ray.at(mid, p);
          if (p.y < terrainY(p.x, p.z)) hi = mid;
          else lo = mid;
        }
        hitT = hi;
        break;
      }
      prev = t;
      // (small steps near the camera, longer ones far off)
      t += Math.max(0.5, t * 0.02);
    }
    const road = new THREE.Raycaster(ray.origin, ray.direction, 0, hitT > 0 ? hitT : max);
    (road as THREE.Raycaster & { firstHitOnly?: boolean }).firstHitOnly = true;
    const roadHit = road.intersectObjects(roadBvh, false)[0];
    if (roadHit) return { distance: roadHit.distance, object: roadHit.object };
    return hitT > 0 ? { distance: hitT, object: root } : null;
  };

  let forced: number | null = null;
  const update = (camera: THREE.PerspectiveCamera) => {
    camera.updateMatrixWorld();
    projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreen, camera.coordinateSystem);
    if (forced === -1) {
      updateTiles(nearTiles, camera, true);
      updateTiles(farTiles, camera, true);
      return;
    }
    if (forced !== null) {
      for (const set of [nearTiles, farTiles]) {
        const saved = set.ranges;
        set.ranges = forced === 0 ? [Infinity, Infinity] : forced === 1 ? [-1, Infinity] : [-1, -1];
        updateTiles(set, camera);
        set.ranges = saved;
      }
      return;
    }
    updateTiles(nearTiles, camera);
    updateTiles(farTiles, camera);
  };

  const dispose = () => {
    for (const mesh of [...nearTiles.meshes, ...farTiles.meshes]) mesh.geometry.dispose();
    nearMaterial.dispose();
    farMaterial.dispose();
    for (const m of civilMaterials) m.dispose();
    civil.scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    for (const t of [nearTextures.heights, nearTextures.normals, farTextures.heights, farTextures.normals]) t.dispose();
    releaseTextures();
  };

  const drawnHeights = async (renderer: THREE.WebGPURenderer, points: [number, number][]) => {
    const target = new THREE.RenderTarget(1, 1, { type: THREE.FloatType, depthBuffer: true });
    const probe = new THREE.MeshBasicNodeMaterial();
    probe.positionNode = nearMaterial.positionNode;
    // (kept positive: the output clamps below zero) 
    probe.colorNode = vec4(positionWorld.y.add(1000), 0, 0, 1);
    probe.toneMapped = false;
    const scene = new THREE.Scene();
    const meshes = nearTiles.meshes.map((m) => new THREE.Mesh(m.geometry, probe));
    meshes.forEach((m) => {
      m.frustumCulled = false;
      scene.add(m);
    });
    const camera = new THREE.OrthographicCamera(-0.001, 0.001, 0.001, -0.001, 0.05, 2000);
    const eye = new THREE.PerspectiveCamera();
    const out: number[] = [];
    const wasTarget = renderer.getRenderTarget();
    for (const [x, z] of points) {
      // the tiles as a person standing two metres up at the point would see them (the finest level there)
      eye.position.set(x, terrainY(x, z) + 2, z);
      eye.lookAt(x, terrainY(x, z), z + 1);
      eye.updateMatrixWorld();
      update(eye);
      // (close above: the tiles blend to their coarser level by distance from the camera that draws them)
      camera.position.set(x, terrainY(x, z) + 3, z);
      camera.up.set(0, 0, -1);
      camera.lookAt(x, -1000, z);
      camera.updateMatrixWorld();
      renderer.setRenderTarget(target);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(scene, camera);
      const px = (await renderer.readRenderTargetPixelsAsync(target, 0, 0, 1, 1)) as Float32Array;
      out.push(px[3] > 0 ? px[0] - 1000 : NaN);
    }
    renderer.setRenderTarget(wasTarget);
    target.dispose();
    probe.dispose();
    return out;
  };

  let plainMaterial: THREE.MeshStandardNodeMaterial | null = null;
  const debug = {
    ranges: (r0: number, r1: number) => {
      nearTiles.ranges = [r0, r1];
    },
    plain: (on: boolean) => {
      if (on && !plainMaterial) {
        plainMaterial = new THREE.MeshStandardNodeMaterial({ color: 0x777766, roughness: 1 });
        plainMaterial.positionNode = nearMaterial.positionNode;
      }
      for (const m of nearTiles.meshes) m.material = on ? plainMaterial! : nearMaterial;
    },
  };

  return {
    root,
    sampleY,
    drawnHeights,
    debug,
    terrainY,
    raycast,
    update,
    forceLevel: (level) => {
      forced = level;
    },
    manifest,
    grids: { near, far },
    dispose,
  };
}
