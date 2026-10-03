import bpy
import bmesh
import math
import mathutils
import os

print("=== GENERATING ATLAS-1 HEAVY CONSTRUCTION ANDROID ===")

out_dir = os.path.abspath("public/models/characters")
os.makedirs(out_dir, exist_ok=True)
out_glb = os.path.join(out_dir, "scic_atlas_navigator.glb")
out_blend = os.path.join(out_dir, "scic_atlas_navigator.blend")

# 1. Reset Factory Scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. PBR Material Library
def create_pbr_mat(name, base_color, roughness=0.3, metallic=0.0, specular=0.5, emissive=None, emissive_str=1.0, clearcoat=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if "Specular IOR Level" in bsdf.inputs:
            bsdf.inputs["Specular IOR Level"].default_value = specular
        elif "Specular" in bsdf.inputs:
            bsdf.inputs["Specular"].default_value = specular
        if clearcoat > 0 and "Coat Weight" in bsdf.inputs:
            bsdf.inputs["Coat Weight"].default_value = clearcoat
        elif clearcoat > 0 and "Clearcoat" in bsdf.inputs:
            bsdf.inputs["Clearcoat"].default_value = clearcoat
        if emissive and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*emissive, 1.0)
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = emissive_str
    return mat

mat_white = create_pbr_mat("SCIC_Chassis_White", (0.90, 0.92, 0.95), roughness=0.18, metallic=0.08, clearcoat=0.6)
mat_graphite = create_pbr_mat("SCIC_Carbon_Graphite", (0.06, 0.07, 0.08), roughness=0.55, metallic=0.30)
mat_emerald = create_pbr_mat("SCIC_Emerald_HiVis", (0.0, 0.85, 0.55), roughness=0.22, metallic=0.20, emissive=(0.0, 0.85, 0.55), emissive_str=0.8)
mat_gunmetal = create_pbr_mat("SCIC_Titanium_Gunmetal", (0.28, 0.30, 0.33), roughness=0.25, metallic=0.92)
mat_visor = create_pbr_mat("SCIC_Visor_Sapphire", (0.02, 0.04, 0.07), roughness=0.08, metallic=0.88, specular=0.95)
mat_core_cyan = create_pbr_mat("SCIC_Core_Cyan", (0.0, 0.90, 1.0), roughness=0.1, metallic=0.1, emissive=(0.0, 0.92, 1.0), emissive_str=3.5)
mat_hazard_amber = create_pbr_mat("SCIC_Hazard_Amber", (0.95, 0.60, 0.05), roughness=0.3, metallic=0.1, emissive=(0.95, 0.60, 0.05), emissive_str=1.5)

# 3. Armature Rig Creation
bpy.ops.object.armature_add(location=(0, 0, 0))
arm_obj = bpy.context.active_object
arm_obj.name = "Navigator_Armature"
arm_data = arm_obj.data
arm_data.name = "Navigator_Armature_Data"

bpy.ops.object.mode_set(mode='EDIT')
ebones = arm_data.edit_bones

# Clear default bone
for b in list(ebones):
    ebones.remove(b)

# Standard Mixamo Bone Dimensions (Total Height ~1.82m)
def add_bone(name, head, tail, parent_name=None):
    b = ebones.new(name)
    b.head = head
    b.tail = tail
    if parent_name:
        b.parent = ebones.get(parent_name)
    return b

# Spine chain
b_hips = add_bone("mixamorig:Hips", (0, 0, 0.98), (0, 0, 1.10))
b_spine = add_bone("mixamorig:Spine", (0, 0, 1.10), (0, 0, 1.24), "mixamorig:Hips")
b_spine1 = add_bone("mixamorig:Spine1", (0, 0, 1.24), (0, 0, 1.38), "mixamorig:Spine")
b_spine2 = add_bone("mixamorig:Spine2", (0, 0, 1.38), (0, 0, 1.50), "mixamorig:Spine1")
b_neck = add_bone("mixamorig:Neck", (0, 0, 1.50), (0, 0, 1.58), "mixamorig:Spine2")
b_head = add_bone("mixamorig:Head", (0, 0, 1.58), (0, 0, 1.76), "mixamorig:Neck")
b_head_end = add_bone("mixamorig:HeadTop_End", (0, 0, 1.76), (0, 0, 1.84), "mixamorig:Head")

