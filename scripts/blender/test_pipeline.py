import bpy
import os
import sys

print("=== BLENDER HEADLESS PIPELINE INITIALIZATION ===")
print("Blender Version:", bpy.app.version_string)
print("Python Version:", sys.version)

# Clear existing objects
bpy.ops.wm.read_factory_settings(use_empty=True)

# Create a test smooth beveled prop
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.5))
cube = bpy.context.active_object
cube.name = "TestBeveledProp"

# Add bevel modifier for realistic edge highlight
bevel = cube.modifiers.new(name="Bevel", type='BEVEL')
bevel.width = 0.05
bevel.segments = 3

# Add material
mat = bpy.data.materials.new(name="PBR_Steel")
mat.use_nodes = True
nodes = mat.node_tree.nodes
principled = nodes.get("Principled BSDF")
if principled:
    # Set realistic metal properties
    if "Base Color" in principled.inputs:
        principled.inputs["Base Color"].default_value = (0.2, 0.25, 0.3, 1.0)
    if "Metallic" in principled.inputs:
        principled.inputs["Metallic"].default_value = 0.85
    if "Roughness" in principled.inputs:
        principled.inputs["Roughness"].default_value = 0.35

cube.data.materials.append(mat)

# Apply modifiers and smooth shading
bpy.ops.object.modifier_apply(modifier="Bevel")
bpy.ops.object.shade_smooth()

# Export GLTF
out_dir = os.path.abspath("public/models")
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "test_prop.glb")

bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    use_selection=False
)

print("SUCCESS: Exported GLB to", out_path)
print("File size:", os.path.getsize(out_path), "bytes")
