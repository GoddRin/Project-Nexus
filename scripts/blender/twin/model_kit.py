"""
A small modelling kit for built things (booths, posts, signs): boxes, pipes and plates whose faces
are mapped straight onto a trim sheet (scripts/twin/atlases/<name>.json, painted by
scripts/twin/build-atlases.mjs), so a whole structure shares one material.

    sheet = Sheet("gate", "trim-gate")
    k = Kit(sheet, lod=0)
    k.box("trim-gate", "panel", (0, 0, 0), (2.4, 0.075, 2.4), u=0, bevel=0.004)
    obj = k.finish("guardhouse_LOD0", collection)

Units are metres, Z up (Blender). `lod` lets one build function make all three levels: bevels are
cut only at LOD 0, pipes get fewer sides at each level, and the caller leaves small parts out with
`if k.lod == 0:`.

Normals are written as face-weighted custom normals, so a bevel catches the light without bending
the shading of the flat faces beside it.
"""
import json
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

import twin_lib

TEX_DIR = os.path.join(twin_lib.EXPORT_DIR, "textures")
ATLAS_DIR = os.path.join(twin_lib.REPO, "scripts", "twin", "atlases")


def spec(name):
    with open(os.path.join(ATLAS_DIR, f"{name}.json"), encoding="utf-8") as f:
        return json.load(f)


class Sheet:
    """Where each band of a trim sheet lies in UV space, and how many metres one width covers."""

    def __init__(self, atlas, name):
        s = spec(atlas)["trims"][name]
        self.name = name
        self.size = s["size"]
        self.tile = s["tileM"]
        self.bands = {}
        top = 0
        for band in s["bands"]:
            inset = 1.5
            v_top = 1 - (top + inset) / self.size
            v_bottom = 1 - (top + band["px"] - inset) / self.size
            self.bands[band["name"]] = (v_bottom, v_top)
            top += band["px"]


class Signs:
    """UV rectangles (u0, v0, u1, v1) of the signs on a sign sheet."""

    def __init__(self, atlas, name):
        s = spec(atlas)["signs"][name]
        self.name = name
        self.rects = {}
        for key, (x, y, w, h) in s["rects"].items():
            n = s["size"]
            self.rects[key] = ((x + 1) / n, 1 - (y + h - 1) / n, (x + w - 1) / n, 1 - (y + 1) / n)


# ---- materials ----------------------------------------------------------------------------------------


def _image(file, colour):
    path = os.path.join(TEX_DIR, file)
    img = bpy.data.images.get(file)
    if img is None:
        img = bpy.data.images.load(path)
        img.name = file
    else:
        img.filepath = path
        img.reload()
    img.colorspace_settings.name = "sRGB" if colour else "Non-Color"
    return img


def _gltf_output_group():
    """The node group Blender's glTF exporter reads ambient occlusion from."""
    group = bpy.data.node_groups.get("glTF Material Output")
    if group is None:
        group = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
        group.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
        group.nodes.new("NodeGroupInput")
    return group


def _fresh(name):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    mat.node_tree.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat, nodes, mat.node_tree.links, bsdf


