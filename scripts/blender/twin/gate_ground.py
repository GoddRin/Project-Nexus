"""
The ground of the camp gate slice (P02a): one 60 m patch of terrain with the access road through
it, as a height function, a mesh and a painted mask.

    import gate_ground
    g = gate_ground.Ground()          # needs REF_terrain_v1 in the open .blend, for the patch edges
    g.height(x, z)                    # ground level at a twin position, metres
    g.build_mesh()                    # asset ground.camp-gate
    g.write_mask()                    # assets-src/twin/export/textures/ground-camp-gate_mask.png
    g.write_layout()                  # components/twin/data/sources/camp-gate-layout.json

Everything here is in the twin's powerhouse frame (metres, Y up; x, z on the ground), as v1's
routes and cameras are. The road's line through the gate is this session's own: v1's road there is
its author's arrangement on a flat pad, not a survey (MASTER-BRIEF section 8), so only its rough
course is kept.

The mask (one pixel is about 6 cm) holds what the ground material blends by:
  R  compacted laterite road      G  mud (wheel tracks, shoulders, ditch)
  B  leaf litter under the trees  A  how deep a puddle can stand (0 none)
Grass is what is left: 1 - R - G - B.
"""
import json
import math
import os
import struct
import zlib

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

import model_kit
import twin_lib

# ---- layout -------------------------------------------------------------------------------------------

CENTRE = (92.0, -67.5)  # middle of the patch (twin x, z)
SIZE = 60.0
GRID = 0.4  # mesh spacing, metres
MASK = 1024

GATE = (92.5, -67.5)  # where the barrier crosses the road's centre line
INBOUND = (0.4310, -0.9024)  # unit direction of travel into the camp
PAD_Y = 13.40  # level of the gate pad
ROAD_HALF = 3.0
# the checkpoint set piece (struct.guardhouse) has its road between x = 2.9 and x = 8.9
BOOTH_OFFSET = 5.9  # booth centre to road centre, metres, on the left of inbound traffic

# control points of the centre line, outside the camp first (twin x, z); the gate straight is added between them
OUTSIDE = [(63.0, -37.0), (69.0, -40.5), (75.5, -44.5), (81.0, -49.0), (84.6, -53.2)]
INSIDE = [(99.6, -81.6), (103.6, -86.4), (108.2, -90.8), (113.0, -95.2), (117.0, -99.5)]
STRAIGHT = (-12.0, 10.0)  # metres along the road either side of the gate that are dead straight


def _catmull(points, step=0.5):
    """A smooth line through `points`, sampled about every `step` metres."""
    pts = [np.array(p, dtype=float) for p in points]
    pts = [pts[0] * 2 - pts[1]] + pts + [pts[-1] * 2 - pts[-2]]
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        n = max(2, int(np.linalg.norm(p2 - p1) / step))
        for k in range(n):
            t = k / n
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(pts[-2])
    return np.array(out)


