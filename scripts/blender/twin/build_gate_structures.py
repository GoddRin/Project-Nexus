"""
Builds the camp gate's built assets in the open .blend (P02a), at all three levels of detail:

  struct.guardhouse     the checkpoint as one set piece: booth on its plinth, boom post and rest post,
                        two speed humps, signs, convex mirror, solar flood-light pole, sandbags
  kit.boom-arm          the barrier arm with its counterweight, origin at the pivot (so it can be raised)
  prop.traffic-cone     a cone

Run inside Blender:  exec(open("scripts/blender/twin/build_gate_structures.py").read())
Textures come from scripts/twin/build-atlases.mjs (run that first).

The booth follows the camp's own buildings (owner's photographs, reference R4 and R5): white
insulated panels on a low concrete base, green steel frame and window frames, a rusting corrugated
roof, red flexible conduit, a window air-conditioner on a bracket, a solar street light on a pole.

Frame of the set piece: metres, Z up, origin on the ground at the middle of the booth. +X is
towards the road, +Y into the camp, so traffic arriving from outside travels towards +Y with the
booth on the driver's side (left-hand-drive vehicles keeping right). The road runs along Y between
x = ROAD_NEAR and x = ROAD_FAR; the barrier pivot is at PIVOT.
"""
import math
import os
import random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.join(os.path.dirname(bpy.data.filepath), "..", "..", "scripts", "blender", "twin"))
import importlib

import model_kit
import twin_lib

importlib.reload(model_kit)
from model_kit import Kit, Sheet, Signs, rot_axis, rot_z

ROAD_NEAR = 2.9
ROAD_FAR = 8.9
PIVOT = (2.6, 0.0, 1.0)
ARM_REACH = 6.6  # pivot to the rest post
FLOOR = 0.18  # top of the plinth
WALL_TOP = 2.40
SLOPE = 0.105  # roof rise per metre towards the road
ROOF_Z = 2.56  # roof plane height over the middle of the booth

CREDITS_TRIM = ["polyhaven.painted_plaster_wall", "polyhaven.corrugated_iron", "polyhaven.rusty_corrugated_iron", "polyhaven.concrete_wall_008", "polyhaven.rusty_metal_02", "polyhaven.rusty_metal_03", "scic.wordmark"]
CREDITS_SMALL = ["polyhaven.rusty_metal_03", "polyhaven.concrete_wall_008"]

T = "trim-gate"
S = "signs-gate"
G = "glass"


def materials():
    model_kit.trim_material("trim-gate")
    model_kit.trim_material("trim-small")
    model_kit.sign_material("signs-gate")
    model_kit.glass_material("glass")
    model_kit.emit_material("EMIT_tube", (1.0, 0.96, 0.86), 6.0)
    model_kit.emit_material("EMIT_flood", (0.86, 0.93, 1.0), 12.0)


def roof_matrix():
    return rot_axis(-math.atan(SLOPE), "Y", about=(0, 0, ROOF_Z))


def wall_with_opening(k, axis_face, fixed_lo, fixed_hi, a_lo, a_hi, open_a, open_z, bevel=0.0):
    """
    A panel wall with one opening. The wall is thin along the fixed axis and runs from a_lo to a_hi
    along the other; `open_a` and `open_z` give the hole. Pieces: left, right, below, above.
    """
    def piece(a0, a1, z0, z1):
        if a1 - a0 < 1e-4 or z1 - z0 < 1e-4:
            return
        if axis_face == "x":  # wall facing along X, running along Y
            k.box(T, "panel", (fixed_lo, a0, z0), (fixed_hi, a1, z1), u=1, vspan=(FLOOR, WALL_TOP), bevel=bevel, uoff=a0 / k.sheet.tile)
        else:
            k.box(T, "panel", (a0, fixed_lo, z0), (a1, fixed_hi, z1), u=0, vspan=(FLOOR, WALL_TOP), bevel=bevel, uoff=a0 / k.sheet.tile)

    if open_a is None:
        piece(a_lo, a_hi, FLOOR, WALL_TOP)
        return
    piece(a_lo, open_a[0], FLOOR, WALL_TOP)
    piece(open_a[1], a_hi, FLOOR, WALL_TOP)
    piece(open_a[0], open_a[1], FLOOR, open_z[0])
    piece(open_a[0], open_a[1], open_z[1], WALL_TOP)


