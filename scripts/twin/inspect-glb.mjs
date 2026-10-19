/**
 * Prints what is inside a GLB (a source in assets-src/twin/export/ or a built one in public/models/twin/):
 * its mesh nodes, skins, animation clips, materials and textures.
 *
 *   node scripts/twin/inspect-glb.mjs <file.glb>
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const root = (await io.read(process.argv[2])).getRoot();

console.log("nodes with a mesh:");
for (const node of root.listNodes().filter((n) => n.getMesh())) {
  const prims = node.getMesh().listPrimitives();
  const tris = prims.reduce((n, p) => n + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute("POSITION").getCount()) / 3, 0);
  console.log(`  ${node.getName() || "(unnamed)"}${node.getSkin() ? " (skinned)" : ""}  ${Math.round(tris)} triangles  attributes ${prims[0].listSemantics().join(",")}  materials ${prims.map((p) => p.getMaterial()?.getName()).join(",")}  extras ${JSON.stringify(node.getExtras())}`);
}
console.log("skins:", root.listSkins().map((s) => `${s.listJoints().length} joints`).join(", ") || "none");
console.log("clips:", root.listAnimations().map((a) => `${a.getName()} ${Math.max(...a.listSamplers().map((s) => s.getInput().getMax([])[0])).toFixed(2)} s`).join(", ") || "none");
console.log("materials:");
for (const m of root.listMaterials()) {
  const slot = (t) => (t ? `${t.getMimeType()} ${t.getSize()?.join("x")} ${(t.getImage().byteLength / 1024) | 0} KB` : "none");
  console.log(`  ${m.getName()}  alpha ${m.getAlphaMode()}  colour ${m.getBaseColorFactor().map((v) => +v.toFixed(2))} / ${slot(m.getBaseColorTexture())}  rough-metal ${slot(m.getMetallicRoughnessTexture())}  normal ${slot(m.getNormalTexture())}  emissive ${m.getEmissiveFactor()} / ${slot(m.getEmissiveTexture())}`);
}
