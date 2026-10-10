"""
Checks an asset against the parts of docs/twin-v2/QUALITY-BAR.md section 2 that a script can judge.

  blender -b assets-src/twin/site_master.blend --python scripts/blender/twin/check_asset.py -- --asset=prop.drum-red
  blender -b <file> --python scripts/blender/twin/check_asset.py -- --all

Fails (exit code 1) on: a missing LOD0, a negative or unapplied scale that mirrors the mesh, an origin
that is not at the base centre, loose vertices or edges, n-gons on a skinned mesh, more than 4 bone
weights on a vertex, more bones than the class allows, no UV map, triangles or materials over the
class budget, and a level that is not lighter than the one before it.
Warns on: non-manifold edges, zero-area faces, a level the class does not have.

What it cannot judge (a person must, in the Blender review): real-world size against a known
dimension, UV stretching and texel density, baked lighting in base colour, roughness variation,
bevels, wear placement, silhouette across LODs.
"""
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import twin_lib  # noqa: E402


def check_asset(asset_id):
    """Returns (fails, warnings, facts). `facts` holds triangles per level, materials and bounds."""
    fails, warns = [], []
    coll = twin_lib.asset_collection(asset_id)
    try:
        class_name, budget = twin_lib.asset_class(coll)
    except ValueError as e:
        return [str(e)], warns, {}

    sources = twin_lib.lod_objects(coll)
    if 0 not in sources:
        return [f"no object named {twin_lib.asset_name(asset_id)}_LOD0"], warns, {}
    for level, src in sources.items():
        if any(s < 0 for s in src.scale):
            fails.append(f"LOD{level}: negative scale {tuple(round(s, 3) for s in src.scale)}")

    objs = twin_lib.prepare(coll)
    facts = {"class": class_name, "tris": [0, 0, 0], "materials": 0, "skinned": False}
    try:
        materials = set()
        previous = None
        for level in (0, 1, 2):
            obj = objs.get(level)
            allowed = budget["tris"][level]
            if obj is None:
                if allowed is not None and level > 0:
                    fails.append(f"LOD{level} is missing (class {class_name} needs it)")
                continue
            mesh = obj.data
            tris = twin_lib.triangle_count(mesh)
            facts["tris"][level] = tris
            if allowed is None:
                allowed = budget.get("lod2Optional") if level == 2 else None
                if allowed is None:
                    warns.append(f"LOD{level}: class {class_name} has no such level; it will not be used")
            if allowed is not None and tris > allowed:
                fails.append(f"LOD{level}: {tris} triangles, budget {allowed}")
            if previous is not None and tris >= previous:
                fails.append(f"LOD{level}: {tris} triangles is not fewer than the level before ({previous})")
            previous = tris

            faults = twin_lib.mesh_faults(mesh)
            if faults["loose_verts"]:
                fails.append(f"LOD{level}: {faults['loose_verts']} loose vertices")
            if faults["loose_edges"]:
                fails.append(f"LOD{level}: {faults['loose_edges']} edges without a face")
            if faults["non_manifold_edges"]:
                warns.append(f"LOD{level}: {faults['non_manifold_edges']} non-manifold edges (fine for open shapes, a fault on closed ones)")
            if faults["zero_area_faces"]:
                warns.append(f"LOD{level}: {faults['zero_area_faces']} zero-area faces")
            if not mesh.uv_layers:
                fails.append(f"LOD{level}: no UV map")

            rig = twin_lib.armature_of(obj)
            if rig:
                facts["skinned"] = True
                if faults["ngons"]:
                    fails.append(f"LOD{level}: {faults['ngons']} n-gons on a skinned mesh")
                over = sum(1 for v in mesh.vertices if sum(1 for g in v.groups if g.weight > 0) > 4)
                if over:
                    fails.append(f"LOD{level}: {over} vertices with more than 4 bone weights")
                bones = sum(1 for b in rig.data.bones if b.use_deform)
                if "maxBones" in budget and level > 0 and bones > budget["maxBones"]:
                    fails.append(f"LOD{level}: {bones} deforming bones, limit {budget['maxBones']}")
            else:
                lo, hi = twin_lib.bounds_of(obj)
                size = hi - lo
                # origin at base centre: the lowest point on Z = 0, the footprint centred on X and Y
                if abs(lo.z) > max(0.01, size.z * 0.02):
                    fails.append(f"LOD{level}: base is at Z = {lo.z:.3f} m, not 0 (origin must be at the base centre)")
                off = max(abs((lo.x + hi.x) / 2), abs((lo.y + hi.y) / 2))
                if off > max(0.02, max(size.x, size.y) * 0.1):
                    fails.append(f"LOD{level}: footprint centre is {off:.3f} m from the origin")
                if level == 0:
                    facts["bounds"] = twin_lib.bounds_y_up(lo, hi)
                    facts["size"] = [round(size.x, 3), round(size.y, 3), round(size.z, 3)]
            materials.update(slot.material.name for slot in obj.material_slots if slot.material)

        facts["materials"] = len(materials)
        if len(materials) > budget["materials"]:
            fails.append(f"{len(materials)} materials, budget {budget['materials']}")
        if not materials:
            fails.append("no material")
    finally:
        twin_lib.discard(objs)
    return fails, warns, facts


def report(asset_id):
    fails, warns, facts = check_asset(asset_id)
    print(f"[check_asset] {asset_id}: {'FAIL' if fails else 'pass'}  {facts}")
    for line in fails:
        print(f"    FAIL  {line}")
    for line in warns:
        print(f"    warn  {line}")
    return not fails


def all_asset_ids():
    ids = []
    for lib in bpy.data.collections:
        if lib.name.startswith("LIB_"):
            ids += [c.name for c in lib.children]
    return sorted(ids)


if __name__ == "__main__":
    args = twin_lib.script_args()
    ids = all_asset_ids() if args.get("all") else [args["asset"]] if args.get("asset") else []
    if not ids:
        print("usage: -- --asset=<id> | --all")
        sys.exit(2)
    ok = [report(i) for i in ids]
    sys.exit(0 if all(ok) else 1)
