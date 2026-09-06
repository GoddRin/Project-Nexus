import bpy
import math
import os

print("=== GENERATING SIERRA MADRE WILDLIFE 3D MESHES VIA BLENDER ===")

out_dir = os.path.abspath("public/models/wildlife")
os.makedirs(out_dir, exist_ok=True)

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_pbr_material(name, base_color, metallic=0.0, roughness=0.7):
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
    return mat

def export_glb(filename):
    filepath = os.path.join(out_dir, filename)
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=False
    )
    print(f"Exported {filename}: {os.path.getsize(filepath)} bytes")

# ─────────────────────────────────────────────────────────────────────────────
# 1. PHILIPPINE CARABAO (Kalabaw / Bubalus bubalis carabanesis)
# ─────────────────────────────────────────────────────────────────────────────
def generate_carabao():
    clear_scene()
    mat_hide = create_pbr_material("CarabaoHideSlate", (0.22, 0.23, 0.25), metallic=0.08, roughness=0.68)
    mat_horns = create_pbr_material("CarabaoHornGrey", (0.35, 0.34, 0.32), metallic=0.15, roughness=0.45)
    mat_hooves = create_pbr_material("CarabaoHoofDark", (0.12, 0.12, 0.14), metallic=0.20, roughness=0.55)

    # Muscular Barrel Torso
    bpy.ops.mesh.primitive_cylinder_add(radius=0.58, depth=1.65, location=(0, 0, 0.95), rotation=(math.radians(90), 0, 0))
    torso = bpy.context.active_object
    torso.scale = (0.92, 1.08, 1.0)
    torso.data.materials.append(mat_hide)
    bpy.ops.object.transform_apply(scale=True)

    # Muscular Shoulder Withers
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.54, location=(0, 0.65, 1.08))
    withers = bpy.context.active_object
    withers.scale = (0.85, 1.0, 1.1)
    withers.data.materials.append(mat_hide)
    bpy.ops.object.transform_apply(scale=True)

    # Rump / Flank
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.52, location=(0, -0.68, 0.94))
    rump = bpy.context.active_object
    rump.data.materials.append(mat_hide)

    # Neck & Head
    bpy.ops.mesh.primitive_cylinder_add(radius=0.26, depth=0.75, location=(0, 1.05, 1.08), rotation=(math.radians(45), 0, 0))
    neck = bpy.context.active_object
    neck.data.materials.append(mat_hide)

    # Head Cranium
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.28, location=(0, 1.35, 1.25))
    head = bpy.context.active_object
    head.scale = (0.85, 1.2, 0.9)
    head.data.materials.append(mat_hide)
    bpy.ops.object.transform_apply(scale=True)

    # Muzzle / Snout
    bpy.ops.mesh.primitive_cylinder_add(radius=0.18, depth=0.45, location=(0, 1.62, 1.05), rotation=(math.radians(75), 0, 0))
    muzzle = bpy.context.active_object
    muzzle.data.materials.append(mat_hide)

    # Sweeping Crescent Horns (Curved outward and back)
    for hx, rot_z in [(-0.42, math.radians(-35)), (0.42, math.radians(35))]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=0.95, location=(hx, 1.32, 1.48), rotation=(math.radians(35), math.radians(65 if hx > 0 else -65), rot_z))
        horn = bpy.context.active_object
        horn.data.materials.append(mat_horns)

    # Drooping Ears
    for ex in [-0.34, 0.34]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=0.32, location=(ex, 1.25, 1.25), rotation=(0, math.radians(70 if ex > 0 else -70), 0))
        ear = bpy.context.active_object
        ear.data.materials.append(mat_hide)

    # 4 Anatomical Legs with Hooves
    leg_coords = [(-0.34, 0.55), (0.34, 0.55), (-0.32, -0.60), (0.32, -0.60)]
    for lx, ly in leg_coords:
        # Upper Thigh / Shoulder
        bpy.ops.mesh.primitive_cylinder_add(radius=0.13, depth=0.42, location=(lx, ly, 0.72))
        thigh = bpy.context.active_object
        thigh.data.materials.append(mat_hide)
        
        # Lower Shin
        bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=0.48, location=(lx, ly, 0.32))
        shin = bpy.context.active_object
        shin.data.materials.append(mat_hide)

        # Hoof
        bpy.ops.mesh.primitive_cylinder_add(radius=0.09, depth=0.10, location=(lx, ly, 0.05))
        hoof = bpy.context.active_object
        hoof.data.materials.append(mat_hooves)

    # Tail
    bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.72, location=(0, -0.92, 0.68), rotation=(math.radians(-15), 0, 0))
    tail = bpy.context.active_object
    tail.data.materials.append(mat_hide)

    export_glb("philippine_carabao.glb")

