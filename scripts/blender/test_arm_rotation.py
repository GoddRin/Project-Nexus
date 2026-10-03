import bpy
import os
import math

bpy.ops.wm.read_factory_settings(use_empty=True)
michelle_path = os.path.abspath("public/models/characters/michelle.glb")
bpy.ops.import_scene.gltf(filepath=michelle_path)

arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)

# Inspect TPose action
tpose_action = bpy.data.actions.get("TPose")
if tpose_action:
    print("TPose action found! Fcurves count:", len(tpose_action.fcurves))
    for fc in tpose_action.fcurves[:10]:
        print(f" - {fc.data_path}[{fc.array_index}]")
