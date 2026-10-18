/**
 * Copernicus GLO-30 (the 30 m world elevation model, free from the AWS open data registry) read
 * from its GeoTIFF tiles, for the terrain build (P03a).
 *
 * Tiles are one degree square, 3600 x 3600 samples, "pixel is point": sample (c, r) of the tile
 * whose corner is (lat0 + 1, lon0) lies at lon0 + c / 3600, lat0 + 1 - r / 3600. Heights are
 * metres above the EGM2008 geoid, which is mean sea level to within a metre here.
 *
 * GLO-30 is a surface model: it reads the top of the forest canopy, not the ground, and in a
 * narrow gorge a 30 m sample straddles both walls. Both make valley floors read high (P00a found
 * 10 to 40 m at the river). The terrain build corrects this near the works; see build-terrain.mts.
 *
 * Tiles are downloaded once into assets-src/twin/downloads/dem/ (git-ignored).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

export const DEM_DIR = "assets-src/twin/downloads/dem";
const BUCKET = "https://copernicus-dem-30m.s3.amazonaws.com";

type Tile = { lat0: number; lon0: number; w: number; h: number; z: Float32Array };

function tileName(lat0: number, lon0: number): string {
  const ns = lat0 >= 0 ? `N${String(lat0).padStart(2, "0")}` : `S${String(-lat0).padStart(2, "0")}`;
  const ew = lon0 >= 0 ? `E${String(lon0).padStart(3, "0")}` : `W${String(-lon0).padStart(3, "0")}`;
  return `Copernicus_DSM_COG_10_${ns}_00_${ew}_00_DEM`;
}

async function ensureTile(lat0: number, lon0: number): Promise<string> {
  const name = tileName(lat0, lon0);
  const file = path.join(DEM_DIR, `${name}.tif`);
  if (fs.existsSync(file)) return file;
  fs.mkdirSync(DEM_DIR, { recursive: true });
  console.log(`[dem] downloading ${name} ...`);
  const res = await fetch(`${BUCKET}/${name}/${name}.tif`);
  if (!res.ok) throw new Error(`[dem] ${name}: HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(`${file}.part`, bytes);
  fs.renameSync(`${file}.part`, file);
  return file;
}

async function readTile(lat0: number, lon0: number): Promise<Tile> {
  const file = await ensureTile(lat0, lon0);
  const image = sharp(file, { limitInputPixels: false });
  const meta = await image.metadata();
  if (meta.depth !== "float" || meta.channels !== 1) throw new Error(`[dem] ${file}: expected one float channel`);
  // (kept one float channel: by default sharp turns a single band into 8-bit colour)
  const raw = await image.pipelineColourspace("b-w").toColourspace("b-w").raw({ depth: "float" }).toBuffer();
  const z = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  return { lat0, lon0, w: meta.width!, h: meta.height!, z: new Float32Array(z) };
}

export type Dem = {
  /** Height in metres at a latitude and longitude, bicubic (Catmull-Rom) between samples. */
  height: (lat: number, lon: number) => number;
  /** The nearest sample, unsmoothed. */
  nearest: (lat: number, lon: number) => number;
};

/** Load every tile the box touches. */
export async function loadDem(box: { south: number; north: number; west: number; east: number }): Promise<Dem> {
  const tiles = new Map<string, Tile>();
  for (let lat0 = Math.floor(box.south - 0.01); lat0 <= Math.floor(box.north + 0.01); lat0++)
    for (let lon0 = Math.floor(box.west - 0.01); lon0 <= Math.floor(box.east + 0.01); lon0++) tiles.set(`${lat0},${lon0}`, await readTile(lat0, lon0));

  // a sample by global index: row counts down from the north, column east, in 1/3600 degree
  const sample = (gr: number, gc: number): number => {
    const lat = gr / 3600;
    const lon = gc / 3600;
    // a sample on a tile's south edge belongs to the tile below's north edge too: either will do
    let lat0 = Math.floor(lat - 1e-9);
    let lon0 = Math.floor(lon + 1e-9);
    let tile = tiles.get(`${lat0},${lon0}`);
    if (!tile) {
      lat0 = Math.floor(lat);
      tile = tiles.get(`${lat0},${lon0}`);
      if (!tile) {
        lon0 = Math.floor(lon - 1e-9);
        tile = tiles.get(`${Math.floor(lat - 1e-9)},${lon0}`) ?? tiles.get(`${lat0},${lon0}`);
      }
      if (!tile) throw new Error(`[dem] no tile for ${lat}, ${lon}`);
    }
    const r = Math.round((tile.lat0 + 1 - lat) * 3600);
    const c = Math.round((lon - tile.lon0) * 3600 * (tile.w / 3600));
    return tile.z[Math.min(tile.h - 1, Math.max(0, r)) * tile.w + Math.min(tile.w - 1, Math.max(0, c))];
  };

  const cr = (p0: number, p1: number, p2: number, p3: number, t: number) =>
    p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));

  const height = (lat: number, lon: number): number => {
    // global sample coordinates (rows north positive, so lat * 3600 increases northwards)
    const fr = lat * 3600;
    const fc = lon * 3600;
    const r1 = Math.floor(fr);
    const c1 = Math.floor(fc);
    const tr = fr - r1;
    const tc = fc - c1;
    const rows: number[] = [];
    for (let i = -1; i <= 2; i++) {
      const gr = r1 + i;
      rows.push(cr(sample(gr, c1 - 1), sample(gr, c1), sample(gr, c1 + 1), sample(gr, c1 + 2), tc));
    }
    return cr(rows[0], rows[1], rows[2], rows[3], tr);
  };
  const nearest = (lat: number, lon: number) => sample(Math.round(lat * 3600), Math.round(lon * 3600));
  return { height, nearest };
}
