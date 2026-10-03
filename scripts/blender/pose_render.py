"""Headless: import the shipped navigator GLB, pose it exactly as AtlasNavigatorModel.tsx does,
render a PNG.  blender -b --python pose_render.py -- <glb> <pose.json> <out.png> [camera]"""
import bpy, sys, json, math
from mathutils import Matrix, Euler, Vector, Quaternion

argv = sys.argv[sys.argv.index("--") + 1:]
GLB, POSE, OUT = argv[0], argv[1], argv[2]
CAM = argv[3] if len(argv) > 3 else "front"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
bpy.context.view_layer.objects.active = arm
vl = bpy.context.view_layer

# three.js model space (x, y, z) -> Blender world (x, -z, y)
C = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))
Ci = C.inverted()


def three_euler(x, y, z):
    """three.js Euler 'XYZ' (radians) as a Blender-world 3x3 rotation."""
    r3 = Matrix.Rotation(x, 3, "X") @ Matrix.Rotation(y, 3, "Y") @ Matrix.Rotation(z, 3, "Z")
    return C @ r3 @ Ci


def bone(name):
    for n in (f"mixamorig_{name}", f"mixamorig:{name}", f"mixamorig{name}", name):
        if n in arm.pose.bones:
            return arm.pose.bones[n]
    return None


def world_rot(pb):
    return (arm.matrix_world @ pb.matrix).to_3x3().normalized()


def rot_world(pb, R):
    """Rotate a pose bone in place by a world-space rotation R (about its own head)."""
    if pb is None:
        return
    vl.update()
    mw = arm.matrix_world @ pb.matrix
    loc = mw.to_translation()
    new = (R @ mw.to_3x3()).to_4x4()
    new.translation = loc
    pb.matrix = arm.matrix_world.inverted() @ new
    vl.update()


D = math.radians
# -- relaxed pose (buildRig) --
RX = json.load(open(POSE)).get("relaxed", {})
ARM = RX.get("arm", 68); ARMF = RX.get("armFwd", 5); FB = RX.get("foreBend", 16); FT = RX.get("foreTwist", 22)
F1 = RX.get("f1", 14); F2 = RX.get("f2", 20); CLAV = RX.get("clav", 7); HANDIN = RX.get("handIn", 0); ARMTW = RX.get("armTwist", 0)
rot_world(bone("LeftShoulder"), three_euler(0, 0, D(-CLAV)))
rot_world(bone("RightShoulder"), three_euler(0, 0, D(CLAV)))
rot_world(bone("LeftArm"), three_euler(0, 0, D(-ARM)))
rot_world(bone("RightArm"), three_euler(0, 0, D(ARM)))
rot_world(bone("LeftArm"), three_euler(D(-ARMF), 0, 0))
rot_world(bone("RightArm"), three_euler(D(-ARMF), 0, 0))
rot_world(bone("LeftArm"), three_euler(0, D(ARMTW), 0))
rot_world(bone("RightArm"), three_euler(0, D(-ARMTW), 0))
rot_world(bone("LeftForeArm"), three_euler(D(-FB), 0, 0))
rot_world(bone("RightForeArm"), three_euler(D(-FB), 0, 0))
rot_world(bone("LeftForeArm"), three_euler(0, D(FT), 0))
rot_world(bone("RightForeArm"), three_euler(0, D(-FT), 0))
rot_world(bone("LeftHand"), three_euler(0, 0, D(-HANDIN)))
rot_world(bone("RightHand"), three_euler(0, 0, D(HANDIN)))
for side, s in (("Left", -1), ("Right", 1)):
    for finger in ("Index", "Middle", "Ring", "Pinky"):
        for j in (1, 2, 3):
            rot_world(bone(f"{side}Hand{finger}{j}"), three_euler(0, 0, D(s * (F1 if j == 1 else F2))))
    rot_world(bone(f"{side}HandThumb2"), three_euler(0, 0, D(s * 10)))
vl.update()

NAMES = {
    "spine": "Spine", "spine1": "Spine1", "spine2": "Spine2", "neck": "Neck", "head": "Head",
    "lShoulder": "LeftShoulder", "rShoulder": "RightShoulder", "lArm": "LeftArm", "rArm": "RightArm",
    "lFore": "LeftForeArm", "rFore": "RightForeArm", "lHand": "LeftHand", "rHand": "RightHand",
}
ORDER = ["spine", "spine1", "spine2", "neck", "head", "lShoulder", "rShoulder", "lArm", "rArm", "lFore", "rFore", "lHand", "rHand"]
LIMB = {"lArm", "rArm", "lFore", "rFore", "lHand", "rHand", "lShoulder", "rShoulder"}
relaxed = {k: world_rot(bone(n)) for k, n in NAMES.items() if bone(n)}
relaxed_parent = {}
for k, n in NAMES.items():
    pb = bone(n)
    if pb and pb.parent:
        relaxed_parent[k] = world_rot(pb.parent)