# Left Arm chain (Authoritative, natural rest stance)
b_l_sho = add_bone("mixamorig:LeftShoulder", (0.05, 0, 1.48), (0.18, 0, 1.48), "mixamorig:Spine2")
b_l_arm = add_bone("mixamorig:LeftArm", (0.18, 0, 1.48), (0.24, 0.02, 1.18), "mixamorig:LeftShoulder")
b_l_forearm = add_bone("mixamorig:LeftForeArm", (0.24, 0.02, 1.18), (0.26, 0.05, 0.92), "mixamorig:LeftArm")
b_l_hand = add_bone("mixamorig:LeftHand", (0.26, 0.05, 0.92), (0.27, 0.07, 0.80), "mixamorig:LeftForeArm")

# Right Arm chain
b_r_sho = add_bone("mixamorig:RightShoulder", (-0.05, 0, 1.48), (-0.18, 0, 1.48), "mixamorig:Spine2")
b_r_arm = add_bone("mixamorig:RightArm", (-0.18, 0, 1.48), (-0.24, 0.02, 1.18), "mixamorig:RightShoulder")
b_r_forearm = add_bone("mixamorig:RightForeArm", (-0.24, 0.02, 1.18), (-0.26, 0.05, 0.92), "mixamorig:RightArm")
b_r_hand = add_bone("mixamorig:RightHand", (-0.26, 0.05, 0.92), (-0.27, 0.07, 0.80), "mixamorig:RightForeArm")

# Left Leg chain (Shoulder-width solid grounded stance)
b_l_leg = add_bone("mixamorig:LeftUpLeg", (0.12, 0, 0.96), (0.13, 0.01, 0.52), "mixamorig:Hips")
b_l_knee = add_bone("mixamorig:LeftLeg", (0.13, 0.01, 0.52), (0.14, 0, 0.10), "mixamorig:LeftUpLeg")
b_l_foot = add_bone("mixamorig:LeftFoot", (0.14, 0, 0.10), (0.14, -0.14, 0.02), "mixamorig:LeftLeg")
b_l_toe = add_bone("mixamorig:LeftToeBase", (0.14, -0.14, 0.02), (0.14, -0.22, 0.02), "mixamorig:LeftFoot")

# Right Leg chain
b_r_leg = add_bone("mixamorig:RightUpLeg", (-0.12, 0, 0.96), (-0.13, 0.01, 0.52), "mixamorig:Hips")
b_r_knee = add_bone("mixamorig:RightLeg", (-0.13, 0.01, 0.52), (-0.14, 0, 0.10), "mixamorig:RightUpLeg")
b_r_foot = add_bone("mixamorig:RightFoot", (-0.14, 0, 0.10), (-0.14, -0.14, 0.02), "mixamorig:RightLeg")
b_r_toe = add_bone("mixamorig:RightToeBase", (-0.14, -0.14, 0.02), (-0.14, -0.22, 0.02), "mixamorig:RightFoot")

bpy.ops.object.mode_set(mode='OBJECT')

print("Created Mixamo skeletal armature hierarchy.")

# 4. Procedural Mechanical Geometry Builder
# High-spec industrial geometry with smooth bevels and subdivision
all_meshes = []

