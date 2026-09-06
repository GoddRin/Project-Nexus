import bpy
import math
import os

print("=== GENERATING REALISTIC ARCHITECTURAL BUILDINGS VIA BLENDER 5.2 ===")

out_dir = os.path.abspath("public/models/architecture")
os.makedirs(out_dir, exist_ok=True)

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_pbr_material(name, base_color, metallic=0.0, roughness=0.5, specular=0.5, transmission=0.0):
    mat = bpy.data.materials.new(name=name)
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if "Transmission Weight" in bsdf.inputs:
            bsdf.inputs["Transmission Weight"].default_value = transmission
        elif "Transmission" in bsdf.inputs:
            bsdf.inputs["Transmission"].default_value = transmission
    return mat

def export_glb(filename):
    filepath = os.path.join(out_dir, filename)
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=False
    )
    print(f"[SUCCESS] Exported {filename}: {os.path.getsize(filepath):,} bytes")

# ─────────────────────────────────────────────────────────────────────────────
# 1. 2-STORY MODULAR WORKER BARRACKS DORMITORY BLOCK
# ─────────────────────────────────────────────────────────────────────────────
def generate_barracks_dormitory_block():
    clear_scene()

    # Materials
    mat_concrete = create_pbr_material("ConcretePlinth", (0.55, 0.58, 0.60), metallic=0.05, roughness=0.85)
    mat_panel_wall = create_pbr_material("SandwichPanelWall", (0.86, 0.88, 0.90), metallic=0.15, roughness=0.45)
    mat_panel_accent = create_pbr_material("TealAccentTrim", (0.08, 0.42, 0.45), metallic=0.25, roughness=0.40)
    mat_steel_dark = create_pbr_material("StructuralSteelDark", (0.18, 0.20, 0.22), metallic=0.85, roughness=0.35)
    mat_deck_grate = create_pbr_material("CatwalkSteelPlate", (0.28, 0.30, 0.32), metallic=0.80, roughness=0.45)
    mat_window_frame = create_pbr_material("WhiteAluminumFrame", (0.92, 0.93, 0.95), metallic=0.70, roughness=0.25)
    mat_tinted_glass = create_pbr_material("TintedGlass", (0.10, 0.22, 0.30), metallic=0.10, roughness=0.10, transmission=0.75)
    mat_door_steel = create_pbr_material("HeavySteelDoor", (0.15, 0.28, 0.38), metallic=0.75, roughness=0.38)
    mat_ac_condenser = create_pbr_material("AcCondenserWhite", (0.88, 0.90, 0.92), metallic=0.15, roughness=0.35)
    mat_ac_grille = create_pbr_material("AcFanGrilleDark", (0.12, 0.12, 0.14), metallic=0.60, roughness=0.50)

    length = 20.0  # along Y
    width = 4.8    # along X
    h_floor = 2.9  # per floor

    # 1. Heavy Concrete Foundation Plinth
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.12))
    plinth = bpy.context.active_object
    plinth.scale = (width + 0.3, length + 0.3, 0.24)
    plinth.data.materials.append(mat_concrete)
    bpy.ops.object.transform_apply(scale=True)

    # 2. Ground Floor Siding Walls
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.24 + h_floor / 2))
    g_wall = bpy.context.active_object
    g_wall.scale = (width, length, h_floor)
    g_wall.data.materials.append(mat_panel_wall)
    bpy.ops.object.transform_apply(scale=True)

    # Horizontal Wall Seam Reveals (giving realistic panelized look)
    for zh in [1.2, 2.2, 4.1, 5.1]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, zh))
        seam = bpy.context.active_object
        seam.scale = (width + 0.04, length + 0.04, 0.025)
        seam.data.materials.append(mat_panel_accent)
        bpy.ops.object.transform_apply(scale=True)

    # 3. Inter-floor Concrete/Steel Divider Joist
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.24 + h_floor))
    mid_floor = bpy.context.active_object
    mid_floor.scale = (width + 0.2, length + 0.2, 0.16)
    mid_floor.data.materials.append(mat_concrete)
    bpy.ops.object.transform_apply(scale=True)

    # 4. Second Floor Siding Walls
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.24 + h_floor + 0.08 + h_floor / 2))
    f2_wall = bpy.context.active_object
    f2_wall.scale = (width, length, h_floor)
    f2_wall.data.materials.append(mat_panel_wall)
    bpy.ops.object.transform_apply(scale=True)

    # 5. Aluminum Sliding Windows (4 pairs per floor on front +X and rear -X)
    window_ys = [-7.0, -2.5, 2.5, 7.0]
    for floor_idx, f_z in enumerate([1.55, 4.45]):
        for wy in window_ys:
            # Front Windows (+X)
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(width / 2 + 0.02, wy, f_z))
            w_frame = bpy.context.active_object
            w_frame.scale = (0.06, 1.4, 1.1)
            w_frame.data.materials.append(mat_window_frame)
            bpy.ops.object.transform_apply(scale=True)

            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(width / 2 + 0.03, wy, f_z))
            w_glass = bpy.context.active_object
            w_glass.scale = (0.02, 1.25, 0.95)
            w_glass.data.materials.append(mat_tinted_glass)
            bpy.ops.object.transform_apply(scale=True)

            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(width / 2 + 0.06, wy, f_z - 0.58))
            w_sill = bpy.context.active_object
            w_sill.scale = (0.12, 1.5, 0.06)
            w_sill.data.materials.append(mat_window_frame)
            bpy.ops.object.transform_apply(scale=True)

            # Rear Windows (-X)
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-width / 2 - 0.02, wy, f_z))
            rw_frame = bpy.context.active_object
            rw_frame.scale = (0.06, 1.4, 1.1)
            rw_frame.data.materials.append(mat_window_frame)
            bpy.ops.object.transform_apply(scale=True)

            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-width / 2 - 0.03, wy, f_z))
            rw_glass = bpy.context.active_object
            rw_glass.scale = (0.02, 1.25, 0.95)
            rw_glass.data.materials.append(mat_tinted_glass)
            bpy.ops.object.transform_apply(scale=True)

    # 6. Steel Panel Doors with Trim & Bulkhead Lights
    door_ys = [-4.8, 4.8]
    for floor_idx, f_z in enumerate([1.1, 4.0]):
        for dy in door_ys:
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(width / 2 + 0.02, dy, f_z))
            door = bpy.context.active_object
            door.scale = (0.06, 0.92, 2.05)
            door.data.materials.append(mat_door_steel)
            bpy.ops.object.transform_apply(scale=True)

            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(width / 2 + 0.03, dy, f_z))
            d_frame = bpy.context.active_object
            d_frame.scale = (0.08, 1.02, 2.15)
            d_frame.data.materials.append(mat_steel_dark)
            bpy.ops.object.transform_apply(scale=True)

            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(width / 2 + 0.12, dy, f_z + 1.25))
            light = bpy.context.active_object
            light.scale = (0.14, 0.22, 0.12)
            light.data.materials.append(mat_window_frame)
            bpy.ops.object.transform_apply(scale=True)

    # 7. Second-Floor Exterior Access Catwalk Balcony (+X Side)
    catwalk_width = 1.15
    catwalk_x = width / 2 + catwalk_width / 2
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(catwalk_x, 0, 3.16))
    deck = bpy.context.active_object
    deck.scale = (catwalk_width, length, 0.08)
    deck.data.materials.append(mat_deck_grate)
    bpy.ops.object.transform_apply(scale=True)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(catwalk_x, 0, 0.22))
    g_deck = bpy.context.active_object
    g_deck.scale = (catwalk_width, length, 0.08)
    g_deck.data.materials.append(mat_concrete)
    bpy.ops.object.transform_apply(scale=True)

    stanchion_ys = [-9.5, -5.5, -1.5, 1.5, 5.5, 9.5]
    rail_x = width / 2 + catwalk_width
    for sy in stanchion_ys:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(rail_x, sy, 3.0))
        col = bpy.context.active_object
        col.scale = (0.10, 0.10, 6.0)
        col.data.materials.append(mat_steel_dark)
        bpy.ops.object.transform_apply(scale=True)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.025, depth=length, location=(rail_x, 0, 4.25), rotation=(math.radians(90), 0, 0))
    top_rail = bpy.context.active_object
    top_rail.data.materials.append(mat_steel_dark)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.020, depth=length, location=(rail_x, 0, 3.75), rotation=(math.radians(90), 0, 0))
    mid_rail = bpy.context.active_object
    mid_rail.data.materials.append(mat_steel_dark)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(rail_x - 0.02, 0, 3.25))
    kick = bpy.context.active_object
    kick.scale = (0.02, length, 0.12)
    kick.data.materials.append(mat_steel_dark)
    bpy.ops.object.transform_apply(scale=True)

    # (AC condenser units removed: workers barracks use electric stand fans inside rooms)
    export_glb("barracks_dormitory_block.glb")

