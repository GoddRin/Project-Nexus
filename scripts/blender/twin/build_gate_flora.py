"""
Builds the plants of the camp gate slice (P02a) in the open .blend, each at its levels of detail:

  flora.acacia.a       a large spreading rain-tree-like acacia (about 15 m), built here
  flora.acacia.b       a young one (about 7 m), built here
  flora.banana.a       a clump of banana, built here
  flora.shrub.a        a rangy shrub         (Poly Haven shrub_02, CC0)
  flora.broadleaf.a    a broad-leaved clump  (Poly Haven calathea_orbifolia_01, CC0)
  flora.fern.a         a strap-leaved fern   (Poly Haven fern_02, CC0)
  flora.grass.a        a clump of grass      (Poly Haven grass_medium_01, CC0)

Run inside Blender:  exec(open("scripts/blender/twin/build_gate_flora.py").read())
First: node scripts/twin/build-flora-textures.mjs, and the four Poly Haven plants imported into
the collection SRC_polyhaven (their .gltf files, fetched by scripts/twin/fetch-polyhaven-model.mjs).

The trees' wood is tubes along a branching skeleton and their foliage is cards carrying frond
sprays; the same skeleton is meshed three times, lighter each time. Every plant carries a vertex
attribute `_WIND` for the twin's wind (engine/assets.ts): x = how far the vertex leans with the
whole plant (0 at the ground), y = how much it flutters (leaf tips), z = a phase so neighbours do
not move together.
"""
import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.join(os.path.dirname(bpy.data.filepath), "..", "..", "scripts", "blender", "twin"))
import importlib

import model_kit
import twin_lib

importlib.reload(model_kit)

UP = Vector((0, 0, 1))
PH = os.path.join(twin_lib.REPO, "assets-src", "twin", "downloads", "polyhaven")

# frond sprays on flora-acacia-leaves: (u at the stalk, u at the tip, v low, v high), v measured upwards
FRONDS = [
    (0.160, 0.990, 1 - 0.470, 1 - 0.018),
    (0.005, 0.430, 1 - 0.700, 1 - 0.325),
    (0.995, 0.250, 1 - 0.992, 1 - 0.590),
]


# ---- materials ----------------------------------------------------------------------------------------


def pbr_material(name, colour, normal, orm, cutout=False, two_sided=False):
    mat, nodes, links, bsdf = model_kit._fresh(name)

    def image(path, is_colour):
        node = nodes.new("ShaderNodeTexImage")
        key = os.path.basename(path)
        img = bpy.data.images.get(key) or bpy.data.images.load(path)
        img.name = key
        img.filepath = path
        img.reload()
        img.colorspace_settings.name = "sRGB" if is_colour else "Non-Color"
        node.image = img
        return node

    c = image(colour, True)
    links.new(c.outputs["Color"], bsdf.inputs["Base Color"])
    if cutout:
        # (alpha through a Round node is how Blender's glTF exporter is told "cut-out, threshold 0.5")
        cut = nodes.new("ShaderNodeMath")
        cut.operation = "ROUND"
        links.new(c.outputs["Alpha"], cut.inputs[0])
        links.new(cut.outputs[0], bsdf.inputs["Alpha"])
        mat.surface_render_method = "DITHERED"
    if normal:
        n = image(normal, False)
        bump = nodes.new("ShaderNodeNormalMap")
        links.new(n.outputs["Color"], bump.inputs["Color"])
        links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    if orm:
        o = image(orm, False)
        split = nodes.new("ShaderNodeSeparateColor")
        links.new(o.outputs["Color"], split.inputs["Color"])
        links.new(split.outputs["Green"], bsdf.inputs["Roughness"])
        links.new(split.outputs["Blue"], bsdf.inputs["Metallic"])
        occlusion = nodes.new("ShaderNodeGroup")
        occlusion.node_tree = model_kit._gltf_output_group()
        links.new(split.outputs["Red"], occlusion.inputs["Occlusion"])
    else:
        bsdf.inputs["Roughness"].default_value = 0.62 if two_sided else 0.85
    mat.use_backface_culling = not two_sided
    return mat


