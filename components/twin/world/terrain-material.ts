/**
 * The site-wide ground's materials (P03a): the terrain's near tiles, its far tiles, and the roads and
 * drains laid over it.
 *
 * Eight ground layers live in two array textures (scripts/twin/build-ground-textures.mjs): colour
 * with height, and normal. A pixel works out how much of each layer it wants (from the painted mask,
 * the slope, the lie of the land and some noise), keeps the two it wants most, and reads only those:
 * two colour and two normal reads whatever the number of layers. The two are blended by their own
 * height, so pebbles stand proud of mud and soil fills between stones, as world/ground.ts does for
 * the gate's patch.
 *
 * The near tiles are displaced on the graphics card from the location's height grid (a float
 * texture read texel by texel), and blend each vertex towards the next coarser level as it nears
 * the distance where that level takes over, so levels meet without a step (continuous level of
 * detail). Lighting reads a normal texture made from the full grid, so it does not change with the
 * level of detail.
 */
import * as THREE from "three/webgpu";
import {
  Fn,
  abs,
  attribute,
  cameraPosition,
  clamp,
  dot,
  float,
  int,
  ivec2,
  mix,
  mod,
  normalWorld,
  positionGeometry,
  positionWorld,
  select,
  smoothstep,
  texture,
  textureLoad,
  transformNormalToView,
  uniformArray,
  vec2,
  vec3,
  vec4,
  vertexColor,
  uv,
} from "three/tsl";
import { air } from "./air";

type F = THREE.Node<"float">;
type V2 = THREE.Node<"vec2">;
type V3 = THREE.Node<"vec3">;

/** Layer order of the arrays (data/ground.json `array.layers`). */
export const LAYER = { litter: 0, grass: 1, laterite: 2, mud: 3, gravel: 4, cobbles: 5, bedrock: 6, shotcrete: 7 } as const;
const COUNT = 8;
/** Colour correction per layer, as the patch's (world/ground.ts): the grass source is a dry lawn. */
const TINT: [number, number, number][] = [
  [0.95, 0.9, 0.8],
  [0.62, 1.0, 0.5],
  [1.06, 0.98, 0.92],
  [1, 0.97, 0.92],
  [0.98, 0.98, 1.0],
  [0.95, 0.93, 0.9],
  [0.9, 0.86, 0.82],
  [0.74, 0.74, 0.72],
];
/** How much each layer darkens when wet. */
const POROSITY = [0.75, 0.35, 0.85, 1, 0.55, 0.6, 0.45, 0.5];
/** Layers laid on steep faces: their texture is projected on the face, not from above. */
const STEEP_LAYERS = [LAYER.bedrock, LAYER.shotcrete];

export type GroundArrays = {
  colour: THREE.Texture;
  normal: THREE.Texture;
  layers: { id: string; sizeM: number; rough: number }[];
};

function prepare(arrays: GroundArrays) {
  for (const t of [arrays.colour, arrays.normal]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = t === arrays.colour ? 2 : 1;
    t.needsUpdate = true;
  }
}

/**
 * Noise from a small tiling texture: four independent channels of smooth value noise, 16 cells across
 * the texture. One read gives four noises at one scale; procedural noise (three's MaterialX Perlin)
 * cost about 7 ms a frame at the gate for the seven calls a terrain pixel made (P03a measurement).
 */
