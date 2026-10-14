"""
The walk map of a zone (P02d): where people and animals can stand, how high, and what is in their way.

Run inside the master scene (live or headless, run_headless.py with STAGES ["walk"]):

  exec(compile(open(path).read(), path, "exec"), {"__name__": "walk", "ZONE": "powerhouse.camp-gate"})

A grid over the zone's ground patch, CELL metres a side, written as a PNG beside the zone's other
textures (public/textures/twin/walk/<zone>.png) and described in components/twin/data/zones/<zone>.walk.json.
Each cell:
  R, B  the height to stand at (the ground patch, or a walkable top on it: a slab, an apron, a step),
        in cm above `base` in the description: R the high byte, B the low. Absolute, so people stand
        right before the ground patch itself has streamed in (it arrives last)
  G     bit 0: something solid low down (0.10 to 0.70 m above the top): in the way of a dog and a person
        bit 1: something solid at body height (0.70 to 1.75 m): in the way of a person
        bits 2 to 7: a soft cost, 0 to 63 (undergrowth a person or a dog would rather go round)
Built things (struct, kit, prop) are solid; trees are solid at their trunks; shrubs are a soft cost;
grass and ferns are walked through. Things that move (the barrier arm) are left out: the script that
moves them keeps people clear.
"""
import json
import math
import os

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

REPO = r"C:\Users\Harrold\Desktop\Projects2\Project Nexus"
ZONE = globals().get("ZONE", "powerhouse.camp-gate")
CELL = 0.1
SURFACE_PROBE = 0.6  # a top this high above the ground or lower can be stood on (higher: it is in the way)
LOW = (0.1, 0.7)
HIGH = (0.7, 1.75)
MOVING = {"kit.boom-arm"}
TRUNKS = ("flora.acacia", "flora.banana")
SOFT = ("flora.shrub", "flora.broadleaf")


def lod0_of(coll):
    return next((o for o in coll.all_objects if o.type == "MESH" and o.name.endswith("_LOD0")), None)


def placed(empty):
    """World matrix and LOD0 mesh of a placement (an empty instancing an asset collection)."""
    coll = empty.instance_collection
    lod = lod0_of(coll) if coll else None
    if lod is None:
        return None, None
    M = empty.matrix_world @ Matrix.Translation(-coll.instance_offset) @ lod.matrix_world
    return M, lod


def tree_of(items):
    bm = bmesh.new()
    for M, lod in items:
        tmp = bmesh.new()
        tmp.from_mesh(lod.data)
        tmp.transform(M)
        me = bpy.data.meshes.new("__walk")
        tmp.to_mesh(me)
        tmp.free()
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
    tree = BVHTree.FromBMesh(bm)
    bm.free()
    return tree


def trunk_radius(lod):
    """The trunk at knee to hip height: the vertices near the asset's own axis there."""
    pts = [v.co for v in lod.data.vertices if 0.3 < v.co.z < 1.0]
    near = sorted(math.hypot(p.x, p.y) for p in pts if math.hypot(p.x, p.y) < 0.6)
    return near[int(len(near) * 0.8)] if near else 0.15


def low_spread(lod):
    """How far a low plant spreads: its leaves under 0.8 m, from its axis."""
    d = sorted(math.hypot(v.co.x, v.co.y) for v in lod.data.vertices if v.co.z < 0.8)
    return d[int(len(d) * 0.7)] if d else 0.3


