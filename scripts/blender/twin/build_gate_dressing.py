"""
The site dressing kit (P02f): small props, the fence, a power pole and the camp's plants, built so the
whole site can reuse them (P05, P06), and the gate's own decals and services.

Run inside Blender, after build_gate_structures.py (it shares the gate's sheets):
    exec(open("scripts/blender/twin/build_gate_dressing.py").read())
which builds every kit asset. The gate's placements, decals and services are laid by
build_gate_zone.py, which imports this file (`layout`).

Textures: node scripts/twin/build-atlases.mjs dressing (the dressing trim sheet, the fence's cut-out
sheet, the decal sheet and the plant cards; scripts/twin/atlases/dressing.json).

Every prop of the kit shares one material (trim-dressing), so a new prop costs a draw and no new
shader. Sizes are real: a 20-litre jerrycan, a 200-litre drum, a 1200 x 1000 pallet, a 50 kg sack.

Asset frame: metres, Z up, origin at the base centre. Things that hang (a hard hat on a nail, an
umbrella, a calendar, a camera on its bracket) have their origin at the fixing and `twin_origin`
"pivot".
"""
import importlib
import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.join(os.path.dirname(bpy.data.filepath), "..", "..", "scripts", "blender", "twin"))
import model_kit  # noqa: E402
import twin_lib  # noqa: E402

importlib.reload(model_kit)
from model_kit import Kit, Prints, Sheet, Stamps, rot_axis, rot_z  # noqa: E402

D = "trim-dressing"
F = "trim-fence"
P = "flora-camp"
DECAL = "DECAL_gate"
CREDITS_KIT = ["polyhaven.hessian_230", "polyhaven.wood_planks_grey", "polyhaven.blue_metal_plate", "polyhaven.metal_plate_02", "polyhaven.concrete_wall_008", "polyhaven.rusty_metal_02"]
CREDITS_DECALS = ["polyhaven.gravel_floor", "polyhaven.forest_leaves_03", "polyhaven.muddy_tracks"]


# ---- materials ----------------------------------------------------------------------------------------


def materials():
    model_kit.trim_material(D)
    cutout(F, True)
    # plant cards carry colour and cut-out only, as the gate's other leaves do (build_gate_flora.py):
    # their relief cannot be seen at the size a leaf is drawn, and it made a shader no other plant shares
    import build_gate_flora  # noqa: E402

    build_gate_flora.pbr_material(P, os.path.join(model_kit.TEX_DIR, f"{P}_color.png"), None, None, cutout=True, two_sided=True)
    decal_material(DECAL, "decals-gate")


def cutout(sheet_name, with_maps, two_sided=True):
    """A trim sheet or card sheet with its cut-out in the colour's alpha (exported as glTF MASK)."""
    mat = model_kit.trim_material(sheet_name) if with_maps else model_kit.sign_material(sheet_name, roughness=0.55)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
    colour = next(n for n in nodes if n.type == "TEX_IMAGE" and n.image and n.image.name.endswith("_color.png"))
    cut = nodes.new("ShaderNodeMath")
    cut.operation = "ROUND"
    links.new(colour.outputs["Alpha"], cut.inputs[0])
    links.new(cut.outputs[0], bsdf.inputs["Alpha"])
    mat.surface_render_method = "DITHERED"
    mat.use_backface_culling = not two_sided
    if not with_maps:
        orm = model_kit._image(f"{sheet_name}_orm.png", False)
        o = nodes.new("ShaderNodeTexImage")
        o.image = orm
        split = nodes.new("ShaderNodeSeparateColor")
        links.new(o.outputs["Color"], split.inputs["Color"])
        links.new(split.outputs["Green"], bsdf.inputs["Roughness"])
        n = nodes.new("ShaderNodeTexImage")
        n.image = model_kit._image(f"{sheet_name}_normal.png", False)
        bump = nodes.new("ShaderNodeNormalMap")
        links.new(n.outputs["Color"], bump.inputs["Color"])
        links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def decal_material(name, sheet_name):
    """Colour with alpha blended over what is under it, with its own normal and roughness (engine/assets.ts: DECAL_...)."""
    mat = model_kit.trim_material(sheet_name)
    mat.name = name
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
    colour = next(n for n in nodes if n.type == "TEX_IMAGE" and n.image and n.image.name.endswith("_color.png"))
    links.new(colour.outputs["Alpha"], bsdf.inputs["Alpha"])
    mat.surface_render_method = "BLENDED"
    mat.use_backface_culling = True
    return mat


SHEET = None
PRINTS = None


def kit(lod):
    k = Kit(SHEET, lod)
    k.prints = PRINTS
    return k


def build(asset_id, twin_class, make, credits=None, lod_distances=None, origin=None, levels=(0, 1, 2)):
    """Build an asset at its levels: `make(k)` draws one level into the kit `k`."""
    coll = model_kit.reset_asset(asset_id, twin_class, credits or CREDITS_KIT, lod_distances=lod_distances, origin=origin)
    name = twin_lib.asset_name(asset_id)
    made = {}
    for lod in levels:
        k = kit(lod)
        make(k)
        if not k.bm.faces:
            k.bm.free()
            continue
        made[lod] = k.triangles()
        k.finish(f"{name}_LOD{lod}", coll)
    model_kit.hide_lower_lods(coll)
    return made


# ---- props --------------------------------------------------------------------------------------------


def rice_sacks(k):
    """Three 50 kg sacks of sand in old rice and feed sacks: two side by side, one across them."""
    r = k.prints.rects
    k.pillow(D, "sack", (0.0, -0.25, 0.0), (0.78, 0.46, 0.17), turn=math.radians(3), seed=1, top_rect=r["sack-rice"])
    k.pillow(D, "sack", (0.04, 0.24, 0.0), (0.76, 0.45, 0.17), turn=math.radians(-4), seed=2, top_rect=r["sack-feed"])
    if k.lod < 2:
        k.pillow(D, "sack", (0.02, 0.0, 0.135), (0.78, 0.46, 0.16), turn=math.radians(84), seed=3, top_rect=r["sack-rice"], sag=0.5)


def chair_monobloc(k):
    """A white monobloc armchair, the kind every Philippine site has a stack of (seat 0.44 m high)."""
    seat_z = 0.43
    # seat, dished a little
    k.box(D, "plastic-white", (-0.215, -0.2, seat_z - 0.022), (0.215, 0.21, seat_z), u=0, bevel=0.025)
    if k.lod == 0:
        k.box(D, "plastic-white", (-0.2, -0.205, seat_z - 0.05), (0.2, -0.19, seat_z - 0.02), u=0)  # the front skirt
    # four legs splayed outwards, a little tapered
    for sx in (-1, 1):
        for sy in (-1, 1):
            top = Vector((sx * 0.19, sy * 0.18, seat_z - 0.02))
            foot = Vector((sx * 0.25, sy * 0.25 + (0.02 if sy > 0 else -0.01), 0.0))
            k.cyl(D, "plastic-white", foot, top, 0.019, r1=0.024, segs=8)
    # back: a top rail and four slats on an arc, leaning back
    lean = math.radians(12)
    B = rot_axis(-lean, "X", about=(0, 0.21, seat_z))
    arc_r = 0.42
    centre = Vector((0, 0.21 - arc_r, 0))
    span = math.radians(62)
    slats = 4 if k.lod < 2 else 0
    for i in range(slats):
        a = math.pi / 2 - span / 2 + span * (i + 0.5) / slats
        p = centre + Vector((math.cos(a), math.sin(a), 0)) * arc_r
        k.box(D, "plastic-white", (p.x - 0.03, p.y - 0.008, seat_z), (p.x + 0.03, p.y + 0.012, seat_z + 0.3), u=2, M=B @ rot_z(a - math.pi / 2, about=(p.x, p.y, 0)), bevel=0.004)
    rail = []
    n = 8 if k.lod == 0 else 4
    for i in range(n + 1):
        a = math.pi / 2 - span * 0.62 + span * 1.24 * i / n
        p = centre + Vector((math.cos(a), math.sin(a), 0)) * arc_r
        rail.append(B @ Vector((p.x, p.y, seat_z + 0.33)))
    k.sweep(D, "plastic-white", rail, 0.04, segs=6, flat=0.45)
    # arms, from the back's ends forward and down to the front legs
    for sx in (-1, 1):
        back_end = rail[-1] if sx < 0 else rail[0]
        pts = [back_end, Vector((sx * 0.235, 0.05, seat_z + 0.19)), Vector((sx * 0.24, -0.15, seat_z + 0.18)), Vector((sx * 0.215, -0.2, seat_z + 0.02))]
        k.sweep(D, "plastic-white", pts, 0.026, segs=6, flat=0.5)


def pipe_offcuts(k):
    """Offcuts of 50 mm galvanised pipe left lying in the grass."""
    for p0, p1 in (((-0.6, -0.12, 0.03), (0.62, -0.05, 0.03)), ((-0.35, 0.1, 0.03), (0.42, 0.2, 0.03)), ((-0.15, 0.02, 0.088), (0.7, 0.1, 0.06))):
        if k.lod == 2:
            k.cyl(D, "galv", p0, p1, 0.03, segs=6, caps=False)
        else:
            k.tube(D, "galv", p0, p1, 0.03, 0.026, segs=10)


