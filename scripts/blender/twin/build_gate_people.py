"""
The three men at the camp gate (P02b): a security guard, a site engineer and a labourer
(assets `char.guard.a`, `char.engineer.a`, `char.labourer.a`).

Run inside the master scene, in Blender 5.2 with MPFB2 and its asset packs installed:

  exec(compile(open(path).read(), path, "exec"), {"__name__": "people", "STAGES": ["body"], "WHO": ["guard"]})

Stages, each for the people named in WHO (all three if absent):
  body    an MPFB2 human shaped by the person's numbers (age, build, face), with skin, eyes, teeth,
          brows, lashes and hair, on MPFB2's Mixamo-named rig, wearing the MPFB2 garments of his outfit
  dress   the things modelled here (hard hat, vest, belt, radio, patches, tablet, shovel ...), the body
          under the clothes removed, garments recoloured
  drape   shirts, trousers and the vest hung in a cloth simulation (a dense copy for the bake's folds)
  bake    everything opaque joined and baked into one 2K sheet (colour, normal, roughness); hair,
          brows and lashes into one small cut-out sheet
  lods    <name>_LOD0.._LOD2 and the asset collection, at the person's real height
  clips   see build_gate_people_clips.py

Everything a stage makes lives in the collection WORK_people.<who> until `lods` moves the result
to LIB_char.
"""
import math
import os
import random

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

REPO = r"C:\Users\Harrold\Desktop\Projects2\Project Nexus"
TEX_DIR = os.path.join(REPO, "assets-src", "twin", "export", "textures")
SHEET = 2048
HAIR_SHEET = 512
LOD_TRIS = {0: 19500, 1: 5900, 2: 1450}
# P02d may not add triangles to a man: his levels are held at what P02b shipped
LOD_CAP = {"guard": (19499, 5899, 1446), "engineer": (19495, 5879, 1407), "labourer": (19086, 5900, 1447)}


def lod_target(who, n):
    return min(LOD_TRIS[n], LOD_CAP.get(who, (10 ** 9,) * 3)[n])

scene = bpy.context.scene
vl = bpy.context.view_layer

# ---- who they are --------------------------------------------------------------------------------
# macro: MPFB2's sliders (age 0.5 is 25 years, 0.75 about 57). targets: MakeHuman detail targets.
# stature: metres, set exactly at the end. skin: (file, multiply colour).
PEOPLE = {
    "guard": {
        "asset": "char.guard.a",
        "stature": 1.66,
        "macro": {"gender": 1.0, "age": 0.60, "muscle": 0.56, "weight": 0.70, "proportions": 0.45, "height": 0.45,
                  "cupsize": 0.5, "firmness": 0.5, "race": {"asian": 0.82, "caucasian": 0.06, "african": 0.12}},
        "targets": {
            "head-round": 0.55, "head-fat-incr": 0.35, "nose-width1-incr": 0.6, "nose-width2-incr": 0.7, "nose-width3-incr": 0.55,
            "nose-flaring-incr": 0.5, "nose-scale-depth-decr": 0.45, "nose-point-up": 0.2, "nose-hump-decr": 0.3,
            "mouth-scale-horiz-incr": 0.35, "mouth-lowerlip-volume-incr": 0.5, "mouth-upperlip-volume-incr": 0.35,
            "l-cheek-bones-incr": 0.5, "r-cheek-bones-incr": 0.42, "l-cheek-volume-incr": 0.4, "r-cheek-volume-incr": 0.45,
            "chin-width-incr": 0.5, "chin-jaw-drop-decr": 0.2, "neck-scale-horiz-incr": 0.4, "neck-double-incr": 0.25,
            "l-eye-bag-incr": 0.45, "r-eye-bag-incr": 0.55, "l-eye-height2-decr": 0.2, "r-eye-height2-decr": 0.3,
            "eyebrows-trans-down": 0.3, "asym-jaw-1-l": 0.35, "asym-nose-2-r": 0.3, "asym-mouth-1-l": 0.25, "asym-brown-1-r": 0.4,
            "stomach-tone-decr": 0.5, "torso-scale-depth-incr": 0.2,
        },
        "skin": ("middleage_asian_male", (0.80, 0.62, 0.50)),
        "hair": ("short04", (0.55, 0.55, 0.58)),
        "brows": "eyebrow006",
        "clothes": ["elvs_male_shirt_untucked_bd1", "elvs_male_trouser", "shoes04", "toigo_maga_hat"],
        "credits": "mpfb.makehuman,mpfb.elvaerwyn-shirt,mpfb.elvaerwyn-trouser,mpfb.mrt-cap,polyhaven.stretch_poplin,polyhaven.rough_linen,mixamo.motion,twin.authored",
    },
    "engineer": {
        "asset": "char.engineer.a",
        "stature": 1.72,
        "macro": {"gender": 1.0, "age": 0.53, "muscle": 0.48, "weight": 0.46, "proportions": 0.55, "height": 0.55,
                  "cupsize": 0.5, "firmness": 0.5, "race": {"asian": 0.88, "caucasian": 0.08, "african": 0.04}},
        "targets": {
            "head-oval": 0.5, "nose-width1-incr": 0.35, "nose-width2-incr": 0.45, "nose-width3-incr": 0.3, "nose-flaring-incr": 0.3,
            "nose-scale-depth-decr": 0.3, "nose-point-width-incr": 0.3, "mouth-lowerlip-volume-incr": 0.35, "mouth-upperlip-volume-incr": 0.3,
            "mouth-scale-horiz-incr": 0.15, "l-cheek-bones-incr": 0.3, "r-cheek-bones-incr": 0.35, "chin-height-incr": 0.2,
            "chin-prominent-incr": 0.15, "forehead-scale-vert-incr": 0.25, "l-eye-height2-incr": 0.2, "r-eye-height2-incr": 0.12,
            "eyebrows-angle-up": 0.2, "asym-jaw-2-r": 0.3, "asym-nose-1-l": 0.3, "asym-eye-3-l": 0.3, "asym-mouth-2-r": 0.2,
            "l-ear-wing-incr": 0.3, "r-ear-wing-incr": 0.4,
        },
        "skin": ("young_asian_male", (0.86, 0.70, 0.58)),
        "hair": ("short02", (0.5, 0.5, 0.5)),
        "brows": "eyebrow003",
        "clothes": ["elvs_male_shirt_untucked_bd1", "punkduck_male_classic_jeans", "mindfront_shoes_biker_boots_male"],
        "credits": "mpfb.makehuman,mpfb.elvaerwyn-shirt,mpfb.punkduck-jeans,mpfb.mindfront-boots,polyhaven.stretch_poplin,polyhaven.denim_fabric_06,polyhaven.bi_stretch,mixamo.motion,twin.authored",
    },
    "labourer": {
        "asset": "char.labourer.a",
        "stature": 1.60,
        "macro": {"gender": 1.0, "age": 0.70, "muscle": 0.66, "weight": 0.30, "proportions": 0.4, "height": 0.4,
                  "cupsize": 0.5, "firmness": 0.5, "race": {"asian": 0.72, "caucasian": 0.06, "african": 0.22}},
        "targets": {
            "head-rectangular": 0.4, "head-diamond": 0.3, "head-fat-decr": 0.5, "head-age-incr": 0.35,
            "nose-width1-incr": 0.5, "nose-width2-incr": 0.8, "nose-width3-incr": 0.7, "nose-flaring-incr": 0.6,
            "nose-scale-depth-decr": 0.35, "nose-hump-incr": 0.2, "mouth-scale-horiz-incr": 0.45, "mouth-lowerlip-volume-incr": 0.3,
            "mouth-angles-down": 0.1, "mouth-laugh-lines-in": 0.45, "l-cheek-bones-incr": 0.8, "r-cheek-bones-incr": 0.7,
            "l-cheek-volume-decr": 0.6, "r-cheek-volume-decr": 0.5, "l-cheek-inner-decr": 0.4, "r-cheek-inner-decr": 0.4,
            "chin-bones-incr": 0.4, "chin-width-incr": 0.2, "l-eye-bag-incr": 0.7, "r-eye-bag-incr": 0.6,
            "l-eye-height2-decr": 0.35, "r-eye-height2-decr": 0.25, "eyebrows-trans-down": 0.4, "forehead-temple-decr": 0.3,
            "asym-jaw-3-l": 0.4, "asym-nose-3-l": 0.35, "asym-eye-5-r": 0.3, "asym-cheek-1-r": 0.4, "asym-temple-1-l": 0.3,
            "neck-scale-horiz-decr": 0.2, "l-ear-scale-incr": 0.3, "r-ear-scale-incr": 0.3,
        },
        "skin": ("old_asian_male", (0.66, 0.47, 0.36)),
        "hair": ("short04", (0.75, 0.75, 0.78)),
        "brows": "eyebrow009",
        "clothes": ["mindfront_knitted_sweater_01", "mindfront_male_trousers_1", "punkduck_riding_boots", "toigo_gloves_short"],
        "credits": "mpfb.makehuman,mpfb.mindfront-sweater,mpfb.mindfront-trousers,mpfb.punkduck-boots,mpfb.mrt-gloves,polyhaven.cotton_jersey,polyhaven.denim_fabric_05,mixamo.motion,twin.authored",
    },
}


# ---- small helpers -------------------------------------------------------------------------------
def collection(name, parent=None):
    coll = bpy.data.collections.get(name)
    if coll is None:
        coll = bpy.data.collections.new(name)
        (parent or scene.collection).children.link(coll)
    return coll


def layer_collection(name, lc=None):
    lc = lc or vl.layer_collection
    if lc.collection.name == name:
        return lc
    for child in lc.children:
        found = layer_collection(name, child)
        if found:
            return found
    return None


def work_of(who):
    return collection(f"WORK_people.{who}", collection("WORK_people"))


def obj_of(who, part):
    return bpy.data.objects.get(f"{who}.{part}")


def parts_of(who):
    """The person's parts (not the draped copies made for the bake)."""
    return [o for o in work_of(who).objects if o.type == "MESH" and not o.get("twin_drape") and not o.get("twin_spare")]


def rig_of(who):
    return bpy.data.objects[f"{who}.rig"]


def tris(mesh):
    return sum(len(p.vertices) - 2 for p in mesh.polygons)


def select_only(*objs):
    for o in vl.objects:
        o.select_set(False)
    for o in objs:
        o.hide_set(False)
        o.select_set(True)
    vl.objects.active = objs[0]


def bsdf_of(mat):
    return next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def bone(who, short):
    return f"mixamorig:{short}"


def bone_head(who, short):
    rig = rig_of(who)
    return rig.matrix_world @ rig.data.bones[bone(who, short)].head_local


def bone_tail(who, short):
    rig = rig_of(who)
    return rig.matrix_world @ rig.data.bones[bone(who, short)].tail_local


