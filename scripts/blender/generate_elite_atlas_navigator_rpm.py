import bpy
import os
import math
import mathutils

print("=== GENERATING READYPLAYER.ME SCIC ATLAS NAVIGATOR ===")

# Paths
rpm_path = os.path.abspath("public/models/characters/readyplayer.me.glb")
sec_path = os.path.abspath("public/models/characters/security_patrol.glb")
out_dir = os.path.abspath("public/models/characters")
out_glb = os.path.join(out_dir, "scic_atlas_navigator.glb")
out_blend = os.path.join(out_dir, "scic_atlas_navigator.blend")

# 1. Reset and import readyplayer.me.glb
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=rpm_path)

# Delete unnecessary Icosphere if present
ico = bpy.data.objects.get("Icosphere")
if ico:
    bpy.data.objects.remove(ico, do_unlink=True)

# Delete any existing actions
for act in list(bpy.data.actions):
    bpy.data.actions.remove(act, do_unlink=True)

# Armature & Meshes references
arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
if not arm:
    raise Exception("No Armature found in readyplayer.me.glb")

arm.name = "Navigator_Armature"

# Rename bones to mixamorig:<BoneName> convention
# This automatically updates vertex groups across all skinned clothing and accessory meshes
for b in arm.data.bones:
    b.name = "mixamorig:" + b.name

print(f"Renamed {len(arm.data.bones)} bones to mixamorig: standard.")

# 2. Import security_patrol.glb to extract motion-captured Idle action
bpy.ops.import_scene.gltf(filepath=sec_path)
sec_arm = next((o for o in bpy.data.objects if o != arm and o.type == 'ARMATURE'), None)
sec_meshes = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith("vanguard")]
raw_idle_act = bpy.data.actions.get("Idle")

if not raw_idle_act:
    raise Exception("Could not find Idle action in security_patrol.glb")

base_idle_act = raw_idle_act.copy()
base_idle_act.name = "Base_Mixamo_Idle"
base_idle_act.use_fake_user = True

# Scale Mixamo centimeter hip location to ReadyPlayerMe meter scale
for l in base_idle_act.layers:
    for strip in l.strips:
        for cb in strip.channelbags:
            for fc in cb.fcurves:
                if 'location' in fc.data_path and 'Hips' in fc.data_path:
                    for kp in fc.keyframe_points:
                        kp.co[1] *= 0.01

print("Extracted and meter-scaled base Mixamo idle action.")

# Remove security patrol objects from scene
if sec_arm:
    bpy.data.objects.remove(sec_arm, do_unlink=True)
for sm in sec_meshes:
    bpy.data.objects.remove(sm, do_unlink=True)

# 3. Create Tactical Holographic Wrist Terminal on Left Forearm
arm_forearm = arm.data.bones.get("mixamorig:LeftForeArm")
body_mesh = bpy.data.objects.get("Wolf3D_Outfit_Top") or bpy.data.objects.get("Wolf3D_Body")

bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0,0,0))
terminal = bpy.context.active_object
terminal.name = "SCIC_Wrist_Terminal"
terminal.scale = (0.045, 0.065, 0.014)
bpy.ops.object.transform_apply(scale=True)

# PBR material for terminal
mat_term = bpy.data.materials.new(name="Terminal_Body")
mat_term.use_nodes = True
bsdf = mat_term.node_tree.nodes.get("Principled BSDF")
if bsdf:
    if "Base Color" in bsdf.inputs:
        bsdf.inputs["Base Color"].default_value = (0.04, 0.06, 0.10, 1.0) # Dark carbon
    if "Roughness" in bsdf.inputs:
        bsdf.inputs["Roughness"].default_value = 0.25
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0.85
    if "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (0.0, 0.85, 1.0, 1.0)
    if "Emission Strength" in bsdf.inputs:
        bsdf.inputs["Emission Strength"].default_value = 2.0

terminal.data.materials.append(mat_term)

# Assign terminal to mixamorig:LeftForeArm bone
vg = terminal.vertex_groups.new(name="mixamorig:LeftForeArm")
verts = [v.index for v in terminal.data.vertices]
vg.add(verts, 1.0, 'REPLACE')

if arm_forearm:
    # Outer wrist location
    terminal.location = arm_forearm.head_local + (arm_forearm.vector * 0.72) + mathutils.Vector((0.025, -0.02, 0.02))

