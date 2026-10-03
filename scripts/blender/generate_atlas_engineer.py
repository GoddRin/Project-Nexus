"""
SCIC Atlas Navigator 2.0 — "Atlas", the friendly field engineer.

Built entirely from scratch in Blender (no imported base mesh):
  * stylised adult engineer: SCIC emerald hi-vis vest, navy work shirt, white hard hat with cyan SCIC badge
  * real face with a mouth cavity, 14 Oculus visemes + jawOpen/mouthSmile/mouthFrown shape keys,
    eyelid blink keys, brow keys and eye bones for gaze
  * Mixamo-compatible bone names (Hips, Spine, Spine1, Spine2, Neck, Head, LeftArm ...) + Eye bones
  * NO baked animation clips: all motion (idle, gestures, lip-sync, gaze) is procedural in
    components/atlas/ai/AtlasNavigatorModel.tsx, which needs predictable bone axes (see roll alignment below)

Run:
  blender --background --python scripts/blender/generate_atlas_engineer.py
Output: public/models/characters/scic_atlas_engineer.glb (+ .blend alongside)
Optional env: ATLAS_PREVIEW_DIR=<dir> renders preview PNGs.
"""
import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix

ROOT = os.getcwd()
HS = 1.12                      # stylised head scale (about the neck pivot) — friendlier + more readable lip-sync
HEAD_PIVOT = Vector((0.0, 0.0, 1.50))
OUT_DIR = os.path.join(ROOT, "public", "models", "characters")
OUT_GLB = os.path.join(OUT_DIR, "scic_atlas_engineer.glb")
OUT_BLEND = os.path.join(OUT_DIR, "scic_atlas_engineer.blend")
PREVIEW_DIR = os.environ.get("ATLAS_PREVIEW_DIR")

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ───────────────────────────── helpers ─────────────────────────────

def smoothstep(e0, e1, x):
    if e0 == e1:
        return 0.0 if x < e0 else 1.0
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


MATS = {}


def mat(name, color, rough=0.6, metal=0.0, emissive=None, strength=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (color[0], color[1], color[2], 1.0)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emissive is not None:
        b.inputs["Emission Color"].default_value = (emissive[0], emissive[1], emissive[2], 1.0)
        b.inputs["Emission Strength"].default_value = strength
    MATS[name] = m
    return m


SKIN = mat("Skin", (0.66, 0.43, 0.31), 0.55)
LIPS = mat("Lips", (0.50, 0.25, 0.22), 0.45)


def vertex_color_mat(name, rough=0.55):
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes.get("Principled BSDF")
    b.inputs["Roughness"].default_value = rough
    ca = nt.nodes.new("ShaderNodeVertexColor")
    ca.layer_name = "Color"
    nt.links.new(ca.outputs["Color"], b.inputs["Base Color"])
    MATS[name] = m
    return m


FACE_SKIN = vertex_color_mat("Skin_Face")
MOUTH = mat("Mouth_Inner", (0.05, 0.008, 0.012), 0.8)
TEETH = mat("Teeth", (0.92, 0.9, 0.84), 0.35)
EYE_W = mat("Eye_White", (0.93, 0.93, 0.92), 0.2)
IRIS = mat("Iris", (0.17, 0.09, 0.05), 0.25)
PUPIL = mat("Pupil", (0.01, 0.01, 0.01), 0.1)
HAIR = mat("Hair", (0.035, 0.028, 0.03), 0.7)
HAT = mat("HardHat", (0.93, 0.95, 0.97), 0.35, 0.05)
BAND = mat("Hat_Band", (0.0, 0.52, 0.38), 0.4)
SHIRT = mat("Shirt", (0.045, 0.085, 0.17), 0.7)
VEST = mat("Vest", (0.0, 0.50, 0.37), 0.55)
REFL = mat("Reflective", (0.78, 0.82, 0.85), 0.3, 0.6)
PANTS = mat("Pants", (0.07, 0.09, 0.12), 0.75)
BOOTS = mat("Boots", (0.05, 0.04, 0.035), 0.5)
BELT = mat("Belt", (0.03, 0.03, 0.035), 0.5, 0.3)
ACC_EMISSIVE = mat("SCIC_Accent_Emissive", (0.0, 0.2, 0.25), 0.3, 0.0, (0.0, 0.9, 1.0), 2.0)
WRIST_EMISSIVE = mat("Wrist_Emissive", (0.0, 0.2, 0.25), 0.3, 0.0, (0.0, 0.9, 1.0), 2.0)
TABLET = mat("Tablet_Body", (0.03, 0.04, 0.06), 0.3, 0.8)

OBJECTS = []   # (obj, kind) kind = dict describing weights


def new_object(name, bm, materials, face_mats=None, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in materials:
        me.materials.append(m)
    if face_mats:
        for i, p in enumerate(me.polygons):
            p.material_index = face_mats.get(i, 0)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    return ob


def loft(sections, segs=32, cap_start=True, cap_end=True, offset=(0, 0, 0)):
    """Horizontal-ring loft. sections: [(z, rx, ry, cx, cy)] bottom->top (cx,cy optional)."""
    bm = bmesh.new()
    rings = []
    for s in sections:
        z, rx, ry = s[0], s[1], s[2]
        cx = s[3] if len(s) > 3 else 0.0
        cy = s[4] if len(s) > 4 else 0.0
        ring = []
        for i in range(segs):
            a = 2 * math.pi * i / segs
            ring.append(bm.verts.new((cx + rx * math.cos(a) + offset[0], cy + ry * math.sin(a) + offset[1], z + offset[2])))
        rings.append(ring)
    for r in range(len(rings) - 1):
        for i in range(segs):
            j = (i + 1) % segs
            bm.faces.new((rings[r][i], rings[r][j], rings[r + 1][j], rings[r + 1][i]))
    if cap_start:
        bm.faces.new(rings[0][::-1])
    if cap_end:
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def uv_sphere(center, radii, segs=24, rings=16):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * radii[0] + center[0], v.co.y * radii[1] + center[1], v.co.z * radii[2] + center[2]))
    return bm