# ─────────────────────────────────────────────────────────────────────────────
# 2. FULL 3D CORRUGATED GABLE ROOF WITH GUTTERS & DOWNPIPES
# ─────────────────────────────────────────────────────────────────────────────
def generate_barracks_corrugated_gable_roof():
    clear_scene()

    mat_roof_blue = create_pbr_material("CGI_RoofBlue", (0.14, 0.28, 0.46), metallic=0.88, roughness=0.24)
    mat_ridge = create_pbr_material("RidgeCapTrim", (0.10, 0.22, 0.38), metallic=0.90, roughness=0.20)
    mat_gutter = create_pbr_material("GalvanizedGutter", (0.65, 0.68, 0.72), metallic=0.85, roughness=0.30)
    mat_fascia = create_pbr_material("FasciaBoardTeal", (0.08, 0.38, 0.42), metallic=0.25, roughness=0.45)

    span = 5.6
    length = 21.6
    pitch = 0.65
    half_span = span / 2

    num_waves = 14
    for side, side_dir in [(-1, -1), (1, 1)]:
        mesh = bpy.data.meshes.new(f"CorrugatedPitch_{side}")
        obj = bpy.data.objects.new(f"PitchMesh_{side}", mesh)
        bpy.context.collection.objects.link(obj)

        verts = []
        faces = []
        steps = num_waves * 4
        dx = half_span / steps
        wave_freq = (num_waves * 2 * math.pi) / half_span

        for j in range(2):
            y = (j * length) - (length / 2)
            for i in range(steps + 1):
                if side_dir < 0:
                    x = -half_span + (i * dx)
                else:
                    x = i * dx
                slope_z = pitch * (1.0 - abs(x) / half_span)
                flute_z = math.sin(abs(x) * wave_freq) * 0.030
                verts.append((x, y, slope_z + flute_z))

        for i in range(steps):
            v0 = i
            v1 = i + 1
            v2 = steps + 1 + i + 1
            v3 = steps + 1 + i
            faces.append((v0, v1, v2, v3))

        mesh.from_pydata(verts, [], faces)
        mesh.update()
        obj.data.materials.append(mat_roof_blue)

    # Apex Ridge Cap Flashing Roll
    bpy.ops.mesh.primitive_cylinder_add(radius=0.10, depth=length + 0.1, location=(0, 0, pitch + 0.02), rotation=(math.radians(90), 0, 0))
    ridge = bpy.context.active_object
    ridge.data.materials.append(mat_ridge)

    # Fascia Boards on Rakes
    for gy in [-length / 2, length / 2]:
        for sx in [-half_span / 2, half_span / 2]:
            angle = math.atan2(pitch, half_span) * (-1 if sx < 0 else 1)
            hypot = math.sqrt(half_span**2 + pitch**2)
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sx, gy, pitch / 2))
            fascia = bpy.context.active_object
            fascia.scale = (hypot, 0.04, 0.14)
            fascia.rotation_euler = (0, angle, 0)
            fascia.data.materials.append(mat_fascia)
            bpy.ops.object.transform_apply(scale=True, rotation=True)

    # Eaves Gutters (Left & Right)
    for gx in [-half_span, half_span]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(gx, 0, -0.04))
        gutter = bpy.context.active_object
        gutter.scale = (0.16, length, 0.12)
        gutter.data.materials.append(mat_gutter)
        bpy.ops.object.transform_apply(scale=True)

        for dy in [-length / 2 + 0.5, length / 2 - 0.5]:
            bpy.ops.mesh.primitive_cylinder_add(radius=0.045, depth=5.8, location=(gx, dy, -2.9))
            downspout = bpy.context.active_object
            downspout.data.materials.append(mat_gutter)

    export_glb("barracks_corrugated_gable_roof.glb")