def window(k, face, fixed, a, z, panes=2):
    """A green-framed sliding window in an opening; `fixed` is the wall's outer face coordinate."""
    f = 0.045  # frame section
    out = 0.012
    a0, a1 = a
    z0, z1 = z
    sign = 1 if face[0] == "+" else -1
    d0, d1 = sorted((fixed - sign * 0.05, fixed + sign * out))

    def bar(lo_a, hi_a, lo_z, hi_z, band="green", mat=T, depth=None, u=None):
        e0, e1 = depth or (d0, d1)
        if face[1] == "x":
            k.box(mat, band, (e0, lo_a, lo_z), (e1, hi_a, hi_z), u=u, bevel=0.004)
        else:
            k.box(mat, band, (lo_a, e0, lo_z), (hi_a, e1, hi_z), u=u, bevel=0.004)

    bar(a0, a1, z0, z0 + f)
    bar(a0, a1, z1 - f, z1)
    bar(a0, a0 + f, z0 + f, z1 - f, u=2)
    bar(a1 - f, a1, z0 + f, z1 - f, u=2)
    if k.lod < 2 and panes == 2:
        mid = (a0 + a1) / 2
        bar(mid - f / 2, mid + f / 2, z0 + f, z1 - f, u=2)
    # glass: two leaves on separate tracks, the inner one slid a hand's width open
    inner = fixed - sign * 0.032
    outer = fixed - sign * 0.014
    leaves = [(a0 + f, (a0 + a1) / 2 + 0.02, outer), ((a0 + a1) / 2 - 0.02 + 0.12, a1 - f, inner)] if panes == 2 and k.lod < 2 else [(a0 + f, a1 - f, outer)]
    for l0, l1, depth in leaves:
        e = (depth - 0.003, depth + 0.003)
        if face[1] == "x":
            k.box(G, "dark", (e[0], l0, z0 + f), (e[1], l1, z1 - f), skip="+y-y+z-z")
        else:
            k.box(G, "dark", (l0, e[0], z0 + f), (l1, e[1], z1 - f), skip="+x-x+z-z")


