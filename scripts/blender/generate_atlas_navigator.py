import bpy
import math
import os

print("=== GENERATING SCIC ATLAS NAVIGATOR 3D RIGGED CHARACTER ===")

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
                bsdf.inputs["Emission Strength"].default_value = 2.0
        if sss > 0 and "Subsurface Weight" in bsdf.inputs:
            bsdf.inputs["Subsurface Weight"].default_value = sss
        elif sss > 0 and "Subsurface" in bsdf.inputs:
            bsdf.inputs["Subsurface"].default_value = sss
    return mat

def create_navigator():
    clear_scene()

    # ═══════════════════════════════════════════════════════════════════════════
    # 1. PBR MATERIALS FOR CORPORATE / TECHNICAL NAVIGATOR
    # ═══════════════════════════════════════════════════════════════════════════
    mat_skin = create_pbr_mat("Navigator_Skin", (0.72, 0.52, 0.40), roughness=0.52, metallic=0.0, specular=0.5, sss=0.12)
    mat_hair = create_pbr_mat("Navigator_HairDark", (0.08, 0.07, 0.07), roughness=0.80, metallic=0.0)
    mat_eyes = create_pbr_mat("Navigator_Eyes", (0.12, 0.08, 0.05), roughness=0.05, metallic=0.05, specular=0.95)
    mat_sclera = create_pbr_mat("Navigator_Sclera", (0.94, 0.94, 0.92), roughness=0.1, specular=0.8)

    # Dark Navy Technical Jacket & Corporate Detailing
    mat_jacket_navy = create_pbr_mat("Navigator_JacketNavy", (0.05, 0.09, 0.18), roughness=0.62, metallic=0.05)
    mat_jacket_trim = create_pbr_mat("Navigator_JacketTrim", (0.03, 0.06, 0.12), roughness=0.75, metallic=0.0)
    mat_scic_cyan = create_pbr_mat("Navigator_SCICCyanAccent", (0.0, 0.75, 0.95), roughness=0.25, metallic=0.3, emissive=(0.0, 0.55, 0.85))
    mat_scic_gold = create_pbr_mat("Navigator_GoldAccent", (0.92, 0.70, 0.15), roughness=0.3, metallic=0.7)
    mat_zipper_silver = create_pbr_mat("Navigator_ZipperSilver", (0.85, 0.88, 0.90), roughness=0.2, metallic=0.9)

    # Inner Technical Shirt
    mat_shirt_slate = create_pbr_mat("Navigator_ShirtSlate", (0.15, 0.18, 0.24), roughness=0.82, metallic=0.0)

    # Wrist Terminal / GIS Smart Pad
    mat_terminal_body = create_pbr_mat("Navigator_TerminalBody", (0.04, 0.05, 0.08), roughness=0.35, metallic=0.4)
    mat_terminal_screen = create_pbr_mat("Navigator_TerminalScreen", (0.02, 0.45, 0.75), roughness=0.1, metallic=0.1, emissive=(0.0, 0.65, 0.95))

    # Trousers & Boots
    mat_trousers = create_pbr_mat("Navigator_TrousersCharcoal", (0.10, 0.12, 0.16), roughness=0.78, metallic=0.0)
    mat_boots_leather = create_pbr_mat("Navigator_BootsBlack", (0.08, 0.08, 0.09), roughness=0.55, metallic=0.1)
    mat_boots_sole = create_pbr_mat("Navigator_BootsSole", (0.05, 0.05, 0.05), roughness=0.85, metallic=0.0)

    # Holographic Ring Emitter (wrist & pedestal)
    mat_holo_emitter = create_pbr_mat("Navigator_HoloEmitter", (0.0, 0.85, 1.0), roughness=0.1, metallic=0.1, emissive=(0.0, 0.8, 1.0))

    mesh_objects = []

    def add_mesh(name, prim_type, size, loc, rot=(0,0,0), scale=(1,1,1), mat=None, vgroup="Chest"):
        if prim_type == "sphere":
            bpy.ops.mesh.primitive_uv_sphere_add(radius=size[0], segments=20, ring_count=14, location=loc)
        elif prim_type == "cylinder":
            bpy.ops.mesh.primitive_cylinder_add(radius=size[0], depth=size[1], vertices=16, location=loc)
        elif prim_type == "box":
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
            bpy.context.active_object.scale = size
        elif prim_type == "cone":
            bpy.ops.mesh.primitive_cone_add(radius1=size[0], depth=size[1], vertices=14, location=loc)
        elif prim_type == "torus":
            bpy.ops.mesh.primitive_torus_add(major_radius=size[0], minor_radius=size[1], location=loc)

        obj = bpy.context.active_object
        obj.name = name
        obj.rotation_euler = (math.radians(rot[0]), math.radians(rot[1]), math.radians(rot[2]))
        if prim_type != "box" and scale != (1,1,1):
            obj.scale = scale
        bpy.ops.object.transform_apply(scale=True, rotation=True)

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
    # 2. ANATOMICAL HEAD & PROFESSIONAL FACIAL FEATURES (~1.76m height)
    # ═══════════════════════════════════════════════════════════════════════════
    # Cranium & Jaw
    add_mesh("Head_Cranium", "sphere", [0.112], (0, 0, 1.62), scale=(0.88, 1.02, 1.06), mat=mat_skin, vgroup="Head")
    add_mesh("Head_Jaw", "box", [0.118, 0.128, 0.082], (0, 0.032, 1.555), mat=mat_skin, vgroup="Head")
    add_mesh("Head_Chin", "sphere", [0.032], (0, 0.090, 1.525), scale=(1.15, 1.0, 0.8), mat=mat_skin, vgroup="Head")

    # Nose & Features
    add_mesh("Nose_Bridge", "box", [0.022, 0.040, 0.052], (0, 0.108, 1.602), rot=(14, 0, 0), mat=mat_skin, vgroup="Head")
    add_mesh("Nose_Tip", "sphere", [0.016], (0, 0.124, 1.582), scale=(1.05, 0.9, 0.9), mat=mat_skin, vgroup="Head")
    add_mesh("Lips", "box", [0.048, 0.018, 0.012], (0, 0.104, 1.542), mat=mat_skin, vgroup="Head")

    # Eyes & Eyebrows
    add_mesh("EyeSclera_L", "sphere", [0.016], (-0.042, 0.092, 1.616), mat=mat_sclera, vgroup="Head")
    add_mesh("EyeSclera_R", "sphere", [0.016], (0.042, 0.092, 1.616), mat=mat_sclera, vgroup="Head")
    add_mesh("EyePupil_L", "sphere", [0.009], (-0.042, 0.104, 1.616), mat=mat_eyes, vgroup="Head")
    add_mesh("EyePupil_R", "sphere", [0.009], (0.042, 0.104, 1.616), mat=mat_eyes, vgroup="Head")
    add_mesh("Eyebrow_L", "box", [0.038, 0.016, 0.008], (-0.044, 0.102, 1.636), rot=(0, -6, 0), mat=mat_hair, vgroup="Head")
    add_mesh("Eyebrow_R", "box", [0.038, 0.016, 0.008], (0.044, 0.102, 1.636), rot=(0, 6, 0), mat=mat_hair, vgroup="Head")

    # Ears
    add_mesh("Ear_L", "box", [0.018, 0.034, 0.058], (-0.108, 0.0, 1.602), rot=(0, 4, -6), mat=mat_skin, vgroup="Head")
    add_mesh("Ear_R", "box", [0.018, 0.034, 0.058], (0.108, 0.0, 1.602), rot=(0, -4, 6), mat=mat_skin, vgroup="Head")

    # Modern Stylized Professional Hair (Clean parted corporate style)
    add_mesh("Hair_Top", "sphere", [0.120], (0, -0.015, 1.675), scale=(0.94, 1.06, 0.65), mat=mat_hair, vgroup="Head")
    add_mesh("Hair_SideL", "box", [0.025, 0.14, 0.08], (-0.098, -0.01, 1.65), rot=(0, 5, 0), mat=mat_hair, vgroup="Head")
    add_mesh("Hair_SideR", "box", [0.025, 0.14, 0.08], (0.098, -0.01, 1.65), rot=(0, -5, 0), mat=mat_hair, vgroup="Head")
    add_mesh("Hair_Fringe", "box", [0.085, 0.035, 0.03], (0.01, 0.092, 1.685), rot=(-12, 4, -4), mat=mat_hair, vgroup="Head")

    # ═══════════════════════════════════════════════════════════════════════════
    # 3. NECK & DARK NAVY TECHNICAL CORPORATE JACKET
    # ═══════════════════════════════════════════════════════════════════════════
    add_mesh("Neck_Col", "cylinder", [0.065, 0.12], (0, 0.01, 1.49), rot=(5, 0, 0), mat=mat_skin, vgroup="Neck")
    # Technical Mandarin Stand Collar
    add_mesh("Jacket_Collar", "cylinder", [0.080, 0.065], (0, 0.01, 1.46), rot=(5, 0, 0), mat=mat_jacket_trim, vgroup="Chest")
    add_mesh("Jacket_Collar_Accent", "torus", [0.078, 0.007], (0, 0.01, 1.485), mat=mat_scic_cyan, vgroup="Chest")

    # Main Torso / Jacket
    add_mesh("Jacket_Torso", "box", [0.370, 0.235, 0.34], (0, 0, 1.32), mat=mat_jacket_navy, vgroup="Chest")
    # Inner Slate Tech-Shirt V-layer
    add_mesh("Inner_Shirt", "box", [0.14, 0.04, 0.18], (0, 0.105, 1.38), mat=mat_shirt_slate, vgroup="Chest")
    # Front Waterproof Zipper with Silver Pull
    add_mesh("Jacket_Zipper", "box", [0.018, 0.008, 0.32], (0, 0.122, 1.32), mat=mat_zipper_silver, vgroup="Chest")

    # SCIC Corporate Monogram / Crest Badge (Left Chest)
    add_mesh("SCIC_ChestBadge", "box", [0.055, 0.008, 0.038], (-0.11, 0.122, 1.37), rot=(0, 0, -2), mat=mat_scic_cyan, vgroup="Chest")
    add_mesh("SCIC_BadgeTrim", "box", [0.060, 0.004, 0.042], (-0.11, 0.120, 1.37), mat=mat_scic_gold, vgroup="Chest")

    # Right Chest Field Pen / Stylus Pocket & Cyan Accent Piping
    add_mesh("Jacket_Piping_R", "box", [0.008, 0.006, 0.22], (0.12, 0.122, 1.33), mat=mat_scic_cyan, vgroup="Chest")
    add_mesh("Jacket_Piping_L", "box", [0.008, 0.006, 0.22], (-0.12, 0.122, 1.24), mat=mat_scic_cyan, vgroup="Chest")

    # Midriff & Spine
    add_mesh("Jacket_Midriff", "box", [0.345, 0.220, 0.16], (0, 0, 1.10), mat=mat_jacket_navy, vgroup="Spine")
    add_mesh("Jacket_HemTrim", "box", [0.355, 0.228, 0.035], (0, 0, 1.02), mat=mat_jacket_trim, vgroup="Spine")

    # Pelvis & Dark Tailored Technical Trousers
    add_mesh("Pelvis_Pants", "box", [0.335, 0.215, 0.16], (0, 0, 0.94), mat=mat_trousers, vgroup="Hips")

    # ═══════════════════════════════════════════════════════════════════════════
    # 4. ARMS & HANDS WITH TACTICAL GIS WRIST TERMINAL
    # ═══════════════════════════════════════════════════════════════════════════
    # Left Arm (With GIS Holo-Wrist Console)
    add_mesh("Shoulder_L", "sphere", [0.080], (-0.225, 0, 1.39), scale=(0.95, 1.0, 1.1), mat=mat_jacket_navy, vgroup="UpperArm.L")
    add_mesh("UpperArm_Sleeve_L", "cylinder", [0.064, 0.23], (-0.245, 0, 1.27), rot=(0, 10, 0), mat=mat_jacket_navy, vgroup="UpperArm.L")
    add_mesh("Forearm_Sleeve_L", "cylinder", [0.055, 0.22], (-0.265, 0.02, 1.05), rot=(4, 0, 0), mat=mat_jacket_navy, vgroup="Forearm.L")

    # Tactical GIS Wrist Terminal / Hologram Emitter on Left Forearm
    add_mesh("WristTerminal_Base", "box", [0.065, 0.045, 0.075], (-0.265, 0.065, 0.96), rot=(15, 0, 0), mat=mat_terminal_body, vgroup="Forearm.L")
    add_mesh("WristTerminal_Screen", "box", [0.052, 0.004, 0.058], (-0.265, 0.090, 0.96), rot=(15, 0, 0), mat=mat_terminal_screen, vgroup="Forearm.L")
    add_mesh("WristTerminal_EmitterRing", "torus", [0.022, 0.003], (-0.265, 0.092, 0.98), rot=(15, 0, 0), mat=mat_holo_emitter, vgroup="Forearm.L")

    # Left Hand (Ergonomic relaxed grip ready to touch screen or gesture)
    add_mesh("Hand_L", "box", [0.042, 0.068, 0.072], (-0.275, 0.032, 0.88), mat=mat_skin, vgroup="Hand.L")
    add_mesh("Fingers_L", "box", [0.038, 0.040, 0.060], (-0.278, 0.036, 0.82), mat=mat_skin, vgroup="Hand.L")
    add_mesh("Thumb_L", "cylinder", [0.012, 0.040], (-0.248, 0.055, 0.89), rot=(-20, 0, 25), mat=mat_skin, vgroup="Hand.L")

    # Right Arm (Articulated for directional navigation gesture)
    add_mesh("Shoulder_R", "sphere", [0.080], (0.225, 0, 1.39), scale=(0.95, 1.0, 1.1), mat=mat_jacket_navy, vgroup="UpperArm.R")
    add_mesh("UpperArm_Sleeve_R", "cylinder", [0.064, 0.23], (0.245, 0, 1.27), rot=(0, -10, 0), mat=mat_jacket_navy, vgroup="UpperArm.R")
    add_mesh("Forearm_Sleeve_R", "cylinder", [0.055, 0.22], (0.265, 0.02, 1.05), rot=(4, 0, 0), mat=mat_jacket_navy, vgroup="Forearm.R")
    add_mesh("Hand_R", "box", [0.042, 0.068, 0.072], (0.275, 0.032, 0.88), mat=mat_skin, vgroup="Hand.R")
    add_mesh("Fingers_R", "box", [0.038, 0.040, 0.060], (0.278, 0.036, 0.82), mat=mat_skin, vgroup="Hand.R")
    add_mesh("Thumb_R", "cylinder", [0.012, 0.040], (0.248, 0.055, 0.89), rot=(-20, 0, -25), mat=mat_skin, vgroup="Hand.R")

    # ═══════════════════════════════════════════════════════════════════════════
    # 5. LEGS & TECHNICAL BLACK LEATHER WORK BOOTS
    # ═══════════════════════════════════════════════════════════════════════════
    # Left Leg
    add_mesh("Thigh_L", "cylinder", [0.088, 0.38], (-0.115, 0, 0.72), mat=mat_trousers, vgroup="Thigh.L")
    add_mesh("Knee_L", "sphere", [0.078], (-0.115, 0.015, 0.53), scale=(0.95, 1.05, 0.9), mat=mat_trousers, vgroup="Thigh.L")
    add_mesh("Shin_L", "cylinder", [0.074, 0.38], (-0.115, 0.005, 0.34), mat=mat_trousers, vgroup="Shin.L")
    # Boot Left
    add_mesh("Boot_Ankle_L", "cylinder", [0.078, 0.12], (-0.115, 0.015, 0.15), mat=mat_boots_leather, vgroup="Foot.L")
    add_mesh("Boot_Foot_L", "box", [0.108, 0.23, 0.10], (-0.115, 0.035, 0.075), mat=mat_boots_leather, vgroup="Foot.L")
    add_mesh("Boot_Sole_L", "box", [0.118, 0.25, 0.032], (-0.115, 0.035, 0.022), mat=mat_boots_sole, vgroup="Foot.L")

    # Right Leg
    add_mesh("Thigh_R", "cylinder", [0.088, 0.38], (0.115, 0, 0.72), mat=mat_trousers, vgroup="Thigh.R")
    add_mesh("Knee_R", "sphere", [0.078], (0.115, 0.015, 0.53), scale=(0.95, 1.05, 0.9), mat=mat_trousers, vgroup="Thigh.R")
    add_mesh("Shin_R", "cylinder", [0.074, 0.38], (0.115, 0.005, 0.34), mat=mat_trousers, vgroup="Shin.R")
    # Boot Right
    add_mesh("Boot_Ankle_R", "cylinder", [0.078, 0.12], (0.115, 0.015, 0.15), mat=mat_boots_leather, vgroup="Foot.R")
    add_mesh("Boot_Foot_R", "box", [0.108, 0.23, 0.10], (0.115, 0.035, 0.075), mat=mat_boots_leather, vgroup="Foot.R")
    add_mesh("Boot_Sole_R", "box", [0.118, 0.25, 0.032], (0.115, 0.035, 0.022), mat=mat_boots_sole, vgroup="Foot.R")

    # ═══════════════════════════════════════════════════════════════════════════
    # 6. JOIN UNIFIED MESH
    # ═══════════════════════════════════════════════════════════════════════════
    bpy.ops.object.select_all(action='DESELECT')
    for obj in mesh_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = mesh_objects[0]
    bpy.ops.object.join()
    navigator_mesh = bpy.context.active_object
    navigator_mesh.name = "SCIC_Atlas_Navigator_Mesh"

    # ═══════════════════════════════════════════════════════════════════════════
    # 7. SKELETAL HUMANOID ARMATURE
    # ═══════════════════════════════════════════════════════════════════════════
    arm_data = bpy.data.armatures.new("Navigator_ArmatureData")
    arm_obj = bpy.data.objects.new("Navigator_Armature", arm_data)
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
    add_bone("Hips", (0, 0, 0.90), (0, 0, 1.04), "Root")
    add_bone("Spine", (0, 0, 1.04), (0, 0, 1.20), "Hips")
    add_bone("Chest", (0, 0, 1.20), (0, 0, 1.48), "Spine")
    add_bone("Neck", (0, 0, 1.48), (0, 0, 1.56), "Chest")
    add_bone("Head", (0, 0, 1.56), (0, 0, 1.80), "Neck")

    # Arms
    add_bone("UpperArm.L", (-0.22, 0, 1.40), (-0.26, 0, 1.16), "Chest")
    add_bone("Forearm.L", (-0.26, 0, 1.16), (-0.27, 0, 0.92), "UpperArm.L")
    add_bone("Hand.L", (-0.27, 0, 0.92), (-0.27, 0, 0.80), "Forearm.L")

    add_bone("UpperArm.R", (0.22, 0, 1.40), (0.26, 0, 1.16), "Chest")
    add_bone("Forearm.R", (0.26, 0, 1.16), (0.28, 0, 0.92), "UpperArm.R")
    add_bone("Hand.R", (0.28, 0, 0.92), (0.28, 0, 0.80), "Forearm.R")

    # Legs
    add_bone("Thigh.L", (-0.115, 0, 0.90), (-0.115, 0, 0.52), "Hips")
    add_bone("Shin.L", (-0.115, 0, 0.52), (-0.115, 0, 0.14), "Thigh.L")
    add_bone("Foot.L", (-0.115, 0, 0.14), (-0.115, 0.15, 0.03), "Shin.L")

    add_bone("Thigh.R", (0.115, 0, 0.90), (0.115, 0, 0.52), "Hips")
    add_bone("Shin.R", (0.115, 0, 0.52), (0.115, 0, 0.14), "Thigh.R")
    add_bone("Foot.R", (0.115, 0, 0.14), (0.115, 0.15, 0.03), "Shin.R")

    bpy.ops.object.mode_set(mode='OBJECT')

    # Bind Mesh with Armature
    arm_mod = navigator_mesh.modifiers.new(name="Armature", type='ARMATURE')
    arm_mod.object = arm_obj
    navigator_mesh.parent = arm_obj

    # ═══════════════════════════════════════════════════════════════════════════
    # 8. NPC STATE ANIMATIONS (IDLE, LISTENING, THINKING, SEARCHING, NAVIGATING, SPEAKING, SUCCESS, ERROR, WAVE)
    # ═══════════════════════════════════════════════════════════════════════════
    arm_obj.animation_data_create()
    pbones = arm_obj.pose.bones

    def set_bone(pb_name, rx, ry, rz, frame):
        if pb_name in pbones:
            pb = pbones[pb_name]
            pb.rotation_mode = 'XYZ'
            pb.rotation_euler = (math.radians(rx), math.radians(ry), math.radians(rz))
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

    def set_bone_loc(pb_name, lx, ly, lz, frame):
        if pb_name in pbones:
            pb = pbones[pb_name]
            pb.location = (lx, ly, lz)
            pb.keyframe_insert(data_path="location", frame=frame)

    # ─────────────────────────────────────────────────────────────────────────
    # ACTION 1: Navigator_Idle (Subtle breathing, weight shift, calm professional presence)
    # ─────────────────────────────────────────────────────────────────────────
    act_idle = bpy.data.actions.new("Navigator_Idle")
    arm_obj.animation_data.action = act_idle
    for f in [1, 60]:
        set_bone("Chest", 1.2, 0, 0, f)
        set_bone("Head", 0, 0, 0, f)
        set_bone("UpperArm.L", 6, 2, -10, f)
        set_bone("Forearm.L", 24, 0, 0, f)
        set_bone("UpperArm.R", 6, -2, 10, f)
        set_bone("Forearm.R", 24, 0, 0, f)
        set_bone("Hips", 0, 0, 0, f)
    # Breathing inhalation & subtle organic look
    set_bone("Chest", -1.8, 0, 0, 30)
    set_bone("Head", -1.5, 0, 6, 25)
    set_bone("Head", -1.5, 0, -6, 45)
    set_bone("Hips", 0.6, 0, 0.8, 30)

    # ─────────────────────────────────────────────────────────────────────────
    # ACTION 2: Navigator_Listening (Attention posture, slight lean forward, head facing viewer)
    # ─────────────────────────────────────────────────────────────────────────
    act_listening = bpy.data.actions.new("Navigator_Listening")
    arm_obj.animation_data.action = act_listening
    for f in [1, 40]:
        set_bone("Spine", 5, 0, 0, f)
        set_bone("Chest", 6, 0, 0, f)
        set_bone("Neck", -4, 0, 0, f)
        set_bone("Head", -2, 0, 0, f)
        set_bone("UpperArm.L", 10, 4, -8, f)
        set_bone("Forearm.L", 36, 0, 0, f)
        set_bone("UpperArm.R", 10, -4, 8, f)
        set_bone("Forearm.R", 36, 0, 0, f)
    set_bone("Head", 2, 0, 0, 20)
    set_bone("Chest", 4, 0, 0, 20)

    # ─────────────────────────────────────────────────────────────────────────
    # ACTION 3: Navigator_Thinking (Upward/side glance, checking wrist terminal)
    # ─────────────────────────────────────────────────────────────────────────
    act_thinking = bpy.data.actions.new("Navigator_Thinking")
    arm_obj.animation_data.action = act_thinking
    for f in [1, 60]:
        set_bone("Hips", 0, 0, 2, f)
        set_bone("Chest", 2, 0, -3, f)
        set_bone("Head", -4, 3, 14, f)
        # Left arm raises wrist terminal towards chest
        set_bone("UpperArm.L", -28, 12, -18, f)
        set_bone("Forearm.L", 78, -12, 10, f)
        set_bone("Hand.L", 0, 0, 15, f)
        # Right arm touches chin / lower chest thoughtfully
        set_bone("UpperArm.R", -22, 0, 16, f)
        set_bone("Forearm.R", 68, 0, 0, f)
    set_bone("Head", -6, 2, 18, 30)
    set_bone("Forearm.L", 82, -10, 12, 30)

    # ─────────────────────────────────────────────────────────────────────────
    # ACTION 4: Navigator_Searching (Active holographic scan & GIS query manipulation)
    # ─────────────────────────────────────────────────────────────────────────
    act_searching = bpy.data.actions.new("Navigator_Searching")
    arm_obj.animation_data.action = act_searching
    for f in [1, 50]:
        set_bone("Chest", -1, 0, 0, f)
        set_bone("Head", 4, 0, -8, f)
        set_bone("UpperArm.L", -32, 15, -20, f)
        set_bone("Forearm.L", 85, 0, 0, f)
        set_bone("UpperArm.R", -30, -15, 20, f)
        set_bone("Forearm.R", 82, 0, 0, f)
    # Rhythmic holographic manipulation
    set_bone("Head", 2, 0, 8, 25)
    set_bone("Hand.R", -15, 10, 0, 25)
    set_bone("Hand.L", 15, -10, 0, 25)

    # ─────────────────────────────────────────────────────────────────────────
    # ACTION 5: Navigator_Navigating (Directional gesture pointing toward map)
    # ─────────────────────────────────────────────────────────────────────────
    act_navigating = bpy.data.actions.new("Navigator_Navigating")
    arm_obj.animation_data.action = act_navigating
    for f in [1, 60]:
        set_bone("Hips", 0, 0, 0, f)
        set_bone("Chest", 0, 0, 0, f)
        set_bone("Head", 0, 0, 0, f)
        set_bone("UpperArm.R", 6, -2, 10, f)
        set_bone("Forearm.R", 24, 0, 0, f)
    # Frame 25: Right arm extends smoothly towards map (forward-left direction)
    set_bone("Chest", 2, 0, -12, 25)
    set_bone("Head", -2, 0, -16, 25)
    set_bone("UpperArm.R", -55, 0, -32, 25)
    set_bone("Forearm.R", 18, 0, 0, 25)
    set_bone("Hand.R", 0, 0, -10, 25)
    # Left hand steady on wrist terminal
    set_bone("UpperArm.L", -18, 8, -12, 25)
    set_bone("Forearm.L", 52, 0, 0, 25)

    # ─────────────────────────────────────────────────────────────────────────
    # ACTION 6: Navigator_Speaking (Subtle communicative cadence, gentle head nods)
    # ─────────────────────────────────────────────────────────────────────────
    act_speaking = bpy.data.actions.new("Navigator_Speaking")
    arm_obj.animation_data.action = act_speaking
    for f in [1, 48]:
        set_bone("Chest", 1, 0, 0, f)
        set_bone("Head", 0, 0, 0, f)
        set_bone("UpperArm.L", 8, 0, -10, f)
        set_bone("Forearm.L", 38, 0, 0, f)
        set_bone("UpperArm.R", 8, 0, 10, f)
        set_bone("Forearm.R", 38, 0, 0, f)
    set_bone("Head", 3, 0, 2, 12)
    set_bone("Hand.R", 12, 0, 0, 12)
    set_bone("Head", -2, 0, -2, 24)
    set_bone("Hand.L", 12, 0, 0, 24)
    set_bone("Head", 2, 0, 1, 36)

    # ─────────────────────────────────────────────────────────────────────────
    # ACTION 7: Navigator_Success (Affirmative crisp nod, confirmation glow stance)
    # ─────────────────────────────────────────────────────────────────────────
    act_success = bpy.data.actions.new("Navigator_Success")
    arm_obj.animation_data.action = act_success
    for f in [1, 45]:
        set_bone("Head", 0, 0, 0, f)
        set_bone("Chest", 0, 0, 0, f)
        set_bone("UpperArm.R", 8, 0, 10, f)
        set_bone("Forearm.R", 24, 0, 0, f)
    # Firm affirmative nod & thumbs-up / open palm confirmation
    set_bone("Head", 14, 0, 0, 15)
    set_bone("Chest", 3, 0, 0, 15)
    set_bone("UpperArm.R", -35, 0, 18, 15)
    set_bone("Forearm.R", 80, 0, 0, 15)
    set_bone("Hand.R", 0, 25, 0, 15)
    set_bone("Head", -4, 0, 0, 30)

    # ─────────────────────────────────────────────────────────────────────────
    # ACTION 8: Navigator_Error (Slight puzzled head tilt, calm neutral recovery)
    # ─────────────────────────────────────────────────────────────────────────
    act_error = bpy.data.actions.new("Navigator_Error")
    arm_obj.animation_data.action = act_error
    for f in [1, 50]:
        set_bone("Head", 0, 0, 0, f)
        set_bone("UpperArm.L", 6, 0, -10, f)
        set_bone("UpperArm.R", 6, 0, 10, f)
    # Puzzled tilt
    set_bone("Head", -2, 8, 6, 20)
    set_bone("UpperArm.L", 12, 0, -14, 20)
    set_bone("UpperArm.R", 12, 0, 14, 20)

    # ─────────────────────────────────────────────────────────────────────────
    # ACTION 9: Navigator_Wave (Approved Click Reaction: Professional greeting wave)
    # ─────────────────────────────────────────────────────────────────────────
    act_wave = bpy.data.actions.new("Navigator_Wave")
    arm_obj.animation_data.action = act_wave
    for f in [1, 48]:
        set_bone("UpperArm.R", 6, 0, 10, f)
        set_bone("Forearm.R", 24, 0, 0, f)
        set_bone("Hand.R", 0, 0, 0, f)
        set_bone("Head", 0, 0, 0, f)
    set_bone("UpperArm.R", -68, 0, 42, 14)
    set_bone("Forearm.R", 70, 0, 0, 14)
    set_bone("Hand.R", 0, 0, -24, 20)
    set_bone("Hand.R", 0, 0, 24, 28)
    set_bone("Hand.R", 0, 0, -24, 34)
    set_bone("UpperArm.R", -68, 0, 42, 36)
    set_bone("Forearm.R", 70, 0, 0, 36)

    # Default action
    arm_obj.animation_data.action = act_idle

    # ═══════════════════════════════════════════════════════════════════════════
    # 9. EXPORT BLEND & OPTIMIZED GLB
    # ═══════════════════════════════════════════════════════════════════════════
    blend_path = os.path.join(out_dir, "scic_atlas_navigator.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"Saved {blend_path}")

    glb_path = os.path.join(out_dir, "scic_atlas_navigator.glb")
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        use_selection=False,
        export_animations=True,
        export_apply=False
    )
    print(f"Exported {glb_path}: {os.path.getsize(glb_path)} bytes")

create_navigator()
print("=== SCIC ATLAS NAVIGATOR GENERATION COMPLETE ===")
