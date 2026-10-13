"""
The camp dog (asset `fauna.aspin.a`) for the gate slice (P02b): a lean, short-coated tan mongrel.

Run inside the master scene, with the Sketchfab model "Dog animated" by MAXDESIGN (CC BY 4.0,
https://sketchfab.com/models/21b7336c58a442578ab88fc47233ef11) imported through the Blender MCP
add-on (or from the copy this script keeps in assets-src/twin/downloads/sketchfab/):

  exec(compile(open(path).read(), path, "exec"), {"__name__": "dog", "STAGES": ["clean", "clips", "lods"]})

Stages:
  clean   flattens the download's nested, scaled hierarchy into one armature and one mesh at real
          size (0.46 m at the withers), facing -Y in Blender (+Z in the twin), feet on Z = 0
  clips   cuts the download's single take into `walk` and `idle`, and authors the clips it lacks
          (`trot`, `sit`, `lie`, `lieDown`, `getUp`, `bark`) on temporary IK legs, baked to plain
          bone keys at 30 fps
  lods    builds aspin.a_LOD0.._LOD2 and the asset collection

The source take is 24 fps and plays in place.
"""
import math
import os

import bpy
from mathutils import Matrix, Quaternion, Vector

REPO = r"C:\Users\Harrold\Desktop\Projects2\Project Nexus"
RAW_COPY = os.path.join(REPO, "assets-src", "twin", "downloads", "sketchfab", "dog-animated-maxdesign.glb")
ASSET = "fauna.aspin.a"
NAME = "aspin.a"
RIG = "aspin.rig"
SIZE = 1.1  # the download normalised to 1 m long stands 0.42 m at the withers
FPS = 30
SRC_FPS = 24

scene = bpy.context.scene
vl = bpy.context.view_layer


def collection(name, parent=None):
    coll = bpy.data.collections.get(name)
    if coll is None:
        coll = bpy.data.collections.new(name)
        (parent or scene.collection).children.link(coll)
    return coll


def bind(obj, action):
    if obj.animation_data is None:
        obj.animation_data_create()
    obj.animation_data.action = action
    if action is not None and getattr(action, "slots", None) is not None:
        if len(action.slots) == 0:
            action.slots.new(id_type="OBJECT", name=obj.name)
        obj.animation_data.action_slot = action.slots[0]


def source_objects():
    arm = next((o for o in bpy.data.objects if o.type == "ARMATURE" and "Bip001-Pelvis_00" in o.data.bones and o.name != RIG), None)
    if arm is None:
        raise RuntimeError("import the Sketchfab dog first (see the docstring)")
    mesh = next(o for o in arm.children_recursive if o.type == "MESH")
    return arm, mesh


def normalised(m):
    """A matrix with its scale removed."""
    out = m.to_3x3().normalized().to_4x4()
    out.translation = m.translation
    return out