def booth(k):
    lod = k.lod
    bev = 0.006
    M = roof_matrix()

    def roof_z(x):
        return ROOF_Z + SLOPE * x

    # --- plinth, apron and door step
    k.box(T, "concrete", (-1.55, -1.85, -0.10), (1.55, 1.85, FLOOR), u=1, bevel=0.012, skip="-z")
    k.box(T, "concrete", (-0.15, 1.85, -0.10), (0.95, 2.50, 0.09), u=0, bevel=0.012, skip="-z-y")
    if lod < 2:
        k.box(T, "concrete", (1.55, -1.0, -0.10), (2.15, 1.0, 0.06), u=1, bevel=0.012, skip="-z-x")  # standing pad under the window

    # --- steel frame: corner posts, base and top rails
    post = 0.075
    for sx in (-1, 1):
        for sy in (-1, 1):
            x0 = sx * 1.2 - (post if sx > 0 else 0)
            y0 = sy * 1.5 - (post if sy > 0 else 0)
            k.box(T, "green", (x0, y0, FLOOR), (x0 + post, y0 + post, roof_z(sx * 1.2) - 0.03), u=2, bevel=bev)
    if lod < 2:
        for sy in (-1, 1):
            y0 = sy * 1.5 - (0.06 if sy > 0 else 0)
            k.box(T, "green", (-1.2 + post, y0 - 0.004 * sy, FLOOR), (1.2 - post, y0 + 0.06 - 0.004 * sy, FLOOR + 0.06), u=0, bevel=0.004)
        for sx in (-1, 1):
            x0 = sx * 1.2 - (0.06 if sx > 0 else 0)
            k.box(T, "green", (x0, -1.5 + post, FLOOR), (x0 + 0.06, 1.5 - post, FLOOR + 0.06), u=1, bevel=0.004)

    # --- walls (50 mm insulated panels), with their openings
    front_win = ((-0.75, 0.75), (1.13, 2.13))
    side_win = ((-0.5, 0.5), (1.13, 2.13))
    door = ((-0.05, 0.85), (FLOOR, 2.23))
    wall_with_opening(k, "x", 1.14, 1.19, -1.5 + post, 1.5 - post, *front_win)  # road side
    if lod < 2:  # back wall, with the hole for the window air-conditioner
        wall_with_opening(k, "x", -1.19, -1.14, -1.5 + post, 1.5 - post, (0.25, 0.85), (1.52, 1.92))
    else:
        wall_with_opening(k, "x", -1.19, -1.14, -1.5 + post, 1.5 - post, None, None)
    wall_with_opening(k, "y", -1.49, -1.44, -1.2 + post, 1.2 - post, *side_win)  # approach side
    wall_with_opening(k, "y", 1.44, 1.49, -1.2 + post, 1.2 - post, *door)  # camp side, with the door

    # --- header above the panels: a green band, wedge-shaped on the two sides to meet the roof
    for sy in (-1, 1):
        y0, y1 = sorted((sy * 1.495, sy * 1.435))
        k.extrude(T, "green", [(-1.2, WALL_TOP), (1.2, WALL_TOP), (1.2, roof_z(1.2) - 0.03), (-1.2, roof_z(-1.2) - 0.03)], 1, y0, y1)
    k.box(T, "green", (1.135, -1.5, WALL_TOP), (1.195, 1.5, roof_z(1.2) - 0.03), u=1, bevel=0.004)
    k.box(T, "green", (-1.195, -1.5, WALL_TOP), (-1.135, 1.5, roof_z(-1.2) - 0.03), u=1)

    # --- windows and door
    window(k, "+x", 1.19, *front_win)
    window(k, "-y", -1.49, *side_win)
    (dx0, dx1), (dz0, dz1) = door
    f = 0.05
    k.box(T, "green", (dx0, 1.43, dz0), (dx0 + f, 1.50, dz1), u=2, bevel=0.004)
    k.box(T, "green", (dx1 - f, 1.43, dz0), (dx1, 1.50, dz1), u=2, bevel=0.004)
    k.box(T, "green", (dx0, 1.43, dz1 - f), (dx1, 1.50, dz1), u=0, bevel=0.004)
    # the leaf stands a little open, hinged on the +x jamb
    hinge = (dx1 - f, 1.47, 0)
    D = rot_z(math.radians(-22), about=hinge)
    k.box(T, "panel", (dx0 + f, 1.45, dz0 + 0.01), (dx1 - f, 1.49, dz1 - f), u=0, vspan=(FLOOR, WALL_TOP), bevel=0.004, M=D)
    if lod == 0:
        k.cyl(T, "chrome", D @ Vector((dx0 + 0.13, 1.41, 1.18)), D @ Vector((dx0 + 0.13, 1.53, 1.18)), 0.012, segs=8)
        k.box(T, "chrome", (dx0 + 0.10, 1.515, 1.165), (dx0 + 0.24, 1.535, 1.195), M=D, bevel=0.003)
    # --- roof: purlins, rafters, sheets, fascia, gutter and downpipe
    if lod < 2:
        for x in (-1.55, -0.45, 0.65, 1.7):
            k.box(T, "green", (x - 0.025, -2.05, ROOF_Z - 0.10), (x + 0.025, 2.05, ROOF_Z), u=1, bevel=0.003, M=M)
        for y in (-1.46, 1.46):
            k.box(T, "green", (-1.75, y - 0.03, ROOF_Z - 0.20), (1.85, y + 0.03, ROOF_Z - 0.10), u=0, bevel=0.003, M=M)
        rng = random.Random(7)
        width = 0.72
        y = -2.10
        i = 0
        while y < 2.10 - 1e-6:
            lift = 0.006 if i % 2 else 0.0
            k.box(T, "roof", (-1.82, y, ROOF_Z + lift), (1.92, min(y + width + 0.03, 2.10), ROOF_Z + lift + 0.012), u=0, M=M, uoff=rng.random())
            y += width
            i += 1
    else:
        k.box(T, "roof", (-1.82, -2.10, ROOF_Z - 0.02), (1.92, 2.10, ROOF_Z + 0.012), u=0, M=M)
    for sy in (-1, 1):
        y0, y1 = sorted((sy * 2.10, sy * 2.075))
        k.box(T, "green", (-1.82, y0, ROOF_Z - 0.14), (1.92, y1, ROOF_Z + 0.005), u=0, bevel=0.003, M=M)
    k.box(T, "green", (1.895, -2.10, ROOF_Z - 0.14), (1.92, 2.10, ROOF_Z + 0.005), u=1, bevel=0.003, M=M)
    if lod < 2:
        g0 = M @ Vector((-1.90, -2.12, ROOF_Z - 0.07))
        g1 = M @ Vector((-1.90, 2.12, ROOF_Z - 0.07))
        k.cyl(T, "galv", g0, g1, 0.065, segs=10)
        down = Vector((-1.30, -1.62, 0))
        k.pipe(T, "galv", [g0 + Vector((0, 0.25, -0.05)), Vector((down.x, down.y, g0.z - 0.25)), Vector((down.x, down.y, 0.12)), Vector((down.x - 0.22, down.y, 0.04))], 0.035, segs=8)

    # --- outside fittings
    if lod < 2:
        # shelf under the road-side window, with the logbook on it
        k.box(T, "wood", (1.19, -0.70, 1.085), (1.47, 0.70, 1.115), u=1, bevel=0.004)
        for y in (-0.55, 0.55):
            k.box(T, "green", (1.19, y - 0.015, 0.90), (1.22, y + 0.015, 1.085), u=2)
            k.box(T, "green", (1.19, y - 0.015, 1.055), (1.44, y + 0.015, 1.085), u=0)
    # signs
    k.plate(S, k.signs.rects["wordmark"], (1.19, -0.76, 0.52), (1.196, 0.76, 0.90), "+x")
    k.plate(S, k.signs.rects["rules"], (0.58, -1.496, 1.22), (1.14, -1.49, 1.22 + 0.56 * 512 / 384), "-y")
    if lod < 2:
        k.plate(S, k.signs.rects["ppe"], (-1.08, 1.49, 1.30), (-0.70, 1.496, 1.68), "+y")
        k.plate(S, k.signs.rects["no-smoking"], (-0.66, 1.49, 1.30), (-0.28, 1.496, 1.68), "+y")
        k.plate(S, k.signs.rects["cctv"], (-1.08, -1.496, 1.55), (-0.72, -1.49, 1.91), "-y")
    if lod == 0:
        k.box(T, "black", (1.25, -0.20, 1.115), (1.43, 0.06, 1.135), bevel=0.003)
        k.plate(S, k.signs.rects["logbook"], (1.25, -0.20, 1.13), (1.43, 0.06, 1.136), "+z")
        # red flexible conduit along the road-side header to a switch box, and a drop to the lamp pole side
        z = WALL_TOP + 0.10
        k.pipe(T, "red", [(1.215, 1.42, z), (1.215, -1.42, z + 0.01), (1.215, -1.42, 1.55)], 0.011, segs=6)
        k.pipe(T, "red", [(1.215, 1.42, z), (1.0, 1.515, z), (-1.0, 1.515, z + 0.02)], 0.011, segs=6)
        k.box(T, "galv", (1.195, -1.47, 1.42), (1.235, -1.37, 1.55), bevel=0.004)
        # fire extinguisher on a hook beside the door
        k.cyl(T, "red", (-0.48, 1.56, 0.62), (-0.48, 1.56, 1.02), 0.065, segs=12)
        k.cyl(T, "black", (-0.48, 1.56, 1.02), (-0.48, 1.56, 1.10), 0.022, segs=8)
        k.box(T, "black", (-0.50, 1.52, 1.08), (-0.40, 1.60, 1.11), bevel=0.003)
        # a plank bench against the back of the door-side wall
        k.box(T, "wood", (-1.12, 1.90, 0.42), (-0.28, 2.22, 0.46), u=0, bevel=0.005)
        for x in (-1.02, -0.38):
            k.box(T, "concrete", (x - 0.09, 1.92, -0.02), (x + 0.09, 2.20, 0.42), u=2, bevel=0.008, skip="-z")

    if lod < 2:
        # window air-conditioner through the back wall, on two angle brackets
        k.box(T, "galv", (-1.52, 0.25, 1.52), (-1.10, 0.85, 1.92), u=1, bevel=0.01)
        k.box(T, "dark", (-1.526, 0.29, 1.56), (-1.52, 0.81, 1.88), skip="+x")
    if lod == 0:
        for y in (0.30, 0.80):
            k.box(T, "green", (-1.50, y - 0.012, 1.495), (-1.19, y + 0.012, 1.52), u=0)
            k.box(T, "green", (-1.215, y - 0.012, 1.25), (-1.19, y + 0.012, 1.50), u=2)

    # --- inside
    if lod < 2:
        k.box(T, "wood", (0.52, -1.32, 1.035), (1.14, 1.32, 1.065), u=1, bevel=0.004)  # desk under the window
        for y in (-1.28, 1.25):
            k.box(T, "green", (0.54, y, FLOOR), (0.57, y + 0.03, 1.035), u=2)
        # fluorescent batten on the rafters
        k.box(T, "galv", (0.05, -0.62, 2.455), (0.11, 0.62, 2.49), u=1)
        k.cyl("EMIT_tube", "chrome", (0.08, -0.60, 2.44), (0.08, 0.60, 2.44), 0.014, segs=8)
    if lod == 0:
        k.plate(S, k.signs.rects["clock"], (-1.14, -0.95, 1.95), (-1.134, -0.67, 2.23), "+x")
        k.plate(S, k.signs.rects["notice"], (-1.14, -0.55, 1.45), (-1.134, -0.13, 1.73), "+x")
        # (the radio on its charger, the logbook and the rest of the desk are the dressing kit's: P02f)
        # wall fan on the back wall
        k.box(T, "black", (-1.14, 0.95, 2.02), (-1.08, 1.05, 2.12))
        k.cyl(T, "black", (-1.08, 1.0, 2.07), (-0.92, 1.0, 2.05), 0.05, segs=10)
        k.cyl(T, "galv", (-0.92, 1.0, 2.05), (-0.86, 1.0, 2.045), 0.19, segs=16)
        # monobloc chair
        C = rot_z(math.radians(25), about=(0.1, 0.2, 0))
        k.box(T, "green", (-0.12, 0.0, 0.60), (0.32, 0.42, 0.63), bevel=0.01, M=C)
        k.box(T, "green", (-0.14, 0.0, 0.63), (-0.10, 0.42, 1.02), bevel=0.01, M=C)
        for cx in (-0.10, 0.28):
            for cy in (0.03, 0.37):
                k.box(T, "green", (cx, cy, FLOOR), (cx + 0.03, cy + 0.03, 0.60), u=2, M=C)


