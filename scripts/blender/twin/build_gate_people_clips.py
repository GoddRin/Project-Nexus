"""
Motion for the three men at the camp gate (P02b): Mixamo motion capture retargeted onto each
man's own skeleton, and the clips no library has, authored here on arm solvers.

Run inside the master scene after build_gate_people.py has made the people:

  exec(compile(open(path).read(), path, "exec"), {"__name__": "clips", "STAGES": ["retarget", "author", "tracks"], "WHO": ["guard"]})

Stages:
  retarget  every Mixamo file in MIXAMO (assets-src/mixamo/, exported on Y Bot without skin, 30 fps,
            in place) baked onto the man's rig as an action called <who>:<clip>
  author    the clips made here: `tablet` (engineer), `barrier` and `barrierDown` (guard, hands on the
            counterweight as the arm moves), `restShovel` and `shovel` (labourer); each man's hand grips
            laid over every clip; the guard's baton hung from its ring on every clip
  tracks    one muted NLA track per clip, named as the clip, which is what the exporter writes
  tests     the poses QUALITY-BAR section 3 asks every outfit to be tried in and no clip here covers:
            squat, overhead reach, arm across chest, sit, bend to floor. Actions called
            <who>:test-<pose>; they are in the review sheets and are never exported
  review    stills of every clip on every outfit, front and side: the poke-through sheets

Mixamo's rigs rest in a T-pose and MPFB2's in an A-pose. A bone's motion is carried over as its
world rotation away from rest; for the arms and fingers the rest it is measured from is first
turned to lie along the source's rest bone, so a T-pose arm and an A-pose arm agree (and the legs,
which MPFB2 rests a little apart). Feet, spine and head are carried rest to rest.
"""
import math
import os

import bpy
from mathutils import Matrix, Quaternion, Vector

REPO = r"C:\Users\Harrold\Desktop\Projects2\Project Nexus"
MIXAMO_DIR = os.path.join(REPO, "assets-src", "mixamo")
REVIEW_DIR = os.path.join(REPO, ".cache", "twin-people-review")
FPS = 30

# mixamo file (without .fbx) -> clip
MIXAMO = {
    "atlas_breathing_idle": "idle",
    "atlas_neutral_idle": "idleShift",
    "atlas_walk": "walk",
    "atlas_explain_one": "talk",
    "atlas_explain_two": "talk2",
    "atlas_point_forward": "point",
    "atlas_present_side": "waveThrough",
    "atlas_nod_listen": "listen",
    "atlas_acknowledge": "acknowledge",
    "atlas_look_around": "lookAround",
    "atlas_wave": "wave",
    # the owner's downloads of 2026-10-14 (reference/mixamo-clips.md)
    "twin_walk_start": "walkStart",
    "twin_walk_stop": "walkStop",
    "twin_turn_left_90": "turnLeft",
    "twin_turn_right_90": "turnRight",
    "twin_turn_180": "turn180",
    "twin_stand_to_sit": "sitDown",
    "twin_sit_idle": "sit",
    "twin_sit_to_stand": "standUp",
    "twin_squat": "squat",
    "twin_pick_up": "pickUp",
    "twin_reach_up": "reachUp",
}
# Clips retargeted for the review sheets and the fit test but not shipped yet: nothing in the slice
# plays them, and every clip is download (P08 ships them in shared clip files).
REVIEW_ONLY = {"sitDown", "sit", "standUp", "squat", "pickUp", "reachUp"}
# Only the men who walk in the slice ship the clips that set off, stop and turn (and their curves);
# the others keep them for the review sheets. Download per person may not grow (P02d step 8).
LOCOMOTION = {"walkStart", "walkStop", "turnLeft", "turnRight", "turn180"}
WALKERS = ("guard",)
# What each man ships: the clips his part in the gate's loop plays, and his idles (sim/gate-scene.ts).
# The rest stay in the master scene for the review sheets; P08's shared clip files bring them back.
SHIPPED = {
    "guard": {"idle", "idleShift", "walk", "talk", "barrier", "barrierDown", "waveOnLeft", "waveOnRight"} | LOCOMOTION,
    "engineer": {"idle", "idleShift", "talk", "talk2", "tablet", "listen", "point"},
    "labourer": {"idle", "idleShift", "restShovel", "shovel"},
    "driver": {"drive"},  # (P02f: he only sits at the wheel; the runtime turns his head to the guard)
}
# Clips that move the man: their travel (metres forward) or turn (radians to his left) is taken out
# of the hips and handed to the runtime as a curve, so the script that places him moves him exactly
# as far as his feet go (LOD0 extras `twin_travel`, `twin_turn`; one value a frame at 30 fps).
ROOT = {"walkStart": "travel", "walkStop": "travel", "turnLeft": "turn", "turnRight": "turn", "turn180": "turn"}
# Clips played once (not looped): the baton settles from where it hangs instead of wrapping round
ONCE = {"barrier", "barrierDown", "walkStart", "walkStop", "turnLeft", "turnRight", "turn180", "sitDown", "standUp", "pickUp",
        "reachUp", "tablet", "point", "waveThrough", "waveOnLeft", "waveOnRight", "acknowledge", "wave"}
PEOPLE = ("guard", "engineer", "labourer", "driver")
# (P02f) clips to retarget when only some are wanted (the driver needs his sitting pose alone)
ONLY_CLIPS = globals().get("ONLY_CLIPS")
ALIGNED = ("Shoulder", "Arm", "ForeArm", "Hand")  # bones whose rest differs between a T-pose and an A-pose

scene = bpy.context.scene
vl = bpy.context.view_layer


def short(name):
    for p in ("mixamorig:", "mixamorig_", "mixamorig"):
        if name.startswith(p):
            return name[len(p):]
    return name


def rig_of(who):
    return bpy.data.objects[f"{who}.rig"]


def bind(obj, action):
    if obj.animation_data is None:
        obj.animation_data_create()
    obj.animation_data.action = action
    if action is not None and getattr(action, "slots", None) is not None:
        if len(action.slots) == 0:
            action.slots.new(id_type="OBJECT", name=obj.name)
        obj.animation_data.action_slot = action.slots[0]


def reset_pose(rig):
    for pb in rig.pose.bones:
        pb.rotation_mode = "QUATERNION"
        pb.rotation_quaternion = Quaternion()
        pb.location = Vector((0, 0, 0))
        pb.scale = Vector((1, 1, 1))


def clip_action(who, clip):
    return bpy.data.actions.get(f"{who}:{clip}")


def new_action(who, clip):
    old = clip_action(who, clip)
    if old:
        bpy.data.actions.remove(old)
    act = bpy.data.actions.new(f"{who}:{clip}")
    act.use_fake_user = True
    return act


def key_pose(rig, frame, bones=None):
    for pb in rig.pose.bones:
        if bones is not None and pb.name not in bones:
            continue
        pb.keyframe_insert("rotation_quaternion", frame=frame)
    rig.pose.bones["mixamorig:Hips"].keyframe_insert("location", frame=frame)


