import bpy
import math
import os

print("=== RENDERING SCIC FOREMAN FRONT 3/4 HERO VIEW IN BLENDER 5.2 ===")

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 1024
scene.render.resolution_y = 1024
scene.render.film_transparent = True

# Target Empty at center of foreman's chest/face
target = bpy.data.objects.new("CameraTarget", None)
target.location = (0, 0, 1.05)
scene.collection.objects.link(target)

# Add Camera with Track To constraint
cam_data = bpy.data.cameras.new("ForemanCam")
cam_data.lens = 50 # 50mm portrait lens
cam_obj = bpy.data.objects.new("ForemanCam", cam_data)
scene.collection.objects.link(cam_obj)
scene.camera = cam_obj

# Position camera in FRONT 3/4 angle (foreman faces +Y, so camera is at +Y)
cam_obj.location = (-1.4, 3.2, 1.25)

# Track camera directly to the character
track_const = cam_obj.constraints.new(type='TRACK_TO')
track_const.target = target
track_const.track_axis = 'TRACK_NEGATIVE_Z'
track_const.up_axis = 'UP_Y'

# Key Sun Light (Warm Philippine Sun from Front-Left)
sun_data = bpy.data.lights.new(name="SunKey", type='SUN')
sun_data.energy = 5.5
sun_data.color = (1.0, 0.96, 0.90)
sun_obj = bpy.data.objects.new("SunKey", sun_data)
sun_obj.rotation_euler = (math.radians(-50), math.radians(25), math.radians(45))
scene.collection.objects.link(sun_obj)

# Soft Fill Light (Sky ambient from Front-Right)
fill_data = bpy.data.lights.new(name="SkyFill", type='SUN')
fill_data.energy = 2.4
fill_data.color = (0.75, 0.85, 1.0)
fill_obj = bpy.data.objects.new("SkyFill", fill_data)
fill_obj.rotation_euler = (math.radians(40), math.radians(-15), math.radians(-135))
scene.collection.objects.link(fill_obj)

# Rim Light (Crisp rim separation from behind)
rim_data = bpy.data.lights.new(name="BackRim", type='POINT')
rim_data.energy = 500.0
rim_data.color = (1.0, 0.94, 0.85)
rim_obj = bpy.data.objects.new("BackRim", rim_data)
rim_obj.location = (1.2, -1.8, 2.2)
scene.collection.objects.link(rim_obj)

# Output path
artifacts_dir = r"C:\Users\Harrold\.gemini\antigravity-ide\brain\736f5f0e-57a2-4253-bce2-baae70334379"
os.makedirs(artifacts_dir, exist_ok=True)
out_img = os.path.join(artifacts_dir, "scic_civil_foreman_showcase.png")

scene.render.filepath = out_img
scene.render.image_settings.file_format = 'PNG'

# Walk Action pose at frame 18
arm = bpy.data.objects.get("Foreman_Armature")
if arm and "Foreman_Walk" in bpy.data.actions:
    arm.animation_data.action = bpy.data.actions["Foreman_Walk"]
    scene.frame_set(18)

bpy.ops.render.render(write_still=True)
print(f"Successfully rendered front preview image to: {out_img}")