def boom_post(k):
    px, py, pz = PIVOT
    k.box(T, "concrete", (px - 0.3, py - 0.3, -0.10), (px + 0.3, py + 0.3, 0.14), bevel=0.012, skip="-z")
    k.box(T, "yellow", (px - 0.09, py + 0.06, 0.14), (px + 0.09, py + 0.18, pz + 0.14), u=2, bevel=0.006)
    k.box(T, "yellow", (px - 0.09, py - 0.18, 0.14), (px + 0.09, py - 0.06, pz + 0.14), u=2, bevel=0.006)
    if k.lod < 2:
        k.cyl(T, "galv", (px, py - 0.20, pz), (px, py + 0.20, pz), 0.022, segs=8)  # pivot pin
        k.box(T, "galv", (px - 0.14, py - 0.20, 0.14), (px + 0.14, py + 0.20, 0.155), bevel=0.003)
    # rest post with a U cradle
    rx = px + ARM_REACH
    k.box(T, "concrete", (rx - 0.22, -0.22, -0.10), (rx + 0.22, 0.22, 0.12), bevel=0.012, skip="-z")
    k.box(T, "yellow", (rx - 0.05, -0.05, 0.12), (rx + 0.05, 0.05, pz - 0.06), u=2, bevel=0.005)
    if k.lod < 2:
        k.box(T, "galv", (rx - 0.05, -0.09, pz - 0.06), (rx + 0.05, 0.09, pz - 0.045))
        for y in (-0.09, 0.075):
            k.box(T, "galv", (rx - 0.05, y, pz - 0.045), (rx + 0.05, y + 0.015, pz + 0.09))