def merge_bm(dst, src):
    mp = {}
    for v in src.verts:
        mp[v] = dst.verts.new(v.co)
    for f in src.faces:
        dst.faces.new([mp[v] for v in f.verts])
    src.free()


def box(center, size):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0] + center[0], v.co.y * size[1] + center[1], v.co.z * size[2] + center[2]))
    return bm


# ───────────────────────────── armature ─────────────────────────────
arm_data = bpy.data.armatures.new("Navigator_Armature")
arm_obj = bpy.data.objects.new("Navigator_Armature", arm_data)
scene.collection.objects.link(arm_obj)
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.mode_set(mode="EDIT")

BONES = {}


def add_bone(name, head, tail, parent=None):
    eb = arm_data.edit_bones.new(name)
    eb.head = Vector(head)
    eb.tail = Vector(tail)
    if parent:
        eb.parent = arm_data.edit_bones[parent]
    BONES[name] = (Vector(head), Vector(tail))
    return eb


add_bone("Hips", (0, 0, 0.93), (0, 0, 1.0))
add_bone("Spine", (0, 0, 1.0), (0, 0, 1.10), "Hips")
add_bone("Spine1", (0, 0, 1.10), (0, 0, 1.22), "Spine")
add_bone("Spine2", (0, 0, 1.22), (0, 0, 1.40), "Spine1")
add_bone("Neck", (0, 0, 1.43), (0, 0, 1.52), "Spine2")
add_bone("Head", (0, 0, 1.52), (0, 0, 1.83), "Neck")
for side, sx in (("Left", 1.0), ("Right", -1.0)):
    add_bone(f"{side}Shoulder", (0.03 * sx, 0, 1.41), (0.17 * sx, 0, 1.41), "Spine2")
    add_bone(f"{side}Arm", (0.20 * sx, 0, 1.41), (0.228 * sx, 0, 1.13), f"{side}Shoulder")
    add_bone(f"{side}ForeArm", (0.228 * sx, 0, 1.13), (0.255 * sx, 0, 0.88), f"{side}Arm")
    add_bone(f"{side}Hand", (0.255 * sx, 0, 0.88), (0.265 * sx, 0, 0.79), f"{side}ForeArm")
    ep = HEAD_PIVOT + (Vector((0.038 * sx, -0.078, 1.655)) - HEAD_PIVOT) * HS
    add_bone(f"{side}Eye", ep, ep + Vector((0, 0, 0.014)), "Head")
    add_bone(f"{side}UpLeg", (0.09 * sx, 0, 0.93), (0.09 * sx, 0, 0.50), "Hips")
    add_bone(f"{side}Leg", (0.09 * sx, 0, 0.50), (0.09 * sx, 0, 0.09), f"{side}UpLeg")
    add_bone(f"{side}Foot", (0.09 * sx, 0, 0.09), (0.09 * sx, -0.10, 0.03), f"{side}Leg")
    add_bone(f"{side}ToeBase", (0.09 * sx, -0.10, 0.03), (0.09 * sx, -0.18, 0.03), f"{side}Foot")

# Predictable axes for procedural animation: bone Z axis points to the character's front (-Y world),
# so Y = along bone, X = lateral, Z = forward. (Runtime axis mapping is documented in AtlasNavigatorModel.tsx)
for eb in arm_data.edit_bones:
    eb.align_roll(Vector((0, -1, 0)))
bpy.ops.object.mode_set(mode="OBJECT")

# ───────────────────────────── skin weights ─────────────────────────────

def chain_weights(z, names, bounds, bw):
    """names top->bottom, bounds descending (len = len(names)-1). Smooth blend across each boundary."""
    ts = [smoothstep(b + bw, b - bw, z) for b in bounds]
    ws = {}
    for i, n in enumerate(names):
        hi = 1.0 if i == 0 else ts[i - 1]
        lo = ts[i] if i < len(ts) else 0.0
        w = max(0.0, hi - lo)
        if w > 1e-4:
            ws[n] = w
    tot = sum(ws.values()) or 1.0
    return {k: v / tot for k, v in ws.items()}


def skin(ob, weight_fn):
    """weight_fn(vertex_world_co) -> {bone_name: w}"""
    groups = {}
    me = ob.data
    for v in me.vertices:
        ws = weight_fn(v.co)
        for bn, w in ws.items():
            if bn not in groups:
                groups[bn] = ob.vertex_groups.new(name=bn)
            groups[bn].add([v.index], w, "REPLACE")
    mod = ob.modifiers.new("Armature", "ARMATURE")
    mod.object = arm_obj
    ob.parent = arm_obj


def rigid(bone):
    return lambda co: {bone: 1.0}


TORSO_NAMES = ["Spine2", "Spine1", "Spine", "Hips"]
TORSO_BOUNDS = [1.22, 1.10, 1.00]

