import bpy
import os

bpy.ops.wm.read_factory_settings(use_empty=True)
sec_path = os.path.abspath("public/models/characters/security_patrol.glb")
bpy.ops.import_scene.gltf(filepath=sec_path)

print("Imported security_patrol.glb")
for act in bpy.data.actions:
    print(f"Action: {act.name}")
