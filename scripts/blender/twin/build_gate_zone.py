"""
Lays out the camp gate zone (P02a) in the open .blend: the collection ZONE_powerhouse.camp-gate with
the ground patch, the checkpoint, the barrier arm, cones, the plants, two lamps and the review cameras.

Run inside Blender, after build_gate_structures.py and build_gate_flora.py:
    exec(open("scripts/blender/twin/build_gate_zone.py").read())
Then export: export_asset.py for each asset and export_zone.py for powerhouse.camp-gate.

Positions are worked out in the twin's frame (metres, Y up) and along the road (gate_ground.Ground:
`s` metres along the road from the gate, positive into the camp; `d` metres to the left of inbound
traffic), then set on empties in Blender's frame: twin (x, y, z) is Blender (x, -z, y), and a turn
about the twin's Y is the same turn about Blender's Z.
"""
import importlib
import math
import os
import random
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.join(os.path.dirname(bpy.data.filepath), "..", "..", "scripts", "blender", "twin"))
import build_gate_dressing
import gate_ground
import model_kit

importlib.reload(gate_ground)
importlib.reload(build_gate_dressing)

ZONE = "powerhouse.camp-gate"
G = gate_ground.Ground()
(BX, BY, BZ), YAW = G.booth()
SET = Matrix.Translation((BX, -BZ, BY)) @ Matrix.Rotation(YAW, 4, "Z")  # the checkpoint's frame in Blender's


def zone_collection():
    name = f"ZONE_{ZONE}"
    coll = bpy.data.collections.get(name)
    if coll is None:
        coll = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(coll)
    for obj in list(coll.objects):
        data = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if data is not None and data.users == 0 and isinstance(data, bpy.types.Camera):
            bpy.data.cameras.remove(data)
    coll["title"] = "Camp gate"
    coll["streamIn"] = 420.0
    coll["streamOut"] = 520.0
    return coll


COLL = zone_collection()
COUNT = {}


def place(asset, world, turn=0.0, scale=1.0, tilt=(0.0, 0.0)):
    """An empty that instances an asset collection, at a Blender-frame position."""
    n = COUNT[asset] = COUNT.get(asset, 0) + 1
    obj = bpy.data.objects.new(f"PLACE_{asset}_{n:03d}", None)
    obj.instance_type = "COLLECTION"
    obj.instance_collection = bpy.data.collections[asset]
    obj.empty_display_size = 0.3
    obj.location = world
    obj.rotation_euler = (tilt[0], tilt[1], turn)
    obj.scale = (scale, scale, scale)
    COLL.objects.link(obj)
    return obj


def on_ground(x, z, sink=0.0):
    """Blender position on the ground at a twin (x, z)."""
    return Vector((x, -z, G.height(x, z) - sink))


def at(s, d, sink=0.0):
    return on_ground(*G.at(s, d), sink=sink)


def in_set(local):
    return SET @ Vector(local)


# ---- built things -------------------------------------------------------------------------------------

ground = bpy.data.collections["ground.camp-gate"]
gx, gy, gz = ground["twin_place"]
place("ground.camp-gate", Vector((gx, -gz, gy)))
place("struct.guardhouse", in_set((0, 0, 0)), turn=YAW)
place("kit.boom-arm", in_set((2.6, 0.0, 1.0)), turn=YAW)
rng = random.Random(4)
for local in ((2.55, -2.6, 0), (2.5, -4.9, 0), (2.6, 2.7, 0), (9.25, -3.4, 0), (9.3, 3.9, 0)):
    place("prop.traffic-cone", in_set(local), turn=rng.uniform(0, 6.28), tilt=(rng.uniform(-0.03, 0.03), rng.uniform(-0.03, 0.03)))

# ---- the dressing kit (P02f): props, fence, poles, culverts; plants keep clear of them --------------------

taken = []  # (x, z, radius) of the larger plants and the props, so nothing grows through them
DRESSING = build_gate_dressing.Layout(place, G, SET, YAW, taken, COLL).run()

# ---- plants -------------------------------------------------------------------------------------------