def pallet(k):
    """A stringer pallet, 1200 x 1000 x 144 mm, grey with age, one deck board loose."""
    rng = random.Random(5)
    bev = 0.004
    # three stringers across (along Y)
    for x in (-0.55, 0.0, 0.55):
        k.box(D, "pallet", (x - 0.045, -0.5, 0.022), (x + 0.045, 0.5, 0.122), u=1, bevel=bev, uoff=rng.random())
    # seven deck boards along X on top
    for i, y in enumerate((-0.45, -0.3, -0.15, 0.0, 0.15, 0.3, 0.45)):
        if k.lod == 2 and i % 2:
            continue  # (far off, the gaps between boards are not seen)
        dy = 0.012 if i == 4 else 0.0
        turn = rot_z(math.radians(2.5), about=(0, y, 0)) if i == 4 else None
        k.box(D, "pallet", (-0.6, y - 0.05 + dy, 0.122), (0.6, y + 0.05 + dy, 0.144), u=0, bevel=bev, uoff=rng.random(), M=turn)
    # bottom boards
    for y in (-0.45, 0.45):
        k.box(D, "pallet", (-0.6, y - 0.05, 0.0), (0.6, y + 0.05, 0.022), u=0, bevel=bev, uoff=rng.random())
    if k.lod == 0:
        k.plate(D, k.prints.rects["pallet-stamp"], (0.47, -0.501, 0.03), (0.6, -0.5, 0.11), "-y")


def standpipe(k):
    """A boot-wash tap: a galvanised riser in a little concrete footing, a brass-look tap, a hose coiled below."""
    k.box(D, "concrete", (-0.12, -0.12, 0.0), (0.12, 0.12, 0.08), bevel=0.01, skip="-z")
    k.cyl(D, "galv", (0, 0, 0.08), (0, 0, 0.68), 0.0135, segs=8)
    k.cyl(D, "galv", (0, 0, 0.68), (0.06, 0, 0.68), 0.0135, segs=8)
    k.cyl(D, "stainless", (0.06, 0, 0.66), (0.06, 0, 0.71), 0.02, segs=8)
    k.cyl(D, "stainless", (0.06, 0, 0.66), (0.11, 0, 0.62), 0.011, segs=6)
    if k.lod < 2:
        k.cyl(D, "plastic-black", (0.06, 0, 0.71), (0.06, 0, 0.745), 0.006, segs=6)
        k.box(D, "plastic-black", (0.03, -0.004, 0.74), (0.09, 0.004, 0.75))
    # the hose: from the tap's spout down to the ground and round in loose coils
    pts = [Vector((0.11, 0, 0.62)), Vector((0.16, 0.02, 0.45)), Vector((0.22, 0.08, 0.15)), Vector((0.32, 0.12, 0.03))]
    loops = 3 if k.lod == 0 else 2
    per = 22 if k.lod == 0 else 10
    c = Vector((0.52, 0.12, 0.0))
    for i in range(1, loops * per + 1):
        a = math.pi + 2 * math.pi * i / per
        r = 0.22 + 0.03 * math.sin(i * 0.7) - 0.015 * (i / per)
        z = 0.012 + 0.017 * (i / per) + 0.004 * math.sin(i * 1.3)
        pts.append(c + Vector((math.cos(a) * r, math.sin(a) * r * 0.85, z)))
    if k.lod < 2:
        k.sweep(D, "rubber", pts, 0.0095, segs=6)


def jerrycan(k):
    """A 20-litre plastic jerrycan (yellow, for the genset's diesel), 0.35 x 0.165 x 0.465 m with its handles."""
    k.box(D, "plastic-yellow", (-0.175, -0.0825, 0.0), (0.175, 0.0825, 0.41), u=0, bevel=0.03 if k.lod == 0 else 0.0)
    if k.lod < 2:
        # three handles across the top, the middle one on a bridge
        for x in (-0.1, 0.0, 0.1):
            k.box(D, "plastic-yellow", (x - 0.018, -0.012, 0.41), (x + 0.018, 0.012, 0.455), bevel=0.006)
        k.box(D, "plastic-yellow", (-0.125, -0.012, 0.443), (0.125, 0.012, 0.465), u=0, bevel=0.006)
        # the spout and its cap
        k.cyl(D, "plastic-yellow", (0.13, 0, 0.405), (0.15, 0, 0.445), 0.026, segs=10)
        k.cyl(D, "plastic-black", (0.15, 0, 0.445), (0.155, 0, 0.47), 0.03, segs=10)
    if k.lod == 0:
        k.plate(D, k.prints.rects["jerry-label"], (-0.07, -0.0835, 0.12), (0.07, -0.0825, 0.26), "-y")


def slippers(k):
    """A pair of rubber slippers (tsinelas) left by the door."""
    outline = [(0.0, 0.0), (0.045, 0.006), (0.052, 0.06), (0.048, 0.13), (0.055, 0.19), (0.047, 0.235), (0.025, 0.258), (0.0, 0.262), (-0.025, 0.256), (-0.045, 0.232), (-0.05, 0.18), (-0.042, 0.11), (-0.044, 0.05), (-0.035, 0.008)]
    rect = k.prints.rects["slipper"]
    for side, (ox, oy, turn) in ((1, (0.0, 0.0, 0.0)), (-1, (0.14, 0.04, math.radians(12)))):
        pts = [((x * side), y - 0.131) for x, y in outline]
        bm = bmesh.new()
        uv = bm.loops.layers.uv.new("UVMap")
        top = [bm.verts.new((x, y, 0.016)) for x, y in pts]
        low = [bm.verts.new((x, y, 0.0)) for x, y in pts]
        f = bm.faces.new(top)
        u0, v0, u1, v1 = rect
        for loop in f.loops:
            co = loop.vert.co
            loop[uv].uv = (u0 + (co.x * side / 0.11 + 0.5) * (u1 - u0), v0 + (co.y / 0.262 + 0.5) * (v1 - v0))
        n = len(pts)
        vb0, vb1 = k._band("rubber")
        for i in range(n):
            j = (i + 1) % n
            g = bm.faces.new((low[i], low[j], top[j], top[i]))
            for loop in g.loops:
                co = loop.vert.co
                loop[uv].uv = ((co.x + co.y) * 2, vb0 + (co.z / 0.016) * (vb1 - vb0))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        bm.normal_update()
        M = Matrix.Translation((ox, oy, 0)) @ Matrix.Rotation(turn, 4, "Z")
        k._emit(bm, D, M)
        if k.lod == 0:
            post = M @ Vector((0.0 * side, 0.065, 0.016))
            for end in ((0.05 * side, -0.01, 0.017), (-0.046 * side, -0.005, 0.017)):
                e = M @ Vector(end)
                mid = (post + e) / 2 + Vector((0, 0, 0.028))
                k.sweep(D, "plastic-blue", [post, post.lerp(mid, 0.5) + Vector((0, 0, 0.012)), mid, mid.lerp(e, 0.6) + Vector((0, 0, 0.006)), e], 0.007, segs=4, flat=0.4)


def umbrella(k):
    """A closed umbrella hanging by its crook from a nail (origin at the nail)."""
    # crook handle round the nail, shaft down, the folded canopy, the tip
    y = -0.05  # clear of the wall: the canopy's widest is 42 mm
    k.cyl(D, "galv", (0, 0, 0), (0, -0.075, 0), 0.003, segs=5)  # the nail
    hook = [Vector((0.03 * math.sin(a), y, -0.03 + 0.03 * math.cos(a))) for a in [i * math.pi / 6 for i in range(0, 8)]]
    k.sweep(D, "plastic-black", [Vector((-0.03, y, -0.04))] + hook[::-1] + [Vector((0.0, y, -0.075))], 0.009, segs=6)
    k.cyl(D, "stainless", (0, y, -0.075), (0, y, -0.85), 0.0055, segs=6)
    # canopy folded round the shaft: an eight-pleated spindle, fat in the middle
    n = 16 if k.lod == 0 else 8
    profile = [(-0.24, 0.006), (-0.3, 0.035), (-0.45, 0.042), (-0.6, 0.036), (-0.74, 0.016), (-0.8, 0.006)]
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    v0, v1 = k._band("umbrella")
    rings = []
    for z, r in profile:
        ring = []
        for i in range(n + 1):
            a = 2 * math.pi * i / n
            rr = r * (1.0 if i % 2 == 0 else 0.62) if k.lod == 0 else r
            ring.append(bm.verts.new((rr * math.cos(a), y + rr * math.sin(a), z)))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            f = bm.faces.new((a[i], a[i + 1], b[i + 1], b[i]))
            for loop in f.loops:
                co = loop.vert.co
                idx = (a + b).index(loop.vert) % (n + 1)
                loop[uv].uv = (idx / n * 0.15, v0 + (-co.z - 0.24) / 0.56 * (v1 - v0))
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    k._emit(bm, D)
    if k.lod < 2:
        k.box(D, "umbrella", (-0.045, y - 0.006, -0.47), (0.045, y + 0.006, -0.44))  # the strap
        k.cyl(D, "stainless", (0, y, -0.8), (0, y, -0.86), 0.006, r1=0.003, segs=6)


def drum_bin(k):
    """A 200-litre steel drum cut open for rubbish, blue paint gone to rust, a biodegradable label."""
    r = 0.29
    h = 0.88
    # body: outside and inside, the bottom, the rolled rim and two rolling hoops
    k.cyl(D, "drum-steel", (0, 0, 0.0), (0, 0, h), r, segs=20, caps=False)
    k.lathe(D, "rust", [(r - 0.004, h), (r - 0.004, 0.05)], segs=20, cap_ends=False)
    if k.lod < 2:
        k.lathe(D, "rust", [(0.0, 0.05), (r - 0.004, 0.05)], segs=20, cap_ends=False)
    k.lathe(D, "drum-steel", [(r - 0.004, h - 0.002), (r + 0.006, h + 0.004), (r + 0.006, h - 0.012)], segs=20, cap_ends=False)
    if k.lod < 2:
        for z in (0.3, 0.58):
            k.lathe(D, "drum-steel", [(r, z - 0.012), (r + 0.01, z), (r, z + 0.012)], segs=20, cap_ends=False)
        k.lathe(D, "drum-steel", [(r, 0.0), (r + 0.008, 0.012), (r, 0.024)], segs=20, cap_ends=False)
    if k.lod == 0:
        # a black bin bag over the rim, and what is in it
        k.lathe(D, "plastic-black", [(r + 0.008, h - 0.09), (r + 0.012, h + 0.002), (r - 0.02, h + 0.02), (0.18, h - 0.1), (0.0, h - 0.16)], segs=16, cap_ends=False)
        k.label(D, k.prints.rects["bin-label"], (0, 0, 0), r + 0.0015, math.radians(-125), math.radians(-55), 0.38, 0.58, segs=8)