def create_beveled_part(name, prim_func, loc, scale, mat, bone_parent, bevel_width=0.015, subdiv=1):
    prim_func()
    obj = bpy.context.active_object
    obj.name = name
    obj.location = loc
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    
    # Smooth shading
    for poly in obj.data.polygons:
        poly.use_smooth = True
        
    if mat:
        obj.data.materials.append(mat)
        
    # Bevel Modifier for industrial chamfers
    if bevel_width > 0:
        bev = obj.modifiers.new(name="Bevel", type='BEVEL')
        bev.width = bevel_width
        bev.segments = 2
        bev.limit_method = 'ANGLE'
        bev.angle_limit = math.radians(35)
        
    # Subdivision modifier for organic curvature
    if subdiv > 0:
        sub = obj.modifiers.new(name="Subsurf", type='SUBSURF')
        sub.levels = subdiv
        sub.render_levels = subdiv
        
    # Bind to Bone via Vertex Group
    vg = obj.vertex_groups.new(name=bone_parent)
    verts = [v.index for v in obj.data.vertices]
    vg.add(verts, 1.0, 'REPLACE')
    
    arm_mod = obj.modifiers.new(name="Armature", type='ARMATURE')
    arm_mod.object = arm_obj
    obj.parent = arm_obj
    
    all_meshes.append(obj)
    return obj

# 4A. HEAD & CRANIAL ASSEMBLY (Parent: mixamorig:Head)
# 1. Hardhat Crown Shell (Aerodynamic construction dome)
def make_helmet_crown():
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=24, radius=0.125, location=(0, -0.01, 1.69))
make_helmet_shell = create_beveled_part("Atlas_Helmet_Shell", make_helmet_crown, (0, -0.01, 1.69), (1.0, 1.15, 0.85), mat_white, "mixamorig:Head", 0.01, 1)

# 2. Hardhat Center Ridge
def make_helmet_ridge():
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.01, 1.76))
create_beveled_part("Atlas_Helmet_Ridge", make_helmet_ridge, (0, -0.01, 1.76), (0.035, 0.22, 0.04), mat_emerald, "mixamorig:Head", 0.008, 1)

# 3. Polarized Wrap-Around Visor
def make_visor():
    bpy.ops.mesh.primitive_cylinder_add(vertices=28, radius=0.118, depth=0.08, location=(0, -0.04, 1.65))
create_beveled_part("Atlas_Visor", make_visor, (0, -0.04, 1.65), (0.95, 0.75, 0.85), mat_visor, "mixamorig:Head", 0.01, 1)

# 4. Stereoscopic LiDAR Optics (Twin Photogrammetry Cameras)
def make_lidar_left():
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.018, depth=0.03, location=(0.04, -0.12, 1.70))
create_beveled_part("Atlas_LiDAR_L", make_lidar_left, (0.04, -0.12, 1.70), (1, 1, 1), mat_core_cyan, "mixamorig:Head", 0.003, 1)

def make_lidar_right():
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.018, depth=0.03, location=(-0.04, -0.12, 1.70))
create_beveled_part("Atlas_LiDAR_R", make_lidar_right, (-0.04, -0.12, 1.70), (1, 1, 1), mat_core_cyan, "mixamorig:Head", 0.003, 1)

# 5. Jaw Chassis & Chin Intake
def make_jaw():
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.06, 1.58))
create_beveled_part("Atlas_Jaw", make_jaw, (0, -0.06, 1.58), (0.11, 0.12, 0.06), mat_graphite, "mixamorig:Head", 0.012, 1)

# 6. Ear Telemetry Pods (L & R)
def make_ear_l():
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.03, depth=0.025, location=(0.125, -0.01, 1.66))
create_beveled_part("Atlas_Ear_L", make_ear_l, (0.125, -0.01, 1.66), (1, 1, 1), mat_gunmetal, "mixamorig:Head", 0.004, 1)

def make_ear_r():
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.03, depth=0.025, location=(-0.125, -0.01, 1.66))
create_beveled_part("Atlas_Ear_R", make_ear_r, (-0.125, -0.01, 1.66), (1, 1, 1), mat_gunmetal, "mixamorig:Head", 0.004, 1)

# 4B. NECK VERTEBRAE (Parent: mixamorig:Neck)
def make_neck():
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.065, depth=0.09, location=(0, 0, 1.53))
create_beveled_part("Atlas_Neck_Core", make_neck, (0, 0, 1.53), (0.9, 0.9, 1.0), mat_gunmetal, "mixamorig:Neck", 0.008, 1)

