import bpy
import os
import math

bpy.ops.wm.read_factory_settings(use_empty=True)
michelle_path = os.path.abspath("public/models/characters/michelle.glb")
bpy.ops.import_scene.gltf(filepath=michelle_path)

arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)

# Clean up old unused actions (SambaDance, TPose)
for act in list(bpy.data.actions):
    bpy.data.actions.remove(act)

pbones = arm.pose.bones

# Set all bones to XYZ Euler for clean predictable rotational maths
for bname in ["mixamorig:LeftArm", "mixamorig:LeftForeArm", "mixamorig:RightArm", "mixamorig:RightForeArm"]:
    b = arm.data.bones.get(bname)
    if b:
        print(f"{bname}: head={b.head_local}, tail={b.tail_local}, vector={b.vector}")