# ---- stage: body -----------------------------------------------------------------------------------
def stage_body(who):
    from bl_ext.blender_org.mpfb.services.humanservice import HumanService
    from bl_ext.blender_org.mpfb.services.locationservice import LocationService
    from bl_ext.blender_org.mpfb.services.targetservice import TargetService

    spec = PEOPLE[who]
    user = LocationService.get_user_data()
    work = work_of(who)
    for o in list(work.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    # (the last build's rig, scaled and in LIB_char: left in place, the new one would come out as .001)
    old = bpy.data.objects.get(f"{who}.rig")
    if old is not None:
        arm = old.data
        bpy.data.objects.remove(old, do_unlink=True)
        if arm.users == 0:
            bpy.data.armatures.remove(arm)
    vl.active_layer_collection = layer_collection(work.name)

    def asset(kind, name, ext=".mhclo"):
        folder = os.path.join(user, kind, name)
        return os.path.join(folder, next(f for f in os.listdir(folder) if f.endswith(ext)))

    before = set(bpy.data.objects)
    base = HumanService.create_human(mask_helpers=True, detailed_helpers=True, extra_vertex_groups=True, feet_on_ground=True, scale=0.1, macro_detail_dict=spec["macro"])
    for name, weight in spec["targets"].items():
        path = TargetService.target_full_path(name)
        if path is None:
            raise RuntimeError(f"no target named {name}")
        TargetService.load_target(base, path, weight=weight, name=name)
    # (the rig goes on first: garments added after it come with their weights. Without the detailed
    #  helpers MPFB2 puts the arm joints of this rig in the wrong place.)
    HumanService.add_builtin_rig(base, "mixamo", import_weights=True)
    rig = next(o for o in bpy.data.objects if o not in before and o.type == "ARMATURE")
    HumanService.set_character_skin(asset("skins", spec["skin"][0], ".mhmat"), base, skin_type="MAKESKIN", material_instances=False)
    kinds = [("Eyes", "eyes", "low-poly"), ("Teeth", "teeth", "teeth_base"), ("Eyebrows", "eyebrows", spec["brows"]),
             ("Eyelashes", "eyelashes", "eyelashes01"), ("Hair", "hair", spec["hair"][0])]
    made = {}
    for kind, folder, name in kinds:
        seen = set(bpy.data.objects)
        HumanService.add_mhclo_asset(asset(folder, name), base, asset_type=kind, subdiv_levels=0, material_type="MAKESKIN")
        made[kind.lower()] = next(o for o in bpy.data.objects if o not in seen)
    for name in spec["clothes"]:
        seen = set(bpy.data.objects)
        HumanService.add_mhclo_asset(asset("clothes", name), base, asset_type="Clothes", subdiv_levels=0, material_type="MAKESKIN")
        made["wear:" + name] = next(o for o in bpy.data.objects if o not in seen)

    # shape keys become the mesh; the helper geometry and the skin MPFB2 hides under garments are cut away
    TargetService.bake_targets(base)
    for o in [base] + list(made.values()):
        if o.data.shape_keys:
            o.shape_key_clear()
    armature = next(m for m in base.modifiers if m.type == "ARMATURE")
    armature.show_viewport = False
    dg = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(base.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    old = base.data
    for mod in [m for m in base.modifiers if m.type == "MASK"]:
        base.modifiers.remove(mod)
    base.data = mesh
    bpy.data.meshes.remove(old)
    armature.show_viewport = True

    base.name = f"{who}.body"
    rig.name = f"{who}.rig"
    rig.data.name = f"{who}.rig"
    for key, o in made.items():
        o.name = f"{who}.{key.replace('wear:', '')}" if key.startswith("wear:") else f"{who}.{key}"
        o["twin_wear"] = key
    for o in [base] + list(made.values()):
        o.data.name = o.name
        for i, slot in enumerate(o.material_slots):  # each person owns his materials: they are recoloured
            if slot.material:
                slot.material = slot.material.copy()
                slot.material.name = f"{o.name}.mat"
    for pb in rig.pose.bones:
        pb.rotation_mode = "QUATERNION"
    top = max((base.matrix_world @ v.co).z for v in base.data.vertices)
    print(f"[people] {who}: body {len(base.data.vertices)} vertices, {top:.3f} m tall as made, {len(rig.data.bones)} bones, wearing {spec['clothes']}")


# ---- stage: dress ----------------------------------------------------------------------------------
def flat_material(name, colour, rough=0.6, metal=0.0, grain=0.0, emit=0.0):
    """A plain surface: one colour, a roughness that wanders a little, and an optional fine grain."""
    old = bpy.data.materials.get(name)
    if old:
        bpy.data.materials.remove(old)
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = bsdf_of(mat)
    bsdf.inputs["Base Color"].default_value = (*colour, 1)
    bsdf.inputs["Metallic"].default_value = metal
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 38
    noise.inputs["Detail"].default_value = 4
    ramp = nodes.new("ShaderNodeMapRange")
    ramp.inputs["To Min"].default_value = max(0.03, rough - 0.12)
    ramp.inputs["To Max"].default_value = min(1.0, rough + 0.12)
    links.new(noise.outputs["Fac"], ramp.inputs["Value"])
    links.new(ramp.outputs[0], bsdf.inputs["Roughness"])
    if grain:
        fine = nodes.new("ShaderNodeTexNoise")
        fine.inputs["Scale"].default_value = 900
        bump = nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = grain
        bump.inputs["Distance"].default_value = 0.0006
        links.new(fine.outputs["Fac"], bump.inputs["Height"])
        links.new(bump.outputs[0], bsdf.inputs["Normal"])
    if emit:
        bsdf.inputs["Emission Color"].default_value = (*colour, 1)
        bsdf.inputs["Emission Strength"].default_value = emit
    return mat


def mean_luminance(image):
    w, h = image.size
    px = np.empty(w * h * 4, dtype=np.float32)
    image.pixels.foreach_get(px)
    px = px.reshape(-1, 4)[::97]
    solid = px[px[:, 3] > 0.5] if (px[:, 3] > 0.5).any() else px
    return float((solid[:, 0] * 0.2126 + solid[:, 1] * 0.7152 + solid[:, 2] * 0.0722).mean())


def retone(mat, tint, level=1.0, keep=0.0, rough=None):
    """
    Recolour a garment: its texture's light and dark (seams, buttons, folds) are kept and carried
    by `tint`. `level` is how bright the cloth's average comes out relative to the tint; `keep`
    mixes the texture's own colour back in.
    """
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = bsdf_of(mat)
    sock = bsdf.inputs["Base Color"]
    if not sock.is_linked:
        sock.default_value = (*tint, 1)
        return
    src = sock.links[0].from_socket
    tex = next((n for n in nodes if n.type == "TEX_IMAGE" and n.image), None)
    gain = level / max(0.02, mean_luminance(tex.image)) if tex else 1.0
    grey = nodes.new("ShaderNodeRGBToBW")
    links.new(src, grey.inputs[0])
    mul = nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = gain
    mul.use_clamp = False
    links.new(grey.outputs[0], mul.inputs[0])
    # (shadows of folds stay, highlights do not blow out)
    soft = nodes.new("ShaderNodeMapRange")
    soft.inputs["From Min"].default_value = 0.0
    soft.inputs["From Max"].default_value = 1.6
    soft.inputs["To Min"].default_value = 0.25
    soft.inputs["To Max"].default_value = 1.25
    links.new(mul.outputs[0], soft.inputs["Value"])
    mix = nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1.0
    mix.inputs["A"].default_value = (*tint, 1)
    links.new(soft.outputs[0], mix.inputs["B"])
    out = mix.outputs["Result"]
    if keep:
        back = nodes.new("ShaderNodeMix")
        back.data_type = "RGBA"
        back.inputs["Factor"].default_value = keep
        links.new(out, back.inputs["A"])
        links.new(src, back.inputs["B"])
        out = back.outputs["Result"]
    links.new(out, sock)
    if rough is not None:
        bsdf.inputs["Roughness"].default_value = rough
    mat["twin_colour_out"] = True
    return mix


def overlay(mat, mask_socket, colour, rough=None, metal=None):
    """Lay `colour` over the material's base colour where the mask is white (a band, dust, mud)."""
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = bsdf_of(mat)
    sock = bsdf.inputs["Base Color"]
    mix = nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    if sock.is_linked:
        links.new(sock.links[0].from_socket, mix.inputs["A"])
    else:
        mix.inputs["A"].default_value = sock.default_value
    mix.inputs["B"].default_value = (*colour, 1)
    links.new(mask_socket, mix.inputs["Factor"])
    links.new(mix.outputs["Result"], sock)
    for name, value in (("Roughness", rough), ("Metallic", metal)):
        if value is None:
            continue
        s = bsdf.inputs[name]
        m = nodes.new("ShaderNodeMix")
        m.data_type = "FLOAT"
        if s.is_linked:
            links.new(s.links[0].from_socket, m.inputs["A"])
        else:
            m.inputs["A"].default_value = s.default_value
        m.inputs["B"].default_value = value
        links.new(mask_socket, m.inputs["Factor"])
        links.new(m.outputs["Result"], s)


def position(mat):
    nodes = mat.node_tree.nodes
    node = nodes.get("twin.position")
    if node is None:
        node = nodes.new("ShaderNodeNewGeometry")
        node.name = "twin.position"
    return node.outputs["Position"]


def band_mask(mat, origin, direction, t0, t1, soft=0.004, radius=None):
    """
    White between two planes across `direction` (metres from `origin` along it), and, with `radius`,
    only within that distance of the axis: a band round a sleeve or a trouser leg. Rest pose, metres.
    """
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    d = Vector(direction).normalized()
    rel = nodes.new("ShaderNodeVectorMath")
    rel.operation = "SUBTRACT"
    links.new(position(mat), rel.inputs[0])
    rel.inputs[1].default_value = Vector(origin)
    dot = nodes.new("ShaderNodeVectorMath")
    dot.operation = "DOT_PRODUCT"
    links.new(rel.outputs[0], dot.inputs[0])
    dot.inputs[1].default_value = d
    t = dot.outputs["Value"]

    def step(edge, rising):
        r = nodes.new("ShaderNodeMapRange")
        r.interpolation_type = "SMOOTHSTEP"
        r.inputs["From Min"].default_value = edge - soft
        r.inputs["From Max"].default_value = edge + soft
        r.inputs["To Min"].default_value = 0.0 if rising else 1.0
        r.inputs["To Max"].default_value = 1.0 if rising else 0.0
        links.new(t, r.inputs["Value"])
        return r.outputs[0]

    out = nodes.new("ShaderNodeMath")
    out.operation = "MULTIPLY"
    links.new(step(t0, True), out.inputs[0])
    links.new(step(t1, False), out.inputs[1])
    result = out.outputs[0]
    if radius is not None:
        along = nodes.new("ShaderNodeVectorMath")
        along.operation = "SCALE"
        along.inputs[0].default_value = d
        links.new(t, along.inputs["Scale"])
        off = nodes.new("ShaderNodeVectorMath")
        off.operation = "SUBTRACT"
        links.new(rel.outputs[0], off.inputs[0])
        links.new(along.outputs[0], off.inputs[1])
        length = nodes.new("ShaderNodeVectorMath")
        length.operation = "LENGTH"
        links.new(off.outputs[0], length.inputs[0])
        near = nodes.new("ShaderNodeMath")
        near.operation = "LESS_THAN"
        links.new(length.outputs["Value"], near.inputs[0])
        near.inputs[1].default_value = radius
        both = nodes.new("ShaderNodeMath")
        both.operation = "MULTIPLY"
        links.new(result, both.inputs[0])
        links.new(near.outputs[0], both.inputs[1])
        result = both.outputs[0]
    return result


def any_of(mat, *sockets):
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    result = sockets[0]
    for s in sockets[1:]:
        m = nodes.new("ShaderNodeMath")
        m.operation = "MAXIMUM"
        links.new(result, m.inputs[0])
        links.new(s, m.inputs[1])
        result = m.outputs[0]
    return result


def grime(mat, colour, top, strength, rough=0.95):
    """Road dirt from the ground up to `top` metres, broken up by noise (dust on boots and trouser legs)."""
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    sep = nodes.new("ShaderNodeSeparateXYZ")
    links.new(position(mat), sep.inputs[0])
    ramp = nodes.new("ShaderNodeMapRange")
    ramp.interpolation_type = "SMOOTHSTEP"
    ramp.inputs["From Min"].default_value = 0.0
    ramp.inputs["From Max"].default_value = top
    ramp.inputs["To Min"].default_value = 1.0
    ramp.inputs["To Max"].default_value = 0.0
    links.new(sep.outputs["Z"], ramp.inputs["Value"])
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 14
    noise.inputs["Detail"].default_value = 6
    shape = nodes.new("ShaderNodeMapRange")
    shape.inputs["From Min"].default_value = 0.3
    shape.inputs["From Max"].default_value = 0.7
    links.new(noise.outputs["Fac"], shape.inputs["Value"])
    mul = nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    links.new(ramp.outputs[0], mul.inputs[0])
    links.new(shape.outputs[0], mul.inputs[1])
    k = nodes.new("ShaderNodeMath")
    k.operation = "MULTIPLY"
    k.inputs[1].default_value = strength
    k.use_clamp = True
    links.new(mul.outputs[0], k.inputs[0])
    overlay(mat, k.outputs[0], colour, rough=rough)


FABRIC_DIR = os.path.join(REPO, "assets-src", "twin", "downloads", "polyhaven")
FABRIC_PX = 256  # what survives at the sheet's texel (about 1 mm): a finer copy only aliases in the bake


def fabric_image(name, kind):
    """A Poly Haven fabric map, scaled down to what the sheet can carry (loaded once)."""
    key = f"fabric.{name}.{kind}"
    img = bpy.data.images.get(key)
    if img is None:
        path = os.path.join(FABRIC_DIR, name, f"{name}_{kind}_1k.jpg")
        img = bpy.data.images.load(path)
        img.name = key
        img.scale(FABRIC_PX, FABRIC_PX)
        img.pack()
        if kind != "Diffuse":
            img.colorspace_settings.name = "Non-Color"
    return img


def metres_per_uv(mesh):
    """How many metres one unit of the mesh's UV layer spans (for tiling a texture at real size)."""
    uv = mesh.uv_layers.active.data
    a3 = auv = 0.0
    for p in mesh.polygons:
        a3 += p.area
        pts = [uv[i].uv for i in p.loop_indices]
        auv += abs(sum(pts[i].x * pts[i - 1].y - pts[i - 1].x * pts[i].y for i in range(len(pts)))) / 2
    return math.sqrt(a3 / max(auv, 1e-9))


def fabric(mat, obj, name, tile, strength=1.0, tone=0.6, rough=None):
    """
    Weave and wear from a CC0 fabric set (FABRIC_DIR) laid over a garment through its own UVs at
    real size (`tile` metres a repeat): its normal map, its light and dark carried into the colour
    by `tone`, its roughness around the garment's.
    """
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = bsdf_of(mat)
    uvn = nodes.new("ShaderNodeUVMap")
    uvn.uv_map = obj.data.uv_layers.active.name
    uvn.name = "twin.fabric.uv"
    mapping = nodes.new("ShaderNodeMapping")
    k = metres_per_uv(obj.data) / tile
    mapping.inputs["Scale"].default_value = (k, k, 1)
    links.new(uvn.outputs["UV"], mapping.inputs["Vector"])

    def tex(kind):
        t = nodes.new("ShaderNodeTexImage")
        t.image = fabric_image(name, kind)
        t.interpolation = "Cubic"
        links.new(mapping.outputs["Vector"], t.inputs["Vector"])
        return t

    nm = nodes.new("ShaderNodeNormalMap")
    nm.uv_map = uvn.uv_map
    nm.inputs["Strength"].default_value = strength
    links.new(tex("nor_gl").outputs["Color"], nm.inputs["Color"])
    sock = bsdf.inputs["Normal"]
    if sock.is_linked:  # (a bump already there is laid over the fabric)
        prev = sock.links[0].from_node
        if prev.type == "BUMP":
            links.new(nm.outputs["Normal"], prev.inputs["Normal"])
        else:
            links.new(nm.outputs["Normal"], sock)
    else:
        links.new(nm.outputs["Normal"], sock)
    # the fabric's own light and dark, about its mean, carried into the garment's colour
    diff = tex("Diffuse")
    grey = nodes.new("ShaderNodeRGBToBW")
    links.new(diff.outputs["Color"], grey.inputs[0])
    mean = mean_luminance(diff.image)
    detail = nodes.new("ShaderNodeMapRange")
    detail.inputs["From Min"].default_value = 0.0
    detail.inputs["From Max"].default_value = 2 * mean
    detail.inputs["To Min"].default_value = 1.0 - tone
    detail.inputs["To Max"].default_value = 1.0 + tone
    links.new(grey.outputs[0], detail.inputs["Value"])
    col = bsdf.inputs["Base Color"]
    mix = nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1.0
    if col.is_linked:
        links.new(col.links[0].from_socket, mix.inputs["A"])
    else:
        mix.inputs["A"].default_value = col.default_value
    links.new(detail.outputs[0], mix.inputs["B"])
    links.new(mix.outputs["Result"], col)
    # roughness: the fabric's map, centred on the garment's value
    rv = rough if rough is not None else (bsdf.inputs["Roughness"].default_value if not bsdf.inputs["Roughness"].is_linked else 0.85)
    r = nodes.new("ShaderNodeMapRange")
    r.inputs["To Min"].default_value = max(0.0, rv - 0.12)
    r.inputs["To Max"].default_value = min(1.0, rv + 0.08)
    links.new(tex("Rough").outputs["Color"], r.inputs["Value"])
    links.new(r.outputs[0], bsdf.inputs["Roughness"])


def stain(mat, centre, radius, colour, strength, rough=None, below=None, front=None, scale=26):
    """
    A soft, broken patch of sweat or dust round a rest-pose point (collar, armpit, knee, cuff),
    optionally only below a height or on the front (y < `front`).
    """
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    dist = nodes.new("ShaderNodeVectorMath")
    dist.operation = "DISTANCE"
    links.new(position(mat), dist.inputs[0])
    dist.inputs[1].default_value = Vector(centre)
    fall = nodes.new("ShaderNodeMapRange")
    fall.interpolation_type = "SMOOTHSTEP"
    fall.inputs["From Min"].default_value = radius * 0.35
    fall.inputs["From Max"].default_value = radius
    fall.inputs["To Min"].default_value = 1.0
    fall.inputs["To Max"].default_value = 0.0
    links.new(dist.outputs["Value"], fall.inputs["Value"])
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 6
    shape = nodes.new("ShaderNodeMapRange")
    shape.inputs["From Min"].default_value = 0.35
    shape.inputs["From Max"].default_value = 0.65
    links.new(noise.outputs["Fac"], shape.inputs["Value"])
    m = nodes.new("ShaderNodeMath")
    m.operation = "MULTIPLY"
    links.new(fall.outputs[0], m.inputs[0])
    links.new(shape.outputs[0], m.inputs[1])
    out = m.outputs[0]
    for axis, edge, lower in (("Z", below, True), ("Y", front, True)):
        if edge is None:
            continue
        sep = nodes.new("ShaderNodeSeparateXYZ")
        links.new(position(mat), sep.inputs[0])
        step = nodes.new("ShaderNodeMapRange")
        step.inputs["From Min"].default_value = edge - 0.01
        step.inputs["From Max"].default_value = edge + 0.01
        step.inputs["To Min"].default_value = 1.0 if lower else 0.0
        step.inputs["To Max"].default_value = 0.0 if lower else 1.0
        links.new(sep.outputs[axis], step.inputs["Value"])
        m2 = nodes.new("ShaderNodeMath")
        m2.operation = "MULTIPLY"
        links.new(out, m2.inputs[0])
        links.new(step.outputs[0], m2.inputs[1])
        out = m2.outputs[0]
    k = nodes.new("ShaderNodeMath")
    k.operation = "MULTIPLY"
    k.use_clamp = True
    k.inputs[1].default_value = strength
    links.new(out, k.inputs[0])
    overlay(mat, k.outputs[0], colour, rough=rough)


def sweat_and_dust(who, top, bottom, top_colour, dust=(0.40, 0.31, 0.22), dusty=0.4):
    """Where a day's work shows: collar and armpits darker with sweat, cuffs grubby, knees dusty."""
    neck = bone_head(who, "Neck")
    tm = top.data.materials[0]
    sweat = tuple(c * 0.72 for c in top_colour)
    stain(tm, neck + Vector((0, 0.01, -0.02)), 0.09, tuple(c * 0.8 + 0.04 for c in sweat), 0.55, rough=0.75, scale=40)
    for side in ("Left", "Right"):
        arm = bone_head(who, f"{side}Arm")
        stain(tm, arm + Vector((-0.035 if side == "Left" else 0.035, 0.01, -0.085)), 0.085, sweat, 0.75, rough=0.7)
        hand = bone_head(who, f"{side}Hand")
        stain(tm, hand.lerp(bone_head(who, f"{side}ForeArm"), 0.12), 0.07, tuple(c * 0.75 for c in top_colour), 0.5, scale=60)
    # sweat down the middle of the back
    stain(tm, bone_head(who, "Spine1") + Vector((0, 0.1, 0.03)), 0.16, sweat, 0.45, rough=0.75, scale=18)
    if bottom is not None:
        bm_ = bottom.data.materials[0]
        for side in ("Left", "Right"):
            knee = bone_head(who, f"{side}Leg")
            stain(bm_, knee + Vector((0, -0.04, 0)), 0.1, dust, dusty, rough=0.95, front=knee.y + 0.01, scale=34)
        stain(bm_, bone_head(who, "Hips") + Vector((0, -0.12, -0.05)), 0.14, dust, dusty * 0.4, rough=0.95, scale=30)


def skin_material(who):
    """Skin tone, pores, a little shine on the nose and brow; lips and nails kept from the texture."""
    spec = PEOPLE[who]
    mat = obj_of(who, "body").data.materials[0]
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = bsdf_of(mat)
    sock = bsdf.inputs["Base Color"]
    src = sock.links[0].from_socket
    mix = nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1.0
    links.new(src, mix.inputs["A"])
    # blotches: skin is never one tone (sun on the cheeks and nose, paler under the jaw)
    blotch = nodes.new("ShaderNodeTexNoise")
    blotch.inputs["Scale"].default_value = 22
    blotch.inputs["Detail"].default_value = 5
    tone = nodes.new("ShaderNodeMix")
    tone.data_type = "RGBA"
    r, g, b = spec["skin"][1]
    tone.inputs["A"].default_value = (r * 1.06, g * 1.03, b * 1.0, 1)
    tone.inputs["B"].default_value = (r * 0.92, g * 0.86, b * 0.84, 1)
    links.new(blotch.outputs["Fac"], tone.inputs["Factor"])
    links.new(tone.outputs["Result"], mix.inputs["B"])
    links.new(mix.outputs["Result"], sock)
    if bsdf.inputs["Alpha"].is_linked:
        links.remove(bsdf.inputs["Alpha"].links[0])
    pores = nodes.new("ShaderNodeTexVoronoi")
    pores.inputs["Scale"].default_value = 1400
    fine = nodes.new("ShaderNodeTexNoise")
    fine.inputs["Scale"].default_value = 260
    fine.inputs["Detail"].default_value = 3
    add = nodes.new("ShaderNodeMath")
    add.operation = "ADD"
    links.new(pores.outputs["Distance"], add.inputs[0])
    links.new(fine.outputs["Fac"], add.inputs[1])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.35
    bump.inputs["Distance"].default_value = 0.0005
    links.new(add.outputs[0], bump.inputs["Height"])
    links.new(bump.outputs[0], bsdf.inputs["Normal"])
    sheen = nodes.new("ShaderNodeMapRange")
    sheen.inputs["To Min"].default_value = 0.5
    sheen.inputs["To Max"].default_value = 0.7
    links.new(blotch.outputs["Fac"], sheen.inputs["Value"])
    links.new(sheen.outputs[0], bsdf.inputs["Roughness"])
    for part, rough in (("eyes", 0.06), ("teeth", 0.3)):
        o = obj_of(who, part)
        b2 = bsdf_of(o.data.materials[0])
        b2.inputs["Roughness"].default_value = rough
        if b2.inputs["Alpha"].is_linked:
            o.data.materials[0].node_tree.links.remove(b2.inputs["Alpha"].links[0])
        b2.inputs["Alpha"].default_value = 1.0


# stubble: (how much, how grey) a man has
STUBBLE = {"guard": (0.6, 0.0), "engineer": (0.25, 0.0), "labourer": (0.75, 0.55)}


def face_detail(who):
    """
    What the face and hands need beyond the skin texture: lips with their own colour and shine, a
    wet line along the lower lids, the upper lids' shadow on the eyes, stubble, nails, and creases
    over the knuckles. Areas are found on the rest pose (MPFB2's `lips` and `fingernails` groups,
    the eyes, the finger joints) and carried in two vertex colours the skin's material reads:
    `twin_face` (lips, nails, lower lid, stubble) and `twin_hand` (knuckles).
    """
    body, eyes = obj_of(who, "body"), obj_of(who, "eyes")
    me = body.data
    eye_pts = [v.co.copy() for v in eyes.data.vertices]
    centres = []
    for sgn in (1, -1):
        pts = [c for c in eye_pts if c.x * sgn > 0]
        c = sum(pts, Vector()) / len(pts)
        centres.append((c, max((p - c).length for p in pts)))
    groups = {g.name: g.index for g in body.vertex_groups}
    lips_i, nails_i, scalp_i = groups.get("lips"), groups.get("fingernails"), groups.get("scalp")
    head_i, neck_i = groups.get(bone(who, "Head")), groups.get(bone(who, "Neck"))
    lip_pts = [v.co for v in me.vertices if any(g.group == lips_i and g.weight > 0.5 for g in v.groups)]
    mouth = sum(lip_pts, Vector()) / len(lip_pts)
    joints = []
    for side in ("Left", "Right"):
        palm = hand_frame(who, side)["palm"]
        for finger in ("Index", "Middle", "Ring", "Pinky"):
            for j in (1, 2, 3):
                joints.append((bone_head(who, f"{side}Hand{finger}{j}"), palm, 0.009 if j == 1 else 0.0065))
        for j in (2, 3):
            joints.append((bone_head(who, f"{side}HandThumb{j}"), palm, 0.006))
    face = me.color_attributes.get("twin_face") or me.color_attributes.new("twin_face", "FLOAT_COLOR", "POINT")
    hand = me.color_attributes.get("twin_hand") or me.color_attributes.new("twin_hand", "FLOAT_COLOR", "POINT")

    def ramp(x, a, b):
        t = max(0.0, min(1.0, (x - a) / (b - a)))
        return t * t * (3 - 2 * t)

    for v in me.vertices:
        w = {g.group: g.weight for g in v.groups}
        lips = w.get(lips_i, 0.0)
        nails = w.get(nails_i, 0.0)
        lid = 0.0
        for c, r in centres:
            if v.co.z < c.z - 0.15 * r and v.co.y < c.y:
                lid = max(lid, math.exp(-(((v.co - c).length - (r + 0.0015)) / 0.0022) ** 2))
        beard = 0.0
        if w.get(head_i, 0.0) + w.get(neck_i, 0.0) > 0.3 and v.co.y < mouth.y + 0.07:
            dz = v.co.z - mouth.z
            side = abs(v.co.x - mouth.x)
            top = 0.022 if side < 0.026 else 0.022 - 0.6 * (side - 0.026)  # (the moustache line, falling to the jaw at the cheeks)
            beard = ramp(dz, top + 0.004, top - 0.004) * ramp(dz, -0.095, -0.06) * (1.0 - ramp(v.co.y, mouth.y + 0.045, mouth.y + 0.07))
            beard *= 1.0 - min(1.0, lips * 1.5)
        knuckle = 0.0
        for p, palm, r in joints:
            d = v.co - p
            if d.length < r * 2.5 and d.dot(palm) < 0:
                knuckle = max(knuckle, math.exp(-(d.length / r) ** 2))
        scalp = w.get(scalp_i, 0.0)
        face.data[v.index].color = (lips, nails, lid, beard)
        hand.data[v.index].color = (knuckle, scalp, 0.0, 1.0)

    mat = me.materials[0]
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = bsdf_of(mat)
    fa = nodes.new("ShaderNodeAttribute")
    fa.attribute_name = "twin_face"
    fsep = nodes.new("ShaderNodeSeparateColor")
    links.new(fa.outputs["Color"], fsep.inputs[0])
    ha = nodes.new("ShaderNodeAttribute")
    ha.attribute_name = "twin_hand"
    hsep = nodes.new("ShaderNodeSeparateColor")
    links.new(ha.outputs["Color"], hsep.inputs[0])
    lips_s, nails_s, lid_s, beard_s = fsep.outputs["Red"], fsep.outputs["Green"], fsep.outputs["Blue"], fa.outputs["Alpha"]
    knuckle_s, scalp_s = hsep.outputs["Red"], hsep.outputs["Green"]
    amount, grey = STUBBLE[who]
    # stubble: a dot for every hair, and the blue-grey shadow they make together
    dots = nodes.new("ShaderNodeTexVoronoi")
    dots.inputs["Scale"].default_value = 2200
    pick = nodes.new("ShaderNodeMath")
    pick.operation = "LESS_THAN"
    pick.inputs[1].default_value = 0.32
    links.new(dots.outputs["Distance"], pick.inputs[0])
    thin = nodes.new("ShaderNodeTexNoise")
    thin.inputs["Scale"].default_value = 90
    patchy = nodes.new("ShaderNodeMapRange")
    patchy.inputs["From Min"].default_value = 0.3
    patchy.inputs["From Max"].default_value = 0.6
    links.new(thin.outputs["Fac"], patchy.inputs["Value"])
    beard_k = nodes.new("ShaderNodeMath")
    beard_k.operation = "MULTIPLY"
    beard_k.inputs[1].default_value = amount
    links.new(beard_s, beard_k.inputs[0])
    hairs = nodes.new("ShaderNodeMath")
    hairs.operation = "MULTIPLY"
    links.new(pick.outputs[0], hairs.inputs[0])
    links.new(beard_k.outputs[0], hairs.inputs[1])
    hairs2 = nodes.new("ShaderNodeMath")
    hairs2.operation = "MULTIPLY"
    hairs2.use_clamp = True
    links.new(hairs.outputs[0], hairs2.inputs[0])
    links.new(patchy.outputs[0], hairs2.inputs[1])
    shade = nodes.new("ShaderNodeMath")
    shade.operation = "MULTIPLY"
    shade.inputs[1].default_value = 0.35
    links.new(beard_k.outputs[0], shade.inputs[0])
    overlay(mat, shade.outputs[0], (0.24, 0.23, 0.24))
    g = 0.04 + 0.5 * grey
    overlay(mat, hairs2.outputs[0], (g, g * 0.95, g * 0.92))
    # the scalp: a short crew cut (what shows under a hat, and where the hair piece thins out)
    hair_tone = [0.045 + 0.45 * grey] * 3
    crop = nodes.new("ShaderNodeTexVoronoi")
    crop.inputs["Scale"].default_value = 3200
    dense = nodes.new("ShaderNodeMapRange")
    dense.inputs["From Min"].default_value = 0.2
    dense.inputs["From Max"].default_value = 0.55
    dense.inputs["To Min"].default_value = 1.0
    dense.inputs["To Max"].default_value = 0.55
    links.new(crop.outputs["Distance"], dense.inputs["Value"])
    sk = nodes.new("ShaderNodeMath")
    sk.operation = "MULTIPLY"
    sk.use_clamp = True
    links.new(scalp_s, sk.inputs[0])
    links.new(dense.outputs[0], sk.inputs[1])
    overlay(mat, sk.outputs[0], tuple(hair_tone), rough=0.75)
    # lips: deeper, redder, a little shine
    lipk = nodes.new("ShaderNodeMath")
    lipk.operation = "MULTIPLY"
    lipk.inputs[1].default_value = 0.18
    links.new(lips_s, lipk.inputs[0])
    sock = bsdf.inputs["Base Color"]
    lipmix = nodes.new("ShaderNodeMix")
    lipmix.data_type = "RGBA"
    lipmix.blend_type = "MULTIPLY"
    links.new(sock.links[0].from_socket, lipmix.inputs["A"])
    lipmix.inputs["B"].default_value = (0.82, 0.58, 0.58, 1)
    links.new(lipk.outputs[0], lipmix.inputs["Factor"])
    links.new(lipmix.outputs["Result"], sock)
    # nails: paler and pinker than the finger, smooth
    nailmix = nodes.new("ShaderNodeMix")
    nailmix.data_type = "RGBA"
    nailmix.blend_type = "SCREEN"
    links.new(sock.links[0].from_socket, nailmix.inputs["A"])
    nailmix.inputs["B"].default_value = (0.32, 0.24, 0.22, 1)
    links.new(nails_s, nailmix.inputs["Factor"])
    links.new(nailmix.outputs["Result"], sock)
    # knuckles: darker, redder, creased
    kmul = nodes.new("ShaderNodeMath")
    kmul.operation = "MULTIPLY"
    kmul.inputs[1].default_value = 0.6
    links.new(knuckle_s, kmul.inputs[0])
    overlay(mat, kmul.outputs[0], (0.5, 0.33, 0.28))
    # roughness: shine on the lips, the wet line, the nails
    for mask, value in ((lips_s, 0.45), (lid_s, 0.05), (nails_s, 0.3)):
        r = bsdf.inputs["Roughness"]
        m = nodes.new("ShaderNodeMix")
        m.data_type = "FLOAT"
        links.new(r.links[0].from_socket, m.inputs["A"])
        m.inputs["B"].default_value = value
        links.new(mask, m.inputs["Factor"])
        links.new(m.outputs["Result"], r)
    # creases over the knuckles and fine lines on the lips, in the bump
    crease = nodes.new("ShaderNodeTexWave")
    crease.wave_type = "BANDS"
    crease.inputs["Scale"].default_value = 260
    crease.inputs["Distortion"].default_value = 6
    crease.inputs["Detail"].default_value = 3
    links.new(position(mat), crease.inputs["Vector"])
    kb = nodes.new("ShaderNodeMath")
    kb.operation = "MULTIPLY"
    links.new(crease.outputs["Fac"], kb.inputs[0])
    links.new(knuckle_s, kb.inputs[1])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.6
    bump.inputs["Distance"].default_value = 0.0006
    links.new(kb.outputs[0], bump.inputs["Height"])
    normal = bsdf.inputs["Normal"]
    if normal.is_linked:
        links.new(normal.links[0].from_socket, bump.inputs["Normal"])
    links.new(bump.outputs[0], normal)

    # the upper lids shade the top of each eye
    em = eyes.data.materials[0]
    en, el = em.node_tree.nodes, em.node_tree.links
    c = (centres[0][0] + centres[1][0]) / 2
    r = (centres[0][1] + centres[1][1]) / 2
    sep = en.new("ShaderNodeSeparateXYZ")
    el.new(position(em), sep.inputs[0])
    lidshade = en.new("ShaderNodeMapRange")
    lidshade.interpolation_type = "SMOOTHSTEP"
    lidshade.inputs["From Min"].default_value = c.z + 0.05 * r
    lidshade.inputs["From Max"].default_value = c.z + 0.75 * r
    lidshade.inputs["To Min"].default_value = 1.0
    lidshade.inputs["To Max"].default_value = 0.55
    el.new(sep.outputs["Z"], lidshade.inputs["Value"])
    esock = bsdf_of(em).inputs["Base Color"]
    emix = en.new("ShaderNodeMix")
    emix.data_type = "RGBA"
    emix.blend_type = "MULTIPLY"
    emix.inputs["Factor"].default_value = 1.0
    if esock.is_linked:
        el.new(esock.links[0].from_socket, emix.inputs["A"])
    else:
        emix.inputs["A"].default_value = esock.default_value
    el.new(lidshade.outputs[0], emix.inputs["B"])
    el.new(emix.outputs["Result"], esock)
    print(f"[people] {who}: face detail, {len(lip_pts)} lip vertices, mouth at {tuple(round(x, 3) for x in mouth)}")


def weight_to(obj, weights):
    """Bind every vertex of `obj` to bones: {short bone name: weight} or a function of the vertex."""
    who = obj.name.split(".")[0]
    for i, v in enumerate(obj.data.vertices):
        w = weights(v.co) if callable(weights) else weights
        for name, value in w.items():
            if value <= 0:
                continue
            group = obj.vertex_groups.get(bone(who, name)) or obj.vertex_groups.new(name=bone(who, name))
            group.add([i], value, "REPLACE")


def weights_from(obj, source, most=4):
    """Give `obj` the bone weights of the nearest points of `source` (a garment it lies on)."""
    from mathutils.kdtree import KDTree

    names = {g.index: g.name for g in source.vertex_groups if g.name.startswith("mixamorig")}
    tree = KDTree(len(source.data.vertices))
    for i, v in enumerate(source.data.vertices):
        tree.insert(v.co, i)
    tree.balance()
    for i, v in enumerate(obj.data.vertices):
        acc = {}
        for _co, j, dist in tree.find_n(v.co, 3):
            k = 1.0 / (dist + 1e-4)
            for g in source.data.vertices[j].groups:
                if g.group in names and g.weight > 0.001:
                    acc[names[g.group]] = acc.get(names[g.group], 0.0) + g.weight * k
        top = sorted(acc.items(), key=lambda kv: -kv[1])[:most]
        total = sum(w for _n, w in top) or 1.0
        for name, w in top:
            group = obj.vertex_groups.get(name) or obj.vertex_groups.new(name=name)
            group.add([i], w / total, "REPLACE")


def add_bone(who, name, head, tail, parent):
    """A bone of our own on the person's rig (rest pose, metres): something that hangs or swings."""
    rig = rig_of(who)
    select_only(rig)
    bpy.ops.object.mode_set(mode="EDIT")
    try:
        eb = rig.data.edit_bones.get(bone(who, name)) or rig.data.edit_bones.new(bone(who, name))
        eb.head = rig.matrix_world.inverted() @ Vector(head)
        eb.tail = rig.matrix_world.inverted() @ Vector(tail)
        eb.roll = 0.0
        eb.parent = rig.data.edit_bones[bone(who, parent)]
        eb.use_connect = False
        eb.use_deform = True
    finally:
        bpy.ops.object.mode_set(mode="OBJECT")
    rig.pose.bones[bone(who, name)].rotation_mode = "QUATERNION"


def add_part(who, name, bm, material, weights=None, like=None, smooth=True):
    """A modelled part of the outfit as an object on the person's rig."""
    full = f"{who}.{name}"
    old = bpy.data.objects.get(full)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(full)
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons:
        p.use_smooth = smooth
    for m in material if isinstance(material, (list, tuple)) else [material]:
        mesh.materials.append(m)
    obj = bpy.data.objects.new(full, mesh)
    work_of(who).objects.link(obj)
    obj.parent = rig_of(who)
    if like is not None:
        weights_from(obj, like)
    else:
        weight_to(obj, weights)
    mod = obj.modifiers.new("Armature", "ARMATURE")
    mod.object = rig_of(who)
    obj["twin_made"] = True
    return obj


def box(bm, lo, hi, M=None, bevel=0.0):
    made = bmesh.ops.create_cube(bm, size=1.0)["verts"]
    lo, hi = Vector(lo), Vector(hi)
    for v in made:
        v.co = Vector(((v.co.x + 0.5) * (hi.x - lo.x) + lo.x, (v.co.y + 0.5) * (hi.y - lo.y) + lo.y, (v.co.z + 0.5) * (hi.z - lo.z) + lo.z))
    if bevel:
        edges = {e for v in made for e in v.link_edges}
        new = bmesh.ops.bevel(bm, geom=list(edges), offset=bevel, segments=2, affect="EDGES", profile=0.5)
        made = new["verts"]
    if M is not None:
        bmesh.ops.transform(bm, matrix=M, verts=made)
    return made


def tube(bm, p0, p1, r0, r1=None, segs=10, caps=True):
    p0, p1 = Vector(p0), Vector(p1)
    r1 = r0 if r1 is None else r1
    axis = (p1 - p0).normalized()
    side = axis.orthogonal().normalized()
    other = axis.cross(side)
    rings = []
    for p, r in ((p0, r0), (p1, r1)):
        rings.append([bm.verts.new(p + (side * math.cos(a) + other * math.sin(a)) * r) for a in (2 * math.pi * i / segs for i in range(segs))])
    for i in range(segs):
        j = (i + 1) % segs
        bm.faces.new((rings[0][i], rings[0][j], rings[1][j], rings[1][i]))
    if caps:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[1])
    return rings[0] + rings[1]


def frame(origin, x_axis, y_axis):
    """A matrix whose X and Y lie along the given directions (Z is their cross product)."""
    x = Vector(x_axis).normalized()
    z = x.cross(Vector(y_axis)).normalized()
    y = z.cross(x)
    m = Matrix((x, y, z)).transposed().to_4x4()
    m.translation = Vector(origin)
    return m


def bvh_of(*objs):
    bm = bmesh.new()
    for o in objs:
        tmp = bmesh.new()
        tmp.from_mesh(o.data)
        tmp.transform(o.matrix_world)
        me = bpy.data.meshes.new("__bvh")
        tmp.to_mesh(me)
        tmp.free()
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
    tree = BVHTree.FromBMesh(bm)
    return tree, bm


def decal(who, name, on, centre, facing, width, height, material, up=(0, 0, 1), nx=4, ny=3, lift=0.0018, uv=(0, 0, 1, 1)):
    """
    A patch sewn onto a garment: a small grid dropped onto `on` from `facing` (the direction the
    patch looks towards), following the cloth's bone weights.
    """
    tree, keep = bvh_of(on)
    n = Vector(facing).normalized()
    upv = Vector(up).normalized()
    right = upv.cross(n).normalized()
    upv = n.cross(right).normalized()
    bm = bmesh.new()
    layer = bm.loops.layers.uv.new("UVMap")
    grid = {}
    for i in range(nx + 1):
        for j in range(ny + 1):
            a, b = i / nx, j / ny
            p = Vector(centre) + right * (a - 0.5) * width + upv * (b - 0.5) * height
            hit = tree.ray_cast(p + n * 0.12, -n, 0.3)[0]
            at = (hit if hit else p) + n * lift
            grid[i, j] = (bm.verts.new(at), (uv[0] + a * (uv[2] - uv[0]), uv[1] + b * (uv[3] - uv[1])))
    for i in range(nx):
        for j in range(ny):
            corners = [grid[i, j], grid[i + 1, j], grid[i + 1, j + 1], grid[i, j + 1]]
            face = bm.faces.new([c[0] for c in corners])
            for loop, corner in zip(face.loops, corners):
                loop[layer].uv = corner[1]
    keep.free()
    obj = add_part(who, name, bm, material, like=on, smooth=True)
    for p in obj.data.polygons:  # facing out
        if p.normal.dot(n) < 0:
            p.flip()
    return obj


def head_metrics(who):
    """Where a hat sits: the skull's outline two fingers above the brow."""
    body = obj_of(who, "body")
    eyes = obj_of(who, "eyes")
    eye_z = sum(v.co.z for v in eyes.data.vertices) / len(eyes.data.vertices)
    head = body.vertex_groups[bone(who, "Head")].index
    pts = [v.co.copy() for v in body.data.vertices if any(g.group == head and g.weight > 0.5 for g in v.groups) and v.co.z > eye_z]
    top = max(p.z for p in pts)
    band = eye_z + 0.058
    ring = [p for p in pts if abs(p.z - band) < 0.012]
    x0, x1 = min(p.x for p in ring), max(p.x for p in ring)
    y0, y1 = min(p.y for p in ring), max(p.y for p in ring)
    return {"eye_z": eye_z, "top": top, "band": band, "centre": Vector(((x0 + x1) / 2, (y0 + y1) / 2, band)), "a": (x1 - x0) / 2, "b": (y1 - y0) / 2,
            "eye_y": min(v.co.y for v in eyes.data.vertices), "eye_x": max(v.co.x for v in eyes.data.vertices)}


def hard_hat(who, colour):
    """A site hard hat: a ribbed shell with a peak, sitting level two fingers above the brow."""
    h = head_metrics(who)
    c = h["centre"]
    gap = 0.013
    a, b = h["a"] + gap, h["b"] + gap
    z0 = h["band"] - 0.012
    height = h["top"] - z0 + 0.028
    segs, rows = 36, 8
    bm = bmesh.new()
    rings = []

    def point(theta, r, z):
        return Vector((c.x + a * r * math.cos(theta), c.y + b * r * math.sin(theta), z))

    # the peak and the narrow lip round the rim (front is -Y)
    lip = []
    for i in range(segs):
        theta = 2 * math.pi * i / segs
        front = max(0.0, math.cos(theta + math.pi / 2)) ** 1.6
        w = 0.011 + 0.052 * front
        p = point(theta, 1.0, z0)
        out = Vector((math.cos(theta) * b, math.sin(theta) * a, 0)).normalized()
        lip.append(bm.verts.new(p + out * w + Vector((0, 0, -0.004 - 0.008 * front))))
    rings.append(lip)
    for j in range(rows + 1):
        t = math.sin(j / rows * math.pi / 2)
        r = (1 - t ** 2.5) ** (1 / 2.5)
        if j == rows:
            break
        ring = []
        for i in range(segs):
            theta = 2 * math.pi * i / segs
            p = point(theta, r, z0 + height * t)
            # three ribs running front to back over the crown
            for x_rib, tall in ((0.0, 0.006), (0.04, 0.0035), (-0.04, 0.0035)):
                p.z += tall * math.exp(-(((p.x - c.x) - x_rib) / 0.011) ** 2) * min(1.0, t * 3)
            ring.append(bm.verts.new(p))
        rings.append(ring)
    crown = bm.verts.new(Vector((c.x, c.y, z0 + height + 0.006)))
    for j in range(len(rings) - 1):
        for i in range(segs):
            k = (i + 1) % segs
            bm.faces.new((rings[j][i], rings[j][k], rings[j + 1][k], rings[j + 1][i]))
    for i in range(segs):
        bm.faces.new((rings[-1][i], rings[-1][(i + 1) % segs], crown))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.0035)
    # the suspension band that shows under the rim
    band = []
    for z in (z0 - 0.006, z0 + 0.016):
        band.append([bm.verts.new(Vector((c.x + (h["a"] + 0.003) * math.cos(t), c.y + (h["b"] + 0.003) * math.sin(t), z))) for t in (2 * math.pi * i / 24 for i in range(24))])
    band_faces = []
    for i in range(24):
        k = (i + 1) % 24
        band_faces.append(bm.faces.new((band[0][i], band[0][k], band[1][k], band[1][i])))
    shell = flat_material(f"{who}.hardhat.mat", colour, rough=0.38)
    strap = flat_material(f"{who}.hatband.mat", (0.05, 0.05, 0.055), rough=0.8)
    for f in band_faces:
        f.material_index = 1
    hat = add_part(who, "hardhat", bm, [shell, strap], weights={"Head": 1.0})
    hat["twin_hat"] = [c.x, c.y, z0, a, b, height]
    return hat, h