# 4C. TORSO & CHASSIS (Parent: mixamorig:Spine2 & Spine1)
# Chest Armor Cowling (Left & Right halves)
def make_chest_plate_l():
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.10, -0.04, 1.43))
create_beveled_part("Atlas_Chest_Plate_L", make_chest_plate_l, (0.10, -0.04, 1.43), (0.14, 0.12, 0.15), mat_white, "mixamorig:Spine2", 0.02, 1)

def make_chest_plate_r():
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.10, -0.04, 1.43))
create_beveled_part("Atlas_Chest_Plate_R", make_chest_plate_r, (-0.10, -0.04, 1.43), (0.14, 0.12, 0.15), mat_white, "mixamorig:Spine2", 0.02, 1)

# SCIC Central GIS Arc Reactor / Telemetry Core
def make_reactor_core():
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.042, depth=0.02, location=(0, -0.11, 1.43))
create_beveled_part("Atlas_Reactor_Core", make_reactor_core, (0, -0.11, 1.43), (1, 1, 1), mat_core_cyan, "mixamorig:Spine2", 0.004, 1)

def make_reactor_bezel():
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.052, depth=0.015, location=(0, -0.105, 1.43))
create_beveled_part("Atlas_Reactor_Bezel", make_reactor_bezel, (0, -0.105, 1.43), (1, 1, 1), mat_emerald, "mixamorig:Spine2", 0.004, 1)

# Upper Spine Back-Pack (LiDAR battery & antenna housing)
def make_backpack():
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.10, 1.42))
create_beveled_part("Atlas_Backpack", make_backpack, (0, 0.10, 1.42), (0.24, 0.10, 0.22), mat_graphite, "mixamorig:Spine2", 0.015, 1)

# Abdominal Hydraulic Struts (Spine1)
def make_abdomen_core():
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.12, depth=0.14, location=(0, 0, 1.28))
create_beveled_part("Atlas_Abdomen_Core", make_abdomen_core, (0, 0, 1.28), (0.95, 0.85, 1.0), mat_graphite, "mixamorig:Spine1", 0.012, 1)

def make_ab_piston_l():
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.018, depth=0.16, location=(0.09, -0.06, 1.28))
create_beveled_part("Atlas_Ab_Piston_L", make_ab_piston_l, (0.09, -0.06, 1.28), (1, 1, 1), mat_gunmetal, "mixamorig:Spine1", 0.004, 1)

def make_ab_piston_r():
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.018, depth=0.16, location=(-0.09, -0.06, 1.28))
create_beveled_part("Atlas_Ab_Piston_R", make_ab_piston_r, (-0.09, -0.06, 1.28), (1, 1, 1), mat_gunmetal, "mixamorig:Spine1", 0.004, 1)

# 4D. PELVIS & HIPS (Parent: mixamorig:Hips)
def make_pelvis():
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 1.03))
create_beveled_part("Atlas_Pelvis_Chassis", make_pelvis, (0, 0, 1.03), (0.26, 0.18, 0.14), mat_white, "mixamorig:Hips", 0.02, 1)

def make_groin_guard():
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.08, 0.99))
create_beveled_part("Atlas_Groin_Guard", make_groin_guard, (0, -0.08, 0.99), (0.12, 0.06, 0.10), mat_emerald, "mixamorig:Hips", 0.012, 1)

# 4E. SHOULDERS & ARMS
# Left Shoulder Pauldron
def make_shoulder_l():
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=18, radius=0.095, location=(0.24, 0, 1.48))
create_beveled_part("Atlas_Shoulder_L", make_shoulder_l, (0.24, 0, 1.48), (1.1, 1.0, 1.0), mat_white, "mixamorig:LeftShoulder", 0.012, 1)

# Right Shoulder Pauldron
def make_shoulder_r():
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=18, radius=0.095, location=(-0.24, 0, 1.48))
create_beveled_part("Atlas_Shoulder_R", make_shoulder_r, (-0.24, 0, 1.48), (1.1, 1.0, 1.0), mat_white, "mixamorig:RightShoulder", 0.012, 1)