# ─────────────────────────────────────────────────────────────────────────────
# 2. PHILIPPINE EAGLE (Haring Ibon / Pithecophaga jefferyi)
# ─────────────────────────────────────────────────────────────────────────────
def generate_eagle():
    clear_scene()
    mat_feathers_brown = create_pbr_material("EagleFeatherBrown", (0.32, 0.22, 0.15), metallic=0.05, roughness=0.75)
    mat_feathers_white = create_pbr_material("EagleFeatherWhite", (0.92, 0.90, 0.86), metallic=0.02, roughness=0.70)
    mat_beak = create_pbr_material("EagleBeakGunmetal", (0.15, 0.16, 0.18), metallic=0.45, roughness=0.35)
    mat_talons = create_pbr_material("EagleTalonYellow", (0.88, 0.65, 0.18), metallic=0.10, roughness=0.50)

    # Aerodynamic Torso (White Breast & Belly)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.32, location=(0, 0, 0))
    torso = bpy.context.active_object
    torso.scale = (0.75, 1.4, 0.75)
    torso.data.materials.append(mat_feathers_white)
    bpy.ops.object.transform_apply(scale=True)

    # Dark Brown Feathered Back Mantle
    bpy.ops.mesh.primitive_cylinder_add(radius=0.28, depth=0.75, location=(0, -0.05, 0.12), rotation=(math.radians(90), 0, 0))
    mantle = bpy.context.active_object
    mantle.data.materials.append(mat_feathers_brown)

    # Head with Majestic Shaggy Crest Feathers
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.18, location=(0, 0.42, 0.22))
    head = bpy.context.active_object
    head.data.materials.append(mat_feathers_white)

    # Shaggy Crest Tufts
    for ca in [-0.25, 0.0, 0.25]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=0.22, location=(ca, 0.36, 0.38), rotation=(math.radians(-35), 0, ca * 0.8))
        crest = bpy.context.active_object
        crest.data.materials.append(mat_feathers_brown)

    # Hooked Raptor Beak
    bpy.ops.mesh.primitive_cone_add(radius1=0.07, depth=0.22, location=(0, 0.62, 0.18), rotation=(math.radians(105), 0, 0))
    beak = bpy.context.active_object
    beak.data.materials.append(mat_beak)

    # Broad Soaring Wingspan (Left & Right Wings with 2.2m wingspan)
    for wx, rot_y in [(-1.05, math.radians(5)), (1.05, math.radians(-5))]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(wx, 0.05, 0.08))
        wing = bpy.context.active_object
        wing.scale = (1.1, 0.55, 0.04)
        wing.rotation_euler = (math.radians(-5), rot_y, 0)
        wing.data.materials.append(mat_feathers_brown)
        bpy.ops.object.transform_apply(scale=True, rotation=True)

    # Fanned Tail
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.68, -0.02))
    tail = bpy.context.active_object
    tail.scale = (0.45, 0.52, 0.02)
    tail.data.materials.append(mat_feathers_brown)
    bpy.ops.object.transform_apply(scale=True)

    # Talons
    for tx in [-0.10, 0.10]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.18, location=(tx, -0.08, -0.26), rotation=(math.radians(25), 0, 0))
        talon = bpy.context.active_object
        talon.data.materials.append(mat_talons)

    export_glb("philippine_eagle.glb")

# ─────────────────────────────────────────────────────────────────────────────
# 3. PHILIPPINE WILD BOAR (Baboy Ramo / Sus philippensis)
# ─────────────────────────────────────────────────────────────────────────────
def generate_wild_boar():
    clear_scene()
    mat_boar_hide = create_pbr_material("BoarBristlesDark", (0.18, 0.15, 0.14), metallic=0.05, roughness=0.82)
    mat_tusks = create_pbr_material("BoarIvoryTusk", (0.92, 0.88, 0.78), metallic=0.20, roughness=0.35)

    # Stocky Stout Torso with Bristled Ridge
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.45, location=(0, 0, 0.58))
    torso = bpy.context.active_object
    torso.scale = (0.75, 1.35, 0.95)
    torso.data.materials.append(mat_boar_hide)
    bpy.ops.object.transform_apply(scale=True)

    # Wedge Snout & Head
    bpy.ops.mesh.primitive_cone_add(radius1=0.26, depth=0.58, location=(0, 0.72, 0.62), rotation=(math.radians(80), 0, 0))
    snout = bpy.context.active_object
    snout.data.materials.append(mat_boar_hide)

    # Disc Snout Tip
    bpy.ops.mesh.primitive_cylinder_add(radius=0.11, depth=0.04, location=(0, 1.02, 0.57), rotation=(math.radians(90), 0, 0))
    disc = bpy.context.active_object
    disc.data.materials.append(mat_boar_hide)

    # Curved Ivory Tusks
    for tx in [-0.11, 0.11]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.02, depth=0.14, location=(tx, 0.88, 0.58), rotation=(math.radians(25), math.radians(35 if tx > 0 else -35), 0))
        tusk = bpy.context.active_object
        tusk.data.materials.append(mat_tusks)

    # Pointed Ears
    for ex in [-0.18, 0.18]:
        bpy.ops.mesh.primitive_cone_add(radius1=0.08, depth=0.22, location=(ex, 0.52, 0.88), rotation=(math.radians(-25), math.radians(20 if ex > 0 else -20), 0))
        ear = bpy.context.active_object
        ear.data.materials.append(mat_boar_hide)

    # 4 Stocky Legs
    for lx, ly in [(-0.24, 0.35), (0.24, 0.35), (-0.22, -0.38), (0.22, -0.38)]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=0.38, location=(lx, ly, 0.22))
        leg = bpy.context.active_object
        leg.data.materials.append(mat_boar_hide)

    export_glb("philippine_wild_boar.glb")

generate_carabao()
generate_eagle()
generate_wild_boar()
print("=== ALL WILDLIFE 3D MESHES GENERATED SUCCESSFULLY ===")