def stage_clean():
    src_arm, src_mesh = source_objects()
    root = src_arm
    while root.parent:
        root = root.parent

    # keep the download as it arrived, so the asset can be rebuilt without the add-on
    if not os.path.exists(RAW_COPY):
        os.makedirs(os.path.dirname(RAW_COPY), exist_ok=True)
        for o in vl.objects:
            o.select_set(False)
        for o in [root] + list(root.children_recursive):
            o.select_set(True)
        bpy.ops.export_scene.gltf(filepath=RAW_COPY, export_format="GLB", use_selection=True, export_animations=True, export_skins=True)

    for name in (RIG, NAME + "_SRC"):
        old = bpy.data.objects.get(name)
        if old:
            bpy.data.objects.remove(old, do_unlink=True)

    lib = collection("LIB_fauna")
    coll = collection(ASSET, lib)
    scale = Matrix.Scale(SIZE, 4)
    scene.frame_set(80)  # standing still
    vl.update()

    arm = bpy.data.objects.new(RIG, src_arm.data.copy())
    arm.data.name = RIG
    coll.objects.link(arm)
    arm.matrix_world = scale @ src_arm.matrix_world
    mesh = bpy.data.objects.new(NAME + "_SRC", src_mesh.data.copy())
    mesh.data.name = NAME + "_SRC"
    coll.objects.link(mesh)
    for g in src_mesh.vertex_groups:
        mesh.vertex_groups.new(name=g.name)
    mesh.data.transform(scale @ src_mesh.matrix_world)
    mesh.matrix_world = Matrix.Identity(4)
    vl.update()

    for o in vl.objects:
        o.select_set(False)
    arm.select_set(True)
    vl.objects.active = arm
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    mesh.parent = arm
    mod = mesh.modifiers.new("Armature", "ARMATURE")
    mod.object = arm
    for pb in arm.pose.bones:
        pb.rotation_mode = "QUATERNION"

    order = [b.name for b in arm.data.bones]

    def copy_pose():
        want = {n: normalised(scale @ src_arm.matrix_world @ src_arm.pose.bones[n].matrix) for n in order}
        for n in order:
            arm.pose.bones[n].matrix = want[n]
            vl.update()

    # the download rests on its side and is stood up by its root bone: make standing the rest pose
    copy_pose()
    vl.objects.active = mesh
    bpy.ops.object.modifier_apply(modifier=mod.name)
    vl.objects.active = arm
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.armature_apply(selected=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    mod = mesh.modifiers.new("Armature", "ARMATURE")
    mod.object = arm
    # centred, feet on the ground
    xs = [v.co.x for v in mesh.data.vertices]
    shift = Matrix.Translation((-(min(xs) + max(xs)) / 2, 0, -min(v.co.z for v in mesh.data.vertices)))
    mesh.data.transform(shift)
    arm.data.transform(shift)
    scale = shift @ scale
    vl.update()

    # the download's take, sampled on the new rig at 30 fps (the source animates an ancestor of
    # its armature as well as the bones, so world matrices are copied, parent first)
    src_action = src_arm.animation_data.action
    f0, f1 = src_action.frame_range
    frames = int(round((f1 - f0) * FPS / SRC_FPS))
    take = bpy.data.actions.get("aspin.take") or bpy.data.actions.new("aspin.take")
    take.use_fake_user = True
    bind(arm, take)
    for i in range(frames + 1):
        t = f0 + i * SRC_FPS / FPS
        scene.frame_set(int(t), subframe=t - int(t))
        vl.update()
        copy_pose()
        for n in order:
            pb = arm.pose.bones[n]
            if i > 0 and pb.get("_q") is not None and Quaternion(pb["_q"]).dot(pb.rotation_quaternion) < 0:
                pb.rotation_quaternion.negate()
            pb["_q"] = list(pb.rotation_quaternion)
            pb.keyframe_insert("rotation_quaternion", frame=i)
            pb.keyframe_insert("location", frame=i)
    for pb in arm.pose.bones:
        if "_q" in pb:
            del pb["_q"]
    scene.render.fps = FPS
    scene.frame_set(100)
    lo = min((mesh.matrix_world @ v.co).z for v in mesh.data.vertices)
    print("[dog] clean: take frames", frames, "rest mesh min z", round(lo, 4))


# ---- clips -------------------------------------------------------------------------------------------
#
# A pose is a flat set of numbers (degrees and metres, all 0 when standing at rest). The dog faces -Y
# and stands on Z = 0. The legs are driven by temporary IK targets at the wrists and hind feet, so a
# planted paw stays planted whatever the body does; every frame is then written as plain bone keys.

B = {
    "pelvis": "Bip001-Pelvis_00", "spine1": "Bip001-Spine1_02", "spine2": "Bip001-Spine2_03",
    "neck": "Bip001-Neck_04", "head": "Bip001-Head_05", "jaw": "Bip001-D-jaw01-01_07",
    "earR": "Bip001-Ponytail1_06", "earL": "Bip001-Ponytail2_09",
    "tail0": "Bip001-Tail_034", "tail1": "Bip001-Tail1_035", "tail2": "Bip001-Tail2_036", "tail3": "Bip001-Tail3_037",
    "clavL": "Bip001-L-Clavicle_010", "clavR": "Bip001-R-Clavicle_016",
}
LEGS = {  # leg: (bone the IK constraint sits on, chain length, paw bone, toe bones)
    "FL": ("Bip001-L-Forearm_012", 3, "Bip001-L-Hand_013"),
    "FR": ("Bip001-R-Forearm_018", 3, "Bip001-R-Hand_019"),
    "HL": ("Bip001-L-HorseLink_026", 3, "Bip001-L-Foot_027"),
    "HR": ("Bip001-R-HorseLink_031", 3, "Bip001-R-Foot_032"),
}
X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))