# Left Bicep Actuator
def make_bicep_l():
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.05, depth=0.22, location=(0.23, 0.01, 1.33))
create_beveled_part("Atlas_Bicep_L", make_bicep_l, (0.23, 0.01, 1.33), (1, 1, 1), mat_graphite, "mixamorig:LeftArm", 0.008, 1)

# Right Bicep Actuator
def make_bicep_r():
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.05, depth=0.22, location=(-0.23, 0.01, 1.33))
create_beveled_part("Atlas_Bicep_R", make_bicep_r, (-0.23, 0.01, 1.33), (1, 1, 1), mat_graphite, "mixamorig:RightArm", 0.008, 1)

# Left Forearm with Integrated Holographic Tactical Terminal
def make_forearm_l():
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.046, depth=0.20, location=(0.25, 0.04, 1.05))
create_beveled_part("Atlas_Forearm_L", make_forearm_l, (0.25, 0.04, 1.05), (1, 1, 1), mat_white, "mixamorig:LeftForeArm", 0.008, 1)

# Wrist Terminal Screen on Left Arm
def make_wrist_screen():
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.28, 0.03, 1.05))
create_beveled_part("Atlas_Wrist_Screen", make_wrist_screen, (0.28, 0.03, 1.05), (0.02, 0.065, 0.09), mat_core_cyan, "mixamorig:LeftForeArm", 0.004, 0)

# Right Forearm
def make_forearm_r():
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.046, depth=0.20, location=(-0.25, 0.04, 1.05))
create_beveled_part("Atlas_Forearm_R", make_forearm_r, (-0.25, 0.04, 1.05), (1, 1, 1), mat_white, "mixamorig:RightForeArm", 0.008, 1)

# Left Hand: Sturdy, ergonomic robotic hand (Naturally curved, authoritative resting position)
def make_hand_l():
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.27, 0.06, 0.86))
create_beveled_part("Atlas_Hand_L", make_hand_l, (0.27, 0.06, 0.86), (0.045, 0.08, 0.09), mat_gunmetal, "mixamorig:LeftHand", 0.006, 1)

# Right Hand
def make_hand_r():
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.27, 0.06, 0.86))
create_beveled_part("Atlas_Hand_R", make_hand_r, (-0.27, 0.06, 0.86), (0.045, 0.08, 0.09), mat_gunmetal, "mixamorig:RightHand", 0.006, 1)

# 4F. LEGS & INDUSTRIAL STABILIZER BOOTS
# Left Thigh Cowling
def make_thigh_l():
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.13, 0.01, 0.74))
create_beveled_part("Atlas_Thigh_L", make_thigh_l, (0.13, 0.01, 0.74), (0.13, 0.14, 0.36), mat_white, "mixamorig:LeftUpLeg", 0.018, 1)

# Right Thigh Cowling
def make_thigh_r():
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.13, 0.01, 0.74))
create_beveled_part("Atlas_Thigh_R", make_thigh_r, (-0.13, 0.01, 0.74), (0.13, 0.14, 0.36), mat_white, "mixamorig:RightUpLeg", 0.018, 1)

# Left Knee Guard
def make_knee_l():
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.13, -0.07, 0.52))
create_beveled_part("Atlas_Knee_L", make_knee_l, (0.13, -0.07, 0.52), (0.08, 0.04, 0.08), mat_emerald, "mixamorig:LeftLeg", 0.008, 1)

# Right Knee Guard
def make_knee_r():
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.13, -0.07, 0.52))
create_beveled_part("Atlas_Knee_R", make_knee_r, (-0.13, -0.07, 0.52), (0.08, 0.04, 0.08), mat_emerald, "mixamorig:RightLeg", 0.008, 1)

# Left Shin & Calf
def make_shin_l():
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.14, 0, 0.30))
create_beveled_part("Atlas_Shin_L", make_shin_l, (0.14, 0, 0.30), (0.12, 0.13, 0.34), mat_white, "mixamorig:LeftLeg", 0.016, 1)

