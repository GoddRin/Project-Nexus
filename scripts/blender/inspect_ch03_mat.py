import bpy
import os

bpy.ops.wm.read_factory_settings(use_empty=True)
michelle_path = os.path.abspath("public/models/characters/michelle.glb")
bpy.ops.import_scene.gltf(filepath=michelle_path)

ch = bpy.data.objects.get("Ch03")
print("Ch03 materials:", [m.name for m in ch.data.materials])
mat = ch.data.materials[0]
print("Nodes in material:", [n.type for n in mat.node_tree.nodes])
for node in mat.node_tree.nodes:
    if node.type == 'TEX_IMAGE':
        print("Texture image:", node.name, node.image.name if node.image else None)
