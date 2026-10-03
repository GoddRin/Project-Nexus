"""Re-proportion the Atlas Navigator for a sturdier, more masculine build and re-export the GLB.

Run headless from the repo root:
  blender -b scripts/blender/source/scic_atlas_navigator_pro.blend \
      --python scripts/blender/masculinize_atlas_navigator.py -- <out.blend> <out.glb> [params.json]

How it works: the bones are scaled / turned in pose mode (broader shoulder girdle and chest, thicker
arms and neck, a wider stance), every skinned mesh is baked to that pose (shape keys included, so
the face blendshapes keep working), and the pose is then applied as the new rest pose. Nothing is
re-rigged or re-weighted, and the bone names the web app drives stay the same.
"""
import bpy, sys, json, math
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
OUT_BLEND, OUT_GLB = argv[0], argv[1]
P = {
    "clavicle_len": 1.14,     # shoulder width
    "chest_w": 1.07, "chest_d": 1.05,
    "ribs_w": 1.04, "ribs_d": 1.02,
    "upper_arm": 1.15, "forearm": 1.14, "hand": 1.06,
    "neck": 1.12,
    "thigh": 1.05,
    "stance_deg": 3.5,        # each leg turned out by this much
    "vest_hem": 0.90,         # horizontal scale of the vest at its hem (1 = unchanged), easing to 1 at the armpits
    "jaw": 0.0,               # extra jaw width (0.05 = 5 %)
}
if len(argv) > 2:
    P.update(json.load(open(argv[2])))

arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
vl = bpy.context.view_layer
for o in bpy.data.objects:
    o.select_set(False)
vl.objects.active = arm
meshes = [o for o in bpy.data.objects if o.type == "MESH" and any(m.type == "ARMATURE" and m.object == arm for m in o.modifiers)]


def pb(name):
    for n in (name, f"mixamorig:{name}", f"mixamorig_{name}"):
        if n in arm.pose.bones:
            return arm.pose.bones[n]
    raise KeyError(name)


# Scale must not cascade down the chain: a child keeps its own size but still rides its parent
saved_inherit = {b.name: b.inherit_scale for b in arm.data.bones}
for b in arm.data.bones:
    b.inherit_scale = "NONE"
for b in arm.pose.bones:
    b.rotation_mode = "QUATERNION"


def scale_bone(name, width=1.0, depth=1.0, length=1.0, thick=None):
    """Scale a bone in world terms: width = left-right, depth = front-back, length = along the bone.
    `thick` scales both axes across the bone (limbs)."""
    b = pb(name)
    if thick is not None:
        b.scale = (thick, length, thick)
        return
    m = (arm.matrix_world @ b.bone.matrix_local).to_3x3()
    x_axis = m.col[0].normalized()
    # is the bone's local X the body's left-right axis (world X) or its front-back axis (world Y)?
    if abs(x_axis.x) >= abs(x_axis.y):
        b.scale = (width, length, depth)
    else:
        b.scale = (depth, length, width)


def rot_world(name, axis, deg):
    b = pb(name)
    vl.update()
    mw = arm.matrix_world @ b.matrix
    loc = mw.to_translation()
    sc = b.scale.copy()
    new = (Matrix.Rotation(math.radians(deg), 3, axis) @ mw.to_3x3()).to_4x4()
    new.translation = loc
    b.matrix = arm.matrix_world.inverted() @ new
    b.scale = sc
    vl.update()


# ── 1. Proportions ──
for side in ("Left", "Right"):
    scale_bone(f"{side}Shoulder", length=P["clavicle_len"])
    scale_bone(f"{side}Arm", thick=P["upper_arm"])
    scale_bone(f"{side}ForeArm", thick=P["forearm"])
    h = pb(f"{side}Hand")
    h.scale = (P["hand"],) * 3
    scale_bone(f"{side}UpLeg", thick=P["thigh"])
scale_bone("Spine2", width=P["chest_w"], depth=P["chest_d"])
scale_bone("Spine1", width=P["ribs_w"], depth=P["ribs_d"])
scale_bone("Neck", width=P["neck"], depth=P["neck"])
# hands: fingers follow the hand's size
for b in arm.pose.bones:
    if "Hand" in b.name and b.name not in ("LeftHand", "RightHand") and not b.name.endswith("Hand"):
        b.scale = (P["hand"],) * 3
vl.update()

