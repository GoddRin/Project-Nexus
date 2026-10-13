"""
The site pickup (asset `veh.pickup.a`) for the gate slice (P02b): a white single-cab utility truck.

Source: "Lightbody '90 MD Pickup - Low poly model" by Daniel Zhabotinsky, CC BY 4.0
(https://sketchfab.com/3d-models/lightbody-90-md-pickup-low-poly-model-3b3ac59245c44872b06ad85673be9643),
an invented make, kept as downloaded in assets-src/twin/downloads/sketchfab/lightbody-90-md-pickup/.

Run inside the master scene:

  exec(compile(open(path).read(), path, "exec"), {"__name__": "pickup", "STAGES": ["import", "build", "lods"]})

  import  brings the download in (as `SRC_pickup_root`) if it is not there
  build   turns it to face -Y (the twin's +Z), stands it on Z = 0, repaints the body white, bakes its
          eight materials into one sheet with road dust low on the body, adds the SCIC door decals,
          and leaves three materials: `pickup.paint`, `pickup.glass`, `EMIT_pickup.lamps`
  lods    builds pickup.a_LOD0.._LOD2 and the asset collection; at LOD0 the wheels and the steering
          wheel are separate objects (custom properties twin_part, twin_pivot, twin_axis), parented
          to the body

The badges are left off: v2 shows no vehicle makes.
"""
import math
import os

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

REPO = r"C:\Users\Harrold\Desktop\Projects2\Project Nexus"
DOWNLOAD = os.path.join(REPO, "assets-src", "twin", "downloads", "sketchfab", "lightbody-90-md-pickup", "scene.gltf")
TEX_DIR = os.path.join(REPO, "assets-src", "twin", "export", "textures")
LOGO = os.path.join(REPO, "public", "scic-logo-official.png")
ASSET = "veh.pickup.a"
NAME = "pickup.a"
ROOT = "SRC_pickup_root"
SHEET = 2048
PAINT = (0.80, 0.81, 0.80)  # the body colour, linear: an off-white
DUST = np.array([0.30, 0.17, 0.09], dtype=np.float32)  # laterite road dust, linear
LOD_TRIS = (25000, 8000, 2000)

# where each of the download's materials goes on the sheet: (u, v) of the cell's corner and the scale
# applied to the source UVs, after `take` (the corner of the part of the source sheet that is used)
CELLS = {
    "UTLTRUCK90_Bodymat": {"at": (0.0, 0.0), "scale": 0.5, "take": (0.0, 0.0)},
    "UCB_BOTTOM": {"at": (0.5, 0.0), "scale": 0.5, "take": (0.0, 0.0)},
    "UCB_Interiors_1": {"at": (0.0, 0.5), "scale": 1.0, "take": (0.0, 0.5)},
    "RB1c_Tire_1k": {"at": (0.5, 0.5), "scale": 0.25, "take": (0.0, 0.0)},
    "UCB_Lights_and_Glass": {"at": (0.75, 0.5), "scale": 1.0, "take": (0.0, 0.25)},
    "Numberplates_Misk_U": {"at": (0.5, 0.75), "scale": 0.25, "take": (0.0, 0.0)},
}
DECAL_CELL = (0.76, 0.80, 0.99, 0.95)  # u0, v0, u1, v1 of the door decal on the sheet
GLASS = "UCB_Lights_and_Glass_Transperent"
LAMPS = "UCB_Lights_and_Glass"
WHEELS = {"WheelStock_FL": "wheel-fl", "WheelStock_FR": "wheel-fr", "WheelStock_RL": "wheel-rl", "WheelStock_RR": "wheel-rr"}

scene = bpy.context.scene
vl = bpy.context.view_layer


def collection(name, parent=None):
    coll = bpy.data.collections.get(name)
    if coll is None:
        coll = bpy.data.collections.new(name)
        (parent or scene.collection).children.link(coll)
    return coll


def base_name(material):
    return material.name.split(".")[0] if material.name[-4:-3] == "." else material.name


def stage_import():
    if bpy.data.objects.get(ROOT):
        return
    # (a helper node group left in the file by an older importer lacks a socket the current one asks for)
    for g in bpy.data.node_groups:
        if "gltf" in g.name.lower() and not g.name.startswith("old."):
            g.name = "old." + g.name
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=DOWNLOAD)
    root = next(o for o in bpy.data.objects if o not in before and o.parent is None)
    root.name = ROOT