# ---- retarget ----------------------------------------------------------------------------------------
def retarget(who, src, action, clip):
    tgt = rig_of(who)
    by_short = {short(b.name): b.name for b in tgt.data.bones}
    rest = {b.name: b.matrix_local.copy() for b in tgt.data.bones}
    world3 = tgt.matrix_world.to_3x3().normalized()
    order = [b.name for b in tgt.data.bones]
    pairs = {b.name: by_short[short(b.name)] for b in src.data.bones if short(b.name) in by_short}
    s_hips = next(n for n in pairs if short(n) == "Hips")
    s_rest = {b.name: (src.matrix_world @ b.matrix_local).to_3x3().normalized() for b in src.data.bones}
    # the rest each target bone's motion is measured from. A bone's direction is taken from its
    # joint to its child's joint: an imported FBX bone's own axes say nothing about where it points.
    def along(arm, name):
        b = arm.data.bones[name]
        kids = [c for c in b.children if short(c.name) in by_short]
        mid = next((c for c in kids if "Middle" in c.name), None)
        child = mid or (kids[0] if len(kids) == 1 else None)
        if child is not None:
            d = arm.matrix_world.to_3x3() @ (child.head_local - b.head_local)
        elif b.parent is not None:
            d = arm.matrix_world.to_3x3() @ (b.head_local - b.parent.head_local)
        else:
            return None
        return d.normalized() if d.length > 1e-6 else None

    ref = {}
    for sname, tname in pairs.items():
        r = (world3 @ rest[tname].to_3x3()).normalized()
        key = short(sname)
        # (not the collar bones: turned to match, they shrugged his shoulders and held the arms away from the body)
        if any(k in key for k in ("Arm", "Hand", "UpLeg", "Leg")) and "Foot" not in key and "Shoulder" not in key:
            have, want = along(tgt, tname), along(src, sname)
            if have is not None and want is not None:
                r = have.rotation_difference(want).to_matrix() @ r
        ref[tname] = r
    src_hip_rest = src.matrix_world @ src.data.bones[s_hips].head_local
    hips = by_short["Hips"]
    scale = (tgt.matrix_world @ tgt.data.bones[hips].head_local).z / max(1e-6, src_hip_rest.z)

    bind(src, action)
    f0, f1 = int(round(action.frame_range[0])), int(round(action.frame_range[1]))
    out = new_action(who, clip)
    reset_pose(tgt)
    bind(tgt, out)
    root = ROOT.get(clip)
    curve = []
    facing0 = None
    turned = 0.0
    for f in range(f0, f1 + 1):
        scene.frame_set(f)
        vl.update()
        strip = Matrix.Identity(3)
        if root == "turn":
            # his facing, from the hips, unwrapped: the whole pose is turned back by it
            facing = (src.matrix_world @ src.pose.bones[s_hips].matrix).to_3x3() @ Vector((0, 0, 1))
            facing = Vector((facing.x, facing.y, 0)).normalized()
            if facing0 is None:
                facing0, last = facing, facing
            step = math.atan2(last.cross(facing).z, last.dot(facing))
            turned += step
            last = facing
            curve.append(round(turned, 5))
            strip = Matrix.Rotation(-turned, 3, "Z")
        want = {}
        for sname, tname in pairs.items():
            now = (src.matrix_world @ src.pose.bones[sname].matrix).to_3x3().normalized()
            want[tname] = strip @ ((now @ s_rest[sname].inverted()) @ ref[tname])
        pose_rot = {}
        for name in order:
            b = tgt.data.bones[name]
            r = rest[name].to_3x3()
            inherited = pose_rot[b.parent.name] @ rest[b.parent.name].to_3x3().inverted() @ r if b.parent else r
            pb = tgt.pose.bones[name]
            if name in want:
                desired = world3.inverted() @ want[name]
                q = (inherited.inverted() @ desired).to_quaternion()
                if f > f0 and pb.rotation_quaternion.dot(q) < 0:
                    q.negate()
                pb.rotation_quaternion = q
                pb.keyframe_insert("rotation_quaternion", frame=f - f0)
                pose_rot[name] = desired
            else:
                pose_rot[name] = inherited
        offset = ((src.matrix_world @ src.pose.bones[s_hips].matrix.to_translation()) - src_hip_rest) * scale
        offset = strip @ offset
        if root == "travel":  # (forward is -Y: the distance goes to the curve, the hips stay over the feet)
            curve.append(round(-offset.y, 5))
            offset.y = 0.0
        hp = tgt.pose.bones[hips]
        hp.location = rest[hips].to_3x3().inverted() @ (world3.inverted() @ offset)
        hp.keyframe_insert("location", frame=f - f0)
    if root:
        curves = dict(tgt.get(f"twin_{root}", {}))
        curves[clip] = curve
        tgt[f"twin_{root}"] = curves
        print(f"[clips] {who}:{clip} {root} {curve[-1]:+.3f} {'m' if root == 'travel' else 'rad'}")
    return f1 - f0 + 1


def stage_retarget(people):
    for key, clip in MIXAMO.items():
        if ONLY_CLIPS and clip not in ONLY_CLIPS:
            continue
        path = os.path.join(MIXAMO_DIR, key + ".fbx")
        if not os.path.exists(path):
            print("[clips] missing", path)
            continue
        before, acts_before = set(bpy.data.objects), set(bpy.data.actions)
        bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=False, use_anim=True)
        new = [o for o in bpy.data.objects if o not in before]
        src = next(o for o in new if o.type == "ARMATURE")
        acts = [a for a in bpy.data.actions if a not in acts_before]
        action = (src.animation_data and src.animation_data.action) or acts[0]
        for who in people:
            n = retarget(who, src, action, clip)
            print(f"[clips] {who}:{clip} {n} frames")
        for o in new:
            bpy.data.objects.remove(o, do_unlink=True)
        for a in acts:
            bpy.data.actions.remove(a)
        for arm in [a for a in bpy.data.armatures if a.users == 0]:
            bpy.data.armatures.remove(arm)
    for who in people:
        bind(rig_of(who), None)
        reset_pose(rig_of(who))