def hardhat_hung(k):
    """A white hard hat hung on a nail by its harness (origin at the nail; the wall is the XZ plane, the room at -Y): crown outwards."""
    profile = [(0.0, 0.165), (0.05, 0.16), (0.09, 0.14), (0.115, 0.1), (0.125, 0.055), (0.128, 0.03), (0.16, 0.012), (0.165, 0.0), (0.125, 0.004)]
    # the shell's axis turned to point out of the wall, its brim resting against it, hanging below the nail
    M = Matrix.Translation((0.0, -0.006, -0.055)) @ rot_axis(math.radians(90), "X")
    k.lathe(D, "hardhat", profile, segs=20, M=M @ Matrix.Diagonal((1.0, 1.17, 1.0, 1.0)), cap_ends=False)
    if k.lod < 2:
        k.cyl(D, "galv", (0, 0, 0), (0, -0.05, 0), 0.003, segs=5)  # the nail
    if k.lod == 0:
        # the harness's headband just inside the rim, hooked over the nail
        band = [M @ Vector((0.1 * math.cos(a), 0.12 * math.sin(a), 0.035)) for a in [2 * math.pi * i / 12 for i in range(13)]]
        k.sweep(D, "plastic-black", band, 0.006, segs=4, flat=0.3, caps=False)


def cctv(k):
    """A bullet camera on a wall bracket (origin at the bracket's wall plate), looking along +X and a little down."""
    k.box(D, "plastic-white", (0.0, -0.045, -0.06), (0.012, 0.045, 0.06), bevel=0.004)
    arm = [Vector((0.012, 0, 0)), Vector((0.07, 0, 0.0)), Vector((0.1, 0, 0.03))]
    k.sweep(D, "plastic-white", arm, 0.012, segs=6)
    C = Matrix.Translation((0.1, 0, 0.05)) @ rot_axis(math.radians(14), "Y")
    k.lathe(D, "plastic-white", [(0.0, -0.06), (0.03, -0.06), (0.036, -0.03), (0.036, 0.13), (0.03, 0.14), (0.026, 0.14)], segs=14, M=C @ rot_axis(math.radians(90), "Y"), cap_ends=False)
    k.lathe(D, "plastic-black", [(0.026, 0.14), (0.018, 0.142), (0.0, 0.142)], segs=14, M=C @ rot_axis(math.radians(90), "Y"), cap_ends=False)
    if k.lod < 2:
        k.box(D, "plastic-white", (-0.07, -0.042, 0.035), (0.17, 0.042, 0.042), M=C)  # sunshield
    if k.lod == 0:
        k.sweep(D, "plastic-black", [Vector((0.03, 0.0, -0.02)), Vector((0.03, 0.03, -0.08)), Vector((0.005, 0.03, -0.2))], 0.0035, segs=4)


def desk_things(k):
    """What sits on the guard's desk: the open logbook with a pen on a string, a tumbler, a thermos, the radio on its charger."""
    r = k.prints.rects
    # logbook, open, pages slightly arched
    k.box(D, "plastic-blue", (-0.16, -0.11, 0.0), (0.16, 0.11, 0.006))
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    u0, v0, u1, v1 = r["logbook-open"]
    cols = 9 if k.lod == 0 else 3
    rows = [[], []]
    for i in range(cols + 1):
        t = i / cols
        x = -0.155 + 0.31 * t
        z = 0.006 + 0.012 * math.sin(math.pi * abs(t - 0.5) * 2) ** 0.6 - 0.004 * (abs(t - 0.5) < 0.06)
        for j, y in enumerate((-0.105, 0.105)):
            rows[j].append(bm.verts.new((x, y, z)))
    for i in range(cols):
        f = bm.faces.new((rows[0][i], rows[0][i + 1], rows[1][i + 1], rows[1][i]))
        for loop in f.loops:
            co = loop.vert.co
            loop[uv].uv = (u0 + (co.x + 0.155) / 0.31 * (u1 - u0), v0 + (co.y + 0.105) / 0.21 * (v1 - v0))
    bm.normal_update()
    k._emit(bm, D)
    if k.lod == 0:
        # the pen, and its string to a hole in the desk's edge
        pen = Matrix.Translation((0.06, -0.02, 0.022)) @ rot_z(math.radians(30))
        k.cyl(D, "plastic-white", pen @ Vector((-0.07, 0, 0)), pen @ Vector((0.06, 0, 0)), 0.0045, segs=6)
        k.cyl(D, "plastic-blue", pen @ Vector((0.06, 0, 0)), pen @ Vector((0.075, 0, 0)), 0.0045, r1=0.001, segs=6)
        a = pen @ Vector((-0.07, 0, 0))
        k.sweep(D, "plastic-white", [a, a + Vector((-0.03, -0.04, -0.012)), Vector((-0.08, -0.16, 0.003)), Vector((-0.12, -0.21, 0.004)), Vector((-0.13, -0.24, -0.03))], 0.0012, segs=3)
    # stainless tumbler
    k.lathe(D, "stainless", [(0.0, 0.0), (0.03, 0.0), (0.036, 0.11), (0.033, 0.112), (0.028, 0.012), (0.0, 0.012)], centre=(0.27, 0.06, 0.0), segs=14, cap_ends=False)
    # thermos: plastic body, stainless cup on top
    k.lathe(D, "plastic-green", [(0.0, 0.0), (0.045, 0.0), (0.048, 0.02), (0.048, 0.23), (0.04, 0.25)], centre=(0.29, -0.09, 0.0), segs=14, cap_ends=False)
    k.lathe(D, "stainless", [(0.04, 0.25), (0.043, 0.25), (0.043, 0.31), (0.0, 0.312)], centre=(0.29, -0.09, 0.0), segs=14, cap_ends=False)
    # radio on its charger
    k.box(D, "plastic-black", (-0.36, -0.05, 0.0), (-0.26, 0.05, 0.04), bevel=0.006)
    k.box(D, "plastic-black", (-0.345, -0.03, 0.03), (-0.275, 0.012, 0.19), bevel=0.008)
    k.cyl(D, "plastic-black", (-0.29, -0.01, 0.19), (-0.29, -0.01, 0.33), 0.006, segs=6)
    if k.lod == 0:
        k.plate(D, r["radio-face"], (-0.342, -0.0302, 0.06), (-0.278, -0.0301, 0.17), "-y")
        k.cyl(D, "plastic-black", (-0.32, -0.01, 0.19), (-0.32, -0.01, 0.21), 0.009, segs=8)


def calendar(k):
    """A wall calendar on a nail (origin at the nail), 0.3 x 0.45 m."""
    k.cyl(D, "galv", (0, 0, 0), (0, -0.02, 0), 0.003, segs=5)
    k.plate(D, k.prints.rects["calendar"], (-0.15, -0.006, -0.47), (0.15, -0.004, -0.02), "-y")
    if k.lod == 0:
        k.box(D, "stainless", (-0.152, -0.008, -0.025), (0.152, -0.004, -0.012))  # the metal binding strip
        k.sweep(D, "plastic-black", [Vector((-0.1, -0.007, -0.015)), Vector((0.0, -0.012, 0.004)), Vector((0.1, -0.007, -0.015))], 0.0015, segs=3)


def fan(k, stand):
    """An electric fan: a desk fan, or a stand fan on its round base (1.2 m)."""
    if stand:
        k.lathe(D, "plastic-black", [(0.0, 0.0), (0.2, 0.0), (0.21, 0.015), (0.15, 0.04), (0.02, 0.05)], segs=16, cap_ends=False)
        k.cyl(D, "stainless", (0, 0, 0.04), (0, 0, 0.92), 0.013, segs=8)
        k.cyl(D, "plastic-black", (0, 0, 0.6), (0, 0, 0.66), 0.02, segs=8)
        hub = Vector((0.0, 0.0, 1.02))
        R = 0.22
    else:
        k.lathe(D, "plastic-black", [(0.0, 0.0), (0.09, 0.0), (0.09, 0.03), (0.05, 0.045), (0.0, 0.045)], segs=12, cap_ends=False)
        k.cyl(D, "plastic-black", (0, 0, 0.04), (0, 0, 0.2), 0.012, segs=8)
        hub = Vector((0.0, 0.0, 0.27))
        R = 0.15
        if k.lod == 0:
            k.plate(D, k.prints.rects["fan-badge"], (-0.03, -0.0905, 0.012), (0.03, -0.09, 0.04), "-y")
    face = rot_axis(math.radians(-8), "X", about=hub)
    # motor housing behind, the guard in front (front ring, rings and spokes), the blades inside
    back = face @ (hub + Vector((0, 0.09, 0)))
    k.cyl(D, "plastic-black", hub + Vector((0, 0.03, -0.07)) if stand else hub + Vector((0, 0.02, -0.06)), face @ (hub + Vector((0, 0.05, 0))), 0.012, segs=6)
    k.lathe(D, "plastic-black", [(0.0, 0.0), (0.05, 0.0), (0.055, 0.06), (0.04, 0.1), (0.0, 0.1)], centre=(0, 0, 0), segs=12, M=Matrix.Translation(face @ (hub + Vector((0, 0.01, 0)))) @ face.to_3x3().to_4x4() @ rot_axis(math.radians(-90), "X"), cap_ends=False)
    rings = (1.0, 0.7, 0.4) if k.lod == 0 else (1.0,)
    G = Matrix.Translation(face @ hub) @ face.to_3x3().to_4x4() @ rot_axis(math.radians(90), "X")
    for i, rr in enumerate(rings):
        pts = [G @ Vector((math.cos(a) * R * rr, math.sin(a) * R * rr, (-0.03 - 0.02 * (1 - rr)) if i else -0.025)) for a in [2 * math.pi * j / 20 for j in range(21)]]
        k.sweep(D, "plastic-white" if i == 0 else "stainless", pts, 0.004 if i == 0 else 0.0018, segs=4, caps=False)
    if k.lod == 0:
        for j in range(12):
            a = 2 * math.pi * j / 12
            k.sweep(D, "stainless", [G @ Vector((0, 0, -0.06)), G @ Vector((math.cos(a) * R * 0.5, math.sin(a) * R * 0.5, -0.05)), G @ Vector((math.cos(a) * R, math.sin(a) * R, -0.025))], 0.0015, segs=3, caps=False)
            k.sweep(D, "stainless", [G @ Vector((0, 0, 0.06)), G @ Vector((math.cos(a) * R, math.sin(a) * R, 0.025))], 0.0015, segs=3, caps=False)
    if k.lod < 2:
        for j in range(3):
            a = 2 * math.pi * j / 3
            c = G @ Vector((math.cos(a) * R * 0.5, math.sin(a) * R * 0.5, 0.0))
            k.disc(D, "plastic-blue", c, (G.to_3x3() @ Vector((0, 0, -1))), R * 0.4, segs=10)
            k.disc(D, "plastic-blue", c, (G.to_3x3() @ Vector((0, 0, 1))), R * 0.4, segs=10)


