"""Headless solver: find [flex, twist, abduct] values for the right arm / forearm that reach a target
pose using only anatomically valid joint motion (elbow = hinge + forearm twist, no sideways bend).
blender -b --python solve_pose.py -- <glb> <targets.json>"""
import bpy, sys, json, math, random
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
GLB, TARGETS = argv[0], json.load(open(argv[1]))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
bpy.context.view_layer.objects.active = arm
vl = bpy.context.view_layer
C = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))
Ci = C.inverted()


def three_euler(x, y, z):
    return C @ (Matrix.Rotation(x, 3, "X") @ Matrix.Rotation(y, 3, "Y") @ Matrix.Rotation(z, 3, "Z")) @ Ci


def bone(name):
    for n in (f"mixamorig_{name}", f"mixamorig:{name}", f"mixamorig{name}", name):
        if n in arm.pose.bones:
            return arm.pose.bones[n]
    return None


def world_rot(pb):
    return (arm.matrix_world @ pb.matrix).to_3x3().normalized()


def rot_world(pb, R):
    vl.update()
    mw = arm.matrix_world @ pb.matrix
    new = (R @ mw.to_3x3()).to_4x4()
    new.translation = mw.to_translation()
    pb.matrix = arm.matrix_world.inverted() @ new
    vl.update()


D = math.radians
RX = TARGETS.get("relaxed", {})
ARM = RX.get("arm", 68); ARMF = RX.get("armFwd", 5); FB = RX.get("foreBend", 16); FT = RX.get("foreTwist", 22)
F1 = RX.get("f1", 14); F2 = RX.get("f2", 20)
for n, e in (("LeftShoulder", (0, 0, -7)), ("RightShoulder", (0, 0, 7)), ("LeftArm", (0, 0, -ARM)), ("RightArm", (0, 0, ARM)),
             ("LeftArm", (-ARMF, 0, 0)), ("RightArm", (-ARMF, 0, 0)), ("LeftForeArm", (-FB, 0, 0)), ("RightForeArm", (-FB, 0, 0)),
             ("LeftForeArm", (0, FT, 0)), ("RightForeArm", (0, -FT, 0))):
    rot_world(bone(n), three_euler(D(e[0]), D(e[1]), D(e[2])))
for side, s in (("Left", -1), ("Right", 1)):
    for finger in ("Index", "Middle", "Ring", "Pinky"):
        for j in (1, 2, 3):
            rot_world(bone(f"{side}Hand{finger}{j}"), three_euler(0, 0, D(s * (F1 if j == 1 else F2))))
    rot_world(bone(f"{side}HandThumb2"), three_euler(0, 0, D(s * 10)))
vl.update()

SIDE = TARGETS.get("side", "Right")
CHAIN = [f"{SIDE}Shoulder", f"{SIDE}Arm", f"{SIDE}ForeArm", f"{SIDE}Hand"]
basis = {n: bone(n).matrix_basis.copy() for n in CHAIN}
relaxed_parent = {n: world_rot(bone(n).parent) for n in CHAIN}


def P(name):
    w = arm.matrix_world @ bone(name).head
    return Vector((w.x, w.z, -w.y))  # three.js model space


def measure():
    sh, el, wr = P(f"{SIDE}Arm"), P(f"{SIDE}ForeArm"), P(f"{SIDE}Hand")
    idx, pinky, mid = P(f"{SIDE}HandIndex1"), P(f"{SIDE}HandPinky1"), P(f"{SIDE}HandMiddle1")
    n = (idx - wr).cross(pinky - wr).normalized()
    return sh, el, wr, mid, n


vl.update()
_, _, _, _, n0 = measure()
# In the relaxed pose the palm faces the thigh: toward the body's midline
inward = 1 if SIDE == "Right" else -1
PALM_SIGN = 1 if n0.x * inward > 0 else -1
print("RELAXED palm normal", [round(v, 2) for v in (n0 * PALM_SIGN)])


def apply(arm_e, fore_e, hand_e=(0, 0, 0)):
    for n in CHAIN:
        bone(n).matrix_basis = basis[n]
    vl.update()
    a, b, c = arm_e
    if SIDE == "Right":
        elev = max(0, c) + 0.45 * max(0, a)
        sh = three_euler(0, 0, -min(0.3, elev * 0.3))
    else:
        elev = max(0, -c) + 0.45 * max(0, a)
        sh = three_euler(0, 0, min(0.3, elev * 0.3))
    Gs = {CHAIN[0]: sh, CHAIN[1]: three_euler(-arm_e[0], arm_e[1], -arm_e[2]),
          CHAIN[2]: three_euler(-fore_e[0], fore_e[1], -fore_e[2]), CHAIN[3]: three_euler(-hand_e[0], hand_e[1], -hand_e[2])}
    for n in CHAIN:
        pb = bone(n)
        vl.update()
        Dp = world_rot(pb.parent) @ relaxed_parent[n].inverted()
        rot_world(pb, Dp @ Gs[n] @ Dp.inverted())
    vl.update()


def make_cost(T):
    def cost(x):
        apply((x[0], x[1], x[2]), (x[3], x[4], 0.0))
        sh, el, wr, mid, n = measure()
        n = n * PALM_SIGN
        c = 0.0
        if "upper" in T:
            c += ((el - sh).normalized() - Vector(T["upper"]).normalized()).length ** 2 * 2.0
        if "fore" in T:
            c += ((wr - el).normalized() - Vector(T["fore"]).normalized()).length ** 2 * 2.0
        if "palm" in T:
            c += (n - Vector(T["palm"]).normalized()).length ** 2 * T.get("palm_w", 1.0)
        if "knuckle" in T:
            c += (mid - Vector(T["knuckle"])).length ** 2 * T.get("knuckle_w", 40.0)
        # comfort: elbow flexion 0..2.4, forearm twist within +-1.3, gentle pull toward small shoulder angles
        c += max(0, -x[3]) * 3 + max(0, x[3] - 2.4) * 3 + max(0, abs(x[4]) - 1.3) * 3
        c += 0.01 * (x[0] ** 2 + x[1] ** 2 + x[2] ** 2)
        # elbow must not sink into the torso / vest
        c += max(0, el.x + 0.24) * 6 if SIDE == "Right" else max(0, 0.24 - el.x) * 6
        return c
    return cost


random.seed(7)
RESULT = {}
for name, T in TARGETS["poses"].items():
    cost = make_cost(T)
    best, bx = 1e9, None
    for trial in range(T.get("starts", 4)):
        x = [random.uniform(-0.6, 1.4), random.uniform(-1.6, 1.6), random.uniform(-0.4, 1.4), random.uniform(0.2, 2.0), random.uniform(-1.2, 1.2)]
        cx = cost(x)
        step = 0.5
        while step > 0.02:
            improved = False
            for i in range(5):
                for d in (step, -step):
                    y = list(x)
                    y[i] += d
                    cy = cost(y)
                    if cy < cx:
                        x, cx, improved = y, cy, True
            if not improved:
                step *= 0.5
        if cx < best:
            best, bx = cx, x
    apply((bx[0], bx[1], bx[2]), (bx[3], bx[4], 0.0))
    sh, el, wr, mid, n = measure()
    RESULT[name] = {"arm": [round(v, 2) for v in bx[:3]], "fore": [round(bx[3], 2), round(bx[4], 2), 0]}
    print("SOLVED", name, round(best, 3), json.dumps(RESULT[name]), "elbow", [round(v, 2) for v in el], "knuckle", [round(v, 2) for v in mid], "palm", [round(v, 2) for v in n * PALM_SIGN], flush=True)
print("RESULT", json.dumps(RESULT))
