/**
 * Two-channel normal maps (P02e). The asset build encodes most normal maps as ETC1S in its normal
 * mode, a third of the download of the UASTC maps before it: X is kept in red, green and blue, Y in
 * alpha, and Z is left out, to be rebuilt from the two in the shader. The build marks such a
 * material with `twinNormalXY` in its extras (three puts them in `userData`).
 */
import * as THREE from "three/webgpu";
import { materialReference, normalMap, texture } from "three/tsl";

/** Whether `source` (a material as the file gave it) carries a two-channel normal map. */
export function hasTwoChannelNormals(source: THREE.Material): boolean {
  const map = (source as THREE.MeshStandardMaterial).normalMap;
  return !!map && source.userData?.twinNormalXY === true;
}

/** Read `source`'s normal map as X in green and Y in alpha, Z rebuilt (`node` is the node material made from it). */
export function applyTwoChannelNormals(node: THREE.NodeMaterial, source: THREE.Material) {
  const map = (source as THREE.MeshStandardMaterial).normalMap!;
  const normals = normalMap(texture(map), materialReference("normalScale", "vec2"));
  (normals as unknown as { unpackNormalMode: string }).unpackNormalMode = THREE.NormalGAPacking;
  (node as THREE.MeshStandardNodeMaterial).normalNode = normals;
}