# ---- posing helpers for the authored clips ---------------------------------------------------------
class Poser:
    """Poses one rig in its own space (the rig stands at the origin, facing -Y, Z up)."""

    def __init__(self, who):
        self.who = who
        self.rig = rig_of(who)
        self.M = self.rig.matrix_world.copy()
        self.Mi = self.M.inverted()

    def pb(self, name):
        return self.rig.pose.bones["mixamorig:" + name]

    def head(self, name):
        return self.M @ self.pb(name).head

    def tail(self, name):
        return self.M @ self.pb(name).tail

    def turn(self, name, R):
        """Turn a bone by a world rotation about its own head."""
        pb = self.pb(name)
        vl.update()
        mw = self.M @ pb.matrix
        new = (R.to_3x3() @ mw.to_3x3()).to_4x4()
        new.translation = mw.translation
        pb.matrix = self.Mi @ new
        vl.update()

    def turn_axis(self, name, axis, degrees):
        self.turn(name, Matrix.Rotation(math.radians(degrees), 3, Vector(axis).normalized()))

    def aim(self, name, direction):
        """Swing a bone so it points along a world direction (least rotation)."""
        pb = self.pb(name)
        vl.update()
        have = ((self.M @ pb.matrix).to_3x3() @ Vector((0, 1, 0))).normalized()
        self.turn(name, have.rotation_difference(Vector(direction).normalized()).to_matrix())

    def reach(self, side, target, pole, hand=None):
        """
        Two-bone solve: put the wrist of the `side` arm on `target`, the elbow towards `pole`
        (a direction). `hand` = (fingers direction, palm direction) orients the hand.
        """
        upper, fore, hand_b = f"{side}Arm", f"{side}ForeArm", f"{side}Hand"
        vl.update()
        S = self.head(upper)
        l1 = (self.head(fore) - S).length
        l2 = (self.head(hand_b) - self.head(fore)).length
        T = Vector(target)
        d = max(1e-4, min((T - S).length, (l1 + l2) * 0.999))
        n = (T - S).normalized()
        a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
        h = math.sqrt(max(0.0, l1 * l1 - a * a))
        u = Vector(pole) - n * Vector(pole).dot(n)
        u = u.normalized() if u.length > 1e-5 else n.orthogonal().normalized()
        E = S + n * a + u * h
        self.aim(upper, E - S)
        self.aim(fore, (S + n * d) - self.head(fore))
        if hand:
            self.hand(side, *hand)

    def solve(self, upper, fore, end, target, pole):
        """Two-bone solve for any limb: the joint `end` goes to `target`, the middle joint towards `pole`."""
        vl.update()
        S = self.head(upper)
        l1 = (self.head(fore) - S).length
        l2 = (self.head(end) - self.head(fore)).length
        T = Vector(target)
        d = max(1e-4, min((T - S).length, (l1 + l2) * 0.999))
        n = (T - S).normalized()
        a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
        h = math.sqrt(max(0.0, l1 * l1 - a * a))
        u = Vector(pole) - n * Vector(pole).dot(n)
        u = u.normalized() if u.length > 1e-5 else n.orthogonal().normalized()
        self.aim(upper, (S + n * a + u * h) - S)
        self.aim(fore, (S + n * d) - self.head(fore))

    def crouch(self, drop, back=0.0, tilt=0.0):
        """Lower the hips by `drop` metres (shift them back, tip them forward by `tilt` degrees) with both feet staying planted."""
        vl.update()
        feet = {side: ((self.M @ self.pb(f"{side}Foot").matrix).copy()) for side in ("Left", "Right")}
        hips = self.pb("Hips")
        mw = self.M @ hips.matrix
        at = mw.translation + Vector((0, back, -drop))
        mw = (Matrix.Rotation(math.radians(tilt), 3, Vector((1, 0, 0))) @ mw.to_3x3()).to_4x4()
        mw.translation = at
        hips.matrix = self.Mi @ mw
        vl.update()
        for side, was in feet.items():
            self.solve(f"{side}UpLeg", f"{side}Leg", f"{side}Foot", was.translation, (0.25 if side == "Left" else -0.25, -1, 0.1))
            vl.update()
            foot = self.pb(f"{side}Foot")
            now = self.M @ foot.matrix
            keep = was.to_3x3().to_4x4()
            keep.translation = now.translation
            foot.matrix = self.Mi @ keep
            vl.update()

    def hand(self, side, fingers, palm, amount=1.0):
        """Point the fingers along one direction with the palm facing another (`amount` blends from the pose it had)."""
        name = f"{side}Hand"
        if amount < 1.0:
            before = self.pb(name).rotation_quaternion.copy()
            self.hand(side, fingers, palm)
            vl.update()
            after = self.pb(name).rotation_quaternion.copy()
            if before.dot(after) < 0:
                after.negate()
            self.pb(name).rotation_quaternion = before.slerp(after, max(0.0, amount))
            vl.update()
            return
        self.aim(name, fingers)
        vl.update()
        pb = self.pb(name)
        m = (self.M @ pb.matrix).to_3x3()
        f = (m @ Vector((0, 1, 0))).normalized()
        now = self.palm(side)
        want = Vector(palm) - f * Vector(palm).dot(f)
        if want.length < 1e-5:
            return
        now = now - f * now.dot(f)
        angle = now.angle(want.normalized())
        if now.cross(want).dot(f) < 0:
            angle = -angle
        self.turn(name, Matrix.Rotation(angle, 3, f))

    def palm(self, side):
        vl.update()
        wrist = self.head(f"{side}Hand")
        fingers = (self.head(f"{side}HandMiddle1") - wrist).normalized()
        across = (self.head(f"{side}HandIndex1") - self.head(f"{side}HandPinky1")).normalized()
        return (across.cross(fingers) if side == "Right" else fingers.cross(across)).normalized()

    def curl(self, side, degrees, thumb=None, spread=0.0):
        """Bend the fingers towards the palm: degrees per joint, a number or (first, second, third)."""
        per = degrees if isinstance(degrees, (tuple, list)) else (degrees, degrees, degrees)
        for finger in ("Index", "Middle", "Ring", "Pinky"):
            for j in (1, 2, 3):
                name = f"{side}Hand{finger}{j}"
                vl.update()
                pb = self.pb(name)
                d = ((self.M @ pb.matrix).to_3x3() @ Vector((0, 1, 0))).normalized()
                axis = d.cross(self.palm(side)) if j == 1 else self._axis
                if j == 1:
                    self._axis = axis.normalized()
                self.turn(name, Matrix.Rotation(math.radians(per[j - 1]), 3, self._axis))
        if thumb is not None:
            for j, deg in zip((1, 2, 3), thumb):
                name = f"{side}HandThumb{j}"
                vl.update()
                pb = self.pb(name)
                d = ((self.M @ pb.matrix).to_3x3() @ Vector((0, 1, 0))).normalized()
                axis = d.cross(self.palm(side)).normalized()
                self.turn(name, Matrix.Rotation(math.radians(deg), 3, axis))


def sample_base(who, clip, frame):
    """Put the rig in the pose of a retargeted clip at a frame (looping)."""
    rig = rig_of(who)
    act = clip_action(who, clip)
    n = int(act.frame_range[1] - act.frame_range[0])
    bind(rig, act)
    scene.frame_set(int(act.frame_range[0]) + frame % max(1, n))
    vl.update()
    pose = {pb.name: (pb.rotation_quaternion.copy(), pb.location.copy()) for pb in rig.pose.bones}
    return pose


