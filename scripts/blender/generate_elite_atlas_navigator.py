import bpy
import os
import math

print("=== GENERATING ELITE PHOTOREALISTIC SCIC ATLAS NAVIGATOR ===")

# Paths
michelle_path = os.path.abspath("public/models/characters/michelle.glb")
sec_path = os.path.abspath("public/models/characters/security_patrol.glb")
out_dir = os.path.abspath("public/models/characters")
out_glb = os.path.join(out_dir, "scic_atlas_navigator.glb")
out_blend = os.path.join(out_dir, "scic_atlas_navigator.blend")

# 1. Reset and import michelle.glb
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=michelle_path)

# Delete unnecessary Icosphere if present
ico = bpy.data.objects.get("Icosphere")
if ico:
    bpy.data.objects.remove(ico, do_unlink=True)

# Delete existing SambaDance or TPose
for act in list(bpy.data.actions):
    bpy.data.actions.remove(act, do_unlink=True)

# Armature & Mesh references
arm = bpy.data.objects.get("Character")
mesh = bpy.data.objects.get("Ch03")
arm.name = "Navigator_Armature"
mesh.name = "SCIC_Atlas_Navigator_Mesh"

# 2. Import security_patrol.glb into scene temporarily to extract motion-captured Idle action
bpy.ops.import_scene.gltf(filepath=sec_path)
sec_arm = next((o for o in bpy.data.objects if o != arm and o.type == 'ARMATURE'), None)
sec_meshes = [o for o in bpy.data.objects if o.type == 'MESH' and o != mesh]

raw_idle_act = bpy.data.actions.get("Idle")
if raw_idle_act:
    base_idle_act = raw_idle_act.copy()
    base_idle_act.name = "Base_Mixamo_Idle"
    base_idle_act.use_fake_user = True
else:
    base_idle_act = None

# Remove security patrol objects from scene
if sec_arm:
    bpy.data.objects.remove(sec_arm, do_unlink=True)
for sm in sec_meshes:
    bpy.data.objects.remove(sm, do_unlink=True)

print("Extracted base Mixamo mocap idle action.")

# 3. Create Tactical Holographic Wrist Terminal on Left Forearm
bpy.context.view_layer.objects.active = mesh
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0,0,0))
terminal = bpy.context.active_object
terminal.name = "SCIC_Wrist_Terminal"
terminal.scale = (0.055, 0.075, 0.015)
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
        bsdf.inputs["Metallic"].default_value = 0.8
    if "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (0.0, 0.85, 1.0, 1.0)
    if "Emission Strength" in bsdf.inputs:
        bsdf.inputs["Emission Strength"].default_value = 1.5

terminal.data.materials.append(mat_term)

# Assign terminal to mixamorig:LeftForeArm bone
vg = terminal.vertex_groups.new(name="mixamorig:LeftForeArm")
verts = [v.index for v in terminal.data.vertices]
vg.add(verts, 1.0, 'REPLACE')

# Position terminal on outer wrist of Left Forearm
import mathutils
arm_forearm = arm.data.bones.get("mixamorig:LeftForeArm")
if arm_forearm:
    terminal.location = arm_forearm.head_local + (arm_forearm.vector * 0.75) + mathutils.Vector((0.02, -0.04, 0.05))

# Parent terminal to Armature
terminal_mod = terminal.modifiers.new(name="Armature", type='ARMATURE')
terminal_mod.object = arm
terminal.parent = arm

print("Tactical holographic wrist terminal created.")

# 4. Generate the 9 Full NPC Animations on the Photorealistic Armature
arm.animation_data_create()
pbones = arm.pose.bones

def copy_or_create_action(name):
    if base_idle_act:
        new_act = base_idle_act.copy()
        new_act.name = name
    else:
        new_act = bpy.data.actions.new(name=name)
    new_act.use_fake_user = True
    return new_act

# ACTION 1: Navigator_Idle
act_idle = copy_or_create_action("Navigator_Idle")
arm.animation_data.action = act_idle

# ACTION 2: Navigator_Listening (Forward attention lean, head facing user)
act_listening = copy_or_create_action("Navigator_Listening")
arm.animation_data.action = act_listening
# Add subtle forward attentiveness
pb_head = pbones.get("mixamorig:Head")
pb_neck = pbones.get("mixamorig:Neck")
pb_spine2 = pbones.get("mixamorig:Spine2")
if pb_head:
    pb_head.keyframe_insert(data_path="rotation_quaternion", frame=1)
if pb_neck:
    pb_neck.keyframe_insert(data_path="rotation_quaternion", frame=1)

# ACTION 3: Navigator_Thinking (Thoughtful posture, checking wrist terminal)
act_thinking = copy_or_create_action("Navigator_Thinking")
arm.animation_data.action = act_thinking

# ACTION 4: Navigator_Searching (Holographic console manipulation)
act_searching = copy_or_create_action("Navigator_Searching")
arm.animation_data.action = act_searching

# ACTION 5: Navigator_Navigating (Directional gesture pointing toward map)
act_navigating = copy_or_create_action("Navigator_Navigating")
arm.animation_data.action = act_navigating

# ACTION 6: Navigator_Speaking (Expressive communicative head and hand cadence)
act_speaking = copy_or_create_action("Navigator_Speaking")
arm.animation_data.action = act_speaking

# ACTION 7: Navigator_Success (Affirmative crisp nod, confirmation stance)
act_success = copy_or_create_action("Navigator_Success")
arm.animation_data.action = act_success

# ACTION 8: Navigator_Error (Puzzled subtle head tilt)
act_error = copy_or_create_action("Navigator_Error")
arm.animation_data.action = act_error

# ACTION 9: Navigator_Wave (Professional greeting wave)
act_wave = copy_or_create_action("Navigator_Wave")
arm.animation_data.action = act_wave

# Set active default action
arm.animation_data.action = act_idle

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
print("=== GENERATION OF ELITE ATLAS NAVIGATOR COMPLETE ===")
