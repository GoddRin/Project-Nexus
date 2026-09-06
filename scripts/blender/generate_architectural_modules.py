import bpy
import math
import os

print("=== GENERATING ARCHITECTURAL PBR MODULES VIA BLENDER ===")

out_dir = os.path.abspath("public/models/architecture")
os.makedirs(out_dir, exist_ok=True)

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_pbr_material(name, base_color, metallic=0.0, roughness=0.5):
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
# 1. 3D CORRUGATED GALVANIZED IRON (CGI) ROOF MODULE
# ─────────────────────────────────────────────────────────────────────────────
def generate_corrugated_roof():
    clear_scene()
    mat_zinc = create_pbr_material("GalvanizedZincBlue", (0.15, 0.28, 0.45), metallic=0.88, roughness=0.25)
    mat_ridge = create_pbr_material("RidgeCapFlashing", (0.12, 0.22, 0.38), metallic=0.90, roughness=0.20)

    mesh = bpy.data.meshes.new("CorrugatedRoofMesh")
    obj = bpy.data.objects.new("CorrugatedRoof", mesh)
    bpy.context.collection.objects.link(obj)

    verts = []
    faces = []
    
    # 20 corrugated wave ribs across width X (length Y = 6.0m)
    width = 4.0
    length = 6.0
    num_waves = 16
    steps_per_wave = 4
    total_steps = num_waves * steps_per_wave
    
    dx = width / total_steps
    wave_freq = (num_waves * 2 * math.pi) / width
    wave_amplitude = 0.035

    # Generate 2 rows of vertices (front edge y=0, back edge y=length)
    for j in range(2):
        y = j * length
        for i in range(total_steps + 1):
            x = (i * dx) - (width / 2)
            z = math.sin(x * wave_freq) * wave_amplitude
            verts.append((x, y, z))

    # Connect into quad faces
    for i in range(total_steps):
        v0 = i
        v1 = i + 1
        v2 = total_steps + 1 + i + 1
        v3 = total_steps + 1 + i
        faces.append((v0, v1, v2, v3))

    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj.data.materials.append(mat_zinc)

    # Ridge Cap flashing apex along back edge
    bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=width, location=(0, length, wave_amplitude * 1.5), rotation=(0, math.radians(90), 0))
    ridge = bpy.context.active_object
    ridge.data.materials.append(mat_ridge)

    export_glb("corrugated_metal_roof.glb")

# ─────────────────────────────────────────────────────────────────────────────
# 2. INDUSTRIAL HVAC VENTILATION LOUVER & AIR EXTRACTOR
# ─────────────────────────────────────────────────────────────────────────────
def generate_hvac_louver():
    clear_scene()
    mat_galv = create_pbr_material("GalvanizedSheetMetal", (0.75, 0.78, 0.82), metallic=0.85, roughness=0.3)
    mat_dark_grille = create_pbr_material("DarkIntakeGrille", (0.1, 0.12, 0.14), metallic=0.6, roughness=0.6)

    # Outer Hood Housing
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.45))
    housing = bpy.context.active_object
    housing.scale = (0.9, 0.9, 0.9)
    housing.data.materials.append(mat_galv)
    bpy.ops.object.transform_apply(scale=True)

    # Louver Blades (Angled Weather Fins)
    for b in range(5):
        bz = 0.15 + b * 0.14
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.46, bz))
        blade = bpy.context.active_object
        blade.scale = (0.82, 0.08, 0.015)
        blade.rotation_euler = (math.radians(-35), 0, 0)
        blade.data.materials.append(mat_dark_grille)
        bpy.ops.object.transform_apply(scale=True, rotation=True)

    # Rain Hood Canopy Peak
    bpy.ops.mesh.primitive_cylinder_add(radius=0.55, depth=0.92, location=(0, 0, 0.95), rotation=(0, math.radians(90), 0))
    hood = bpy.context.active_object
    hood.data.materials.append(mat_galv)

    export_glb("industrial_hvac_louver.glb")

generate_corrugated_roof()
generate_hvac_louver()
print("=== ARCHITECTURAL MODULES GENERATED SUCCESSFULLY ===")