def trim_inside_hat(who, hat):
    """Hair and scalp inside the hat are cut away, so nothing shows through the shell."""
    cx, cy, z0, a, b, height = hat["twin_hat"]

    def inside(p, shrink):
        t = (p.z - z0) / height
        if t < 0:
            return False
        if t >= 1:
            return True
        r = (1 - t ** 2.5) ** (1 / 2.5)
        return ((p.x - cx) / (a * r + shrink)) ** 2 + ((p.y - cy) / (b * r + shrink)) ** 2 > 0.72 or t > 0.25

    for part in ("hair",):
        o = obj_of(who, part)
        bm = bmesh.new()
        bm.from_mesh(o.data)
        doomed = [v for v in bm.verts if v.co.z > z0 + 0.004]
        bmesh.ops.delete(bm, geom=doomed, context="VERTS")
        bm.to_mesh(o.data)
        bm.free()


def fix_glove_weights(obj):
    """MPFB2's glove comes with knuckle weights on the right shoulder bone: they belong to the hand."""
    for side in ("Left", "Right"):
        wrong = obj.vertex_groups.get(f"mixamorig:{side}Shoulder")
        hand = obj.vertex_groups.get(f"mixamorig:{side}Hand")
        if wrong is None or hand is None:
            continue
        for v in obj.data.vertices:
            w = next((g.weight for g in v.groups if g.group == wrong.index), 0.0)
            if w > 0:
                hand.add([v.index], w, "ADD")
                wrong.remove([v.index])