# Right Shin & Calf
def make_shin_r():
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.14, 0, 0.30))
create_beveled_part("Atlas_Shin_R", make_shin_r, (-0.14, 0, 0.30), (0.12, 0.13, 0.34), mat_white, "mixamorig:RightLeg", 0.016, 1)

# Left Heavy-Duty Magnetic Construction Boot
def make_boot_l():
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.14, -0.06, 0.06))
create_beveled_part("Atlas_Boot_L", make_boot_l, (0.14, -0.06, 0.06), (0.13, 0.24, 0.10), mat_graphite, "mixamorig:LeftFoot", 0.014, 1)

# Right Heavy-Duty Magnetic Construction Boot
def make_boot_r():
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.14, -0.06, 0.06))
create_beveled_part("Atlas_Boot_R", make_boot_r, (-0.14, -0.06, 0.06), (0.13, 0.24, 0.10), mat_graphite, "mixamorig:RightFoot", 0.014, 1)

print(f"Constructed {len(all_meshes)} precision-beveled cybernetic components.")

# 5. Create 9 Professional NPC Animations
arm_obj.animation_data_create()
pbones = arm_obj.pose.bones

def create_action(name):
    act = bpy.data.actions.new(name=name)
    act.use_fake_user = True
    return act

def key_bone_rotation(pb, euler_deg, frame):
    q = mathutils.Euler((math.radians(euler_deg[0]), math.radians(euler_deg[1]), math.radians(euler_deg[2])), 'XYZ').to_quaternion()
    pb.rotation_quaternion = q
    pb.keyframe_insert(data_path="rotation_quaternion", frame=frame)

# ACTION 1: Navigator_Idle (Confident, authoritative upright stance with subtle hydraulic breath)
act_idle = create_action("Navigator_Idle")
arm_obj.animation_data.action = act_idle
for f, breath in [(1, 0), (30, 2), (60, 0)]:
    key_bone_rotation(pbones["mixamorig:Spine1"], (breath, 0, 0), f)
    key_bone_rotation(pbones["mixamorig:Spine2"], (breath * 0.8, 0, 0), f)
    key_bone_rotation(pbones["mixamorig:Head"], (-breath * 0.5, 0, 0), f)
    key_bone_rotation(pbones["mixamorig:LeftArm"], (2, 0, 4), f)
    key_bone_rotation(pbones["mixamorig:RightArm"], (2, 0, -4), f)

# ACTION 2: Navigator_Listening (Forward attention lean, head facing user)
act_listening = create_action("Navigator_Listening")
arm_obj.animation_data.action = act_listening
for f in [1, 30, 60]:
    key_bone_rotation(pbones["mixamorig:Spine1"], (4, 0, 0), f)
    key_bone_rotation(pbones["mixamorig:Spine2"], (3, 0, 0), f)
    key_bone_rotation(pbones["mixamorig:Head"], (-5, 0, 0), f)
    key_bone_rotation(pbones["mixamorig:LeftArm"], (5, 0, 6), f)
    key_bone_rotation(pbones["mixamorig:RightArm"], (5, 0, -6), f)

# ACTION 3: Navigator_Thinking (Left forearm raised to inspect wrist telemetry terminal)
act_thinking = create_action("Navigator_Thinking")
arm_obj.animation_data.action = act_thinking
for f, pulse in [(1, 0), (30, 3), (60, 0)]:
    key_bone_rotation(pbones["mixamorig:LeftArm"], (-25, 20, 25), f)
    key_bone_rotation(pbones["mixamorig:LeftForeArm"], (-65 + pulse, 0, 25), f)
    key_bone_rotation(pbones["mixamorig:Head"], (10, -12, 4), f)
    key_bone_rotation(pbones["mixamorig:RightArm"], (2, 0, -5), f)

# ACTION 4: Navigator_Searching (Right arm projecting forward, head scanning horizon)
act_searching = create_action("Navigator_Searching")
arm_obj.animation_data.action = act_searching
for f, yaw in [(1, -10), (30, 10), (60, -10)]:
    key_bone_rotation(pbones["mixamorig:RightArm"], (-35, -15, -20), f)
    key_bone_rotation(pbones["mixamorig:RightForeArm"], (-40, 0, -15), f)
    key_bone_rotation(pbones["mixamorig:Head"], (0, yaw, 0), f)
    key_bone_rotation(pbones["mixamorig:LeftArm"], (-10, 10, 15), f)