# ───────────────────────────── body ─────────────────────────────
torso_secs = [
    (0.93, 0.150, 0.098), (1.00, 0.145, 0.095), (1.05, 0.138, 0.090), (1.15, 0.150, 0.095),
    (1.25, 0.168, 0.105), (1.33, 0.182, 0.109), (1.39, 0.186, 0.104), (1.43, 0.150, 0.088), (1.455, 0.085, 0.062), (1.475, 0.052, 0.050),
]
ob = new_object("Torso_Shirt", loft(torso_secs, 40), [SHIRT])
skin(ob, lambda co: chain_weights(co.z, TORSO_NAMES, TORSO_BOUNDS, 0.04))
OBJECTS.append(ob)

vest_secs = [
    (1.00, 0.153, 0.101), (1.05, 0.146, 0.096), (1.15, 0.159, 0.101), (1.25, 0.177, 0.111),
    (1.33, 0.189, 0.114), (1.39, 0.191, 0.106), (1.415, 0.150, 0.092),
]
ob = new_object("Vest", loft(vest_secs, 40), [VEST])
skin(ob, lambda co: chain_weights(co.z, TORSO_NAMES, TORSO_BOUNDS, 0.04))
OBJECTS.append(ob)

for i, (z0, z1) in enumerate(((1.095, 1.125), (1.185, 1.215))):
    # interpolate vest radii at the band height
    def vr(z):
        for k in range(len(vest_secs) - 1):
            a, b = vest_secs[k], vest_secs[k + 1]
            if a[0] <= z <= b[0]:
                t = (z - a[0]) / (b[0] - a[0])
                return lerp(a[1], b[1], t), lerp(a[2], b[2], t)
        return vest_secs[-1][1], vest_secs[-1][2]
    r0, r1 = vr(z0), vr(z1)
    secs = [(z0, r0[0] + 0.001, r0[1] + 0.001), (z0 + 0.002, r0[0] + 0.004, r0[1] + 0.004),
            (z1 - 0.002, r1[0] + 0.004, r1[1] + 0.004), (z1, r1[0] + 0.001, r1[1] + 0.001)]
    ob = new_object(f"Vest_Reflective_{i}", loft(secs, 40), [REFL])
    skin(ob, lambda co: chain_weights(co.z, TORSO_NAMES, TORSO_BOUNDS, 0.04))
    OBJECTS.append(ob)

# Chest badge (SCIC emissive) + belt
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.022, radius2=0.022, depth=0.005)
for v in bm.verts:
    # cone axis (Z) -> forward (-Y); place on the left chest
    v.co = Vector((v.co.x + 0.075, -0.1 + v.co.z, v.co.y + 1.27))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
ob = new_object("SCIC_Chest_Badge", bm, [ACC_EMISSIVE])
skin(ob, rigid("Spine2"))
OBJECTS.append(ob)

belt_secs = [(0.985, 0.147, 0.097), (0.99, 0.151, 0.101), (1.015, 0.151, 0.101), (1.02, 0.147, 0.097)]
ob = new_object("Belt", loft(belt_secs, 40), [BELT])
skin(ob, rigid("Hips"))
OBJECTS.append(ob)

pelvis = [(0.84, 0.140, 0.095), (0.9, 0.158, 0.103), (0.97, 0.150, 0.099), (1.0, 0.145, 0.096)]
ob = new_object("Pelvis_Pants", loft(pelvis, 40), [PANTS])
skin(ob, rigid("Hips"))
OBJECTS.append(ob)

# neck + collar
neck_secs = [(1.40, 0.052, 0.050), (1.47, 0.047, 0.046), (1.55, 0.044, 0.044), (1.585, 0.040, 0.040)]
ob = new_object("Neck", loft(neck_secs, 24), [SKIN])
skin(ob, lambda co: chain_weights(co.z, ["Head", "Neck", "Spine2"], [1.52, 1.43], 0.03))
OBJECTS.append(ob)
collar = [(1.425, 0.074, 0.066), (1.43, 0.078, 0.07), (1.47, 0.064, 0.058), (1.48, 0.056, 0.052)]
ob = new_object("Collar", loft(collar, 32, cap_start=False, cap_end=False), [SHIRT])
skin(ob, lambda co: chain_weights(co.z, ["Neck", "Spine2"], [1.43], 0.02))
OBJECTS.append(ob)

