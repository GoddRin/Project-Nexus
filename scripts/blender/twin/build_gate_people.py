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
        "credits": "mpfb.makehuman,mpfb.elvaerwyn-shirt,mpfb.elvaerwyn-trouser,mpfb.mrt-cap,mixamo.motion,twin.authored",
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
        "credits": "mpfb.makehuman,mpfb.elvaerwyn-shirt,mpfb.punkduck-jeans,mpfb.mindfront-boots,mixamo.motion,twin.authored",
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
        "credits": "mpfb.makehuman,mpfb.mindfront-sweater,mpfb.mindfront-trousers,mpfb.punkduck-boots,mpfb.mrt-gloves,mixamo.motion,twin.authored",
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
    return [o for o in work_of(who).objects if o.type == "MESH"]


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


def retone(mat, tint, level=1.0, keep=0.0, rough=None, weave=0.0):
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
    if weave and not bsdf.inputs["Normal"].is_linked:
        fine = nodes.new("ShaderNodeTexNoise")
        fine.inputs["Scale"].default_value = 700
        bump = nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = weave
        bump.inputs["Distance"].default_value = 0.0008
        links.new(fine.outputs["Fac"], bump.inputs["Height"])
        # small creases: noise sampled far more finely up and down than across
        coords = nodes.new("ShaderNodeMapping")
        coords.inputs["Scale"].default_value = (22, 22, 85)
        links.new(position(mat), coords.inputs["Vector"])
        folds = nodes.new("ShaderNodeTexNoise")
        folds.inputs["Scale"].default_value = 1.0
        folds.inputs["Detail"].default_value = 3
        links.new(coords.outputs["Vector"], folds.inputs["Vector"])
        crease = nodes.new("ShaderNodeBump")
        crease.inputs["Strength"].default_value = 0.55
        crease.inputs["Distance"].default_value = 0.004
        links.new(folds.outputs["Fac"], crease.inputs["Height"])
        links.new(bump.outputs[0], crease.inputs["Normal"])
        links.new(crease.outputs[0], bsdf.inputs["Normal"])
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
    sheen.inputs["To Min"].default_value = 0.38
    sheen.inputs["To Max"].default_value = 0.62
    links.new(blotch.outputs["Fac"], sheen.inputs["Value"])
    links.new(sheen.outputs[0], bsdf.inputs["Roughness"])
    for part, rough in (("eyes", 0.06), ("teeth", 0.3)):
        o = obj_of(who, part)
        b2 = bsdf_of(o.data.materials[0])
        b2.inputs["Roughness"].default_value = rough
        if b2.inputs["Alpha"].is_linked:
            o.data.materials[0].node_tree.links.remove(b2.inputs["Alpha"].links[0])
        b2.inputs["Alpha"].default_value = 1.0


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

    rumple(shirt, 0.0045, 0.075, seed=1)
    rumple(trousers, 0.004, 0.08, seed=2)
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
    add_part(who, "baton", bm, flat_material(f"{who}.baton.mat", (0.045, 0.04, 0.035), rough=0.5, grain=0.4), weights={"Hips": 1.0})

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
    retone(shirt.data.materials[0], (0.80, 0.82, 0.84), level=0.9, rough=0.82, weave=0.25)
    retone(trousers.data.materials[0], navy, level=1.6, rough=0.86, weave=0.35)
    grime(trousers.data.materials[0], (0.32, 0.25, 0.18), 0.3, 0.55)
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
    """A sleeveless hi-vis vest cut from the shirt's own torso and worn 7 mm over it."""
    arm_groups = {g.index for g in shirt.vertex_groups if any(k in g.name for k in ("Arm", "Hand"))}
    hips = bone_head(who, "Hips")
    neck = bone_head(who, "Neck")
    shoulder_x = abs(bone_head(who, "LeftArm").x) - 0.012
    bm = bmesh.new()
    bm.from_mesh(shirt.data)
    deform = bm.verts.layers.deform.verify()
    keep = set()
    for v in bm.verts:
        arm_w = sum(w for g, w in v[deform].items() if g in arm_groups)
        v_open = v.co.y < 0 and abs(v.co.x) < 0.045 + (v.co.z - (neck.z - 0.17)) * 0.55 and v.co.z > neck.z - 0.17  # the V of the neck
        if arm_w < 0.3 and abs(v.co.x) < shoulder_x and hips.z - 0.03 < v.co.z < neck.z - 0.012 and not v_open:
            keep.add(v)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not all(v in keep for v in f.verts)], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * 0.007
    for _ in range(2):
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
    mod = vest.modifiers.new("Solid", "SOLIDIFY")
    mod.thickness = 0.006
    mod.offset = -1
    select_only(vest)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod = vest.modifiers.new("Armature", "ARMATURE")
    mod.object = rig_of(who)
    vest["twin_made"] = True

    mat = flat_material(f"{who}.vest.mat", colour, rough=0.8, grain=0.8)
    spine = bone_head(who, "Spine1")
    tape = any_of(
        mat,
        band_mask(mat, (0, 0, spine.z - 0.06), (0, 0, 1), 0.0, 0.034, soft=0.002),
        band_mask(mat, (0.098, 0, 0), (1, 0, 0), 0.0, 0.032, soft=0.002),
        band_mask(mat, (-0.13, 0, 0), (1, 0, 0), 0.0, 0.032, soft=0.002),
    )
    # orange edging either side of the silver tape, as on the site's vests
    edge = any_of(
        mat,
        band_mask(mat, (0, 0, spine.z - 0.072), (0, 0, 1), 0.0, 0.058, soft=0.002),
        band_mask(mat, (0.086, 0, 0), (1, 0, 0), 0.0, 0.056, soft=0.002),
        band_mask(mat, (-0.142, 0, 0), (1, 0, 0), 0.0, 0.056, soft=0.002),
    )
    overlay(mat, edge, (0.9, 0.36, 0.05), rough=0.7)
    overlay(mat, tape, (0.62, 0.63, 0.62), rough=0.35, metal=0.0)
    zip_line = band_mask(mat, (-0.004, 0, 0), (1, 0, 0), 0.0, 0.008, soft=0.001)
    front = band_mask(mat, (0, 0.0, 0), (0, -1, 0), 0.0, 1.0)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    both = nodes.new("ShaderNodeMath")
    both.operation = "MULTIPLY"
    links.new(zip_line, both.inputs[0])
    links.new(front, both.inputs[1])
    overlay(mat, both.outputs[0], (0.06, 0.06, 0.06), rough=0.5)
    mesh.materials.clear()
    mesh.materials.append(mat)
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
    rumple(shirt, 0.0045, 0.075, seed=3)
    rumple(jeans, 0.003, 0.07, seed=4)

    retone(shirt.data.materials[0], (0.20, 0.27, 0.36), level=1.5, rough=0.84, weave=0.3)
    retone(jeans.data.materials[0], (0.5, 0.5, 0.5), level=0.5, keep=0.75, rough=0.88)
    grime(jeans.data.materials[0], (0.34, 0.26, 0.18), 0.35, 0.5)
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

    vest = vest_from(who, shirt, (0.74, 0.86, 0.06))
    hide_under(who, shirt, vest)
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
    rumple(top, 0.005, 0.08, seed=5)
    rumple(trousers, 0.004, 0.075, seed=6)

    # trousers tucked into rubber boots
    boot_top = max(v.co.z for v in boots.data.vertices)
    tuck(who, "mindfront_male_trousers_1", [boots], boot_top - 0.015, blend=0.08, cut_below=0.03, lift=-0.004, reach=0.2)

    # a cloth worn under the hat, hanging over the ears and the back of the neck
    cx, cy, z0, a, b, height = hat["twin_hat"]
    neck = bone_head(who, "Neck")
    rows, cols = 6, 26
    bm = bmesh.new()
    grid = []
    rnd = random.Random(7)
    for j in range(rows + 1):
        t = j / rows
        z = (z0 + 0.012) + (neck.z - 0.005 - z0 - 0.012) * t
        row = []
        for i in range(cols + 1):
            u = i / cols
            theta = math.radians(-52 + 284 * u)  # round the back, from cheek to cheek (front is -90 degrees)
            flare = 0.004 + 0.03 * t ** 1.4 + 0.004 * math.sin(u * 37 + j) * t
            # behind the head the cloth falls straight; at the cheeks it follows the jaw in
            row.append(bm.verts.new(Vector((cx + (a - 0.012 + flare) * math.cos(theta), cy + (b - 0.012 + flare) * math.sin(theta) + 0.012 * t, z + rnd.uniform(-0.002, 0.002) * t))))
        grid.append(row)
    for j in range(rows):
        for i in range(cols):
            bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.003)
    cloth_mat = flat_material(f"{who}.cloth.mat", (0.62, 0.66, 0.70), rough=0.92, grain=0.9)
    zr = neck.z - 0.005
    add_part(who, "cloth", bm, cloth_mat, weights=lambda co: {"Head": 1.0 - 0.45 * max(0.0, min(1.0, (z0 - co.z) / max(0.01, z0 - zr))) ** 2,
                                                              "Neck": 0.45 * max(0.0, min(1.0, (z0 - co.z) / max(0.01, z0 - zr))) ** 2})

    # colours: faded green long sleeves with yellow reflective bands, dusty work trousers, black rubber boots
    mat = top.data.materials[0]
    retone(mat, (0.10, 0.30, 0.20), level=1.25, rough=0.9, weave=0.5)
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
    grime(trousers.data.materials[0], (0.36, 0.27, 0.18), 0.75, 0.75)
    boot_mat = flat_material(f"{who}.rubber.mat", (0.035, 0.036, 0.038), rough=0.35)
    grime(boot_mat, (0.36, 0.27, 0.18), boot_top * 0.8, 0.95)
    boots.data.materials.clear()
    boots.data.materials.append(boot_mat)
    fix_glove_weights(gloves)
    retone(gloves.data.materials[0], (0.55, 0.53, 0.48), level=1.0, rough=0.95, weave=0.6)
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


