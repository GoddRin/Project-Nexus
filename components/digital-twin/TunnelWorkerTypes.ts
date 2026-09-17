/**
 * TunnelWorkerTypes.ts
 *
 * Ground Truth Type Definitions & Engineering Contracts for Headrace Tunnel Personnel.
 * Derived from docs/tunnel-scene-brief.md & Philippine DOLE OSH (RA 11058) tunneling standards.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURAL CONTRACTS & RESOLUTIONS:
 * ═══════════════════════════════════════════════════════════════════════════
 * 1. CREW SCOPE CONTRACT (DELIBERATE CIVIL ENGINEERING SCOPE):
 *    The 14-worker crew in this phase is a deliberate civil engineering design
 *    decision representing the standard active Philippine face shift crew within the
 *    60-meter representative heading drive cutaway (as defined in docs/tunnel-scene-brief.md).
 *    This is NOT an accidental omission of the earlier 20-50 worker range. Rather,
 *    this cutaway models the active drill-and-blast heading zone. The underlying
 *    architecture (GPU-instanced billboard impostors at LOD1 >18m, shared AudioContext
 *    with 6-voice budget cap, and SkeletonUtils.clone) is specifically designed to
 *    scale smoothly to 20-50+ workers when populated across full 1.2km-9.6km conduit drives.
 *
 * 2. EXACT SKELETAL BONE NAMING (Confirmed from scic_civil_foreman.glb armature):
 *    - Right Arm: 'UpperArmR', 'ForearmR', 'HandR'
 *    - Left Arm:  'UpperArmL', 'ForearmL', 'HandL'
 *    - Torso/Head: 'Root', 'Hips', 'Spine', 'Chest', 'Neck', 'Head'
 *    - Legs:      'ThighL'/'ThighR', 'ShinL'/'ShinR', 'FootL'/'FootR'
 *
 * 3. PROP ATTACHMENT & PROCEDURAL ARM OFFSET RULES (RESOLUTION 3):
 *    - Total Station: Ground tripod directly in front, HandR touches fine adjustment knob.
 *      Procedural arm offset: UpperArmR / ForearmR slight reach forward, Head tilted down to optical eyepiece.
 *    - Pneumatic Drill: Two-handed, HandL forward sleeve, HandR rear trigger handle.
 *      Procedural arm offset: High-frequency percussion vibration jitter applied to UpperArmR, UpperArmL, ForearmR, ForearmL, HandR, HandL, and Spine.
 *    - Shotcrete Nozzle: Two-handed, HandL forward grip, HandR trigger manifold.
 *      Procedural arm offset: Wide sweeping azimuth oscillation on UpperArmR and UpperArmL, Head tilted up to crown.
 *    - Multi-Gas Wand: HandR holds detector sniffer wand, HandL holds inspection log.
 *      Procedural arm offset: Horizontal atmospheric air sampling sweep on UpperArmR and ForearmR, Head scanning left-right.
 *    - Geologist Pick: HandR holds Estwing rock hammer, HandL holds Brunton compass.
 *      Procedural arm offset: Rhythmic rock-chipping tap on UpperArmR and ForearmR.
 *    - Clipboard: HandL holds clipboard, HandR gestures/holds radio.
 *      Procedural arm offset: UpperArmL and ForearmL raised holding blueprint, Head tilted down reviewing notes.
 *    - Torque Wrench: HandR raises wrench overhead to roof bolt plate.
 *      Procedural arm offset: UpperArmR raised overhead to crown arch, Head tilted up.
 *    - Blaster Tester: HandL holds galvanometer, HandR holds continuity wire.
 *      Procedural arm offset: UpperArmL raised examining meter face, Head tilted down.
 *    - Mucker Pry-bar: Two-handed scaling bar pose (HandR low, HandL high).
 *      Procedural arm offset: UpperArmR and UpperArmL forward leverage scaling pose.
 *
 * 4. BASE CLIP STATE MAPPING (RESOLUTION 4):
 *    - "idle": Plays 'Foreman_Idle' (1.0x).
 *    - "walking": Plays 'Foreman_Walk' (1.0x).
 *    - "working": Plays 'Foreman_Idle' (or 'Foreman_Inspect' for Supervisor/Geologist) at 1.0x
 *      + procedural skeletal bone offsets strictly added post-mixer.
 *    - "alert": Plays 'Foreman_Walk' at 1.45x accelerated playback speed oriented towards the
 *      tunnel portal direction (evacuation heading).
 *      NOTE: A dedicated panic sprint / emergency evacuation clip is flagged as an upcoming
 *      mocap asset need for subsequent phases, rather than being silently faked now.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type TunnelWorkerRole =
  | "TUNNEL_SUPERVISOR"
  | "SAFETY_OFFICER"
  | "DRILL_OPERATOR"
  | "BLASTER"
  | "MUCKER_LABORER"
  | "ROCK_BOLTING_CREW"
  | "SHOTCRETE_OPERATOR"
  | "SURVEYOR"
  | "GEOLOGIST";

export type WorkerAnimationState = "idle" | "walking" | "working" | "alert";

export interface RoleVisualProfile {
  title: string;
  department: string;
  hardhatColor: string; // Hex color for helmet
  vestColor: string;    // Hex color for safety vest
  pantsColor: string;   // Hex color for trousers/coveralls
  propType:
    | "CLIPBOARD_RADIO"
    | "GAS_DETECTOR"
    | "PNEUMATIC_DRILL"
    | "BLASTING_TESTER"
    | "PRYBAR_SHOVEL"
    | "TORQUE_WRENCH"
    | "SHOTCRETE_NOZZLE"
    | "TOTAL_STATION"
    | "GEOLOGIST_PICK";
  primaryHand: "HandR" | "HandL" | "DUAL_HANDED" | "GROUND_MOUNTED";
  audioProfile: "drill" | "shotcrete" | "footsteps" | "chirp" | "none";
}

export const ROLE_PROFILES: Record<TunnelWorkerRole, RoleVisualProfile> = {
  TUNNEL_SUPERVISOR: {
    title: "Tunnel Supervisor (Shift Boss)",
    department: "MANAGEMENT",
    hardhatColor: "#FFFFFF", // White Class E
    vestColor: "#0F766E",    // Teal with orange 3M trim
    pantsColor: "#27303F",
    propType: "CLIPBOARD_RADIO",
    primaryHand: "HandL",
    audioProfile: "chirp",
  },
  SAFETY_OFFICER: {
    title: "Safety Officer (DOLE SO3)",
    department: "SAFETY",
    hardhatColor: "#16A34A", // Green (DOLE Green Cross emblem)
    vestColor: "#84CC16",    // High-vis lime green
    pantsColor: "#1E293B",
    propType: "GAS_DETECTOR",
    primaryHand: "HandR",
    audioProfile: "chirp",
  },
  DRILL_OPERATOR: {
    title: "Drill / Jumbo Operator",
    department: "CIVIL",
    hardhatColor: "#EAB308", // Yellow
    vestColor: "#D97706",    // Oil-stained orange canvas
    pantsColor: "#1E3A8A",   // Heavy blue denim coveralls
    propType: "PNEUMATIC_DRILL",
    primaryHand: "DUAL_HANDED",
    audioProfile: "drill",
  },
  BLASTER: {
    title: "Licensed Blaster",
    department: "CIVIL",
    hardhatColor: "#DC2626", // Red
    vestColor: "#EA580C",    // High-vis orange "LICENSED BLASTER"
    pantsColor: "#334155",
    propType: "BLASTING_TESTER",
    primaryHand: "HandL",
    audioProfile: "none",
  },
  MUCKER_LABORER: {
    title: "Mucker / Support Miner",
    department: "CIVIL",
    hardhatColor: "#EAB308", // Yellow
    vestColor: "#F97316",    // High-vis orange
    pantsColor: "#475569",
    propType: "PRYBAR_SHOVEL",
    primaryHand: "DUAL_HANDED",
    audioProfile: "footsteps",
  },
  ROCK_BOLTING_CREW: {
    title: "Rock Bolting Crew",
    department: "CIVIL",
    hardhatColor: "#EAB308", // Yellow
    vestColor: "#D97706",    // Rugged orange
    pantsColor: "#1E293B",
    propType: "TORQUE_WRENCH",
    primaryHand: "HandR",
    audioProfile: "drill",
  },
  SHOTCRETE_OPERATOR: {
    title: "Shotcrete Operator (Nozzleman)",
    department: "CIVIL",
    hardhatColor: "#EAB308", // Yellow
    vestColor: "#3B82F6",    // Full waterproof blue/grey rubber suit
    pantsColor: "#334155",   // Rubber concrete pants
    propType: "SHOTCRETE_NOZZLE",
    primaryHand: "DUAL_HANDED",
    audioProfile: "shotcrete",
  },
  SURVEYOR: {
    title: "Surveyor / Geodetic Tech",
    department: "ENGINEERING",
    hardhatColor: "#FFFFFF", // White with neck shade
    vestColor: "#F97316",    // Multi-pocket orange vest
    pantsColor: "#1E293B",
    propType: "TOTAL_STATION",
    primaryHand: "GROUND_MOUNTED",
    audioProfile: "none",
  },
  GEOLOGIST: {
    title: "Tunnel Geologist / Geotech",
    department: "ENGINEERING",
    hardhatColor: "#FFFFFF", // White
    vestColor: "#EA580C",    // High-vis orange
    pantsColor: "#334155",
    propType: "GEOLOGIST_PICK",
    primaryHand: "HandR",
    audioProfile: "none",
  },
};

export interface TunnelWorkerInstance {
  id: string;
  name: string;
  role: TunnelWorkerRole;
  animationState?: WorkerAnimationState;
  position: [number, number, number];
  rotation?: [number, number, number];
  chainageStation?: string; // e.g., "STA 1+280"
}
