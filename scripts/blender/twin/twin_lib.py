"""
Shared helpers for the Twin v2 Blender scripts (docs/twin-v2/CONTRACTS.md sections 2 to 4).

How an asset is laid out in a .blend:
  LIB_<category>                      collection, one per id prefix (LIB_prop, LIB_veh, ...)
    <asset id>                        collection named by the asset id, e.g. "prop.drum-red"
      <name>_LOD0, _LOD1, _LOD2       one mesh object per level; <name> is the id without its prefix
  Custom properties on the asset collection:
    twin_class            a class from scripts/twin/asset-budgets.json (e.g. "small-prop")
    twin_lod_distances    optional [lod1, lod2] in metres; the class's distances if absent
    twin_credits          comma-separated ids of rows in public/models/twin/CREDITS.md

Blender is Z up and the twin is Y up: (x, y, z) in Blender is (x, z, -y) in the twin.
"""
import json
import math
import os
import re

import bmesh
import bpy
from mathutils import Matrix, Vector

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
EXPORT_DIR = os.path.join(REPO, "assets-src", "twin", "export")
DATA_DIR = os.path.join(REPO, "components", "twin", "data")
BUDGETS_PATH = os.path.join(REPO, "scripts", "twin", "asset-budgets.json")

TO_Y_UP = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))
LOD_RE = re.compile(r"_LOD([012])$")


def budgets():
    with open(BUDGETS_PATH, encoding="utf-8") as f:
        return json.load(f)


def y_up(v):
    """A Blender position as a twin position, rounded to the millimetre."""
    return [round(v[0], 3), round(v[2], 3), round(-v[1], 3)]


def asset_collection(asset_id):
    coll = bpy.data.collections.get(asset_id)
    if coll is None:
        raise ValueError(f"no collection named '{asset_id}'")
    return coll


def asset_name(asset_id):
    """'prop.drum-red' -> 'drum-red'; 'flora.narra.a' -> 'narra.a'."""
    return asset_id.split(".", 1)[1]


def asset_class(coll):
    name = coll.get("twin_class")
    classes = budgets()["classes"]
    if name not in classes:
        raise ValueError(f"'{coll.name}': twin_class is {name!r}; expected one of {sorted(classes)}")
    return name, classes[name]


def lod_objects(coll):
    """{0: object, 1: object, 2: object} for the mesh objects named <name>_LOD<n>."""
    found = {}
    for obj in coll.all_objects:
        m = LOD_RE.search(obj.name)
        if obj.type == "MESH" and m:
            level = int(m.group(1))
            if level in found:
                raise ValueError(f"'{coll.name}' has two objects for LOD{level}: {found[level].name}, {obj.name}")
            found[level] = obj
    return found


def armature_of(obj):
    for mod in obj.modifiers:
        if mod.type == "ARMATURE" and mod.object:
            return mod.object
    return None


def triangle_count(mesh):
    return sum(len(p.vertices) - 2 for p in mesh.polygons)


def prepare(coll):
    """
    Copies of the asset's LOD objects, ready to export: modifiers applied (an armature modifier is
    kept), transforms applied, object and mesh named <name>_LOD<n>. Returns {level: object}.
    The caller removes them with `discard`.
    """
    name = asset_name(coll.name)
    out = {}
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for level, src in sorted(lod_objects(coll).items()):
        rig = armature_of(src)
        if rig or not src.modifiers:
            # (no evaluation needed, so this also works for a library collection left out of the view layer)
            mesh = src.data.copy()
        else:
            mesh = bpy.data.meshes.new_from_object(src.evaluated_get(depsgraph), depsgraph=depsgraph)
        obj = bpy.data.objects.new(f"__twin_{name}_LOD{level}", mesh)
        bpy.context.scene.collection.objects.link(obj)
        for key in src.keys():
            if not key.startswith("_"):
                obj[key] = src[key]
        if rig:
            obj.parent = src.parent
            obj.matrix_world = src.matrix_world.copy()
            for group in src.vertex_groups:
                obj.vertex_groups.new(name=group.name)
            mod = obj.modifiers.new("Armature", "ARMATURE")
            mod.object = rig
        else:
            # transforms applied: the mesh carries the object's matrix and the object sits at the origin
            if src.matrix_world.determinant() < 0:
                mesh.flip_normals()
            mesh.transform(src.matrix_world)
            obj.matrix_world = Matrix.Identity(4)
        mesh.name = f"__twin_{name}_LOD{level}"
        out[level] = obj
    return out


def discard(objects):
    for obj in objects.values():
        mesh = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)


def bounds_of(obj):
    """(min, max) of an object's mesh in world space, as Blender vectors."""
    lo = Vector((math.inf, math.inf, math.inf))
    hi = Vector((-math.inf, -math.inf, -math.inf))
    for v in obj.data.vertices:
        p = obj.matrix_world @ v.co
        for i in range(3):
            lo[i] = min(lo[i], p[i])
            hi[i] = max(hi[i], p[i])
    return lo, hi


def bounds_y_up(lo, hi):
    """A Blender box as {"min", "max"} in the twin frame."""
    a, b = y_up(lo), y_up(hi)
    return {"min": [min(a[i], b[i]) for i in range(3)], "max": [max(a[i], b[i]) for i in range(3)]}


def mesh_faults(mesh):
    """Counts of the topology faults the checklist names."""
    bm = bmesh.new()
    bm.from_mesh(mesh)
    faults = {
        "loose_verts": sum(1 for v in bm.verts if not v.link_faces),
        "loose_edges": sum(1 for e in bm.edges if not e.link_faces),
        "ngons": sum(1 for f in bm.faces if len(f.verts) > 4),
        "non_manifold_edges": sum(1 for e in bm.edges if e.link_faces and not e.is_manifold),
        "zero_area_faces": sum(1 for f in bm.faces if f.calc_area() < 1e-10),
    }
    bm.free()
    return faults


def write_json(path, data, **kwargs):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, **kwargs)
        f.write("\n")


def script_args():
    """Arguments after `--` on Blender's command line, as {name: value} for --name=value."""
    import sys

    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    out = {}
    for a in argv:
        if a.startswith("--"):
            key, _, value = a[2:].partition("=")
            out[key] = value if value else True
    return out
