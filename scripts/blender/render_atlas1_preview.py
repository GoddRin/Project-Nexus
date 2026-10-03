import bpy
import math
import os

print("=== RENDERING ATLAS-1 ANDROID SHOWCASE PREVIEW ===")

blend_file = os.path.abspath("public/models/characters/scic_atlas_navigator.blend")
bpy.ops.wm.open_mainfile(filepath=blend_file)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 1024
scene.render.resolution_y = 1024
scene.render.film_transparent = True

# Target Empty at center of Atlas-1 chest
target = bpy.data.objects.new("CameraTarget", None)
target.location = (0, 0, 1.05)
scene.collection.objects.link(target)

# Add Camera with Track To constraint
cam_data = bpy.data.cameras.new("AtlasCam")
cam_data.lens = 55 # 55mm portrait lens
cam_obj = bpy.data.objects.new("AtlasCam", cam_data)
scene.collection.objects.link(cam_obj)
scene.camera = cam_obj

# Position camera in FRONT 3/4 angle (Atlas-1 faces -Y)
cam_obj.location = (0.9, -2.6, 1.2)

# Track camera directly to the character
track_const = cam_obj.constraints.new(type='TRACK_TO')
track_const.target = target
track_const.track_axis = 'TRACK_NEGATIVE_Z'
track_const.up_axis = 'UP_Y'

# Studio Key Light (Front-Left, crisp white)
key_data = bpy.data.lights.new(name="StudioKey", type='AREA')
key_data.energy = 450.0
key_data.size = 1.2
key_data.color = (1.0, 1.0, 1.0)
key_obj = bpy.data.objects.new("StudioKey", key_data)
key_obj.location = (-1.2, -2.2, 2.2)
scene.collection.objects.link(key_obj)

# Studio Fill Light (Front-Right, soft cyan)
fill_data = bpy.data.lights.new(name="StudioFill", type='AREA')
fill_data.energy = 220.0
fill_data.size = 1.5
fill_data.color = (0.0, 0.85, 1.0)
fill_obj = bpy.data.objects.new("StudioFill", fill_data)
fill_obj.location = (1.4, -2.0, 1.4)
scene.collection.objects.link(fill_obj)

# Studio Rim Light (Back-Right, emerald accent)
rim_data = bpy.data.lights.new(name="StudioRim", type='SPOT')
rim_data.energy = 600.0
rim_data.spot_size = math.radians(65)
rim_data.color = (0.0, 0.9, 0.55)
rim_obj = bpy.data.objects.new("StudioRim", rim_data)
rim_obj.location = (1.0, 1.8, 2.3)
scene.collection.objects.link(rim_obj)

# Output path
artifacts_dir = r"C:\Users\Harrold\.gemini\antigravity-ide\brain\b117bd5e-4655-44dc-9078-f8af53ab1dee"
os.makedirs(artifacts_dir, exist_ok=True)
out_img = os.path.join(artifacts_dir, "atlas1_android_showcase.png")

scene.render.filepath = out_img
scene.render.image_settings.file_format = 'PNG'

# Pose at frame 15 of Navigator_Idle
arm = bpy.data.objects.get("Navigator_Armature")
if arm and "Navigator_Idle" in bpy.data.actions:
    arm.animation_data.action = bpy.data.actions["Navigator_Idle"]
    scene.frame_set(15)

bpy.ops.render.render(write_still=True)
print(f"Successfully rendered Atlas-1 showcase image to: {out_img}")