def tyre_planter(k):
    """A car tyre painted white and filled with soil: the planter of every Philippine camp."""
    n = 18 if k.lod == 0 else 10
    rc = 0.27  # radius to the middle of the tread
    sec = [(rc - 0.1, 0.0), (rc - 0.08, -0.035), (rc - 0.02, -0.08), (rc + 0.06, -0.09), (rc + 0.095, -0.06), (rc + 0.1, 0.0), (rc + 0.095, 0.06), (rc + 0.06, 0.09), (rc - 0.02, 0.08), (rc - 0.08, 0.035)]
    if k.lod:
        sec = sec[::2]
    profile = [(r, z + 0.09) for r, z in sec] + [(sec[0][0], sec[0][1] + 0.09)]
    k.lathe(D, "tyre", profile, segs=n, cap_ends=False)
    k.lathe(D, "soil", [(rc - 0.085, 0.12), (rc - 0.12, 0.15), (0.0, 0.16)], segs=n, cap_ends=False)


def drum_planter(k):
    """Half a steel drum, painted, on the ground, full of soil."""
    r = 0.29
    k.cyl(D, "drum-steel", (0, 0, 0), (0, 0, 0.42), r, segs=18, caps=False)
    k.lathe(D, "drum-steel", [(r - 0.004, 0.42), (r + 0.006, 0.426), (r + 0.006, 0.41)], segs=18, cap_ends=False)
    k.lathe(D, "rust", [(r - 0.004, 0.42), (r - 0.004, 0.36)], segs=18, cap_ends=False)
    k.lathe(D, "soil", [(r - 0.004, 0.36), (0.2, 0.375), (0.0, 0.385)], segs=18, cap_ends=False)


def culvert_end(k):
    """The end of a 600 mm concrete culvert in a small headwall with wing walls, the pipe along -Y out of it."""
    k.box(D, "concrete", (-0.85, -0.05, -0.15), (0.85, 0.15, 0.62), u=0, bevel=0.01, skip="-z")
    if k.lod == 2:
        k.cyl(D, "concrete", (0, -0.051, 0.22), (0, -0.12, 0.22), 0.36, segs=8, caps=False)
        return
    for sx in (-1, 1):
        W = rot_z(math.radians(sx * -35), about=(sx * 0.85, -0.05, 0))
        k.box(D, "concrete", (sx * 0.85 - (0.12 if sx > 0 else 0), -0.75, -0.15), (sx * 0.85 + (0 if sx > 0 else 0.12), -0.05, 0.45), u=1, bevel=0.01, M=W, skip="-z")
    k.tube(D, "concrete", (0, 0.1, 0.22), (0, -0.12, 0.22), 0.36, 0.3, segs=20 if k.lod == 0 else 10)
    k.box(D, "concrete", (-0.5, -0.6, -0.15), (0.5, -0.05, -0.08), u=0, skip="-z")  # apron


# ---- the fence ----------------------------------------------------------------------------------------

BAY = 2.5
FENCE_H = 1.8


def fence_frame(k, rail=True):
    """One bay of chain-link fence's steel: a 50 mm GI post with its footing, the top rail, the angled arm for the barbed wire."""
    k.box(D, "concrete", (-0.14, -0.14, -0.08), (0.14, 0.14, 0.06), bevel=0.01, skip="-z")
    k.cyl(D, "galv", (0, 0, -0.08), (0, 0, FENCE_H + 0.05), 0.03, segs=10)
    k.lathe(D, "galv", [(0.031, FENCE_H + 0.05), (0.034, FENCE_H + 0.06), (0.0, FENCE_H + 0.07)], centre=(0, 0, 0), segs=10, cap_ends=False)
    if not rail:  # (the end post of a run)
        k.box(D, "galv", (-0.02, -0.004, FENCE_H - 0.02), (0.02, 0.004, FENCE_H + 0.42), M=rot_axis(math.radians(-42), "X", about=(0, 0, FENCE_H)))
        return
    # the top rail runs along +X to the next post
    k.cyl(D, "galv", (0.0, 0.0, FENCE_H - 0.02), (BAY, 0.0, FENCE_H - 0.02), 0.021, segs=8)
    # barbed-wire arm leaning out (-Y, outside the camp)
    k.box(D, "galv", (-0.02, -0.004, FENCE_H - 0.02), (0.02, 0.004, FENCE_H + 0.42), M=Matrix.Translation((0, 0, 0)) @ rot_axis(math.radians(-42), "X", about=(0, 0, FENCE_H)))
    if k.lod < 2:
        # tension wire along the bottom
        k.cyl(D, "galv", (0.0, 0.004, 0.06), (BAY, 0.004, 0.06), 0.0025, segs=4, caps=False)


def fence_mesh(k, vine=False):
    """One bay's chain link (cut-out) and three strands of barbed wire on the arms, with a vine on some."""
    sh = k.fence
    v0, v1 = sh.bands["chainlink"]
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    a = bm.verts.new((0.03, 0.0, 0.07))
    b = bm.verts.new((BAY - 0.03, 0.0, 0.07))
    c = bm.verts.new((BAY - 0.03, 0.0, FENCE_H - 0.03))
    d = bm.verts.new((0.03, 0.0, FENCE_H - 0.03))
    f = bm.faces.new((a, b, c, d))
    span = (BAY - 0.06) / sh.tile
    for loop, co in zip(f.loops, [(0, v0), (span, v0), (span, v1), (0, v1)]):
        loop[uv].uv = co
    bm.normal_update()
    k._emit(bm, F)
    # barbed wire: three strands, each a ribbon card crossing the bay at the arms' slope
    b0, b1 = sh.bands["barbed"]
    for i in range(3 if k.lod < 2 else 0):
        t = (i + 1) / 3.2
        y = -0.28 * t * 1.05
        z = FENCE_H + 0.33 * t
        for twist in (0, 1) if k.lod == 0 else (0,):
            bm = bmesh.new()
            uv = bm.loops.layers.uv.new("UVMap")
            off = Vector((0, 0.03, 0)) if twist == 0 else Vector((0, 0, 0.03))
            p = Vector((0, y, z))
            q = Vector((BAY, y, z - 0.015))
            sag = Vector((BAY / 2, y, z - 0.035))
            pts = [p, sag, q]
            ring_a = [bm.verts.new(pt - off) for pt in pts]
            ring_b = [bm.verts.new(pt + off) for pt in pts]
            for j in range(2):
                g = bm.faces.new((ring_a[j], ring_a[j + 1], ring_b[j + 1], ring_b[j]))
                for loop in g.loops:
                    co = loop.vert.co
                    loop[uv].uv = (co.x / sh.tile, b0 if loop.vert in ring_a else b1)
            bm.normal_update()
            k._emit(bm, F)
    if vine:
        g0, g1 = sh.bands["vine"]
        rng = random.Random(9)
        for row in range(3 if k.lod == 0 else 1):
            bm = bmesh.new()
            uv = bm.loops.layers.uv.new("UVMap")
            n = 8 if k.lod == 0 else 3
            pts = []
            for j in range(n + 1):
                x = 0.05 + (BAY * 0.9) * j / n
                z = 0.15 + row * 0.42 + 0.25 * math.sin(j * 0.9 + row) + rng.uniform(-0.04, 0.04)
                pts.append(Vector((x, -0.03 - 0.02 * rng.random(), z)))
            top, low = [], []
            for p in pts:
                top.append(bm.verts.new(p + Vector((0, -0.01, 0.1))))
                low.append(bm.verts.new(p + Vector((0, 0.01, -0.1))))
            run = 0.0
            for j in range(n):
                seg = (pts[j + 1] - pts[j]).length
                g = bm.faces.new((low[j], low[j + 1], top[j + 1], top[j]))
                for loop in g.loops:
                    idx = j if loop.vert in (low[j], top[j]) else j + 1
                    u = (run if idx == j else run + seg) / sh.tile
                    loop[uv].uv = (u + row * 0.37, g0 if loop.vert in low else g1)
                run += seg
            bm.normal_update()
            k._emit(bm, F)


# ---- a power pole ------------------------------------------------------------------------------------