def remove_hidden_body(who, extra_cover=()):
    """Skin under clothing is removed (QUALITY-BAR section 3), keeping a margin inside every opening."""
    from mathutils.kdtree import KDTree

    body = obj_of(who, "body")
    cover = [o for o in parts_of(who) if o.get("twin_wear", "").startswith("wear:") or o.name.split(".", 1)[1] in extra_cover]
    cover = [o for o in cover if "glove" not in o.name or True]
    tree, keep = bvh_of(*cover)
    bm = bmesh.new()
    bm.from_mesh(body.data)
    bm.verts.ensure_lookup_table()
    bm.normal_update()
    # (trouser legs hang well clear of the leg; a collar must not count as covering the jaw)
    deform = bm.verts.layers.deform.verify()
    names = {g.index: g.name for g in body.vertex_groups if g.name.startswith("mixamorig")}
    covered = []
    for v in bm.verts:
        w = {g: x for g, x in v[deform].items() if g in names}
        main = names[max(w, key=w.get)] if w else ""
        reach = 0.1 if ("Leg" in main or "Hips" in main) else 0.05 if ("Spine" in main or "Arm" in main or "Shoulder" in main) else 0.025
        hit = tree.ray_cast(v.co - v.normal * 0.004, v.normal, reach)
        covered.append(hit[0] is not None)
    bare = [v for v, c in zip(bm.verts, covered) if not c]
    kd = KDTree(len(bare))
    for i, v in enumerate(bare):
        kd.insert(v.co, i)
    kd.balance()
    doomed = set()
    for v, c in zip(bm.verts, covered):
        if c and kd.find(v.co)[2] > 0.035:
            doomed.add(v)
    faces = [f for f in bm.faces if all(v in doomed for v in f.verts)]
    bmesh.ops.delete(bm, geom=faces, context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(body.data)
    bm.free()
    keep.free()
    print(f"[people] {who}: body under clothing removed, {tris(body.data)} triangles of skin left")


def tuck(who, garment, into, z_line, blend=0.09, cut_below=0.015, lift=0.003, reach=0.09):
    """
    Pull a garment in against what it is tucked into below `z_line` and cut off what is hidden.
    A negative `lift` puts it inside (trouser legs in boots). Sleeves are left alone.
    """
    tree, keep = bvh_of(*into)
    o = obj_of(who, garment)
    arms = {g.index for g in o.vertex_groups if "Arm" in g.name or "Hand" in g.name}
    bm = bmesh.new()
    bm.from_mesh(o.data)
    deform = bm.verts.layers.deform.verify()
    moved = set()
    for v in bm.verts:
        if v.co.z > z_line + blend or sum(w for g, w in v[deform].items() if g in arms) > 0.2:
            continue
        near = tree.find_nearest(v.co, reach)
        if near[0] is None:
            continue
        k = 1.0 - max(0.0, min(1.0, (v.co.z - z_line) / blend))
        k = k * k * (3 - 2 * k)
        target = near[0] + near[1] * lift
        v.co = v.co.lerp(target, k)
        moved.add(v)
    doomed = [f for f in bm.faces if all(v.co.z < z_line - cut_below and v in moved for v in f.verts)]
    bmesh.ops.delete(bm, geom=doomed, context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(o.data)
    bm.free()
    keep.free()


def waist_ring(who, z, over, height, lift, segs=40):
    """Points round the waist at height z, on the outside of `over` (for a belt)."""
    tree, keep = bvh_of(*over)
    hips = bone_head(who, "Hips")
    ring = []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        d = Vector((math.cos(a), math.sin(a), 0))
        origin = Vector((hips.x, hips.y, z))
        hit = tree.ray_cast(origin + d * 0.6, -d, 0.6)[0]
        ring.append(((hit if hit else origin + d * 0.16) + d * lift, d))
    keep.free()
    return ring


def dress_guard(who):
    spec = PEOPLE[who]
    shirt = obj_of(who, "elvs_male_shirt_untucked_bd1")
    trousers = obj_of(who, "elvs_male_trouser")
    shoes = obj_of(who, "shoes04")
    cap = obj_of(who, "toigo_maga_hat")
    body = obj_of(who, "body")

    # the shirt is tucked in and belted
    top = max(v.co.z for v in trousers.data.vertices)
    belt_z = top - 0.03
    tuck(who, "elvs_male_shirt_untucked_bd1", [trousers], belt_z, blend=0.1, cut_below=0.012)
    ring = waist_ring(who, belt_z, [shirt, trousers], 0.04, 0.004)
    bm = bmesh.new()
    lo, hi = [], []
    for p, d in ring:
        lo.append(bm.verts.new(p + Vector((0, 0, -0.021))))
        hi.append(bm.verts.new(p + Vector((0, 0, 0.021))))
    n = len(ring)
    for i in range(n):
        k = (i + 1) % n
        bm.faces.new((lo[i], lo[k], hi[k], hi[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.004)
    leather = flat_material(f"{who}.belt.mat", (0.035, 0.032, 0.03), rough=0.45, grain=0.5)
    belt = add_part(who, "belt", bm, leather, like=trousers)
    front = min(ring, key=lambda pd: pd[0].y)[0]
    bm = bmesh.new()
    box(bm, (front.x - 0.03, front.y - 0.009, belt_z - 0.026), (front.x + 0.03, front.y + 0.002, belt_z + 0.026), bevel=0.003)
    add_part(who, "buckle", bm, flat_material(f"{who}.buckle.mat", (0.75, 0.62, 0.3), rough=0.3, metal=1.0), like=trousers, smooth=False)

    # radio on the left hip, baton hanging from a ring on the right
    left = max(ring, key=lambda pd: pd[0].x)[0]
    right = min(ring, key=lambda pd: pd[0].x)[0]
    bm = bmesh.new()
    M = Matrix.Translation((left.x + 0.016, left.y - 0.01, belt_z - 0.02)) @ Matrix.Rotation(math.radians(8), 4, "Y")
    box(bm, (-0.013, -0.03, -0.065), (0.02, 0.03, 0.055), M=M, bevel=0.004)
    tube(bm, M @ Vector((0.004, -0.018, 0.055)), M @ Vector((0.004, -0.018, 0.135)), 0.0045, 0.003, segs=6)
    tube(bm, M @ Vector((0.004, 0.016, 0.055)), M @ Vector((0.004, 0.016, 0.068)), 0.008, segs=8)
    add_part(who, "radio", bm, flat_material(f"{who}.radio.mat", (0.03, 0.03, 0.033), rough=0.55, grain=0.3), weights={"Hips": 1.0}, smooth=False)
    bm = bmesh.new()
    top_p = Vector((right.x - 0.03, right.y + 0.02, belt_z - 0.01))
    tube(bm, top_p + Vector((0, 0, 0.12)), top_p + Vector((-0.012, 0.012, -0.36)), 0.014, 0.0155, segs=10)
    tube(bm, top_p + Vector((0, 0, 0.012)), top_p + Vector((0, 0, -0.012)), 0.021, segs=10)
    # (the stick swings on a bone of its own from the ring, which stays on the belt: build_gate_people_clips.py hangs it)
    add_bone(who, "Baton", top_p, top_p + Vector((-0.012, 0.012, -0.36)), "Hips")
    ring_r = 0.018

    def baton_weights(co):
        on_ring = abs(co.z - top_p.z) <= 0.0125 and Vector((co.x - top_p.x, co.y - top_p.y)).length > ring_r
        return {"Hips": 1.0} if on_ring else {"Baton": 1.0}

    add_part(who, "baton", bm, flat_material(f"{who}.baton.mat", (0.045, 0.04, 0.035), rough=0.5, grain=0.4), weights=baton_weights)

    # epaulettes, shoulder patches, a badge and an ID
    navy = (0.02, 0.03, 0.07)
    patch = flat_material(f"{who}.patch.mat", navy, rough=0.9, grain=0.6)
    gold = flat_material(f"{who}.gold.mat", (0.72, 0.58, 0.22), rough=0.4, metal=0.8)
    card = flat_material(f"{who}.id.mat", (0.9, 0.9, 0.88), rough=0.35)
    for side, s in (("Left", 1), ("Right", -1)):
        a, b = bone_head(who, f"{side}Shoulder"), bone_head(who, f"{side}Arm")
        mid = a.lerp(b, 0.62)
        decal(who, f"epaulette.{side}", shirt, mid + Vector((0, 0, 0.02)), (0, -0.15, 1), 0.05, (b - a).length * 0.7, patch, up=(b - a), nx=2, ny=4, lift=0.004)
        arm, fore = bone_head(who, f"{side}Arm"), bone_head(who, f"{side}ForeArm")
        d = (fore - arm).normalized()
        out = Vector((s, 0, 0)) - d * d.dot(Vector((s, 0, 0)))
        decal(who, f"armpatch.{side}", shirt, arm + d * 0.11, out + Vector((0, 0, 0.6)), 0.07, 0.085, patch, up=-d, nx=3, ny=3)
    chest = bone_head(who, "Spine2")
    front_y = min(v.co.y for v in shirt.data.vertices if abs(v.co.z - chest.z) < 0.04)
    decal(who, "badge", shirt, Vector((0.095, front_y, chest.z + 0.045)), (0.25, -1, 0.1), 0.05, 0.06, gold, nx=3, ny=3, lift=0.003)
    decal(who, "nametape", shirt, Vector((-0.095, front_y, chest.z + 0.035)), (-0.25, -1, 0.1), 0.085, 0.022, patch, nx=4, ny=1)
    decal(who, "id", shirt, Vector((-0.1, front_y, chest.z - 0.04)), (-0.25, -1, 0.05), 0.055, 0.085, card, nx=2, ny=3, lift=0.004)

    # colours: white shirt, navy trousers and cap, black shoes
    retone(shirt.data.materials[0], (0.80, 0.82, 0.84), level=0.9, rough=0.82)
    fabric(shirt.data.materials[0], shirt, "stretch_poplin", 0.29, strength=0.8, tone=0.22)
    retone(trousers.data.materials[0], navy, level=1.6, rough=0.86)
    fabric(trousers.data.materials[0], trousers, "rough_linen", 0.27, strength=0.9, tone=0.3)
    grime(trousers.data.materials[0], (0.32, 0.25, 0.18), 0.3, 0.55)
    sweat_and_dust(who, shirt, trousers, (0.80, 0.82, 0.84), dusty=0.22)
    retone(shoes.data.materials[0], (0.05, 0.05, 0.055), level=1.3, rough=0.32)
    grime(shoes.data.materials[0], (0.34, 0.26, 0.18), 0.09, 0.8)
    cap_mat = flat_material(f"{who}.cap.mat", navy, rough=0.88, grain=0.7)
    cap.data.materials.clear()
    cap.data.materials.append(cap_mat)
    h = head_metrics(who)
    front_cap = min(v.co.y for v in cap.data.vertices if v.co.z > h["band"] + 0.01)
    decal(who, "capbadge", cap, Vector((h["centre"].x, front_cap, h["band"] + 0.035)), (0, -1, 0.35), 0.045, 0.04, gold, nx=3, ny=2, lift=0.003)
    # hair under the cap
    o = obj_of(who, "hair")
    bm = bmesh.new()
    bm.from_mesh(o.data)
    cz = min(v.co.z for v in cap.data.vertices)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z > cz + 0.012], context="VERTS")
    bm.to_mesh(o.data)
    bm.free()
    remove_hidden_body(who, extra_cover=("toigo_maga_hat",))


def vest_from(who, shirt, colour):
    """
    The site's reflectorized vest, as the owner photographed it (2026-10-14): lime mesh, open down
    the front (two narrow panels, no zip), deep armholes open at the sides down to a band at the
    hem, ending at the waist above the belt. Wide silver prismatic tape: straight down each front
    panel from the shoulder, a V on the back from the shoulders towards the middle of the hem, and a
    band round the hem. Edges bound in lime; a small orange name tag on the left chest.
    Every measure is taken from the man's own torso (shoulder width, neck, hips), so it fits his
    frame. Cut from his shirt for its bone weights; worn 7 mm over it; below the chest it hangs
    straight instead of following the body.
    """
    arm_groups = {g.index for g in shirt.vertex_groups if any(k in g.name for k in ("Arm", "Hand"))}
    hips = bone_head(who, "Hips")
    neck = bone_head(who, "Neck")
    chest_z = bone_head(who, "Spine2").z
    shoulder_x = abs(bone_head(who, "LeftArm").x) - 0.012
    hem = hips.z + 0.045  # (at the waist, just above the belt)
    armpit = bone_head(who, "LeftArm").z - 0.06
    opening = max(0.05, 0.3 * shoulder_x)  # half the gap between the front panels
    band = 0.065 * shoulder_x / 0.17  # the hem band's height, by his frame
    bm = bmesh.new()
    bm.from_mesh(shirt.data)
    deform = bm.verts.layers.deform.verify()
    keep = set()
    for v in bm.verts:
        arm_w = sum(w for g, w in v[deform].items() if g in arm_groups)
        x, y, z = v.co
        if arm_w >= 0.55 or abs(x) >= shoulder_x or not (hem < z < neck.z - 0.012):
            continue
        if y < 0 and abs(x) < opening:  # (open down the front)
            continue
        # deep armholes: the sides are open from the armpit down to the hem band
        side = abs(y) < 0.45 * abs(x) and abs(x) > 0.6 * shoulder_x
        if side and hem + band + 0.012 < z < armpit + 0.06:
            continue
        keep.add(v)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not all(v in keep for v in f.verts)], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    # (the shirt's pockets, buttons and flaps are pieces of their own: the vest is flat over them.
    #  Its yoke and panels are pieces too, and stay)
    bmesh.ops.delete(bm, geom=[f for piece, area in loose_pieces(bm) if area < 0.015 for f in piece], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=24)  # (where a pocket lay over the shirt)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    # (the cut follows the shirt's triangles: straighten its zigzag along the edges)
    for _ in range(12):
        edge = [v for v in bm.verts if v.is_boundary]
        bmesh.ops.smooth_vert(bm, verts=edge, factor=0.5, use_axis_x=True, use_axis_y=False, use_axis_z=True)
    # the front panels' real width at the chest (the armhole takes what the arm's weights did)
    outer = max((abs(v.co.x) for v in bm.verts if v.co.y < 0 and abs(v.co.z - chest_z) < 0.04), default=shoulder_x * 0.9)
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * 0.007
    # below the chest it hangs: front and back never come in closer than the chest and the
    # shoulder blades (by columns across the body)
    front, back = {}, {}
    for v in bm.verts:
        if chest_z - 0.03 < v.co.z < chest_z + 0.05:
            k = round(v.co.x / 0.02)
            if v.co.y < 0:
                front[k] = min(front.get(k, 0.0), v.co.y)
            else:
                back[k] = max(back.get(k, 0.0), v.co.y)
    for v in bm.verts:
        if v.co.z < chest_z:
            k = round(v.co.x / 0.02)
            if v.co.y < 0 and k in front:
                v.co.y = min(v.co.y, front[k] + 0.004)
            elif v.co.y >= 0 and k in back:
                v.co.y = max(v.co.y, back[k] - 0.004)
    for _ in range(3):
        bmesh.ops.smooth_vert(bm, verts=[v for v in bm.verts if not v.is_boundary], factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    mesh = bpy.data.meshes.new(f"{who}.vest")
    bm.to_mesh(mesh)
    bm.free()
    old = bpy.data.objects.get(f"{who}.vest")
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    vest = bpy.data.objects.new(f"{who}.vest", mesh)
    work_of(who).objects.link(vest)
    vest.parent = rig_of(who)
    for g in shirt.vertex_groups:
        vest.vertex_groups.new(name=g.name)
    vest["twin_outer_faces"] = len(mesh.polygons)  # (solidify keeps the original faces first: the outside)
    mod = vest.modifiers.new("Solid", "SOLIDIFY")
    mod.thickness = 0.004
    mod.offset = -1
    select_only(vest)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod = vest.modifiers.new("Armature", "ARMATURE")
    mod.object = rig_of(who)
    vest["twin_made"] = True

    # the mesh: lime net over a dark shirt reads darker and grainier than a solid lime
    mat = flat_material(f"{who}.vest.mat", colour, rough=0.85, grain=0.4)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    net = nodes.new("ShaderNodeTexVoronoi")
    net.inputs["Scale"].default_value = 260
    holes = nodes.new("ShaderNodeMapRange")
    holes.inputs["From Min"].default_value = 0.15
    holes.inputs["From Max"].default_value = 0.45
    holes.inputs["To Min"].default_value = 0.55
    holes.inputs["To Max"].default_value = 0.0
    links.new(net.outputs["Distance"], holes.inputs["Value"])
    overlay(mat, holes.outputs[0], tuple(c * 0.38 for c in colour))

    sep = nodes.new("ShaderNodeSeparateXYZ")
    links.new(position(mat), sep.inputs[0])

    def math(op, a, b=None, clamp=False):
        n = nodes.new("ShaderNodeMath")
        n.operation = op
        n.use_clamp = clamp
        for i, x in enumerate((a, b)):
            if x is None:
                continue
            if isinstance(x, (int, float)):
                n.inputs[i].default_value = x
            else:
                links.new(x, n.inputs[i])
        return n.outputs[0]

    def within(value, half, soft=0.0015):
        """1 where |value| < half, with a soft edge."""
        r = nodes.new("ShaderNodeMapRange")
        r.interpolation_type = "SMOOTHSTEP"
        r.inputs["From Min"].default_value = half - soft
        r.inputs["From Max"].default_value = half + soft
        r.inputs["To Min"].default_value = 1.0
        r.inputs["To Max"].default_value = 0.0
        links.new(math("ABSOLUTE", value), r.inputs["Value"])
        return r.outputs[0]

    X, Y, Z = sep.outputs["X"], sep.outputs["Y"], sep.outputs["Z"]
    absx = math("ABSOLUTE", X)
    is_front = math("LESS_THAN", Y, 0.0)
    is_back = math("GREATER_THAN", Y, 0.0)
    # front: straight down the middle of each panel, with lime either side (tape width by his frame)
    panel_mid = (opening + outer) / 2
    w = min(0.052 * shoulder_x / 0.17, 0.5 * (outer - opening))
    front_tape = math("MULTIPLY", within(math("SUBTRACT", absx, panel_mid), w / 2), is_front)
    # back: a V from the shoulders to near the middle of the hem band
    top_x, bottom_x = 0.6 * shoulder_x, 0.2 * shoulder_x
    z_top, z_bot = neck.z - 0.02, hem + band
    t = math("DIVIDE", math("SUBTRACT", Z, z_bot), z_top - z_bot)
    centre = math("ADD", math("MULTIPLY", t, top_x - bottom_x), bottom_x)
    back_tape = math("MULTIPLY", math("MULTIPLY", within(math("SUBTRACT", absx, centre), w / 2), is_back), math("GREATER_THAN", Z, z_bot - 0.005))
    # round the hem
    hem_tape = within(math("SUBTRACT", Z, hem + 0.008 + (band - 0.01) / 2), (band - 0.01) / 2)
    tape = math("MAXIMUM", math("MAXIMUM", front_tape, back_tape), hem_tape)
    # the prismatic tape: silver, smooth, a faint diamond pattern in its roughness
    prism = nodes.new("ShaderNodeTexVoronoi")
    prism.inputs["Scale"].default_value = 90
    shine = nodes.new("ShaderNodeMapRange")
    shine.inputs["To Min"].default_value = 0.18
    shine.inputs["To Max"].default_value = 0.4
    links.new(prism.outputs["Distance"], shine.inputs["Value"])
    overlay(mat, tape, (0.72, 0.74, 0.74), metal=0.0)
    r = bsdf_of(mat).inputs["Roughness"]
    mix = nodes.new("ShaderNodeMix")
    mix.data_type = "FLOAT"
    links.new(r.links[0].from_socket, mix.inputs["A"])
    links.new(shine.outputs[0], mix.inputs["B"])
    links.new(tape, mix.inputs["Factor"])
    links.new(mix.outputs["Result"], r)
    # the name tag on the left chest: orange with a silver stripe
    tag_x, tag_z = panel_mid, chest_z + 0.035
    tag = math("MULTIPLY", math("MULTIPLY", within(math("SUBTRACT", X, tag_x), w / 2 + 0.004), within(math("SUBTRACT", Z, tag_z), 0.011)), is_front)
    stripe = math("MULTIPLY", tag, within(math("SUBTRACT", Z, tag_z), 0.004))
    overlay(mat, tag, (0.92, 0.34, 0.06), rough=0.6)
    overlay(mat, stripe, (0.7, 0.72, 0.72), rough=0.3)
    mesh.materials.clear()
    mesh.materials.append(mat)
    fabric(mat, vest, "bi_stretch", 0.2, strength=0.7, tone=0.15)
    print(f"[people] {who}: vest, front opening {opening * 200:.0f} cm, panels {(outer - opening) * 100:.1f} cm, hem {hem:.2f} m, tape {w * 100:.1f} cm")
    return vest


def hide_under(who, under, over, margin=0.02):
    """Faces of `under` that lie well inside `over` are removed (shirt under a vest)."""
    from mathutils.kdtree import KDTree

    tree, keep = bvh_of(over)
    bm = bmesh.new()
    bm.from_mesh(under.data)
    bm.normal_update()
    covered = [tree.ray_cast(v.co, v.normal, 0.02)[0] is not None for v in bm.verts]
    bare = [v for v, c in zip(bm.verts, covered) if not c]
    kd = KDTree(len(bare))
    for i, v in enumerate(bare):
        kd.insert(v.co, i)
    kd.balance()
    doomed = {v for v, c in zip(bm.verts, covered) if c and kd.find(v.co)[2] > margin}
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if all(v in doomed for v in f.verts)], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(under.data)
    bm.free()
    keep.free()


def hand_frame(who, side):
    """The hand in the rest pose: wrist, the direction of the fingers, and the way the palm faces."""
    wrist = bone_head(who, f"{side}Hand")
    middle = bone_head(who, f"{side}HandMiddle1")
    index = bone_head(who, f"{side}HandIndex1")
    pinky = bone_head(who, f"{side}HandPinky1")
    fingers = (middle - wrist).normalized()
    across = (index - pinky).normalized()
    # (a right hand's palm faces across x fingers; a left hand's the other way)
    palm = across.cross(fingers).normalized() if side == "Right" else fingers.cross(across).normalized()
    centre = wrist.lerp(middle, 0.6)
    return {"wrist": wrist, "knuckle": middle, "fingers": fingers, "across": across, "palm": palm, "centre": centre}


def dress_engineer(who):
    shirt = obj_of(who, "elvs_male_shirt_untucked_bd1")
    jeans = obj_of(who, "punkduck_male_classic_jeans")
    boots = obj_of(who, "mindfront_shoes_biker_boots_male")
    hat, h = hard_hat(who, (0.9, 0.9, 0.88))
    trim_inside_hat(who, hat)

    retone(shirt.data.materials[0], (0.20, 0.27, 0.36), level=1.5, rough=0.84)
    fabric(shirt.data.materials[0], shirt, "stretch_poplin", 0.29, strength=0.8, tone=0.25)
    retone(jeans.data.materials[0], (0.5, 0.5, 0.5), level=0.5, keep=0.75, rough=0.88)
    fabric(jeans.data.materials[0], jeans, "denim_fabric_06", 0.25, strength=1.0, tone=0.35)
    grime(jeans.data.materials[0], (0.34, 0.26, 0.18), 0.35, 0.5)
    sweat_and_dust(who, shirt, jeans, (0.20, 0.27, 0.36), dusty=0.3)
    retone(boots.data.materials[0], (0.36, 0.24, 0.13), level=1.1, rough=0.6)
    grime(boots.data.materials[0], (0.34, 0.26, 0.18), 0.12, 0.85)
    # (boots under the jeans: the shaft is hidden and costs triangles)
    hem = min(v.co.z for v in jeans.data.vertices)
    bm = bmesh.new()
    bm.from_mesh(boots.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if all(v.co.z > hem + 0.05 for v in f.verts)], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(boots.data)
    bm.free()

    vest = vest_from(who, shirt, (0.62, 0.9, 0.03))  # (fluorescent lime)
    hide_under(who, shirt, vest)
    # (the shirt's pockets stand off it further than the vest: those the vest lies over go)
    tree, keep = bvh_of(vest)
    bm = bmesh.new()
    bm.from_mesh(shirt.data)
    doomed = [f for piece, area in loose_pieces(bm) if area < 0.04 and tree.find_nearest(sum((f.calc_center_median() for f in piece), Vector()) / len(piece), 0.03)[0] is not None for f in piece]
    bmesh.ops.delete(bm, geom=doomed, context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(shirt.data)
    bm.free()
    keep.free()
    chest = bone_head(who, "Spine2")
    front_y = min(v.co.y for v in vest.data.vertices if abs(v.co.z - chest.z) < 0.04)
    decal(who, "id", vest, Vector((-0.1, front_y, chest.z + 0.0)), (-0.2, -1, 0.05), 0.055, 0.085, flat_material(f"{who}.id.mat", (0.9, 0.9, 0.88), rough=0.35), nx=2, ny=3, lift=0.004)

    # safety glasses: a frame across the brow and two arms to the ears
    dark = flat_material(f"{who}.glasses.mat", (0.04, 0.04, 0.045), rough=0.35)
    bm = bmesh.new()
    ez, ey, ex = h["eye_z"], h["eye_y"] - 0.012, h["eye_x"]
    cx = h["centre"].x
    for s in (1, -1):
        x0, x1 = cx + s * 0.008, cx + s * (ex - cx + 0.014)
        pts = [Vector((x0, ey, ez + 0.012)), Vector((x1, ey + 0.004, ez + 0.014)), Vector((x1 + s * 0.004, ey + 0.006, ez - 0.012)), Vector((x0, ey, ez - 0.014))]
        for i in range(4):
            tube(bm, pts[i], pts[(i + 1) % 4], 0.0022, segs=5)
        tube(bm, Vector((x1 + s * 0.003, ey + 0.006, ez + 0.006)), Vector((cx + s * (h["a"] + 0.004), h["centre"].y + 0.01, ez + 0.012)), 0.002, segs=5)
    tube(bm, Vector((cx - 0.008, ey, ez + 0.006)), Vector((cx + 0.008, ey, ez + 0.006)), 0.0022, segs=5)
    add_part(who, "glasses", bm, dark, weights={"Head": 1.0})

    # a tablet carried in the left hand, flat against the palm
    hf = hand_frame(who, "Left")
    M = frame(hf["knuckle"] + hf["palm"] * 0.017 + hf["fingers"] * 0.01, hf["across"], hf["fingers"])
    if (M.to_3x3() @ Vector((0, 0, 1))).dot(hf["palm"]) < 0:
        M = M @ Matrix.Rotation(math.pi, 4, "Y")
    bm = bmesh.new()
    box(bm, (-0.085, -0.19, -0.0045), (0.085, 0.06, 0.0045), M=M, bevel=0.002)
    case = flat_material(f"{who}.tablet.mat", (0.05, 0.05, 0.055), rough=0.5, grain=0.3)
    screen = flat_material(f"{who}.screen.mat", (0.015, 0.02, 0.03), rough=0.08)
    tablet = add_part(who, "tablet", bm, [case, screen], weights={"LeftHand": 1.0}, smooth=False)
    tablet["twin_frame"] = [list(r) for r in M]
    # (the face turned away from the palm is the screen)
    for p in tablet.data.polygons:
        if p.normal.dot(hf["palm"]) > 0.9 and p.area > 0.02:
            p.material_index = 1
    remove_hidden_body(who, extra_cover=("hardhat", "vest"))


def dress_labourer(who):
    top = obj_of(who, "mindfront_knitted_sweater_01")
    trousers = obj_of(who, "mindfront_male_trousers_1")
    boots = obj_of(who, "punkduck_riding_boots")
    gloves = obj_of(who, "toigo_gloves_short")
    body = obj_of(who, "body")
    hat, h = hard_hat(who, (0.02, 0.36, 0.14))
    trim_inside_hat(who, hat)

    # trousers tucked into rubber boots
    boot_top = max(v.co.z for v in boots.data.vertices)
    tuck(who, "mindfront_male_trousers_1", [boots], boot_top - 0.015, blend=0.08, cut_below=0.03, lift=-0.004, reach=0.2)

    # a towel worn under the hat, over the ears and down the back of the neck (P02d: fitted to the head)
    head_towel(who, hat, top)

    # colours: faded green long sleeves with yellow reflective bands, dusty work trousers, black rubber boots
    mat = top.data.materials[0]
    retone(mat, (0.10, 0.30, 0.20), level=1.25, rough=0.9)
    fabric(mat, top, "cotton_jersey", 0.26, strength=1.0, tone=0.35)
    bands = []
    for side in ("Left", "Right"):
        arm, fore = bone_head(who, f"{side}Arm"), bone_head(who, f"{side}ForeArm")
        d = fore - arm
        bands.append(band_mask(mat, arm, d, d.length * 0.42, d.length * 0.42 + 0.045, radius=0.085))
        hand = bone_head(who, f"{side}Hand")
        d2 = hand - fore
        bands.append(band_mask(mat, fore, d2, d2.length * 0.5, d2.length * 0.5 + 0.045, radius=0.075))
    chest = bone_head(who, "Spine2")
    bands.append(band_mask(mat, (0, 0, chest.z - 0.06), (0, 0, 1), 0.0, 0.05, radius=0.19))
    overlay(mat, any_of(mat, *bands), (0.85, 0.80, 0.10), rough=0.4)
    grime(mat, (0.36, 0.28, 0.2), 1.25, 0.28)
    retone(trousers.data.materials[0], (0.20, 0.19, 0.17), level=1.3, rough=0.9)
    fabric(trousers.data.materials[0], trousers, "denim_fabric_05", 0.27, strength=1.0, tone=0.3)
    grime(trousers.data.materials[0], (0.36, 0.27, 0.18), 0.75, 0.75)
    sweat_and_dust(who, top, trousers, (0.10, 0.30, 0.20), dusty=0.6)
    boot_mat = flat_material(f"{who}.rubber.mat", (0.035, 0.036, 0.038), rough=0.35)
    grime(boot_mat, (0.36, 0.27, 0.18), boot_top * 0.8, 0.95)
    boots.data.materials.clear()
    boots.data.materials.append(boot_mat)
    fix_glove_weights(gloves)
    retone(gloves.data.materials[0], (0.55, 0.53, 0.48), level=1.0, rough=0.95)
    fabric(gloves.data.materials[0], gloves, "cotton_jersey", 0.12, strength=1.2, tone=0.3)
    grime(gloves.data.materials[0], (0.3, 0.22, 0.15), 2.0, 0.35)

    # a long-handled round-point shovel in the right hand: the shaft lies in the grip, blade down
    hf = hand_frame(who, "Right")
    grip = hf["knuckle"] - hf["fingers"] * 0.02 + hf["palm"] * 0.022
    axis = hf["across"] if hf["across"].z < 0 else -hf["across"]  # the blade end points down the arm's outside
    wood = flat_material(f"{who}.shaft.mat", (0.42, 0.29, 0.16), rough=0.7, grain=0.5)
    steel = flat_material(f"{who}.blade.mat", (0.22, 0.2, 0.18), rough=0.5, metal=0.85)
    GRIP_FROM_TIP = 1.02
    LENGTH = 1.42
    bm = bmesh.new()
    tip = grip + axis * GRIP_FROM_TIP
    end = grip - axis * (LENGTH - GRIP_FROM_TIP)
    shaft_faces = len(bm.faces)
    tube(bm, end, tip - axis * 0.27, 0.0165, 0.018, segs=8)
    n_shaft = len(bm.faces)
    side = axis.cross(hf["palm"]).normalized()
    face_n = axis.cross(side).normalized()
    # the socket and the blade: a dished plate coming to a rounded point
    tube(bm, tip - axis * 0.36, tip - axis * 0.25, 0.021, 0.024, segs=8)
    cols, rows = 6, 6
    plate = []
    for j in range(rows + 1):
        t = j / rows
        w = 0.105 * (1 - max(0.0, (t - 0.45) / 0.55) ** 2.2) * min(1.0, 0.55 + t * 3)
        row = []
        for i in range(cols + 1):
            u = i / cols * 2 - 1
            row.append(bm.verts.new(tip - axis * (0.28 * (1 - t)) + side * w * u + face_n * (0.018 * (1 - u * u) * (1 - t * 0.6) - 0.012)))
        plate.append(row)
    for j in range(rows):
        for i in range(cols):
            bm.faces.new((plate[j][i], plate[j][i + 1], plate[j + 1][i + 1], plate[j + 1][i]))
    bm.faces.ensure_lookup_table()
    for f in bm.faces[n_shaft:]:
        f.material_index = 1
    blade_faces = [f for f in bm.faces if f.material_index == 1 and len(f.verts) == 4 and f.index >= n_shaft + 10]
    bmesh.ops.solidify(bm, geom=blade_faces, thickness=0.003)
    shovel = add_part(who, "shovel", bm, [wood, steel], weights={"RightHand": 1.0})
    shovel["twin_grip"] = list(grip)
    shovel["twin_axis"] = list(axis)
    shovel["twin_grip_from_tip"] = GRIP_FROM_TIP
    remove_hidden_body(who, extra_cover=("hardhat", "cloth"))


def keep_bare_hair(who):
    """
    The whole hair, before a hat cuts it, kept as `<who>.hairBare` (hidden, not exported): the
    bare-headed look when a man takes his hat off (P08e) starts from it.
    """
    hair = obj_of(who, "hair")
    old = bpy.data.objects.get(f"{who}.hairBare")
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    bare = hair.copy()
    bare.data = hair.data.copy()
    bare.name = bare.data.name = f"{who}.hairBare"
    bare["twin_spare"] = True
    bare.pop("twin_wear", None)
    work_of(who).objects.link(bare)
    bare.hide_set(True)
    bare.hide_render = True


def strand_image(who):
    """A cut-out sheet of loose hairs (drawn here): opaque roots at the top, thinning to the tips."""
    w, h = 128, 256
    rnd = np.random.default_rng(11)
    px = np.zeros((h, w, 4), dtype=np.float32)
    tone = 0.3 * np.array(PEOPLE[who]["hair"][1], dtype=np.float32)
    ys = np.arange(h)
    for _ in range(30):
        x0 = rnd.uniform(0, w)
        bend = rnd.uniform(-10, 10)
        length = rnd.uniform(0.45, 1.0) * h
        width = rnd.uniform(1.6, 2.6)  # (texels of this sheet: the bake halves them)
        shade = rnd.uniform(0.75, 1.25)
        for y in ys:
            down = (h - 1 - y)  # rows count up from the bottom: the root is at the top
            if down > length:
                break
            t = down / length
            x = (x0 + bend * t * t) % w
            cols = np.arange(int(x - 2), int(x + 3)) % w
            a = np.clip(width * (1 - t ** 1.5) - np.abs(np.arange(int(x - 2), int(x + 3)) - x) + 0.5, 0, 1)
            px[y, cols, 3] = np.maximum(px[y, cols, 3], a)
            px[y, cols, :3] = tone * shade
    px[h - 6:, :, 3] = np.maximum(px[h - 6:, :, 3], 0.85)  # (the roots meet the hair's edge)
    px[h - 6:, :, :3] = tone
    img = bpy.data.images.get(f"{who}.strands") or bpy.data.images.new(f"{who}.strands", w, h, alpha=True)
    img.pixels.foreach_set(px.ravel())
    img.pack()
    return img


TOWEL_FROM, TOWEL_SPAN = -12.0, 204.0  # degrees round the head the towel covers (front is -90): open over the face


def head_towel(who, hat, top):
    """
    The towel a labourer wears under his hard hat against the sun: tucked under the hat's rim, lying
    on the head and over the ears, falling straight from their widest point to the collar, open over
    the face. Its shape is found by casting rays from the head's axis out to the skin, the ears, the
    hair and the collar of `top`, and keeping clear of all of them, row by row from the rim down: a
    row is never narrower than the one above (cloth hangs, it does not tuck back in under the ears).
    P02b's towel was a fixed oval narrower than the head at the ears, and the ears came through it.
    """
    cx, cy, z0, a, b, height = hat["twin_hat"]
    neck = bone_head(who, "Neck")
    body = obj_of(who, "body")
    tree, keep = bvh_of(body, obj_of(who, "hair"), top)
    head_i = body.vertex_groups[bone(who, "Head")].index
    rows, cols = 12, 34
    z_top, z_low = z0 + 0.012, neck.z - 0.035
    # the head's axis at each height: the middle of the skin there
    centres = []
    for j in range(rows + 1):
        z = z_top + (z_low - z_top) * j / rows
        pts = [v.co for v in body.data.vertices if abs(v.co.z - z) < 0.012 and any(g.group == head_i and g.weight > 0.3 for g in v.groups)]
        centres.append(Vector((sum(p.x for p in pts) / len(pts), sum(p.y for p in pts) / len(pts), z)) if pts else (centres[-1].copy() if centres else Vector((cx, cy, z))))
        centres[-1].z = z
    rnd = random.Random(7)
    radius = [[0.0] * (cols + 1) for _ in range(rows + 1)]
    for i in range(cols + 1):
        theta = math.radians(TOWEL_FROM + TOWEL_SPAN * i / cols)  # round the back, from just in front of one ear to the other (front is -90 degrees)
        d = Vector((math.cos(theta), math.sin(theta), 0))
        prev = 0.0
        for j in range(rows + 1):
            t = j / rows
            c = centres[j]
            hit = tree.ray_cast(c + d * 0.3, -d, 0.3)  # (from outside in: the outermost surface)
            r = (0.3 - hit[3]) if hit[0] is not None else prev
            want = r + 0.006 + 0.006 * t
            # (it hangs: below the ears it narrows only slowly, towards the collar it rests on)
            radius[j][i] = max(want, prev - 0.0045) if j else want
            prev = radius[j][i]
    keep.free()
    bm = bmesh.new()
    grid = []
    for j in range(rows + 1):
        t = j / rows
        row = []
        for i in range(cols + 1):
            theta = math.radians(TOWEL_FROM + TOWEL_SPAN * i / cols)
            r = radius[j][i] + 0.012 * t ** 2 + 0.002 * math.sin(i * 1.7 + j) * t
            c = centres[j] if t < 0.5 else centres[rows // 2].lerp(centres[j], 0.3)  # (below the jaw it hangs from above, not round the neck)
            c = Vector((c.x, c.y, centres[j].z))
            row.append(bm.verts.new(c + Vector((math.cos(theta), math.sin(theta), 0)) * r + Vector((0, 0, rnd.uniform(-0.002, 0.002) * t))))
        grid.append(row)
    uv = bm.loops.layers.uv.new("UVMap")
    for j in range(rows):
        for i in range(cols):
            f = bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
            for loop, (u, v) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                loop[uv].uv = (u / cols * 0.85, 1 - v / rows * 0.4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:  # (outward)
        c = f.calc_center_median()
        if f.normal.dot(c - Vector((cx, cy, c.z))) < 0:
            f.normal_flip()
    cloth_mat = flat_material(f"{who}.cloth.mat", (0.72, 0.69, 0.63), rough=0.96)

    def weights(co):
        t = max(0.0, min(1.0, (z_top - co.z) / max(0.01, z_top - z_low))) ** 1.5
        return {"Head": 1.0 - 0.7 * t, "Neck": 0.5 * t, "Spine2": 0.2 * t}

    towel = add_part(who, "cloth", bm, cloth_mat, weights=weights)
    towel["twin_outer_faces"] = len(towel.data.polygons)
    mod = towel.modifiers.new("Solid", "SOLIDIFY")
    mod.thickness = 0.003
    mod.offset = -1
    towel.modifiers.move(towel.modifiers.find("Solid"), 0)
    select_only(towel)
    bpy.ops.object.modifier_apply(modifier="Solid")
    fabric(cloth_mat, towel, "cotton_jersey", 0.2, strength=1.0, tone=0.4)
    stain(cloth_mat, bone_head(who, "Neck") + Vector((0, 0.03, -0.02)), 0.11, (0.5, 0.46, 0.38), 0.6, rough=0.9, scale=30)
    grime(cloth_mat, (0.45, 0.38, 0.3), 1.38, 0.25)
    print(f"[people] {who}: towel fitted, {rows} rows round the head, widest {max(max(r) for r in radius) * 100:.1f} cm from its axis")
    return towel


def flatten_hair(who, lift=0.0022):
    """
    Under a hat the hair is pressed flat: what is left of it is laid on the scalp, `lift` metres off
    the skin. Standing at its own volume it showed as a flap with a hard edge below the cap (P02d review).
    """
    hair, body = obj_of(who, "hair"), obj_of(who, "body")
    tree, keep = bvh_of(body)
    for v in hair.data.vertices:
        near = tree.find_nearest(v.co, 0.08)
        if near[0] is not None:
            v.co = near[0] + near[1] * lift
    keep.free()


def hair_strands(who, cover_z=None):
    """
    Loose hairs along the visible hairline (temples, sideburns, nape): small cut-out cards from the
    hair's lower edge, lying on the skin, so the edge reads as hair and not as a painted cap.
    `cover_z`: edges above this height are under a hat and get none.
    """
    hair, body = obj_of(who, "hair"), obj_of(who, "body")
    tree, keep = bvh_of(body)
    rnd = random.Random(5)
    bm = bmesh.new()
    src = bmesh.new()
    src.from_mesh(hair.data)
    src.normal_update()
    uv = bm.loops.layers.uv.new("UVMap")
    made = 0
    for n_edge, e in enumerate(src.edges):
        if not e.is_boundary or n_edge % 3 == 2:
            continue
        a, b = e.verts
        mid = (a.co + b.co) / 2
        if cover_z is not None and mid.z > cover_z - 0.004:
            continue
        ends = []
        for v in (a, b):
            length = rnd.uniform(0.010, 0.019)
            out = v.normal.normalized()
            tip = v.co + Vector((0, 0, -length)) + out * 0.002
            near = tree.find_nearest(tip, 0.05)
            if near[0] is not None:
                tip = near[0] + near[1] * 0.0012
            root = v.co + out * 0.0008
            ends.append((bm.verts.new(root), bm.verts.new(tip)))
        span = min(1.0, (b.co - a.co).length / 0.03)  # (the strand sheet is 3 cm of hairline)
        run = rnd.uniform(0.0, 1.0 - span)
        f = bm.faces.new((ends[0][0], ends[1][0], ends[1][1], ends[0][1]))
        for loop, (u, vv) in zip(f.loops, ((run, 1.0), (run + span, 1.0), (run + span, 0.0), (run, 0.0))):
            loop[uv].uv = (u, vv)
        made += 1
    src.free()
    keep.free()
    mat = bpy.data.materials.get(f"{who}.strands.mat") or bpy.data.materials.new(f"{who}.strands.mat")
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    for n in [n for n in nodes if n.type == "TEX_IMAGE"]:
        nodes.remove(n)
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = strand_image(who)
    bsdf = bsdf_of(mat)
    links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    bsdf.inputs["Roughness"].default_value = 0.5
    obj = add_part(who, "strands", bm, mat, like=hair, smooth=False)
    head = bone_head(who, "Head") + Vector((0, 0, 0.08))
    for p in obj.data.polygons:  # (add_part's normals are arbitrary on open strips)
        if p.normal.dot(p.center - head) < 0:
            p.flip()
    print(f"[people] {who}: {made} hair strand cards along the hairline")
    return obj


# ---- stage: drape ----------------------------------------------------------------------------------
# The garments each man's cloth is simulated for, and how: a top (pinned at collar, cuffs, hem and
# shoulder seams), a bottom (waistband and hems) or a vest (hangs from the shoulders and the neck).
DRAPE = {
    "guard": {"elvs_male_shirt_untucked_bd1": "top", "elvs_male_trouser": "bottom"},
    "engineer": {"elvs_male_shirt_untucked_bd1": "top", "punkduck_male_classic_jeans": "bottom"},  # (the vest is stiff: draped, its outside alone baked patchy normals)
    "labourer": {"mindfront_knitted_sweater_01": "top", "mindfront_male_trousers_1": "bottom", "cloth": "towel"},
}
DRAPE_FRAMES = globals().get("DRAPE_FRAMES", 60)
DRAPE_GROW = globals().get("DRAPE_GROW", (-0.025, -0.2))  # cloth this much larger than cut: everywhere, and at the joints
DRAPE_BEND = globals().get("DRAPE_BEND", 0.02)
DRAPE_LEVELS = globals().get("DRAPE_LEVELS", 2)  # subdivisions of the simulated copy (about 7 mm between points)
DRAPE_MAIN_AREA = 0.035  # m2: a loose piece smaller than this (button, pocket, collar) rides on the cloth under it


def drape_points(who, kind):
    """
    Where cloth gathers: (point, axis, radius, strength). Near the point the cloth is grown more
    (DRAPE_GROW, scaled by strength / 0.17); held at its seams, the extra buckles across the limb: creases inside the elbow, above the cuff, at the waist, behind the knee and
    above the boots. Rest-pose metres.
    """
    pts = []
    up = Vector((0, 0, 1))
    for side in ("Left", "Right"):
        arm, fore, hand = (bone_head(who, f"{side}{b}") for b in ("Arm", "ForeArm", "Hand"))
        leg, knee, foot = (bone_head(who, f"{side}{b}") for b in ("UpLeg", "Leg", "Foot"))
        if kind == "top":
            pts += [(fore, (hand - arm).normalized(), 0.10, 0.17), (hand.lerp(fore, 0.22), (hand - fore).normalized(), 0.06, 0.14),
                    (arm + Vector((0, 0, -0.06)), (fore - arm).normalized(), 0.06, 0.08)]
        elif kind == "bottom":
            pts += [(knee, (foot - leg).normalized(), 0.11, 0.13), (foot + Vector((0, 0, 0.11)), up, 0.07, 0.2),
                    (leg.lerp(knee, 0.25), up, 0.08, 0.06)]
    if kind in ("top", "vest"):
        pts.append((bone_head(who, "Hips").lerp(bone_head(who, "Spine"), 0.8), up, 0.07, 0.12 if kind == "top" else 0.06))
    if kind == "towel":
        neck = bone_head(who, "Neck")
        pts += [(neck + Vector((0, 0.03, 0.0)), up, 0.07, 0.17), (neck + Vector((0.07, 0.0, 0.02)), up, 0.05, 0.12), (neck + Vector((-0.07, 0.0, 0.02)), up, 0.05, 0.12)]
    return pts


def loose_pieces(bm):
    """Faces grouped into connected pieces, each with its area."""
    seen, pieces = set(), []
    for f in bm.faces:
        if f in seen:
            continue
        stack, piece = [f], []
        seen.add(f)
        while stack:
            g = stack.pop()
            piece.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h not in seen:
                        seen.add(h)
                        stack.append(h)
        pieces.append((piece, sum(g.calc_area() for g in piece)))
    return pieces


def stage_drape(who, frames=DRAPE_FRAMES):
    """
    For each garment in DRAPE: a subdivided copy hung in a cloth simulation over a shell made from
    the garment's own rest shape pulled in 3 mm, the cloth grown a little everywhere and more at the
    joints, its openings and seams pinned. The copy (`<who>.<garment>.drape`) is only for the bake:
    its folds go into the sheet's normal map and occlusion, the garment keeps its silhouette.
    """
    import time

    rig = rig_of(who)
    rig.location = (0, 0, 0)
    vl.update()
    for key, kind in DRAPE[who].items():
        src = obj_of(who, key)
        t0 = time.time()
        for name in (f"{who}.{key}.drape", f"__shell.{who}"):
            old = bpy.data.objects.get(name)
            if old:
                bpy.data.objects.remove(old, do_unlink=True)
        bm = bmesh.new()
        bm.from_mesh(src.data)
        outer = src.get("twin_outer_faces")
        if outer:  # (a solidified garment: only its outside is hung)
            bm.faces.ensure_lookup_table()
            bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index >= outer], context="FACES")
            bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        # (a seam whose vertices are split would be an edge to the simulation, and pinned)
        bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.0004)
        bm.normal_update()
        # the shell it may not fall through
        sb = bm.copy()
        for v in sb.verts:
            v.co -= v.normal * 0.003
        shell_me = bpy.data.meshes.new(f"__shell.{who}")
        sb.to_mesh(shell_me)
        sb.free()
        shell = bpy.data.objects.new(f"__shell.{who}", shell_me)
        work_of(who).objects.link(shell)
        colliders = collection("__drape_colliders", work_of(who))
        colliders.objects.link(shell)
        shell["twin_drape"] = True
        shell.modifiers.new("Collision", "COLLISION")
        shell.collision.thickness_outer = 0.002
        shell.collision.thickness_inner = 0.006
        shell.collision.cloth_friction = 8
        # large pieces are simulated (subdivided once); small ones are carried along afterwards
        tag = bm.verts.layers.int.new("twin_minor")
        for piece, area in loose_pieces(bm):
            if area < DRAPE_MAIN_AREA:
                for f in piece:
                    for v in f.verts:
                        v[tag] = 1
        for _ in range(DRAPE_LEVELS):
            main_edges = [e for e in bm.edges if not any(v[tag] for v in e.verts)]
            bmesh.ops.subdivide_edges(bm, edges=main_edges, cuts=1, use_grid_fill=True)
        bm.verts.index_update()
        bm.verts.ensure_lookup_table()
        minor_idx = {v.index for v in bm.verts if v[tag]}
        start = [v.co.copy() for v in bm.verts]
        # pins: every opening and its first ring; the shoulder seams of a top; a vest from the neck and shoulders
        neck = bone_head(who, "Neck")
        top_z = max(v.co.z for v in bm.verts)
        pinned = set()
        for v in bm.verts:
            if v.index in minor_idx:
                continue
            if v.is_boundary and (kind not in ("vest", "towel") or v.co.z > (neck.z - 0.16 if kind == "vest" else top_z - 0.01)):
                pinned.add(v.index)
                pinned.update(w.index for e in v.link_edges for w in e.verts)
        if kind in ("top", "vest"):
            for side in ("Left", "Right"):
                sh = bone_head(who, f"{side}Arm")
                for v in bm.verts:
                    if v.co.z > sh.z - 0.012 and abs(v.co.x - sh.x * 0.72) < abs(sh.x) * 0.42:
                        pinned.add(v.index)
        pinned |= minor_idx
        me = bpy.data.meshes.new(f"{who}.{key}.drape")
        bm.to_mesh(me)
        bm.free()
        dense = bpy.data.objects.new(f"{who}.{key}.drape", me)
        work_of(who).objects.link(dense)
        dense.parent = rig
        dense["twin_drape"] = True
        for p in me.polygons:
            p.use_smooth = True
        pin = dense.vertex_groups.new(name="pin")
        pin.add(sorted(pinned), 1.0, "REPLACE")
        gather = dense.vertex_groups.new(name="gather")
        pts = drape_points(who, kind)
        # (Blender grows the cloth by `shrink_min` where the group's weight is 0, easing to `shrink_max`, which
        #  cannot be below 0, at 1: so the joints get weight 0 and the rest the weight that leaves it the base growth)
        base, joint = DRAPE_GROW
        ease = 1.0 - base / joint
        for v in me.vertices:
            most = 0.0
            for c, axis, r, surplus in pts:
                d = v.co - c
                along = d.dot(axis)
                off_axis = (d - axis * along).length
                if off_axis > r * 1.8:
                    continue
                w = math.exp(-(along / r) ** 2) * (1.0 if off_axis < r else math.exp(-((off_axis - r) / (0.4 * r)) ** 2))
                most = max(most, w * surplus / 0.17)
            gather.add([v.index], ease * (1.0 - min(1.0, most)), "REPLACE")
        cloth = dense.modifiers.new("Cloth", "CLOTH")
        s = cloth.settings
        s.quality = 4
        s.mass = {"vest": 0.25, "towel": 0.12}.get(kind, 0.18)
        s.tension_stiffness = 14
        s.compression_stiffness = 14  # (extra length has to buckle, not squash)
        s.shear_stiffness = 3
        s.bending_stiffness = DRAPE_BEND if kind != "vest" else DRAPE_BEND * 4
        s.shrink_min, s.shrink_max = joint, 0.0
        s.vertex_group_shrink = "gather"
        s.vertex_group_mass = "pin"
        s.pin_stiffness = 4
        cs = cloth.collision_settings
        cs.distance_min = 0.0015
        cs.use_self_collision = False
        cs.collision_quality = 2
        cs.collection = colliders  # (nothing else in the master scene may push it)
        cloth.point_cache.frame_start = 1
        cloth.point_cache.frame_end = frames
        for f in range(1, frames + 1):
            scene.frame_set(f)
        dg = bpy.context.evaluated_depsgraph_get()
        out = bpy.data.meshes.new_from_object(dense.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
        dense.modifiers.clear()
        dense.data = out
        bpy.data.meshes.remove(me)
        out.name = dense.name
        # small pieces move with the cloth they lie on
        from mathutils.kdtree import KDTree

        main_ids = [i for i in range(len(out.vertices)) if i not in minor_idx]
        kd = KDTree(len(main_ids))
        for i in main_ids:
            kd.insert(start[i], i)
        kd.balance()
        for i in minor_idx:
            _co, j, _d = kd.find(start[i])
            out.vertices[i].co = start[i] + (out.vertices[j].co - start[j])
        moved = [(out.vertices[i].co - start[i]).length for i in main_ids]
        bpy.data.objects.remove(shell, do_unlink=True)
        dense.hide_set(True)
        dense.hide_render = True
        print(f"[people] {who}: {key} draped ({kind}), {len(out.vertices)} vertices, moved {np.mean(moved) * 1000:.1f} mm on average, "
              f"{np.max(moved) * 1000:.1f} at most, {time.time() - t0:.0f} s")
    scene.frame_set(0)


def stage_dress(who):
    rig_of(who).location = (0, 0, 0)
    vl.update()
    for o in parts_of(who):
        if o.get("twin_made"):
            bpy.data.objects.remove(o, do_unlink=True)
    skin_material(who)
    face_detail(who)
    keep_bare_hair(who)
    {"guard": dress_guard, "engineer": dress_engineer, "labourer": dress_labourer}[who](who)
    hair = obj_of(who, "hair")
    retone(hair.data.materials[0], PEOPLE[who]["hair"][1], level=0.085, rough=0.5)
    flatten_hair(who)
    hair_strands(who, cover_z=max(v.co.z for v in hair.data.vertices) - 0.008)
    total = sum(tris(o.data) for o in parts_of(who))
    print(f"[people] {who}: dressed, {len(parts_of(who))} parts, {total} triangles before reduction")


# ---- stage: bake -----------------------------------------------------------------------------------
# Most triangles each part keeps at the first level (the face is where a person is looked at)
REDUCE = {
    "teeth": 240, "hair": 700, "toigo_maga_hat": 1300, "mindfront_shoes_biker_boots_male": 1700, "shoes04": 1500,
    "punkduck_riding_boots": 1500, "toigo_gloves_short": 2000, "vest": 2000, "elvs_male_shirt_untucked_bd1": 3900,
    "elvs_male_trouser": 2300, "punkduck_male_classic_jeans": 2400, "mindfront_male_trousers_1": 2300,
    "mindfront_knitted_sweater_01": 2628, "hardhat": 1400,
}
GRADE_GAMMA = 1.3  # applied to the baked colour (display values): above 1 deepens it
GRADE_SATURATION = 1.18
HAIR_DEPTH = {"guard": 0.34, "engineer": 0.26, "labourer": 0.5}
HEAD_TRIS = 6600
HEAD_SCALE = 2.0  # the head's texels against the rest of the man (was 1.7 in P02b)
HANDS_TRIS = 2500
CUTOUT = ("hair", "eyebrows", "eyelashes", "strands")


def decimate_mesh(mesh, target, group=None):
    """A copy of `mesh` collapsed to at most `target` triangles (weights and UVs kept)."""
    if tris(mesh) <= target:
        return mesh.copy()
    obj = bpy.data.objects.new("__dec", mesh)
    scene.collection.objects.link(obj)
    ratio = target / tris(mesh)
    out = None
    for _ in range(14):
        mod = obj.modifiers.new("lod", "DECIMATE")
        mod.ratio = ratio
        dg = bpy.context.evaluated_depsgraph_get()
        out = bpy.data.meshes.new_from_object(obj.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
        obj.modifiers.clear()
        bm = bmesh.new()
        bm.from_mesh(out)
        bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=1e-6)
        bmesh.ops.delete(bm, geom=[e for e in bm.edges if not e.link_faces], context="EDGES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        bm.to_mesh(out)
        bm.free()
        if tris(out) <= target:
            break
        bpy.data.meshes.remove(out)
        out = None
        ratio *= 0.94
    bpy.data.objects.remove(obj, do_unlink=True)
    if out is None:
        raise RuntimeError(f"could not reach {target} triangles")
    return out


def split_mesh(mesh, pick):
    """Two copies of `mesh`: the faces whose vertices all pass `pick`, and the rest."""
    halves = []
    for want in (True, False):
        bm = bmesh.new()
        bm.from_mesh(mesh)
        deform = bm.verts.layers.deform.verify()
        chosen = {v for v in bm.verts if pick(v, deform)}
        doomed = [f for f in bm.faces if all(v in chosen for v in f.verts) != want]
        bmesh.ops.delete(bm, geom=doomed, context="FACES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        out = mesh.copy()
        bm.to_mesh(out)
        bm.free()
        halves.append(out)
    return halves


def join_meshes(who, name, meshes):
    """One object on the rig holding `meshes` (which it consumes)."""
    work = work_of(who)
    temp = []
    for m in meshes:
        t = bpy.data.objects.new("__join", m)
        work.objects.link(t)
        temp.append(t)
    select_only(*temp)
    bpy.ops.object.join()
    obj = temp[0]
    old = bpy.data.objects.get(name)
    if old and old != obj:
        bpy.data.objects.remove(old, do_unlink=True)
    obj.name = name
    obj.data.name = name
    obj.parent = rig_of(who)
    return obj


def in_edit(obj, fn):
    select_only(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    try:
        fn()
    finally:
        bpy.ops.object.mode_set(mode="OBJECT")


def new_image(name, size, colour, fill, alpha=False):
    old = bpy.data.images.get(name)
    if old:
        bpy.data.images.remove(old)
    img = bpy.data.images.new(name, size, size, alpha=alpha, float_buffer=False)
    img.colorspace_settings.name = "sRGB" if colour else "Non-Color"
    img.generated_color = fill
    return img


def pixels(img):
    px = np.empty(img.size[0] * img.size[1] * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    return px.reshape(img.size[1], img.size[0], 4)


def save(img, px, file):
    img.pixels.foreach_set(np.clip(px, 0, 1).astype(np.float32).ravel())
    os.makedirs(TEX_DIR, exist_ok=True)
    img.filepath_raw = os.path.join(TEX_DIR, file)
    img.file_format = "PNG"
    img.save()
    img.name = file


def bake_passes(obj, size, passes, prefix):
    """
    Bake `obj`'s own materials into images through its active UV layer. `passes` maps a name to
    (is colour, fill, kind): kind is a Cycles bake type, or "socket:<BSDF input>" to bake that
    input as it is, unlit.
    """
    mats = [m for m in obj.data.materials if m]
    engine = scene.render.engine
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.render.bake.margin = 8
    scene.render.bake.use_clear = True
    scene.render.bake.use_selected_to_active = False
    select_only(obj)
    out = {}
    for name, (colour, fill, kind) in passes.items():
        img = new_image(f"{prefix}.{name}", size, colour, fill)
        undo = []
        for mat in mats:
            nodes, links = mat.node_tree.nodes, mat.node_tree.links
            node = nodes.new("ShaderNodeTexImage")
            node.image = img
            nodes.active = node
            undo.append((mat, node))
            if kind.startswith("socket:"):
                bsdf = bsdf_of(mat)
                output = next(n for n in nodes if n.type == "OUTPUT_MATERIAL" and n.is_active_output)
                surface = output.inputs["Surface"].links[0].from_socket
                emit = nodes.new("ShaderNodeEmission")
                sock = bsdf.inputs[kind[7:]]
                if sock.is_linked:
                    links.new(sock.links[0].from_socket, emit.inputs["Color"])
                else:
                    v = sock.default_value
                    emit.inputs["Color"].default_value = (v, v, v, 1) if isinstance(v, float) else tuple(v)
                links.new(emit.outputs[0], output.inputs["Surface"])
                undo += [(mat, emit), (mat, (surface, output.inputs["Surface"]))]
        scene.cycles.samples = 24 if kind == "AO" else 2
        with solo_render(obj):
            bpy.ops.object.bake(type="EMIT" if kind.startswith("socket:") else kind)
        for mat, thing in undo:
            if isinstance(thing, tuple):
                mat.node_tree.links.new(thing[0], thing[1])
            else:
                mat.node_tree.nodes.remove(thing)
        out[name] = (pixels(img), img)
    scene.render.engine = engine
    return out


class solo_render:
    """Only `objs` render while the block runs (the other men stand at the same origin, the zone around them)."""

    def __init__(self, *objs):
        self.objs = set(objs)

    def __enter__(self):
        self.was = {o: o.hide_render for o in scene.objects}
        for o in scene.objects:
            o.hide_render = o not in self.objs
        return self

    def __exit__(self, *exc):
        for o, h in self.was.items():
            o.hide_render = h


# garments that get a turned-in rim (hem facing) at their openings
RIMS = ("elvs_male_shirt_untucked_bd1", "elvs_male_trouser", "punkduck_male_classic_jeans", "mindfront_knitted_sweater_01", "mindfront_male_trousers_1")
RIM_THICK = 0.0035  # the cloth's thickness, doubled at a hem
RIM_FACING = 0.012  # how far the turned-in hem shows inside


def add_rims(mesh, cover):
    """
    Thickness at every opening (cuff, collar, hem, waistband, pocket): along each open edge of the
    garment a rim turned in by RIM_THICK, then a facing RIM_FACING wide lying inside the cloth.
    Edges hidden under another garment (`cover`, a BVH) get none; neither do buttons. The rim's
    faces use a copy of the garment's material named `<material>.rim`, and UV islands of their own
    that read the garment's texture just inside its edge.
    """
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.normal_update()
    uvl = bm.loops.layers.uv.active
    deform = bm.verts.layers.deform.verify()
    tiny = {f for piece, area in loose_pieces(bm) if area < 0.004 for f in piece}
    edges = []
    for e in bm.edges:
        if not e.is_boundary or e.link_faces[0] in tiny:
            continue
        a, b = e.verts
        n = (a.normal + b.normal).normalized()
        mid = (a.co + b.co) / 2
        if cover is not None and cover.ray_cast(mid + n * 0.0015, n, 0.03)[0] is not None:
            continue
        edges.append(e)
    if not edges:
        bm.free()
        return 0
    src_mat = mesh.materials[0]
    rim_mat = bpy.data.materials.get(src_mat.name + ".rim")
    if rim_mat is None:
        rim_mat = src_mat.copy()
        rim_mat.name = src_mat.name + ".rim"
    mesh.materials.append(rim_mat)
    slot = len(mesh.materials) - 1
    # each open vertex: the way into the cloth along its surface, and one UV for it
    into, uv_of, step = {}, {}, {}
    for e in edges:
        f = e.link_faces[0]
        c = f.calc_center_median()
        cuv = sum((l[uvl].uv for l in f.loops), Vector((0, 0))) / len(f.loops)
        for v in e.verts:
            d = c - v.co
            d -= v.normal * d.dot(v.normal)
            into[v] = into.get(v, Vector()) + d
            loop = next(l for l in f.loops if l.vert == v)
            if v not in uv_of:
                uv_of[v] = loop[uvl].uv.copy()
                k = (e.other_vert(v).co - v.co).length
                kuv = (next(l for l in f.loops if l.vert == e.other_vert(v))[uvl].uv - loop[uvl].uv).length
                duv = cuv - loop[uvl].uv
                step[v] = duv.normalized() * (kuv / max(k, 1e-6)) if duv.length > 1e-9 else Vector((0, 0))
    ring = {}
    for v, d in into.items():
        d = d.normalized() if d.length > 1e-9 else Vector()
        into[v] = d
        bv = bm.verts.new(v.co - v.normal * RIM_THICK)
        cv = bm.verts.new(v.co - v.normal * RIM_THICK + d * RIM_FACING)
        for new in (bv, cv):
            for g, w in v[deform].items():
                new[deform][g] = w
        ring[v] = (bv, cv)
    made = 0
    for e in edges:
        a, b = e.verts
        out = -(into[a] + into[b])
        for verts, want in (((a, b, ring[b][0], ring[a][0]), out), ((ring[a][0], ring[b][0], ring[b][1], ring[a][1]), -(a.normal + b.normal))):
            try:
                f = bm.faces.new(verts)
            except ValueError:
                continue
            f.material_index = slot
            f.smooth = True
            f.normal_update()
            if f.normal.dot(want) < 0:
                f.normal_flip()
            # UVs: a strip just inside the garment's edge, off by a hair so it is an island of its own
            for loop in f.loops:
                v = loop.vert
                owner = next(o for o in (a, b) if v is o or v in ring[o])
                depth = 0.0004 if v is owner else (RIM_THICK if v is ring[owner][0] else RIM_THICK + RIM_FACING)
                loop[uvl].uv = uv_of[owner] + step[owner] * depth + step[owner] * 0.0004
            made += 1
    bm.to_mesh(mesh)
    bm.free()
    return made * 2


def bake_masks(obj, size, value_of, margin=0):
    """Bake a flat colour per material (`value_of(material)` gives RGB), unlit: which texels belong to what."""
    mats = [m for m in obj.data.materials if m]
    engine = scene.render.engine
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 1
    scene.render.bake.margin = margin
    scene.render.bake.use_clear = True
    scene.render.bake.use_selected_to_active = False
    img = new_image(f"{obj.name}.mask", size, False, (0, 0, 0, 1))
    undo = []
    for mat in mats:
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        node = nodes.new("ShaderNodeTexImage")
        node.image = img
        nodes.active = node
        output = next(n for n in nodes if n.type == "OUTPUT_MATERIAL" and n.is_active_output)
        surface = output.inputs["Surface"].links[0].from_socket
        emit = nodes.new("ShaderNodeEmission")
        emit.inputs["Color"].default_value = (*value_of(mat), 1)
        links.new(emit.outputs[0], output.inputs["Surface"])
        undo.append((mat, node, emit, surface, output))
    select_only(obj)
    with solo_render(obj):
        bpy.ops.object.bake(type="EMIT")
    for mat, node, emit, surface, output in undo:
        mat.node_tree.links.new(surface, output.inputs["Surface"])
        mat.node_tree.nodes.remove(node)
        mat.node_tree.nodes.remove(emit)
    scene.render.engine = engine
    px = pixels(img).copy()
    bpy.data.images.remove(img)
    return px


def bake_from_drapes(obj, drapes, size):
    """
    Normal and occlusion of the draped copies, cast onto `obj`'s sheet (selected to active). The
    alpha of each result marks the texels a ray found cloth for.
    """
    mats = [m for m in obj.data.materials if m]
    engine = scene.render.engine
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    bake = scene.render.bake
    bake.margin = 8
    bake.use_clear = True
    bake.use_selected_to_active = True
    bake.cage_extrusion = 0.025
    bake.max_ray_distance = 0.06
    for d in drapes:
        d.hide_set(False)
        d.hide_render = False
        d.data.uv_layers[0].name = "source"
    # the low garment must not shade its own folds
    rays = {k: getattr(obj, k) for k in ("visible_diffuse", "visible_glossy", "visible_transmission", "visible_shadow", "visible_volume_scatter")}
    for k in rays:
        setattr(obj, k, False)
    out = {}
    for name, kind, samples in (("normal", "NORMAL", 2), ("ao", "AO", 32)):
        img = new_image(f"{obj.name}.drape.{name}", size, False, (0, 0, 0, 0), alpha=True)
        undo = []
        for mat in mats:
            node = mat.node_tree.nodes.new("ShaderNodeTexImage")
            node.image = img
            mat.node_tree.nodes.active = node
            undo.append((mat, node))
        scene.cycles.samples = samples
        select_only(obj, *drapes)
        vl.objects.active = obj
        with solo_render(obj, *drapes):
            bpy.ops.object.bake(type=kind, use_selected_to_active=True, cage_extrusion=0.025, max_ray_distance=0.06)
        for mat, node in undo:
            mat.node_tree.nodes.remove(node)
        out[name] = pixels(img).copy()
        bpy.data.images.remove(img)
    for k, v in rays.items():
        setattr(obj, k, v)
    bake.use_selected_to_active = False
    for d in drapes:
        d.hide_set(True)
        d.hide_render = True
    scene.render.engine = engine
    return out


def grow(mask, steps):
    """A boolean mask spread by `steps` texels (four neighbours a step)."""
    m = mask.copy()
    for _ in range(steps):
        g = m.copy()
        g[1:] |= m[:-1]
        g[:-1] |= m[1:]
        g[:, 1:] |= m[:, :-1]
        g[:, :-1] |= m[:, 1:]
        m = g
    return m


def stitch_seams(normal, cloth, strength=1.6):
    """
    Seams and stitching in the normal map along every border of the garments' islands (their seams
    and hems): a shallow trough at the seam, a dashed line of stitches 3 to 4 texels in.
    """
    inside = cloth
    dist = np.full(inside.shape, 99.0, dtype=np.float32)
    reach = ~inside
    for d in range(1, 8):
        grown = grow(reach, 1)
        dist[grown & ~reach & inside] = d
        reach = grown
    h = -0.55 * np.exp(-((dist - 1.0) / 1.0) ** 2) + 0.5 * np.exp(-((dist - 3.6) / 0.75) ** 2)
    yy, xx = np.mgrid[0:inside.shape[0], 0:inside.shape[1]]
    dash = ((xx + yy) % 5 < 3).astype(np.float32) * 0.6 + 0.4
    h = np.where(dist < 99, h * np.where(dist > 2.2, dash, 1.0), 0.0) * inside
    gy, gx = np.gradient(h)
    n = normal[:, :, :3] * 2 - 1
    n[:, :, 0] -= gx * strength
    n[:, :, 1] -= gy * strength
    n /= np.linalg.norm(n, axis=2, keepdims=True) + 1e-8
    normal[:, :, :3] = n * 0.5 + 0.5
    return normal


def read_from_source_uv(obj):
    """
    Make every image texture of the object's materials read the layer called "source" by name.
    The sheet layer can then be the one marked for rendering, which is what a baked tangent-space
    normal map is measured against: islands are turned when they are packed, and a normal map
    baked against the unturned layer shades wrongly.
    """
    for mat in [m for m in obj.data.materials if m]:
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        uv = None
        for node in [n for n in nodes if n.type == "TEX_IMAGE" and not n.inputs["Vector"].is_linked]:
            if uv is None:
                uv = nodes.new("ShaderNodeUVMap")
                uv.uv_map = "source"
            links.new(uv.outputs["UV"], node.inputs["Vector"])
        for node in [n for n in nodes if n.type in ("NORMAL_MAP", "UVMAP")]:
            node.uv_map = "source"


def uv_islands(mesh):
    from bpy_extras import mesh_utils

    return mesh_utils.mesh_linked_uv_islands(mesh)


def grade(colour):
    """
    The colour sheet as it ships: deeper and a little richer than the bake. MakeHuman's skins and
    most garment textures are made for a soft studio light; under the twin's noon sun and blue sky
    they came out pale and flat.
    """
    rgb = np.clip(colour[:, :, :3], 0, 1) ** GRADE_GAMMA
    grey = (rgb * np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)).sum(axis=2, keepdims=True)
    colour[:, :, :3] = np.clip(grey + (rgb - grey) * GRADE_SATURATION, 0, 1)
    return colour


def occlusion_output(mat, orm_node):
    """Wire the sheet's red channel to the node group Blender's glTF exporter reads ambient occlusion from."""
    group = bpy.data.node_groups.get("glTF Material Output")
    if group is None:
        group = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
        group.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
        group.nodes.new("NodeGroupInput")
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    node = nodes.new("ShaderNodeGroup")
    node.node_tree = group
    sep = nodes.new("ShaderNodeSeparateColor")
    links.new(orm_node.outputs["Color"], sep.inputs[0])
    links.new(sep.outputs["Red"], node.inputs["Occlusion"])


def stage_bake(who):
    rig = rig_of(who)
    rig.location = (0, 0, 0)
    vl.update()
    for name in (f"{who}.opaque", f"{who}.cutout"):
        old = bpy.data.objects.get(name)
        if old:
            bpy.data.objects.remove(old, do_unlink=True)

    # 1. every part reduced to its share, with a layer called "source" holding the UVs its material reads.
    #    Rims and strands cost triangles too: if the whole comes out over LOD0's budget, the garments
    #    (never the head or hands) are reduced further and made again, so nothing decimates the face later.
    head_groups = None
    scale = 1.0
    for attempt in range(4):
        opaque, cutout = [], []
        rims_made = {}
        for o in parts_of(who):
            key = o.name.split(".", 1)[1]
            if not o.data.uv_layers:
                in_edit(o, lambda: bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.03))
            mesh = o.data
            if key == "body":
                names = {g.index: g.name for g in o.vertex_groups}
                head_groups = {i for i, n in names.items() if n.endswith(("Head", "Neck"))}
                head, hands = split_mesh(mesh, lambda v, deform: sum(w for g, w in v[deform].items() if g in head_groups) > 0.5)
                pieces = [decimate_mesh(head, HEAD_TRIS), decimate_mesh(hands, HANDS_TRIS)]
                bpy.data.meshes.remove(head)
                bpy.data.meshes.remove(hands)
            else:
                target = REDUCE.get(key, 10 ** 9)
                if key in REDUCE and key not in ("teeth", "hair"):
                    target = int(target * scale)
                pieces = [decimate_mesh(mesh, target)]
            for piece in pieces:
                for layer in list(piece.uv_layers)[1:]:
                    piece.uv_layers.remove(layer)
                piece.uv_layers[0].name = "source"
                piece["twin_key"] = key
                if key in RIMS:
                    others = [p for p in parts_of(who) if p.name.split(".", 1)[1] not in (key, "body") + CUTOUT]
                    tree, keep = bvh_of(*others)
                    rims_made[key] = add_rims(piece, tree)
                    keep.free()
                (cutout if key in CUTOUT else opaque).append(piece)
        total = sum(tris(m) for m in opaque + cutout)
        reducible = sum(tris(m) for m in opaque if m["twin_key"] in REDUCE and m["twin_key"] not in ("teeth", "hair"))
        print(f"[people] {who}: pieces {total} triangles (rims {rims_made}), budget {lod_target(who, 0)}")
        if total <= lod_target(who, 0):
            break
        scale *= max(0.5, 1.0 - (total - lod_target(who, 0) + 60) / max(1, reducible))
        for m in opaque + cutout:
            bpy.data.meshes.remove(m)

    def vertex_groups_onto(obj):
        for o in parts_of(who):
            for g in o.vertex_groups:
                if g.name.startswith("mixamorig") and g.name not in obj.vertex_groups:
                    obj.vertex_groups.new(name=g.name)

    # (joining keeps weights only when the first object knows the groups: give each piece an object's groups)
    def as_objects(pieces):
        made = []
        for piece in pieces:
            src = obj_of(who, piece["twin_key"])
            t = bpy.data.objects.new("__piece", piece)
            work_of(who).objects.link(t)
            for g in src.vertex_groups:  # (group names travel with the mesh; only a mesh that lost them needs them again)
                if g.name not in t.vertex_groups:
                    t.vertex_groups.new(name=g.name)
            made.append(t)
        return made

    def joined(name, pieces):
        objs = as_objects(pieces)
        select_only(*objs)
        bpy.ops.object.join()
        obj = objs[0]
        obj.name = name
        obj.data.name = name
        obj.parent = rig
        return obj

    bake = joined(f"{who}.opaque", opaque)
    mesh = bake.data

    # 2. the sheet: every island at the same scale, the face larger, packed
    sheet = mesh.uv_layers.new(name="sheet")
    read_from_source_uv(bake)
    sheet.active_render = True
    mesh.uv_layers.active = sheet
    in_edit(bake, lambda: bpy.ops.uv.average_islands_scale())
    sheet = mesh.uv_layers["sheet"]  # (a visit to edit mode can leave the old reference empty)
    head_index = {bake.vertex_groups[n].index for n in (bone(who, "Head"), bone(who, "Neck")) if n in bake.vertex_groups}
    skin_slot = next(i for i, m in enumerate(mesh.materials) if m and m.name.startswith(f"{who}.body"))
    uv = np.empty(len(mesh.loops) * 2, dtype=np.float32)
    sheet.data.foreach_get("uv", uv)
    uv = uv.reshape(-1, 2)
    for island in uv_islands(mesh):
        polys = [mesh.polygons[i] for i in island]
        if polys[0].material_index != skin_slot:
            continue
        v0 = mesh.vertices[polys[0].vertices[0]]
        if not any(g.group in head_index and g.weight > 0.5 for g in v0.groups):
            continue
        loops = [li for p in polys for li in p.loop_indices]
        centre = uv[loops].mean(axis=0)
        uv[loops] = (uv[loops] - centre) * HEAD_SCALE + centre
    sheet.data.foreach_set("uv", uv.ravel())
    mesh.update()
    in_edit(bake, lambda: bpy.ops.uv.pack_islands(rotate=True, margin=0.0035))

    # 3. bake
    baked = bake_passes(bake, SHEET, {
        "metal": (False, (0, 0, 0, 1), "socket:Metallic"),
        "rough": (False, (0.6, 0.6, 0.6, 1), "socket:Roughness"),
        "ao": (False, (1, 1, 1, 1), "AO"),
        "normal": (False, (0.5, 0.5, 1, 1), "NORMAL"),
        "colour": (True, (0.3, 0.3, 0.3, 1), "socket:Base Color"),
    }, who)
    colour, colour_img = baked["colour"]
    normal, normal_img = baked["normal"]
    orm = np.ones_like(colour)
    colour = grade(colour)
    # the draped cloth's folds onto the garments' own texels; seams and stitching along their borders
    draped = {obj_of(who, k).data.materials[0].name for k in DRAPE[who]}
    sewn = {o.data.materials[0].name for o in parts_of(who) if (o.get("twin_wear", "").startswith("wear:") and not any(w in o.name for w in ("shoe", "boot"))) or o.name.endswith(".vest")}
    masks = bake_masks(bake, SHEET, lambda m: (1.0 if m.name in draped else 0.0, 1.0 if m.name in sewn else 0.0, 0.0))
    fold = np.ones(colour.shape[:2], dtype=np.float32)
    drapes = [d for d in (bpy.data.objects.get(f"{who}.{k}.drape") for k in DRAPE[who]) if d]
    if drapes:
        dr = bake_from_drapes(bake, drapes, SHEET)
        take = grow(masks[:, :, 0] > 0.5, 8) & (dr["normal"][:, :, 3] > 0.5)
        normal[take, :3] = dr["normal"][take, :3]
        fold = np.where(take & (dr["ao"][:, :, 3] > 0.5), dr["ao"][:, :, 0], 1.0)
        print(f"[people] {who}: folds from {len(drapes)} draped garments on {take.mean() * 100:.1f}% of the sheet")
    normal = stitch_seams(normal, masks[:, :, 1] > 0.5)
    orm[:, :, 0] = (0.3 + 0.7 * baked["ao"][0][:, :, 0]) * (0.35 + 0.65 * fold)  # (a rest-pose bake: kept gentle, the arms will move)
    orm[:, :, 1] = baked["rough"][0][:, :, 0]
    orm[:, :, 2] = baked["metal"][0][:, :, 0]
    orm_img = new_image(f"{who}.orm", SHEET, False, (1, 0.6, 0, 1))
    save(colour_img, colour, f"people-{who}_colour.png")
    # (occlusion and roughness change slowly: the sheet ships them at half size, which keeps the
    #  download at P02b's with the folds' shading added)
    orm = orm.reshape(SHEET // 2, 2, SHEET // 2, 2, 4).mean(axis=(1, 3))
    orm_img.scale(SHEET // 2, SHEET // 2)
    save(orm_img, orm, f"people-{who}_orm.png")
    save(normal_img, normal, f"people-{who}_normal.png")
    for name in ("metal", "rough", "ao"):
        bpy.data.images.remove(baked[name][1])

    def fresh(name):
        old = bpy.data.materials.get(name)
        if old:
            bpy.data.materials.remove(old)
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        return mat, bsdf_of(mat)

    mat, bsdf = fresh(f"{who}.skin-and-clothes")
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    c = nodes.new("ShaderNodeTexImage")
    c.image = colour_img
    links.new(c.outputs["Color"], bsdf.inputs["Base Color"])
    o = nodes.new("ShaderNodeTexImage")
    o.image = orm_img
    sep = nodes.new("ShaderNodeSeparateColor")
    links.new(o.outputs["Color"], sep.inputs[0])
    links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
    occlusion_output(mat, o)
    n = nodes.new("ShaderNodeTexImage")
    n.image = normal_img
    nm = nodes.new("ShaderNodeNormalMap")
    links.new(n.outputs["Color"], nm.inputs["Color"])
    links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    mesh.uv_layers.remove(mesh.uv_layers["source"])
    mesh.uv_layers[0].name = "UVMap"
    mesh.uv_layers[0].active_render = True
    mesh.materials.clear()
    mesh.materials.append(mat)
    for p in mesh.polygons:
        p.material_index = 0

    # 4. hair, brows and lashes: one cut-out sheet, each in a cell of its own
    cells = {"hair": (0.0, 0.3, 0.75, 1.0), "strands": (0.75, 0.3, 1.0, 1.0), "eyebrows": (0.0, 0.0, 0.5, 0.28), "eyelashes": (0.5, 0.0, 1.0, 0.28)}
    for piece in cutout:
        src = piece.uv_layers["source"]
        uv = np.empty(len(piece.loops) * 2, dtype=np.float32)
        src.data.foreach_get("uv", uv)
        uv = uv.reshape(-1, 2)
        lo, hi = uv.min(axis=0), uv.max(axis=0)
        x0, y0, x1, y1 = cells[piece["twin_key"]]
        pad = 0.012
        out = (uv - lo) / np.maximum(hi - lo, 1e-6) * np.array([x1 - x0 - 2 * pad, y1 - y0 - 2 * pad]) + np.array([x0 + pad, y0 + pad])
        layer = piece.uv_layers.new(name="sheet")
        layer.data.foreach_set("uv", out.astype(np.float32).ravel())
    cut = joined(f"{who}.cutout", cutout)
    cmesh = cut.data
    read_from_source_uv(cut)
    cmesh.uv_layers["sheet"].active_render = True
    cmesh.uv_layers.active = cmesh.uv_layers["sheet"]
    hair_bake = bake_passes(cut, HAIR_SHEET * 2, {
        "alpha": (False, (0, 0, 0, 1), "socket:Alpha"),
        "colour": (True, (0.02, 0.02, 0.02, 1), "socket:Base Color"),
    }, who + ".hair")
    rgba = hair_bake["colour"][0]
    rgba[:, :, :3] *= HAIR_DEPTH[who]  # (the hair textures bake out mid-grey: black hair, and the labourer's going grey)
    rgba[:, :, 3] = hair_bake["alpha"][0][:, :, 0]
    bh, bw = int(0.28 * rgba.shape[0]), int(0.5 * rgba.shape[1])
    rgba[:bh, :bw, 3] = np.clip(rgba[:bh, :bw, 3] * 1.6, 0, 1)  # (MPFB2's brows are sparse at this size)
    hair_img = new_image(f"{who}.haircolour", HAIR_SHEET * 2, True, (0, 0, 0, 0), alpha=True)
    save(hair_img, rgba, f"people-{who}-hair_colour.png")
    bpy.data.images.remove(hair_bake["alpha"][1])
    bpy.data.images.remove(hair_bake["colour"][1])
    hmat, hbsdf = fresh(f"{who}.hair")
    nodes, links = hmat.node_tree.nodes, hmat.node_tree.links
    c = nodes.new("ShaderNodeTexImage")
    c.image = hair_img
    links.new(c.outputs["Color"], hbsdf.inputs["Base Color"])
    cutn = nodes.new("ShaderNodeMath")  # (alpha through a Round node: "cut-out" to Blender's glTF exporter)
    cutn.operation = "ROUND"
    links.new(c.outputs["Alpha"], cutn.inputs[0])
    links.new(cutn.outputs[0], hbsdf.inputs["Alpha"])
    hbsdf.inputs["Roughness"].default_value = 0.85  # (at 0.55 the flat cards mirrored the sky: P02b's grey patches)
    hbsdf.inputs["Specular IOR Level"].default_value = 0.3
    hmat.surface_render_method = "DITHERED"
    hmat.use_backface_culling = False
    cmesh.uv_layers.remove(cmesh.uv_layers["source"])
    cmesh.uv_layers[0].name = "UVMap"
    cmesh.uv_layers[0].active_render = True
    cmesh.materials.clear()
    cmesh.materials.append(hmat)
    for p in cmesh.polygons:
        p.material_index = 0

    for o in (bake, cut):
        if not any(m.type == "ARMATURE" for m in o.modifiers):
            mod = o.modifiers.new("Armature", "ARMATURE")
            mod.object = rig
    # the parts stay, hidden, for a re-bake
    for o in parts_of(who):
        if o not in (bake, cut):
            o.hide_set(True)
            o.hide_render = True
    print(f"[people] {who}: baked, opaque {tris(bake.data)} triangles, cut-out {tris(cut.data)}")


# ---- stage: lods -----------------------------------------------------------------------------------
def clean_weights(mesh_obj, most=4):
    """Only bone groups, at most four a vertex, adding up to one (what glTF carries)."""
    for g in [g for g in mesh_obj.vertex_groups if not g.name.startswith("mixamorig")]:
        mesh_obj.vertex_groups.remove(g)
    names = {g.index: g for g in mesh_obj.vertex_groups}
    for v in mesh_obj.data.vertices:
        w = sorted(((g.group, g.weight) for g in v.groups), key=lambda kv: -kv[1])
        keep = [(g, x) for g, x in w[:most] if x > 0.004]
        total = sum(x for _g, x in keep)
        for g, _x in w:
            if g not in {k for k, _ in keep}:
                names[g].remove([v.index])
        if total <= 0:
            head = mesh_obj.vertex_groups.get("mixamorig:Head")
            head.add([v.index], 1.0, "REPLACE")
            continue
        for g, x in keep:
            names[g].add([v.index], x / total, "REPLACE")


def stage_lods(who):
    spec = PEOPLE[who]
    rig = rig_of(who)
    rig.location = (0, 0, 0)
    vl.update()
    asset = spec["asset"]
    name = asset.split(".", 1)[1]
    lib = collection("LIB_char")
    coll = bpy.data.collections.get(asset) or collection(asset, lib)
    coll["twin_class"] = "named-person"
    coll["twin_credits"] = spec.get("credits", "")
    for o in list(coll.objects):
        if o.type == "MESH":
            bpy.data.objects.remove(o, do_unlink=True)
    bake, cut = obj_of(who, "opaque"), obj_of(who, "cutout")

    def level(n, target, with_cutout):
        pieces = [bake.data.copy()] + ([cut.data.copy()] if with_cutout else [])
        objs = []
        for src, piece in zip((bake, cut), pieces):
            t = bpy.data.objects.new("__lod", piece)
            coll.objects.link(t)
            for g in src.vertex_groups:
                if g.name not in t.vertex_groups:
                    t.vertex_groups.new(name=g.name)
            objs.append(t)
        if len(objs) > 1:
            select_only(*objs)
            bpy.ops.object.join()
        obj = objs[0]
        if tris(obj.data) > target:
            reduced = decimate_mesh(obj.data, target)
            old = obj.data
            obj.data = reduced
            bpy.data.meshes.remove(old)
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
        bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=1e-6)
        bmesh.ops.delete(bm, geom=[e for e in bm.edges if not e.link_faces], context="EDGES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        bm.to_mesh(obj.data)
        bm.free()
        obj.name = f"{name}_LOD{n}"
        obj.data.name = obj.name
        obj.parent = rig
        clean_weights(obj)
        mod = obj.modifiers.new("Armature", "ARMATURE")
        mod.object = rig
        for i in reversed(range(len(obj.data.materials))):
            if obj.data.materials[i] is None:
                obj.data.materials.pop(index=i)
        obj.data.uv_layers.active = obj.data.uv_layers[0]
        obj.data.uv_layers[0].active_render = True
        for p in obj.data.polygons:
            p.use_smooth = True
        obj.hide_render = n > 0
        obj.hide_viewport = n > 0
        return obj

    lods = [level(0, lod_target(who, 0), True), level(1, lod_target(who, 1), True), level(2, lod_target(who, 2) - 4, False)]

    # his real height: the crown of the skull, not the hat
    body = obj_of(who, "body")
    crown = max(v.co.z for v in body.data.vertices)
    k = spec["stature"] / crown
    if abs(k - 1) > 1e-4 and not rig.get("twin_scaled"):
        S = Matrix.Scale(k, 4)
        rig.data.transform(S)
        for o in [c for c in bpy.data.objects if c.parent == rig and c.type == "MESH"]:
            o.data.transform(S)
        rig["twin_scaled"] = k
    if rig.name not in coll.objects:
        for c in list(rig.users_collection):
            c.objects.unlink(rig)
        coll.objects.link(rig)
    vl.update()
    top = max(v.co.z for v in lods[0].data.vertices)
    print(f"[people] {who}: {asset} LOD {[tris(o.data) for o in lods]}, stature {spec['stature']} m (scaled {k:.3f}), {top:.3f} m to the top of his hat")


WHO = globals().get("WHO") or list(PEOPLE)
for _who in WHO:
    if "body" in STAGES:  # noqa: F821
        stage_body(_who)
    if "dress" in STAGES:  # noqa: F821
        stage_dress(_who)
    if "drape" in STAGES:  # noqa: F821
        stage_drape(_who)
    if "bake" in STAGES:  # noqa: F821
        stage_bake(_who)
    if "lods" in STAGES:  # noqa: F821
        stage_lods(_who)
    if "credits" in STAGES:  # noqa: F821  (the credit list only, after a change to it)
        bpy.data.collections[PEOPLE[_who]["asset"]]["twin_credits"] = PEOPLE[_who]["credits"]
