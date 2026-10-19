/**
 * Checks LOD selection (components/twin/engine/lod.ts): the right level at each distance, levels an
 * asset lacks, the view scale, and hysteresis at a boundary.
 *
 *   npx tsx scripts/twin/check-lod.mts
 */
import { CULLED, LOD_REFERENCE, lodScale, selectLod } from "../../components/twin/engine/lod";

let failed = 0;
function check(name: string, pass: boolean, detail = "") {
  if (!pass) failed++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

const ALL = 0b111;
const NO_LOD2 = 0b011;
const at = (d: number, levels = ALL, from = 0) => selectLod(from, d, 12, 40, 900, levels);

check("levels by distance", at(5) === 0 && at(20) === 1 && at(100, ALL, 1) === 2 && at(2000, ALL, 2) === CULLED, `5 m ${at(5)}, 20 m ${at(20)}, 100 m ${at(100, ALL, 1)}, 2000 m ${at(2000, ALL, 2)}`);
check("an asset with no LOD2 is culled where LOD2 would begin", selectLod(1, 60, 12, 40, 40, NO_LOD2) === CULLED && selectLod(0, 30, 12, 40, 40, NO_LOD2) === 1);

// walking out across the 12 m boundary and back: the switch out comes late, the switch back comes early
const out: number[] = [];
let level = 0;
for (let d = 10; d <= 14; d += 0.25) out.push((level = selectLod(level, d, 12, 40, 900, ALL)));
const switchOut = 10 + out.indexOf(1) * 0.25;
const back: number[] = [];
for (let d = 14; d >= 10; d -= 0.25) back.push((level = selectLod(level, d, 12, 40, 900, ALL)));
const switchBack = 14 - back.indexOf(0) * 0.25;
check("hysteresis at the LOD1 boundary", switchOut > 12.5 && switchBack < 11.5, `LOD1 from ${switchOut} m going out, LOD0 again from ${switchBack} m coming back (boundary 12 m)`);

// sitting exactly on a boundary and jittering by a few centimetres never flips
let flips = 0;
level = selectLod(0, 12, 12, 40, 900, ALL);
for (let i = 0; i < 200; i++) {
  const next = selectLod(level, 12 + Math.sin(i * 1.7) * 0.3, 12, 40, 900, ALL);
  if (next !== level) flips++;
  level = next;
}
check("no flicker on a boundary", flips === 0, `${flips} changes in 200 frames of 30 cm jitter`);

const k = lodScale(LOD_REFERENCE.fovDeg, LOD_REFERENCE.heightPx, 1);
check("view scale", Math.abs(k - 1) < 1e-9 && Math.abs(lodScale(45, 450, 1) - 0.5) < 1e-9 && lodScale(22.5, 900, 1) > 2 && Math.abs(lodScale(45, 900, 0.7) - 0.7) < 1e-9, `reference ${k}, half-height viewport ${lodScale(45, 450, 1)}, half the lens angle ${lodScale(22.5, 900, 1).toFixed(2)}, Low tier bias ${lodScale(45, 900, 0.7)}`);

process.exit(failed ? 1 : 0);