def humps(k):
    for y in (4.2, -4.2):
        if k.lod == 2:
            k.extrude(T, "hazard", [(y - 0.2, 0.0), (y + 0.2, 0.0), (y, 0.05)], 0, ROAD_NEAR - 0.1, ROAD_FAR + 0.1, skip_down=True)
        else:
            k.extrude(T, "hazard", [(y - 0.20, 0.0), (y + 0.20, 0.0), (y + 0.12, 0.04), (y + 0.04, 0.055), (y - 0.04, 0.055), (y - 0.12, 0.04)], 0, ROAD_NEAR - 0.1, ROAD_FAR + 0.1, skip_down=True)


def sign_post(k, x, y, rect, w, h, z_mid, height=2.5, face="+y"):
    k.cyl(T, "galv", (x, y, -0.10), (x, y, height), 0.03, segs=8)
    sign = 1 if face == "+y" else -1
    y0, y1 = sorted((y + sign * 0.032, y + sign * 0.040))
    k.box(T, "galv", (x - w / 2, y0, z_mid - h / 2), (x + w / 2, y1, z_mid + h / 2), bevel=0.002)
    front = y + sign * 0.042
    k.plate(S, k.signs.rects[rect], (x - w / 2, front, z_mid - h / 2), (x + w / 2, front, z_mid + h / 2), face)


