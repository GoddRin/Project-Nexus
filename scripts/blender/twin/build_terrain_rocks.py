"""
Scanned rocks for the terrain (P03a): Poly Haven boulders and stones (CC0), reduced to the kit-piece
budget, and a whitewashed guard stone for the outside of road bends.

Run inside the master scene (assets-src/twin/site_master.blend), after
  node scripts/twin/fetch-polyhaven-model.mjs <id> gltf 1k
for each source below; then export_asset.py for each id and node scripts/twin/build-assets.mjs.

Each rock's origin sits a fifth of its height above its lowest point (`twin_origin` "pivot"), so a
rock placed on the ground is bedded into it rather than resting on a point. The scans' own normal
maps are kept: decimation keeps the UVs, so the scanned detail still reads on the reduced mesh.
"""
import os
import sys
from array import array

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import model_kit  # noqa: E402
import twin_lib  # noqa: E402
from export_asset import make_lods  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DL = os.path.join(ROOT, "assets-src", "twin", "downloads", "polyhaven")

# id, Poly Haven source, size of the largest side in metres, triangles per level
ROCKS = [
    ("prop.rock-boulder.a", "boulder_01", 1.8, (2000, 500, 100)),
    ("prop.rock-boulder.b", "namaqualand_boulder_04", 2.4, (2000, 500, 100)),
    ("prop.rock-stone.a", "namaqualand_boulder_06", 0.9, (1500, 400, 100)),
    ("prop.rock-stone.b", "rock_07", 0.45, (1200, 300, 80)),
]
GUARD = ("prop.guard-stone.a", "namaqualand_boulder_06", 0.62, (1200, 300, 80))
BED = 0.2


def import_source(source):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(DL, source, f"{source}_1k.gltf"))
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    # one mesh, transforms applied, LOD copies the file may carry left out (the highest only)
    meshes.sort(key=lambda o: -len(o.data.polygons))
    keep = meshes[0]
    for o in new:
        if o is not keep:
            bpy.data.objects.remove(o, do_unlink=True)
    keep.parent = None
    bpy.context.view_layer.objects.active = keep
    for o in bpy.context.view_layer.objects:
        o.select_set(o is keep)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # the file splits vertices along UV seams; Blender keeps UVs per corner, so they can be joined
    # again (without that, decimation cannot cross a seam and stops far above its target)
    bm = bmesh.new()
    bm.from_mesh(keep.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.to_mesh(keep.data)
    bm.free()
    return keep


def fit(obj, size):
    lo = Vector([min(v.co[i] for v in obj.data.vertices) for i in range(3)])
    hi = Vector([max(v.co[i] for v in obj.data.vertices) for i in range(3)])
    scale = size / max(hi - lo)
    centre = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z + (hi.z - lo.z) * BED))
    for v in obj.data.vertices:
        v.co = (v.co - centre) * scale
    obj.data.update()


def whitewash(material):
    """The guard stone's coat: lime wash over the rock, thin where it has worn on the edges and high spots."""
    bsdf = next(n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    link = bsdf.inputs["Base Color"].links[0]
    src = link.from_node.image
    w, h = src.size
    px = array("f", [0.0]) * (w * h * 4)
    src.pixels.foreach_get(px)
    for i in range(0, len(px), 4):
        lum = 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]
        # paint sits in the hollows (dark), wears off the high, light spots
        coat = min(1.0, max(0.0, 1.1 - lum * 1.6))
        for c in range(3):
            px[i + c] = px[i + c] * (1 - coat) + 0.78 * coat
    img = bpy.data.images.new("guard-stone-diff", w, h)
    img.pixels.foreach_set(px)
    img.pack()
    link.from_node.image = img


def build(asset_id, source, size, targets, wash=False):
    coll = model_kit.reset_asset(asset_id, "kit-piece", [f"polyhaven.{source}"], origin="pivot")
    obj = import_source(source)
    fit(obj, size)
    if wash:
        material = obj.data.materials[0].copy()
        obj.data.materials[0] = material
        whitewash(material)
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    coll.objects.link(obj)
    name = twin_lib.asset_name(asset_id)
    obj.name = f"__src_{name}"
    made = make_lods(asset_id, obj.name, targets)
    bpy.data.objects.remove(obj, do_unlink=True)
    model_kit.hide_lower_lods(coll)
    print(asset_id, made)
    return made


def layer_of(name, lc=None):
    lc = lc or bpy.context.view_layer.layer_collection
    if lc.collection.name == name:
        return lc
    for child in lc.children:
        found = layer_of(name, child)
        if found:
            return found
    return None


def build_all():
    # (decimation is a modifier, and an excluded collection's objects are not evaluated: the library
    # is brought into the view layer while the levels are made, and put back after)
    lib = layer_of("LIB_prop")
    was = lib.exclude if lib else None
    if lib:
        lib.exclude = False
    try:
        out = {}
        for asset_id, source, size, targets in ROCKS:
            out[asset_id] = build(asset_id, source, size, targets)
        out[GUARD[0]] = build(*GUARD, wash=True)
        return out
    finally:
        if lib:
            lib.exclude = was


if __name__ == "__main__":
    build_all()
