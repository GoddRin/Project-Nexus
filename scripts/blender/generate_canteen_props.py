import bpy
import math
import os

print("=== GENERATING REALISTIC CANTEEN & BARRACKS PROPS VIA BLENDER ===")

out_dir = os.path.abspath("public/models/props")
os.makedirs(out_dir, exist_ok=True)

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_pbr_material(name, base_color, metallic=0.0, roughness=0.5, transmission=0.0, ior=1.45):
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
        if "IOR" in bsdf.inputs:
            bsdf.inputs["IOR"].default_value = ior
    return mat

def export_glb(filename):
    filepath = os.path.join(out_dir, filename)
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=False
    )
    print(f"Exported {filename}: {os.path.getsize(filepath)} bytes")

def generate_canteen_warming_station():
    clear_scene()
    mat_stainless = create_pbr_material("StainlessSteel", (0.85, 0.88, 0.90), metallic=0.92, roughness=0.18)
    mat_glass = create_pbr_material("TemperedGlass", (0.95, 0.98, 1.0), metallic=0.05, roughness=0.08, transmission=0.92, ior=1.52)
    mat_food_curry = create_pbr_material("KareKareStew", (0.85, 0.52, 0.12), metallic=0.0, roughness=0.45)
    mat_food_adobo = create_pbr_material("AdoboGlaze", (0.28, 0.16, 0.08), metallic=0.0, roughness=0.35)
    mat_food_sinigang = create_pbr_material("SinigangBroth", (0.78, 0.65, 0.35), metallic=0.0, roughness=0.30)
    mat_food_rice = create_pbr_material("JasmineRice", (0.95, 0.95, 0.93), metallic=0.0, roughness=0.80)

    # Main Stainless Cabinet Body
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.42))
    cabinet = bpy.context.active_object
    cabinet.scale = (2.2, 0.85, 0.84)
    cabinet.data.materials.append(mat_stainless)
    bpy.ops.object.transform_apply(scale=True)

    # 4 Recessed Gastro Trays (Hotel Pans)
    tray_coords = [(-0.75, 0), (-0.25, 0), (0.25, 0), (0.75, 0)]
    food_mats = [mat_food_adobo, mat_food_curry, mat_food_sinigang, mat_food_rice]

    for i, (tx, ty) in enumerate(tray_coords):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(tx, ty, 0.85))
        tray = bpy.context.active_object
        tray.scale = (0.44, 0.65, 0.12)
        tray.data.materials.append(mat_stainless)
        bpy.ops.object.transform_apply(scale=True)
        
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(tx, ty, 0.88))
        food = bpy.context.active_object
        food.scale = (0.40, 0.60, 0.04)
        food.data.materials.append(food_mats[i])
        bpy.ops.object.transform_apply(scale=True)

    # Sneeze Guard Angled Glass Shield
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.32, 1.15))
    glass = bpy.context.active_object
    glass.scale = (2.15, 0.015, 0.48)
    glass.rotation_euler = (math.radians(-25), 0, 0)
    glass.data.materials.append(mat_glass)
    bpy.ops.object.transform_apply(scale=True, rotation=True)

    # Sneeze Guard Support Posts
    for px in [-1.05, 1.05]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.018, depth=0.55, location=(px, -0.38, 1.12))
        post = bpy.context.active_object
        post.data.materials.append(mat_stainless)

    export_glb("canteen_warming_station.glb")