# ─────────────────────────────────────────────────────────────────────────────
# 3. FOREMAN & SENIOR STAFF HOUSE (PREFABRICATED RESIDENTIAL COMPOUND)
# ─────────────────────────────────────────────────────────────────────────────
def generate_foreman_staff_house():
    clear_scene()

    mat_plinth = create_pbr_material("ConcreteFoundation", (0.52, 0.54, 0.56), metallic=0.05, roughness=0.88)
    mat_siding = create_pbr_material("CompositeHorizontalSiding", (0.90, 0.88, 0.84), metallic=0.10, roughness=0.45)
    mat_trim = create_pbr_material("CrispWhiteTrim", (0.95, 0.95, 0.97), metallic=0.30, roughness=0.25)
    mat_porch_wood = create_pbr_material("TeakVerandaDeck", (0.48, 0.32, 0.18), metallic=0.05, roughness=0.55)
    mat_roof_green = create_pbr_material("StaffHouseRoofGreen", (0.15, 0.36, 0.22), metallic=0.85, roughness=0.25)
    mat_glass = create_pbr_material("ReflectiveGlass", (0.15, 0.25, 0.35), metallic=0.10, roughness=0.08, transmission=0.80)
    mat_ac = create_pbr_material("InverterAcUnit", (0.90, 0.92, 0.94), metallic=0.20, roughness=0.30)
    mat_door = create_pbr_material("MahoganyDoor", (0.35, 0.18, 0.10), metallic=0.10, roughness=0.40)

    house_w = 18.2
    house_l = 10.4
    wall_h = 3.2
    base_z = 0.30

    # 1. Foundation Slab Plinth (18.8m x 11.0m x 0.3m)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, base_z / 2))
    f_slab = bpy.context.active_object
    f_slab.scale = (house_w + 0.6, house_l + 0.6, base_z)
    f_slab.data.materials.append(mat_plinth)
    bpy.ops.object.transform_apply(scale=True)

    # 2. Main Building Exterior Envelope
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, base_z + wall_h / 2))
    walls = bpy.context.active_object
    walls.scale = (house_w, house_l, wall_h)
    walls.data.materials.append(mat_siding)
    bpy.ops.object.transform_apply(scale=True)

    # Horizontal Weatherboard Siding Grooves
    for sh in [0.6, 1.1, 1.6, 2.1, 2.6, 3.1]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, base_z + sh))
        plank_line = bpy.context.active_object
        plank_line.scale = (house_w + 0.04, house_l + 0.04, 0.03)
        plank_line.data.materials.append(mat_trim)
        bpy.ops.object.transform_apply(scale=True)

    # 3. Front Covered Veranda / Porch Deck
    porch_depth = 1.8
    porch_y = house_l / 2 + porch_depth / 2
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, porch_y, base_z - 0.05))
    deck = bpy.context.active_object
    deck.scale = (house_w, porch_depth, 0.10)
    deck.data.materials.append(mat_porch_wood)
    bpy.ops.object.transform_apply(scale=True)

    # Porch Timber Posts
    for px in [-house_w / 2 + 0.3, -house_w / 6, house_w / 6, house_w / 2 - 0.3]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(px, house_l / 2 + porch_depth - 0.1, base_z + wall_h / 2))
        post = bpy.context.active_object
        post.scale = (0.15, 0.15, wall_h)
        post.data.materials.append(mat_trim)
        bpy.ops.object.transform_apply(scale=True)

    # Porch Handrail
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, house_l / 2 + porch_depth - 0.1, base_z + 0.95))
    rail = bpy.context.active_object
    rail.scale = (house_w, 0.08, 0.06)
    rail.data.materials.append(mat_trim)
    bpy.ops.object.transform_apply(scale=True)

    # 4. Realistic Architectural Gable Roof (Zero Distorted Cones)
    # Eaves extend 0.5m on all 4 sides: Width = house_w + 1.0 (19.2m), Length = house_l + porch_depth + 1.0 (13.2m)
    roof_w = house_w + 1.0
    total_l = house_l + porch_depth + 1.0
    half_w = roof_w / 2
    half_l = total_l / 2
    roof_y_center = porch_depth / 2
    eave_z = base_z + wall_h
    ridge_h = 1.6
    ridge_z = eave_z + ridge_h

    # Left Pitched Roof Slope (from X = -half_w to X = 0)
    pitch_angle = math.atan2(ridge_h, half_w)
    slope_hypot = math.hypot(half_w, ridge_h)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-half_w / 2, roof_y_center, eave_z + ridge_h / 2))
    roof_left = bpy.context.active_object
    roof_left.scale = (slope_hypot, total_l, 0.08)
    roof_left.rotation_euler = (0, -pitch_angle, 0)
    roof_left.data.materials.append(mat_roof_green)
    bpy.ops.object.transform_apply(scale=True, rotation=True)

    # Right Pitched Roof Slope (from X = 0 to X = half_w)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(half_w / 2, roof_y_center, eave_z + ridge_h / 2))
    roof_right = bpy.context.active_object
    roof_right.scale = (slope_hypot, total_l, 0.08)
    roof_right.rotation_euler = (0, pitch_angle, 0)
    roof_right.data.materials.append(mat_roof_green)
    bpy.ops.object.transform_apply(scale=True, rotation=True)

    # Ridge Cap Flashing along Apex
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, roof_y_center, ridge_z + 0.04))
    ridge_cap = bpy.context.active_object
    ridge_cap.scale = (0.35, total_l + 0.05, 0.06)
    ridge_cap.data.materials.append(mat_trim)
    bpy.ops.object.transform_apply(scale=True)

    # Triangular Gable End Wall Enclosures (Attic Pediments)
    for gy, gdir in [(-house_l / 2 - 0.02, 1), (house_l / 2 + 0.02, -1)]:
        mesh = bpy.data.meshes.new(f"GablePediment_{gdir}")
        obj = bpy.data.objects.new(f"GableWall_{gdir}", mesh)
        bpy.context.collection.objects.link(obj)
        verts = [
            (-house_w / 2, gy, eave_z),
            (house_w / 2, gy, eave_z),
            (0, gy, ridge_z),
        ]
        faces = [(0, 1, 2) if gdir > 0 else (2, 1, 0)]
        mesh.from_pydata(verts, [], faces)
        mesh.update()
        obj.data.materials.append(mat_siding)

    # 5. Entrance Doors & UPVC Framed Picture Windows
    # Main Entrance Door
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, house_l / 2 + 0.02, base_z + 1.1))
    door = bpy.context.active_object
    door.scale = (1.2, 0.10, 2.2)
    door.data.materials.append(mat_door)
    bpy.ops.object.transform_apply(scale=True)

    # Windows on Front and Side Facades
    window_coords = [
        # Front windows flanking entrance
        (-4.5, house_l / 2 + 0.02, base_z + 1.5, 2.0, 1.2, 0),
        (4.5, house_l / 2 + 0.02, base_z + 1.5, 2.0, 1.2, 0),
        (-7.2, house_l / 2 + 0.02, base_z + 1.5, 1.6, 1.2, 0),
        (7.2, house_l / 2 + 0.02, base_z + 1.5, 1.6, 1.2, 0),
        # Side windows
        (-house_w / 2 - 0.02, 0, base_z + 1.5, 1.8, 1.2, math.radians(90)),
        (house_w / 2 + 0.02, 0, base_z + 1.5, 1.8, 1.2, math.radians(90)),
        (-house_w / 2 - 0.02, -3.0, base_z + 1.5, 1.8, 1.2, math.radians(90)),
        (house_w / 2 + 0.02, -3.0, base_z + 1.5, 1.8, 1.2, math.radians(90)),
    ]
    for wx, wy, wz, ww, wh, wrot in window_coords:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(wx, wy, wz))
        w = bpy.context.active_object
        w.scale = (ww, 0.08, wh)
        w.rotation_euler = (0, 0, wrot)
        w.data.materials.append(mat_trim)
        bpy.ops.object.transform_apply(scale=True, rotation=True)

        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(wx, wy, wz))
        wg = bpy.context.active_object
        wg.scale = (ww - 0.15, 0.03, wh - 0.15)
        wg.rotation_euler = (0, 0, wrot)
        wg.data.materials.append(mat_glass)
        bpy.ops.object.transform_apply(scale=True, rotation=True)

    # 6. Split AC Condenser Unit on Rear Wall (Foreman quarters)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -house_l / 2 - 0.35, base_z + 1.4))
    ac = bpy.context.active_object
    ac.scale = (0.9, 0.4, 0.65)
    ac.data.materials.append(mat_ac)
    bpy.ops.object.transform_apply(scale=True)

    export_glb("foreman_staff_house.glb")

