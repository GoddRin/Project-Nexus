import bpy
import math
import mathutils
import os

print("=== BUILDING SCIC ATLAS-1 VANGUARD NAVIGATOR ===")

sec_path = os.path.abspath("public/models/characters/security_patrol.glb")
out_dir = os.path.abspath("public/models/characters")
out_glb = os.path.join(out_dir, "scic_atlas_navigator.glb")
out_blend = os.path.join(out_dir, "scic_atlas_navigator.blend")

# 1. Reset and Import security_patrol.glb
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=sec_path)

arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
if not arm:
    raise Exception("No Armature found in security_patrol.glb")

arm.name = "Navigator_Armature"

# 2. Materials Tuning for SCIC Livery
# 2A. Body Material
mat_body = bpy.data.materials.get("VanguardBodyMat")
if mat_body:
    bsdf = mat_body.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = 0.35
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = 0.32

# 2B. Visor Material - Bright Glowing SCIC Cyan HUD
mat_visor = bpy.data.materials.get("Vanguard_VisorMat")
if mat_visor:
    bsdf = mat_visor.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = (0.0, 0.92, 1.0, 1.0)
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (0.0, 0.95, 1.0, 1.0)
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = 4.5
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = 0.05
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = 0.85

# 3. Add Central SCIC Arc Reactor / Telemetry Core on Chest (Attached to mixamorig:Spine2)
spine2_bone = arm.data.bones.get("mixamorig:Spine2")

# Create Core Disc
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.045, depth=0.02, location=(0, 0, 0))
core = bpy.context.active_object
core.name = "SCIC_Chest_Arc_Core"
for poly in core.data.polygons:
    poly.use_smooth = True

mat_core = bpy.data.materials.new(name="SCIC_Reactor_Core")
mat_core.use_nodes = True
c_bsdf = mat_core.node_tree.nodes.get("Principled BSDF")
if c_bsdf:
    c_bsdf.inputs["Base Color"].default_value = (0.0, 0.95, 1.0, 1.0)
    c_bsdf.inputs["Emission Color"].default_value = (0.0, 0.95, 1.0, 1.0)
    c_bsdf.inputs["Emission Strength"].default_value = 4.0
core.data.materials.append(mat_core)

# Bevel Bezel
bev = core.modifiers.new(name="Bevel", type='BEVEL')
bev.width = 0.005
bev.segments = 2

# Position core at sternum of chest plate
# In Vanguard, chest center is around Y = 0.16 (front), Z = 1.34
core.location = (0, 0.165, 1.34)
core.rotation_euler = (math.radians(-90), 0, 0)
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

# Assign to mixamorig:Spine2
vg_core = core.vertex_groups.new(name="mixamorig:Spine2")
verts = [v.index for v in core.data.vertices]
vg_core.add(verts, 1.0, 'REPLACE')

mod_core = core.modifiers.new(name="Armature", type='ARMATURE')
mod_core.object = arm
core.parent = arm

print("Added SCIC Chest Arc Reactor Core.")

# 4. Add Tactical Holographic Wrist Terminal on Left Forearm
arm_forearm = arm.data.bones.get("mixamorig:LeftForeArm")
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
terminal = bpy.context.active_object
terminal.name = "SCIC_Wrist_Terminal"
terminal.scale = (0.045, 0.065, 0.015)
bpy.ops.object.transform_apply(scale=True)
for poly in terminal.data.polygons:
    poly.use_smooth = True

mat_term = bpy.data.materials.new(name="SCIC_Terminal_Mat")
mat_term.use_nodes = True
t_bsdf = mat_term.node_tree.nodes.get("Principled BSDF")
if t_bsdf:
    t_bsdf.inputs["Base Color"].default_value = (0.05, 0.08, 0.12, 1.0)
    t_bsdf.inputs["Roughness"].default_value = 0.2
    t_bsdf.inputs["Metallic"].default_value = 0.8
    t_bsdf.inputs["Emission Color"].default_value = (0.0, 0.95, 1.0, 1.0)
    t_bsdf.inputs["Emission Strength"].default_value = 2.0
terminal.data.materials.append(mat_term)