def power_pole(k):
    """A 9 m concrete pole with a crossarm, three pin insulators and a streetlight-less top, as on the site's service line."""
    k.lathe(D, "concrete", [(0.13, -0.6), (0.13, 0.0), (0.085, 9.0), (0.0, 9.02)], segs=12 if k.lod == 0 else 8, cap_ends=False)
    if k.lod < 2:
        k.box(D, "galv", (-0.9, -0.05, 8.45), (0.9, 0.05, 8.55), u=0, bevel=0.005)
        for x in (-0.8, 0.0, 0.8):
            k.lathe(D, "plastic-white", [(0.0, 8.55), (0.03, 8.56), (0.06, 8.6), (0.03, 8.64), (0.06, 8.68), (0.03, 8.72), (0.0, 8.74)], centre=(x, 0, 0), segs=8, cap_ends=False)
        # diagonal braces under the arm
        for sx in (-1, 1):
            k.box(D, "galv", (-0.015, -0.03, 0.0), (0.015, 0.03, 0.75), M=Matrix.Translation((0, 0.06, 7.85)) @ rot_axis(math.radians(sx * 52), "Y"))
    if k.lod == 0:
        # a ladder of step bolts and the pole's number plate
        for i in range(10):
            z = 2.4 + i * 0.42
            a = math.radians(90 if i % 2 else 270)
            p = Vector((math.cos(a), math.sin(a), 0)) * 0.11 + Vector((0, 0, z))
            k.cyl(D, "galv", Vector((0, 0, z)), p + Vector((math.cos(a), math.sin(a), 0)) * 0.12, 0.008, segs=4)
        k.box(D, "plastic-yellow", (-0.06, -0.125, 2.0), (0.06, -0.12, 2.12))


# ---- plants -------------------------------------------------------------------------------------------