def mirror(k, x, y):
    k.cyl(T, "galv", (x, y, -0.10), (x, y, 2.5), 0.03, segs=8)
    look = Vector((-0.75, -0.62, -0.22)).normalized()
    c = Vector((x, y, 2.28)) + look * 0.10
    if k.lod < 2:
        k.cyl(T, "black", c - look * 0.06, c, 0.36, segs=20, caps=True)
        k.box(T, "galv", (x - 0.02, y - 0.02, 2.24), (x + 0.02, y + 0.02, 2.32), M=None)
    k.disc(T, "chrome", c + look * 0.004, look, 0.33, segs=24, dome=0.07)


def lamp_pole(k, x, y):
    """A solar street light, as on the camp's poles: panel on top, battery box, LED head on an arm."""
    k.box(T, "concrete", (x - 0.22, y - 0.22, -0.10), (x + 0.22, y + 0.22, 0.10), bevel=0.012, skip="-z")
    k.cyl(T, "galv", (x, y, 0.10), (x, y, 5.6), 0.055, r1=0.04, segs=10)
    aim = Vector((0.84, -0.42, 0)).normalized()  # towards the barrier
    tip = Vector((x, y, 5.25)) + aim * 0.9 + Vector((0, 0, 0.12))
    k.cyl(T, "galv", (x, y, 5.20), tip, 0.025, segs=8)
    head_lo = tip + Vector((-0.20, -0.12, -0.07))
    head_hi = tip + Vector((0.20, 0.12, 0.0))
    k.box(T, "dark", head_lo, head_hi, bevel=0.008)
    k.box("EMIT_flood", "chrome", head_lo + Vector((0.03, 0.03, -0.004)), Vector((head_hi.x - 0.03, head_hi.y - 0.03, head_lo.z)), skip="+z")
    if k.lod < 2:
        k.box(T, "galv", (x - 0.14, y - 0.22, 4.55), (x + 0.14, y - 0.06, 4.95), bevel=0.006)  # battery box
        P = rot_axis(math.radians(18), "X", about=(x, y, 5.62))
        k.box(T, "dark", (x - 0.50, y - 0.30, 5.62), (x + 0.50, y + 0.30, 5.65), M=P, bevel=0.004)
        k.box(T, "galv", (x - 0.03, y - 0.03, 5.52), (x + 0.03, y + 0.03, 5.63))