if arm_forearm:
    terminal.location = arm_forearm.head_local + (arm_forearm.vector * 0.70) + mathutils.Vector((0.025, 0.02, 0.01))

vg_term = terminal.vertex_groups.new(name="mixamorig:LeftForeArm")
verts_term = [v.index for v in terminal.data.vertices]
vg_term.add(verts_term, 1.0, 'REPLACE')

mod_term = terminal.modifiers.new(name="Armature", type='ARMATURE')
mod_term.object = arm
terminal.parent = arm

print("Added Tactical Holographic Wrist Terminal.")

# 5. Extract and Duplicate Native Mixamo Idle Action for Base
raw_idle = bpy.data.actions.get("Idle")
if not raw_idle:
    raise Exception("Could not find Idle action in security_patrol.glb")

base_idle = raw_idle.copy()
base_idle.name = "Base_Vanguard_Idle"
base_idle.use_fake_user = True

# Helper to duplicate base action
def copy_action(name):
    act = base_idle.copy()
    act.name = name
    act.use_fake_user = True
    return act

# Helper to add rotation offsets to pose bones across frames
pbones = arm.pose.bones

def add_bone_rotation_key(bone_name, euler_delta, frame):
    pb = pbones.get(bone_name)
    if not pb:
        return
    q_orig = pb.rotation_quaternion.copy()
    q_delta = mathutils.Euler(euler_delta, 'XYZ').to_quaternion()
    pb.rotation_quaternion = q_orig @ q_delta
    pb.keyframe_insert(data_path="rotation_quaternion", frame=frame)
    pb.rotation_quaternion = q_orig

# ACTION 1: Navigator_Idle (Clean, authoritative stance)
act_idle = copy_action("Navigator_Idle")
arm.animation_data.action = act_idle
if hasattr(act_idle, 'slots') and len(act_idle.slots) > 0:
    arm.animation_data.action_slot = act_idle.slots[0]

# ACTION 2: Navigator_Listening (Forward attention lean, head facing user)
act_listening = copy_action("Navigator_Listening")
arm.animation_data.action = act_listening
if hasattr(act_listening, 'slots') and len(act_listening.slots) > 0:
    arm.animation_data.action_slot = act_listening.slots[0]
for f in [1, 30, 60]:
    add_bone_rotation_key("mixamorig:Spine1", (math.radians(-4), 0, 0), f)
    add_bone_rotation_key("mixamorig:Spine2", (math.radians(-3), 0, 0), f)
    add_bone_rotation_key("mixamorig:Head", (math.radians(4), 0, 0), f)

# ACTION 3: Navigator_Thinking (Left forearm raised to inspect tactical wrist console)
act_thinking = copy_action("Navigator_Thinking")
arm.animation_data.action = act_thinking
if hasattr(act_thinking, 'slots') and len(act_thinking.slots) > 0:
    arm.animation_data.action_slot = act_thinking.slots[0]
for f in [1, 30, 60]:
    add_bone_rotation_key("mixamorig:LeftArm", (math.radians(25), math.radians(-20), math.radians(-30)), f)
    add_bone_rotation_key("mixamorig:LeftForeArm", (math.radians(65), 0, math.radians(-30)), f)
    add_bone_rotation_key("mixamorig:Head", (math.radians(-10), math.radians(10), math.radians(-5)), f)

# ACTION 4: Navigator_Searching (Right arm projecting forward in scanning gesture)
act_searching = copy_action("Navigator_Searching")
arm.animation_data.action = act_searching
if hasattr(act_searching, 'slots') and len(act_searching.slots) > 0:
    arm.animation_data.action_slot = act_searching.slots[0]
for f in [1, 30, 60]:
    add_bone_rotation_key("mixamorig:RightArm", (math.radians(30), math.radians(15), math.radians(25)), f)
    add_bone_rotation_key("mixamorig:RightForeArm", (math.radians(50), 0, math.radians(20)), f)
    add_bone_rotation_key("mixamorig:LeftArm", (math.radians(20), math.radians(-10), math.radians(-20)), f)
    add_bone_rotation_key("mixamorig:LeftForeArm", (math.radians(40), 0, math.radians(-15)), f)