def _fbm(x, z, cell, seed, octaves=4):
    """Fractal value noise at arrays of positions; `cell` is the size in metres of the largest features."""
    rng = np.random.default_rng(seed)
    total = np.zeros_like(x, dtype=float)
    amp, norm = 0.5, 0.0
    for o in range(octaves):
        size = 257
        table = rng.random((size, size))
        fx = x / cell * (2 ** o) + 1000.0
        fz = z / cell * (2 ** o) + 1000.0
        ix = np.floor(fx).astype(int)
        iz = np.floor(fz).astype(int)
        tx = fx - ix
        tz = fz - iz
        tx = tx * tx * (3 - 2 * tx)
        tz = tz * tz * (3 - 2 * tz)
        a = table[ix % size, iz % size]
        b = table[(ix + 1) % size, iz % size]
        c = table[ix % size, (iz + 1) % size]
        d = table[(ix + 1) % size, (iz + 1) % size]
        total += amp * ((a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz)
        norm += amp
        amp *= 0.5
    return total / norm


def _smooth(a, b, v):
    t = np.clip((v - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


class Ground:
    def __init__(self):
        d = np.array(INBOUND)
        g = np.array(GATE)
        straight = [tuple(g + d * STRAIGHT[0]), tuple(g + d * (STRAIGHT[0] / 2)), tuple(g), tuple(g + d * (STRAIGHT[1] / 2)), tuple(g + d * STRAIGHT[1])]
        self.line = _catmull(OUTSIDE + straight + INSIDE)
        seg = np.linalg.norm(np.diff(self.line, axis=0), axis=1)
        run = np.concatenate([[0.0], np.cumsum(seg)])
        # distance along the road, zero at the gate, positive into the camp
        at_gate = int(np.argmin(np.linalg.norm(self.line - g, axis=1)))
        self.run = run - run[at_gate]
        terrain = bpy.data.objects.get("REF_terrain_v1")
        self._bvh = None
        if terrain:  # (read from the mesh itself, so it works while the reference terrain is hidden)
            tm = bmesh.new()
            tm.from_mesh(terrain.data)
            tm.transform(terrain.matrix_world)
            self._bvh = BVHTree.FromBMesh(tm)
            tm.free()
        self.min = (CENTRE[0] - SIZE / 2, CENTRE[1] - SIZE / 2)
        rng = np.random.default_rng(11)
        # potholes: (distance along the road, offset from the centre line, radius, depth)
        self.holes = []
        for _ in range(15):
            s = rng.uniform(self.run[0] + 4, self.run[-1] - 4)
            if -8.5 < s < 8.5 and rng.random() < 0.7:
                continue  # the gate pad is kept in better repair
            side = rng.choice([-0.95, 0.95]) + rng.normal(0, 0.25)
            self.holes.append((s, side, rng.uniform(0.35, 0.85), rng.uniform(0.03, 0.07)))
        self.holes += [(-10.5, 1.0, 0.8, 0.06), (6.5, -0.9, 0.7, 0.05), (-3.2, -1.9, 0.6, 0.035)]

    # -- road coordinates

    def road_coords(self, x, z):
        """For arrays of positions: distance along the road (0 at the gate) and offset to its left."""
        x = np.asarray(x, dtype=float)
        z = np.asarray(z, dtype=float)
        best = np.full(x.shape, np.inf)
        s_out = np.zeros(x.shape)
        d_out = np.zeros(x.shape)
        a = self.line[:-1]
        b = self.line[1:]
        for i in range(len(a)):
            ex, ez = b[i] - a[i]
            length2 = ex * ex + ez * ez
            t = np.clip(((x - a[i][0]) * ex + (z - a[i][1]) * ez) / length2, 0.0, 1.0)
            px = a[i][0] + t * ex
            pz = a[i][1] + t * ez
            dist2 = (x - px) ** 2 + (z - pz) ** 2
            closer = dist2 < best
            best = np.where(closer, dist2, best)
            length = math.sqrt(length2)
            s_out = np.where(closer, self.run[i] + t * length, s_out)
            # left of the direction of travel, seen from above with Y up, is (ez, -ex)
            side = ((x - px) * ez - (z - pz) * ex) / length
            d_out = np.where(closer, np.sign(side) * np.sqrt(dist2), d_out)
        return s_out, d_out

    def profile(self, s):
        """Road level along its length: level across the gate pad, falling away outside, a slight rise inside."""
        out = np.where(s < -9.0, PAD_Y - 0.032 * (-9.0 - s), PAD_Y)
        out = np.where(s > 9.0, PAD_Y + 0.006 * (s - 9.0), out)
        return out

    # -- heights

    def design(self, x, z):
        """Ground level as designed, before it is blended into v1's terrain at the patch edge."""
        s, d = self.road_coords(x, z)
        base = self.profile(s)
        near_gate = 1.0 - _smooth(8.5, 13.0, np.abs(s))
        rough = _fbm(x, z, 9.0, 21) - 0.5
        fine = _fbm(x, z, 1.6, 23, 3) - 0.5

        # across the road: a slight crown, shoulders, then the sides
        crown = -0.02 * np.minimum(np.abs(d), ROAD_HALF)
        left = np.maximum(d - 4.3, 0.0)
        right = np.maximum(-d - 4.3, 0.0)
        # uphill side: a ditch at the road's edge (not across the gate pad), then a bank up into the forest
        ditch = -0.34 * _smooth(0.2, 1.0, left) * (1 - _smooth(1.3, 2.4, left)) * (1 - near_gate)
        bank_from = 2.4 + 6.2 * near_gate  # the bank stands further back behind the booth
        bank = 4.2 * _smooth(0.0, 15.0, np.maximum(left - bank_from, 0.0)) + 0.05 * np.maximum(left - bank_from, 0.0)
        # downhill side: the verge falls gently away
        fall = -0.055 * right * (1 - 0.75 * near_gate) - 0.9 * _smooth(9.0, 24.0, right)
        off_road = _smooth(3.0, 5.5, np.abs(d))
        h = base + crown + ditch + bank + fall + off_road * (rough * 0.45 + fine * 0.07) * (1 - 0.7 * near_gate * (np.abs(d) < 10))

        # on the road: two wheel tracks pressed in, and potholes
        on_road = 1 - _smooth(2.6, 3.4, np.abs(d))
        track = np.exp(-(((np.abs(d) - 0.92) / 0.36) ** 2))
        worn = 0.6 + 0.8 * _fbm(x, z, 5.0, 25)
        h -= on_road * track * 0.028 * worn * (1 - 0.6 * near_gate)
        h -= self.hole_depth(s, d)
        h += on_road * fine * 0.02
        return h

    def hole_depth(self, s, d):
        depth = np.zeros_like(s)
        for hs, hd, r, deep in self.holes:
            q = ((s - hs) / (r * 1.5)) ** 2 + ((d - hd) / r) ** 2
            depth = np.maximum(depth, deep * np.clip(1 - q, 0, 1) ** 1.5)
        return depth

    def v1(self, x, z):
        if self._bvh is None:
            return np.full(np.shape(x), PAD_Y)
        flat_x = np.ravel(x)
        flat_z = np.ravel(z)
        out = np.empty(flat_x.shape)
        for i in range(flat_x.size):
            hit = self._bvh.ray_cast(Vector((flat_x[i], -flat_z[i], 500.0)), Vector((0, 0, -1)))
            out[i] = hit[0].z if hit[0] else PAD_Y
        return out.reshape(np.shape(x))

    def edge(self, x, z):
        """0 at the patch edge rising to 1 six metres in."""
        dx = SIZE / 2 - np.abs(np.asarray(x) - CENTRE[0])
        dz = SIZE / 2 - np.abs(np.asarray(z) - CENTRE[1])
        return _smooth(0.0, 6.0, np.minimum(dx, dz))

    def heights(self, x, z, v1=None):
        e = self.edge(x, z)
        old = self.v1(x, z) if v1 is None else v1
        return old + (self.design(x, z) - old) * e

    def height(self, x, z):
        """Ground level at one twin position."""
        return float(self.heights(np.array([x]), np.array([z]))[0])

    # -- placing things by road coordinates

    def at(self, s, d):
        """Twin (x, z) of the point `s` metres along the gate straight and `d` metres to its left."""
        g = np.array(GATE)
        f = np.array(INBOUND)
        left = np.array([f[1], -f[0]])
        p = g + f * s + left * d
        return float(p[0]), float(p[1])

    def booth(self):
        """Twin position and yaw (about Y) of struct.guardhouse."""
        x, z = self.at(0.0, BOOTH_OFFSET)
        # the set piece's Blender +Y (twin local -Z) points into the camp
        yaw = math.atan2(-INBOUND[0], -INBOUND[1])
        return (x, PAD_Y, z), yaw

    # -- outputs

    def build_mesh(self):
        n = int(round(SIZE / GRID)) + 1
        xs = self.min[0] + np.arange(n) * GRID
        zs = self.min[1] + np.arange(n) * GRID
        X, Z = np.meshgrid(xs, zs, indexing="ij")
        H = self.heights(X, Z)
        low = float(H.min())
        coll = model_kit.reset_asset("ground.camp-gate", "ground-patch", ["twin.authored"])
        coll["twin_place"] = [CENTRE[0], low, CENTRE[1]]
        bm = bmesh.new()
        uv = bm.loops.layers.uv.new("UVMap")
        verts = [[None] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                # asset frame: origin at the patch centre on its lowest level; Blender is Z up, twin z is -y
                verts[i][j] = bm.verts.new((X[i, j] - CENTRE[0], -(Z[i, j] - CENTRE[1]), H[i, j] - low))
        for i in range(n - 1):
            for j in range(n - 1):
                f = bm.faces.new((verts[i][j], verts[i + 1][j], verts[i + 1][j + 1], verts[i][j + 1]))
                f.smooth = True
                for loop in f.loops:
                    co = loop.vert.co
                    loop[uv].uv = (co.x / SIZE + 0.5, 0.5 - co.y / SIZE)
        bm.normal_update()
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        if sum(f.normal.z for f in bm.faces) < 0:
            bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
        mesh = bpy.data.meshes.new("camp-gate_LOD0")
        bm.to_mesh(mesh)
        bm.free()
        mat = bpy.data.materials.get("ground-placeholder") or bpy.data.materials.new("ground-placeholder")
        mat.diffuse_color = (0.35, 0.25, 0.18, 1)
        mesh.materials.append(mat)
        obj = bpy.data.objects.new("camp-gate_LOD0", mesh)
        coll.objects.link(obj)
        return obj, low, (n - 1) * (n - 1) * 2

    def mask(self):
        px = SIZE / MASK
        xs = self.min[0] + (np.arange(MASK) + 0.5) * px
        zs = self.min[1] + (np.arange(MASK) + 0.5) * px
        X, Z = np.meshgrid(xs, zs, indexing="xy")  # rows run along z, columns along x
        s, d = self.road_coords(X, Z)
        n1 = _fbm(X, Z, 6.0, 31)
        # (ragged, unlike the pad's level area in `design`: nobody grades a yard to a ruler)
        near_gate = 1.0 - _smooth(7.0, 14.0, np.abs(s) + (n1 - 0.5) * 6.0)
        n2 = _fbm(X, Z, 1.2, 33, 3)
        n3 = _fbm(X, Z, 14.0, 35)
        left = np.maximum(d - 4.3, 0.0)
        right = np.maximum(-d - 4.3, 0.0)

        # road: the carriageway, ragged at the edges, and the yard round the booth
        edge_at = ROAD_HALF + 0.5 + (n1 - 0.5) * 1.4 + (n2 - 0.5) * 0.5
        road = 1 - _smooth(edge_at - 0.5, edge_at + 0.5, np.abs(d))
        yard = near_gate * (1 - _smooth(8.6 + (n1 - 0.5) * 2, 10.4 + (n1 - 0.5) * 2, d)) * (d > 0)
        apron = near_gate * (1 - _smooth(4.6 + (n1 - 0.5), 6.0 + (n1 - 0.5), -d)) * (d < 0)
        road = np.clip(np.maximum(road, np.maximum(yard, apron)), 0, 1)

        # mud: wheel tracks, shoulders, the ditch, round the potholes
        track = np.exp(-(((np.abs(d) - 0.92) / 0.42) ** 2)) * (1 - _smooth(2.6, 3.4, np.abs(d)))
        hole = self.hole_depth(s, d)
        puddle = np.clip(hole / 0.05, 0, 1)
        shoulder = _smooth(2.4, 3.6, np.abs(d)) * (1 - _smooth(4.4, 6.2, np.abs(d)))
        ditch = _smooth(0.2, 1.0, left) * (1 - _smooth(1.3, 2.6, left)) * (1 - near_gate)
        mud = track * (0.22 + 0.4 * n1) * (1 - 0.5 * near_gate) + shoulder * (0.25 + 0.6 * _smooth(0.45, 0.7, n1)) + ditch * 0.9 + np.clip(hole / 0.05, 0, 1) * 0.45 * (0.5 + n2)
        mud = np.clip(mud, 0, 1)

        # leaf litter under the forest edge on both sides
        under_trees = np.maximum(_smooth(8.0, 16.0, left - 5.0 * near_gate + (n3 - 0.5) * 6.0), _smooth(12.0, 20.0, right + (n3 - 0.5) * 6.0))
        litter = np.clip(under_trees * (0.55 + 0.9 * (n3 - 0.5) + 0.5 * (n2 - 0.5)), 0, 1)

        road = road * (1 - np.clip(mud * 0.85, 0, 1))
        litter = litter * (1 - road) * (1 - mud)
        mud = mud * (1 - road * 0.0)
        total = road + mud + litter
        over = np.maximum(total, 1.0)
        road, mud, litter = road / over, mud / over, litter / over

        # standing water: potholes, the ditch bottom, low spots of the shoulder
        water = np.maximum(puddle, ditch * _smooth(0.45, 0.75, n1) * 0.8)
        water = np.maximum(water, shoulder * _smooth(0.62, 0.8, n1) * 0.5)
        return np.stack([road, mud, litter, np.clip(water, 0, 1)], axis=-1)

    def write_mask(self):
        m = (self.mask() * 255 + 0.5).astype(np.uint8)  # row 0 is the patch's lowest z
        path = os.path.join(model_kit.TEX_DIR, "ground-camp-gate_mask.png")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        raw = b"".join(b"\x00" + m[r].tobytes() for r in range(MASK))

        def chunk(tag, data):
            return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

        with open(path, "wb") as f:
            f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", MASK, MASK, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b""))
        return path

    def write_layout(self, low):
        (bx, by, bz), yaw = self.booth()
        keep = self.line[(self.line[:, 0] > self.min[0]) & (self.line[:, 0] < self.min[0] + SIZE) & (self.line[:, 1] > self.min[1]) & (self.line[:, 1] < self.min[1] + SIZE)][::4]
        ys = self.heights(keep[:, 0], keep[:, 1])
        data = {
            "note": "The camp gate slice (P02a), written by scripts/blender/twin/gate_ground.py. Powerhouse location frame, metres, Y up. The road line here replaces v1's through the gate.",
            "patch": {"centre": [CENTRE[0], round(low, 3), CENTRE[1]], "size": SIZE, "mask": "/textures/twin/ground/camp-gate-mask.ktx2"},
            "gate": {"p": [GATE[0], PAD_Y, GATE[1]], "inbound": [INBOUND[0], 0, INBOUND[1]], "roadHalfWidth": ROAD_HALF},
            "booth": {"p": [round(bx, 3), by, round(bz, 3)], "yaw": round(yaw, 4)},
            "road": [[round(float(p[0]), 2), round(float(y), 2), round(float(p[1]), 2)] for p, y in zip(keep, ys)],
        }
        path = os.path.join(twin_lib.DATA_DIR, "sources", "camp-gate-layout.json")
        twin_lib.write_json(path, data, indent=1)
        return path