# arms (continuous sleeve loft with smooth elbow/wrist weights), hands, wrist tablet
for side, sx in (("Left", 1.0), ("Right", -1.0)):
    a_secs = [
        (0.865, 0.034 , 0.034, 0.256 * sx), (0.90, 0.038, 0.038, 0.254 * sx), (1.00, 0.042, 0.042, 0.243 * sx),
        (1.13, 0.046, 0.046, 0.228 * sx), (1.25, 0.051, 0.051, 0.212 * sx), (1.36, 0.056, 0.056, 0.203 * sx),
        (1.41, 0.057, 0.056, 0.197 * sx), (1.435, 0.050, 0.050, 0.192 * sx), (1.452, 0.034, 0.034, 0.186 * sx), (1.46, 0.012, 0.012, 0.18 * sx),
    ]
    ob = new_object(f"{side}_Arm", loft([(s[0], s[1], s[2], s[3], 0.0) for s in a_secs], 28), [SHIRT])
    nm = [f"{side}Arm", f"{side}ForeArm", f"{side}Hand"]
    skin(ob, lambda co, nm=nm: chain_weights(co.z, nm, [1.13, 0.88], 0.05))
    OBJECTS.append(ob)

    cuff = [(0.865, 0.0375, 0.0375, 0.256 * sx), (0.9, 0.0415, 0.0415, 0.254 * sx)]
    ob = new_object(f"{side}_Cuff", loft([(c[0], c[1], c[2], c[3], 0.0) for c in cuff], 28, False, False), [REFL])
    skin(ob, rigid(f"{side}Hand"))
    OBJECTS.append(ob)

    # hand: palm + thumb + fingers block
    hbm = loft([(0.795, 0.020, 0.012, 0.268 * sx), (0.82, 0.032, 0.015, 0.266 * sx),
                (0.86, 0.034, 0.016, 0.262 * sx), (0.89, 0.030, 0.017, 0.258 * sx)], 20)
    thumb = uv_sphere((0.285 * sx, -0.012, 0.855), (0.011, 0.012, 0.03), 12, 8)
    merge_bm(hbm, thumb)
    ob = new_object(f"{side}_Hand", hbm, [SKIN])
    skin(ob, rigid(f"{side}Hand"))
    OBJECTS.append(ob)

    # legs + boots
    l_secs = [(0.10, 0.052, 0.058, 0.09 * sx), (0.30, 0.060, 0.064, 0.09 * sx), (0.50, 0.072, 0.076, 0.09 * sx),
              (0.74, 0.083, 0.086, 0.09 * sx), (0.93, 0.085, 0.088, 0.09 * sx)]
    ob = new_object(f"{side}_Leg", loft([(s[0], s[1], s[2], s[3], 0.0) for s in l_secs], 24), [PANTS])
    ln = [f"{side}UpLeg", f"{side}Leg", f"{side}Foot"]
    skin(ob, lambda co, ln=ln: chain_weights(co.z, ln, [0.50, 0.09], 0.05))
    OBJECTS.append(ob)
    b_secs = [(0.0, 0.050, 0.095, 0.09 * sx, -0.045), (0.02, 0.056, 0.110, 0.09 * sx, -0.05),
              (0.07, 0.056, 0.100, 0.09 * sx, -0.035), (0.13, 0.054, 0.06, 0.09 * sx, 0.0)]
    ob = new_object(f"{side}_Boot", loft(b_secs, 24), [BOOTS])
    skin(ob, rigid(f"{side}Foot"))
    OBJECTS.append(ob)

# wrist tablet on the front of the left forearm (visible to the viewer)
tbm = box((0.248, -0.0465, 0.99), (0.06, 0.012, 0.09))
ob = new_object("SCIC_Wrist_Terminal", tbm, [TABLET], smooth=False)
skin(ob, rigid("LeftForeArm"))
OBJECTS.append(ob)
sbm = box((0.248, -0.0530, 0.99), (0.048, 0.002, 0.072))
ob = new_object("SCIC_Wrist_Screen", sbm, [WRIST_EMISSIVE], smooth=False)
skin(ob, rigid("LeftForeArm"))
OBJECTS.append(ob)

# ───────────────────────────── head ─────────────────────────────
HC = Vector((0.0, 0.0, 1.64))
HR = Vector((0.094, 0.102, 0.122))
MOUTH_Z = 1.573
MOUTH_RX = 0.029
MOUTH_RZ = 0.0085


def shape_head_vertex(co):
    x, y, z = co.x, co.y, co.z
    zr = z - HC.z
    # jaw/chin taper
    t = smoothstep(-0.015, -0.10, zr)
    x *= 1.0 - 0.17 * t
    y *= 1.0 - 0.06 * t
    # chin forward & squared
    if zr < -0.05 and y < 0:
        y -= 0.008 * smoothstep(-0.05, -0.105, zr)
    # cheek fullness
    x *= 1.0 + 0.04 * math.exp(-((zr + 0.035) / 0.035) ** 2)
    # brow ridge
    if y < 0:
        y -= 0.004 * math.exp(-((z - 1.688) / 0.014) ** 2) * (1 - (abs(x) / 0.08) ** 2 if abs(x) < 0.08 else 0)
    # eye sockets
    for sx in (-1, 1):
        d = math.hypot(x - 0.038 * sx, z - 1.655)
        if y < 0 and d < 0.028:
            y += 0.0035 * (1 - smoothstep(0.0, 0.028, d))
    return Vector((x, y, z))


hbm = bmesh.new()
bmesh.ops.create_uvsphere(hbm, u_segments=176, v_segments=128, radius=1.0)
for v in hbm.verts:
    v.co = shape_head_vertex(Vector((v.co.x * HR.x + HC.x, v.co.y * HR.y + HC.y, v.co.z * HR.z + HC.z)))
hbm.verts.ensure_lookup_table()
hbm.faces.ensure_lookup_table()

# carve the mouth slit
hole_faces = []
for f in hbm.faces:
    c = f.calc_center_median()
    if c.y < -0.03:
        r = (c.x / MOUTH_RX) ** 2 + ((c.z - MOUTH_Z) / MOUTH_RZ) ** 2
        if r < 1.0:
            hole_faces.append(f)
bmesh.ops.delete(hbm, geom=hole_faces, context="FACES_ONLY")
bmesh.ops.delete(hbm, geom=[v for v in hbm.verts if not v.link_faces], context="VERTS")
hbm.edges.ensure_lookup_table()
boundary = [e for e in hbm.edges if e.is_boundary]