def materials():
    # Leaves carry colour only: a normal map and a roughness map were most of each file and of the
    # cost of shading a leaf, for a difference that cannot be seen at the size a leaf is drawn.
    # Bark keeps its normal map: a trunk is seen close.
    t = model_kit.TEX_DIR
    pbr_material("flora-acacia-leaves", f"{t}/flora-acacia-leaves_color.png", None, None, cutout=True, two_sided=True)
    pbr_material("flora-acacia-bark", f"{t}/flora-acacia-bark_color.png", f"{t}/flora-acacia-bark_normal.png", None)
    pbr_material("flora-banana", f"{t}/flora-banana_color.png", None, None, cutout=True, two_sided=True)
    for name, pid in (("flora-shrub", "shrub_02"), ("flora-broadleaf", "calathea_orbifolia_01"), ("flora-fern", "fern_02")):
        d = os.path.join(PH, pid, "textures")
        pbr_material(name, f"{d}/{pid}_diff_2k.jpg", None, None, two_sided=True)
    # (the grass tufts are cards with a cut-out; the other three are modelled leaf by leaf)
    pbr_material("flora-grass", f"{t}/flora-grass_color.png", None, None, cutout=True, two_sided=True)


# ---- a plant mesh in the making -----------------------------------------------------------------------


class Plant:
    def __init__(self, mats):
        self.mats = mats
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new("UVMap")
        self.wind = self.bm.verts.layers.float_vector.new("_WIND")
        self.normals = {}  # vertex -> custom normal

    def vert(self, co, wind, normal=None):
        v = self.bm.verts.new(co)
        v[self.wind] = wind
        if normal is not None:
            self.normals[v] = Vector(normal).normalized()
        return v

    def face(self, verts, uvs, mat):
        f = self.bm.faces.new(verts)
        f.material_index = mat
        f.smooth = True
        for loop, c in zip(f.loops, uvs):
            loop[self.uv].uv = c
        return f

    def tube(self, points, radii, sides, mat, wind, v_scale=1.0, u_repeat=1.0, cap=False):
        """A tapering tube along `points`. `wind[i]` is the wind vector at each ring."""
        rings = []
        length = 0.0
        ref = Vector((1, 0, 0))
        for i, p in enumerate(points):
            ahead = (points[min(i + 1, len(points) - 1)] - points[max(i - 1, 0)]).normalized()
            side = ahead.cross(ref)
            if side.length < 1e-3:
                side = ahead.cross(Vector((0, 1, 0)))
            side.normalize()
            ref = side.cross(ahead)  # carried along, so the tube does not twist
            around = ahead.cross(side)
            if i:
                length += (p - points[i - 1]).length
            ring = []
            for k in range(sides + 1):
                a = 2 * math.pi * k / sides
                d = side * math.cos(a) + around * math.sin(a)
                # (the seam column is doubled so the bark's UVs can wrap)
                ring.append((self.vert(p + d * radii[i], wind[i], d), (u_repeat * k / sides, length * v_scale)))
            rings.append(ring)
        for a, b in zip(rings, rings[1:]):
            for k in range(sides):
                self.face((a[k][0], a[k + 1][0], b[k + 1][0], b[k][0]), (a[k][1], a[k + 1][1], b[k + 1][1], b[k][1]), mat)
        if cap:
            top = rings[-1]
            c = self.vert(points[-1], wind[-1], (points[-1] - points[-2]).normalized())
            for k in range(sides):
                self.face((top[k][0], top[k + 1][0], c), (top[k][1], top[k + 1][1], top[k][1]), mat)

    def card(self, base, along, across, length, width, rect, mat, wind_base, flutter, centre, bend=0.0, segments=2):
        """
        A foliage card from `base` out along `along`, `width` wide, carrying `rect` (stalk u, tip u,
        v low, v high). Its normals lean away from `centre` so a crown shades as one soft volume.
        """
        u0, u1, v0, v1 = rect
        normal = along.cross(across).normalized()
        rows = []
        for s in range(segments + 1):
            t = s / segments
            p = base + along * (length * t) - normal * (bend * length * t * t)
            row = []
            for side, v in ((-0.5, v0), (0.5, v1)):
                co = p + across * (width * side)
                out = (co - centre).normalized()
                n = (out * 0.75 + UP * 0.35 + normal * (0.2 if normal.z > 0 else -0.2)).normalized()
                row.append((self.vert(co, (wind_base[0], flutter * t, wind_base[2]), n), (u0 + (u1 - u0) * t, v)))
            rows.append(row)
        for a, b in zip(rows, rows[1:]):
            self.face((a[0][0], a[1][0], b[1][0], b[0][0]), (a[0][1], a[1][1], b[1][1], b[0][1]), mat)

    def triangles(self):
        return sum(len(f.verts) - 2 for f in self.bm.faces)

    def finish(self, name, coll):
        bm = self.bm
        bm.normal_update()
        mesh = bpy.data.meshes.new(name)
        normals = []
        for f in bm.faces:
            for loop in f.loops:
                normals.append(tuple(self.normals.get(loop.vert, loop.vert.normal)))
        bm.to_mesh(mesh)
        bm.free()
        for m in self.mats:
            mesh.materials.append(bpy.data.materials[m])
        mesh.normals_split_custom_set(normals)
        obj = bpy.data.objects.new(name, mesh)
        coll.objects.link(obj)
        return obj