def tris(mesh):
    return sum(len(p.vertices) - 2 for p in mesh.polygons)


def new_image(name, colour, fill):
    old = bpy.data.images.get(name)
    if old:
        bpy.data.images.remove(old)
    img = bpy.data.images.new(name, SHEET, SHEET, alpha=False, float_buffer=False)
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


def joined(objects, name, coll):
    """One new object holding copies of `objects` (their world transforms applied)."""
    target = bpy.data.meshes.new(name)
    parts = []
    for o in objects:
        m = o.data.copy()
        m.transform(o.matrix_world)
        parts.append((o, m))
    obj = bpy.data.objects.new(name, target)
    coll.objects.link(obj)
    temp = []
    for o, m in parts:
        t = bpy.data.objects.new("__join", m)
        coll.objects.link(t)
        temp.append(t)
    for o in vl.objects:
        o.select_set(False)
    for t in temp:
        t.select_set(True)
    obj.select_set(True)
    vl.objects.active = obj
    bpy.ops.object.join()
    return obj


def stage_build():
    root = bpy.data.objects[ROOT]
    sources = [o for o in root.children_recursive if o.type == "MESH"]
    lo = min((o.matrix_world @ v.co).z for o in sources for v in o.data.vertices)
    place = Matrix.Translation((0, 0, -lo)) @ Matrix.Rotation(-math.pi / 2, 4, "Z")  # front to -Y, wheels on Z = 0

    work = collection("WORK_pickup")
    for o in list(work.objects):
        bpy.data.objects.remove(o, do_unlink=True)

    # 1. a placed copy of every mesh, with a second UV layer that lies in the material's cell of the sheet
    copies = {}
    for o in sources:
        key = o.parent.parent.name.replace("UTLTRUCK90_", "")
        if key.startswith("Badges"):
            continue
        mesh = o.data.copy()
        mesh.transform(place @ o.matrix_world)
        c = bpy.data.objects.new("pk." + key, mesh)
        work.objects.link(c)
        mat = base_name(mesh.materials[0])
        if mat in CELLS:
            cell = CELLS[mat]
            src = mesh.uv_layers[0]
            uv = np.empty(len(mesh.loops) * 2, dtype=np.float32)
            src.data.foreach_get("uv", uv)
            uv = uv.reshape(-1, 2)
            out = (uv - np.array(cell["take"], dtype=np.float32)) * cell["scale"] + np.array(cell["at"], dtype=np.float32)
            layer = mesh.uv_layers.new(name="sheet")
            layer.data.foreach_set("uv", out.astype(np.float32).ravel())
        else:  # (untextured glass: its one layer takes the same name, so joined meshes have a single layer)
            mesh.uv_layers[0].name = "sheet"
            for layer in list(mesh.uv_layers)[1:]:
                mesh.uv_layers.remove(layer)
        c["src_material"] = mat
        copies[key] = c

    opaque = [c for c in copies.values() if c["src_material"] in CELLS]
    for c in opaque:  # only the source layer and the sheet layer, in that order, on every mesh
        mesh = c.data
        for layer in [l for l in mesh.uv_layers if l.name != "sheet" and l != mesh.uv_layers[0]]:
            mesh.uv_layers.remove(layer)
        mesh.uv_layers[0].name = "source"

    # 2. bake: every opaque part in one object, drawn into the sheet through its "sheet" layer
    bake = joined(opaque, "pk.bake", work)
    bake.data.uv_layers["source"].active_render = True
    bake.data.uv_layers.active = bake.data.uv_layers["sheet"]
    bake_materials = [m for m in bake.data.materials if m]
    body = next(m for m in bake_materials if base_name(m) == "UTLTRUCK90_Bodymat")
    next(n for n in body.node_tree.nodes if n.type == "BSDF_PRINCIPLED").inputs["Base Color"].default_value = (*PAINT, 1)

    engine = scene.render.engine
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 2
    scene.render.bake.margin = 6
    scene.render.bake.use_clear = True
    for o in vl.objects:
        o.select_set(False)
    bake.select_set(True)
    vl.objects.active = bake

    def bake_pass(name, colour, fill, kind, setup=None, **kwargs):
        img = new_image("pk." + name, colour, fill)
        undo = []
        for mat in bake_materials:
            nodes, links = mat.node_tree.nodes, mat.node_tree.links
            node = nodes.new("ShaderNodeTexImage")
            node.image = img
            nodes.active = node
            undo.append((mat, node))
            if setup:
                undo += setup(mat) or []
        bpy.ops.object.bake(type=kind, **kwargs)
        for mat, thing in undo:
            if isinstance(thing, tuple):  # a link to restore: (from socket, to socket)
                mat.node_tree.links.new(thing[0], thing[1])
            else:
                mat.node_tree.nodes.remove(thing)
        return pixels(img), img

    def emit_from(socket_name, graph=None):
        """A set-up that shows a BSDF input (or a built graph) as emission, so it can be baked."""
        def setup(mat):
            nodes, links = mat.node_tree.nodes, mat.node_tree.links
            bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
            out = next(n for n in nodes if n.type == "OUTPUT_MATERIAL" and n.is_active_output)
            surface = out.inputs["Surface"].links[0].from_socket
            emit = nodes.new("ShaderNodeEmission")
            made = [emit]
            if graph:
                made += graph(mat, emit)
            else:
                sock = bsdf.inputs[socket_name]
                if sock.is_linked:
                    links.new(sock.links[0].from_socket, emit.inputs["Color"])
                else:
                    v = sock.default_value
                    emit.inputs["Color"].default_value = (v, v, v, 1) if isinstance(v, float) else tuple(v)
            links.new(emit.outputs[0], out.inputs["Surface"])
            return [(mat, n) for n in made] + [(mat, (surface, out.inputs["Surface"]))]
        return setup

    def dirt_graph(mat, emit):
        """Road dust: heavy below the sills, thinning out by the waistline, broken up by noise."""
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        geo = nodes.new("ShaderNodeNewGeometry")
        sep = nodes.new("ShaderNodeSeparateXYZ")
        ramp = nodes.new("ShaderNodeMapRange")
        ramp.interpolation_type = "SMOOTHSTEP"
        ramp.inputs["From Min"].default_value = 0.22
        ramp.inputs["From Max"].default_value = 1.0
        ramp.inputs["To Min"].default_value = 1.0
        ramp.inputs["To Max"].default_value = 0.0
        big = nodes.new("ShaderNodeTexNoise")
        big.inputs["Scale"].default_value = 3.5
        big.inputs["Detail"].default_value = 5
        fine = nodes.new("ShaderNodeTexNoise")
        fine.inputs["Scale"].default_value = 55
        mul = nodes.new("ShaderNodeMath")
        mul.operation = "MULTIPLY_ADD"  # ramp * (0.45 + noise) ...
        mix = nodes.new("ShaderNodeMath")
        mix.operation = "ADD"
        speck = nodes.new("ShaderNodeMath")
        speck.operation = "MULTIPLY"
        speck.inputs[1].default_value = 0.16
        links.new(geo.outputs["Position"], sep.inputs[0])
        links.new(sep.outputs["Z"], ramp.inputs["Value"])
        links.new(ramp.outputs[0], mul.inputs[0])
        links.new(big.outputs[0], mul.inputs[1])
        mul.inputs[2].default_value = 0.0
        links.new(fine.outputs[0], speck.inputs[0])
        links.new(mul.outputs[0], mix.inputs[0])
        links.new(speck.outputs[0], mix.inputs[1])
        links.new(mix.outputs[0], emit.inputs["Color"])
        return [geo, sep, ramp, big, fine, mul, mix, speck]

    def no_metal(mat):
        """Colour is baked as if nothing were metal: the diffuse pass of a metal is black."""
        bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        sock = bsdf.inputs["Metallic"]
        if sock.is_linked:
            link = sock.links[0]
            pair = (link.from_socket, sock)
            mat.node_tree.links.remove(link)
            return [(mat, pair)]
        return []

    metal, _ = bake_pass("metal", False, (0, 0, 0, 1), "EMIT", emit_from("Metallic"))
    rough, _ = bake_pass("rough", False, (0.6, 0.6, 0.6, 1), "ROUGHNESS")
    dirt, _ = bake_pass("dirt", False, (0, 0, 0, 1), "EMIT", emit_from(None, dirt_graph))
    normal, normal_img = bake_pass("normal", False, (0.5, 0.5, 1, 1), "NORMAL")
    colour, colour_img = bake_pass("colour", True, (0.5, 0.5, 0.5, 1), "DIFFUSE", no_metal, pass_filter={"COLOR"})
    scene.render.engine = engine

    # 3. compose: dust over colour and roughness; the door decal; one occlusion-roughness-metal image
    mask = np.clip(dirt[:, :, 0], 0, 1)
    # (the lamps and the plates keep clean: nobody could read a brake light under a coat of dust)
    h = SHEET
    for name in ("UCB_Lights_and_Glass",):
        cell = CELLS[name]
        x0, y0 = int(cell["at"][0] * h), int(cell["at"][1] * h)
        mask[y0:y0 + int(0.06 * h), x0:x0 + int(0.25 * h)] *= 0.25
    k = (mask * 0.85)[:, :, None]
    colour[:, :, :3] = colour[:, :, :3] * (1 - k) + DUST * k
    orm = np.ones_like(colour)
    orm[:, :, 1] = rough[:, :, 0] * (1 - mask * 0.85) + 0.93 * mask * 0.85
    orm[:, :, 2] = metal[:, :, 0] * (1 - mask * 0.8)

    logo = bpy.data.images.load(LOGO, check_existing=False)
    lw, lh = logo.size
    lp = pixels(logo)
    logo_linear = np.where(lp[:, :, :3] <= 0.04045, lp[:, :, :3] / 12.92, ((lp[:, :, :3] + 0.055) / 1.055) ** 2.4) if logo.colorspace_settings.name != "sRGB" else lp[:, :, :3]
    bpy.data.images.remove(logo)
    u0, v0, u1, v1 = DECAL_CELL
    x0, x1, y0, y1 = int(u0 * h), int(u1 * h), int(v0 * h), int(v1 * h)
    cw, ch = x1 - x0, y1 - y0
    pad = 0.08
    scale = min(cw * (1 - 2 * pad) / lw, ch * (1 - 2 * pad) / lh)
    tw, th = int(lw * scale), int(lh * scale)
    ys = (np.arange(th) / scale).astype(int).clip(0, lh - 1)
    xs = (np.arange(tw) / scale).astype(int).clip(0, lw - 1)
    art = logo_linear[ys][:, xs]
    alpha = lp[ys][:, xs][:, :, 3:4]
    colour[y0:y1, x0:x1, :3] = np.array(PAINT, dtype=np.float32) * 0.97
    ox, oy = x0 + (cw - tw) // 2, y0 + (ch - th) // 2
    colour[oy:oy + th, ox:ox + tw, :3] = colour[oy:oy + th, ox:ox + tw, :3] * (1 - alpha) + art * alpha
    orm[y0:y1, x0:x1, 1] = 0.42
    orm[y0:y1, x0:x1, 2] = 0.0
    normal[y0:y1, x0:x1, :3] = (0.5, 0.5, 1.0)
    orm_img = new_image("pk.orm", False, (1, 0.6, 0, 1))
    save(colour_img, colour, "pickup-colour.png")
    save(orm_img, orm, "pickup-orm.png")
    save(normal_img, normal, "pickup-normal.png")
    for name in ("pk.metal", "pk.rough", "pk.dirt"):
        bpy.data.images.remove(bpy.data.images[name])
    bpy.data.objects.remove(bake, do_unlink=True)

    # 4. the three materials
    def material(name):
        old = bpy.data.materials.get(name)
        if old:
            bpy.data.materials.remove(old)
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        return mat, next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")

    def sheet_nodes(mat, bsdf, emissive=0.0):
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
        n = nodes.new("ShaderNodeTexImage")
        n.image = normal_img
        nm = nodes.new("ShaderNodeNormalMap")
        links.new(n.outputs["Color"], nm.inputs["Color"])
        links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
        if emissive:
            links.new(c.outputs["Color"], bsdf.inputs["Emission Color"])
            bsdf.inputs["Emission Strength"].default_value = emissive

    paint, bsdf = material("pickup.paint")
    sheet_nodes(paint, bsdf)
    lamps, bsdf = material("EMIT_pickup.lamps")
    sheet_nodes(lamps, bsdf, 1.0)
    glass, bsdf = material("pickup.glass")
    bsdf.inputs["Base Color"].default_value = (0.03, 0.045, 0.05, 1)
    bsdf.inputs["Roughness"].default_value = 0.06
    bsdf.inputs["Alpha"].default_value = 0.42
    glass.surface_render_method = "BLENDED"

    for c in copies.values():
        mesh = c.data
        src = c["src_material"]
        if src in CELLS:
            mesh.uv_layers.remove(mesh.uv_layers["source"])
        mesh.materials.clear()
        mesh.materials.append(glass if src == GLASS else lamps if src == LAMPS else paint)

    # 5. door decals: a small grid laid on each door, 2 mm proud of it
    body = copies["Body"]
    tree = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())
    lo_b = Vector((min(v.co.x for v in body.data.vertices), min(v.co.y for v in body.data.vertices), 0))
    width = 0.52
    height = width * (v1 - v0) / (u1 - u0) * 1.0
    centre_y, centre_z = -0.72, 0.99
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("sheet")
    nx, nz = 8, 3
    for side in (1, -1):
        grid = {}
        for i in range(nx + 1):
            for j in range(nz + 1):
                a, b = i / nx, j / nz
                y = centre_y + (a - 0.5) * width * side  # reads left to right from outside
                z = centre_z + (b - 0.5) * height
                hit = tree.ray_cast(Vector((side * 2.0, y, z)), Vector((-side, 0, 0)))[0]
                x = (hit.x if hit else side * 0.9) + side * 0.002
                grid[i, j] = (bm.verts.new((x, y, z)), (u0 + a * (u1 - u0), v0 + b * (v1 - v0)))
        for i in range(nx):
            for j in range(nz):
                corners = [grid[i, j], grid[i + 1, j], grid[i + 1, j + 1], grid[i, j + 1]]
                if side < 0:
                    corners.reverse()
                face = bm.faces.new([c[0] for c in corners])
                for loop, corner in zip(face.loops, corners):
                    loop[uv_layer].uv = corner[1]
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new("pk.Decals")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(paint)
    decals = bpy.data.objects.new("pk.Decals", mesh)
    work.objects.link(decals)
    # (the normals must face out from the truck)
    for poly in mesh.polygons:
        if poly.normal.x * poly.center.x < 0:
            poly.flip()
    print("[pickup] build:", len(copies), "parts,", sum(tris(c.data) for c in copies.values()), "triangles")