let noiseTexture: THREE.DataTexture | null = null;
const NOISE_CELLS = 16;
function noiseMap(): THREE.DataTexture {
  if (noiseTexture) return noiseTexture;
  const N = 256;
  const per = N / NOISE_CELLS;
  const data = new Uint8Array(N * N * 4);
  for (let c = 0; c < 4; c++) {
    const lattice = new Float32Array(NOISE_CELLS * NOISE_CELLS);
    let seed = 7919 * (c + 1);
    for (let k = 0; k < lattice.length; k++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      lattice[k] = seed / 4294967296;
    }
    const at = (i: number, j: number) => lattice[((j + NOISE_CELLS) % NOISE_CELLS) * NOISE_CELLS + ((i + NOISE_CELLS) % NOISE_CELLS)];
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const fx = x / per;
        const fy = y / per;
        const i = Math.floor(fx);
        const j = Math.floor(fy);
        const u = (fx - i) * (fx - i) * (3 - 2 * (fx - i));
        const v = (fy - j) * (fy - j) * (3 - 2 * (fy - j));
        const a = at(i, j);
        const b = at(i + 1, j);
        const d = at(i, j + 1);
        const e = at(i + 1, j + 1);
        data[(y * N + x) * 4 + c] = Math.round((a + (b - a) * u + (d - a) * v + (a - b - d + e) * u * v) * 255);
      }
  }
  noiseTexture = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
  noiseTexture.magFilter = THREE.LinearFilter;
  noiseTexture.minFilter = THREE.LinearMipmapLinearFilter;
  noiseTexture.generateMipmaps = true;
  noiseTexture.colorSpace = THREE.NoColorSpace;
  noiseTexture.needsUpdate = true;
  return noiseTexture;
}
/** Four noises (0..1) with cells of `cell` metres at world (x, z). */
const noise4 = (p: V2, cell: number) => texture(noiseMap(), p.div(cell * NOISE_CELLS));

/**
 * The two strongest of eight weights: their layer indices and their shares (summing to 1).
 * Written out as a chain of selects: graphics code has no sort.
 */
function topTwo(w: F[]): { a: THREE.Node<"int">; b: THREE.Node<"int">; wa: F; wb: F } {
  let ia: THREE.Node<"int"> = int(0);
  let va: F = w[0];
  for (let k = 1; k < COUNT; k++) {
    const better = w[k].greaterThan(va);
    ia = select(better, int(k), ia);
    va = select(better, w[k], va);
  }
  let ib: THREE.Node<"int"> = select(ia.equal(int(0)), int(1), int(0));
  let vb: F = select(ia.equal(int(0)), w[1], w[0]);
  for (let k = 0; k < COUNT; k++) {
    const better = w[k].greaterThan(vb).and(ia.notEqual(int(k)));
    ib = select(better, int(k), ib);
    vb = select(better, w[k], vb);
  }
  return { a: ia, b: ib, wa: va, wb: vb };
}

/**
 * The ground's look at a point: colour, roughness, occlusion and the world normal, from eight layer
 * weights. `base` is the surface's own world normal (smooth); `cavity` darkens hollows (0 open, 1 deep).
 */