# ---- trees --------------------------------------------------------------------------------------------


def grow(seed, spec):
    """
    The skeleton of a tree: a list of branches, each {points, radii, level, phase, parent height share},
    grown level by level from `spec` (one dict per level).
    """
    rng = random.Random(seed)
    branches = []

    def branch(start, direction, level, radius, phase):
        s = spec[level]
        length = rng.uniform(*s["length"])
        n = s["segments"]
        d = direction.normalized()
        pts = [start.copy()]
        for i in range(n):
            wander = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * s["wander"]
            d = (d + wander + UP * s["lift"]).normalized()
            pts.append(pts[-1] + d * (length / n))
        radii = [radius * (1 - s["taper"] * i / n) for i in range(n + 1)]
        if level == 0:
            radii[0] *= 1.55  # root flare
            radii[1] *= 1.12
        me = {"points": pts, "radii": radii, "level": level, "phase": phase}
        branches.append(me)
        if level + 1 < len(spec):
            c = spec[level + 1]
            count = rng.randint(*c["count"])
            turn = rng.uniform(0, 2 * math.pi)
            for k in range(count):
                t = c["from"] + (1 - c["from"]) * (k + rng.uniform(0.2, 0.8)) / count
                f = t * n
                i = min(int(f), n - 1)
                p = pts[i].lerp(pts[i + 1], f - i)
                parent_dir = (pts[i + 1] - pts[i]).normalized()
                side = parent_dir.cross(UP)
                if side.length < 1e-3:
                    side = Vector((1, 0, 0))
                side.normalize()
                azimuth = turn + k * 2.39996 + rng.uniform(-0.4, 0.4)  # golden angle, so limbs spread evenly
                out = Matrix.Rotation(azimuth, 3, parent_dir) @ side
                spread = math.radians(rng.uniform(*c["spread"]))
                child_dir = parent_dir * math.cos(spread) + out * math.sin(spread)
                child_radius = radii[i] * c["girth"]
                branch(p, child_dir, level + 1, child_radius, rng.random() if level == 0 else phase)

    branch(Vector((0, 0, -0.08)), Vector((spec[0].get("lean", 0.0), 0, 1)), 0, spec[0]["radius"], 0.0)
    return branches