terminal_mod = terminal.modifiers.new(name="Armature", type='ARMATURE')
terminal_mod.object = arm
terminal.parent = arm

print("Tactical holographic wrist terminal created.")

# 4. Generate the 9 Full NPC Animations on the Armature
arm.animation_data_create()
pbones = arm.pose.bones

def copy_or_create_action(name):
    new_act = base_idle_act.copy()
    new_act.name = name
    new_act.use_fake_user = True
    return new_act

# ACTION 1: Navigator_Idle
act_idle = copy_or_create_action("Navigator_Idle")
arm.animation_data.action = act_idle
if hasattr(act_idle, 'slots') and len(act_idle.slots) > 0:
    arm.animation_data.action_slot = act_idle.slots[0]

# Helper to add rotation offsets to pose bones across frames
def add_bone_rotation_key(bone_name, euler_delta, frame):
    pb = pbones.get(bone_name)
    if not pb:
        return
    q_orig = pb.rotation_quaternion.copy()
    q_delta = mathutils.Euler(euler_delta, 'XYZ').to_quaternion()
    pb.rotation_quaternion = q_orig @ q_delta
    pb.keyframe_insert(data_path="rotation_quaternion", frame=frame)
    pb.rotation_quaternion = q_orig

# Helper to set bone quaternion relative to rest
def set_bone_euler(bone_name, euler_vals, frame):
    pb = pbones.get(bone_name)
    if not pb:
        return
    pb.rotation_quaternion = mathutils.Euler(euler_vals, 'XYZ').to_quaternion()
    pb.keyframe_insert(data_path="rotation_quaternion", frame=frame)

# ACTION 2: Navigator_Listening (Forward attention lean, head facing user)
act_listening = copy_or_create_action("Navigator_Listening")
arm.animation_data.action = act_listening
if hasattr(act_listening, 'slots') and len(act_listening.slots) > 0:
    arm.animation_data.action_slot = act_listening.slots[0]
for f in [1, 30, 60]:
    add_bone_rotation_key("mixamorig:Spine1", (math.radians(4), 0, 0), f)
    add_bone_rotation_key("mixamorig:Spine2", (math.radians(3), 0, 0), f)
    add_bone_rotation_key("mixamorig:Head", (math.radians(-4), 0, 0), f)

# ACTION 3: Navigator_Thinking (Thoughtful posture, checking wrist terminal)
act_thinking = copy_or_create_action("Navigator_Thinking")
arm.animation_data.action = act_thinking
if hasattr(act_thinking, 'slots') and len(act_thinking.slots) > 0:
    arm.animation_data.action_slot = act_thinking.slots[0]
for f in [1, 30, 60]:
    # Left arm up towards chest/wrist
    add_bone_rotation_key("mixamorig:LeftArm", (math.radians(-25), math.radians(20), math.radians(30)), f)
    add_bone_rotation_key("mixamorig:LeftForeArm", (math.radians(-65), 0, math.radians(30)), f)
    # Head tilted down-left toward wrist
    add_bone_rotation_key("mixamorig:Head", (math.radians(10), math.radians(-10), math.radians(5)), f)

# ACTION 4: Navigator_Searching (Holographic console manipulation)
act_searching = copy_or_create_action("Navigator_Searching")
arm.animation_data.action = act_searching
if hasattr(act_searching, 'slots') and len(act_searching.slots) > 0:
    arm.animation_data.action_slot = act_searching.slots[0]
for f in [1, 30, 60]:
    add_bone_rotation_key("mixamorig:RightArm", (math.radians(-30), math.radians(-15), math.radians(-25)), f)
    add_bone_rotation_key("mixamorig:RightForeArm", (math.radians(-50), 0, math.radians(-20)), f)
    add_bone_rotation_key("mixamorig:LeftArm", (math.radians(-20), math.radians(10), math.radians(20)), f)
    add_bone_rotation_key("mixamorig:LeftForeArm", (math.radians(-40), 0, math.radians(15)), f)

# Add tactile finger/hand scanning cadence on right hand
for f, rot in [(1, -5), (15, 5), (30, -5), (45, 5), (60, -5)]:
    add_bone_rotation_key("mixamorig:RightHand", (math.radians(rot), 0, math.radians(rot * 0.5)), f)

# ACTION 5: Navigator_Navigating (Directional gesture pointing toward map)
act_navigating = copy_or_create_action("Navigator_Navigating")
arm.animation_data.action = act_navigating
if hasattr(act_navigating, 'slots') and len(act_navigating.slots) > 0:
    arm.animation_data.action_slot = act_navigating.slots[0]