export function groundLook(arrays: GroundArrays, weights: F[], base: V3, cavity: F) {
  const floats = (values: number[]) => {
    const arr = uniformArray(values, "float");
    return { element: (i: THREE.Node<"int">) => arr.element(i) as unknown as F };
  };
  const sizes = floats(arrays.layers.map((l) => 1 / l.sizeM));
  const rough = floats(arrays.layers.map((l) => l.rough));
  const tintArr = uniformArray(TINT.map((t) => new THREE.Vector3(...t)), "vec3");
  const tints = { element: (i: THREE.Node<"int">) => tintArr.element(i) as unknown as V3 };
  const porosity = floats(POROSITY);

  const top = topTwo(weights);
  const at = positionWorld;
  // two projections: from above, and on the face (along the face's level line and up it)
  const flat: V2 = at.xz;
  const side = vec2(base.z.negate(), base.x).add(vec2(1e-4, 0)).normalize();
  const onFace: V2 = vec2(dot(at.xz, side), at.y);
  const steepHere = base.y.lessThan(0.8);
  const projected = (layer: THREE.Node<"int">) => {
    const steepLayer = STEEP_LAYERS.map((s) => layer.equal(int(s))).reduce((a, b) => a.or(b));
    return { uv: select(steepLayer.and(steepHere), onFace, flat), face: steepLayer.and(steepHere) };
  };
  const pa = projected(top.a);
  const pb = projected(top.b);
  const uvA = pa.uv.mul(sizes.element(top.a));
  const uvB = pb.uv.mul(sizes.element(top.b));
  const crA = texture(arrays.colour, uvA).depth(top.a);
  const crB = texture(arrays.colour, uvB).depth(top.b);
  const nA = texture(arrays.normal, uvA).depth(top.a);
  const nB = texture(arrays.normal, uvB).depth(top.b);

  // shares sharpened by each layer's height: the taller wins the border
  const shareA: F = top.wa.mul(crA.a.mul(0.85).add(0.15).pow(2.2)).add(top.wa.mul(0.02));
  const shareB: F = top.wb.mul(crB.a.mul(0.85).add(0.15).pow(2.2)).add(top.wb.mul(0.02));
  const total = shareA.add(shareB).add(1e-4);
  const ka = shareA.div(total);
  const kb = shareB.div(total);

  // far off, the same layer again at a fifth of the scale, so its repeat does not show as a grid
  const distance = at.sub(cameraPosition).length();
  const farMix = smoothstep(8, 45, distance).mul(0.92);
  // (turned as well as scaled, so the two repeats do not line up)
  const turned = vec2(uvA.x.mul(0.8).sub(uvA.y.mul(0.6)), uvA.x.mul(0.6).add(uvA.y.mul(0.8)));
  const crFar = texture(arrays.colour, turned.mul(0.17).add(vec2(0.37, 0.71))).depth(top.a);

  const colourA = mix(crA.rgb, crFar.rgb, farMix).mul(tints.element(top.a));
  let colour: V3 = colourA.mul(ka).add(crB.rgb.mul(tints.element(top.b)).mul(kb));
  const height: F = crA.a.mul(ka).add(crB.a.mul(kb));

  // large-scale variation: patches of drier, lighter or darker, greener or browner ground
  const nMid = noise4(at.xz, 37);
  const nWide = noise4(at.xz, 131);
  const macro = nMid.r.mul(0.6).add(nWide.r.mul(0.4));
  const hue = nWide.g;
  colour = colour.mul(macro.mul(0.32).add(0.84)).mul(mix(vec3(1.04, 0.98, 0.9), vec3(0.94, 1.02, 1.04), hue));

  // normals: each layer's map on its own frame (from above: world x and z; on a face: its level line and up)
  const lean = (n: THREE.Node<"vec4">, face: THREE.Node<"bool">): V3 => {
    const bx = n.r.mul(2).sub(1);
    const by = n.a.mul(2).sub(1);
    const tangent = select(face, vec3(side.x, 0, side.y), vec3(1, 0, 0));
    const bitangent = select(face, vec3(0, 1, 0), vec3(0, 0, 1));
    return tangent.mul(bx).add(bitangent.mul(by));
  };
  const detail = smoothstep(140, 25, distance);
  let normal: V3 = base.add(lean(nA, pa.face).mul(ka).add(lean(nB, pb.face).mul(kb)).mul(detail.mul(1.1))).normalize();

  let roughness: F = rough.element(top.a).mul(ka).add(rough.element(top.b).mul(kb)).mul(height.mul(-0.25).add(1.1));
  let occlusion: F = mix(float(0.72), float(1), height.pow(0.6)).mul(cavity.mul(-0.45).add(1));
  const wetBy = porosity.element(top.a).mul(ka).add(porosity.element(top.b).mul(kb));
  const damp = air.wetness.mul(wetBy);
  colour = colour.mul(mix(float(1), float(0.5), damp));
  roughness = roughness.mul(mix(float(1), float(0.82), air.wetness));
  normal = normal.normalize();
  occlusion = occlusion.clamp(0, 1);
  return { colour, roughness: roughness.clamp(0.04, 1), normal, occlusion, distance };
}

// ---- the terrain's tiles ---------------------------------------------------------------------------

