import bpy
import os
import math

bpy.ops.wm.read_factory_settings(use_empty=True)
michelle_path = os.path.abspath("public/models/characters/michelle.glb")
bpy.ops.import_scene.gltf(filepath=michelle_path)

arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
pbones = arm.pose.bones

# Create new action
act = bpy.data.actions.new(name="Navigator_TestIdle")
arm.animation_data.action = act

pb_head = pbones.get("mixamorig:Head")
if pb_head:
    pb_head.rotation_mode = 'XYZ'
    pb_head.rotation_euler = (0, 0, 0)
    pb_head.keyframe_insert(data_path="rotation_euler", frame=1)
    pb_head.rotation_euler = (math.radians(5), 0, 0)
    pb_head.keyframe_insert(data_path="rotation_euler", frame=30)
    pb_head.rotation_euler = (0, 0, 0)
    pb_head.keyframe_insert(data_path="rotation_euler", frame=60)
    print("SUCCESS: Inserted keyframes on mixamorig:Head")

test_glb = os.path.abspath("public/models/characters/test_export.glb")
bpy.ops.export_scene.gltf(filepath=test_glb, export_format='GLB', export_animations=True)
print("Exported test GLB size:", os.path.getsize(test_glb))
if os.path.exists(test_glb):
    os.remove(test_glb)
