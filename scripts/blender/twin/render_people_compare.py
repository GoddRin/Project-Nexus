"""
Review renders of the gate people (P02d): each man beside the Atlas Navigator at equal framing, same
camera and lights (QUALITY-BAR section 3, last line), and each face close up.

Run headless on the master scene after the people and their clips are built (nothing is saved):

  blender -b assets-src/twin/site_master.blend --python scripts/blender/twin/run_headless.py -- \
      render_people_compare.py render all --set OUT='"docs/twin-v2/review/P02d"'

Writes navigator-beside-<who>-full.jpg, -close.jpg and face-<who>.jpg into OUT. With
--set GLB_DIR='"<folder>"' the men come from exported files char.<who>.a.glb in that folder (the
"before" set: P02b's exports, whose textures travel inside them) instead of the master scene.
"""
import math
import os

import bpy
from mathutils import Vector

REPO = r"C:\Users\Harrold\Desktop\Projects2\Project Nexus"
OUT = os.path.join(REPO, globals().get("OUT", os.path.join("docs", "twin-v2", "review", "P02d")))
NAVIGATOR = os.path.join(REPO, "public", "models", "characters", "scic_atlas_navigator_pro.web.glb")
WHO = globals().get("WHO") or ["guard", "engineer", "labourer"]
POSE_FRAME = 40  # into each man's idle clip, and the navigator's idle
GLB_DIR = globals().get("GLB_DIR")