def author(who, clip, frames, base, pose_fn, loop=True):
    """
    Bake a clip: each frame starts from `base` (a retargeted clip, looping) and `pose_fn(poser, t, frame)`
    poses over it; t runs 0 to 1 over the clip.
    """
    rig = rig_of(who)
    poses = [sample_base(who, base, f) for f in range(frames + 1)]
    out = new_action(who, clip)
    bind(rig, None)
    poser = Poser(who)
    stored = []
    for f in range(frames + 1):
        for pb in rig.pose.bones:
            q, loc = poses[f][pb.name]
            pb.rotation_quaternion = q
            pb.location = loc
        vl.update()
        pose_fn(poser, f / frames, f)
        vl.update()
        stored.append({pb.name: (pb.rotation_quaternion.copy(), pb.location.copy()) for pb in rig.pose.bones})
    if loop:  # the last frame is the first again
        stored[-1] = stored[0]
    bind(rig, out)
    prev = {}
    for f, pose in enumerate(stored):
        for pb in rig.pose.bones:
            q, loc = pose[pb.name]
            if pb.name in prev and prev[pb.name].dot(q) < 0:
                q = -q
            prev[pb.name] = q
            pb.rotation_quaternion = q
            pb.location = loc
        key_pose(rig, f)
    bind(rig, None)
    reset_pose(rig)
    print(f"[clips] {who}:{clip} authored, {frames + 1} frames")


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def window(t, a, b, c, d):
    """0 before a, rising to 1 at b, holding to c, back to 0 at d."""
    return smooth((t - a) / max(1e-6, b - a)) * (1 - smooth((t - c) / max(1e-6, d - c)))


def overlay_hands(who, grips):
    """Lay fixed finger poses over every clip of a man: {side: fn(poser)} (a hand that holds something)."""
    rig = rig_of(who)
    poser = Poser(who)
    wanted = {}
    reset_pose(rig)
    bind(rig, None)
    vl.update()
    for side, fn in grips.items():
        fn(poser)
        vl.update()
        for pb in rig.pose.bones:
            if pb.name.startswith(f"mixamorig:{side}Hand") and pb.name != f"mixamorig:{side}Hand":
                wanted[pb.name] = pb.rotation_quaternion.copy()
    reset_pose(rig)
    for act in [a for a in bpy.data.actions if a.name.startswith(who + ":")]:
        bind(rig, act)
        f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
        for name, q in wanted.items():
            pb = rig.pose.bones[name]
            for f in range(f0, f1 + 1):
                pb.rotation_quaternion = q
                pb.keyframe_insert("rotation_quaternion", frame=f)
    bind(rig, None)
    reset_pose(rig)


def overlay_window(who, clip, fn, amount):
    """Pose fingers over one clip: fn(poser, k) with k = amount(t) at each frame, keyed on the fingers only."""
    rig = rig_of(who)
    act = clip_action(who, clip)
    poser = Poser(who)
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    fingers = [pb for pb in rig.pose.bones if "Hand" in pb.name and not pb.name.endswith("Hand")]
    bind(rig, act)
    rest = {pb.name: Quaternion() for pb in fingers}
    for f in range(f0, f1 + 1):
        scene.frame_set(f)
        for pb in fingers:
            pb.rotation_quaternion = rest[pb.name]
        vl.update()
        fn(poser, amount((f - f0) / max(1, f1 - f0)))
        vl.update()
        for pb in fingers:
            pb.keyframe_insert("rotation_quaternion", frame=f)
    bind(rig, None)
    reset_pose(rig)


# ---- the authored clips ----------------------------------------------------------------------------
def grip_shaft(p):
    p.curl("Right", (62, 78, 55), thumb=(18, 22, 30))


def grip_tablet(p):
    p.curl("Left", (4, 6, 4), thumb=(0, 8, 10))


def author_engineer(who):
    def tablet(p, t, f):
        k = window(t, 0.0, 0.14, 0.86, 1.0)
        chest = p.head("Spine2")
        # the left forearm comes up across the body, the tablet's screen tilted to the face
        rest_wrist = p.head("LeftHand").copy()
        up = Vector((0.10, -0.31, chest.z + 0.03))
        p.turn_axis("Spine", (-1, 0, 0), -6 * k)  # (the recorded idle stands leaning back: he comes forward over the tablet)
        p.turn_axis("Spine1", (-1, 0, 0), -5 * k)
        p.turn_axis("Neck", (-1, 0, 0), -12 * k)
        p.turn_axis("Head", (-1, 0, 0), -15 * k + 2.0 * math.sin(t * math.pi * 6) * k)
        p.turn_axis("Head", (0, 0, 1), 6 * k)
        p.reach("Left", rest_wrist.lerp(up, k), (0.6, 0.25, -1.0))
        # (fingers towards his right, the palm up and a little towards him: the tablet lies on the hand)
        p.hand("Left", (-0.92, -0.3, 0.12), (0.0, 0.45, 0.9), amount=k)
        # the right hand comes over, taps and swipes
        tap = window(t, 0.2, 0.32, 0.72, 0.84)
        if tap > 0.005:
            rest_r = p.head("RightHand").copy()
            over = Vector((-0.06 + 0.035 * math.sin(t * math.pi * 9), -0.36, chest.z + 0.075 + 0.012 * abs(math.sin(t * math.pi * 14))))
            p.reach("Right", rest_r.lerp(over, tap), (-0.7, 0.3, -1.0))
            p.hand("Right", (0.55, -0.45, -0.6), (0.1, -0.3, -0.95), amount=tap)

    author(who, "tablet", 8 * FPS, "idle", tablet, loop=False)


# The barrier at the gate, as the zone has it (kit.boom-arm in the master scene; sim/gate-scene.ts):
# the arm turns about its pivot 0.94 m above where the guard stands (1.06 m above the ground, and he
# stands on the booth's 12 cm apron step there: walk map, bake_walkmap.py); the counterweight is a
# block behind the pivot from 0.62 to 0.98 m along the arm, 0.24 m wide, its top 0.06 m above the pivot.
# The guard stands 0.62 m from the arm's line, facing the point 0.75 m behind the pivot, which is at his
# right hand. The boom rises 82 degrees over 2.2 s, starting 1.1 s into his clip (BARRIER_CLIP, BOOM_UP).
BOOM = {"pivot_h": 0.94, "ahead": 0.75, "stand": 0.62, "top": 0.06, "half": 0.12, "up": 82.0, "start": 1.1, "seconds": 2.2}
BARRIER_SECONDS = 4.5


def boom_angle(ts, lowering):
    """Degrees the arm stands up `ts` seconds into the guard's clip."""
    e = smooth((ts - BOOM["start"]) / BOOM["seconds"])
    return BOOM["up"] * (1 - e if lowering else e)


def on_counterweight(along, inward, up, degrees):
    """
    A point on the counterweight (metres along the arm from the pivot, negative behind it; towards the
    guard from the arm's line; up from the pivot), in the guard's own frame, with the arm at `degrees`.
    """
    r = math.radians(degrees)
    x = along * math.cos(r) - up * math.sin(r)
    z = along * math.sin(r) + up * math.cos(r)
    return Vector((-(x + BOOM["ahead"]), -(BOOM["stand"] - inward), BOOM["pivot_h"] + z))


# Lowering (P02f, owner's review): he stands beside the arm, facing it, the arm's line 0.70 m in front
# of him and the pivot 0.30 m to his left, 1.06 m above his feet (on the ground, not the apron step).
BOOM_DOWN = {"pivot_h": 1.06, "left": 0.30, "front": 0.70}


def on_arm(along, up, degrees):
    """A point on the arm (metres along it from the pivot, up from its centre line) in his frame for lowering, the arm at `degrees`."""
    r = math.radians(degrees)
    x = BOOM_DOWN["left"] - (along * math.cos(r) - up * math.sin(r))
    z = BOOM_DOWN["pivot_h"] + along * math.sin(r) + up * math.cos(r)
    return Vector((x, -BOOM_DOWN["front"], z))