if "import" in STAGES:  # noqa: F821
    stage_import()
if "build" in STAGES:  # noqa: F821
    stage_build()


# ---- levels of detail and the asset collection -------------------------------------------------------


def y_up(v):
    return [round(v[0], 4), round(v[2], 4), round(-v[1], 4)]


def decimated(obj, target):
    """Collapse `obj`'s mesh to at most `target` triangles, in place."""
    full = tris(obj.data)
    if full <= target:
        return
    ratio = target / full
    while True:
        mod = obj.modifiers.new("lod", "DECIMATE")
        mod.ratio = ratio
        dg = bpy.context.evaluated_depsgraph_get()
        mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
        obj.modifiers.clear()
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=1e-6)
        bmesh.ops.delete(bm, geom=[e for e in bm.edges if not e.link_faces], context="EDGES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        bm.to_mesh(mesh)
        bm.free()
        mesh.validate()
        if tris(mesh) <= target:
            break
        bpy.data.meshes.remove(mesh)
        ratio *= 0.95
    old = obj.data
    name = old.name
    obj.data = mesh
    bpy.data.meshes.remove(old)
    mesh.name = name


def stage_lods():
    work = bpy.data.collections["WORK_pickup"]
    parts = {o.name[3:]: o for o in work.objects if o.name.startswith("pk.")}
    lib = collection("LIB_veh")
    coll = collection(ASSET, lib)
    coll["twin_class"] = "light-vehicle"
    coll["twin_credits"] = "sketchfab.zhabotinsky-lightbody-90-md-pickup,scic.wordmark"
    for o in list(coll.objects):
        bpy.data.objects.remove(o, do_unlink=True)

    moving = set(WHEELS) | {"Steering_Wheel"}
    fixed = [o for k, o in parts.items() if k not in moving]

    def copy_of(o):
        c = bpy.data.objects.new("__tmp", o.data.copy())
        work.objects.link(c)
        return c

    # LOD0: the body as one mesh; the underside, never seen closely, gives up a third of its triangles
    pieces = []
    for o in fixed:
        c = copy_of(o)
        if o.name == "pk.bottom":
            decimated(c, int(tris(c.data) * 0.68))
        pieces.append(c)
    lod0 = joined(pieces, NAME + "_LOD0", coll)
    for c in pieces:
        bpy.data.objects.remove(c, do_unlink=True)
    lod0.data.name = lod0.name

    heads = parts["Headlights"].data.vertices
    lod0["twin_headlights"] = [y_up(Vector((sx * 0.5, min(v.co.y for v in heads), sum(v.co.z for v in heads) / len(heads)))) for sx in (1, -1)]
    tails = parts["Brakelights"].data.vertices
    lod0["twin_taillights"] = [y_up(Vector((sx * 0.7, max(v.co.y for v in tails), sum(v.co.z for v in tails) / len(tails)))) for sx in (1, -1)]

    for key, part in list(WHEELS.items()) + [("Steering_Wheel", "steering")]:
        src = parts[key]
        mesh = src.data.copy()
        co = np.array([v.co[:] for v in mesh.vertices])
        pivot = Vector(((co.min(0) + co.max(0)) / 2).tolist())
        mesh.transform(Matrix.Translation(-pivot))
        obj = bpy.data.objects.new(f"{NAME}_{part}", mesh)
        mesh.name = obj.name
        coll.objects.link(obj)
        obj.parent = lod0
        obj.location = pivot
        obj["twin_part"] = part
        obj["twin_pivot"] = y_up(pivot)
        if part == "steering":  # the column: the direction the rim is thinnest in
            centred = co - co.mean(0)
            axis = Vector(np.linalg.svd(centred, full_matrices=False)[2][2].tolist())
            if axis.y > 0:
                axis = -axis  # pointing forward, down the column
            obj["twin_axis"] = y_up(axis)
        else:
            obj["twin_radius"] = round(float(co[:, 2].max() - co[:, 2].min()) / 2, 4)
    vl.update()

    # LOD1: everything in one mesh, wheels included; LOD2: the outside only
    for level, leave_out in ((1, {"Steering_Wheel"}), (2, {"Steering_Wheel", "Interior", "bottom", "suspension", "Bumper_front_inner", "Decals", "Truckbed_Trim"})):
        pieces = [copy_of(o) for k, o in parts.items() if k not in leave_out]
        lod = joined(pieces, f"{NAME}_LOD{level}", coll)
        for c in pieces:
            bpy.data.objects.remove(c, do_unlink=True)
        lod.data.name = lod.name
        decimated(lod, LOD_TRIS[level])
        lod.hide_render = True
        lod.hide_viewport = True
    for o in coll.objects:  # an empty first slot is left by joining into a new mesh
        if o.type == "MESH":
            for i in reversed(range(len(o.data.materials))):
                if o.data.materials[i] is None:
                    o.data.materials.pop(index=i)
            # (a mesh whose layer is not the one marked for rendering is exported with textures that name no layer)
            o.data.uv_layers.active = o.data.uv_layers[0]
            o.data.uv_layers[0].active_render = True
    total = tris(lod0.data) + sum(tris(c.data) for c in lod0.children)
    print("[pickup] LOD0", total, "LOD1", tris(bpy.data.objects[NAME + "_LOD1"].data), "LOD2", tris(bpy.data.objects[NAME + "_LOD2"].data))

    # the working copies and the download leave the scene (the download is kept on disk)
    for o in list(work.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.collections.remove(work)
    root = bpy.data.objects.get(ROOT)
    if root:
        for o in list(root.children_recursive) + [root]:
            bpy.data.objects.remove(o, do_unlink=True)


if "lods" in STAGES:  # noqa: F821
    stage_lods()
