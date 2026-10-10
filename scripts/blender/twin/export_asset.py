"""
Exports one asset collection to a source GLB for scripts/twin/build-assets.mjs.

  blender -b assets-src/twin/site_master.blend --python scripts/blender/twin/export_asset.py -- --asset=prop.drum-red
  blender -b <file> --python scripts/blender/twin/export_asset.py -- --all [--force]

Writes assets-src/twin/export/<asset id>.glb (LOD meshes named <name>_LOD0.._LOD2, modifiers and
transforms applied, custom properties as extras, textures as exported by Blender) and
assets-src/twin/export/<asset id>.asset.json (class, LOD distances, credits, bounds). The build
compresses that GLB into public/models/twin/ and writes components/twin/data/assets.json.

The asset is checked first (check_asset.py); a failing asset is not exported unless --force is given.
Layout of an asset in the .blend: see twin_lib.py.
"""
import os
import sys

import bmesh
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import twin_lib  # noqa: E402
from check_asset import all_asset_ids, check_asset  # noqa: E402


def make_lods(asset_id, source_name, targets):
    """
    Build <name>_LOD0.. in the asset's collection from one source object by collapse decimation, to
    the triangle counts in `targets` (a None entry is skipped). A stand-in for hand-made LODs: good
    enough for simple props, not for anything whose silhouette matters.
    """
    coll = twin_lib.asset_collection(asset_id)
    source = bpy.data.objects[source_name]
    name = twin_lib.asset_name(asset_id)
    full = twin_lib.triangle_count(source.data)
    made = {}
    for level, target in enumerate(targets):
        if target is None:
            continue
        obj = source.copy()
        obj.data = source.data.copy()
        obj.name = f"{name}_LOD{level}"
        obj.data.name = obj.name
        coll.objects.link(obj)
        if target < full:
            # decimation can overshoot the target and leave stray vertices: clean, measure, tighten, repeat
            # (separate shells such as caps, handles and valves put a floor under collapse decimation:
            # a target below that floor cannot be reached and is reported)
            ratio = target / full
            for _ in range(10):
                mod = obj.modifiers.new("lod", "DECIMATE")
                mod.ratio = ratio
                depsgraph = bpy.context.evaluated_depsgraph_get()
                mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph), depsgraph=depsgraph)
                obj.modifiers.clear()
                bm = bmesh.new()
                bm.from_mesh(mesh)
                bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=1e-6)
                bmesh.ops.delete(bm, geom=[e for e in bm.edges if not e.link_faces], context="EDGES")
                bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
                bm.to_mesh(mesh)
                bm.free()
                mesh.validate()
                if twin_lib.triangle_count(mesh) <= target:
                    break
                bpy.data.meshes.remove(mesh)
                mesh = None
                ratio *= 0.92
            if mesh is None:
                raise RuntimeError(f"{asset_id} LOD{level}: could not reach {target} triangles")
            old = obj.data
            obj.data = mesh
            mesh.name = obj.name
            bpy.data.meshes.remove(old)
        obj.hide_render = level > 0
        obj.hide_viewport = level > 0  # placements instance the collection: only LOD0 shows in the viewport
        made[level] = twin_lib.triangle_count(obj.data)
    return made


def export_asset(asset_id, force=False):
    coll = twin_lib.asset_collection(asset_id)
    fails, warns, facts = check_asset(asset_id)
    for line in warns:
        print(f"    warn  {line}")
    if fails:
        for line in fails:
            print(f"    FAIL  {line}")
        if not force:
            print(f"[export_asset] {asset_id}: not exported")
            return False

    class_name, budget = twin_lib.asset_class(coll)
    name = twin_lib.asset_name(asset_id)
    objs = twin_lib.prepare(coll)
    rigs = {twin_lib.armature_of(o) for o in objs.values()} - {None}
    path = os.path.join(twin_lib.EXPORT_DIR, f"{asset_id}.glb")
    os.makedirs(twin_lib.EXPORT_DIR, exist_ok=True)
    try:
        # the exporter names nodes after objects: free the final names for the copies
        originals = twin_lib.lod_objects(coll)
        for level, obj in originals.items():
            obj.name = f"__src_{name}_LOD{level}"
        for level, obj in objs.items():
            obj.name = f"{name}_LOD{level}"
            obj.data.name = obj.name
            obj["lod"] = level

        bpy.ops.object.select_all(action="DESELECT")
        for obj in list(objs.values()) + list(rigs):
            obj.hide_viewport = False
            obj.hide_set(False)
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.export_scene.gltf(
            filepath=path,
            export_format="GLB",
            use_selection=True,
            export_yup=True,
            export_apply=False,
            export_extras=True,
            export_materials="EXPORT",
            export_image_format="AUTO",
            export_animations=bool(rigs),
            export_skins=bool(rigs),
            export_cameras=False,
            export_lights=False,
        )
    finally:
        twin_lib.discard(objs)
        for obj in coll.all_objects:
            if obj.name.startswith("__src_"):
                obj.name = obj.name[len("__src_") :]

    distances = list(coll.get("twin_lod_distances") or budget["lodDistances"])
    credits = [c.strip() for c in str(coll.get("twin_credits", "")).split(",") if c.strip()]
    twin_lib.write_json(
        os.path.join(twin_lib.EXPORT_DIR, f"{asset_id}.asset.json"),
        {
            "id": asset_id,
            "class": class_name,
            "lodDistances": [float(distances[0]), float(distances[1])],
            "credits": credits,
            "bounds": facts.get("bounds"),
            "skinned": facts.get("skinned", False),
            "sourceTris": facts.get("tris"),
        },
        indent=1,
    )
    print(f"[export_asset] {asset_id}: {path}  tris {facts.get('tris')}  materials {facts.get('materials')}")
    return True


if __name__ == "__main__":
    args = twin_lib.script_args()
    ids = all_asset_ids() if args.get("all") else [args["asset"]] if args.get("asset") else []
    if not ids:
        print("usage: -- --asset=<id> | --all  [--force]")
        sys.exit(2)
    ok = [export_asset(i, force=bool(args.get("force"))) for i in ids]
    sys.exit(0 if all(ok) else 1)