export type TerrainGridTextures = {
  /** Heights, one float a point, read texel by texel (no filtering). */
  heights: THREE.DataTexture;
  /** Normal x and z in red and green, hollowness in blue; filtered. */
  normals: THREE.DataTexture;
  n: number;
  spacing: number;
  min: [number, number];
};

export type LodRanges = { start: number[]; end: number[]; skirt: number[] };

/**
 * The vertex stage shared by the near and far tiles. A tile's geometry is a grid of points (x and z
 * of `position` are its grid indices, y is 1 on the skirt hanging from its edge); each copy carries
 * `tile`: the texel of its first corner, how many texels apart its points are, and its level.
 */
function tilePosition(grid: TerrainGridTextures, lods: LodRanges): V3 {
  const tile = attribute("tile", "vec4") as unknown as THREE.Node<"vec4">;
  const g: V2 = positionGeometry.xz;
  const skirt: F = positionGeometry.y;
  const step: F = tile.z;
  const last = float(grid.n - 1);
  const texel: V2 = tile.xy.add(g.mul(step));
  const height = (t: V2): F => textureLoad(grid.heights, ivec2(clamp(t, vec2(0), vec2(last)))).r;
  const h0 = height(texel);
  // a point between two of the coarser level's points (odd in x, z or both) slides to the mean of
  // those two as the coarser level nears: at the hand-over the two levels are the same surface
  const odd: V2 = mod(g, 2);
  const hm: F = height(texel.sub(odd.mul(step))).add(height(texel.add(odd.mul(step)))).mul(0.5);
  const xz: V2 = vec2(grid.min[0], grid.min[1]).add(texel.mul(grid.spacing));
  const level = int(tile.w);
  const start = uniformArray(lods.start, "float").element(level) as unknown as F;
  const end = uniformArray(lods.end, "float").element(level) as unknown as F;
  const depth = uniformArray(lods.skirt, "float").element(level) as unknown as F;
  const distance = vec3(xz.x, h0, xz.y).sub(cameraPosition).length();
  const morph = clamp(distance.sub(start).div(end.sub(start)), 0, 1);
  const h = mix(h0, hm, morph).sub(skirt.mul(depth));
  return vec3(xz.x, h, xz.y);
}

/** The terrain's own smooth normal and hollowness at this pixel, from the normal texture. */
function gridNormal(grid: TerrainGridTextures): { normal: V3; cavity: F } {
  const size = grid.n * grid.spacing;
  const tuv = positionWorld.xz.sub(vec2(grid.min[0], grid.min[1])).add(grid.spacing * 0.5).div(size);
  const t = texture(grid.normals, tuv);
  const nx = t.r.mul(2).sub(1);
  const nz = t.g.mul(2).sub(1);
  const ny = float(1).sub(nx.mul(nx)).sub(nz.mul(nz)).max(0.0001).sqrt();
  return { normal: vec3(nx, ny, nz).normalize(), cavity: t.b };
}

/**
 * The normal a pass needs: the full one with every layer's relief for the picture, the terrain's own
 * smooth one for the depth-and-normals pass that feeds ambient occlusion (engine/post.ts marks it with
 * `twinPrePass`), which then reads no layer textures at all. Occlusion at the scale of the samples'
 * radius does not see millimetre relief.
 */
function viewNormal(full: V3, plain: V3): V3 {
  const pick = (_: unknown, builder: { context: Record<string, unknown> }) => transformNormalToView(builder.context.twinPrePass ? plain : full);
  return (Fn as unknown as (f: typeof pick) => () => V3)(pick)();
}

/** Holes: squares where a ground patch asset is drawn instead (the gate slice). */
function outsideHoles(holes: [number, number, number, number][]): THREE.Node<"bool"> | null {
  if (!holes.length) return null;
  let keep: THREE.Node<"bool"> | null = null;
  for (const [x0, z0, x1, z1] of holes) {
    const p = positionWorld;
    const inside = p.x.greaterThan(x0).and(p.x.lessThan(x1)).and(p.z.greaterThan(z0)).and(p.z.lessThan(z1));
    keep = keep ? keep.and(inside.not()) : inside.not();
  }
  return keep;
}