GRAB = 40.0  # degrees up at which, lowering, he takes the hanging counterweight


def raise_contact(ts):
    th = boom_angle(ts, False)
    return smooth((ts - 0.25) / 0.65) * (1 - smooth((th - 20) / 12))


def lower_contact(ts):
    # (hands on before the arm moves at 1.1 s, off once it rests at 3.3 s)
    return smooth((ts - 0.3) / 0.7) * (1 - smooth((ts - 3.45) / 0.6))


def author_guard(who):
    def raising(p, t, f):
        # he takes the block from above, bears down until the arm swings up on its own, and lets go
        ts = t * BARRIER_SECONDS
        th = boom_angle(ts, False)
        c = raise_contact(ts)
        press = c * smooth((ts - 0.85) / 0.5)
        hold = min(th, 30.0)
        p.crouch(0.035 * press, back=0.01 * press)
        p.turn_axis("Spine", (-1, 0, 0), -(7 * c + 7 * press))
        p.turn_axis("Spine1", (-1, 0, 0), -(5 * c + 5 * press))
        p.turn_axis("Spine2", (-1, 0, 0), -(2 * c + 3 * press))
        p.turn_axis("Head", (-1, 0, 0), 10 * c)
        r = math.radians(hold)
        normal = Vector((math.sin(r), 0, math.cos(r)))  # the block's top, turned with the arm
        for side, along in (("Left", -0.91), ("Right", -0.69)):
            palm_at = on_counterweight(along, 0.05, BOOM["top"], hold)
            wrist = palm_at + Vector((0, 0.075, 0)) + normal * 0.028
            rest = p.head(f"{side}Hand").copy()
            s = 1 if side == "Left" else -1
            p.reach(side, rest.lerp(wrist, c), (s * 0.9, 0.5, -0.25))
            p.hand(side, (0, -1, -0.15), -normal, amount=c)

    def lowering(p, t, f):
        # (owner's review: lifting the hanging counterweight from a crouch did not read as closing)
        # He stands beside the arm, facing it, takes it in both hands as it stands up and pulls it
        # down to his waist, leaning into it, then lets go as it settles on its rest.
        ts = t * BARRIER_SECONDS
        th = boom_angle(ts, True)
        c = lower_contact(ts)
        down = 1.0 - th / BOOM["up"]
        p.crouch(0.05 * down * c, back=0.02 * down * c)
        p.turn_axis("Spine", (-1, 0, 0), -(4 + 8 * down) * c)
        p.turn_axis("Spine1", (-1, 0, 0), -(3 + 6 * down) * c)
        p.turn_axis("Spine2", (-1, 0, 0), -(2 + 3 * down) * c)
        p.turn_axis("Spine1", (0, 0, 1), -6 * c)  # (a little to his right, where his right hand pulls)
        p.turn_axis("Head", (-1, 0, 0), (8 + 6 * down) * c)
        r = math.radians(th)
        top = Vector((math.sin(r), 0, math.cos(r)))  # the arm's top face, turned with it
        for side, along in (("Left", 0.14), ("Right", 0.44)):
            grip = on_arm(along, 0.045, th)
            fingers = Vector((0, -1, 0))  # (over the arm, away from him)
            fingers = (fingers - top * fingers.dot(top)).normalized()
            wrist = grip - fingers * 0.06 + top * 0.03
            rest = p.head(f"{side}Hand").copy()
            s = 1 if side == "Left" else -1
            p.reach(side, rest.lerp(wrist, c), (s * 0.55, 0.35, -0.75))
            p.hand(side, fingers, -top, amount=c)

    author(who, "barrier", int(BARRIER_SECONDS * FPS), "idle", raising, loop=False)
    author(who, "barrierDown", int(BARRIER_SECONDS * FPS), "idle", lowering, loop=False)
    # fingers: flat on the block's top raising; wrapped round its ends lowering
    overlay_window("guard", "barrier", lambda p, k: (p.curl("Left", (10 * k, 14 * k, 8 * k), thumb=(4 * k, 6 * k, 6 * k)), p.curl("Right", (10 * k, 14 * k, 8 * k), thumb=(4 * k, 6 * k, 6 * k))), lambda t: raise_contact(t * BARRIER_SECONDS))
    overlay_window("guard", "barrierDown", lambda p, k: (p.curl("Left", (45 * k, 60 * k, 40 * k), thumb=(20 * k, 25 * k, 25 * k)), p.curl("Right", (45 * k, 60 * k, 40 * k), thumb=(20 * k, 25 * k, 25 * k))), lambda t: lower_contact(t * BARRIER_SECONDS))
    for side in ("Left", "Right"):
        author(who, f"waveOn{side}", int(WAVE_SECONDS * FPS), "idle", lambda p, t, f, side=side: wave_on(p, t, side), loop=False)
        overlay_window("guard", f"waveOn{side}", lambda p, k, side=side: p.curl(side, (6 * k, 8 * k, 6 * k), thumb=(0, 4 * k, 4 * k)), lambda t: wave_raise(t * WAVE_SECONDS))


# ---- waving a vehicle through (P02f, owner's review) ----------------------------------------------------
# He faces the driver and sweeps the arm on the side the vehicle will pass him on, open hand leading,
# from pointing at the driver round to the way through, twice, then lowers it. `waveOnLeft` uses his
# left arm (the vehicle goes off to his left), `waveOnRight` his right; sim/gate-scene.ts picks one
# from where the vehicle goes. (Mixamo's "present to the side", used before, points nowhere in particular.)
WAVE_SECONDS = 3.4


def wave_raise(ts):
    """How far the arm is up: raised over the first half second, lowered over the last 0.7 s."""
    return smooth(ts / 0.5) * (1 - smooth((ts - (WAVE_SECONDS - 0.7)) / 0.7))


def wave_sweep(ts):
    """0 pointing at the driver, 1 swept round to the way through: out, back part way, out again."""
    if ts < 0.5:
        return 0.0
    if ts < 1.3:
        return smooth((ts - 0.5) / 0.8)
    if ts < 1.8:
        return 1.0 - 0.6 * smooth((ts - 1.3) / 0.5)
    if ts < 2.6:
        return 0.4 + 0.6 * smooth((ts - 1.8) / 0.8)
    return 1.0


def wave_on(p, t, side):
    ts = t * WAVE_SECONDS
    up = wave_raise(ts)
    k = wave_sweep(ts)
    s = 1 if side == "Left" else -1  # (he faces -Y: his left is +X)
    toward = Vector((s * 0.35, -1.0, -0.12)).normalized()  # at the driver, in front of him
    through = Vector((s * 1.0, 0.45, -0.2)).normalized()  # round to the side, a little behind: the way through
    d = toward.lerp(through, k).normalized()
    # his body goes with the arm a little, and his eyes follow the hand
    p.turn_axis("Spine1", (0, 0, 1), s * 9 * k * up)
    p.turn_axis("Neck", (0, 0, 1), s * 12 * k * up)
    p.turn_axis("Head", (0, 0, 1), s * 16 * k * up)
    shoulder = p.head(f"{side}Arm")
    rest = p.head(f"{side}Hand").copy()
    wrist = shoulder + d * 0.56
    p.reach(side, rest.lerp(wrist, up), (s * 0.2, 0.45, -1.0))
    # open hand, fingers out along the arm and a little up, the palm leading the sweep
    fingers = (d + Vector((0, 0, 0.18))).normalized()
    lead = (through - toward)
    palm = (lead - fingers * lead.dot(fingers)).normalized()
    p.hand(side, fingers, palm, amount=up)