pose = json.load(open(POSE))
G = {}
for k, v in pose.get("slots", {}).items():
    a, b, c = v
    G[k] = three_euler(-a, b, -c) if k in LIMB else three_euler(a, b, c)
# scapulohumeral coupling (5b)
if "rArm" in pose.get("slots", {}):
    a, b, c = pose["slots"]["rArm"]
    e = max(0, c) + 0.45 * max(0, a)
    if e > 0.01:
        G["rShoulder"] = G.get("rShoulder", Matrix.Identity(3)) @ three_euler(0, 0, -min(0.3, e * 0.3))
if "lArm" in pose.get("slots", {}):
    a, b, c = pose["slots"]["lArm"]
    e = max(0, -c) + 0.45 * max(0, a)
    if e > 0.01:
        G["lShoulder"] = G.get("lShoulder", Matrix.Identity(3)) @ three_euler(0, 0, min(0.3, e * 0.3))

for k in ORDER:
    if k not in G:
        continue
    pb = bone(NAMES[k])
    if not pb:
        continue
    vl.update()
    Dp = world_rot(pb.parent) @ relaxed_parent[k].inverted() if pb.parent else Matrix.Identity(3)
    rot_world(pb, Dp @ G[k] @ Dp.inverted())

# optional finger curl override: {"fingers": {"Right": deg_extra}}
for side, extra in pose.get("fingers", {}).items():
    s = -1 if side == "Left" else 1
    for finger in ("Index", "Middle", "Ring", "Pinky"):
        for j in (1, 2, 3):
            rot_world(bone(f"{side}Hand{finger}{j}"), three_euler(0, 0, D(s * extra)))
vl.update()

# report joint positions in three.js model space
def p3(name):
    pb = bone(name)
    w = arm.matrix_world @ pb.head
    return [round(w.x, 3), round(w.z, 3), round(-w.y, 3)]
print("JOINTS", json.dumps({n: p3(n) for n in ("RightShoulder", "RightArm", "RightForeArm", "RightHand", "RightHandMiddle1", "Head", "LeftArm", "LeftForeArm", "LeftHand") if bone(n)}))

# -- camera + light --
cam_data = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_data)
bpy.context.scene.collection.objects.link(cam)
views = {
    "front": ((0, -2.3, 1.38), (0, 0, 1.22)),
    "app": ((0, -1.58, 1.47), (0, 0, 1.41)),
    "side": ((-2.2, -0.6, 1.4), (0, 0, 1.25)),
    "quarter": ((-1.3, -1.9, 1.5), (0, 0, 1.25)),
    "full": ((0, -3.6, 1.0), (0, 0, 0.95)),
    "face": ((0, -0.75, 1.62), (0, 0, 1.6)),
    "faceq": ((-0.45, -0.65, 1.62), (0, 0, 1.6)),
}
pos, look = views[CAM]
cam.location = pos
d = Vector(look) - Vector(pos)
cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
cam_data.angle_y = math.radians(38)
cam_data.sensor_fit = "VERTICAL"
bpy.context.scene.camera = cam

for loc, energy in (((-2, -3, 3), 4.0), ((3, -2, 2), 1.5)):
    ld = bpy.data.lights.new("l", "SUN")
    ld.energy = energy
    lo = bpy.data.objects.new("l", ld)
    lo.location = loc
    lo.rotation_euler = (Vector((0, 0, 1.2)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.collection.objects.link(lo)
world = bpy.data.worlds.new("w")
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs[0].default_value = (0.32, 0.34, 0.36, 1)
bg.inputs[1].default_value = 1.0
bpy.context.scene.world = world

sc = bpy.context.scene
sc.render.resolution_x = 560
sc.render.resolution_y = 720
sc.render.filepath = OUT
sc.render.image_settings.file_format = "PNG"
engines = ["BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "BLENDER_WORKBENCH"]
for e in engines:
    try:
        sc.render.engine = e
        break
    except TypeError:
        continue
if sc.render.engine == "BLENDER_WORKBENCH":
    sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "TEXTURE"
print("ENGINE", sc.render.engine)
bpy.ops.render.render(write_still=True)
