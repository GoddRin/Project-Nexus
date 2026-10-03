import bpy
import math
import os

print("=== CREATING SCIC ATLAS-1 VANGUARD ANDROID ===")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="public/models/characters/security_patrol.glb")

# Materials enhancement for SCIC livery
mat_body = bpy.data.materials.get("VanguardBodyMat")
if mat_body and mat_body.use_nodes:
    nodes = mat_body.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        # Increase metallic and roughness for clean industrial composite
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = 0.4
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = 0.35

mat_visor = bpy.data.materials.get("Vanguard_VisorMat")
if mat_visor and mat_visor.use_nodes:
    nodes = mat_visor.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = (0.0, 0.95, 1.0, 1.0) # SCIC Cyan
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (0.0, 0.95, 1.0, 1.0)
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = 4.0
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = 0.9
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = 0.05

# Render front preview
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 24
scene.render.resolution_x = 768
scene.render.resolution_y = 768
scene.render.film_transparent = True

target = bpy.data.objects.new("T", None)
target.location = (0, 0, 1.1)
scene.collection.objects.link(target)

cam_data = bpy.data.cameras.new("C")
cam_data.lens = 50
cam_obj = bpy.data.objects.new("C", cam_data)
scene.collection.objects.link(cam_obj)
scene.camera = cam_obj
cam_obj.location = (0.6, 2.5, 1.3) # Front 3/4

t = cam_obj.constraints.new(type='TRACK_TO')
t.target = target
t.track_axis = 'TRACK_NEGATIVE_Z'
t.up_axis = 'UP_Y'

# Studio Front Key Light
key_data = bpy.data.lights.new('Key', type='AREA')
key_data.energy = 500.0
key_data.size = 1.5
key_data.color = (1.0, 1.0, 1.0)
key_obj = bpy.data.objects.new('Key', key_data)
key_obj.location = (-1.2, 2.2, 2.0)
scene.collection.objects.link(key_obj)

# Studio Fill Light (Cyan)
fill_data = bpy.data.lights.new('Fill', type='AREA')
fill_data.energy = 250.0
fill_data.size = 2.0
fill_data.color = (0.0, 0.85, 1.0)
fill_obj = bpy.data.objects.new('Fill', fill_data)
fill_obj.location = (1.5, 2.0, 1.4)
scene.collection.objects.link(fill_obj)

# Studio Back Rim (Emerald)
rim_data = bpy.data.lights.new('Rim', type='SPOT')
rim_data.energy = 800.0
rim_data.color = (0.0, 0.9, 0.55)
rim_obj = bpy.data.objects.new('Rim', rim_data)
rim_obj.location = (-1.0, -1.8, 2.4)
scene.collection.objects.link(rim_obj)

# Set Idle pose frame 20
arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
if arm and "Idle" in bpy.data.actions:
    arm.animation_data.action = bpy.data.actions["Idle"]
    scene.frame_set(20)

out_img = r"C:\Users\Harrold\.gemini\antigravity-ide\brain\b117bd5e-4655-44dc-9078-f8af53ab1dee\vanguard_scic_preview.png"
scene.render.filepath = out_img
bpy.ops.render.render(write_still=True)
print(f"Rendered: {out_img}")