for f in [1, 30, 60]:
    add_bone_rotation_key("mixamorig:RightArm", (math.radians(-45), math.radians(-25), math.radians(-35)), f)
    add_bone_rotation_key("mixamorig:RightForeArm", (math.radians(-25), 0, math.radians(-15)), f)
    add_bone_rotation_key("mixamorig:RightHand", (0, math.radians(15), 0), f)
    add_bone_rotation_key("mixamorig:Head", (0, math.radians(12), 0), f)

# ACTION 6: Navigator_Speaking (Expressive communicative cadence)
act_speaking = copy_or_create_action("Navigator_Speaking")
arm.animation_data.action = act_speaking
if hasattr(act_speaking, 'slots') and len(act_speaking.slots) > 0:
    arm.animation_data.action_slot = act_speaking.slots[0]
for f, pitch in [(1, 0), (12, 4), (24, -3), (36, 5), (48, -2), (60, 0)]:
    add_bone_rotation_key("mixamorig:Head", (math.radians(pitch), math.radians(pitch * 0.5), 0), f)
    add_bone_rotation_key("mixamorig:RightForeArm", (math.radians(-20 + pitch * 2), 0, 0), f)

# ACTION 7: Navigator_Success (Affirmative crisp double nod, confirmation stance)
act_success = copy_or_create_action("Navigator_Success")
arm.animation_data.action = act_success
if hasattr(act_success, 'slots') and len(act_success.slots) > 0:
    arm.animation_data.action_slot = act_success.slots[0]
for f, nod in [(1, 0), (12, 12), (22, 0), (32, 10), (44, 0), (60, 0)]:
    add_bone_rotation_key("mixamorig:Head", (math.radians(nod), 0, 0), f)
    add_bone_rotation_key("mixamorig:Neck", (math.radians(nod * 0.4), 0, 0), f)

# ACTION 8: Navigator_Error (Puzzled subtle head tilt and shrug)
act_error = copy_or_create_action("Navigator_Error")
arm.animation_data.action = act_error
if hasattr(act_error, 'slots') and len(act_error.slots) > 0:
    arm.animation_data.action_slot = act_error.slots[0]
for f, tilt in [(1, 0), (20, 10), (40, 10), (60, 0)]:
    add_bone_rotation_key("mixamorig:Head", (math.radians(4), math.radians(-tilt * 0.5), math.radians(tilt)), f)
    add_bone_rotation_key("mixamorig:LeftShoulder", (0, 0, math.radians(tilt * 0.4)), f)
    add_bone_rotation_key("mixamorig:RightShoulder", (0, 0, math.radians(-tilt * 0.4)), f)

# ACTION 9: Navigator_Wave (Polite gentlemanly greeting wave)
act_wave = copy_or_create_action("Navigator_Wave")
arm.animation_data.action = act_wave
if hasattr(act_wave, 'slots') and len(act_wave.slots) > 0:
    arm.animation_data.action_slot = act_wave.slots[0]
# Right arm up in greeting position
for f in [1, 15, 30, 45, 60]:
    add_bone_rotation_key("mixamorig:RightArm", (math.radians(-70), math.radians(-20), math.radians(-45)), f)
    add_bone_rotation_key("mixamorig:RightForeArm", (math.radians(-70), 0, 0), f)
# Hand waving left to right
for f, wave_ang in [(1, 0), (15, 20), (30, -20), (45, 20), (60, 0)]:
    add_bone_rotation_key("mixamorig:RightHand", (0, math.radians(wave_ang), math.radians(wave_ang)), f)

# Set active default action
arm.animation_data.action = act_idle
if hasattr(act_idle, 'slots') and len(act_idle.slots) > 0:
    arm.animation_data.action_slot = act_idle.slots[0]

# 5. Save .blend and Export to public/models/characters/scic_atlas_navigator.glb
bpy.ops.wm.save_as_mainfile(filepath=out_blend)
print(f"Saved {out_blend}")

bpy.ops.export_scene.gltf(
    filepath=out_glb,
    export_format='GLB',
    use_selection=False,
    export_animations=True,
    export_apply=False
)

print(f"Exported {out_glb}: {os.path.getsize(out_glb)} bytes")
print("=== GENERATION OF READYPLAYER.ME ATLAS NAVIGATOR COMPLETE ===")
