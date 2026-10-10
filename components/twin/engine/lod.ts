/**
 * LOD selection by size on screen, with hysteresis.
 *
 * An asset's `lodDistances` (data/assets.json) are the distances, in metres, at which LOD1 and
 * LOD2 take over in the reference view: a 45 degree lens on a viewport 900 pixels tall. What
 * matters is how large the object is on screen, so in any other view the distances are scaled by
 * `lodScale`: a taller viewport or a longer lens shows the object larger, and the lighter mesh
 * waits until further away. The tier's LOD bias multiplies the same number.
 *
 * Hysteresis: a boundary is crossed outwards at 108% of its distance and back inwards at 92%, so
 * an object sitting on a boundary does not flicker between two meshes.
 */

export const LOD_REFERENCE = { fovDeg: 45, heightPx: 900 } as const;
const HYSTERESIS = 0.08;
const REFERENCE_TAN = Math.tan((LOD_REFERENCE.fovDeg * Math.PI) / 360);

/** Not drawn: beyond the last level or the draw distance. */
export const CULLED = -1;

/** Factor on every LOD distance for this view. */
export function lodScale(fovDeg: number, viewportHeightPx: number, bias: number): number {
  return (REFERENCE_TAN / Math.tan((fovDeg * Math.PI) / 360)) * (Math.max(1, viewportHeightPx) / LOD_REFERENCE.heightPx) * bias;
}

/**
 * The level to draw.
 *
 * @param current   the level drawn last frame (0, 1, 2 or CULLED); pass 0 for a new object
 * @param distance  metres from the camera, already divided by the object's scale
 * @param lod1      distance where LOD1 begins, already multiplied by `lodScale`
 * @param lod2      distance where LOD2 begins (or, for an asset with no LOD2, where it is culled)
 * @param cull      distance beyond which nothing is drawn
 * @param levels    bit mask of the levels the asset has (bit 0 = LOD0, bit 1 = LOD1, bit 2 = LOD2)
 */
export function selectLod(current: number, distance: number, lod1: number, lod2: number, cull: number, levels: number): number {
  const at = current === CULLED ? 3 : current;
  let level = 0;
  if (distance > lod1 * (at > 0 ? 1 - HYSTERESIS : 1 + HYSTERESIS)) level = 1;
  if (distance > lod2 * (at > 1 ? 1 - HYSTERESIS : 1 + HYSTERESIS)) level = 2;
  if (distance > cull * (at > 2 ? 1 - HYSTERESIS : 1 + HYSTERESIS)) return CULLED;
  // a level the asset does not have: it is culled there (QUALITY-BAR: "none (culled)")
  return levels & (1 << level) ? level : CULLED;
}