export function nearTerrainMaterial(opts: {
  grid: TerrainGridTextures;
  lods: LodRanges;
  arrays: GroundArrays;
  mask: THREE.Texture;
  maskMin: [number, number];
  maskSize: number;
  holes: [number, number, number, number][];
}): THREE.MeshStandardNodeMaterial {
  prepare(opts.arrays);
  opts.mask.wrapS = opts.mask.wrapT = THREE.ClampToEdgeWrapping;
  const material = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  material.positionNode = tilePosition(opts.grid, opts.lods);
  const { normal: base, cavity } = gridNormal(opts.grid);

  const at = positionWorld;
  const m = texture(opts.mask, at.xz.sub(vec2(opts.maskMin[0], opts.maskMin[1])).div(opts.maskSize));
  const gravel: F = m.r;
  let laterite: F = m.g;
  const shotcrete: F = m.b;
  const cobbles: F = m.a;
  const natural = float(1).sub(gravel.add(laterite).add(shotcrete).add(cobbles)).max(0);
  // rock where the hill is steep (about 45 degrees and more), broken up
  const nFine = noise4(at.xz, 8);
  const nBroad = noise4(at.xz, 190);
  const nMid = noise4(at.xz, 47);
  const wobble = nFine.r.sub(0.5).mul(0.16);
  const steep = smoothstep(0.78, 0.6, base.y.add(wobble));
  const bareCut = laterite.mul(smoothstep(0.5, 0.3, base.y.add(wobble))).mul(0.6);
  laterite = laterite.sub(bareCut);
  const bedrock = natural.mul(steep).add(bareCut);
  const rest = natural.mul(steep.oneMinus());
  // open grass and closed forest floor in broad patches (P03e's land cover replaces the noise),
  // grass more likely on spurs and ridges, litter in hollows
  const open = smoothstep(0.5, 0.72, nBroad.b.add(nMid.b.mul(0.2)).sub(cavity.mul(0.6)).sub(0.06));
  const grass = rest.mul(open);
  const litter = rest.mul(open.oneMinus());
  // mud on level bare soil, in patches, more of it when wet
  const mudPatch = smoothstep(0.45, 0.7, nFine.g);
  const mud = laterite.mul(smoothstep(0.93, 0.99, base.y)).mul(mudPatch).mul(air.wetness.mul(0.6).add(0.4));
  laterite = laterite.sub(mud);

  const look = groundLook(opts.arrays, [litter, grass, laterite, mud, gravel, cobbles, bedrock, shotcrete], base, cavity);
  material.colorNode = vec4(look.colour, 1);
  material.roughnessNode = look.roughness;
  material.normalNode = viewNormal(look.normal, base);
  material.aoNode = look.occlusion;
  const keep = outsideHoles(opts.holes);
  if (keep) material.maskNode = keep;
  return material;
}

/**
 * The far tiles: no layer textures, a colour from the lie of the land (forest, grass, rock, soil) with
 * broad variation. Seen from hundreds of metres to kilometres, under haze.
 */
