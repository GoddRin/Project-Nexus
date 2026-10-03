"""Retarget Mesh2Motion (Quaternius, CC0) body animations onto the Atlas Navigator and export a GLB.

  blender -b scripts/blender/source/scic_atlas_navigator_pro_v3.blend \
      --python scripts/blender/retarget_m2m_animations.py -- <out.glb> <anim1.glb> [<anim2.glb> ...]

Both skeletons rest in a T-pose, so each bone's motion is transferred as a world-space rotation
relative to its rest pose (no dependence on how either rig's bones are rolled). Hips translation
is scaled by the ratio of hip heights. Clips are written as separate glTF animations.
"""
import bpy, sys, math
from mathutils import Matrix, Quaternion, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
OUT_GLB, SOURCES = argv[0], argv[1:]

# source action name -> clip name in the exported GLB
CLIPS = {
    "Idle_Subtle": "idleSubtle",     # default standing loop
    "Idle_FoldArms": "foldArms",     # long-idle variation
    "Idle Listening": "listen",
    "Idle_Talking": "talk",
    "Greeting": "greet",
    "Head Nod": "nod",
    "Yes": "yes",
    "Reject": "reject",
    "Confused": "confused",
    "Victory Fist Pump": "fistPump",
    "Interact": "interact",
    "Chest_Open": "stretch",
}
# Not used: "Salute" (one frame reads as a straight-arm salute), "Idle_A" (a fighting-ready stance).

MAP = {
    "pelvis": "Hips", "spine_01": "Spine", "spine_02": "Spine1", "spine_03": "Spine2", "neck_01": "Neck", "head": "Head",
    "thigh_l": "LeftUpLeg", "calf_l": "LeftLeg", "foot_l": "LeftFoot", "ball_l": "LeftToeBase",
    "thigh_r": "RightUpLeg", "calf_r": "RightLeg", "foot_r": "RightFoot", "ball_r": "RightToeBase",
}
for s, S in (("l", "Left"), ("r", "Right")):
    MAP.update({f"clavicle_{s}": f"{S}Shoulder", f"upperarm_{s}": f"{S}Arm", f"lowerarm_{s}": f"{S}ForeArm", f"hand_{s}": f"{S}Hand"})
    for f, F in (("index", "Index"), ("middle", "Middle"), ("ring", "Ring"), ("pinky", "Pinky"), ("thumb", "Thumb")):
        for j in (1, 2, 3):
            MAP[f"{f}_0{j}_{s}"] = f"{S}Hand{F}{j}"

tgt = next(o for o in bpy.data.objects if o.type == "ARMATURE")
scene = bpy.context.scene
vl = bpy.context.view_layer


def tbone(name):
    for n in (name, f"mixamorig:{name}", f"mixamorig_{name}"):
        if n in tgt.data.bones:
            return n
    return None


pairs = {s: tbone(t) for s, t in MAP.items() if tbone(t)}
print("MAPPED", len(pairs), "of", len(MAP))

# target rest data (armature space)
T_REST = {b.name: b.matrix_local.copy() for b in tgt.data.bones}
T_WORLD3 = tgt.matrix_world.to_3x3().normalized()
T_ORDER = [b.name for b in tgt.data.bones]  # parent-first
for pb in tgt.pose.bones:
    pb.rotation_mode = "QUATERNION"
tgt_hips = tbone("Hips")
tgt_hip_height = (tgt.matrix_world @ tgt.data.bones[tgt_hips].head_local).z

if tgt.animation_data is None:
    tgt.animation_data_create()
done = []

for src_file in SOURCES:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=src_file)
    new = [o for o in bpy.data.objects if o not in before]
    src = next(o for o in new if o.type == "ARMATURE")
    S_WORLD3 = src.matrix_world.to_3x3().normalized()
    S_REST_W = {b.name: (src.matrix_world @ b.matrix_local).to_3x3().normalized() for b in src.data.bones}
    src_hip_rest = src.matrix_world @ src.data.bones["pelvis"].head_local
    scale = tgt_hip_height / max(1e-6, src_hip_rest.z)
    if src.animation_data is None:
        src.animation_data_create()

    for action in list(bpy.data.actions):
        clip = CLIPS.get(action.name)
        if not clip or clip in done:
            continue
        # play this action on the source rig
        src.animation_data.action = action
        try:
            if getattr(action, "slots", None) and len(action.slots):
                src.animation_data.action_slot = action.slots[0]
        except Exception:
            pass
        f0, f1 = int(action.frame_range[0]), int(round(action.frame_range[1]))

        out = bpy.data.actions.new(clip)
        out.use_fake_user = True
        tgt.animation_data.action = out
        try:
            if getattr(out, "slots", None) is not None and len(out.slots) == 0:
                slot = out.slots.new(id_type="OBJECT", name=tgt.name)
                tgt.animation_data.action_slot = slot
        except Exception:
            pass

        for f in range(f0, f1 + 1):
            scene.frame_set(f)
            vl.update()
            # desired world rotations for mapped target bones
            want = {}
            for sname, tname in pairs.items():
                spb = src.pose.bones.get(sname)
                if spb is None:
                    continue
                s_now = (src.matrix_world @ spb.matrix).to_3x3().normalized()
                delta = s_now @ S_REST_W[sname].inverted()
                t_rest_w = (T_WORLD3 @ T_REST[tname].to_3x3()).normalized()
                want[tname] = delta @ t_rest_w
            # walk the target skeleton parent-first, solving each bone's local rotation
            pose_rot = {}  # armature-space rotation of every target bone this frame
            for name in T_ORDER:
                bone = tgt.data.bones[name]
                rest = T_REST[name].to_3x3()
                if bone.parent:
                    pr = pose_rot[bone.parent.name]
                    inherited = pr @ T_REST[bone.parent.name].to_3x3().inverted() @ rest
                else:
                    inherited = rest
                pbn = tgt.pose.bones[name]
                if name in want:
                    desired_arm = T_WORLD3.inverted() @ want[name]
                    basis = inherited.inverted() @ desired_arm
                    pbn.rotation_quaternion = basis.to_quaternion()
                    pbn.keyframe_insert("rotation_quaternion", frame=f - f0)
                    pose_rot[name] = desired_arm
                else:
                    pose_rot[name] = inherited
            # hips translation (scaled), expressed in the hips bone's rest frame
            sp = src.pose.bones["pelvis"]
            s_pos = src.matrix_world @ sp.matrix.to_translation()
            offset_w = (s_pos - src_hip_rest) * scale
            hb = tgt.data.bones[tgt_hips]
            offset_arm = tgt.matrix_world.to_3x3().inverted() @ offset_w
            hp = tgt.pose.bones[tgt_hips]
            hp.location = T_REST[tgt_hips].to_3x3().inverted() @ offset_arm
            hp.keyframe_insert("location", frame=f - f0)

        done.append(clip)
        print("CLIP", clip, "frames", f1 - f0 + 1)

    # drop the imported source rig before the next file
    for o in new:
        bpy.data.objects.remove(o, do_unlink=True)

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
scene.render.fps = 24

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
