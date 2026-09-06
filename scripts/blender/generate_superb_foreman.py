import bpy
import math
import os

print("=== GENERATING HIGH-FIDELITY SCIC CIVIL FOREMAN 3D RIGGED CHARACTER ===")

out_dir = os.path.abspath("public/models/characters")
os.makedirs(out_dir, exist_ok=True)

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_pbr_mat(name, base_color, roughness=0.5, metallic=0.0, specular=0.5, emissive=None, sss=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
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
        if emissive and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*emissive, 1.0)
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = 1.5
        if sss > 0 and "Subsurface Weight" in bsdf.inputs:
            bsdf.inputs["Subsurface Weight"].default_value = sss
        elif sss > 0 and "Subsurface" in bsdf.inputs:
            bsdf.inputs["Subsurface"].default_value = sss
    return mat

def create_foreman():
    clear_scene()

    # ═══════════════════════════════════════════════════════════════════════════
    # 1. PBR MATERIALS
    # ═══════════════════════════════════════════════════════════════════════════
    mat_skin = create_pbr_mat("Skin_Sunbronzed", (0.64, 0.42, 0.30), roughness=0.48, metallic=0.0, specular=0.55, sss=0.15)
    mat_eyes = create_pbr_mat("Eyes_DarkBrown", (0.10, 0.07, 0.05), roughness=0.05, metallic=0.1, specular=0.9)
    mat_sclera = create_pbr_mat("Eyes_Sclera", (0.92, 0.90, 0.88), roughness=0.1, metallic=0.0, specular=0.8)
    mat_hair = create_pbr_mat("Hair_Dark", (0.05, 0.04, 0.04), roughness=0.85, metallic=0.0)
    
    mat_hardhat_yellow = create_pbr_mat("Safety_Hardhat_Yellow", (0.96, 0.76, 0.05), roughness=0.22, metallic=0.08, specular=0.7)
    mat_hardhat_brim = create_pbr_mat("Hardhat_Brim_Rubber", (0.12, 0.12, 0.13), roughness=0.6, metallic=0.1)
    mat_scic_badge = create_pbr_mat("SCIC_Logo_Badge", (0.02, 0.35, 0.65), roughness=0.3, metallic=0.2)
    
    mat_shirt_grey = create_pbr_mat("Work_Shirt_HeatherGrey", (0.34, 0.35, 0.37), roughness=0.88, metallic=0.0)
    mat_vest_amber = create_pbr_mat("Foreman_Vest_AmberHiVis", (0.94, 0.58, 0.04), roughness=0.70, metallic=0.0)
    mat_vest_navy = create_pbr_mat("Foreman_Vest_NavyTrim", (0.06, 0.14, 0.32), roughness=0.78, metallic=0.0)
    mat_tape_3m = create_pbr_mat("Retroreflective_Silver3M", (0.95, 0.96, 0.98), roughness=0.12, metallic=0.88, specular=1.0, emissive=(0.85, 0.90, 0.95))
    
    mat_leather_belt = create_pbr_mat("ToolBelt_OiledLeather", (0.18, 0.11, 0.07), roughness=0.55, metallic=0.08)
    mat_brass_buckle = create_pbr_mat("Hardware_Brass", (0.85, 0.70, 0.25), roughness=0.25, metallic=0.92)
    mat_stanley_tape = create_pbr_mat("Stanley_Tape_Yellow", (0.95, 0.82, 0.05), roughness=0.35, metallic=0.05)
    
    mat_jeans = create_pbr_mat("Heavy_Denim_Jeans", (0.13, 0.18, 0.32), roughness=0.85, metallic=0.0)
    mat_boots_leather = create_pbr_mat("Work_Boots_OiledLeather", (0.15, 0.10, 0.07), roughness=0.62, metallic=0.05)
    mat_boots_sole = create_pbr_mat("Boots_LuggedRubber", (0.08, 0.08, 0.09), roughness=0.82, metallic=0.15)
    
    mat_hammer_steel = create_pbr_mat("SchmidtHammer_Steel", (0.88, 0.89, 0.91), roughness=0.18, metallic=0.95)
    mat_hammer_grip = create_pbr_mat("SchmidtHammer_GripRed", (0.78, 0.12, 0.10), roughness=0.42, metallic=0.05)
    mat_walkie = create_pbr_mat("WalkieTalkie_BlackABS", (0.08, 0.08, 0.09), roughness=0.45, metallic=0.1)

    mesh_objects = []

    def add_mesh_obj(name, prim_type, size, loc, rot=(0,0,0), scale=(1,1,1), mat=None, vgroup="Chest"):
        if prim_type == "sphere":
            bpy.ops.mesh.primitive_uv_sphere_add(radius=size[0], segments=24, ring_count=16, location=loc)
        elif prim_type == "cylinder":
            bpy.ops.mesh.primitive_cylinder_add(radius=size[0], depth=size[1], vertices=20, location=loc)
        elif prim_type == "box":
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
            bpy.context.active_object.scale = size
        elif prim_type == "cone":
            bpy.ops.mesh.primitive_cone_add(radius1=size[0], depth=size[1], vertices=16, location=loc)

        obj = bpy.context.active_object
        obj.name = name
        obj.rotation_euler = (math.radians(rot[0]), math.radians(rot[1]), math.radians(rot[2]))
        if prim_type != "box" and scale != (1,1,1):
            obj.scale = scale
        bpy.ops.object.transform_apply(scale=True, rotation=True)
        
        # Shade Smooth for organic beauty
        for poly in obj.data.polygons:
            poly.use_smooth = True
            
        if mat:
            obj.data.materials.append(mat)
            
        vg = obj.vertex_groups.new(name=vgroup)
        verts = [v.index for v in obj.data.vertices]
        vg.add(verts, 1.0, 'REPLACE')
        mesh_objects.append(obj)
        return obj

    # ═══════════════════════════════════════════════════════════════════════════
    # 2. ANATOMICAL HEAD & FACIAL FEATURES (1.68m Filipino Civil Works Foreman)
    # ═══════════════════════════════════════════════════════════════════════════
    # Cranium & Facial Base
    add_mesh_obj("Head_Cranium", "sphere", [0.118], (0, 0, 1.58), scale=(0.88, 1.02, 1.04), mat=mat_skin, vgroup="Head")
    add_mesh_obj("Head_Jawline", "box", [0.125, 0.135, 0.085], (0, 0.035, 1.515), mat=mat_skin, vgroup="Head")
    add_mesh_obj("Head_Chin", "sphere", [0.035], (0, 0.095, 1.485), scale=(1.2, 1.0, 0.8), mat=mat_skin, vgroup="Head")
    
    # Facial Contours: Nose, Mustache, Lips
    add_mesh_obj("Nose_Bridge", "box", [0.024, 0.045, 0.055], (0, 0.115, 1.565), rot=(15, 0, 0), mat=mat_skin, vgroup="Head")
    add_mesh_obj("Nose_Tip", "sphere", [0.018], (0, 0.132, 1.545), scale=(1.1, 0.9, 0.9), mat=mat_skin, vgroup="Head")
    add_mesh_obj("Nose_NostrilL", "sphere", [0.010], (-0.016, 0.125, 1.542), mat=mat_skin, vgroup="Head")
    add_mesh_obj("Nose_NostrilR", "sphere", [0.010], (0.016, 0.125, 1.542), mat=mat_skin, vgroup="Head")
    add_mesh_obj("Mustache", "box", [0.075, 0.022, 0.018], (0, 0.118, 1.520), mat=mat_hair, vgroup="Head")
    add_mesh_obj("LowerLip", "box", [0.052, 0.020, 0.014], (0, 0.112, 1.502), mat=mat_skin, vgroup="Head")
    
    # Eyes & Eyeballs
    add_mesh_obj("EyeSclera_L", "sphere", [0.017], (-0.044, 0.098, 1.580), mat=mat_sclera, vgroup="Head")
    add_mesh_obj("EyeSclera_R", "sphere", [0.017], (0.044, 0.098, 1.580), mat=mat_sclera, vgroup="Head")
    add_mesh_obj("EyePupil_L", "sphere", [0.010], (-0.044, 0.110, 1.580), mat=mat_eyes, vgroup="Head")
    add_mesh_obj("EyePupil_R", "sphere", [0.010], (0.044, 0.110, 1.580), mat=mat_eyes, vgroup="Head")
    add_mesh_obj("Eyebrow_L", "box", [0.040, 0.018, 0.010], (-0.045, 0.108, 1.602), rot=(0, -8, 0), mat=mat_hair, vgroup="Head")
    add_mesh_obj("Eyebrow_R", "box", [0.040, 0.018, 0.010], (0.045, 0.108, 1.602), rot=(0, 8, 0), mat=mat_hair, vgroup="Head")
    
    # Ears
    add_mesh_obj("Ear_L", "box", [0.020, 0.038, 0.065], (-0.114, 0.0, 1.565), rot=(0, 5, -8), mat=mat_skin, vgroup="Head")
    add_mesh_obj("Ear_R", "box", [0.020, 0.038, 0.065], (0.114, 0.0, 1.565), rot=(0, -5, 8), mat=mat_skin, vgroup="Head")
    
    # Crop Hair under Hardhat
    add_mesh_obj("HairBase", "sphere", [0.124], (0, -0.02, 1.605), scale=(0.92, 1.04, 0.82), mat=mat_hair, vgroup="Head")

    # ═══════════════════════════════════════════════════════════════════════════
    # 3. YELLOW SCIC SAFETY HARDHAT (Ergonomic Shell with Rain Brim & Logo)
    # ═══════════════════════════════════════════════════════════════════════════
    add_mesh_obj("Hardhat_Dome", "sphere", [0.146], (0, 0.01, 1.660), scale=(0.94, 1.14, 0.78), mat=mat_hardhat_yellow, vgroup="Head")
    add_mesh_obj("Hardhat_CrownRidge", "box", [0.038, 0.28, 0.042], (0, 0.015, 1.735), mat=mat_hardhat_yellow, vgroup="Head")
    add_mesh_obj("Hardhat_Brim", "cylinder", [0.170, 0.022], (0, 0.020, 1.632), scale=(0.96, 1.20, 1.0), mat=mat_hardhat_yellow, vgroup="Head")
    add_mesh_obj("Hardhat_EdgeBead", "cylinder", [0.174, 0.012], (0, 0.020, 1.624), scale=(0.96, 1.20, 1.0), mat=mat_hardhat_brim, vgroup="Head")
    # Front SCIC Logo Emblem
    add_mesh_obj("Hardhat_SCIC_Logo", "box", [0.055, 0.008, 0.035], (0, 0.170, 1.685), rot=(-18, 0, 0), mat=mat_scic_badge, vgroup="Head")
    # Chin Strap
    add_mesh_obj("Hardhat_StrapL", "cylinder", [0.006, 0.16], (-0.105, 0.01, 1.55), rot=(15, 0, -12), mat=mat_hardhat_brim, vgroup="Head")
    add_mesh_obj("Hardhat_StrapR", "cylinder", [0.006, 0.16], (0.105, 0.01, 1.55), rot=(15, 0, 12), mat=mat_hardhat_brim, vgroup="Head")

    # ═══════════════════════════════════════════════════════════════════════════
    # 4. NECK & UPPER BODY (Shirt, Amber/Navy Safety Vest, 3M Retroreflective Tape)
    # ═══════════════════════════════════════════════════════════════════════════
    # Neck with anatomical angle
    add_mesh_obj("Neck_Column", "cylinder", [0.072, 0.13], (0, 0.01, 1.455), rot=(6, 0, 0), mat=mat_skin, vgroup="Neck")
    # Heather Grey Work Crewneck Collar
    add_mesh_obj("Shirt_Collar", "cylinder", [0.088, 0.05], (0, 0.01, 1.415), rot=(6, 0, 0), mat=mat_shirt_grey, vgroup="Chest")
    
    # Muscular Upper Torso & Amber Heavy Safety Vest
    add_mesh_obj("Vest_MainTorso", "box", [0.385, 0.245, 0.32], (0, 0, 1.30), mat=mat_vest_amber, vgroup="Chest")
    # Navy Blue Shoulder Yokes (SCIC Civil Supervisor Designator)
    add_mesh_obj("Vest_YokeL", "box", [0.185, 0.252, 0.11], (-0.105, 0, 1.415), mat=mat_vest_navy, vgroup="Chest")
    add_mesh_obj("Vest_YokeR", "box", [0.185, 0.252, 0.11], (0.105, 0, 1.415), mat=mat_vest_navy, vgroup="Chest")
    
    # 3M Retroreflective Tape Bands (Front, Back, and Vertical Harness)
    add_mesh_obj("Reflective_Band_Upper", "box", [0.392, 0.252, 0.045], (0, 0, 1.285), mat=mat_tape_3m, vgroup="Chest")
    add_mesh_obj("Reflective_Band_Lower", "box", [0.392, 0.252, 0.045], (0, 0, 1.175), mat=mat_tape_3m, vgroup="Spine")
    add_mesh_obj("Reflective_Vertical_L", "box", [0.045, 0.254, 0.22], (-0.11, 0, 1.35), mat=mat_tape_3m, vgroup="Chest")
    add_mesh_obj("Reflective_Vertical_R", "box", [0.045, 0.254, 0.22], (0.11, 0, 1.35), mat=mat_tape_3m, vgroup="Chest")
    
    # Vest Pockets & Site Equipment
    # Walkie-Talkie Radio on Left Chest
    add_mesh_obj("Walkie_Body", "box", [0.055, 0.038, 0.115], (-0.13, 0.145, 1.33), mat=mat_walkie, vgroup="Chest")
    add_mesh_obj("Walkie_Antenna", "cylinder", [0.005, 0.12], (-0.14, 0.145, 1.43), mat=mat_walkie, vgroup="Chest")
    # Clear Laminated ID Badge with Photo
    add_mesh_obj("ID_Badge", "box", [0.065, 0.010, 0.09], (0.11, 0.132, 1.33), rot=(0, 0, -4), mat=mat_tape_3m, vgroup="Chest")
    # Twin Bellows Cargo Pockets on Lower Vest
    add_mesh_obj("CargoPocket_L", "box", [0.11, 0.035, 0.10], (-0.11, 0.138, 1.13), mat=mat_vest_amber, vgroup="Spine")
    add_mesh_obj("CargoPocket_R", "box", [0.11, 0.035, 0.10], (0.11, 0.138, 1.13), mat=mat_vest_amber, vgroup="Spine")

    # Midriff & Spine
    add_mesh_obj("Midriff_Body", "box", [0.355, 0.230, 0.16], (0, 0, 1.09), mat=mat_vest_amber, vgroup="Spine")

    # ═══════════════════════════════════════════════════════════════════════════
    # 5. HEAVY LEATHER TOOL BELT & ACCESSORIES
    # ═══════════════════════════════════════════════════════════════════════════
    add_mesh_obj("ToolBelt_Band", "box", [0.370, 0.250, 0.085], (0, 0, 1.005), mat=mat_leather_belt, vgroup="Hips")
    add_mesh_obj("ToolBelt_Buckle", "box", [0.085, 0.032, 0.095], (0, 0.128, 1.005), mat=mat_brass_buckle, vgroup="Hips")
    # 5m Stanley Tape Measure Pouch on Right Hip
    add_mesh_obj("TapePouch_Leather", "box", [0.085, 0.085, 0.085], (0.205, 0.02, 0.98), mat=mat_leather_belt, vgroup="Hips")
    add_mesh_obj("TapeMeasure_Body", "cylinder", [0.034, 0.045], (0.205, 0.02, 0.98), rot=(0, 90, 0), mat=mat_stanley_tape, vgroup="Hips")
    # Steel Tape Hook
    add_mesh_obj("TapeHook_Steel", "box", [0.015, 0.025, 0.025], (0.21, 0.065, 0.96), mat=mat_hammer_steel, vgroup="Hips")

    # Pelvis & Trousers
    add_mesh_obj("Pelvis_Jeans", "box", [0.345, 0.225, 0.16], (0, 0, 0.915), mat=mat_jeans, vgroup="Hips")

    # ═══════════════════════════════════════════════════════════════════════════
    # 6. ARMS & HANDS WITH SCHMIDT REBOUND TEST HAMMER
    # ═══════════════════════════════════════════════════════════════════════════
    # Left Arm: Heather grey rolled work sleeve, tanned forearm, sculpted hand
    add_mesh_obj("ShoulderDeltoid_L", "sphere", [0.085], (-0.235, 0, 1.365), scale=(0.9, 1.0, 1.1), mat=mat_shirt_grey, vgroup="UpperArm.L")
    add_mesh_obj("UpperArm_Sleeve_L", "cylinder", [0.068, 0.22], (-0.25, 0, 1.25), rot=(0, 12, 0), mat=mat_shirt_grey, vgroup="UpperArm.L")
    add_mesh_obj("Forearm_Skin_L", "cylinder", [0.056, 0.24], (-0.27, 0.02, 1.02), rot=(6, 0, 0), mat=mat_skin, vgroup="Forearm.L")
    # Left Hand (Palm, Thumb, Fingers)
    add_mesh_obj("HandPalm_L", "box", [0.048, 0.078, 0.075], (-0.28, 0.035, 0.87), mat=mat_skin, vgroup="Hand.L")
    add_mesh_obj("Thumb_L", "cylinder", [0.014, 0.045], (-0.25, 0.065, 0.88), rot=(-25, 0, 30), mat=mat_skin, vgroup="Hand.L")
    add_mesh_obj("Fingers_L", "box", [0.044, 0.045, 0.065], (-0.285, 0.04, 0.81), mat=mat_skin, vgroup="Hand.L")

    # Right Arm: Holding Schmidt Concrete Rebound Test Hammer
    add_mesh_obj("ShoulderDeltoid_R", "sphere", [0.085], (0.235, 0, 1.365), scale=(0.9, 1.0, 1.1), mat=mat_shirt_grey, vgroup="UpperArm.R")
    add_mesh_obj("UpperArm_Sleeve_R", "cylinder", [0.068, 0.22], (0.25, 0, 1.25), rot=(0, -12, 0), mat=mat_shirt_grey, vgroup="UpperArm.R")
    add_mesh_obj("Forearm_Skin_R", "cylinder", [0.056, 0.24], (0.27, 0.02, 1.02), rot=(6, 0, 0), mat=mat_skin, vgroup="Forearm.R")
    # Right Hand firmly grasping hammer
    add_mesh_obj("HandPalm_R", "box", [0.048, 0.078, 0.075], (0.28, 0.035, 0.87), mat=mat_skin, vgroup="Hand.R")
    add_mesh_obj("Thumb_R", "cylinder", [0.014, 0.045], (0.25, 0.065, 0.88), rot=(-25, 0, -30), mat=mat_skin, vgroup="Hand.R")
    add_mesh_obj("Fingers_R", "box", [0.044, 0.045, 0.065], (0.285, 0.04, 0.81), mat=mat_skin, vgroup="Hand.R")

    # High-Detail Schmidt Concrete Rebound Hammer
    # Alloy Barrel with graduated impact scale
    add_mesh_obj("Hammer_Barrel", "cylinder", [0.028, 0.28], (0.29, 0.12, 0.83), rot=(82, 0, 0), mat=mat_hammer_steel, vgroup="Hand.R")
    # Red Rubber Ergonomic Grip
    add_mesh_obj("Hammer_Grip", "cylinder", [0.033, 0.13], (0.29, 0.04, 0.84), rot=(82, 0, 0), mat=mat_hammer_grip, vgroup="Hand.R")
    # Hardened Steel Impact Plunger (Tip)
    add_mesh_obj("Hammer_Plunger", "cylinder", [0.013, 0.09], (0.29, 0.28, 0.81), rot=(82, 0, 0), mat=mat_hammer_steel, vgroup="Hand.R")
    # Scale Reading Window on Barrel
    add_mesh_obj("Hammer_ScaleWindow", "box", [0.018, 0.08, 0.012], (0.29, 0.14, 0.86), rot=(82, 0, 0), mat=mat_tape_3m, vgroup="Hand.R")

    # ═══════════════════════════════════════════════════════════════════════════
    # 7. LEGS & HEAVY-DUTY STEEL-TOE WORK BOOTS
    # ═══════════════════════════════════════════════════════════════════════════
    # Left Leg (Indigo denim jeans, knee articulation)
    add_mesh_obj("Thigh_Denim_L", "cylinder", [0.092, 0.38], (-0.122, 0, 0.69), mat=mat_jeans, vgroup="Thigh.L")
    add_mesh_obj("KneeCap_L", "sphere", [0.082], (-0.122, 0.02, 0.50), scale=(0.95, 1.05, 0.9), mat=mat_jeans, vgroup="Thigh.L")
    add_mesh_obj("Shin_Denim_L", "cylinder", [0.078, 0.38], (-0.122, 0.005, 0.31), mat=mat_jeans, vgroup="Shin.L")
    # Steel-Toe Boot Left
    add_mesh_obj("Boot_Ankle_L", "cylinder", [0.082, 0.12], (-0.122, 0.02, 0.14), mat=mat_boots_leather, vgroup="Foot.L")
    add_mesh_obj("Boot_Foot_L", "box", [0.115, 0.25, 0.11], (-0.122, 0.04, 0.065), mat=mat_boots_leather, vgroup="Foot.L")
    add_mesh_obj("Boot_ToeCap_L", "sphere", [0.065], (-0.122, 0.125, 0.065), scale=(1.05, 1.15, 0.85), mat=mat_boots_leather, vgroup="Foot.L")
    add_mesh_obj("Boot_Sole_L", "box", [0.125, 0.27, 0.035], (-0.122, 0.04, 0.018), mat=mat_boots_sole, vgroup="Foot.L")

    # Right Leg
    add_mesh_obj("Thigh_Denim_R", "cylinder", [0.092, 0.38], (0.122, 0, 0.69), mat=mat_jeans, vgroup="Thigh.R")
    add_mesh_obj("KneeCap_R", "sphere", [0.082], (0.122, 0.02, 0.50), scale=(0.95, 1.05, 0.9), mat=mat_jeans, vgroup="Thigh.R")
    add_mesh_obj("Shin_Denim_R", "cylinder", [0.078, 0.38], (0.122, 0.005, 0.31), mat=mat_jeans, vgroup="Shin.R")
    # Steel-Toe Boot Right
    add_mesh_obj("Boot_Ankle_R", "cylinder", [0.082, 0.12], (0.122, 0.02, 0.14), mat=mat_boots_leather, vgroup="Foot.R")
    add_mesh_obj("Boot_Foot_R", "box", [0.115, 0.25, 0.11], (0.122, 0.04, 0.065), mat=mat_boots_leather, vgroup="Foot.R")
    add_mesh_obj("Boot_ToeCap_R", "sphere", [0.065], (0.122, 0.125, 0.065), scale=(1.05, 1.15, 0.85), mat=mat_boots_leather, vgroup="Foot.R")
    add_mesh_obj("Boot_Sole_R", "box", [0.125, 0.27, 0.035], (0.122, 0.04, 0.018), mat=mat_boots_sole, vgroup="Foot.R")

    # ═══════════════════════════════════════════════════════════════════════════
    # 8. JOIN INTO UNIFIED MESH & APPLY SMOOTHING
    # ═══════════════════════════════════════════════════════════════════════════
    bpy.ops.object.select_all(action='DESELECT')
    for obj in mesh_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = mesh_objects[0]
    bpy.ops.object.join()
    foreman_mesh = bpy.context.active_object
    foreman_mesh.name = "SCIC_Foreman_HighDetail_Mesh"

    # ═══════════════════════════════════════════════════════════════════════════
    # 9. CONSTRUCT 18-BONE SKELETAL HUMANOID ARMATURE
    # ═══════════════════════════════════════════════════════════════════════════
    arm_data = bpy.data.armatures.new("Foreman_ArmatureData")
    arm_obj = bpy.data.objects.new("Foreman_Armature", arm_data)
    bpy.context.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='EDIT')
    edit_bones = arm_data.edit_bones

    def add_bone(name, head, tail, parent_name=None):
        b = edit_bones.new(name)
        b.head = head
        b.tail = tail
        if parent_name and parent_name in edit_bones:
            b.parent = edit_bones[parent_name]
        return b

    # Spine chain
    add_bone("Root", (0, 0, 0), (0, 0, 0.10))
    add_bone("Hips", (0, 0, 0.88), (0, 0, 1.02), "Root")
    add_bone("Spine", (0, 0, 1.02), (0, 0, 1.18), "Hips")
    add_bone("Chest", (0, 0, 1.18), (0, 0, 1.44), "Spine")
    add_bone("Neck", (0, 0, 1.44), (0, 0, 1.52), "Chest")
    add_bone("Head", (0, 0, 1.52), (0, 0, 1.76), "Neck")

    # Arms
    add_bone("UpperArm.L", (-0.22, 0, 1.38), (-0.26, 0, 1.14), "Chest")
    add_bone("Forearm.L", (-0.26, 0, 1.14), (-0.27, 0, 0.90), "UpperArm.L")
    add_bone("Hand.L", (-0.27, 0, 0.90), (-0.27, 0, 0.78), "Forearm.L")

    add_bone("UpperArm.R", (0.22, 0, 1.38), (0.26, 0, 1.14), "Chest")
    add_bone("Forearm.R", (0.26, 0, 1.14), (0.28, 0, 0.90), "UpperArm.R")
    add_bone("Hand.R", (0.28, 0, 0.90), (0.28, 0, 0.78), "Forearm.R")

    # Legs
    add_bone("Thigh.L", (-0.12, 0, 0.88), (-0.12, 0, 0.50), "Hips")
    add_bone("Shin.L", (-0.12, 0, 0.50), (-0.12, 0, 0.12), "Thigh.L")
    add_bone("Foot.L", (-0.12, 0, 0.12), (-0.12, 0.16, 0.02), "Shin.L")

    add_bone("Thigh.R", (0.12, 0, 0.88), (0.12, 0, 0.50), "Hips")
    add_bone("Shin.R", (0.12, 0, 0.50), (0.12, 0, 0.12), "Thigh.R")
    add_bone("Foot.R", (0.12, 0, 0.12), (0.12, 0.16, 0.02), "Shin.R")

    bpy.ops.object.mode_set(mode='OBJECT')

    # Bind Mesh with Armature Modifier
    arm_mod = foreman_mesh.modifiers.new(name="Armature", type='ARMATURE')
    arm_mod.object = arm_obj
    foreman_mesh.parent = arm_obj

    # ═══════════════════════════════════════════════════════════════════════════
    # 10. AUTHENTIC KEYFRAME ANIMATION ACTIONS (Idle, Walk, Inspect, Wave)
    # ═══════════════════════════════════════════════════════════════════════════
    arm_obj.animation_data_create()
    pbones = arm_obj.pose.bones

    def set_bone_rot(pb, rx, ry, rz, frame):
        pb.rotation_mode = 'XYZ'
        pb.rotation_euler = (math.radians(rx), math.radians(ry), math.radians(rz))
        pb.keyframe_insert(data_path="rotation_euler", frame=frame)

    # ── ACTION 1: FOREMAN_IDLE (Organic breathing, weight shifting, scanning jobsite) ──
    act_idle = bpy.data.actions.new("Foreman_Idle")
    arm_obj.animation_data.action = act_idle

    for f in [1, 60]:
        set_bone_rot(pbones["Chest"], 1.5, 0, 0, f)
        set_bone_rot(pbones["Head"], 0, 0, 0, f)
        set_bone_rot(pbones["UpperArm.L"], 8, 4, -12, f)
        set_bone_rot(pbones["Forearm.L"], 32, 0, 0, f)
        set_bone_rot(pbones["UpperArm.R"], 8, -4, 12, f)
        set_bone_rot(pbones["Forearm.R"], 32, 0, 0, f)
        set_bone_rot(pbones["Hips"], 0, 0, 0, f)
    # Natural inhalation and survey head sweep
    set_bone_rot(pbones["Chest"], -2.2, 0, 0, 30)
    set_bone_rot(pbones["Head"], -2, 0, 22, 22)
    set_bone_rot(pbones["Head"], -2, 0, -22, 44)
    set_bone_rot(pbones["Hips"], 1.2, 0, 1.8, 30)

    # ── ACTION 2: FOREMAN_WALK (Grounded, natural 1.25 m/s construction site stride) ──
    act_walk = bpy.data.actions.new("Foreman_Walk")
    arm_obj.animation_data.action = act_walk

    walk_keys = [
        # Frame 1: Left contact forward, right foot trailing
        (1, {"Thigh.L": 26, "Shin.L": -8, "Foot.L": 8, "Thigh.R": -24, "Shin.R": -12, "Foot.R": -8, "UpperArm.L": -18, "Forearm.L": 28, "UpperArm.R": 22, "Forearm.R": 40, "Hips": -2, "Chest": 2}),
        # Frame 9: Left passing, right swinging forward
        (9, {"Thigh.L": 0, "Shin.L": -4, "Foot.L": 0, "Thigh.R": 14, "Shin.R": -45, "Foot.R": 15, "UpperArm.L": 2, "Forearm.L": 20, "UpperArm.R": -4, "Forearm.R": 28, "Hips": 0, "Chest": 0}),
        # Frame 18: Right contact forward, left foot trailing
        (18, {"Thigh.L": -24, "Shin.L": -12, "Foot.L": -8, "Thigh.R": 26, "Shin.R": -8, "Foot.R": 8, "UpperArm.L": 22, "Forearm.L": 40, "UpperArm.R": -18, "Forearm.R": 28, "Hips": 2, "Chest": -2}),
        # Frame 27: Right passing, left swinging forward
        (27, {"Thigh.L": 14, "Shin.L": -45, "Foot.L": 15, "Thigh.R": 0, "Shin.R": -4, "Foot.R": 0, "UpperArm.L": -4, "Forearm.L": 28, "UpperArm.R": 2, "Forearm.R": 20, "Hips": 0, "Chest": 0}),
        # Frame 36: Seamless loop back to Left contact
        (36, {"Thigh.L": 26, "Shin.L": -8, "Foot.L": 8, "Thigh.R": -24, "Shin.R": -12, "Foot.R": -8, "UpperArm.L": -18, "Forearm.L": 28, "UpperArm.R": 22, "Forearm.R": 40, "Hips": -2, "Chest": 2}),
    ]
    for frame, poses in walk_keys:
        for bname, rx in poses.items():
            if bname in pbones:
                set_bone_rot(pbones[bname], rx, 0, 0, frame)

    # ── ACTION 3: FOREMAN_INSPECT (Bending / kneeling to test concrete with hammer) ──
    act_inspect = bpy.data.actions.new("Foreman_Inspect")
    arm_obj.animation_data.action = act_inspect

    for f in [1, 72]:
        set_bone_rot(pbones["Hips"], 0, 0, 0, f)
        set_bone_rot(pbones["Spine"], 0, 0, 0, f)
        set_bone_rot(pbones["Chest"], 0, 0, 0, f)
        set_bone_rot(pbones["Head"], 0, 0, 0, f)
        set_bone_rot(pbones["UpperArm.R"], 8, 0, 10, f)
        set_bone_rot(pbones["Forearm.R"], 20, 0, 0, f)
    for f in [24, 48]:
        set_bone_rot(pbones["Hips"], -15, 0, 0, f)
        set_bone_rot(pbones["Spine"], 25, 0, 0, f)
        set_bone_rot(pbones["Chest"], 25, 0, 0, f)
        set_bone_rot(pbones["Head"], 30, 0, 0, f)
        set_bone_rot(pbones["Thigh.L"], 45, 0, 0, f)
        set_bone_rot(pbones["Shin.L"], -65, 0, 0, f)
        set_bone_rot(pbones["Thigh.R"], 55, 0, 0, f)
        set_bone_rot(pbones["Shin.R"], -75, 0, 0, f)
        set_bone_rot(pbones["UpperArm.R"], 45, 0, 15, f)
        set_bone_rot(pbones["Forearm.R"], 55, 0, 0, f)

    # ── ACTION 4: FOREMAN_WAVE (Signaling concrete mixer or safety clearance) ──
    act_wave = bpy.data.actions.new("Foreman_Wave")
    arm_obj.animation_data.action = act_wave

    for f in [1, 48]:
        set_bone_rot(pbones["UpperArm.R"], 8, 0, 10, f)
        set_bone_rot(pbones["Forearm.R"], 20, 0, 0, f)
        set_bone_rot(pbones["Hand.R"], 0, 0, 0, f)
        set_bone_rot(pbones["Head"], 0, 0, 0, f)
    set_bone_rot(pbones["UpperArm.R"], -65, 0, 45, 14)
    set_bone_rot(pbones["Forearm.R"], 65, 0, 0, 14)
    set_bone_rot(pbones["Hand.R"], 0, 0, -25, 20)
    set_bone_rot(pbones["Hand.R"], 0, 0, 25, 28)
    set_bone_rot(pbones["Hand.R"], 0, 0, -25, 34)
    set_bone_rot(pbones["UpperArm.R"], -65, 0, 45, 36)
    set_bone_rot(pbones["Forearm.R"], 65, 0, 0, 36)

    # Set default action to Walk
    arm_obj.animation_data.action = act_walk

    # ═══════════════════════════════════════════════════════════════════════════
    # 11. EXPORT .BLEND AND ANIMATED .GLB WITH ALL 4 ACTIONS
    # ═══════════════════════════════════════════════════════════════════════════
    blend_path = os.path.join(out_dir, "scic_civil_foreman.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"Saved {blend_path}")

    glb_path = os.path.join(out_dir, "scic_civil_foreman.glb")
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        use_selection=False,
        export_animations=True,
        export_apply=False
    )
    print(f"Exported {glb_path}: {os.path.getsize(glb_path)} bytes")

create_foreman()
print("=== SCIC CIVIL FOREMAN GENERATION COMPLETE ===")