def setup():
    sc = bpy.data.scenes.get("people_compare") or bpy.data.scenes.new("people_compare")
    for o in list(sc.collection.objects):
        sc.collection.objects.unlink(o)
    for c in list(sc.collection.children):
        sc.collection.children.unlink(c)
    world = bpy.data.worlds.get("review.world") or bpy.data.worlds.new("review.world")
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.42, 0.44, 0.46, 1)
    bg.inputs[1].default_value = 0.9
    sc.world = world
    for name, loc, energy in (("key", (2.5, -4, 4), 4.0), ("fill", (-3, -2, 2), 1.6), ("rim", (0, 4, 3), 2.0)):
        ld = bpy.data.lights.get("cmp." + name) or bpy.data.lights.new("cmp." + name, "SUN")
        ld.energy = energy
        lo = bpy.data.objects.get("cmp." + name) or bpy.data.objects.new("cmp." + name, ld)
        lo.location = loc
        lo.rotation_euler = (Vector((0, 0, 1)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        sc.collection.objects.link(lo)
    for engine in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        try:
            sc.render.engine = engine
            break
        except TypeError:
            continue
    sc.render.image_settings.file_format = "JPEG"
    sc.render.image_settings.quality = 90
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "AgX" if "AgX" in [i.identifier for i in bpy.types.ColorManagedViewSettings.bl_rna.properties["view_transform"].enum_items] else sc.view_settings.view_transform
    return sc


def import_glb(sc, path, name, idle_words=("idle",)):
    """Import a glTF into a collection of its own in `sc`: only the skinned meshes render, posed in its idle."""
    for g in bpy.data.node_groups:  # (an older importer's helper group in the master breaks the import: RISKS)
        if "gltf" in g.name.lower() and g.name != "glTF Material Output":
            g.name = "old." + g.name
    before, acts = set(bpy.data.objects), set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    coll = bpy.data.collections.new(name)
    sc.collection.children.link(coll)
    for o in new:
        for c in list(o.users_collection):
            c.objects.unlink(o)
        coll.objects.link(o)
        if o.type == "MESH":
            skinned = any(m.type == "ARMATURE" for m in o.modifiers)
            o.hide_render = not skinned or any(t in o.name for t in ("LOD1", "LOD2"))
    arm = next((o for o in new if o.type == "ARMATURE"), None)
    if arm is not None:
        if arm.animation_data is None:
            arm.animation_data_create()
        mine = [a for a in bpy.data.actions if a not in acts]
        idle = next((a for a in mine if any(w in a.name.lower() for w in idle_words) and "shift" not in a.name.lower()), mine[0] if mine else None)
        for t in list(arm.animation_data.nla_tracks):
            arm.animation_data.nla_tracks.remove(t)
        arm.animation_data.action = idle
        if idle is not None and getattr(idle, "slots", None) is not None and len(idle.slots):
            arm.animation_data.action_slot = idle.slots[0]
    roots = [o for o in new if o.parent is None]
    return coll, roots, [o for o in new if o.type == "MESH" and not o.hide_render], arm


def import_navigator(sc):
    coll, roots, meshes, _arm = import_glb(sc, NAVIGATOR, "REF_navigator", ("idle", "breath"))
    return coll, roots, meshes


def height_of(objs):
    zs = [(o.matrix_world @ Vector(c)).z for o in objs if o.type == "MESH" for c in o.bound_box]
    return min(zs), max(zs)


def camera(sc, name, at, frm, lens):
    cd = bpy.data.cameras.get(name) or bpy.data.cameras.new(name)
    cd.lens = lens
    co = bpy.data.objects.get(name) or bpy.data.objects.new(name, cd)
    if co.name not in sc.collection.objects:
        sc.collection.objects.link(co)
    co.location = frm
    co.rotation_euler = (Vector(at) - Vector(frm)).to_track_quat("-Z", "Y").to_euler()
    return co


def render(sc, cam, path, w, h):
    sc.camera = cam
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True, scene=sc.name)
    print("[compare] wrote", path)


def main():
    os.makedirs(OUT, exist_ok=True)
    sc = setup()
    nav_coll, nav_roots, nav_objs = import_navigator(sc)
    for who in WHO:
        if GLB_DIR:
            coll, roots, lod, rig = import_glb(sc, os.path.join(REPO, GLB_DIR, f"char.{who}.a.glb"), f"before.{who}")
            for r in roots:
                r.location = (0.42, 0, 0)
        else:
            rig = bpy.data.objects[f"{who}.rig"]
            coll = next(c for c in rig.users_collection)
            sc.collection.children.link(coll)
            act = bpy.data.actions.get(f"{who}:idle")
            if rig.animation_data is None:
                rig.animation_data_create()
            rig.animation_data.action = act
            if act is not None and getattr(act, "slots", None) is not None and len(act.slots):
                rig.animation_data.action_slot = act.slots[0]
            rig.location = (0.42, 0, 0)
            lod = [o for o in coll.objects if o.type == "MESH" and o.name.endswith("_LOD0")]
            for o in coll.objects:
                if o.type == "MESH":
                    o.hide_render = not o.name.endswith("_LOD0")
        for r in nav_roots:
            r.location = (-0.42, 0, 0)
        for s in (bpy.context.scene, sc):
            s.frame_set(POSE_FRAME)
        bpy.context.view_layer.update()
        z0, z1 = height_of(lod + list(nav_objs))
        mid = (z0 + z1) / 2
        full = camera(sc, "cmp.full", (0, 0, mid), (0.35, -4.4, mid + 0.15), 50)
        render(sc, full, os.path.join(OUT, f"navigator-beside-{who}-full.jpg"), 1100, 1300)
        close = camera(sc, "cmp.close", (0, 0, z1 - 0.3), (0.15, -1.9, z1 - 0.22), 50)
        render(sc, close, os.path.join(OUT, f"navigator-beside-{who}-close.jpg"), 1400, 900)
        # his face alone, three-quarter, from about 0.7 m
        for r in nav_roots:
            r.location = (-30, 0, 0)
        head = Vector((0.42, -0.05, z1 - 0.17 if who == "guard" else z1 - 0.2))
        face = camera(sc, "cmp.face", head, head + Vector((0.32, -0.62, 0.03)), 60)
        render(sc, face, os.path.join(OUT, f"face-{who}.jpg"), 900, 900)
        if GLB_DIR:
            sc.collection.children.unlink(coll)
        else:
            rig.location = (0, 0, 0)
            rig.animation_data.action = None
            sc.collection.children.unlink(coll)
    print("[compare] done")


main()