def hang_baton(who):
    """
    The baton swings from its ring: on every clip of the man, a damped pendulum keeps it hanging
    towards the ground, never more than 40 degrees off the line of his hips (the ring holds it).
    """
    rig = rig_of(who)
    name = "mixamorig:Baton"
    if name not in rig.pose.bones:
        return
    poser = Poser(who)
    hips_pb = rig.pose.bones["mixamorig:Hips"]
    b = rig.data.bones[name]
    hang_rest = (rig.data.bones["mixamorig:Hips"].matrix_local.to_3x3().inverted() @ (b.tail_local - b.head_local)).normalized()
    down = Vector((0, 0, -1))
    dt = 1.0 / FPS
    for act in [a for a in bpy.data.actions if a.name.startswith(who + ":")]:
        clip = act.name.split(":", 1)[1]
        bind(rig, act)
        f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
        frames = list(range(f0, f1 + 1))
        looping = clip not in ONCE and not clip.startswith("test-")
        hips_down = []
        for f in frames:
            scene.frame_set(f)
            vl.update()
            hips_down.append(((poser.M @ hips_pb.matrix).to_3x3() @ hang_rest).normalized())
        aim, vel = None, Vector()
        for pass_ in range(3 if looping else 1):
            dirs = []
            for hd in hips_down:
                target = down
                if hd.angle(target) > math.radians(40):
                    target = hd.slerp(down, math.radians(40) / hd.angle(down))
                if aim is None:
                    aim = target.copy()
                vel += (target - aim) * 70 * dt - vel * 9 * dt
                aim = (aim + vel * dt).normalized()
                if aim.angle(hd) > math.radians(45):
                    aim = hd.slerp(aim, math.radians(45) / aim.angle(hd))
                dirs.append(aim.copy())
        for f, d in zip(frames, dirs):
            scene.frame_set(f)
            pb = rig.pose.bones[name]
            pb.rotation_quaternion = Quaternion()
            vl.update()
            poser.aim("Baton", d)
            pb.keyframe_insert("rotation_quaternion", frame=f)
    bind(rig, None)
    reset_pose(rig)
    print(f"[clips] {who}: baton hung on every clip")


def author_labourer(who):
    rig = rig_of(who)
    shovel = next(o for o in bpy.data.objects if o.name.startswith(f"{who}.shovel"))
    grip_tip = float(shovel["twin_grip_from_tip"]) * float(rig.get("twin_scaled", 1.0))
    reset_pose(rig)
    vl.update()
    p0 = Poser(who)
    palm0, fingers0 = p0.palm("Right"), (p0.head("RightHandMiddle1") - p0.head("RightHand")).normalized()
    axis0 = Vector(shovel["twin_axis"]).normalized()  # from the grip towards the blade, rest pose
    # the shaft's direction in the hand's own frame, so any hand pose gives the shaft
    hand_rest = (p0.M @ p0.pb("RightHand").matrix).to_3x3()
    axis_local = hand_rest.inverted() @ axis0
    grip_local = (p0.M @ p0.pb("RightHand").matrix).inverted() @ (Vector(shovel["twin_grip"]) * float(rig.get("twin_scaled", 1.0)))

    def shaft_to(p, down):
        """Turn the right hand so the shaft points along `down` (towards the blade)."""
        vl.update()
        m = (p.M @ p.pb("RightHand").matrix).to_3x3()
        have = (m @ axis_local).normalized()
        p.turn("RightHand", have.rotation_difference(Vector(down).normalized()).to_matrix())

    def grip_at(p):
        vl.update()
        return p.M @ p.pb("RightHand").matrix @ grip_local

    def hold(p, point, down, pole):
        """Put the gripping hand so the shaft passes through `point` along `down`: solve twice, the hand's turn moves the grip."""
        for _ in range(3):
            shaft_to(p, down)
            vl.update()
            wrist = p.head("RightHand")
            offset = grip_at(p) - wrist
            p.reach("Right", Vector(point) - offset, pole)
        shaft_to(p, down)

    def rest_shovel(p, t, f):
        # the blade stands on the ground beside his right foot; the hand rests on the shaft
        foot = Vector((-0.34, -0.2, 0.0))
        down = Vector((0.05, 0.1, -1.0)).normalized()
        point = foot - down * grip_tip
        hold(p, point, down, (-0.7, 0.4, -0.5))

    author(who, "restShovel", 4 * FPS, "idle", rest_shovel, loop=True)

    # one cycle of digging, as key poses round the loop: (time, blade tip, shaft direction towards the
    # blade, forward bend in degrees, twist to his left in degrees, how far the hips drop)
    KEYS = [
        (0.00, (0.05, -0.60, 0.10), (0.10, -0.45, -0.89), 24, 0, 0.05),
        (0.18, (0.05, -0.72, -0.05), (0.10, -0.50, -0.86), 40, -4, 0.13),
        (0.34, (0.05, -0.70, 0.02), (0.10, -0.74, -0.67), 33, -2, 0.13),
        (0.52, (0.12, -0.62, 0.40), (0.20, -0.90, -0.38), 20, 6, 0.06),
        (0.68, (0.42, -0.84, 0.64), (0.65, -0.72, -0.25), 13, 24, 0.03),
        (0.84, (0.12, -0.58, 0.22), (0.16, -0.50, -0.85), 20, 4, 0.04),
        (1.00, (0.05, -0.60, 0.10), (0.10, -0.45, -0.89), 24, 0, 0.05),
    ]
    SPACING = 0.36 * float(rig.get("twin_scaled", 1.0))  # between his hands on the shaft

    def keyed(t):
        for a, b in zip(KEYS, KEYS[1:]):
            if t <= b[0]:
                k = smooth((t - a[0]) / (b[0] - a[0]))
                tip = Vector(a[1]).lerp(Vector(b[1]), k)
                down = Vector(a[2]).normalized().lerp(Vector(b[2]).normalized(), k).normalized()
                return tip, down, a[3] + (b[3] - a[3]) * k, a[4] + (b[4] - a[4]) * k, a[5] + (b[5] - a[5]) * k
        return Vector(KEYS[0][1]), Vector(KEYS[0][2]).normalized(), KEYS[0][3], KEYS[0][4], KEYS[0][5]

    def dig(p, t, f):
        tip, down, bend, twist, drop = keyed(t)
        p.crouch(drop, back=drop * 0.5)
        p.turn_axis("Spine", (-1, 0, 0), -bend * 0.45)
        p.turn_axis("Spine1", (-1, 0, 0), -bend * 0.35)
        p.turn_axis("Spine2", (-1, 0, 0), -bend * 0.2)
        p.turn_axis("Spine1", (0, 0, 1), twist * 0.5)
        p.turn_axis("Spine2", (0, 0, 1), twist * 0.5)
        p.turn_axis("Neck", (-1, 0, 0), bend * 0.3)
        p.turn_axis("Head", (-1, 0, 0), bend * 0.25)
        hold(p, tip - down * grip_tip, down, (-0.8, 0.5, 0.1))
        # the left hand lower on the shaft, wrapped round it from his left
        vl.update()
        on_shaft = grip_at(p) + down * SPACING
        fingers = down.cross(Vector((0, 0, 1)))
        fingers = (fingers if fingers.x < 0 else -fingers).normalized()
        palm = fingers.cross(down)
        palm = (palm if palm.z < 0 else -palm).normalized()
        wrist = on_shaft - fingers * 0.075 - palm * 0.028
        p.reach("Left", wrist, (0.9, 0.3, -0.2))
        p.hand("Left", fingers, palm)

    author(who, "shovel", int(3.2 * FPS), "idle", dig, loop=True)


