import bpy
import math
import os

print("=== GENERATING REALISTIC SCIC CIVIL FOREMAN 3D RIGGED CHARACTER ===")

out_dir = os.path.abspath("public/models/characters")
os.makedirs(out_dir, exist_ok=True)

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_pbr_mat(name, base_color, roughness=0.5, metallic=0.0, emissive=None):
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
        if emissive and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*emissive, 1.0)
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = 1.2
    return mat

def create_foreman_character():
    clear_scene()

    # ── 1. REALISTIC PBR MATERIALS ──
    mat_skin = create_pbr_mat("ForemanSkinBronze", (0.68, 0.44, 0.32), roughness=0.58, metallic=0.02)
    mat_hardhat_yellow = create_pbr_mat("HardhatSafetyYellow", (0.95, 0.78, 0.08), roughness=0.28, metallic=0.04)
    mat_hardhat_trim = create_pbr_mat("HardhatBrimBlack", (0.12, 0.12, 0.14), roughness=0.55, metallic=0.10)
    mat_shirt_grey = create_pbr_mat("ShirtWorkHeatherGrey", (0.36, 0.37, 0.39), roughness=0.85, metallic=0.0)
    mat_vest_amber = create_pbr_mat("ForemanVestAmber", (0.92, 0.62, 0.06), roughness=0.72, metallic=0.0)
    mat_vest_navy = create_pbr_mat("ForemanVestNavyYoke", (0.08, 0.18, 0.42), roughness=0.75, metallic=0.0)
    mat_tape_3m = create_pbr_mat("RetroreflectiveSilver3M", (0.94, 0.95, 0.96), roughness=0.18, metallic=0.85, emissive=(0.8, 0.85, 0.9))
    mat_belt_leather = create_pbr_mat("ToolBeltOiledLeather", (0.22, 0.14, 0.09), roughness=0.62, metallic=0.05)
    mat_brass = create_pbr_mat("BuckleHardwareBrass", (0.84, 0.68, 0.24), roughness=0.30, metallic=0.90)
    mat_jeans = create_pbr_mat("DenimHeavyWorkJeans", (0.15, 0.22, 0.36), roughness=0.86, metallic=0.0)
    mat_boots_leather = create_pbr_mat("SteelToeWorkBoot", (0.16, 0.11, 0.08), roughness=0.68, metallic=0.05)
    mat_boots_sole = create_pbr_mat("LugTreadRubber", (0.08, 0.08, 0.09), roughness=0.85, metallic=0.12)
    mat_hair_black = create_pbr_mat("ForemanHairDark", (0.06, 0.05, 0.05), roughness=0.90, metallic=0.0)
    mat_eyes = create_pbr_mat("EyesDarkBrown", (0.18, 0.12, 0.08), roughness=0.10, metallic=0.10)
    mat_hammer_steel = create_pbr_mat("SchmidtHammerSteel", (0.85, 0.87, 0.88), roughness=0.22, metallic=0.92)
    mat_hammer_red = create_pbr_mat("SchmidtHammerGripRed", (0.82, 0.15, 0.12), roughness=0.45, metallic=0.05)

    mesh_parts = []

    def make_part(name, prim_type, size, loc, rot=(0,0,0), scale=(1,1,1), mat=None, vgroup="Chest"):
        if prim_type == "sphere":
            bpy.ops.mesh.primitive_uv_sphere_add(radius=size[0], location=loc)
        elif prim_type == "cylinder":
            bpy.ops.mesh.primitive_cylinder_add(radius=size[0], depth=size[1], location=loc)
        elif prim_type == "box":
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
            bpy.context.active_object.scale = size
        elif prim_type == "cone":
            bpy.ops.mesh.primitive_cone_add(radius1=size[0], depth=size[1], location=loc)

        obj = bpy.context.active_object
        obj.name = name
        obj.rotation_euler = (math.radians(rot[0]), math.radians(rot[1]), math.radians(rot[2]))
        if prim_type != "box" and scale != (1,1,1):
            obj.scale = scale
        bpy.ops.object.transform_apply(scale=True, rotation=True)
        if mat:
            obj.data.materials.append(mat)
        
        # Tag with primary vertex group for binding
        vg = obj.vertex_groups.new(name=vgroup)
        verts = [v.index for v in obj.data.vertices]
        vg.add(verts, 1.0, 'REPLACE')
        mesh_parts.append(obj)
        return obj

    # ── 2. ANATOMICAL MESH MODELING ──
    # Head & Facial Structure (Height 1.68m)
    make_part("Cranium", "sphere", [0.12], (0, 0, 1.58), scale=(0.88, 1.05, 1.0), mat=mat_skin, vgroup="Head")
    make_part("Jawline", "box", [0.13, 0.14, 0.08], (0, 0.04, 1.52), mat=mat_skin, vgroup="Head")
    make_part("ForemanNose", "cone", [0.022, 0.06], (0, 0.12, 1.56), rot=(75, 0, 0), mat=mat_skin, vgroup="Head")
    make_part("ForemanMustache", "box", [0.08, 0.02, 0.02], (0, 0.11, 1.525), mat=mat_hair_black, vgroup="Head")
    make_part("EyeLeft", "sphere", [0.018], (-0.045, 0.10, 1.58), mat=mat_eyes, vgroup="Head")
    make_part("EyeRight", "sphere", [0.018], (0.045, 0.10, 1.58), mat=mat_eyes, vgroup="Head")
    make_part("EarLeft", "box", [0.02, 0.04, 0.06], (-0.115, 0.0, 1.57), mat=mat_skin, vgroup="Head")
    make_part("EarRight", "box", [0.02, 0.04, 0.06], (0.115, 0.0, 1.57), mat=mat_skin, vgroup="Head")
    make_part("ForemanHair", "sphere", [0.125], (0, -0.02, 1.61), scale=(0.92, 1.05, 0.8), mat=mat_hair_black, vgroup="Head")

    # Hardhat (Yellow SCIC Safety Shell with Brim & Harness)
    make_part("HardhatDome", "sphere", [0.145], (0, 0.01, 1.66), scale=(0.95, 1.15, 0.75), mat=mat_hardhat_yellow, vgroup="Head")
    make_part("HardhatRidge", "box", [0.04, 0.28, 0.04], (0, 0.02, 1.73), mat=mat_hardhat_yellow, vgroup="Head")
    make_part("HardhatBrim", "cylinder", [0.165, 0.02], (0, 0.02, 1.63), scale=(0.95, 1.18, 1.0), mat=mat_hardhat_trim, vgroup="Head")

    # Neck
    make_part("Neck", "cylinder", [0.075, 0.12], (0, 0, 1.46), mat=mat_skin, vgroup="Neck")

    # Torso & Heavy-Duty Foreman Vest (Amber with Navy Shoulder Yokes & 3M Reflective Striping)
    make_part("ChestTorso", "box", [0.38, 0.24, 0.32], (0, 0, 1.30), mat=mat_vest_amber, vgroup="Chest")
    make_part("NavyYokeShoulderL", "box", [0.18, 0.245, 0.10], (-0.10, 0, 1.41), mat=mat_vest_navy, vgroup="Chest")
    make_part("NavyYokeShoulderR", "box", [0.18, 0.245, 0.10], (0.10, 0, 1.41), mat=mat_vest_navy, vgroup="Chest")
    # Horizontal 3M Retroreflective Bands (Front & Back)
    make_part("ReflectiveStripe1", "box", [0.386, 0.246, 0.04], (0, 0, 1.28), mat=mat_tape_3m, vgroup="Chest")
    make_part("ReflectiveStripe2", "box", [0.386, 0.246, 0.04], (0, 0, 1.18), mat=mat_tape_3m, vgroup="Spine")
    # Chest ID Badge
    make_part("SCICBadge", "box", [0.06, 0.01, 0.08], (0.11, 0.126, 1.34), mat=mat_tape_3m, vgroup="Chest")

    # Midriff & Spine
    make_part("Midriff", "box", [0.35, 0.23, 0.16], (0, 0, 1.10), mat=mat_vest_amber, vgroup="Spine")

    # Heavy Leather Tool Belt & Brass Buckle
    make_part("ToolBelt", "box", [0.365, 0.245, 0.08], (0, 0, 1.01), mat=mat_belt_leather, vgroup="Hips")
    make_part("BeltBuckle", "box", [0.08, 0.03, 0.09], (0, 0.125, 1.01), mat=mat_brass, vgroup="Hips")
    # 5m Stanley Measuring Tape Pouch on right hip
    make_part("MeasuringTapePouch", "box", [0.08, 0.08, 0.08], (0.20, 0.02, 0.98), mat=mat_belt_leather, vgroup="Hips")
    make_part("TapeYellowCase", "cylinder", [0.03, 0.04], (0.20, 0.02, 0.98), rot=(0, 90, 0), mat=mat_hardhat_yellow, vgroup="Hips")

    # Hips & Pelvis
    make_part("PelvisJeans", "box", [0.34, 0.22, 0.15], (0, 0, 0.92), mat=mat_jeans, vgroup="Hips")

    # Arms (Shoulder, Upper Arm, Forearm, Hands)
    # Left Arm
    make_part("UpperArmL", "cylinder", [0.065, 0.26], (-0.24, 0, 1.26), rot=(0, 10, 0), mat=mat_shirt_grey, vgroup="UpperArm.L")
    make_part("ForearmL", "cylinder", [0.055, 0.24], (-0.26, 0.02, 1.02), rot=(5, 0, 0), mat=mat_skin, vgroup="Forearm.L")
    make_part("HandL", "box", [0.05, 0.08, 0.09], (-0.27, 0.04, 0.86), mat=mat_skin, vgroup="Hand.L")

    # Right Arm with Schmidt Concrete Rebound Test Hammer
    make_part("UpperArmR", "cylinder", [0.065, 0.26], (0.24, 0, 1.26), rot=(0, -10, 0), mat=mat_shirt_grey, vgroup="UpperArm.R")
    make_part("ForearmR", "cylinder", [0.055, 0.24], (0.26, 0.02, 1.02), rot=(5, 0, 0), mat=mat_skin, vgroup="Forearm.R")
    make_part("HandR", "box", [0.05, 0.08, 0.09], (0.27, 0.04, 0.86), mat=mat_skin, vgroup="Hand.R")
    # Schmidt Concrete Test Hammer in right hand
    make_part("HammerBarrel", "cylinder", [0.028, 0.28], (0.28, 0.10, 0.82), rot=(80, 0, 0), mat=mat_hammer_steel, vgroup="Hand.R")
    make_part("HammerGrip", "cylinder", [0.032, 0.12], (0.28, 0.04, 0.83), rot=(80, 0, 0), mat=mat_hammer_red, vgroup="Hand.R")
    make_part("HammerPlunger", "cylinder", [0.012, 0.08], (0.28, 0.25, 0.80), rot=(80, 0, 0), mat=mat_hammer_steel, vgroup="Hand.R")

    # Legs & Work Boots
    # Left Leg
    make_part("ThighL", "cylinder", [0.09, 0.38], (-0.12, 0, 0.69), mat=mat_jeans, vgroup="Thigh.L")
    make_part("ShinL", "cylinder", [0.075, 0.38], (-0.12, 0, 0.32), mat=mat_jeans, vgroup="Shin.L")
    make_part("BootL", "box", [0.11, 0.24, 0.12], (-0.12, 0.04, 0.06), mat=mat_boots_leather, vgroup="Foot.L")
    make_part("SoleL", "box", [0.12, 0.25, 0.03], (-0.12, 0.04, 0.015), mat=mat_boots_sole, vgroup="Foot.L")

    # Right Leg
    make_part("ThighR", "cylinder", [0.09, 0.38], (0.12, 0, 0.69), mat=mat_jeans, vgroup="Thigh.R")
    make_part("ShinR", "cylinder", [0.075, 0.38], (0.12, 0, 0.32), mat=mat_jeans, vgroup="Shin.R")
    make_part("BootR", "box", [0.11, 0.24, 0.12], (0.12, 0.04, 0.06), mat=mat_boots_leather, vgroup="Foot.R")
    make_part("SoleR", "box", [0.12, 0.25, 0.03], (0.12, 0.04, 0.015), mat=mat_boots_sole, vgroup="Foot.R")

    # ── 3. JOIN ALL PARTS INTO UNIFIED CHARACTER MESH ──
    bpy.ops.object.select_all(action='DESELECT')
    for p in mesh_parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = mesh_parts[0]
    bpy.ops.object.join()
    foreman_mesh = bpy.context.active_object
    foreman_mesh.name = "SCIC_Foreman_Mesh"

    # ── 4. CONSTRUCT HUMANOID SKELETAL ARMATURE ──
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

    # Core Spine Chain
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

    # ── 5. BIND MESH TO ARMATURE ──
    arm_mod = foreman_mesh.modifiers.new(name="Armature", type='ARMATURE')
    arm_mod.object = arm_obj
    foreman_mesh.parent = arm_obj

    # ── 6. KEYFRAME 4 AUTHENTIC ACTIONS (Walk, Idle, Inspect, Wave) ──
    arm_obj.animation_data_create()

    def set_bone_rot(pb, rx, ry, rz, frame):
        pb.rotation_mode = 'XYZ'
        pb.rotation_euler = (math.radians(rx), math.radians(ry), math.radians(rz))
        pb.keyframe_insert(data_path="rotation_euler", frame=frame)

    # ── ACTION 1: FOREMAN_IDLE (Natural breathing, surveying crew, weight shift) ──
    act_idle = bpy.data.actions.new("Foreman_Idle")
    arm_obj.animation_data.action = act_idle
    pbones = arm_obj.pose.bones

    for f in [1, 60]:
        set_bone_rot(pbones["Chest"], 1.5, 0, 0, f)
        set_bone_rot(pbones["Head"], 0, 0, 0, f)
        set_bone_rot(pbones["UpperArm.L"], 8, 4, -12, f)
        set_bone_rot(pbones["Forearm.L"], 35, 0, 0, f)
        set_bone_rot(pbones["UpperArm.R"], 8, -4, 12, f)
        set_bone_rot(pbones["Forearm.R"], 35, 0, 0, f)
        set_bone_rot(pbones["Hips"], 0, 0, 0, f)
    # Mid-cycle inhale & head scan
    set_bone_rot(pbones["Chest"], -2.5, 0, 0, 30)
    set_bone_rot(pbones["Head"], -2, 0, 18, 25)
    set_bone_rot(pbones["Head"], -2, 0, -18, 45)
    set_bone_rot(pbones["Hips"], 1.0, 0, 1.5, 30)

    # ── ACTION 2: FOREMAN_WALK (Grounded, confident 1.25 m/s construction stride) ──
    act_walk = bpy.data.actions.new("Foreman_Walk")
    arm_obj.animation_data.action = act_walk

    walk_keys = [
        # Frame 1: Left contact forward, right foot back
        (1, {"Thigh.L": 26, "Shin.L": -8, "Foot.L": 8, "Thigh.R": -24, "Shin.R": -12, "Foot.R": -8, "UpperArm.L": -18, "Forearm.L": 28, "UpperArm.R": 22, "Forearm.R": 42, "Hips": -2, "Chest": 2}),
        # Frame 9: Left passing, right swinging through
        (9, {"Thigh.L": 0, "Shin.L": -4, "Foot.L": 0, "Thigh.R": 14, "Shin.R": -45, "Foot.R": 15, "UpperArm.L": 2, "Forearm.L": 20, "UpperArm.R": -4, "Forearm.R": 28, "Hips": 0, "Chest": 0}),
        # Frame 18: Right contact forward, left foot back
        (18, {"Thigh.L": -24, "Shin.L": -12, "Foot.L": -8, "Thigh.R": 26, "Shin.R": -8, "Foot.R": 8, "UpperArm.L": 22, "Forearm.L": 42, "UpperArm.R": -18, "Forearm.R": 28, "Hips": 2, "Chest": -2}),
        # Frame 27: Right passing, left swinging through
        (27, {"Thigh.L": 14, "Shin.L": -45, "Foot.L": 15, "Thigh.R": 0, "Shin.R": -4, "Foot.R": 0, "UpperArm.L": -4, "Forearm.L": 28, "UpperArm.R": 2, "Forearm.R": 20, "Hips": 0, "Chest": 0}),
        # Frame 36: Loop back to Left contact
        (36, {"Thigh.L": 26, "Shin.L": -8, "Foot.L": 8, "Thigh.R": -24, "Shin.R": -12, "Foot.R": -8, "UpperArm.L": -18, "Forearm.L": 28, "UpperArm.R": 22, "Forearm.R": 42, "Hips": -2, "Chest": 2}),
    ]
    for frame, poses in walk_keys:
        for bname, rx in poses.items():
            if bname in pbones:
                set_bone_rot(pbones[bname], rx, 0, 0, frame)

    # ── ACTION 3: FOREMAN_INSPECT (Bending / kneeling to test concrete surface) ──
    act_inspect = bpy.data.actions.new("Foreman_Inspect")
    arm_obj.animation_data.action = act_inspect

    for f in [1, 72]:
        set_bone_rot(pbones["Hips"], 0, 0, 0, f)
        set_bone_rot(pbones["Spine"], 0, 0, 0, f)
        set_bone_rot(pbones["Chest"], 0, 0, 0, f)
        set_bone_rot(pbones["Head"], 0, 0, 0, f)
        set_bone_rot(pbones["UpperArm.R"], 8, 0, 10, f)
        set_bone_rot(pbones["Forearm.R"], 20, 0, 0, f)
    # Crouching down and inspecting ground with hammer
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

    # ── ACTION 4: FOREMAN_WAVE (Signaling concrete mixer truck or crew) ──
    act_wave = bpy.data.actions.new("Foreman_Wave")
    arm_obj.animation_data.action = act_wave

    for f in [1, 48]:
        set_bone_rot(pbones["UpperArm.R"], 8, 0, 10, f)
        set_bone_rot(pbones["Forearm.R"], 20, 0, 0, f)
        set_bone_rot(pbones["Hand.R"], 0, 0, 0, f)
        set_bone_rot(pbones["Head"], 0, 0, 0, f)
    # Raise hand and wave
    set_bone_rot(pbones["UpperArm.R"], -65, 0, 45, 14)
    set_bone_rot(pbones["Forearm.R"], 65, 0, 0, 14)
    set_bone_rot(pbones["Hand.R"], 0, 0, -25, 20)
    set_bone_rot(pbones["Hand.R"], 0, 0, 25, 28)
    set_bone_rot(pbones["Hand.R"], 0, 0, -25, 34)
    set_bone_rot(pbones["UpperArm.R"], -65, 0, 45, 36)
    set_bone_rot(pbones["Forearm.R"], 65, 0, 0, 36)

    # Reset default action to Walk for GLB preview
    arm_obj.animation_data.action = act_walk

    # ── 7. EXPORT .BLEND AND ANIMATED .GLB ──
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

create_foreman_character()
print("=== SCIC CIVIL FOREMAN GENERATION COMPLETE ===")