# Smooth the stair-stepped slit: project the rim onto the ideal ellipse, then relax the ring around it
rim = set(v for e in boundary for v in e.verts)
for v in rim:
    ang = math.atan2((v.co.z - MOUTH_Z) / MOUTH_RZ, v.co.x / MOUTH_RX)
    v.co.x = MOUTH_RX * math.cos(ang)
    v.co.z = MOUTH_Z + MOUTH_RZ * math.sin(ang)
near = [v for v in hbm.verts if v not in rim and v.co.y < -0.03 and
        ((v.co.x / MOUTH_RX) ** 2 + ((v.co.z - MOUTH_Z) / MOUTH_RZ) ** 2) < 7.0]
for _ in range(3):
    newp = {}
    for v in near:
        nb = [e.other_vert(v).co for e in v.link_edges]
        avg = sum(nb, Vector()) / len(nb)
        newp[v] = v.co.lerp(avg, 0.5)
    for v, c in newp.items():
        v.co = c
ext = bmesh.ops.extrude_edge_only(hbm, edges=boundary)
new_verts = [g for g in ext["geom"] if isinstance(g, bmesh.types.BMVert)]
new_edges = [g for g in ext["geom"] if isinstance(g, bmesh.types.BMEdge)]
for v in new_verts:
    v.co = Vector((v.co.x * 0.80, v.co.y + 0.034, MOUTH_Z + (v.co.z - MOUTH_Z) * 0.7))
cap_edges = [e for e in new_edges if all(v in new_verts for v in e.verts)]
cap = bmesh.ops.contextual_create(hbm, geom=cap_edges)
hbm.faces.ensure_lookup_table()
bmesh.ops.recalc_face_normals(hbm, faces=hbm.faces)
hbm.faces.index_update()


# per-face material: cavity = faces touching a new vert; lips = ring around the slit
face_mats = {}
cav_set = set(new_verts)
for f in hbm.faces:
    c = f.calc_center_median()
    if any(v in cav_set for v in f.verts):
        face_mats[f.index] = 2
        continue
    if c.y < -0.03:
        rho = math.sqrt((c.x / MOUTH_RX) ** 2 + ((c.z - MOUTH_Z) / MOUTH_RZ) ** 2)
        if rho < 1.75:
            face_mats[f.index] = 1

head_ob = new_object("Head", hbm, [FACE_SKIN, FACE_SKIN, MOUTH], face_mats)
SKIN_RGB = Vector((0.66, 0.43, 0.31))
LIP_RGB = Vector((0.52, 0.24, 0.22))
ca = head_ob.data.color_attributes.new(name="Color", type="FLOAT_COLOR", domain="POINT")
for v in head_ob.data.vertices:
    if v.co.y < -0.02:
        rho = math.sqrt((v.co.x / MOUTH_RX) ** 2 + ((v.co.z - MOUTH_Z) / MOUTH_RZ) ** 2)
        t = 1.0 - smoothstep(1.15, 2.0, rho)
    else:
        t = 0.0
    c = SKIN_RGB.lerp(LIP_RGB, t)
    ca.data[v.index].color = (c.x, c.y, c.z, 1.0)
skin(head_ob, rigid("Head"))
OBJECTS.append(head_ob)

# ── viseme / expression shape keys on the head ──
MOUTH_C = Vector((0.0, 0.0, MOUTH_Z))


def is_front(y):
    return y < -0.02


def lip_falloff(x, z, y):
    if not is_front(y):
        return 0.0
    rho = math.sqrt((x / (MOUTH_RX * 1.15)) ** 2 + ((z - MOUTH_Z) / (MOUTH_RZ * 1.9)) ** 2)
    return 1.0 - smoothstep(1.1, 2.6, rho)


def wide_falloff(x, z, y):
    if not is_front(y):
        return 0.0
    rho = math.sqrt((x / 0.06) ** 2 + ((z - MOUTH_Z) / 0.04) ** 2)
    return 1.0 - smoothstep(0.8, 1.7, rho)


def jaw_falloff(x, z, y):
    dz = z - MOUTH_Z
    lateral = 1.0 - smoothstep(0.045, 0.085, abs(x))
    depth = 1.0 - smoothstep(0.0, 0.05, y)  # hinge near the ears: nothing behind them moves
    return smoothstep(0.0, -0.014, dz) * lateral * depth


def transform(co, open_amt, jaw=0.0, upper=0.0, width=1.0, protrude=0.0, corner=0.0, lower_extra=0.0):
    x, y, z = co.x, co.y, co.z
    L = lip_falloff(x, z, y)
    sq = 0.14 + 0.86 * open_amt
    z = MOUTH_Z + (z - MOUTH_Z) * (1.0 - (1.0 - sq) * L)
    W = wide_falloff(x, z, y)
    x = x * (1.0 + (width - 1.0) * W)
    if corner != 0.0:
        z += corner * smoothstep(0.012, 0.034, abs(x)) * W
    if z > MOUTH_Z:
        z += upper * L
    z -= jaw * jaw_falloff(x, z, y) + (lower_extra * L if z < MOUTH_Z else 0.0)
    y -= protrude * L
    return Vector((x, y, z))


head_ob.shape_key_add(name="Basis", from_mix=False)
base_co = [v.co.copy() for v in head_ob.data.vertices]
# bake the closed-lip rest pose into the basis
rest_co = [transform(c, 0.0) for c in base_co]
for v, c in zip(head_ob.data.vertices, rest_co):
    v.co = c