def stage_tests(people):
    """The fit test's poses, each eased in over the idle, held, and eased out (2.4 s)."""
    for who in people:
        p0 = Poser(who)
        reset_pose(rig_of(who))
        vl.update()
        top = p0.head("Head").z
        chest_z = p0.head("Spine2").z

        def squat(p, t, f):
            k = window(t, 0.0, 0.4, 0.7, 1.0)
            p.crouch(0.36 * k, back=0.14 * k, tilt=14 * k)
            p.turn_axis("Spine", (-1, 0, 0), -10 * k)
            p.turn_axis("Spine1", (-1, 0, 0), -8 * k)
            for side, s in (("Left", 1), ("Right", -1)):
                rest = p.head(f"{side}Hand").copy()
                p.reach(side, rest.lerp(Vector((s * 0.2, -0.42, chest_z - 0.42)), k), (s * 0.8, 0.3, -0.5))

        def overhead(p, t, f):
            k = window(t, 0.0, 0.4, 0.7, 1.0)
            p.turn_axis("Spine2", (-1, 0, 0), 5 * k)
            for side, s in (("Left", 1), ("Right", -1)):
                rest = p.head(f"{side}Hand").copy()
                p.reach(side, rest.lerp(Vector((s * 0.2, -0.12, top + 0.42)), k), (s * 1.0, -0.2, 0.2))

        def across(p, t, f):
            a = window(t, 0.0, 0.25, 0.4, 0.55)
            b = window(t, 0.45, 0.7, 0.85, 1.0)
            rest = p.head("RightHand").copy()
            p.reach("Right", rest.lerp(Vector((0.19, -0.16, chest_z + 0.1)), a), (-0.3, -0.5, -0.8))
            rest = p.head("LeftHand").copy()
            p.reach("Left", rest.lerp(Vector((-0.19, -0.16, chest_z + 0.1)), b), (0.3, -0.5, -0.8))

        def sit(p, t, f):
            k = window(t, 0.0, 0.4, 0.7, 1.0)
            p.crouch(0.40 * k, back=0.30 * k, tilt=4 * k)
            for side, s in (("Left", 1), ("Right", -1)):
                rest = p.head(f"{side}Hand").copy()
                p.reach(side, rest.lerp(Vector((s * 0.16, -0.30, chest_z - 0.52)), k), (s * 0.8, 0.5, -0.2))

        def bend(p, t, f):
            k = window(t, 0.0, 0.4, 0.7, 1.0)
            p.crouch(0.10 * k, back=0.16 * k, tilt=52 * k)
            p.turn_axis("Spine", (-1, 0, 0), -24 * k)
            p.turn_axis("Spine1", (-1, 0, 0), -20 * k)
            p.turn_axis("Spine2", (-1, 0, 0), -12 * k)
            p.turn_axis("Head", (-1, 0, 0), 20 * k)
            for side, s in (("Left", 1), ("Right", -1)):
                rest = p.head(f"{side}Hand").copy()
                p.reach(side, rest.lerp(Vector((s * 0.17, -0.48, 0.12)), k), (s * 0.9, 0.2, 0.3))

        for name, fn in (("squat", squat), ("overhead", overhead), ("across", across), ("sit", sit), ("bend", bend)):
            author(who, f"test-{name}", int(2.4 * FPS), "idle", fn, loop=False)
    stage_author_grips(people)
    if "guard" in people:
        hang_baton("guard")


# ---- the driver (P02f) ----------------------------------------------------------------------------------
# The pickup's steering wheel (veh.pickup.a, part `steering`): rim radius 0.172 m, its axis pointing
# forwards and down at 24 degrees. Where the wheel sits against his body is stored on his LOD0
# (`twin_wheel`, the rim's centre in his own frame, Y up), and the runtime seats him so the wheel
# he holds is the pickup's.
WHEEL_R = 0.172
WHEEL_AXIS = Vector((0.0, -0.91, -0.414)).normalized()  # (his frame: he faces -Y)


def wheel_centre(p):
    """
    Where the rim's centre is for his seated pose: in front of his chest, a little below his
    shoulders. The pickup's wheel is high (1.12 m in its frame) and its roof low: with the wheel
    any lower against his body, seating him to it put his head through the roof (owner's review).
    """
    l, r = p.head("LeftArm"), p.head("RightArm")
    mid = (l + r) / 2
    return mid + Vector((0.0, -0.46, -0.08))


def author_driver(who):
    centre = {}
    # (measured in his own frame: a rig left placed in the pickup for a review would offset the wheel)
    rig_of(who).location = (0, 0, 0)
    vl.update()

    def drive(p, t, f):
        W = wheel_centre(p) if f == 0 or "W" not in centre else centre["W"]
        centre.setdefault("W", W.copy())
        n = -WHEEL_AXIS  # the wheel's face, towards him
        right = Vector((1, 0, 0))
        up = n.cross(right).normalized() * -1  # along the wheel's face, upwards
        # small corrections to the wheel, as a driver at a crawl makes
        steer = math.radians(4.0 * math.sin(t * 2 * math.pi) + 1.5 * math.sin(t * 6 * math.pi + 0.7))
        for side, s in (("Left", 1), ("Right", -1)):
            a = math.radians(60) * s + steer
            radial = (right * math.sin(a) + up * math.cos(a)).normalized()
            rim = W + radial * WHEEL_R
            wrist = rim + n * 0.035 + radial * 0.035
            p.reach(side, wrist, (s * 0.8, 0.25, -0.6))
            fingers = (-n * 0.7 - radial * 0.7).normalized()
            p.hand(side, fingers, -radial)
        # sitting easy: a little slumped, head up to the road
        p.turn_axis("Spine2", (-1, 0, 0), -3)
        p.turn_axis("Head", (-1, 0, 0), 6 + 2 * math.sin(t * 2 * math.pi * 2))

    author(who, "drive", 4 * FPS, "sit", drive, loop=True)
    overlay_window(who, "drive", lambda p, k: (p.curl("Left", (48, 62, 44), thumb=(18, 24, 20)), p.curl("Right", (48, 62, 44), thumb=(18, 24, 20))), lambda t: 1.0)
    rig = rig_of(who)
    W = centre["W"]
    rig["twin_wheel"] = [round(W.x, 4), round(W.z, 4), round(-W.y, 4)]
    print(f"[clips] {who}: wheel at {rig['twin_wheel']} (Y up, his frame)")