def ease(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def mix(a, b, t):
    keys = set(a) | set(b)
    return {k: a.get(k, 0.0) * (1 - t) + b.get(k, 0.0) * t for k in keys}


def add(a, b):
    out = dict(a)
    for k, v in b.items():
        out[k] = out.get(k, 0.0) + v
    return out


class DogPoser:
    def __init__(self, arm):
        self.arm = arm
        self.rest = {b.name: b.matrix_local.copy() for b in arm.data.bones}
        self.order = [b.name for b in arm.data.bones]
        self.targets = {}
        self.paw_rest = {}
        bind(arm, None)
        self.reset()
        for leg, (bone, chain, paw) in LEGS.items():
            empty = bpy.data.objects.get("ik." + leg) or bpy.data.objects.new("ik." + leg, None)
            if empty.name not in scene.collection.objects:
                scene.collection.objects.link(empty)
            self.paw_rest[leg] = self.rest[paw].copy()
            empty.location = self.rest[paw].translation
            self.targets[leg] = empty
            pb = arm.pose.bones[bone]
            for c in list(pb.constraints):
                pb.constraints.remove(c)
            c = pb.constraints.new("IK")
            c.target = empty
            c.chain_count = chain
            c.use_tail = True
            c.iterations = 200
        vl.update()

    def reset(self):
        for pb in self.arm.pose.bones:
            pb.rotation_mode = "QUATERNION"
            pb.rotation_quaternion = Quaternion()
            pb.location = (0, 0, 0)
            pb.scale = (1, 1, 1)

    def turn(self, key, axis, degrees):
        """Rotate a bone about its own head, by an angle about a world axis."""
        if abs(degrees) < 1e-4:
            return
        pb = self.arm.pose.bones[B.get(key, key)]
        vl.update()
        m = pb.matrix.copy()
        new = (Matrix.Rotation(math.radians(degrees), 3, axis) @ m.to_3x3()).to_4x4()
        new.translation = m.translation
        pb.matrix = new

    def apply(self, p):
        """Pose the rig; returns {bone: armature-space matrix} with the IK solved."""
        g = lambda k: p.get(k, 0.0)  # noqa: E731
        self.reset()
        pelvis = self.arm.pose.bones[B["pelvis"]]
        rest = self.rest[B["pelvis"]]
        rot = (Matrix.Rotation(math.radians(g("body_yaw")), 3, Z) @ Matrix.Rotation(math.radians(g("body_roll")), 3, Y)
               @ Matrix.Rotation(math.radians(-g("body_pitch")), 3, X))
        m = (rot @ rest.to_3x3()).to_4x4()
        m.translation = rest.translation + Vector((g("body_x"), g("body_y"), g("body_z")))
        pelvis.matrix = m
        # pitch is nose up; yaw is nose to the dog's left (+X); spine bends are shared by two bones
        for key in ("spine1", "spine2"):
            self.turn(key, X, -g("spine_pitch") / 2)
            self.turn(key, Z, -g("spine_yaw") / 2)
            self.turn(key, Y, g("spine_roll") / 2)
        self.turn("neck", X, -g("neck_pitch"))
        self.turn("neck", Z, -g("neck_yaw"))
        for clav in ("clavL", "clavR"):  # the shoulder blades hang from the neck bone: keep them still
            self.turn(clav, Z, g("neck_yaw"))
            self.turn(clav, X, g("neck_pitch"))
        self.turn("head", X, -g("head_pitch"))
        self.turn("head", Z, -g("head_yaw"))
        self.turn("head", Y, g("head_roll"))
        self.turn("jaw", X, g("jaw"))
        self.turn("earL", Y, g("ear"))
        self.turn("earR", Y, -g("ear"))
        for i, key in enumerate(("tail0", "tail1", "tail2", "tail3")):
            self.turn(key, X, g("tail_up") * (1.0 if i == 0 else 0.0) + g("tail_curl"))
            self.turn(key, Z, g("tail_wag") * (0.4 + 0.3 * i))
        for leg, empty in self.targets.items():
            r = self.paw_rest[leg].translation
            empty.location = r + Vector((g(leg + "x"), g(leg + "y"), g(leg + "z")))
        vl.update()
        for leg, (bone, chain, paw) in LEGS.items():  # paws keep their rest attitude, plus a pitch (toes down)
            pb = self.arm.pose.bones[paw]
            m = (Matrix.Rotation(math.radians(g(leg + "p")), 3, X) @ self.paw_rest[leg].to_3x3()).to_4x4()
            m.translation = pb.matrix.translation
            pb.matrix = m
        vl.update()
        return {n: self.arm.pose.bones[n].matrix.copy() for n in self.order}

    def bake(self, name, frames, pose_at):
        """Write `frames` + 1 keys of pose_at(i) into the action aspin.<name>."""
        samples = [self.apply(pose_at(i)) for i in range(frames + 1)]
        constraints = [(self.arm.pose.bones[bone], chain) for bone, chain, _ in LEGS.values()]
        for pb, _ in constraints:
            for c in pb.constraints:
                c.mute = True
        old = bpy.data.actions.get("aspin." + name)
        if old:
            bpy.data.actions.remove(old)
        action = bpy.data.actions.new("aspin." + name)
        action.use_fake_user = True
        bind(self.arm, action)
        last = {}
        for i, sample in enumerate(samples):
            self.reset()
            for n in self.order:
                pb = self.arm.pose.bones[n]
                pb.matrix = sample[n]
                vl.update()
                q = pb.rotation_quaternion.copy()
                if n in last and last[n].dot(q) < 0:
                    q.negate()
                    pb.rotation_quaternion = q
                last[n] = q
                pb.keyframe_insert("rotation_quaternion", frame=i)
                pb.keyframe_insert("location", frame=i)
        bind(self.arm, None)
        for pb, _ in constraints:
            for c in pb.constraints:
                c.mute = False
        print("[dog] clip", name, frames, "frames")
        return action

    def finish(self):
        for bone, _, _ in LEGS.values():
            pb = self.arm.pose.bones[bone]
            for c in list(pb.constraints):
                pb.constraints.remove(c)
        for empty in self.targets.values():
            bpy.data.objects.remove(empty, do_unlink=True)
        self.reset()


# Key poses. Standing at rest is {}.
SIT = {
    "body_z": -0.215, "body_y": -0.09, "body_pitch": 40, "spine_pitch": -10, "neck_pitch": -8, "head_pitch": -22,
    "HLy": -0.15, "HRy": -0.23, "HLx": 0.035, "HRx": -0.035, "HLp": 0, "HRp": 0,
    "FLy": 0.0, "FRy": -0.04, "tail_up": -25, "tail_curl": -8,
}
LIE = {
    "body_z": -0.235, "body_y": -0.02, "body_pitch": 4, "body_roll": 0, "spine_pitch": 6, "neck_pitch": 6, "head_pitch": 14,
    "FLy": -0.165, "FRy": -0.205, "FLz": -0.03, "FRz": -0.033, "FLp": 0, "FRp": 0,
    "HLy": -0.15, "HRy": -0.225, "HLx": 0.05, "HRx": -0.05, "tail_up": -30, "tail_curl": -10,
}


def breathing(i, frames, depth=1.0):
    s = math.sin(2 * math.pi * i / frames)
    return {"spine_pitch": 0.9 * depth * s, "body_z": 0.002 * depth * s, "head_pitch": -0.6 * depth * s}


def stage_clips(only=None):
    arm = bpy.data.objects[RIG]
    take = bpy.data.actions["aspin.take"]
    made = {}

    # 1. cuts of the download's take, resampled so each loop closes on a whole frame
    def cut(name, a, b, frames):
        bind(arm, take)
        for bone in arm.pose.bones:
            for c in list(bone.constraints):
                bone.constraints.remove(c)
        samples = []
        for i in range(frames + 1):
            t = a + (b - a) * i / frames
            scene.frame_set(int(t), subframe=t - int(t))
            vl.update()
            samples.append({pb.name: (pb.rotation_quaternion.copy(), pb.location.copy()) for pb in arm.pose.bones})
        # close the loop: spread the difference between the first and last sample over the clip
        old = bpy.data.actions.get("aspin." + name)
        if old:
            bpy.data.actions.remove(old)
        action = bpy.data.actions.new("aspin." + name)
        action.use_fake_user = True
        bind(arm, action)
        first, final = samples[0], samples[-1]
        for i, sample in enumerate(samples):
            w = i / frames
            for pb in arm.pose.bones:
                q, loc = sample[pb.name]
                q0, l0 = first[pb.name]
                q1, l1 = final[pb.name]
                if q1.dot(q0) < 0:
                    q0 = -q0
                fix = Quaternion().slerp(q0 @ q1.inverted(), w)
                pb.rotation_quaternion = fix @ q
                pb.location = loc + (l0 - l1) * w
                pb.keyframe_insert("rotation_quaternion", frame=i)
                pb.keyframe_insert("location", frame=i)
        bind(arm, None)
        print("[dog] cut", name, frames, "frames from", a, "to", b)
        made[name] = action

    if only is None or "walk" in only:
        cut("walk", 0.0, 37.5, 38)
    if only is None or "idle" in only:
        cut("idle", 45.0, 157.0, 112)

    poser = DogPoser(arm)
    try:
        if only is None or "sit" in only:
            n = 96
            poser.bake("sit", n, lambda i: add(add(SIT, breathing(i, n)), {"tail_wag": 14 * math.sin(4 * math.pi * i / n), "head_yaw": 5 * math.sin(2 * math.pi * i / n)}))
        if only is None or "lie" in only:
            n = 120
            def lie(i):
                ear = 14 * max(0.0, math.sin(2 * math.pi * (i - 70) / 12)) if 70 <= i <= 76 else 0.0
                return add(add(LIE, breathing(i, n, 1.4)), {"ear": ear, "head_yaw": 4 * math.sin(2 * math.pi * i / n)})
            poser.bake("lie", n, lie)
        if only is None or "getUp" in only:
            n = 42  # front end first, then the hind legs push up
            def get_up(i):
                t = i / n
                front = ease(t / 0.6)
                back = ease((t - 0.3) / 0.7)
                p = {}
                for k, v in LIE.items():
                    w = front if k[:2] in ("FL", "FR") or k in ("neck_pitch", "head_pitch", "spine_pitch") else back
                    p[k] = v * (1 - w)
                # the chest lifts before the hips: a nose-up pitch that peaks mid-way
                lift = math.sin(math.pi * ease(t)) * 14
                p["body_pitch"] = p.get("body_pitch", 0) + lift
                p["head_pitch"] = p.get("head_pitch", 0) - lift * 0.6
                p["body_z"] = LIE["body_z"] * (1 - (0.5 * front + 0.5 * back))
                return p
            poser.bake("getUp", n, get_up)
        if only is None or "lieDown" in only:
            n = 48  # front end folds first, then the hips settle
            def lie_down(i):
                t = i / n
                front = ease(t / 0.65)
                back = ease((t - 0.25) / 0.75)
                p = {}
                for k, v in LIE.items():
                    w = front if k[:2] in ("FL", "FR") or k in ("neck_pitch", "head_pitch", "spine_pitch") else back
                    p[k] = v * w
                dip = math.sin(math.pi * ease(t)) * 12
                p["body_pitch"] = p.get("body_pitch", 0) - dip
                p["head_pitch"] = p.get("head_pitch", 0) + dip * 0.7
                p["body_z"] = LIE["body_z"] * (0.5 * front + 0.5 * back)
                return p
            poser.bake("lieDown", n, lie_down)
        if only is None or "trot" in only:
            n = 14  # 0.467 s a stride at 1.4 m/s: diagonal pairs, each paw on the ground half the time
            reach = 1.4 * (n / FPS) * 0.5 / 2
            def paw(phase):
                """(forward offset, lift) of a paw at `phase` of its stride (0..1; stance first)."""
                if phase < 0.5:
                    return -reach + 2 * reach * (phase / 0.5), 0.0  # on the ground, moving back (+Y)
                u = (phase - 0.5) / 0.5
                return reach - 2 * reach * ease(u), math.sin(math.pi * u)
            def trot(i):
                t = i / n
                p = {"body_z": -0.012 + 0.010 * math.cos(4 * math.pi * t), "body_pitch": 1.5 * math.sin(4 * math.pi * t + 0.6),
                     "body_roll": 2.0 * math.sin(2 * math.pi * t), "spine_yaw": 3.0 * math.sin(2 * math.pi * t),
                     "head_pitch": 6 - 1.5 * math.sin(4 * math.pi * t + 0.6), "neck_pitch": 3, "tail_up": 18, "tail_wag": 7 * math.sin(2 * math.pi * t), "jaw": 7}
                for leg, offset in (("FL", 0.0), ("HR", 0.0), ("FR", 0.5), ("HL", 0.5)):
                    y, lift = paw((t + offset) % 1.0)
                    front = leg[0] == "F"
                    p[leg + "y"] = y
                    p[leg + "z"] = lift * (0.065 if front else 0.05)
                    p[leg + "p"] = lift * (38 if front else 30)
                return p
            poser.bake("trot", n, trot)
        if only is None or "bark" in only:
            n = 45  # two barks: the head snaps up and forward, the jaw opens, the chest kicks back
            def bark(i):
                p = {"tail_up": 22, "neck_pitch": 6, "head_pitch": 8, "FLy": 0.0}
                for start in (6, 24):
                    u = (i - start) / 9
                    if 0 <= u <= 1:
                        k = math.sin(math.pi * min(1.0, u * 1.6)) if u < 0.625 else math.sin(math.pi * (0.5 + 0.5 * (u - 0.625) / 0.375))
                        p = add(p, {"jaw": 30 * k, "head_pitch": 16 * k, "neck_pitch": 6 * k, "body_y": 0.018 * k, "body_pitch": 3 * k,
                                    "spine_pitch": -3 * k, "tail_up": 6 * k, "ear": -8 * k})
                return p
            poser.bake("bark", n, bark)
    finally:
        poser.finish()
    scene.frame_set(0)


if "clean" in STAGES:  # noqa: F821
    stage_clean()
if "clips" in STAGES:  # noqa: F821
    stage_clips(globals().get("ONLY"))