def rumple(obj, depth=0.004, size=0.07, seed=0.0, keep_above=None):
    """
    Worn cloth is never smooth: push a garment's surface in and out along its normals by a few
    millimetres of layered noise (broad sags, finer creases), so it catches the light unevenly.
    Edges (cuffs, hems, collars) are left where they are, so nothing opens up.
    """
    from mathutils import noise

    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.normal_update()
    off = Vector((seed * 13.7, seed * 7.1, seed * 3.3))
    for v in bm.verts:
        if v.is_boundary or (keep_above is not None and v.co.z > keep_above):
            continue
        broad = noise.noise(v.co / size + off)
        fine = noise.noise(v.co / (size * 0.38) + off * 2.0)
        # creases run across a limb more than along it: stretch the fine layer's sampling vertically
        crease = noise.noise(Vector((v.co.x / (size * 0.9), v.co.y / (size * 0.9), v.co.z / (size * 0.22))) + off * 3.0)
        v.co += v.normal * depth * (0.55 * broad + 0.3 * fine + 0.5 * crease)
    bm.to_mesh(obj.data)
    bm.free()


def stage_dress(who):
    rig_of(who).location = (0, 0, 0)
    vl.update()
    for o in parts_of(who):
        if o.get("twin_made"):
            bpy.data.objects.remove(o, do_unlink=True)
    skin_material(who)
    {"guard": dress_guard, "engineer": dress_engineer, "labourer": dress_labourer}[who](who)
    hair = obj_of(who, "hair")
    retone(hair.data.materials[0], PEOPLE[who]["hair"][1], level=0.085, rough=0.5)
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
HANDS_TRIS = 2500
CUTOUT = ("hair", "eyebrows", "eyelashes")


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
        bpy.ops.object.bake(type="EMIT" if kind.startswith("socket:") else kind)
        for mat, thing in undo:
            if isinstance(thing, tuple):
                mat.node_tree.links.new(thing[0], thing[1])
            else:
                mat.node_tree.nodes.remove(thing)
        out[name] = (pixels(img), img)
    scene.render.engine = engine
    return out


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
        for node in [n for n in nodes if n.type == "NORMAL_MAP"]:
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

    # 1. every part reduced to its share, with a layer called "source" holding the UVs its material reads
    opaque, cutout = [], []
    head_groups = None
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
            pieces = [decimate_mesh(mesh, REDUCE.get(key, 10 ** 9))]
        for piece in pieces:
            for layer in list(piece.uv_layers)[1:]:
                piece.uv_layers.remove(layer)
            piece.uv_layers[0].name = "source"
            piece["twin_key"] = key
            (cutout if key in CUTOUT else opaque).append(piece)

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
        uv[loops] = (uv[loops] - centre) * 1.7 + centre
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
    orm[:, :, 0] = 0.3 + 0.7 * baked["ao"][0][:, :, 0]  # (a rest-pose bake: kept gentle, the arms will move)
    orm[:, :, 1] = baked["rough"][0][:, :, 0]
    orm[:, :, 2] = baked["metal"][0][:, :, 0]
    orm_img = new_image(f"{who}.orm", SHEET, False, (1, 0.6, 0, 1))
    save(colour_img, colour, f"people-{who}_colour.png")
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
    cells = {"hair": (0.0, 0.3, 1.0, 1.0), "eyebrows": (0.0, 0.0, 0.5, 0.28), "eyelashes": (0.5, 0.0, 1.0, 0.28)}
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
    hbsdf.inputs["Roughness"].default_value = 0.55
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

    lods = [level(0, LOD_TRIS[0], True), level(1, LOD_TRIS[1], True), level(2, LOD_TRIS[2], False)]

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
    if "bake" in STAGES:  # noqa: F821
        stage_bake(_who)
    if "lods" in STAGES:  # noqa: F821
        stage_lods(_who)