def stage_author_grips(people):
    """The hands that hold something keep their grip in the test poses too."""
    if "engineer" in people:
        overlay_hands("engineer", {"Left": grip_tablet})
    if "labourer" in people:
        overlay_hands("labourer", {"Right": grip_shaft})


def stage_author(people):
    if "engineer" in people:
        author_engineer("engineer")
        overlay_hands("engineer", {"Left": grip_tablet})
    if "guard" in people:
        author_guard("guard")
        hang_baton("guard")
    if "driver" in people:
        author_driver("driver")
    if "labourer" in people:
        author_labourer("labourer")
        overlay_hands("labourer", {"Right": grip_shaft})
        overlay_window("labourer", "shovel", lambda p, k: (grip_shaft(p), p.curl("Left", (58, 72, 50), thumb=(14, 20, 26))), lambda t: 1.0)


# ---- NLA tracks --------------------------------------------------------------------------------------
def stage_tracks(people):
    for who in people:
        rig = rig_of(who)
        if rig.animation_data is None:
            rig.animation_data_create()
        rig.animation_data.action = None
        for track in list(rig.animation_data.nla_tracks):
            rig.animation_data.nla_tracks.remove(track)
        names = []
        for act in sorted((a for a in bpy.data.actions if a.name.startswith(who + ":")), key=lambda a: a.name):
            clip = act.name.split(":", 1)[1]
            if clip not in SHIPPED.get(who, {clip}):  # (fit-test poses and unshipped clips are for the review sheets only)
                continue
            track = rig.animation_data.nla_tracks.new()
            track.name = clip
            strip = track.strips.new(clip, int(act.frame_range[0]), act)
            strip.name = clip
            track.mute = True
            names.append(f"{clip} {(act.frame_range[1] - act.frame_range[0]) / FPS:.2f}s")
        reset_pose(rig)
        lod0 = next((o for o in bpy.data.objects if o.name == f"{who}.a_LOD0"), None)
        if lod0 is not None:
            for key in ("twin_travel", "twin_turn"):
                if key in rig and who in WALKERS:
                    lod0[key] = {k: list(v) for k, v in rig[key].items()}
                elif key in lod0:
                    del lod0[key]
            if "twin_wheel" in rig:  # (P02f: the driver's hands are on a wheel this far from his origin)
                lod0["twin_wheel"] = list(rig["twin_wheel"])
        print(f"[clips] {who}: tracks {names}")
    scene.frame_set(0)


# ---- review stills -------------------------------------------------------------------------------------
def stage_review(people, only=None, shots=4):
    os.makedirs(REVIEW_DIR, exist_ok=True)
    review = bpy.data.scenes.get("people_review") or bpy.data.scenes.new("people_review")
    for o in list(review.collection.objects):
        review.collection.objects.unlink(o)
    for c in list(review.collection.children):
        review.collection.children.unlink(c)
    cams = {}
    for name, pos in (("front", (0.6, -3.9, 1.25)), ("side", (-3.9, -0.4, 1.25))):
        cd = bpy.data.cameras.get("review." + name) or bpy.data.cameras.new("review." + name)
        cd.lens = 55
        co = bpy.data.objects.get("review." + name) or bpy.data.objects.new("review." + name, cd)
        co.location = pos
        co.rotation_euler = (Vector((0, 0, 0.92)) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
        review.collection.objects.link(co)
        cams[name] = co
    for name, loc, energy in (("key", (2.5, -4, 4), 4.0), ("fill", (-3, -2, 2), 1.6), ("rim", (0, 4, 3), 2.0)):
        ld = bpy.data.lights.get("review." + name) or bpy.data.lights.new("review." + name, "SUN")
        ld.energy = energy
        lo = bpy.data.objects.get("review." + name) or bpy.data.objects.new("review." + name, ld)
        lo.location = loc
        lo.rotation_euler = (Vector((0, 0, 1)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        review.collection.objects.link(lo)
    world = bpy.data.worlds.get("review.world") or bpy.data.worlds.new("review.world")
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.42, 0.44, 0.46, 1)
    bg.inputs[1].default_value = 0.9
    review.world = world
    for engine in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        try:
            review.render.engine = engine
            break
        except TypeError:
            continue
    review.render.resolution_x, review.render.resolution_y = 300, 440
    review.render.image_settings.file_format = "JPEG"
    review.render.image_settings.quality = 88
    review.render.fps = FPS
    done = []
    for who in people:
        rig = rig_of(who)
        coll = next(c for c in rig.users_collection)
        if coll.name not in review.collection.children:
            review.collection.children.link(coll)
        for act in sorted((a for a in bpy.data.actions if a.name.startswith(who + ":")), key=lambda a: a.name):
            clip = act.name.split(":", 1)[1]
            if only and clip not in only:
                continue
            bind(rig, act)
            f0, f1 = act.frame_range
            for i in range(shots):
                f = f0 + (f1 - f0) * (i + 0.5) / shots
                scene.frame_set(int(f))  # (both scenes: the rig is shared, and a render of the review scene alone showed stale poses)
                review.frame_set(int(f))
                for view, cam in cams.items():
                    review.camera = cam
                    review.render.filepath = os.path.join(REVIEW_DIR, f"{who}-{clip}-{view}-{i}.jpg")
                    bpy.ops.render.render(write_still=True, scene=review.name)
            done.append(f"{who}:{clip}")
        bind(rig, None)
        reset_pose(rig)
        review.collection.children.unlink(coll)
    print("[clips] review stills:", len(done), "clips in", REVIEW_DIR)


WHO = [w for w in (globals().get("WHO") or PEOPLE)]


def include_rigs(people):
    """
    Put each man's collection in the view layer while his clips are made (a rig Blender does not
    evaluate crashes it when a bone's pose is set: seen when the master scene was saved with LIB_char
    excluded). Returns the layer collections switched, to put back afterwards.
    """
    wanted = {c.name for who in people for c in rig_of(who).users_collection}
    switched = []

    def walk(layer, chain):
        for child in layer.children:
            here = chain + [child]
            if child.name in wanted:
                for lc in here:
                    if lc.exclude:
                        lc.exclude = False
                        switched.append(lc)
            walk(child, here)

    walk(vl.layer_collection, [])
    vl.update()
    return switched


_switched = include_rigs(WHO)
if "retarget" in STAGES:  # noqa: F821
    stage_retarget(WHO)
if "author" in STAGES:  # noqa: F821
    stage_author(WHO)
if "tests" in STAGES:  # noqa: F821
    stage_tests(WHO)
if "tracks" in STAGES:  # noqa: F821
    stage_tracks(WHO)
if "review" in STAGES:  # noqa: F821
    stage_review(WHO, globals().get("ONLY"))
for _lc in _switched:  # (left as the scene was saved)
    _lc.exclude = True
