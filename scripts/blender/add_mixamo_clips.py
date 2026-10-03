"""Put Mixamo motion-capture clips (and clips carried over from an earlier navigator GLB) onto the
Atlas Navigator and export the GLB.

  blender -b scripts/blender/source/scic_atlas_navigator_pro_v4.blend \
      --python scripts/blender/add_mixamo_clips.py -- <out.glb> <previous.glb> <mixamo_dir>

Sources are Mixamo FBX files exported "without skin" on Y Bot (30 fps, in place) and the previous
GLB, from which only KEEP_FROM_PREVIOUS is taken. Every rig involved rests in a T-pose and uses
the Mixamo bone names, so each bone's motion is transferred as a world-space rotation relative to
its rest pose (independent of how either rig's bones are rolled), solved parent-first. Hips
translation is scaled by the ratio of hip heights. One glTF animation per clip.

The raw FBX files are not in git (Mixamo's licence forbids redistributing them): see
assets-src/mixamo/ and CREDITS.md.
"""
import bpy, sys, os, glob
from mathutils import Quaternion, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
OUT_GLB, PREVIOUS_GLB, MIXAMO_DIR = argv[0], argv[1], argv[2]

# clips kept from the previous model (the two standing loops in use; the rest were rejected)
KEEP_FROM_PREVIOUS = {"idleSubtle": "idleSubtle", "foldArms": "foldArms"}
# mixamo file (without .fbx) -> clip name in the GLB
MIXAMO = {
    "atlas_point_forward": "pointR",
    "atlas_point_forward_mirror": "pointL",
    "atlas_present_side": "presentR",
    "atlas_present_side_mirror": "presentL",
    "atlas_present_both": "presentBoth",
    "atlas_wave": "wave",
    "atlas_bow": "bow",
    "atlas_explain_one": "explainOne",
    "atlas_explain_two": "explainTwo",
    "atlas_shrug": "shrug",
    "atlas_nod_firm": "nodFirm",
    "atlas_acknowledge": "acknowledge",
    "atlas_breathing_idle": "idleBreathing",
    # back in on 2026-10-03: the user lifted the limits on head tilts, hip stance and hands at the body
    "atlas_offer": "offer",
    "atlas_nod_listen": "nodListen",
    "atlas_neutral_idle": "idleNeutral",
}
# Downloaded, reviewed on him (scripts/blender/render_clip_review.py) and left out:
#   atlas_point_bent   points at the viewer's face        atlas_look_around  turns his back to the camera
#   (atlas_wave is exported but not played: it holds the upper arm straight out sideways)

tgt = next(o for o in bpy.data.objects if o.type == "ARMATURE")
scene = bpy.context.scene
vl = bpy.context.view_layer
scene.render.fps = 30


def short(name):
    """mixamorig:Hips / mixamorig_Hips / mixamorigHips -> Hips"""
    for p in ("mixamorig:", "mixamorig_", "mixamorig"):
        if name.startswith(p):
            return name[len(p):]
    return name


T_BY_SHORT = {short(b.name): b.name for b in tgt.data.bones}
T_REST = {b.name: b.matrix_local.copy() for b in tgt.data.bones}
T_WORLD3 = tgt.matrix_world.to_3x3().normalized()
T_ORDER = [b.name for b in tgt.data.bones]  # parent-first
for pb in tgt.pose.bones:
    pb.rotation_mode = "QUATERNION"
TGT_HIPS = T_BY_SHORT["Hips"]
tgt_hip_height = (tgt.matrix_world @ tgt.data.bones[TGT_HIPS].head_local).z
if tgt.animation_data is None:
    tgt.animation_data_create()
done = []


def bind(obj, action):
    obj.animation_data.action = action
    try:
        if getattr(action, "slots", None) is not None:
            if len(action.slots) == 0:
                action.slots.new(id_type="OBJECT", name=obj.name)
            obj.animation_data.action_slot = action.slots[0]
    except Exception as e:  # older Blender: no slots
        print("slot", e)