# ACTION 5: Navigator_Navigating (Authoritative directional vector gesture toward map)
act_navigating = copy_action("Navigator_Navigating")
arm.animation_data.action = act_navigating
if hasattr(act_navigating, 'slots') and len(act_navigating.slots) > 0:
    arm.animation_data.action_slot = act_navigating.slots[0]
for f in [1, 30, 60]:
    add_bone_rotation_key("mixamorig:RightArm", (math.radians(45), math.radians(25), math.radians(35)), f)
    add_bone_rotation_key("mixamorig:RightForeArm", (math.radians(25), 0, math.radians(15)), f)
    add_bone_rotation_key("mixamorig:RightHand", (0, math.radians(-15), 0), f)
    add_bone_rotation_key("mixamorig:Head", (0, math.radians(-12), 0), f)

# ACTION 6: Navigator_Speaking (Communicative cadence)
act_speaking = copy_action("Navigator_Speaking")
arm.animation_data.action = act_speaking
if hasattr(act_speaking, 'slots') and len(act_speaking.slots) > 0:
    arm.animation_data.action_slot = act_speaking.slots[0]
for f, pitch in [(1, 0), (12, 4), (24, -3), (36, 5), (48, -2), (60, 0)]:
    add_bone_rotation_key("mixamorig:Head", (math.radians(-pitch), math.radians(-pitch * 0.5), 0), f)
    add_bone_rotation_key("mixamorig:RightForeArm", (math.radians(20 - pitch * 2), 0, 0), f)

# ACTION 7: Navigator_Success (Affirmative crisp double nod, chest core flashes)
act_success = copy_action("Navigator_Success")
arm.animation_data.action = act_success
if hasattr(act_success, 'slots') and len(act_success.slots) > 0:
    arm.animation_data.action_slot = act_success.slots[0]
for f, nod in [(1, 0), (12, 12), (22, 0), (32, 10), (44, 0), (60, 0)]:
    add_bone_rotation_key("mixamorig:Head", (math.radians(-nod), 0, 0), f)
    add_bone_rotation_key("mixamorig:Neck", (math.radians(-nod * 0.4), 0, 0), f)

# ACTION 8: Navigator_Error (Subtle puzzled diagnostic tilt)
act_error = copy_action("Navigator_Error")
arm.animation_data.action = act_error
if hasattr(act_error, 'slots') and len(act_error.slots) > 0:
    arm.animation_data.action_slot = act_error.slots[0]
for f, tilt in [(1, 0), (20, 10), (40, 10), (60, 0)]:
    add_bone_rotation_key("mixamorig:Head", (math.radians(-4), math.radians(tilt * 0.5), math.radians(-tilt)), f)
    add_bone_rotation_key("mixamorig:LeftShoulder", (0, 0, math.radians(-tilt * 0.4)), f)
    add_bone_rotation_key("mixamorig:RightShoulder", (0, 0, math.radians(tilt * 0.4)), f)

# ACTION 9: Navigator_Wave (Professional, confident military/engineering wave)
act_wave = copy_action("Navigator_Wave")
arm.animation_data.action = act_wave
if hasattr(act_wave, 'slots') and len(act_wave.slots) > 0:
    arm.animation_data.action_slot = act_wave.slots[0]
for f in [1, 15, 30, 45, 60]:
    add_bone_rotation_key("mixamorig:RightArm", (math.radians(70), math.radians(20), math.radians(45)), f)
    add_bone_rotation_key("mixamorig:RightForeArm", (math.radians(70), 0, 0), f)
for f, wave_ang in [(1, 0), (15, 20), (30, -20), (45, 20), (60, 0)]:
    add_bone_rotation_key("mixamorig:RightHand", (0, math.radians(-wave_ang), math.radians(-wave_ang)), f)

# Set default active action to Navigator_Idle
arm.animation_data.action = act_idle
if hasattr(act_idle, 'slots') and len(act_idle.slots) > 0:
    arm.animation_data.action_slot = act_idle.slots[0]

# 6. Save .blend and Export Optimized GLB
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
print("=== SCIC ATLAS-1 VANGUARD NAVIGATOR BUILD COMPLETE ===")