MASK = G.mask()  # rows along z, columns along x: road, mud, litter, water
SET_INV = SET.inverted()


def weights(x, z):
    px = gate_ground.SIZE / gate_ground.MASK
    col = min(gate_ground.MASK - 1, max(0, int((x - G.min[0]) / px)))
    row = min(gate_ground.MASK - 1, max(0, int((z - G.min[1]) / px)))
    road, mud, litter, water = MASK[row, col]
    return road, mud, litter, max(0.0, 1 - road - mud - litter), water


def clear_of_checkpoint(x, z, margin=0.0):
    p = SET_INV @ Vector((x, -z, BY))
    return not (-2.4 - margin < p.x < 10.2 + margin and -8.6 - margin < p.y < 8.6 + margin)


def inside_patch(x, z, inset=3.0):
    return G.min[0] + inset < x < G.min[0] + gate_ground.SIZE - inset and G.min[1] + inset < z < G.min[1] + gate_ground.SIZE - inset


def off_road(x, z, clearance):
    # (`G.at` follows the gate straight; further out the road curves away from it, so check the real line)
    _, d = G.road_coords(np.array([x]), np.array([z]))
    return abs(float(d[0])) > clearance



def free(x, z, radius):
    return all((x - tx) ** 2 + (z - tz) ** 2 > (radius + tr) ** 2 for tx, tz, tr in taken)


def plant(asset, x, z, scale, sink=0.04, radius=0.0, lean=0.05):
    place(asset, on_ground(x, z, sink * scale), turn=rng.uniform(0, 2 * math.pi), scale=scale, tilt=(rng.uniform(-lean, lean), rng.uniform(-lean, lean)))
    if radius:
        taken.append((x, z, radius))


# the big trees are placed by hand: a canopy over the booth, the rest closing the forest edge
for s, d, scale in ((5.0, 15.0, 1.0), (-19.0, 13.5, 0.92), (23.0, 16.5, 1.08), (-8.0, -15.5, 0.95), (18.0, -18.0, 1.05), (-31.0, -12.0, 0.9), (-33.0, 17.0, 1.0)):
    x, z = G.at(s, d)
    if inside_patch(x, z, 2.0) and off_road(x, z, 7.5):
        plant("flora.acacia.a", x, z, scale, sink=0.1, radius=1.2, lean=0.02)
    else:
        print("  no room for a tree at", s, d)
# bananas at the forest edge and along the ditch
for s, d, scale in ((-14.0, 9.0, 1.0), (-17.5, 10.5, 0.85), (13.5, 10.5, 1.1), (17.0, 9.2, 0.9), (-3.5, -10.5, 0.95), (9.0, -12.0, 1.1), (-24.0, -8.5, 1.0), (26.0, -10.0, 0.9), (-27.0, 9.5, 1.05)):
    x, z = G.at(s, d)
    if inside_patch(x, z) and off_road(x, z, 5.5):
        plant("flora.banana.a", x, z, scale, radius=0.8)
    else:
        print("  no room for a banana clump at", s, d)


def scatter(asset, count, accept, scales, radius=0.0, tries=60):
    placed = 0
    for _ in range(count * tries):
        if placed >= count:
            break
        x = rng.uniform(G.min[0] + 2.5, G.min[0] + gate_ground.SIZE - 2.5)
        z = rng.uniform(G.min[1] + 2.5, G.min[1] + gate_ground.SIZE - 2.5)
        if not clear_of_checkpoint(x, z, 0.3) or not free(x, z, radius):
            continue
        s, d = G.road_coords(np.array([x]), np.array([z]))
        if not accept(float(s[0]), float(d[0]), *weights(x, z)):
            continue
        plant(asset, x, z, rng.uniform(*scales), radius=radius)
        placed += 1
    return placed