# ACTION 5: Navigator_Navigating (Authoritative directional vector gesture toward map)
act_navigating = create_action("Navigator_Navigating")
arm_obj.animation_data.action = act_navigating
for f in [1, 30, 60]:
    key_bone_rotation(pbones["mixamorig:RightArm"], (-50, -25, -30), f)
    key_bone_rotation(pbones["mixamorig:RightForeArm"], (-20, 0, -10), f)
    key_bone_rotation(pbones["mixamorig:Head"], (-2, 14, 0), f)
    key_bone_rotation(pbones["mixamorig:LeftArm"], (0, 0, 8), f)

# ACTION 6: Navigator_Speaking (Communicative cadence)
act_speaking = create_action("Navigator_Speaking")
arm_obj.animation_data.action = act_speaking
for f, pitch in [(1, 0), (15, 4), (30, -3), (45, 5), (60, 0)]:
    key_bone_rotation(pbones["mixamorig:Head"], (pitch, pitch * 0.4, 0), f)
    key_bone_rotation(pbones["mixamorig:RightForeArm"], (-20 + pitch * 2, 0, 0), f)
    key_bone_rotation(pbones["mixamorig:LeftForeArm"], (-15 - pitch, 0, 0), f)

# ACTION 7: Navigator_Success (Affirmative crisp double nod, chest core brightens)
act_success = create_action("Navigator_Success")
arm_obj.animation_data.action = act_success
for f, nod in [(1, 0), (15, 12), (28, 0), (40, 10), (52, 0), (60, 0)]:
    key_bone_rotation(pbones["mixamorig:Head"], (nod, 0, 0), f)
    key_bone_rotation(pbones["mixamorig:Neck"], (nod * 0.35, 0, 0), f)

# ACTION 8: Navigator_Error (Subtle puzzled diagnostic tilt)
act_error = create_action("Navigator_Error")
arm_obj.animation_data.action = act_error
for f, tilt in [(1, 0), (25, 10), (45, 10), (60, 0)]:
    key_bone_rotation(pbones["mixamorig:Head"], (4, -tilt * 0.5, tilt), f)
    key_bone_rotation(pbones["mixamorig:LeftShoulder"], (0, 0, tilt * 0.4), f)
    key_bone_rotation(pbones["mixamorig:RightShoulder"], (0, 0, -tilt * 0.4), f)

# ACTION 9: Navigator_Wave (Professional, confident military/engineering wave)
act_wave = create_action("Navigator_Wave")
arm_obj.animation_data.action = act_wave
for f in [1, 15, 30, 45, 60]:
    key_bone_rotation(pbones["mixamorig:RightArm"], (-75, -20, -40), f)
    key_bone_rotation(pbones["mixamorig:RightForeArm"], (-65, 0, 0), f)
for f, wave_deg in [(1, 0), (15, 18), (30, -18), (45, 18), (60, 0)]:
    key_bone_rotation(pbones["mixamorig:RightHand"], (0, wave_deg, wave_deg * 0.5), f)

# Set default active action to Navigator_Idle
arm_obj.animation_data.action = act_idle
if hasattr(act_idle, 'slots') and len(act_idle.slots) > 0:
    arm_obj.animation_data.action_slot = act_idle.slots[0]

print("Created 9 professional state-machine animation clips.")

# 6. Save .blend and Export Optimized GLB
bpy.ops.wm.save_as_mainfile(filepath=out_blend)
print(f"Saved {out_blend}")

bpy.ops.export_scene.gltf(
    filepath=out_glb,
    export_format='GLB',
    use_selection=False,
    export_animations=True,
    export_apply=False
)

print(f"Exported {out_glb}: {os.path.getsize(out_glb)} bytes")
print("=== ATLAS-1 HEAVY CONSTRUCTION ANDROID GENERATION COMPLETE ===")