head_ob.data.shape_keys.key_blocks["Basis"].data.foreach_set("co", [f for c in rest_co for f in c])

VISEMES = {
    # name: (open, jaw, upper, width, protrude, corner, lower_extra)
    "viseme_PP": (0.0, 0.000, -0.0008, 0.96, 0.004, 0.0, 0.0),
    "viseme_FF": (0.25, 0.004, 0.0, 1.0, 0.0, 0.0, 0.0045),
    "viseme_TH": (0.35, 0.007, 0.0, 1.03, 0.0, 0.0, 0.0),
    "viseme_DD": (0.4, 0.009, 0.0, 1.06, 0.0, 0.0, 0.0),
    "viseme_kk": (0.5, 0.012, 0.0, 1.0, 0.0, 0.0, 0.0),
    "viseme_CH": (0.4, 0.007, 0.0, 0.86, 0.012, 0.0, 0.0),
    "viseme_SS": (0.2, 0.004, 0.0, 1.14, 0.0, 0.003, 0.0),
    "viseme_nn": (0.35, 0.007, 0.0, 1.03, 0.0, 0.0, 0.0),
    "viseme_RR": (0.4, 0.008, 0.0, 0.86, 0.007, 0.0, 0.0),
    "viseme_aa": (1.0, 0.026, 0.004, 1.0, 0.0, 0.0, 0.002),
    "viseme_E": (0.7, 0.014, 0.002, 1.16, 0.0, 0.002, 0.0),
    "viseme_I": (0.55, 0.009, 0.001, 1.22, 0.0, 0.004, 0.0),
    "viseme_O": (0.9, 0.020, 0.002, 0.70, 0.014, 0.0, 0.0),
    "viseme_U": (0.6, 0.010, 0.0, 0.62, 0.016, 0.0, 0.0),
    "jawOpen": (0.9, 0.030, 0.0, 1.0, 0.0, 0.0, 0.0),
    "mouthSmile": (0.2, 0.0, 0.0, 1.16, 0.0, 0.009, 0.0),
    "mouthFrown": (0.0, 0.0, 0.0, 0.95, 0.0, -0.007, 0.0),
}
for kname, p in VISEMES.items():
    kb = head_ob.shape_key_add(name=kname, from_mix=False)
    kb.slider_min = 0.0
    kb.slider_max = 1.0
    kb.value = 0.0
    coords = [transform(c, p[0], jaw=p[1], upper=p[2], width=p[3], protrude=p[4], corner=p[5], lower_extra=p[6]) for c in base_co]
    kb.data.foreach_set("co", [f for c in coords for f in c])

# upper teeth (just behind the upper lip, hidden while lips are closed)
tb = bmesh.new()
for i in range(9):
    t = (i - 4) / 4.0
    x = t * 0.021
    y = -0.064 + (x / 0.03) ** 2 * 0.012
    seg = box((x, y, MOUTH_Z + 0.0006), (0.0052, 0.004, 0.0062))
    merge_bm(tb, seg)
ob = new_object("Teeth", tb, [TEETH], smooth=False)
skin(ob, rigid("Head"))
OBJECTS.append(ob)

# ── eyes ──
EYE_R = 0.0145
eye_centers = {"Left": Vector((0.038, -0.078, 1.655)), "Right": Vector((-0.038, -0.078, 1.655))}
for side, c in eye_centers.items():
    ebm = uv_sphere(c, (EYE_R, EYE_R, EYE_R), 48, 32)
    fm = {}
    ebm.faces.ensure_lookup_table()
    for f in ebm.faces:
        d = (f.calc_center_median() - c).normalized()
        ang = math.degrees(math.acos(max(-1, min(1, -d.y))))
        if ang < 12:
            fm[f.index] = 3
        elif ang < 30:
            fm[f.index] = 2
        else:
            fm[f.index] = 1
    ob = new_object(f"{side}_Eye", ebm, [SKIN, EYE_W, IRIS, PUPIL], fm)
    skin(ob, rigid(f"{side}Eye"))
    OBJECTS.append(ob)

# eyelids with blink shape keys
lid_bm = bmesh.new()
lid_rot = {}
for side, c in eye_centers.items():
    lb = uv_sphere(c, (EYE_R * 1.1, EYE_R * 1.1, EYE_R * 1.1), 48, 32)
    lb.faces.ensure_lookup_table()
    drop = [f for f in lb.faces if not (((f.calc_center_median() - c).y < 0.0) and ((f.calc_center_median() - c).z > -0.5 * EYE_R * 1.1))]
    bmesh.ops.delete(lb, geom=drop, context="FACES_ONLY")
    bmesh.ops.delete(lb, geom=[v for v in lb.verts if not v.link_faces], context="VERTS")
    start = len(lid_bm.verts)
    merge_bm(lid_bm, lb)
    lid_rot[side] = (c, start, len(lid_bm.verts))
lid_ob = new_object("Eyelids", lid_bm, [SKIN])
closed_co = [v.co.copy() for v in lid_ob.data.vertices]


def rot_about_x(co, center, ang):
    p = co - center
    ca, sa = math.cos(ang), math.sin(ang)
    return center + Vector((p.x, p.y * ca - p.z * sa, p.y * sa + p.z * ca))


