"""Review stills of every animation clip in a navigator GLB (front view, several moments each).

  blender -b --python scripts/blender/render_clip_review.py -- <glb> <out_dir> [frames_per_clip] [clip,clip,...] [close]

Writes <out_dir>/<clip>_<n>.png; tile them with ffmpeg to get one row per clip.
"""
import bpy, sys, os
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
GLB, OUT = argv[0], argv[1]
N = int(argv[2]) if len(argv) > 2 else 5
ONLY = set(argv[3].split(",")) if len(argv) > 3 and argv[3] else None
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
scene = bpy.context.scene
vl = bpy.context.view_layer
if arm.animation_data is None:
    arm.animation_data_create()
for t in list(arm.animation_data.nla_tracks):
    arm.animation_data.nla_tracks.remove(t)

cam_data = bpy.data.cameras.new("cam")
cam_data.lens = 50
cam = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam)
CLOSE = len(argv) > 4 and argv[4] == "close"  # the app's companion framing: chest up
cam.location = Vector((0, -1.75, 1.45)) if CLOSE else Vector((0, -3.4, 1.15))
target = Vector((0, 0, 1.36)) if CLOSE else Vector((0, 0, 1.0))
cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam
for name, loc, energy in (("key", (1.5, -3, 3), 900), ("fill", (-2.5, -2, 2), 400), ("rim", (0, 3, 3), 500)):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy = energy
    ld.size = 3
    lo = bpy.data.objects.new(name, ld)
    scene.collection.objects.link(lo)
    lo.location = loc
    lo.rotation_euler = (Vector((0, 0, 1.2)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
world = bpy.data.worlds.new("w")
scene.world = world
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs[0].default_value = (0.32, 0.34, 0.36, 1)
bg.inputs[1].default_value = 0.6

engines = [e for e in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "BLENDER_WORKBENCH")]
for e in engines:
    try:
        scene.render.engine = e
        break
    except TypeError:
        continue
scene.render.resolution_x = 420 if CLOSE else 300
scene.render.resolution_y = 520 if CLOSE else 460
scene.render.image_settings.file_format = "PNG"

for action in sorted(bpy.data.actions, key=lambda a: a.name):
    if ONLY and action.name not in ONLY:
        continue
    arm.animation_data.action = action
    try:
        if getattr(action, "slots", None) and len(action.slots):
            arm.animation_data.action_slot = action.slots[0]
    except Exception:
        pass
    f0, f1 = action.frame_range
    for i in range(N):
        f = f0 + (f1 - f0) * (i + 0.5) / N
        scene.frame_set(int(f), subframe=f - int(f))
        vl.update()
        scene.render.filepath = os.path.join(OUT, f"{action.name}_{i}.png")
        bpy.ops.render.render(write_still=True)
    print("RENDERED", action.name, int(f1 - f0))