def plant_asset(asset_id, cards, lod_distances, credits=("twin.authored",)):
    """
    A clump of crossed cards from the flora-camp sheet, with the wind attribute the twin reads (_WIND).
    `cards`: (rect, width, height, count, lean) per kind; LOD1 halves the count, LOD2 is one crossed pair.
    """
    import build_gate_flora  # noqa: E402

    importlib.reload(build_gate_flora)
    Plant = build_gate_flora.Plant
    coll = model_kit.reset_asset(asset_id, "shrub", list(credits), lod_distances=lod_distances)
    name = twin_lib.asset_name(asset_id)
    stamps = Stamps("dressing", P, "cards")
    made = {}
    for lod in (0, 1):
        rng = random.Random(sum(map(ord, asset_id)))
        plant = Plant([P])
        for key, width, height, count, lean in cards:
            u0, v0, u1, v1 = stamps.rects[key]
            n = count if lod == 0 else max(2, count // 2)
            for i in range(n):
                a = math.pi * i / n + rng.uniform(-0.2, 0.2)
                along = Vector((math.cos(a), math.sin(a), 0))
                base = Vector((rng.uniform(-0.06, 0.06), rng.uniform(-0.06, 0.06), 0.0))
                tilt = rng.uniform(-lean, lean)
                up = (Vector((0, 0, 1)) + along.cross(Vector((0, 0, 1))) * tilt).normalized()
                h = height * rng.uniform(0.82, 1.1)
                w = width * rng.uniform(0.85, 1.1)
                rows = 3 if lod == 0 else 2
                verts = []
                for r in range(rows + 1):
                    t = r / rows
                    p = base + up * (h * t)
                    row = []
                    for side in (-0.5, 0.5):
                        co = p + along * (w * side)
                        out = (co - Vector((0, 0, h * 0.4))).normalized()
                        nrm = (out * 0.6 + Vector((0, 0, 0.6))).normalized()
                        row.append((plant.vert(co, (t * t * 0.9, t * 0.8, rng.random()), nrm), (u0 + (side + 0.5) * (u1 - u0), v0 + t * (v1 - v0))))
                    verts.append(row)
                for ra, rb in zip(verts, verts[1:]):
                    plant.face((ra[0][0], ra[1][0], rb[1][0], rb[0][0]), (ra[0][1], ra[1][1], rb[1][1], rb[0][1]), 0)
        made[lod] = plant.triangles()
        plant.finish(f"{name}_LOD{lod}", coll)
    model_kit.hide_lower_lods(coll)
    return made


# ---- build everything ---------------------------------------------------------------------------------


def build_all():
    global SHEET, PRINTS
    materials()
    SHEET = Sheet("dressing", D)
    PRINTS = Prints("dressing", D)
    fence_sheet = Sheet("dressing", F)
    out = {}
    out["prop.rice-sacks.a"] = build("prop.rice-sacks.a", "small-prop", rice_sacks)
    out["prop.chair-monobloc.a"] = build("prop.chair-monobloc.a", "small-prop", chair_monobloc, credits=["twin.authored"])
    out["prop.pipe-offcuts.a"] = build("prop.pipe-offcuts.a", "small-prop", pipe_offcuts, credits=["polyhaven.rusty_metal_02"])
    out["prop.pallet.a"] = build("prop.pallet.a", "small-prop", pallet, credits=["polyhaven.wood_planks_grey"])
    out["prop.standpipe.a"] = build("prop.standpipe.a", "small-prop", standpipe, credits=["polyhaven.concrete_wall_008", "polyhaven.rusty_metal_02"], origin="free")
    out["prop.jerrycan.a"] = build("prop.jerrycan.a", "small-prop", jerrycan, credits=["twin.authored"])
    out["prop.slippers.a"] = build("prop.slippers.a", "small-prop", slippers, credits=["twin.authored"], origin="free", levels=(0, 1))
    out["prop.umbrella-hung.a"] = build("prop.umbrella-hung.a", "small-prop", umbrella, credits=["twin.authored"], origin="pivot")
    out["prop.drum-bin.a"] = build("prop.drum-bin.a", "small-prop", drum_bin, credits=["polyhaven.blue_metal_plate", "polyhaven.metal_plate_02"])
    out["prop.hardhat-hung.a"] = build("prop.hardhat-hung.a", "small-prop", hardhat_hung, credits=["twin.authored"], origin="pivot")
    out["prop.cctv.a"] = build("prop.cctv.a", "small-prop", cctv, credits=["twin.authored"], origin="pivot")
    out["prop.desk-things.a"] = build("prop.desk-things.a", "small-prop", desk_things, credits=["twin.authored"], origin="pivot", levels=(0, 1))
    out["prop.calendar.a"] = build("prop.calendar.a", "small-prop", calendar, credits=["twin.authored"], origin="pivot", levels=(0, 1))
    out["prop.fan-desk.a"] = build("prop.fan-desk.a", "small-prop", lambda k: fan(k, False), credits=["twin.authored"], origin="free", levels=(0, 1))
    out["prop.fan-stand.a"] = build("prop.fan-stand.a", "small-prop", lambda k: fan(k, True), credits=["twin.authored"], origin="free", levels=(0, 1))
    out["prop.tyre-planter.a"] = build("prop.tyre-planter.a", "small-prop", tyre_planter, credits=["twin.authored"], levels=(0, 1))
    out["prop.drum-planter.a"] = build("prop.drum-planter.a", "small-prop", drum_planter, credits=["polyhaven.blue_metal_plate", "polyhaven.metal_plate_02"])
    out["prop.culvert-end.a"] = build("prop.culvert-end.a", "kit-piece", culvert_end, credits=["polyhaven.concrete_wall_008"], origin="pivot")
    out["struct.power-pole.a"] = build("struct.power-pole.a", "kit-piece", power_pole, credits=["polyhaven.concrete_wall_008", "polyhaven.rusty_metal_02"], lod_distances=(60, 160), origin="pivot")

    def with_fence(make):
        def run(k):
            k.fence = fence_sheet
            make(k)
        return run

    out["kit.fence-frame.a"] = build("kit.fence-frame.a", "kit-piece", fence_frame, credits=["polyhaven.concrete_wall_008", "polyhaven.rusty_metal_02"], origin="pivot")
    out["kit.fence-post.a"] = build("kit.fence-post.a", "kit-piece", lambda k: fence_frame(k, rail=False), credits=["polyhaven.concrete_wall_008", "polyhaven.rusty_metal_02"], origin="pivot")
    out["kit.fence-mesh.a"] = build("kit.fence-mesh.a", "kit-piece", with_fence(fence_mesh), credits=["twin.authored"], origin="pivot", lod_distances=(45, 120))
    out["kit.fence-mesh-vine.a"] = build("kit.fence-mesh-vine.a", "kit-piece", with_fence(lambda k: fence_mesh(k, True)), credits=["twin.authored"], origin="pivot", lod_distances=(45, 120))
    out["flora.croton.a"] = plant_asset("flora.croton.a", [("croton", 0.55, 0.7, 7, 0.25), ("croton-b", 0.4, 0.45, 5, 0.4)], (15, 45))
    out["flora.ixora.a"] = plant_asset("flora.ixora.a", [("ixora", 0.5, 0.65, 8, 0.3), ("ixora-flower", 0.22, 0.28, 4, 0.5)], (15, 45))
    out["flora.cogon.a"] = plant_asset("flora.cogon.a", [("cogon", 0.7, 0.95, 6, 0.2), ("cogon-plume", 0.12, 1.25, 3, 0.15)], (15, 45))
    return out


# ---- the gate's layout (called by build_gate_zone.py) -------------------------------------------------
# Positions are in the checkpoint's own frame (struct.guardhouse: metres, Z up; +X towards the road,
# +Y into the camp, the booth's walls at x = +-1.2, y = +-1.5, its plinth top at z = 0.18), or along the
# road (gate_ground: `s` metres from the gate into the camp, `d` metres to the left of inbound traffic).

PLINTH_TOP = 0.18
FENCE_Y = 0.0  # the camp's fence meets the gate on the barrier's line


class Layout:
    def __init__(self, place, G, SET, YAW, taken, coll):
        self.place = place
        self.G = G
        self.SET = SET
        self.YAW = YAW
        self.taken = taken
        self.coll = coll
        self.yaw_blender = YAW
        # the turn that points an asset's +Y along inbound traffic (Blender x, -z)
        self.heading = math.atan2(-0.4310, 0.9024)
        self.poles = []
        self.pole_mats = []

    # -- frames

    def local(self, x, y, z=0.0):
        return self.SET @ Vector((x, y, z))

    def ground_at(self, x, y):
        """Blender position on the ground under booth-frame (x, y)."""
        p = self.local(x, y)
        return Vector((p.x, p.y, self.G.height(p.x, -p.y)))

    def road(self, s, d):
        """Twin (x, z) at `s` metres along the road's real (curving) line and `d` to its left."""
        import numpy as np

        G = self.G
        i = int(min(len(G.run) - 2, max(0, np.searchsorted(G.run, s) - 1)))
        a, b = G.line[i], G.line[i + 1]
        t = (s - G.run[i]) / max(G.run[i + 1] - G.run[i], 1e-6)
        p = a + (b - a) * t
        e = (b - a) / max(float(np.linalg.norm(b - a)), 1e-6)
        return float(p[0] + e[1] * d), float(p[1] - e[0] * d)

    # -- placing

    def put(self, asset, M, footprint=0.0):
        """A placement with the full matrix M (Blender world)."""
        obj = self.place(asset, M.to_translation())
        obj.matrix_world = M
        if footprint:
            p = M.to_translation()
            self.taken.append((p.x, -p.y, footprint))
        return obj

    def at_booth(self, asset, x, y, z=None, turn=0.0, tilt=None, footprint=0.0):
        """An asset at booth-frame (x, y), on the ground (z None) or at height z; `turn` about Z in the booth's frame."""
        base = self.ground_at(x, y) if z is None else self.local(x, y, z)
        R = Matrix.Rotation(self.YAW + turn, 4, "Z")
        if tilt is not None:
            R = R @ tilt
        return self.put(asset, Matrix.Translation(base) @ R, footprint)

    # -- the whole gate

    def run(self):
        rad = math.radians
        # outside the booth: a chair and a stand fan under the camp-side eave, slippers on the step
        self.at_booth("prop.chair-monobloc.a", 1.55, 2.25, turn=rad(90 - 18), footprint=0.35)
        self.at_booth("prop.fan-stand.a", 1.2, 2.85, turn=math.atan2(0.3, 0.6) + rad(180), footprint=0.25)
        self.at_booth("prop.slippers.a", 0.32, 2.22, z=0.09, turn=rad(8))
        # on the walls: a staff hard hat by the door, an umbrella by the window, the camera over the approach
        self.at_booth("prop.hardhat-hung.a", -0.66, 1.497, z=1.93, turn=rad(180))
        self.at_booth("prop.umbrella-hung.a", 1.197, 1.02, z=1.97, turn=rad(90))
        self.at_booth("prop.cctv.a", 1.2, -1.36, z=2.32, turn=math.atan2(-0.89, 0.45))
        # inside: the desk's things, a desk fan, a calendar
        self.at_booth("prop.desk-things.a", 0.84, -0.42, z=1.065, turn=rad(-90))
        self.at_booth("prop.fan-desk.a", 0.86, 0.82, z=1.065, turn=math.atan2(-0.806, 0.591))
        self.at_booth("prop.calendar.a", -0.86, -1.436, z=1.95, turn=rad(180))
        # behind the booth: the genset's jerrycan on the plinth, a pallet leaning on the back wall
        self.at_booth("prop.jerrycan.a", -1.37, -0.78, z=PLINTH_TOP, turn=rad(93))
        # (on its long edge against the wall, leaning 24 degrees from upright, deck boards outwards)
        foot = self.ground_at(-1.62, 1.55)
        self.put("prop.pallet.a", Matrix.Translation(foot) @ Matrix.Rotation(self.YAW - rad(90), 4, "Z") @ Matrix.Rotation(rad(66), 4, "X") @ Matrix.Translation((0, 0.5, 0)), footprint=0.5)
        self.at_booth("prop.rice-sacks.a", -2.3, -1.55, turn=rad(80), footprint=0.5)
        # inside the camp: the bin, a boot-wash tap, a planter of santan in half a drum, pipe left in the grass
        self.at_booth("prop.drum-bin.a", -1.55, 2.75, turn=rad(200), footprint=0.35)
        self.at_booth("prop.standpipe.a", -3.3, 1.45, turn=rad(-30), footprint=0.5)
        self.at_booth("prop.drum-planter.a", -2.7, 3.4, footprint=0.35)
        p = self.ground_at(-2.7, 3.4)
        self.put("flora.ixora.a", Matrix.Translation(p + Vector((0, 0, 0.37))) @ Matrix.Rotation(0.4, 4, "Z") @ Matrix.Scale(1.15, 4))
        self.at_booth("prop.pipe-offcuts.a", -6.2, 1.6, turn=rad(25), footprint=0.6)
        # tyre planters with croton and santan along the approach side of the booth
        for (x, y), plant, scale in (((1.15, -3.1), "flora.croton.a", 1.0), ((-0.15, -2.95), "flora.ixora.a", 0.95), ((-1.45, -3.0), "flora.croton.a", 0.85)):
            self.at_booth("prop.tyre-planter.a", x, y, turn=x * 2.0, footprint=0.4)
            g = self.ground_at(x, y)
            self.put(plant, Matrix.Translation(g + Vector((0, 0, 0.15))) @ Matrix.Rotation(x * 3.1, 4, "Z") @ Matrix.Scale(scale, 4))
        self.place_poles()
        self.fences()
        self.culverts()
        return self

    def finish(self):
        """After the plants: cogon in what rough ground is left, then the decals (which find the trees) and the wiring."""
        self.cogon()
        self.pieces()
        return self

    def place_poles(self):
        """The camp's service line along the uphill side of the road: three concrete poles, guyed at both ends."""
        spots = [self.road(s, d) for s, d in ((-27.0, 8.6), (-6.5, 8.9), (17.0, 9.2))]
        pts = [Vector((x, -z, self.G.height(x, z))) for x, z in spots]
        for i, p in enumerate(pts):
            nxt = pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]
            phi = math.atan2(-nxt.x, nxt.y)
            M = Matrix.Translation(p - Vector((0, 0, 0.0))) @ Matrix.Rotation(phi, 4, "Z")
            self.put("struct.power-pole.a", M, footprint=0.4)
            self.poles.append(p)
            self.pole_mats.append(M)

    def pieces(self):
        """The gate's own decals and wiring: one asset each, built here in the zone's frame and placed at the origin."""
        global SHEET, PRINTS
        SHEET = SHEET or Sheet("dressing", D)
        PRINTS = PRINTS or Prints("dressing", D)
        for asset_id, twin_class, maker, credits, levels in (
            ("kit.gate-decals", "decal-set", lambda lod: Decals(self, lod), CREDITS_DECALS, (0, 1)),
            ("kit.gate-services", "kit-piece", lambda lod: Services(self, lod), ["twin.authored", "polyhaven.rusty_metal_02"], (0, 1, 2)),
        ):
            coll = model_kit.reset_asset(asset_id, twin_class, credits, origin="pivot")
            name = twin_lib.asset_name(asset_id)
            made = {}
            for lod in levels:
                piece = maker(lod)
                piece.build()
                if not piece.k.bm.faces:
                    piece.k.bm.free()
                    continue
                made[lod] = piece.k.triangles()
                piece.k.finish(f"{name}_LOD{lod}", coll)
            model_kit.hide_lower_lods(coll)
            self.put(asset_id, Matrix.Identity(4))
            print(asset_id, made)

    def fences(self):
        """Chain link either side of the gate, bays built along +X with their barbed wire leaning out (-Y)."""

        def run(x0, bays, vine_bays):
            for i in range(bays):
                x = x0 + i * BAY
                # each bay stands on the lower of its two posts' ground: on a slope the high post sinks
                # into the bank rather than the fabric hanging over a gap
                g0, g1 = self.ground_at(x, FENCE_Y), self.ground_at(x + BAY, FENCE_Y)
                base = Vector((g0.x, g0.y, min(g0.z, g1.z) + 0.02))
                M = Matrix.Translation(base) @ Matrix.Rotation(self.YAW, 4, "Z")
                self.put("kit.fence-frame.a", M, footprint=0.2)
                self.put("kit.fence-mesh-vine.a" if i in vine_bays else "kit.fence-mesh.a", M)
            g = self.ground_at(x0 + bays * BAY, FENCE_Y)
            self.put("kit.fence-post.a", Matrix.Translation(g) @ Matrix.Rotation(self.YAW, 4, "Z"), footprint=0.2)

        run(9.75, 5, {3})  # from the barrier's rest post down the slope
        run(-1.75 - 6 * BAY, 6, {2, 3})  # up the bank to the back of the booth, ending on its post there

    def culverts(self):
        G = self.G
        inbound = math.atan2(-0.4310, 0.9024)  # the turn that points an asset's +Y along inbound traffic (Blender x, -z)
        for s, face in ((-12.6, 0.0), (12.6, math.pi)):
            x, z = G.at(s, 5.05)
            h = G.height(x, z)
            # the pipe runs on under the yard (+Y of the asset); the headwall faces the ditch
            self.put("prop.culvert-end.a", Matrix.Translation((x, -z, h - 0.12)) @ Matrix.Rotation(inbound + face, 4, "Z"), footprint=0.9)

    def cogon(self):
        """Cogon in the rough ground: along the fence lines and on the downhill verge."""
        rng = random.Random(33)
        spots = []
        for x in [-3.5 - 1.3 * i for i in range(10)] + [10.5 + 1.25 * i for i in range(9)]:
            spots.append((x + rng.uniform(-0.4, 0.4), FENCE_Y + rng.uniform(-0.7, 0.9)))
        for _ in range(16):
            spots.append((rng.uniform(10.5, 22.0), rng.uniform(-9.0, 9.0)))
        for x, y in spots:
            p = self.ground_at(x, y)
            if any((p.x - tx) ** 2 + (-p.y - tz) ** 2 < (r + 0.4) ** 2 for tx, tz, r in self.taken):
                continue
            self.put("flora.cogon.a", Matrix.Translation(p - Vector((0, 0, 0.03))) @ Matrix.Rotation(rng.uniform(0, 6.28), 4, "Z") @ Matrix.Scale(rng.uniform(0.75, 1.25), 4))