chance = rng.random
print("young trees", scatter("flora.acacia.b", 11, lambda s, d, road, mud, litter, grass, water: abs(d) > 9 and litter > 0.25, (0.8, 1.3), radius=1.6))
print("shrubs", scatter("flora.shrub.a", 46, lambda s, d, road, mud, litter, grass, water: abs(d) > 6.5 and road < 0.05 and (litter > 0.15 or chance() < 0.25), (1.3, 2.3), radius=0.5))
print("broadleaf", scatter("flora.broadleaf.a", 55, lambda s, d, road, mud, litter, grass, water: abs(d) > 5.2 and road < 0.05 and (litter > 0.1 or mud > 0.3 or chance() < 0.15), (0.9, 1.6), radius=0.3))
print("ferns", scatter("flora.fern.a", 60, lambda s, d, road, mud, litter, grass, water: abs(d) > 6.0 and road < 0.05 and (litter > 0.2 or chance() < 0.12), (0.9, 1.7), radius=0.3))
print("grass", scatter("flora.grass.a", 430, lambda s, d, road, mud, litter, grass, water: road < 0.08 and water < 0.2 and abs(d) > 3.9 and chance() < grass * 0.9 + 0.06, (0.7, 1.7)))
# weeds against the plinth and the posts, where nobody cuts them
for local, scale in (((-1.75, -1.2, 0), 0.8), ((-1.8, 0.9, 0), 1.0), ((-0.9, -2.05, 0), 0.7), ((1.2, -2.2, 0), 0.6), ((-1.7, 2.1, 0), 0.9), ((2.2, 3.3, 0), 0.6), ((9.6, 0.4, 0), 0.8), ((9.7, -1.0, 0), 0.6), ((2.2, -7.2, 0), 0.7), ((9.7, -7.9, 0), 0.7), ((9.9, 2.8, 0), 0.7)):
    p = in_set(local)
    plant("flora.grass.a", p.x, -p.y, scale)

DRESSING.finish()

# ---- lamps --------------------------------------------------------------------------------------------


def lamp(kind, n, local, colour_k, lumens, aim=None):
    obj = bpy.data.objects.new(f"LIGHT_{kind}_{n}", None)
    obj.empty_display_type = "SINGLE_ARROW"
    obj.empty_display_size = 0.6
    obj.location = in_set(local)
    if aim is not None:
        direction = (in_set(aim) - obj.location).normalized()
        obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()  # (the arrow points along +Z)
        obj["aim"] = 1
    obj["colorK"] = colour_k
    obj["lumens"] = lumens
    obj["hours"] = "1050-375"  # 17:30 to 06:15
    COLL.objects.link(obj)


lamp("flood", 1, (2.71, 2.37, 5.28), 5000, 9000.0, aim=(5.0, -0.5, 0.0))
lamp("window", 1, (0.08, 0.0, 2.36), 4200, 2600.0)

# ---- cameras ------------------------------------------------------------------------------------------


def camera(cam_id, title, eye, target):
    data = bpy.data.cameras.new(f"CAM_{cam_id}")
    data.lens = 28
    obj = bpy.data.objects.new(f"CAM_{cam_id}", data)
    obj.location = eye
    look = target - eye
    obj.rotation_euler = look.to_track_quat("-Z", "Y").to_euler()
    obj["title"] = title
    obj["distance"] = look.length
    COLL.objects.link(obj)


def up(p, h):
    return p + Vector((0, 0, h))


camera("gate-approach", "Camp gate: arriving", up(at(-17.0, -1.3), 1.65), up(at(0.0, 2.0), 1.25))
camera("gate-booth", "Camp gate: the guardhouse", up(at(-5.2, -2.6), 1.6), up(at(0.2, 5.4), 1.45))
camera("gate-over", "Camp gate: from above", up(at(-21.0, -17.0), 12.0), up(at(0.0, 2.0), 1.0))
camera("gate-inside", "Camp gate: from the camp", up(at(13.5, -1.8), 1.7), up(at(0.0, 3.2), 1.4))
camera("gate-verge", "Camp gate: the verge", up(at(-8.0, -4.6), 0.55), up(at(-12.5, -8.5), 0.45))
camera("gate-window", "Camp gate: at the window", up(at(-1.6, 1.2), 1.55), up(at(0.3, 4.9), 1.35))

bpy.context.view_layer.update()
print({k: v for k, v in COUNT.items()}, "placements", sum(COUNT.values()))
