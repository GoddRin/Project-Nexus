import bpy
import os

bpy.ops.wm.read_factory_settings(use_empty=True)
michelle_path = os.path.abspath("public/models/characters/michelle.glb")
bpy.ops.import_scene.gltf(filepath=michelle_path)

tpose = bpy.data.actions.get("TPose")
print("Action attrs:", [a for a in dir(tpose) if not a.startswith("__")])