def retarget(src, action, clip):
    """Bake `action` (playing on rig `src`) onto the navigator as a new action called `clip`."""
    pairs = {b.name: T_BY_SHORT[short(b.name)] for b in src.data.bones if short(b.name) in T_BY_SHORT}
    s_hips = next(n for n in pairs if short(n) == "Hips")
    S_REST_W = {b.name: (src.matrix_world @ b.matrix_local).to_3x3().normalized() for b in src.data.bones}
    src_hip_rest = src.matrix_world @ src.data.bones[s_hips].head_local
    scale = tgt_hip_height / max(1e-6, src_hip_rest.z)

    bind(src, action)
    f0, f1 = int(round(action.frame_range[0])), int(round(action.frame_range[1]))
    out = bpy.data.actions.new(clip)
    out.use_fake_user = True
    bind(tgt, out)

    for f in range(f0, f1 + 1):
        scene.frame_set(f)
        vl.update()
        want = {}
        for sname, tname in pairs.items():
            spb = src.pose.bones[sname]
            s_now = (src.matrix_world @ spb.matrix).to_3x3().normalized()
            delta = s_now @ S_REST_W[sname].inverted()
            want[tname] = delta @ (T_WORLD3 @ T_REST[tname].to_3x3()).normalized()
        pose_rot = {}
        for name in T_ORDER:
            bone = tgt.data.bones[name]
            rest = T_REST[name].to_3x3()
            if bone.parent:
                inherited = pose_rot[bone.parent.name] @ T_REST[bone.parent.name].to_3x3().inverted() @ rest
            else:
                inherited = rest
            pbn = tgt.pose.bones[name]
            if name in want:
                desired = T_WORLD3.inverted() @ want[name]
                q = (inherited.inverted() @ desired).to_quaternion()
                # keep neighbouring keys on the same side of the quaternion sphere (no flips)
                prev = pbn.rotation_quaternion
                if f > f0 and prev.dot(q) < 0:
                    q.negate()
                pbn.rotation_quaternion = q
                pbn.keyframe_insert("rotation_quaternion", frame=f - f0)
                pose_rot[name] = desired
            else:
                pose_rot[name] = inherited
        sp = src.pose.bones[s_hips]
        offset_w = ((src.matrix_world @ sp.matrix.to_translation()) - src_hip_rest) * scale
        offset_arm = tgt.matrix_world.to_3x3().inverted() @ offset_w
        hp = tgt.pose.bones[TGT_HIPS]
        hp.location = T_REST[TGT_HIPS].to_3x3().inverted() @ offset_arm
        hp.keyframe_insert("location", frame=f - f0)

    done.append(clip)
    print("CLIP", clip, "frames", f1 - f0 + 1, "bones", len(pairs))


def import_source(path):
    before = set(bpy.data.objects)
    acts_before = set(bpy.data.actions)
    if path.lower().endswith(".fbx"):
        bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=False, use_anim=True)
    else:
        bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    src = next(o for o in new if o.type == "ARMATURE")
    if src.animation_data is None:
        src.animation_data_create()
    return src, new, [a for a in bpy.data.actions if a not in acts_before]


def drop(objs, actions):
    for o in objs:
        bpy.data.objects.remove(o, do_unlink=True)
    for a in actions:
        if a.name not in done:
            bpy.data.actions.remove(a)


# 1. the standing loops he already uses
src, new, acts = import_source(PREVIOUS_GLB)
for a in acts:
    base = a.name.split(".")[0]
    for want_name, clip in KEEP_FROM_PREVIOUS.items():
        if (a.name == want_name or base == want_name or a.name.startswith(want_name + "_")) and clip not in done:
            retarget(src, a, clip)
drop(new, acts)
missing = [c for c in KEEP_FROM_PREVIOUS.values() if c not in done]
if missing:
    print("WARNING previous clips not found:", missing, "available:", [a.name for a in acts])

# 2. Mixamo clips
for path in sorted(glob.glob(os.path.join(MIXAMO_DIR, "*.fbx"))):
    key = os.path.splitext(os.path.basename(path))[0]
    clip = MIXAMO.get(key)
    if not clip:
        print("SKIP", key)
        continue
    src, new, acts = import_source(path)
    action = src.animation_data.action or (acts[0] if acts else None)
    if action is None:
        print("NO ACTION", key)
    else:
        retarget(src, action, clip)
    drop(new, acts)

# every clip on its own NLA track so the exporter writes one glTF animation per clip
tgt.animation_data.action = None
for clip in done:
    act = bpy.data.actions[clip]
    track = tgt.animation_data.nla_tracks.new()
    track.name = clip
    strip = track.strips.new(clip, 0, act)
    strip.name = clip
    track.mute = True
for pb in tgt.pose.bones:
    pb.rotation_quaternion = Quaternion()
    pb.location = Vector((0, 0, 0))
scene.frame_set(0)

meshes = [o for o in bpy.data.objects if o.type == "MESH" and any(m.type == "ARMATURE" and m.object == tgt for m in o.modifiers)]
for o in bpy.data.objects:
    o.select_set(o == tgt or o in meshes)
vl.objects.active = tgt
bpy.ops.export_scene.gltf(
    filepath=OUT_GLB, export_format="GLB", use_selection=True, export_skins=True,
    export_morph=True, export_morph_normal=False, export_apply=False, export_yup=True,
    export_image_format="JPEG", export_jpeg_quality=85,
    export_animations=True, export_animation_mode="NLA_TRACKS", export_force_sampling=False,
    export_optimize_animation_size=True, export_anim_single_armature=True, export_morph_animation=False,
)
print("EXPORTED", OUT_GLB, "clips", done)