# ── 2. Stance: feet a little apart, soles kept flat ──
if P["stance_deg"]:
    for side, s in (("Left", 1), ("Right", -1)):
        rot_world(f"{side}UpLeg", "Y", -s * P["stance_deg"])
        rot_world(f"{side}Foot", "Y", s * P["stance_deg"])
vl.update()


# ── 3. Bake every skinned mesh to the new pose (all shape keys too) ──
def evaluated_coords(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    ev = obj.evaluated_get(dg)
    me = ev.to_mesh()
    co = [v.co.copy() for v in me.vertices]
    ev.to_mesh_clear()
    return co


for obj in meshes:
    me = obj.data
    if me.shape_keys:
        keys = me.shape_keys.key_blocks
        old_values = [k.value for k in keys]
        obj.show_only_shape_key = True
        baked = []
        for i in range(len(keys)):
            obj.active_shape_key_index = i
            vl.update()
            co = evaluated_coords(obj)
            assert len(co) == len(me.vertices), obj.name
            baked.append(co)
        for i, k in enumerate(keys):
            for v, c in zip(k.data, baked[i]):
                v.co = c
        for v, c in zip(me.vertices, baked[0]):
            v.co = c
        obj.show_only_shape_key = False
        obj.active_shape_key_index = 0
        for k, val in zip(keys, old_values):
            k.value = val
    else:
        co = evaluated_coords(obj)
        assert len(co) == len(me.vertices), obj.name
        for v, c in zip(me.vertices, co):
            v.co = c
    me.update()
    print("BAKED", obj.name, len(me.vertices))

# ── 4. The pose becomes the rest pose ──
bpy.ops.object.mode_set(mode="POSE")
bpy.ops.pose.select_all(action="SELECT")
bpy.ops.pose.armature_apply(selected=False)
bpy.ops.object.mode_set(mode="OBJECT")
for b in arm.data.bones:
    b.inherit_scale = saved_inherit.get(b.name, "FULL")
vl.update()

# ── 5. Vest: take in the boxy flare at the hem so it sits on the body instead of around it ──
vest = bpy.data.objects.get("Vest")
if vest and P["vest_hem"] != 1.0:
    mw = vest.matrix_world
    inv = mw.inverted()
    ws = [mw @ v.co for v in vest.data.vertices]
    z_lo, z_hi = min(w.z for w in ws), max(w.z for w in ws)
    spine = arm.matrix_world @ pb("Spine1").bone.head_local
    armpit = z_lo + (z_hi - z_lo) * 0.62
    for v, w in zip(vest.data.vertices, ws):
        t = max(0.0, min(1.0, (armpit - w.z) / (armpit - z_lo)))
        t = t * t * (3 - 2 * t)
        k = 1 + (P["vest_hem"] - 1) * t
        w2 = Vector((spine.x + (w.x - spine.x) * k, spine.y + (w.y - spine.y) * k, w.z))
        v.co = inv @ w2
    vest.data.update()

# ── 6. Jaw: a little more width low on the face (applied to every face shape so they stay consistent) ──
body = bpy.data.objects.get("Body")
if body and P["jaw"]:
    head_w = arm.matrix_world @ pb("Head").bone.head_local      # base of the skull
    top_w = arm.matrix_world @ pb("Head").bone.tail_local
    head_h = (top_w - head_w).length
    jaw_z = head_w.z + head_h * 0.18
    mw, inv = body.matrix_world, body.matrix_world.inverted()

    def field(w):
        dz = (w.z - jaw_z) / (head_h * 0.22)
        if abs(dz) > 1 or w.z < head_w.z - head_h * 0.05:
            return w
        f = (1 - dz * dz) ** 2
        return Vector((head_w.x + (w.x - head_w.x) * (1 + P["jaw"] * f), w.y, w.z))

    blocks = body.data.shape_keys.key_blocks if body.data.shape_keys else None
    if blocks:
        for k in blocks:
            for v in k.data:
                v.co = inv @ field(mw @ v.co)
    for v in body.data.vertices:
        v.co = inv @ field(mw @ v.co)
    body.data.update()

# ── 7. Save + export (same settings as the original export) ──
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND, copy=True)
for o in bpy.data.objects:
    o.select_set(o == arm or o in meshes)
vl.objects.active = arm
bpy.ops.export_scene.gltf(
    filepath=OUT_GLB, export_format="GLB", use_selection=True, export_animations=False, export_skins=True,
    export_morph=True, export_morph_normal=False, export_apply=False, export_yup=True,
    export_image_format="JPEG", export_jpeg_quality=85,
)
print("EXPORTED", OUT_GLB)
