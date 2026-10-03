import bpy
import os

print("=== TESTING ELITE NAVIGATOR BLENDER IMPORT ===")

michelle_path = os.path.abspath("public/models/characters/michelle.glb")
print(f"Loading {michelle_path}...")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=michelle_path)

print("Objects in scene:")
for obj in bpy.data.objects:
    print(f" - {obj.name} (type: {obj.type})")

arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
if arm:
    print(f"Armature found: {arm.name}, bones count: {len(arm.data.bones)}")
    sample_bones = [b.name for b in arm.data.bones[:10]]
    print(f"Sample bones: {sample_bones}")

print("=== TEST COMPLETED SUCCESSFULLY ===")
