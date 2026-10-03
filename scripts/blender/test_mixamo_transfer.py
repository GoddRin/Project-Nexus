import bpy
import os

bpy.ops.wm.read_factory_settings(use_empty=True)

# 1. Import security_patrol.glb to extract Idle action
sec_path = os.path.abspath("public/models/characters/security_patrol.glb")
bpy.ops.import_scene.gltf(filepath=sec_path)
idle_act = bpy.data.actions.get("Idle")
if idle_act:
    idle_act.name = "Navigator_Idle"
    idle_act.use_fake_user = True

# 2. Clear scene and import michelle.glb
bpy.ops.wm.read_factory_settings(use_empty=True)
# Bring back idle_act or import both into same scene
michelle_path = os.path.abspath("public/models/characters/michelle.glb")
bpy.ops.import_scene.gltf(filepath=michelle_path)
bpy.ops.import_scene.gltf(filepath=sec_path)

# Michelle armature
michelle_arm = bpy.data.objects.get("Character")
# Security patrol action
idle_act = bpy.data.actions.get("Idle")

if michelle_arm and idle_act:
    michelle_arm.animation_data.action = idle_act
    print("SUCCESS! Applied security patrol Idle action onto michelle.glb Character armature!")