def sandbags(k, cx, cy, rng):
    """Two courses of filled jute bags round a post base, each one a pillow slumped where it lies (P02f)."""
    course = [(-0.36, -0.42, 0), (0.12, -0.44, 6), (-0.44, 0.40, -8), (0.10, 0.44, 4), (0.46, 0.0, 92)]
    for layer, (dz, shift) in enumerate(((0.0, 0.0), (0.1, 0.2))):
        for i, (ox, oy, turn) in enumerate(course[: 5 - layer * 2]):
            k.pillow(T, "burlap", (cx + ox + shift * 0.3, cy + oy, dz), (0.5, 0.3, 0.13), turn=math.radians(turn + rng.uniform(-10, 10)), seed=layer * 10 + i, div=(4, 3, 2), sag=0.4)


def build_guardhouse():
    coll = model_kit.reset_asset("struct.guardhouse", "hero-structure", CREDITS_TRIM, origin="free")
    sheet = Sheet("gate", "trim-gate")
    signs = Signs("gate", "signs-gate")
    made = {}
    for lod in (0, 1, 2):
        k = Kit(sheet, lod)
        k.signs = signs
        booth(k)
        boom_post(k)
        humps(k)
        sign_post(k, 2.35, -6.8, "stop-check", 0.9, 0.675, 1.95, face="-y")
        sign_post(k, ROAD_FAR + 0.45, -7.6, "speed-10", 0.6, 0.6, 2.0, face="-y")
        # (P02f) visitors are sent to the booth; hard hats on past the barrier
        sign_post(k, 1.75, -4.7, "report-here", 0.6, 0.4, 1.75, height=2.0, face="-y")
        sign_post(k, ROAD_FAR + 0.7, -1.0, "hardhat-entry", 0.6, 0.4, 1.75, height=2.0, face="-y")
        mirror(k, ROAD_FAR + 0.55, 2.4)
        lamp_pole(k, 1.95, 2.75)
        if lod < 2:
            sandbags(k, PIVOT[0], PIVOT[1], random.Random(3))
        made[lod] = k.triangles()
        k.finish(f"guardhouse_LOD{lod}", coll)
    model_kit.hide_lower_lods(coll)
    return made


def build_boom_arm():
    coll = model_kit.reset_asset("kit.boom-arm", "kit-piece", CREDITS_SMALL, lod_distances=(40, 140), origin="pivot")
    sheet = Sheet("gate", "trim-small")
    M = "trim-small"
    made = {}
    for lod in (0, 1, 2):
        k = Kit(sheet, lod)
        k.box(M, "stripes", (0.0, -0.03, -0.04), (ARM_REACH + 0.12, 0.03, 0.04), u=0, bevel=0.004)
        k.box(M, "yellow", (-0.95, -0.03, -0.04), (0.0, 0.03, 0.04), u=0, bevel=0.004)
        if lod < 2:
            k.box(M, "concrete", (-0.98, -0.12, -0.20), (-0.62, 0.12, 0.06), bevel=0.012)  # counterweight
            k.box(M, "galv", (-0.08, -0.05, -0.06), (0.08, 0.05, 0.06), bevel=0.004)  # pivot sleeve
        if lod == 0:
            k.box(M, "black", (ARM_REACH + 0.12, -0.032, -0.042), (ARM_REACH + 0.14, 0.032, 0.042))
            k.cyl(M, "black", (-0.90, 0, -0.20), (-0.90, 0.0, -0.75), 0.008, segs=5)  # pull rope
        made[lod] = k.triangles()
        k.finish(f"boom-arm_LOD{lod}", coll)
    model_kit.hide_lower_lods(coll)
    return made


def build_cone():
    coll = model_kit.reset_asset("prop.traffic-cone", "small-prop", ["twin.authored"], lod_distances=(12, 45))
    sheet = Sheet("gate", "trim-small")
    M = "trim-small"
    made = {}
    for lod in (0, 1, 2):
        k = Kit(sheet, lod)
        k.box(M, "black", (-0.18, -0.18, 0.0), (0.18, 0.18, 0.03), bevel=0.008, skip="-z")
        k.cyl(M, "cone", (0, 0, 0.03), (0, 0, 0.72), 0.135, r1=0.028, segs=18, around=True)
        made[lod] = k.triangles()
        k.finish(f"traffic-cone_LOD{lod}", coll)
    model_kit.hide_lower_lods(coll)
    return made


materials()
print("guardhouse", build_guardhouse())
print("boom-arm", build_boom_arm())
print("cone", build_cone())