lid_ob.shape_key_add(name="Basis", from_mix=False)
open_co = list(closed_co)
for side, (c, s, e) in lid_rot.items():
    for i in range(s, e):
        open_co[i] = rot_about_x(closed_co[i], c, math.radians(-62))
lid_ob.data.shape_keys.key_blocks["Basis"].data.foreach_set("co", [f for c in open_co for f in c])
for side, key in (("Left", "eyeBlinkLeft"), ("Right", "eyeBlinkRight")):
    kb = lid_ob.shape_key_add(name=key, from_mix=False)
    kb.value = 0.0
    coords = list(open_co)
    c, s, e = lid_rot[side]
    for i in range(s, e):
        coords[i] = rot_about_x(closed_co[i], c, math.radians(8))
    kb.data.foreach_set("co", [f for c in coords for f in c])
for v, c in zip(lid_ob.data.vertices, open_co):
    v.co = c
skin(lid_ob, rigid("Head"))
OBJECTS.append(lid_ob)

# ── brows ──
brow_bm = bmesh.new()
BROW_PTS = 7


def head_surface_y(x, z):
    q = 1.0 - (x / HR.x) ** 2 - ((z - HC.z) / HR.z) ** 2
    return -HR.y * math.sqrt(max(q, 0.0))


brow_info = []
for sx in (1.0, -1.0):
    top, bot = [], []
    for i in range(BROW_PTS):
        t = i / (BROW_PTS - 1)
        x = (0.018 + t * 0.046) * sx
        z = 1.694 + 0.007 * math.sin(math.pi * (0.1 + 0.8 * t)) - 0.004 * t
        y = head_surface_y(x, z) - 0.0035
        th = lerp(0.0048, 0.0022, t)
        top.append(brow_bm.verts.new((x, y, z + th)))
        bot.append(brow_bm.verts.new((x, y, z - th)))
        brow_info.append((len(brow_bm.verts) - 2, t, sx))
    for i in range(BROW_PTS - 1):
        brow_bm.faces.new((top[i], top[i + 1], bot[i + 1], bot[i]))
brow_ob = new_object("Brows", brow_bm, [HAIR])
brow_ob.shape_key_add(name="Basis", from_mix=False)
bco = [v.co.copy() for v in brow_ob.data.vertices]
for key, fn in (
    ("browInnerUp", lambda c, t, sx: c + Vector((0, 0, 0.011 * (1 - smoothstep(0.0, 0.7, t)) + 0.002))),
    ("browDown", lambda c, t, sx: c + Vector((-0.004 * sx * (1 - t), 0.0, -0.007 - 0.004 * (1 - t)))),
):
    kb = brow_ob.shape_key_add(name=key, from_mix=False)
    kb.value = 0.0
    pos = list(bco)
    for (idx, t, sx) in brow_info:
        pos[idx] = fn(bco[idx], t, sx)
        pos[idx + 1] = fn(bco[idx + 1], t, sx)
    kb.data.foreach_set("co", [f for c in pos for f in c])
skin(brow_ob, rigid("Head"))
OBJECTS.append(brow_ob)

# ── nose, ears, hair ──
nb = uv_sphere((0, -0.0925, 1.628), (0.0105, 0.016, 0.024), 20, 12)
merge_bm(nb, uv_sphere((0, -0.106, 1.607), (0.0125, 0.0125, 0.011), 20, 12))
merge_bm(nb, uv_sphere((0.0105, -0.1, 1.604), (0.0065, 0.0075, 0.0075), 12, 8))
merge_bm(nb, uv_sphere((-0.0105, -0.1, 1.604), (0.0065, 0.0075, 0.0075), 12, 8))
ob = new_object("Nose", nb, [SKIN])
skin(ob, rigid("Head"))
OBJECTS.append(ob)

eb = uv_sphere((0.0865, 0.002, 1.64), (0.0075, 0.016, 0.026), 16, 10)
merge_bm(eb, uv_sphere((-0.0865, 0.002, 1.64), (0.0075, 0.016, 0.026), 16, 10))
ob = new_object("Ears", eb, [SKIN])
skin(ob, rigid("Head"))
OBJECTS.append(ob)

hb = bmesh.new()
bmesh.ops.create_uvsphere(hb, u_segments=64, v_segments=40, radius=1.0)
for v in hb.verts:
    v.co = Vector((v.co.x * HR.x * 1.05, v.co.y * HR.y * 1.05 + 0.002, v.co.z * HR.z * 1.04 + HC.z + 0.002))
hb.verts.ensure_lookup_table()
rem = [v for v in hb.verts if v.co.z < 1.595 or (v.co.y < -0.035 and v.co.z < 1.725) or v.co.z > 1.735 and v.co.y < -0.06]
bmesh.ops.delete(hb, geom=rem, context="VERTS")
ob = new_object("Hair", hb, [HAIR])
skin(ob, rigid("Head"))
OBJECTS.append(ob)

# ── hard hat ──
dome = bmesh.new()
bmesh.ops.create_uvsphere(dome, u_segments=56, v_segments=28, radius=1.0)
for v in dome.verts:
    v.co = Vector((v.co.x * 0.102, v.co.y * 0.116 + 0.002, v.co.z * 0.090 + 1.716))
dome.verts.ensure_lookup_table()
bmesh.ops.delete(dome, geom=[v for v in dome.verts if v.co.z < 1.716], context="VERTS")
ob = new_object("HardHat_Dome", dome, [HAT])
skin(ob, rigid("Head"))
OBJECTS.append(ob)