export function farTerrainMaterial(opts: { grid: TerrainGridTextures; lods: LodRanges; hole: number }): THREE.MeshStandardNodeMaterial {
  const material = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.95 });
  material.positionNode = tilePosition(opts.grid, opts.lods);
  const { normal, cavity } = gridNormal(opts.grid);
  const at = positionWorld;
  const forest = vec3(0.055, 0.085, 0.035);
  const forestLight = vec3(0.09, 0.12, 0.045);
  const grass = vec3(0.2, 0.22, 0.09);
  const rock = vec3(0.3, 0.27, 0.23);
  const soil = vec3(0.36, 0.2, 0.12);
  const nNear = noise4(at.xz, 23);
  const nFar = noise4(at.xz, 300);
  const canopy = nNear.r.mul(0.6).add(nNear.g.mul(0.4));
  let colour: V3 = mix(forest, forestLight, canopy);
  const open = smoothstep(0.5, 0.75, nFar.r.add(nFar.b.mul(0.3)).sub(cavity.mul(0.6)));
  colour = mix(colour, grass, open.mul(0.85));
  const steep = smoothstep(0.62, 0.45, normal.y.add(nNear.b.sub(0.5).mul(0.15)));
  colour = mix(colour, rock, steep);
  const scar = smoothstep(0.82, 0.9, nFar.g).mul(smoothstep(0.85, 0.7, normal.y));
  colour = mix(colour, soil, scar.mul(0.7));
  colour = colour.mul(cavity.mul(-0.35).add(1));
  material.colorNode = vec4(colour, 1);
  material.normalNode = transformNormalToView(normal);
  // (inside the near square the near tiles are drawn; the far tiles there are not drawn at all)
  const h = opts.hole;
  material.maskNode = abs(at.x).greaterThan(h - 0.01).or(abs(at.z).greaterThan(h - 0.01));
  return material;
}

/**
 * Roads and drains (one file of meshes, scripts/twin/build-terrain.mts): their layer weights come
 * with the vertices (laterite, gravel, concrete, mud in the colour channels), the texture coordinates
 * are metres across and along. Potholes are drawn here: in each cell of the running surface, maybe a
 * hollow that darkens with mud and holds water when it rains.
 */
export function civilMaterial(arrays: GroundArrays, opts: { potholes: boolean; halfWidth: number }): THREE.MeshStandardNodeMaterial {
  prepare(arrays);
  const material = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  const c = vertexColor();
  const across: F = uv().x;
  const along: F = uv().y;
  let mud: F = c.a;
  let laterite: F = c.r;
  let gravel: F = c.g;
  const concrete: F = c.b;
  let puddle: F = float(0);
  if (opts.potholes) {
    // one pothole cell every 3.5 m along and 1.6 m across, about one in three holding one
    const cell = vec2(along.div(3.5), across.div(1.6).add(10));
    const id = cell.floor();
    const f = cell.fract();
    // (one read of the noise at the cell's own spot gives the cell its four numbers)
    const cellNoise = texture(noiseMap(), id.mul(0.37).add(vec2(0.5)).div(NOISE_CELLS));
    const r1 = cellNoise.r;
    const r2 = cellNoise.g;
    const centre = vec2(r1, r2).mul(0.5).add(0.25);
    const d = f.sub(centre).mul(vec2(3.5, 1.6));
    const radius = cellNoise.b.mul(0.32).add(0.22);
    const present = smoothstep(0.55, 0.6, cellNoise.a);
    // (only on a running surface of soil and gravel: not on concrete, not in a drain)
    const onRoad = smoothstep(opts.halfWidth, opts.halfWidth - 0.4, abs(across)).mul(concrete.oneMinus()).mul(smoothstep(0.4, 0.7, c.r.add(c.g)));
    const hole = smoothstep(radius, radius.mul(0.55), d.length()).mul(present).mul(onRoad);
    mud = mud.add(hole.mul(0.8));
    laterite = laterite.mul(hole.mul(-0.8).add(1));
    gravel = gravel.mul(hole.mul(-0.8).add(1));
    const level = air.wetness.mul(1.2).sub(0.15);
    puddle = smoothstep(0.2, 0.5, hole.mul(level));
  }
  const base: V3 = normalWorld;
  const w0 = float(0);
  const look = groundLook(arrays, [w0, w0, laterite, mud, gravel, w0, w0, concrete], base, float(0));
  let colour = look.colour;
  colour = mix(colour, colour.mul(vec3(0.42, 0.38, 0.33)), puddle.mul(0.85));
  material.colorNode = vec4(colour, 1);
  material.roughnessNode = mix(look.roughness, float(0.035), puddle);
  material.normalNode = transformNormalToView(mix(look.normal, normalWorld, puddle).normalize());
  material.aoNode = look.occlusion;
  return material;
}