def mesh_tree(branches, spec, lod, seed, leaf):
    """
    One level of detail of a tree. `leaf` = {per_twig, length, width} for LOD 0; fewer, larger cards
    are used further out so the crown keeps its mass.
    """
    rng = random.Random(seed * 31 + 7)
    plant = Plant(["flora-acacia-bark", "flora-acacia-leaves"])
    top = max(p.z for b in branches for p in b["points"])
    crown = [p for b in branches if b["level"] >= 2 for p in b["points"]]
    centre = sum(crown, Vector()) / len(crown)
    centre.z -= (top - centre.z) * 0.35
    last = len(spec) - 1

    def wind_at(p, level, phase, flutter=0.0):
        return (max(0.0, p.z / top) ** 1.5 * (0.5 + 0.17 * level), flutter, phase)

    sides_by_lod = [spec[0]["sides"], [max(3, s * 2 // 3) for s in spec[0]["sides"]], [max(3, s // 2) for s in spec[0]["sides"]]][lod]
    for b in branches:
        level = b["level"]
        # wood: every level at LOD 0; no twigs at LOD 1; trunk and limbs only at LOD 2
        if level <= (last, last - 1, 1)[lod]:
            pts, radii = b["points"], b["radii"]
            if lod and len(pts) > 3:
                keep = list(range(0, len(pts), 2 if lod == 1 else 3))
                if keep[-1] != len(pts) - 1:
                    keep.append(len(pts) - 1)
                pts = [pts[i] for i in keep]
                radii = [radii[i] for i in keep]
            wind = [wind_at(p, level, b["phase"]) for p in pts]
            girth = 2 * math.pi * radii[0]
            plant.tube(pts, radii, sides_by_lod[level], 0, wind, v_scale=1 / 1.6, u_repeat=max(1, round(girth / 1.6)), cap=level == last)

        # foliage: on the twigs (and the outer half of the branches that carry them)
        carries = level == last or (level == last - 1 and lod < 2)
        if not carries:
            continue
        if lod == 0:
            count = leaf["per_twig"] if level == last else leaf["per_twig"] // 3
            scale = 1.0
        elif lod == 1:
            count = max(2, leaf["per_twig"] // 3) if level == last else 0
            scale = 1.75
        else:
            count = 2 if level == last else 0
            scale = 2.5
        if lod == 2 and rng.random() < 0.35:
            continue
        pts = b["points"]
        n = len(pts) - 1
        for k in range(count):
            t = 0.25 + 0.75 * (k + rng.random()) / max(count, 1)
            f = min(t * n, n - 1e-4)
            i = int(f)
            p = pts[i].lerp(pts[i + 1], f - i)
            d = (pts[i + 1] - pts[i]).normalized()
            side = d.cross(UP)
            if side.length < 1e-3:
                side = Vector((1, 0, 0))
            side.normalize()
            out = Matrix.Rotation(rng.uniform(0, 2 * math.pi), 3, d) @ side
            along = (d * rng.uniform(0.25, 0.9) + out * rng.uniform(0.5, 1.0) - UP * rng.uniform(0.0, 0.35)).normalized()
            flat = along.cross(UP)
            if flat.length < 1e-3:
                flat = Vector((1, 0, 0))
            across = (Matrix.Rotation(rng.uniform(-0.7, 0.7), 3, along) @ flat.normalized()).normalized()
            rect = FRONDS[rng.randrange(3)]
            size = rng.uniform(0.8, 1.2) * scale
            aspect = abs(rect[3] - rect[2]) / abs(rect[1] - rect[0])
            length = leaf["length"] * size
            plant.card(p, along, across, length, length * aspect, rect, 1, wind_at(p, level + 1, b["phase"]), 1.0, centre, bend=0.0, segments=1)
    return plant


ACACIA_LARGE = [
    {"length": (4.2, 4.8), "segments": 6, "wander": 0.05, "lift": 0.0, "taper": 0.3, "radius": 0.40, "lean": 0.04, "sides": [10, 8, 5, 3]},
    {"count": (6, 7), "from": 0.70, "spread": (44, 68), "girth": 0.54, "length": (7.0, 9.0), "segments": 7, "wander": 0.13, "lift": 0.07, "taper": 0.72},
    {"count": (5, 6), "from": 0.28, "spread": (40, 78), "girth": 0.62, "length": (3.0, 4.6), "segments": 5, "wander": 0.2, "lift": 0.0, "taper": 0.75},
    {"count": (6, 8), "from": 0.2, "spread": (30, 80), "girth": 0.5, "length": (1.2, 2.1), "segments": 3, "wander": 0.25, "lift": -0.03, "taper": 0.8},
]
ACACIA_YOUNG = [
    {"length": (2.3, 2.7), "segments": 5, "wander": 0.07, "lift": 0.0, "taper": 0.3, "radius": 0.11, "lean": 0.10, "sides": [8, 6, 4, 3]},
    {"count": (4, 5), "from": 0.55, "spread": (25, 50), "girth": 0.6, "length": (2.6, 3.6), "segments": 5, "wander": 0.14, "lift": 0.16, "taper": 0.7},
    {"count": (3, 4), "from": 0.35, "spread": (30, 65), "girth": 0.6, "length": (1.2, 1.9), "segments": 4, "wander": 0.2, "lift": 0.05, "taper": 0.75},
    {"count": (5, 6), "from": 0.25, "spread": (30, 75), "girth": 0.55, "length": (0.6, 1.0), "segments": 2, "wander": 0.25, "lift": 0.0, "taper": 0.8},
]


def build_tree(asset_id, spec, seed, leaf, lod_distances):
    coll = model_kit.reset_asset(asset_id, "hero-tree", ["polyhaven.jacaranda_tree", "twin.authored"], lod_distances=lod_distances)
    name = twin_lib.asset_name(asset_id)
    skeleton = grow(seed, spec)
    made = {}
    for lod in (0, 1, 2):
        plant = mesh_tree(skeleton, spec, lod, seed, leaf)
        made[lod] = plant.triangles()
        plant.finish(f"{name}_LOD{lod}", coll)
    model_kit.hide_lower_lods(coll)
    size = max(p.z for b in skeleton for p in b["points"])
    return made, round(size, 1)


# ---- banana -------------------------------------------------------------------------------------------


def build_banana():
    coll = model_kit.reset_asset("flora.banana.a", "shrub", ["twin.authored"], lod_distances=(22, 70), origin="free")
    made = {}
    for lod in (0, 1):
        rng = random.Random(19)
        plant = Plant(["flora-banana"])
        stems = [(0.0, 0.0, 3.6, 0.13), (0.55, 0.25, 2.9, 0.11), (-0.35, 0.5, 2.3, 0.09), (0.15, -0.55, 1.5, 0.07)]
        for sx, sy, height, radius in stems:
            lean = Vector((rng.uniform(-0.08, 0.08), rng.uniform(-0.08, 0.08), 1)).normalized()
            base = Vector((sx, sy, -0.05))
            phase = rng.random()
            segs = 3 if lod == 0 else 1
            pts = [base + lean * (height * i / segs) for i in range(segs + 1)]
            radii = [radius * (1.25 - 0.55 * i / segs) for i in range(segs + 1)]
            wind = [(max(0.0, p.z / 4.5) ** 1.5 * 0.5, 0.0, phase) for p in pts]
            sides = 7 if lod == 0 else 4
            # the stem strip of the sheet is its right-hand third
            before = len(plant.bm.faces)
            plant.tube(pts, radii, sides, 0, wind, v_scale=1 / 2.5, u_repeat=1.0)
            plant.bm.faces.ensure_lookup_table()
            for f in plant.bm.faces[before:]:
                for loop in f.loops:
                    u, v = loop[plant.uv].uv
                    loop[plant.uv].uv = (0.66 + 0.32 * u, v)
            top = pts[-1]
            leaves = (rng.randint(6, 8) if lod == 0 else 5) if height > 2 else (4 if lod == 0 else 3)
            turn = rng.uniform(0, 6.28)
            for k in range(leaves):
                azimuth = turn + k * 2.39996
                out = Vector((math.cos(azimuth), math.sin(azimuth), 0))
                rise = math.radians(rng.uniform(35, 78) if k else 82)  # the newest leaf stands nearly upright
                length = rng.uniform(1.7, 2.5) * (height / 3.6) ** 0.5
                width = length * 0.27
                droop = rng.uniform(0.25, 0.7)
                n = 6 if lod == 0 else 3
                rows = []
                p = top.copy()
                d = (out * math.cos(rise) + UP * math.sin(rise)).normalized()
                for s in range(n + 1):
                    t = s / n
                    across = d.cross(UP).normalized() if abs(d.z) < 0.999 else Vector((0, 1, 0))
                    normal = across.cross(d).normalized()
                    # the blade folds down slightly either side of the midrib
                    fold = 0.16 * width
                    w = width * 0.5
                    flutter = t * t
                    wv = (max(0.0, p.z / 4.5) ** 1.5 * 0.6, flutter, phase)
                    left = plant.vert(p - across * w - normal * fold, wv, normal + across * -0.3)
                    mid = plant.vert(p, wv, normal)
                    right = plant.vert(p + across * w - normal * fold, wv, normal + across * 0.3)
                    rows.append((left, mid, right, 0.01 + 0.98 * t))
                    step = length / n
                    d = (d - UP * (droop * 2.2 * t / n) * (1.0 + t)).normalized()
                    p = p + d * step
                for a, b in zip(rows, rows[1:]):
                    if lod == 0:
                        plant.face((a[0], a[1], b[1], b[0]), ((0.005, a[3]), (0.3125, a[3]), (0.3125, b[3]), (0.005, b[3])), 0)
                        plant.face((a[1], a[2], b[2], b[1]), ((0.3125, a[3]), (0.62, a[3]), (0.62, b[3]), (0.3125, b[3])), 0)
                    else:
                        plant.face((a[0], a[2], b[2], b[0]), ((0.005, a[3]), (0.62, a[3]), (0.62, b[3]), (0.005, b[3])), 0)
        # (vertices the lighter level does not use: the midrib column)
        loose = [v for v in plant.bm.verts if not v.link_faces]
        for v in loose:
            plant.normals.pop(v, None)
        bmesh.ops.delete(plant.bm, geom=loose, context="VERTS")
        made[lod] = plant.triangles()
        plant.finish(f"banana.a_LOD{lod}", coll)
    model_kit.hide_lower_lods(coll)
    return made


# ---- adopted Poly Haven plants --------------------------------------------------------------------------


def adopt(asset_id, parts, material, credits, targets, lod_distances, wind_height=None):
    """
    An asset from imported Poly Haven objects. `parts` = [(object name, scale, (x, y) offset, turn in degrees)];
    the pieces are joined, set on the ground at the origin, reduced to `targets` triangles per level and
    given the wind attribute.
    """
    coll = model_kit.reset_asset(asset_id, "shrub", credits, lod_distances=lod_distances, origin="free")
    name = twin_lib.asset_name(asset_id)
    joined = bmesh.new()
    for obj_name, scale, (ox, oy), turn in parts:
        src = bpy.data.objects[obj_name]
        part = bmesh.new()
        part.from_mesh(src.data)
        # stand it on its own base centre first
        xs = [v.co.x for v in part.verts]
        ys = [v.co.y for v in part.verts]
        zs = [v.co.z for v in part.verts]
        centre = Vector(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(zs)))
        M = Matrix.Translation((ox, oy, 0)) @ Matrix.Rotation(math.radians(turn), 4, "Z") @ Matrix.Scale(scale, 4) @ Matrix.Translation(-centre)
        part.transform(M)
        tmp = bpy.data.meshes.new("__adopt")
        part.to_mesh(tmp)
        part.free()
        joined.from_mesh(tmp)
        bpy.data.meshes.remove(tmp)
    base = bpy.data.meshes.new(f"__{name}_full")
    joined.to_mesh(base)
    joined.free()
    full = twin_lib.triangle_count(base)
    made = {}
    for lod, target in enumerate(targets):
        obj = bpy.data.objects.new(f"{name}_LOD{lod}", base.copy())
        coll.objects.link(obj)
        if target < full:
            ratio = target / full
            mesh = None
            for _ in range(12):
                mod = obj.modifiers.new("lod", "DECIMATE")
                mod.ratio = ratio
                mod.use_collapse_triangulate = True
                depsgraph = bpy.context.evaluated_depsgraph_get()
                mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph), depsgraph=depsgraph)
                obj.modifiers.clear()
                bm = bmesh.new()
                bm.from_mesh(mesh)
                bmesh.ops.dissolve_degenerate(bm, edges=bm.edges[:], dist=1e-6)
                bmesh.ops.delete(bm, geom=[e for e in bm.edges if not e.link_faces], context="EDGES")
                bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
                bm.to_mesh(mesh)
                bm.free()
                if twin_lib.triangle_count(mesh) <= target:
                    break
                bpy.data.meshes.remove(mesh)
                mesh = None
                ratio *= 0.9
            if mesh is None:
                raise RuntimeError(f"{asset_id} LOD{lod}: could not reach {target} triangles")
            old = obj.data
            obj.data = mesh
            bpy.data.meshes.remove(old)
        mesh = obj.data
        mesh.name = obj.name
        # (reduction can take the lowest vertices away: stand the level back on the ground)
        lowest = min(v.co.z for v in mesh.vertices)
        for v in mesh.vertices:
            v.co.z -= lowest
        mesh.materials.clear()
        mesh.materials.append(bpy.data.materials[material])
        for poly in mesh.polygons:
            poly.use_smooth = True
        height = wind_height or max(v.co.z for v in mesh.vertices)
        attr = mesh.attributes.get("_WIND") or mesh.attributes.new("_WIND", "FLOAT_VECTOR", "POINT")
        for v in mesh.vertices:
            t = max(0.0, v.co.z / height)
            phase = (math.sin(v.co.x * 12.9898 + v.co.y * 78.233) * 43758.5453) % 1.0
            attr.data[v.index].vector = (t ** 1.4 * 0.6, t * t * 0.7, phase)
        made[lod] = twin_lib.triangle_count(mesh)
    bpy.data.meshes.remove(base)
    model_kit.hide_lower_lods(coll)
    return made


def build_adopted():
    out = {}
    out["flora.shrub.a"] = adopt("flora.shrub.a", [("shrub_02_b", 1.25, (0, 0), 0), ("shrub_02_d", 1.1, (0.35, 0.25), 140)], "flora-shrub", ["polyhaven.shrub_02"], (1200, 260), (18, 55))
    out["flora.broadleaf.a"] = adopt(
        "flora.broadleaf.a",
        [("calathea_orbifolia_01_a", 1.9, (0, 0), 0), ("calathea_orbifolia_01_c", 1.7, (0.45, 0.3), 80), ("calathea_orbifolia_01_b", 1.6, (-0.35, 0.4), 200)],
        "flora-broadleaf",
        ["polyhaven.calathea_orbifolia_01"],
        (1000, 220),
        (15, 45),
    )
    out["flora.fern.a"] = adopt("flora.fern.a", [("fern_02_b", 1.3, (0, 0), 0)], "flora-fern", ["polyhaven.fern_02"], (900, 200), (15, 45))
    out["flora.grass.a"] = adopt(
        "flora.grass.a",
        [
            ("grass_medium_01_tall_a_LOD0", 2.3, (0.0, 0.0), 0),
            ("grass_medium_01_tall_b_LOD0", 2.1, (0.22, 0.12), 70),
            ("grass_medium_01_tall_c_LOD0", 2.2, (-0.2, 0.16), 150),
            ("grass_medium_01_mid_b_LOD0", 2.0, (0.05, -0.24), 30),
            ("grass_medium_01_small_a_LOD0", 2.2, (-0.26, -0.12), 200),
            ("grass_medium_01_small_b_LOD0", 2.2, (0.3, -0.14), 280),
        ],
        "flora-grass",
        ["polyhaven.grass_medium_01"],
        (700, 160),
        (12, 40),
    )
    return out


materials()
print("acacia.a", build_tree("flora.acacia.a", ACACIA_LARGE, 5, {"per_twig": 15, "length": 0.72}, (40, 110)))
print("acacia.b", build_tree("flora.acacia.b", ACACIA_YOUNG, 11, {"per_twig": 12, "length": 0.6}, (30, 90)))
print("banana", build_banana())
print(build_adopted())