brim = loft([(1.711, 0.121, 0.138, 0.0, -0.012), (1.714, 0.128, 0.146, 0.0, -0.014), (1.722, 0.124, 0.142, 0.0, -0.013), (1.725, 0.108, 0.122, 0.0, -0.004)], 56)
ob = new_object("HardHat_Brim", brim, [HAT])
skin(ob, rigid("Head"))
OBJECTS.append(ob)
ridge = box((0, 0.0, 1.8), (0.014, 0.17, 0.014))
ob = new_object("HardHat_Ridge", ridge, [HAT], smooth=False)
skin(ob, rigid("Head"))
OBJECTS.append(ob)
band = loft([(1.737, 0.0975, 0.1115), (1.739, 0.0995, 0.1135), (1.753, 0.0995, 0.1135), (1.755, 0.0975, 0.1115)], 56, False, False)
ob = new_object("HardHat_Band", band, [BAND])
skin(ob, rigid("Head"))
OBJECTS.append(ob)

lb = bmesh.new()
bmesh.ops.create_cone(lb, cap_ends=True, segments=28, radius1=0.0155, radius2=0.0155, depth=0.003)
rot = Matrix.Rotation(math.radians(40), 3, "X")  # cone axis Z -> forward/up along the dome surface
for v in lb.verts:
    v.co = rot @ Vector((v.co.x, v.co.y, v.co.z)) + Vector((0, -0.0835, 1.778))
bmesh.ops.recalc_face_normals(lb, faces=lb.faces)
ob = new_object("SCIC_Hat_Logo", lb, [ACC_EMISSIVE])
skin(ob, rigid("Head"))
OBJECTS.append(ob)

# ───────────────────────────── head scale (stylisation) ─────────────────────────────
HEAD_OBJECTS = [o for o in OBJECTS if o.name in (
    "Head", "Teeth", "Left_Eye", "Right_Eye", "Eyelids", "Brows", "Nose", "Ears", "Hair",
    "HardHat_Dome", "HardHat_Brim", "HardHat_Ridge", "HardHat_Band", "SCIC_Hat_Logo")]
for o in HEAD_OBJECTS:
    me = o.data
    for v in me.vertices:
        v.co = HEAD_PIVOT + (v.co - HEAD_PIVOT) * HS
    if me.shape_keys:
        for kb in me.shape_keys.key_blocks:
            for d in kb.data:
                d.co = HEAD_PIVOT + (d.co - HEAD_PIVOT) * HS

# ───────────────────────────── export ─────────────────────────────
for o in bpy.data.objects:
    o.select_set(False)
bpy.context.view_layer.update()

os.makedirs(OUT_DIR, exist_ok=True)

if PREVIEW_DIR:
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 24
    scene.cycles.device = "CPU"
    scene.render.resolution_x = 640
    scene.render.resolution_y = 800
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "Standard"
    world = bpy.data.worlds.new("W")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.08, 0.1, 0.14, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.8
    scene.world = world
    for nm, loc, e in (("Key", (1.5, -2.5, 2.6), 120), ("Fill", (-1.8, -2.2, 1.6), 60), ("Rim", (-1.5, 2.0, 2.4), 90)):
        ld = bpy.data.lights.new(nm, "AREA")
        ld.energy = e
        ld.size = 1.5
        lo = bpy.data.objects.new(nm, ld)
        lo.location = loc
        scene.collection.objects.link(lo)
        direction = Vector((0, 0, 1.4)) - Vector(loc)
        lo.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    cam_d = bpy.data.cameras.new("Cam")
    cam = bpy.data.objects.new("Cam", cam_d)
    scene.collection.objects.link(cam)
    scene.camera = cam

    def shot(name, loc, target, lens=50):
        cam_d.lens = lens
        cam.location = loc
        cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(PREVIEW_DIR, name + ".png")
        bpy.ops.render.render(write_still=True)

    shot("full", (0, -3.4, 1.0), (0, 0, 0.95), 40)
    shot("upper", (0, -1.9, 1.35), (0, 0, 1.3), 50)
    shot("face", (0, -1.0, 1.64), (0, 0, 1.63), 85)
    shot("three_quarter", (0.9, -1.3, 1.55), (0, 0, 1.5), 60)
    # open mouth preview
    kb = head_ob.data.shape_keys.key_blocks
    kb["viseme_aa"].value = 1.0
    shot("face_aa", (0, -1.0, 1.64), (0, 0, 1.63), 85)
    kb["viseme_aa"].value = 0.0
    kb["viseme_O"].value = 1.0
    shot("face_O", (0, -1.0, 1.64), (0, 0, 1.63), 85)
    kb["viseme_O"].value = 0.0
    kb["mouthSmile"].value = 1.0
    shot("face_smile", (0, -1.0, 1.64), (0, 0, 1.63), 85)
    kb["mouthSmile"].value = 0.0
    for o in (cam, ):
        bpy.data.objects.remove(o, do_unlink=True)
    for o in [o for o in bpy.data.objects if o.type == "LIGHT"]:
        bpy.data.objects.remove(o, do_unlink=True)

bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format="GLB",
    use_selection=False,
    export_animations=False,
    export_skins=True,
    export_morph=True,
    export_morph_normal=False,
    export_apply=False,
    export_yup=True,
    export_vertex_color="ACTIVE",
)
print("EXPORTED", OUT_GLB, os.path.getsize(OUT_GLB))