# ---- the gate's decals: ground storytelling and weathering (one asset, one material) ----------------------

SURFACES = ("camp-gate_LOD0", "guardhouse_LOD0", "culvert-end_LOD0")


class Decals:
    """Decal geometry for one level, laid on the zone's ground and built things by casting rays down."""

    LIFT = 0.012  # metres above the surface (the twin also offsets the depth)

    def __init__(self, lay, lod):
        self.lay = lay
        self.lod = lod
        self.stamps = Stamps("dressing", "decals-gate", "decals")
        self.k = Kit(self.stamps, lod)
        self.deps = bpy.context.evaluated_depsgraph_get()
        self.scene = bpy.context.scene

    def surface(self, x, y, top):
        """Height of the ground or a built surface at Blender (x, y), looking down from `top`."""
        origin = Vector((x, y, top))
        for _ in range(12):
            hit, loc, normal, _i, obj, _m = self.scene.ray_cast(self.deps, origin, Vector((0, 0, -1)))
            if not hit:
                break
            if obj.name.startswith(SURFACES):
                return loc.z
            origin = loc - Vector((0, 0, 0.002))
        return self.lay.G.height(x, -y)

    def _emit(self, rows, uvs):
        """A grid of points (rows of Blender positions) with their UVs as one piece."""
        bm = bmesh.new()
        uv = bm.loops.layers.uv.new("UVMap")
        verts = [[bm.verts.new(p) for p in row] for row in rows]
        for i in range(len(rows) - 1):
            for j in range(len(rows[0]) - 1):
                f = bm.faces.new((verts[i][j], verts[i][j + 1], verts[i + 1][j + 1], verts[i + 1][j]))
                for loop, c in zip(f.loops, (uvs[i][j], uvs[i][j + 1], uvs[i + 1][j + 1], uvs[i + 1][j])):
                    loop[uv].uv = c
        bm.normal_update()
        if sum(f.normal.z for f in bm.faces) < 0 and all(abs(f.normal.z) > 0.2 for f in bm.faces):
            bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
        self.k._emit(bm, DECAL)

    def strip(self, points, width, band, top_on_left=True, step=0.3, taper=0.6, lift=None, top=None):
        """
        A band laid along a line of twin (x, z) points, `width` across, following the surface. The
        band's top edge goes on the left of the direction of travel unless `top_on_left` is False.
        Its ends narrow to nothing over `taper` metres.
        """
        lift = self.LIFT if lift is None else lift
        pts = [Vector((x, -z, 0)) for x, z in points]
        # resample evenly
        even = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            n = max(1, int((b - a).length / (step * (1 + self.lod))))
            even += [a.lerp(b, t / n) for t in range(1, n + 1)]
        total = sum((b - a).length for a, b in zip(even, even[1:]))
        if total < 0.2:
            return
        v0, v1 = self.stamps.bands[band]
        across = 2 if self.lod == 0 else 1
        rows, uvs = [], []
        run = 0.0
        for i, p in enumerate(even):
            if i:
                run += (even[i] - even[i - 1]).length
            ahead = (even[min(i + 1, len(even) - 1)] - even[max(i - 1, 0)]).normalized()
            left = Vector((-ahead.y, ahead.x, 0))
            k = min(1.0, run / taper, (total - run) / taper) if taper > 0 else 1.0
            half = width / 2 * (0.25 + 0.75 * k)
            row, uv = [], []
            for c in range(across + 1):
                t = c / across  # 0 right edge, 1 left edge
                q = p + left * (half * (t * 2 - 1))
                h = self.surface(q.x, q.y, (top if top is not None else self.lay.G.height(q.x, -q.y) + 0.8))
                row.append(Vector((q.x, q.y, h + lift)))
                vt = t if top_on_left else 1 - t
                uv.append((run / self.stamps.tile, v0 + vt * (v1 - v0)))
            rows.append(row)
            uvs.append(uv)
        self._emit(rows, uvs)

    def stamp(self, x, z, w, h, angle, rect, div=4, sub=None, lift=None, top=None):
        """One stamp `w` x `h` metres centred on twin (x, z), turned by `angle` (radians about up), following the surface."""
        lift = self.LIFT if lift is None else lift
        u0, v0, u1, v1 = self.stamps.rects[rect]
        if sub:  # (a part of the stamp: fractions u0, v0, u1, v1)
            a, b, c, d = sub
            u0, u1, v0, v1 = u0 + (u1 - u0) * a, u0 + (u1 - u0) * c, v0 + (v1 - v0) * b, v0 + (v1 - v0) * d
        n = max(1, div // (1 + self.lod))
        ca, sa = math.cos(angle), math.sin(angle)
        rows, uvs = [], []
        for i in range(n + 1):
            row, uv = [], []
            for j in range(n + 1):
                lx = (j / n - 0.5) * w
                ly = (i / n - 0.5) * h
                bx = x + lx * ca - ly * sa
                by = -z + lx * sa + ly * ca
                hh = self.surface(bx, by, top if top is not None else self.lay.G.height(bx, -by) + 0.8)
                row.append(Vector((bx, by, hh + lift)))
                uv.append((u0 + (u1 - u0) * j / n, v0 + (v1 - v0) * i / n))
            rows.append(row)
            uvs.append(uv)
        self._emit(rows, uvs)

    def wall(self, centre, right, up, w, h, rect, out=0.004):
        """A stamp on a wall: `centre` (Blender), `right` and `up` unit vectors along the wall, seen from outside."""
        u0, v0, u1, v1 = self.stamps.rects[rect]
        normal = right.cross(up).normalized()
        c = centre + normal * out
        corners = [c - right * w / 2 - up * h / 2, c + right * w / 2 - up * h / 2, c + right * w / 2 + up * h / 2, c - right * w / 2 + up * h / 2]
        bm = bmesh.new()
        uv = bm.loops.layers.uv.new("UVMap")
        f = bm.faces.new([bm.verts.new(p) for p in corners])
        for loop, cc in zip(f.loops, ((u0, v0), (u1, v0), (u1, v1), (u0, v1))):
            loop[uv].uv = cc
        bm.normal_update()
        self.k._emit(bm, DECAL)

    # -- the gate's story

    def build(self):
        lay = self.lay
        G = lay.G
        rng = random.Random(77 + self.lod)
        rad = math.radians

        # wheel tracks pressed into the road beyond the gate pad, broken where the ground was hard
        for s0, s1 in ((-30.0, -9.5), (9.5, 28.0)):
            for d in (-0.92, 0.92):
                s = s0
                while s < s1 - 1.0:
                    length = rng.uniform(2.5, 6.5)
                    e = min(s1, s + length)
                    pts = [lay.road(t, d + 0.05 * math.sin(t * 0.7 + d)) for t in [s + (e - s) * i / 8 for i in range(9)]]
                    self.strip(pts, 0.26, "tread", step=0.25, taper=0.7)
                    s = e + rng.uniform(0.4, 2.2)
        # where the vehicles stop: rubber scrubbed onto the compacted yard, and engine oil
        for d in (-0.76, 0.76):
            x, z = G.at(-4.5, d)
            self.stamp(x, z, 2.3, 0.55, lay.heading + math.pi / 2, "scrub", div=4, sub=(0.0, 0.1, 1.0, 0.44) if d > 0 else (0.0, 0.56, 1.0, 0.9))
        for s, d, size, rect in ((-3.2, 0.05, 0.95, "oil-a"), (-2.1, 0.4, 0.55, "oil-b"), (-5.9, -0.3, 0.45, "oil-b"), (6.0, 0.2, 0.7, "oil-a")):
            x, z = G.at(s, d)
            self.stamp(x, z, size, size * rng.uniform(0.8, 1.15), rng.uniform(0, 6.28), rect, div=2)
        # the guard's paths: post to driver's window, window to barrier, round the booth's door
        for path in (((1.7, -1.3), (2.6, -2.6), (3.7, -4.1), (4.15, -4.9)), ((4.15, -4.9), (3.1, -2.6), (2.2, -1.1), (1.95, -0.65)), ((0.4, 2.55), (0.9, 3.4), (1.6, 3.9))):
            pts = []
            for x, y in path:
                p = lay.local(x, y)
                pts.append((p.x, -p.y))
            self.strip(pts, 0.5, "path", step=0.25, taper=0.5)
        for x, y, turn in ((0.4, 2.9, 20), (1.95, -0.55, -80), (4.3, -5.2, 15)):
            p = lay.local(x, y)
            self.stamp(p.x, -p.y, 0.9, 0.36, lay.yaw_blender + rad(turn), "prints", div=2)
        # gravel spilled off loads at the road's edges
        for s0, s1, d in ((-27.0, -16.0, -3.35), (13.0, 24.0, 3.35), (-11.0, -6.5, -3.2)):
            pts = [lay.road(s0 + (s1 - s0) * i / 10, d + 0.25 * math.sin(i * 1.3)) for i in range(11)]
            # (the band's dense top edge goes on the road side)
            self.strip(pts, 0.75, "gravel", top_on_left=d < 0, step=0.3, taper=1.2)
        # leaf litter and fallen pods under the acacias
        for empty in lay.coll.objects:
            if not empty.name.startswith("PLACE_flora.acacia."):
                continue
            big = ".acacia.a" in empty.name
            c = empty.matrix_world.translation
            reach = 5.5 if big else 2.6
            for i in range(9 if big else 4):
                a = rng.uniform(0, 6.28)
                r = reach * math.sqrt(rng.random())
                x, y = c.x + math.cos(a) * r, c.y + math.sin(a) * r
                _, dd = G.road_coords([x], [-y])
                if abs(float(dd[0])) < 3.6:
                    continue
                size = rng.uniform(2.0, 3.2)
                self.stamp(x, -y, size, size, rng.uniform(0, 6.28), "litter", div=4)
                if big and i % 3 == 0:
                    self.stamp(x + 0.6, -y + 0.4, size * 0.7, size * 0.35, rng.uniform(0, 6.28), "pods", div=3)
        # mud carried over the speed humps in the wheel tracks
        for y in (4.2, -4.2):
            for x in (5.15, 6.65):
                a, b = lay.local(x, y - 0.75), lay.local(x, y + 0.75)
                self.strip([(a.x, -a.y), (b.x, -b.y)], 0.3, "smear", step=0.06, taper=0.15, lift=0.008)
        # the drip line under the roof's edges, and the downpipe's splash
        for (x0, y0), (x1, y1) in (((1.95, -2.1), (1.95, 2.1)), ((-1.8, -2.13), (1.9, -2.13)), ((-1.8, 2.13), (1.9, 2.13))):
            a, b = lay.local(x0, y0), lay.local(x1, y1)
            self.strip([(a.x, -a.y), (b.x, -b.y)], 0.16, "drip", step=0.2, taper=0.2, top=lay.local(0, 0, 1.4).z)
        p = lay.local(-1.6, -1.62)
        self.stamp(p.x, -p.y, 0.7, 0.7, 0.3, "damp-ring", div=2)
        # damp, splashed soil round the foot of posts and poles
        posts = [(2.6, 0.0, 1.0), (9.2, 0.0, 0.8), (2.35, -6.8, 0.5), (9.35, -7.6, 0.5), (9.45, 2.4, 0.5), (1.95, 2.75, 0.7), (1.75, -4.7, 0.45), (9.6, -1.0, 0.45)]
        for x, y, size in posts:
            p = lay.local(x, y)
            self.stamp(p.x, -p.y, size, size, rng.uniform(0, 6.28), "damp-ring", div=2, top=lay.local(0, 0, 0.5).z)
        for x in [9.75 + BAY * i for i in range(6)] + [-1.75 - BAY * i for i in range(7)]:
            p = lay.local(x, FENCE_Y)
            self.stamp(p.x, -p.y, 0.45, 0.45, rng.uniform(0, 6.28), "damp-ring", div=1)
        for p in lay.poles:
            self.stamp(p.x, -p.y, 0.9, 0.9, rng.uniform(0, 6.28), "damp-ring", div=2)
        # silt in the culverts' aprons
        for empty in lay.coll.objects:
            if empty.name.startswith("PLACE_prop.culvert-end.a"):
                M = empty.matrix_world
                c = M @ Vector((0, -0.35, 0))
                self.stamp(c.x, -c.y, 0.95, 0.5, M.to_euler().z, "culvert-silt", div=2, top=c.z + 0.4, lift=0.006)
        if self.lod:
            return
        # on the booth: rust under the brackets and the switch box, a water stain under the air-conditioner
        # and the window corners, moss low on the shaded back of the plinth, dust on ledges
        W = lambda x, y, z: lay.local(x, y, z)  # noqa: E731
        R = lay.SET.to_3x3()
        up = Vector((0, 0, 1))
        back_right = R @ Vector((0, -1, 0))  # seen from behind the booth (-X), its right is -Y
        front_right = R @ Vector((0, 1, 0))
        for y in (0.30, 0.80):
            self.wall(W(-1.196, y, 0.98), back_right, up, 0.1, 0.55, "rust-a")
        self.wall(W(-1.196, 0.55, 1.12), back_right, up, 0.42, 0.75, "stain")
        self.wall(W(1.196, -1.42, 1.1), front_right, up, 0.09, 0.6, "rust-b")
        for y in (-0.73, 0.73):
            self.wall(W(1.196, y, 0.82), front_right, up, 0.12, 0.6, "stain")
        self.wall(W(-1.556, -0.6, 0.05), back_right, up, 0.9, 0.2, "moss", out=0.003)
        self.wall(W(-1.556, 0.9, 0.06), back_right, up, 0.7, 0.22, "moss", out=0.003)
        side_right = R @ Vector((-1, 0, 0))  # the approach side (-Y), seen from outside
        self.wall(W(-0.7, -1.856, 0.06), side_right, up, 0.8, 0.2, "moss", out=0.003)
        # dust on the air-conditioner's top and the window shelf
        for (x0, y0, x1, y1, z) in ((-1.52, 0.25, -1.1, 0.85, 1.921), (1.19, -0.7, 1.47, 0.7, 1.116)):
            c = W((x0 + x1) / 2, (y0 + y1) / 2, z)
            self.stamp(c.x, -c.y, (y1 - y0), (x1 - x0), lay.yaw_blender + math.pi / 2, "dust", div=1, top=c.z + 0.05, lift=0.002)
        # the yellow boom post: a rust streak under the pivot pin
        self.wall(W(2.6, -0.186, 0.72), R @ Vector((1, 0, 0)), up, 0.08, 0.5, "rust-b", out=0.002)


class Services:
    """The gate's wiring as one asset in the zone's frame: the service line on its poles, the drop to the booth, the fan's cord."""

    def __init__(self, lay, lod):
        self.lay = lay
        self.k = Kit(SHEET, lod)
        self.k.prints = PRINTS

    def catenary(self, a, b, sag, n):
        return [a.lerp(b, i / n) - Vector((0, 0, sag * 4 * (i / n) * (1 - i / n))) for i in range(n + 1)]

    def build(self):
        k = self.k
        lay = self.lay
        lod = k.lod
        n = (16, 6, 0)[lod]
        sides = (5, 3, 0)[lod]
        poles = lay.pole_mats
        # three conductors between each pair of poles, from insulator top to insulator top
        if n:
            for A, B in zip(poles, poles[1:]):
                for x in (-0.8, 0.0, 0.8):
                    a = A @ Vector((x, 0, 8.745))
                    b = B @ Vector((x, 0, 8.745))
                    k.sweep(D, "rubber", self.catenary(a, b, 0.28, n), 0.0065, segs=sides, caps=False)
            # guys on the two end poles, each with its yellow guard
            for M, away in ((poles[0], poles[0].translation - poles[1].translation), (poles[-1], poles[-1].translation - poles[-2].translation)):
                away.z = 0
                away.normalize()
                top = M @ Vector((0, 0, 8.3))
                anchor = M.translation + away * 4.8
                anchor.z = lay.G.height(anchor.x, -anchor.y) - 0.05
                k.sweep(D, "galv", [top, anchor], 0.005, segs=4, caps=False)
                k.sweep(D, "plastic-yellow", [anchor + (top - anchor).normalized() * 0.1, anchor + (top - anchor).normalized() * 2.2], 0.022, segs=sides)
        # the service drop: from the middle pole's bracket to the weatherhead on the booth's back wall
        W = lay.local
        head = W(-1.245, -0.95, 3.02)
        if n:
            bracket = poles[1] @ Vector((0.0, -0.16, 7.7))
            drop = self.catenary(bracket, head + Vector((0, 0, 0.12)), 0.45, n)
            # a drip loop below the weatherhead before the wire goes in
            loop_pt = head + (bracket - head).normalized() * 0.25 - Vector((0, 0, 0.22))
            k.sweep(D, "rubber", drop + [loop_pt, head + Vector((0, 0, 0.01))], 0.0095, segs=sides, caps=False)
        # mast and weatherhead, conduit down to the breaker box
        R = lay.SET.to_3x3()
        k.cyl(D, "galv", W(-1.245, -0.95, 1.76), head, 0.019, segs=8 if lod == 0 else 5)
        k.cyl(D, "galv", head, head + R @ Vector((-0.06, 0.0, 0.05)), 0.028, segs=6)
        # (boxes and plates on the booth are built in its own frame and turned into the zone's)
        k.box(D, "plastic-white", (-1.31, -1.07, 1.42), (-1.195, -0.83, 1.76), bevel=0.006 if lod == 0 else 0, M=lay.SET)
        if lod == 0:
            k.plate(D, k.prints.rects["breaker-label"], (-1.312, -1.03, 1.58), (-1.311, -0.87, 1.68), "-x", M=lay.SET)
            k.box(D, "plastic-black", (-1.315, -1.0, 1.5), (-1.31, -0.9, 1.53), M=lay.SET)
        # an outlet on the camp-side wall, fed down from the header's conduit, and the fan's cord
        k.cyl(D, "cord", W(1.0, 1.515, 2.48), W(1.0, 1.515, 1.24), 0.011, segs=6 if lod == 0 else 4)
        k.box(D, "plastic-white", (0.94, 1.495, 1.1), (1.06, 1.56, 1.25), bevel=0.004 if lod == 0 else 0, M=lay.SET)
        if lod == 0:  # (the fan's cord is 9 mm thick: not drawn further off)
            g = lay.ground_at
            path = [W(1.0, 1.57, 1.15), W(1.02, 1.62, 0.9), W(1.06, 1.64, 0.4), W(1.09, 1.66, PLINTH_TOP + 0.008), W(1.1, 1.86, PLINTH_TOP + 0.006)]
            for x, y in ((1.12, 1.98), (1.1, 2.2), (1.16, 2.45), (1.2, 2.62)):
                q = g(x, y)
                path.append(q + Vector((0, 0, 0.008)))
            path.append(lay.local(1.2, 2.85) + Vector((0, 0, g(1.2, 2.85).z - lay.local(1.2, 2.85).z + 0.03)))
            k.sweep(D, "cord", path, 0.0045, segs=4)


if __name__ != "build_gate_dressing":
    for asset, tris in build_all().items():
        print(asset, tris)