def trim_material(sheet_name):
    """Colour, normal and occlusion/roughness/metal maps of a trim sheet on one Principled material."""
    mat, nodes, links, bsdf = _fresh(sheet_name)
    colour = nodes.new("ShaderNodeTexImage")
    colour.image = _image(f"{sheet_name}_color.png", True)
    links.new(colour.outputs["Color"], bsdf.inputs["Base Color"])
    normal = nodes.new("ShaderNodeTexImage")
    normal.image = _image(f"{sheet_name}_normal.png", False)
    bump = nodes.new("ShaderNodeNormalMap")
    links.new(normal.outputs["Color"], bump.inputs["Color"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    orm = nodes.new("ShaderNodeTexImage")
    orm.image = _image(f"{sheet_name}_orm.png", False)
    split = nodes.new("ShaderNodeSeparateColor")
    links.new(orm.outputs["Color"], split.inputs["Color"])
    links.new(split.outputs["Green"], bsdf.inputs["Roughness"])
    links.new(split.outputs["Blue"], bsdf.inputs["Metallic"])
    occlusion = nodes.new("ShaderNodeGroup")
    occlusion.node_tree = _gltf_output_group()
    links.new(split.outputs["Red"], occlusion.inputs["Occlusion"])
    return mat


def sign_material(sheet_name, roughness=0.55):
    mat, nodes, links, bsdf = _fresh(sheet_name)
    colour = nodes.new("ShaderNodeTexImage")
    colour.image = _image(f"{sheet_name}_color.png", True)
    links.new(colour.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def glass_material(name="glass", tint=(0.55, 0.68, 0.66), alpha=0.28):
    mat, _, _, bsdf = _fresh(name)
    bsdf.inputs["Base Color"].default_value = (*tint, 1)
    bsdf.inputs["Roughness"].default_value = 0.06
    bsdf.inputs["Alpha"].default_value = alpha
    mat.surface_render_method = "BLENDED"
    return mat


def emit_material(name, colour, strength):
    """A lamp surface. Materials named EMIT_... are switched on and off with the lamps by the twin."""
    mat, _, _, bsdf = _fresh(name)
    bsdf.inputs["Base Color"].default_value = (0.85, 0.85, 0.82, 1)
    bsdf.inputs["Roughness"].default_value = 0.4
    bsdf.inputs["Emission Color"].default_value = (*colour, 1)
    bsdf.inputs["Emission Strength"].default_value = strength
    return mat


# ---- geometry -----------------------------------------------------------------------------------------

AXES = {"x": 0, "y": 1, "z": 2}


class Kit:
    def __init__(self, sheet, lod=0):
        self.sheet = sheet
        self.lod = lod
        self.mats = []
        self.bm = bmesh.new()
        self.bm.loops.layers.uv.new("UVMap")

    # -- internals

    def _index(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def _emit(self, bm, mat, M=None):
        index = self._index(mat)
        for f in bm.faces:
            f.material_index = index
            f.smooth = True
        if M is not None:
            bmesh.ops.transform(bm, matrix=M, verts=bm.verts[:])
        tmp = bpy.data.meshes.new("__kit_tmp")
        bm.to_mesh(tmp)
        bm.free()
        self.bm.from_mesh(tmp)
        bpy.data.meshes.remove(tmp)

    def _band(self, band):
        return self.sheet.bands[band]

    # -- primitives

    def box(self, mat, band, lo, hi, u=None, bevel=0.0, M=None, skip="", vspan=None, uoff=0.0):
        """
        A box from corner `lo` to corner `hi`, mapped onto a band.
        u      axis (0, 1, 2) that runs along the band's length; the longer in-plane axis if None
        skip   faces left out, e.g. "-z" or "-z+z"
        vspan  (low, high) world range mapped to the band's height, instead of the box's own extent
        M      a matrix applied after mapping (to tilt or turn the box)
        """
        lo = Vector(lo)
        hi = Vector(hi)
        size = hi - lo
        centre = (lo + hi) / 2
        bm = bmesh.new()
        uv = bm.loops.layers.uv.new("UVMap")
        bmesh.ops.create_cube(bm, size=1.0)
        for v in bm.verts:
            v.co = Vector((centre.x + v.co.x * size.x, centre.y + v.co.y * size.y, centre.z + v.co.z * size.z))
        bm.normal_update()
        if skip:
            gone = []
            for f in bm.faces:
                k = max(range(3), key=lambda i: abs(f.normal[i]))
                tag = ("+" if f.normal[k] > 0 else "-") + "xyz"[k]
                if tag in skip:
                    gone.append(f)
            bmesh.ops.delete(bm, geom=gone, context="FACES")
        if bevel > 0 and self.lod == 0:
            bmesh.ops.bevel(bm, geom=bm.edges[:], offset=min(bevel, min(size) / 3), segments=1, affect="EDGES", profile=0.5, clamp_overlap=True)
        bm.normal_update()
        v0, v1 = self._band(band)
        for f in bm.faces:
            k = max(range(3), key=lambda i: abs(f.normal[i]))
            others = [i for i in range(3) if i != k]
            if u is not None and u != k:
                ua = u
            else:
                ua = max(others, key=lambda i: size[i])
            va = [i for i in others if i != ua][0]
            low, high = vspan if (vspan and va == 2) else (lo[va], hi[va])
            span = max(high - low, 1e-6)
            for loop in f.loops:
                co = loop.vert.co
                t = min(1.0, max(0.0, (co[va] - low) / span))
                loop[uv].uv = ((co[ua] - lo[ua]) / self.sheet.tile + uoff, v0 + t * (v1 - v0))
        self._emit(bm, mat, M)

    def cyl(self, mat, band, p0, p1, r, segs=10, caps=True, r1=None, around=False, uoff=0.0):
        """
        A pipe or cone from p0 to p1. The band runs along its length; with `around` the band's
        length wraps round it once and the band's height runs from p0 to p1 (the traffic cone).
        """
        p0 = Vector(p0)
        p1 = Vector(p1)
        r1 = r if r1 is None else r1
        axis = p1 - p0
        length = axis.length
        axis.normalize()
        side = axis.cross(Vector((0, 0, 1)))
        if side.length < 1e-4:
            side = Vector((1, 0, 0))
        side.normalize()
        up = side.cross(axis)
        n = max(5, segs // (2 if self.lod == 1 else 3)) if self.lod else segs
        bm = bmesh.new()
        uv = bm.loops.layers.uv.new("UVMap")
        ring0, ring1 = [], []
        for i in range(n):
            a = 2 * math.pi * i / n
            d = side * math.cos(a) + up * math.sin(a)
            ring0.append(bm.verts.new(p0 + d * r))
            ring1.append(bm.verts.new(p1 + d * r1))
        v0, v1 = self._band(band)
        for i in range(n):
            j = (i + 1) % n
            f = bm.faces.new((ring0[i], ring0[j], ring1[j], ring1[i]))
            ti, tj = i / n, (i + 1) / n
            if around:
                coords = [(ti, v0), (tj, v0), (tj, v1), (ti, v1)]
            else:
                u0, u1 = uoff, uoff + length / self.sheet.tile
                coords = [(u0, v0 + ti * (v1 - v0)), (u0, v0 + tj * (v1 - v0)), (u1, v0 + tj * (v1 - v0)), (u1, v0 + ti * (v1 - v0))]
            for loop, c in zip(f.loops, coords):
                loop[uv].uv = c
        if caps:
            mid = (v0 + v1) / 2
            for ring, flip, radius in ((ring0, True, r), (ring1, False, r1)):
                if radius < 1e-4:
                    continue
                f = bm.faces.new(list(reversed(ring)) if flip else ring)
                for loop in f.loops:
                    loop[uv].uv = (uoff + 0.01, mid)
        bm.normal_update()
        self._emit(bm, mat)

    def pipe(self, mat, band, points, r, segs=6):
        """A run of pipe through `points`; each leg is a straight piece (elbows are left square)."""
        run = 0.0
        for a, b in zip(points, points[1:]):
            self.cyl(mat, band, a, b, r, segs=segs, caps=True, uoff=run)
            run += (Vector(b) - Vector(a)).length / self.sheet.tile

    def extrude(self, mat, band, profile, axis, lo, hi, M=None, skip_down=False, uoff=0.0):
        """
        A closed outline pushed along an axis: a wedge, a kerb, a speed hump.
        profile   points (a, b) in the plane across `axis`: (y, z) for axis 0, (x, z) for 1, (x, y) for 2
        skip_down leave out the faces that look straight down (a shape sitting on the ground)
        """
        def point(a, b, t):
            return (t, a, b) if axis == 0 else (a, t, b) if axis == 1 else (a, b, t)

        bm = bmesh.new()
        uv = bm.loops.layers.uv.new("UVMap")
        n = len(profile)
        ring0 = [bm.verts.new(point(a, b, lo)) for a, b in profile]
        ring1 = [bm.verts.new(point(a, b, hi)) for a, b in profile]
        edge = [math.dist(profile[i], profile[(i + 1) % n]) for i in range(n)]
        total = sum(edge)
        v0, v1 = self._band(band)
        length = abs(hi - lo) / self.sheet.tile
        run = 0.0
        for i in range(n):
            j = (i + 1) % n
            f = bm.faces.new((ring0[i], ring0[j], ring1[j], ring1[i]))
            ta = v0 + (run / total) * (v1 - v0)
            tb = v0 + ((run + edge[i]) / total) * (v1 - v0)
            run += edge[i]
            for loop, c in zip(f.loops, [(uoff, ta), (uoff, tb), (uoff + length, tb), (uoff + length, ta)]):
                loop[uv].uv = c
        b_lo = min(b for _, b in profile)
        b_hi = max(b for _, b in profile)
        a_lo = min(a for a, _ in profile)
        for ring in (ring0, ring1):
            f = bm.faces.new(ring)
            for loop, (a, b) in zip(f.loops, profile):
                loop[uv].uv = ((a - a_lo) / self.sheet.tile + uoff, v0 + (b - b_lo) / max(b_hi - b_lo, 1e-6) * (v1 - v0))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        if skip_down:
            bm.normal_update()
            bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.z < -0.999], context="FACES")
        bm.normal_update()
        self._emit(bm, mat, M)

    def plate(self, mat, rect, lo, hi, face):
        """
        One flat face carrying a rectangle of a sign sheet (or any (u0, v0, u1, v1)), on the `face`
        side ("+x", "-x", "+y", "-y", "+z") of the box lo..hi. Text reads the right way round from outside.
        """
        lo = Vector(lo)
        hi = Vector(hi)
        u0, v0, u1, v1 = rect
        x0, y0, z0 = lo
        x1, y1, z1 = hi
        corners = {
            # bottom-left, bottom-right, top-right, top-left as seen from outside
            "+x": [(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)],
            "-x": [(x0, y1, z0), (x0, y0, z0), (x0, y0, z1), (x0, y1, z1)],
            "+y": [(x1, y1, z0), (x0, y1, z0), (x0, y1, z1), (x1, y1, z1)],
            "-y": [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)],
            "+z": [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)],
        }[face]
        bm = bmesh.new()
        uv = bm.loops.layers.uv.new("UVMap")
        f = bm.faces.new([bm.verts.new(c) for c in corners])
        for loop, c in zip(f.loops, [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]):
            loop[uv].uv = c
        bm.normal_update()
        self._emit(bm, mat)

    def disc(self, mat, band, centre, normal, r, segs=16, dome=0.0):
        """A round plate (a sign back, a mirror). `dome` bulges it out along the normal (convex mirror)."""
        centre = Vector(centre)
        normal = Vector(normal).normalized()
        side = normal.cross(Vector((0, 0, 1)))
        if side.length < 1e-4:
            side = Vector((1, 0, 0))
        side.normalize()
        up = normal.cross(side)
        n = max(8, segs // (self.lod + 1))
        bm = bmesh.new()
        uv = bm.loops.layers.uv.new("UVMap")
        v0, v1 = self._band(band)
        mid = (v0 + v1) / 2
        hub = bm.verts.new(centre + normal * dome)
        ring = [bm.verts.new(centre + (side * math.cos(2 * math.pi * i / n) + up * math.sin(2 * math.pi * i / n)) * r) for i in range(n)]
        for i in range(n):
            f = bm.faces.new((hub, ring[i], ring[(i + 1) % n]))
            for loop in f.loops:
                loop[uv].uv = (0.02, mid) if loop.vert is hub else (0.02 + 0.01, mid)
        bm.normal_update()
        self._emit(bm, mat)

    # -- finishing

    def triangles(self):
        return sum(len(f.verts) - 2 for f in self.bm.faces)

    def finish(self, name, collection):
        """The mesh object, with face-weighted normals; edges sharper than 50 degrees stay sharp."""
        bm = self.bm
        bm.normal_update()
        limit = math.radians(50)
        for e in bm.edges:
            if len(e.link_faces) == 2:
                e.smooth = e.calc_face_angle(0.0) < limit
        mesh = bpy.data.meshes.new(name)
        bm.to_mesh(mesh)
        for m in self.mats:
            mesh.materials.append(bpy.data.materials[m])

        # face-weighted normals: at each corner, the area-weighted mean of the faces round that
        # vertex that face within 60 degrees of this one
        bm.faces.ensure_lookup_table()
        bm.faces.index_update()
        cos_limit = math.cos(math.radians(60))
        areas = [f.calc_area() for f in bm.faces]
        normals = []  # (in mesh loop order: faces in order, corners in order)
        for f in bm.faces:
            for loop in f.loops:
                total = Vector((0, 0, 0))
                for g in loop.vert.link_faces:
                    if g.normal.dot(f.normal) >= cos_limit:
                        total += g.normal * areas[g.index]
                normals.append(total.normalized() if total.length > 1e-12 else f.normal.copy())
        mesh.normals_split_custom_set([tuple(n) for n in normals])
        bm.free()

        obj = bpy.data.objects.new(name, mesh)
        collection.objects.link(obj)
        return obj


def ensure_collection(name, parent=None):
    coll = bpy.data.collections.get(name)
    if coll is None:
        coll = bpy.data.collections.new(name)
        (parent or bpy.context.scene.collection).children.link(coll)
    return coll


def reset_asset(asset_id, twin_class, credits, lod_distances=None, origin=None):
    """An empty asset collection inside its LIB_ collection, with its custom properties set."""
    lib = ensure_collection(f"LIB_{asset_id.split('.')[0]}")
    coll = ensure_collection(asset_id, lib)
    for obj in list(coll.objects):
        mesh = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if getattr(mesh, "users", 1) == 0:
            bpy.data.meshes.remove(mesh)
    coll["twin_class"] = twin_class
    coll["twin_credits"] = ",".join(credits)
    if lod_distances:
        coll["twin_lod_distances"] = [float(v) for v in lod_distances]
    if origin:
        coll["twin_origin"] = origin
    return coll


def hide_lower_lods(coll):
    """Placements instance the collection: only LOD0 is shown in the viewport and in renders."""
    for level, obj in twin_lib.lod_objects(coll).items():
        obj.hide_render = level > 0
        obj.hide_viewport = level > 0


def rot_z(angle, about=(0, 0, 0)):
    c = Vector(about)
    return Matrix.Translation(c) @ Matrix.Rotation(angle, 4, "Z") @ Matrix.Translation(-c)


def rot_axis(angle, axis, about=(0, 0, 0)):
    c = Vector(about)
    return Matrix.Translation(c) @ Matrix.Rotation(angle, 4, axis) @ Matrix.Translation(-c)