def bake(zone_id):
    zone = bpy.data.collections[f"ZONE_{zone_id}"]
    ground, solid, trunks, soft = [], [], [], []
    for empty in zone.all_objects:
        if empty.type != "EMPTY" or not empty.name.startswith("PLACE_"):
            continue
        asset = empty.name[len("PLACE_"):].rsplit("_", 1)[0]
        M, lod = placed(empty)
        if lod is None:
            continue
        if asset.startswith("ground."):
            ground.append((M, lod))
        elif asset.startswith(("struct.", "kit.", "prop.")) and asset not in MOVING:
            solid.append((M, lod))
        elif asset.startswith(TRUNKS):
            s = M.to_scale().x
            trunks.append((M.translation.copy(), trunk_radius(lod) * s))
        elif asset.startswith(SOFT):
            s = M.to_scale().x
            soft.append((M.translation.copy(), low_spread(lod) * s))
    g_tree = tree_of(ground)
    s_tree = tree_of(solid)
    # the grid: over the ground patch, in three.js's x and z (Blender x and -y)
    data = json.load(open(os.path.join(REPO, "components", "twin", "data", "sources", "camp-gate-layout.json"), encoding="utf-8")) if zone_id == "powerhouse.camp-gate" else None
    cx, _cy, cz = data["patch"]["centre"]
    size = data["patch"]["size"]
    n = int(round(size / CELL))
    x0, z0 = cx - size / 2, cz - size / 2
    lift = np.zeros((n, n), dtype=np.float32)
    surface = np.zeros((n, n), dtype=np.float32)
    flags = np.zeros((n, n), dtype=np.uint8)
    cost = np.zeros((n, n), dtype=np.float32)
    down = Vector((0, 0, -1))
    up = Vector((0, 0, 1))
    ACROSS = (Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0.7071, 0.7071, 0)), Vector((0.7071, -0.7071, 0)))
    for j in range(n):
        tz = z0 + (j + 0.5) * CELL
        by = -tz
        for i in range(n):
            bx = x0 + (i + 0.5) * CELL
            hit = g_tree.ray_cast(Vector((bx, by, 200.0)), down, 400.0)
            if hit[0] is None:
                flags[j, i] = 3
                continue
            gz = hit[0].z
            top = gz
            s_hit = s_tree.ray_cast(Vector((bx, by, gz + SURFACE_PROBE)), down, SURFACE_PROBE + 0.05)
            if s_hit[0] is not None and s_hit[0].z > gz and s_hit[1].z > 0.7:
                top = s_hit[0].z
            lift[j, i] = top - gz
            surface[j, i] = top
            for bit, (a, b) in ((1, LOW), (2, HIGH)):
                # inside something (straight up or down through it), or a wall crossing the cell (across it both ways)
                if s_tree.ray_cast(Vector((bx, by, top + a)), up, b - a)[0] is not None or s_tree.ray_cast(Vector((bx, by, top + b)), down, b - a)[0] is not None:
                    flags[j, i] |= bit
                    continue
                for h in (a + (b - a) * 0.3, a + (b - a) * 0.8):
                    if any(s_tree.ray_cast(Vector((bx, by, top + h)) - d * CELL * 0.5, d, CELL)[0] is not None for d in ACROSS):
                        flags[j, i] |= bit
                        break
    # trees: solid at the trunk; undergrowth: a cost that falls off from its middle
    xs = x0 + (np.arange(n) + 0.5) * CELL
    zs = z0 + (np.arange(n) + 0.5) * CELL
    X, Z = np.meshgrid(xs, zs)
    for p, r in trunks:
        flags[np.hypot(X - p.x, Z + p.y) < r + 0.02] |= 3
    for p, r in soft:
        d = np.hypot(X - p.x, Z + p.y)
        cost = np.maximum(cost, np.clip(1 - d / max(r, 0.15), 0, 1) * 200)
    # write: R and B the standing height (cm above base), G flags and cost
    base = math.floor(float(surface[surface > 0].min())) - 1.0
    cm = np.clip(np.round((surface - base) * 100), 0, 65535).astype(np.int64)
    out = np.zeros((n, n, 4), dtype=np.float32)
    out[:, :, 0] = (cm >> 8) / 255
    out[:, :, 2] = (cm & 255) / 255
    out[:, :, 1] = ((flags & 3) | (np.clip(cost / 4, 0, 63).astype(np.int64) << 2)) / 255
    out[:, :, 3] = 1
    folder = os.path.join(REPO, "public", "textures", "twin", "walk")
    os.makedirs(folder, exist_ok=True)
    img = bpy.data.images.new(f"__walk.{zone_id}", n, n, alpha=True, float_buffer=False)
    img.colorspace_settings.name = "Non-Color"
    img.pixels.foreach_set(out.ravel())  # (rows from the bottom: row j is z0 + j cells)
    img.filepath_raw = os.path.join(folder, f"{zone_id}.png")
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)
    meta = {
        "note": f"Walk map of {zone_id} (P02d), written by scripts/blender/twin/bake_walkmap.py. Grid in the location frame (x, z), first row at z0; row j counts up from the image's bottom.",
        "url": f"/textures/twin/walk/{zone_id}.png",
        "origin": [round(x0, 4), round(z0, 4)],
        "base": base,
        "cell": CELL,
        "size": [n, n],
        "low": list(LOW),
        "high": list(HIGH),
    }
    with open(os.path.join(REPO, "components", "twin", "data", "zones", f"{zone_id}.walk.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=1)
        f.write("\n")
    raised = (lift > 0.03).sum()
    print(f"[walk] {zone_id}: {n}x{n} cells of {CELL} m, {raised} raised (highest {lift.max():.2f} m), "
          f"{(flags & 1).astype(bool).sum()} blocked low, {(flags & 2).astype(bool).sum()} blocked at body height, {len(trunks)} trunks, {len(soft)} shrubs")


bake(ZONE)
