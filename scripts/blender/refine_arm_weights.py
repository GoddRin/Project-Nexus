"""Rework how the arms, sleeves and vest follow the skeleton, so a raised arm keeps its shape.

  blender -b scripts/blender/source/scic_atlas_navigator_pro_v3.blend \
      --python scripts/blender/refine_arm_weights.py -- <out.blend> [iterations] [vest_arm_keep]

What was wrong (measured in the v3 file): several hundred sleeve and body points were bound to
more than four bones (glTF keeps four and drops the rest, so those points moved wrongly in the
browser), and about 800 sleeve points were bound rigidly to one bone, which creased the sleeve at
the shoulder and the elbow when the arm went up.

What this does, on the shoulder -> upper arm -> forearm region of each skinned mesh:
  1. smooths the weights across neighbouring points (so the bend is spread over the joint);
  2. on the vest (sleeveless) hands most of the upper-arm influence back to the shoulder girdle,
     so the vest stays on the torso instead of being dragged up by the arm;
  3. keeps the four strongest bones per point and renormalises (exactly what the browser gets).
Hands and fingers are left as they are.
"""
import bpy, sys

argv = sys.argv[sys.argv.index("--") + 1:]
OUT = argv[0]
ITERATIONS = int(argv[1]) if len(argv) > 1 else 6
VEST_ARM_KEEP = float(argv[2]) if len(argv) > 2 else 0.35

P = "mixamorig_"
ARM_GROUPS = {P + s + n for s in ("Left", "Right") for n in ("Shoulder", "Arm", "ForeArm")}
TORSO = {P + "Spine", P + "Spine1", P + "Spine2", P + "Neck"}
MESHES = ("Body", "Sweatshirt", "Shirt", "Vest", "Bracelet")


def refine(obj):
    me = obj.data
    names = {g.index: g.name for g in obj.vertex_groups}
    index = {g.name: g.index for g in obj.vertex_groups}
    W = [{g.group: g.weight for g in v.groups if g.weight > 1e-4} for v in me.vertices]
    # neighbours
    nb = [[] for _ in me.vertices]
    for e in me.edges:
        a, b = e.vertices
        nb[a].append(b)
        nb[b].append(a)
    arm_idx = {i for i, n in names.items() if n in ARM_GROUPS}
    # region: points the shoulder / upper arm / forearm act on, but not the hand and fingers
    hand_idx = {i for i, n in names.items() if "Hand" in n}
    region = [
        i for i, w in enumerate(W)
        if sum(v for g, v in w.items() if g in arm_idx) > 0.05 and sum(v for g, v in w.items() if g in hand_idx) < 0.25
    ]
    region_set = set(region)

    for _ in range(ITERATIONS):
        new = {}
        for i in region:
            acc = {}
            ns = nb[i]
            if not ns:
                continue
            for j in ns:
                for g, v in W[j].items():
                    acc[g] = acc.get(g, 0.0) + v / len(ns)
            mixed = {}
            for g in set(acc) | set(W[i]):
                mixed[g] = 0.5 * W[i].get(g, 0.0) + 0.5 * acc.get(g, 0.0)
            new[i] = mixed
        for i, w in new.items():
            W[i] = w

    if obj.name == "Vest":
        for i in region:
            w = W[i]
            for side in ("Left", "Right"):
                a = index.get(P + side + "Arm")
                s = index.get(P + side + "Shoulder")
                if a is None or s is None or a not in w:
                    continue
                moved = w[a] * (1 - VEST_ARM_KEEP)
                w[a] -= moved
                w[s] = w.get(s, 0.0) + moved
            f = index.get(P + "LeftForeArm"), index.get(P + "RightForeArm")
            for g in f:  # a vest has nothing to do with the forearm
                if g is not None and g in w:
                    sp = index.get(P + "Spine2")
                    if sp is not None:
                        w[sp] = w.get(sp, 0.0) + w[g]
                    del w[g]

    # four strongest bones, normalised (every skinned point of the mesh, not only the region)
    changed = 0
    for i, w in enumerate(W):
        top = sorted(w.items(), key=lambda kv: -kv[1])[:4]
        total = sum(v for _, v in top)
        if total <= 0:
            continue
        final = {g: v / total for g, v in top if v / total > 0.004}
        t2 = sum(final.values())
        final = {g: v / t2 for g, v in final.items()}
        if i in region_set or len(w) > 4:
            changed += 1
        W[i] = final

    for g in obj.vertex_groups:
        g.remove(range(len(me.vertices)))
    for i, w in enumerate(W):
        for g, v in w.items():
            obj.vertex_groups[g].add([i], v, "REPLACE")
    print("REFINED", obj.name, "region", len(region), "points rewritten", changed)


for name in MESHES:
    o = bpy.data.objects.get(name)
    if o and o.type == "MESH":
        refine(o)

bpy.ops.wm.save_as_mainfile(filepath=OUT, copy=True)
print("SAVED", OUT)
