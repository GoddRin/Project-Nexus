import bpy
import os

bpy.ops.wm.read_factory_settings(use_empty=True)
michelle_path = os.path.abspath("public/models/characters/michelle.glb")
bpy.ops.import_scene.gltf(filepath=michelle_path)

arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
print(f"Armature: {arm.name}")

pbones = arm.pose.bones
print(f"Pose bones count: {len(pbones)}")

# Check rest pose of LeftArm and RightArm
for bname in ["mixamorig:LeftArm", "mixamorig:RightArm", "mixamorig:Head", "mixamorig:Spine"]:
    pb = pbones.get(bname)
    if pb:
        print(f"Bone {bname} rotation_mode: {pb.rotation_mode}, rot: {pb.rotation_quaternion}")