def generate_water_dispenser():
    clear_scene()
    mat_dispenser_body = create_pbr_material("DispenserPlastic", (0.92, 0.94, 0.96), metallic=0.05, roughness=0.35)
    mat_stainless_dark = create_pbr_material("StainlessSteelDark", (0.35, 0.38, 0.40), metallic=0.88, roughness=0.28)
    mat_water_bottle = create_pbr_material("PolycarbonateJug", (0.15, 0.55, 0.95), metallic=0.02, roughness=0.12, transmission=0.85, ior=1.58)
    mat_hot_tap = create_pbr_material("TapHotRed", (0.85, 0.15, 0.15), metallic=0.1, roughness=0.3)
    mat_cold_tap = create_pbr_material("TapColdBlue", (0.15, 0.45, 0.95), metallic=0.1, roughness=0.3)

    # Dispenser Tower Cabinet
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.50))
    tower = bpy.context.active_object
    tower.scale = (0.36, 0.36, 1.0)
    tower.data.materials.append(mat_dispenser_body)
    bpy.ops.object.transform_apply(scale=True)

    # Dispenser Alcove
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.10, 0.72))
    alcove = bpy.context.active_object
    alcove.scale = (0.28, 0.18, 0.28)
    alcove.data.materials.append(mat_stainless_dark)
    bpy.ops.object.transform_apply(scale=True)

    # Hot & Cold Levers
    for tx, mat in [(-0.06, mat_hot_tap), (0.06, mat_cold_tap)]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.012, depth=0.05, location=(tx, 0.12, 0.82))
        tap = bpy.context.active_object
        tap.data.materials.append(mat)

    # 5-Gallon Blue Translucent Water Bottle
    bpy.ops.mesh.primitive_cylinder_add(radius=0.14, depth=0.48, location=(0, 0, 1.25))
    jug = bpy.context.active_object
    jug.data.materials.append(mat_water_bottle)

    # Jug Dome & Neck
    bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.08, location=(0, 0, 1.03))
    neck = bpy.context.active_object
    neck.data.materials.append(mat_dispenser_body)

    export_glb("canteen_water_dispenser.glb")

def generate_dining_table_set():
    clear_scene()
    mat_varnished_wood = create_pbr_material("VarnishedAcaciaWood", (0.52, 0.32, 0.16), metallic=0.0, roughness=0.42)
    mat_steel_frame = create_pbr_material("IndustrialBlackSteel", (0.12, 0.14, 0.16), metallic=0.75, roughness=0.45)

    # Solid Wood Tabletop with Beveled Look
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.74))
    tabletop = bpy.context.active_object
    tabletop.scale = (2.2, 0.88, 0.05)
    tabletop.data.materials.append(mat_varnished_wood)
    bpy.ops.object.transform_apply(scale=True)

    # Steel Table Legs (H-frame)
    for leg_x in [-0.85, 0.85]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.025, depth=0.71, location=(leg_x, -0.32, 0.36))
        leg1 = bpy.context.active_object
        leg1.data.materials.append(mat_steel_frame)
        
        bpy.ops.mesh.primitive_cylinder_add(radius=0.025, depth=0.71, location=(leg_x, 0.32, 0.36))
        leg2 = bpy.context.active_object
        leg2.data.materials.append(mat_steel_frame)

        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(leg_x, 0, 0.15))
        cross = bpy.context.active_object
        cross.scale = (0.04, 0.64, 0.04)
        cross.data.materials.append(mat_steel_frame)
        bpy.ops.object.transform_apply(scale=True)

    # Two Attached Canteen Benches
    for bench_y in [-0.68, 0.68]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, bench_y, 0.44))
        bench = bpy.context.active_object
        bench.scale = (2.2, 0.32, 0.04)
        bench.data.materials.append(mat_varnished_wood)
        bpy.ops.object.transform_apply(scale=True)
        
        for bx in [-0.85, 0.85]:
            bpy.ops.mesh.primitive_cylinder_add(radius=0.022, depth=0.42, location=(bx, bench_y, 0.21))
            bleg = bpy.context.active_object
            bleg.data.materials.append(mat_steel_frame)

    export_glb("canteen_dining_table_set.glb")

generate_canteen_warming_station()
generate_water_dispenser()
generate_dining_table_set()
print("=== ALL CANTEEN PROPS GENERATED SUCCESSFULLY ===")