# ─────────────────────────────────────────────────────────────────────────────
# 4. CANTEEN DINING PAVILION INDUSTRIAL TRUSS STRUCTURE & PERIMETER MESH
# ─────────────────────────────────────────────────────────────────────────────
def generate_canteen_pavilion_structure():
    clear_scene()

    mat_frame = create_pbr_material("IndustrialForestGreen", (0.10, 0.35, 0.22), metallic=0.75, roughness=0.38)
    mat_truss = create_pbr_material("SteelTrussDark", (0.16, 0.22, 0.24), metallic=0.88, roughness=0.30)
    mat_curb = create_pbr_material("PaintedConcreteCurb", (0.12, 0.38, 0.24), metallic=0.10, roughness=0.75)
    mat_wire_mesh = create_pbr_material("CycloneGalvWire", (0.65, 0.68, 0.70), metallic=0.90, roughness=0.25)
    mat_purlin = create_pbr_material("GalvSteelPurlin", (0.45, 0.48, 0.52), metallic=0.85, roughness=0.32)

    width = 7.8
    length = 16.5
    h_col = 3.6

    # 1. Perimeter Masonry Curb (0.36m high)
    for side, cx, sx, sy in [
        ("left", -width / 2, 0.2, length),
        ("right", width / 2, 0.2, length),
        ("back", 0, width, 0.2),
    ]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(cx, 0 if sy == length else length / 2, 0.18))
        curb = bpy.context.active_object
        curb.scale = (sx, sy, 0.36)
        curb.data.materials.append(mat_curb)
        bpy.ops.object.transform_apply(scale=True)

    # 2. Structural Steel Columns (5 perimeter pairs)
    col_ys = [-length / 2 + 0.2, -length / 4, 0, length / 4, length / 2 - 0.2]
    for cy in col_ys:
        for cx in [-width / 2, width / 2]:
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(cx, cy, h_col / 2))
            col = bpy.context.active_object
            col.scale = (0.14, 0.14, h_col)
            col.data.materials.append(mat_frame)
            bpy.ops.object.transform_apply(scale=True)

            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(cx, cy, 0.04))
            bp = bpy.context.active_object
            bp.scale = (0.30, 0.30, 0.08)
            bp.data.materials.append(mat_truss)
            bpy.ops.object.transform_apply(scale=True)

    # 3. Open-Web Steel Roof Trusses (Pratt Truss)
    for ty in col_ys:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, ty, h_col))
        bc = bpy.context.active_object
        bc.scale = (width, 0.10, 0.10)
        bc.data.materials.append(mat_truss)
        bpy.ops.object.transform_apply(scale=True)

        for side in [-1, 1]:
            angle = math.atan2(0.85, width / 2) * side
            hyp = math.sqrt((width / 2)**2 + 0.85**2)
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side * width / 4, ty, h_col + 0.425))
            tc = bpy.context.active_object
            tc.scale = (hyp, 0.10, 0.10)
            tc.rotation_euler = (0, -angle, 0)
            tc.data.materials.append(mat_truss)
            bpy.ops.object.transform_apply(scale=True, rotation=True)

        for wx in [-2.4, -1.2, 0, 1.2, 2.4]:
            h_strut = 0.85 * (1.0 - abs(wx) / (width / 2))
            if h_strut > 0.15:
                bpy.ops.mesh.primitive_cube_add(size=1.0, location=(wx, ty, h_col + h_strut / 2))
                strut = bpy.context.active_object
                strut.scale = (0.06, 0.06, h_strut)
                strut.data.materials.append(mat_truss)
                bpy.ops.object.transform_apply(scale=True)

    # 4. Longitudinal C-Channel Purlins
    for px in [-3.2, -1.6, 0, 1.6, 3.2]:
        pz = h_col + 0.85 * (1.0 - abs(px) / (width / 2)) + 0.08
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(px, 0, pz))
        purlin = bpy.context.active_object
        purlin.scale = (0.08, length + 0.4, 0.10)
        purlin.data.materials.append(mat_purlin)
        bpy.ops.object.transform_apply(scale=True)

    # 5. Top Rail for Cyclone Screen Netting
    for cx in [-width / 2, width / 2]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=length, location=(cx, 0, 3.5), rotation=(math.radians(90), 0, 0))
        top_wire = bpy.context.active_object
        top_wire.data.materials.append(mat_wire_mesh)

    export_glb("canteen_pavilion_structure.glb")

# Run all generators
generate_barracks_dormitory_block()
generate_barracks_corrugated_gable_roof()
generate_foreman_staff_house()
generate_canteen_pavilion_structure()
print("=== ARCHITECTURAL ASSETS GENERATED SUCCESSFULLY ===")
