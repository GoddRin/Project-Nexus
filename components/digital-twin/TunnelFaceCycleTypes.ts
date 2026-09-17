/**
 * TunnelFaceCycleTypes.ts
 *
 * Authentic Drill-and-Blast (D&B) Heading Excavation Cycle Types & Contracts.
 * Grounded in Philippine Hydroelectric Tunnel Engineering Practice (Tumauini HEPP).
 */

export type FaceCycleStage =
  | "drilling"
  | "charging_blasting"
  | "mucking"
  | "scaling_support"
  | "shotcreting";

export interface FaceCycleStageInfo {
  id: FaceCycleStage;
  name: string;
  filipinoName: string;
  description: string;
  defaultDuration: number; // in seconds
  badgeColor: string; // Tailwind color class or hex
  activeCrewRole: string;
}

export const FACE_CYCLE_STAGES: Record<FaceCycleStage, FaceCycleStageInfo> = {
  drilling: {
    id: "drilling",
    name: "Jumbo Drilling",
    filipinoName: "Pagbabarena ng Pasabog",
    description: "2-boom drill jumbo and pneumatic jacklegs boring 45-hole blast pattern",
    defaultDuration: 14.0,
    badgeColor: "#F59E0B", // Amber
    activeCrewRole: "DRILL_OPERATOR",
  },
  charging_blasting: {
    id: "charging_blasting",
    name: "Charge & Detonation",
    filipinoName: "Pagkakarga at Pagpapasabog",
    description: "ANFO/Emulsion primed with non-electric shocktube detonators, warning siren, blast impulse",
    defaultDuration: 6.0,
    badgeColor: "#EF4444", // Red
    activeCrewRole: "BLASTER",
  },
  mucking: {
    id: "mucking",
    name: "Mucking Out",
    filipinoName: "Paghahakot ng Tipak na Bato",
    description: "Underground LHD loader / rail muck cart hauling broken rock rubble to disposal portal",
    defaultDuration: 12.0,
    badgeColor: "#10B981", // Emerald
    activeCrewRole: "MUCKER_LABORER",
  },
  scaling_support: {
    id: "scaling_support",
    name: "Scaling & Rock Bolting",
    filipinoName: "Pagtatanggal ng Bato at Pagkakabit ng Pako",
    description: "Barring down loose rock slabs, TH-29 steel rib placement, torque-tensioned Swellex bolts",
    defaultDuration: 12.0,
    badgeColor: "#3B82F6", // Blue
    activeCrewRole: "ROCK_BOLTING_CREW",
  },
  shotcreting: {
    id: "shotcreting",
    name: "Fiber Shotcrete Spraying",
    filipinoName: "Pag-spray ng Shotcrete",
    description: "Robotic/manual wet-mix sprayed concrete shell application across wire mesh and crown arch",
    defaultDuration: 12.0,
    badgeColor: "#8B5CF6", // Purple
    activeCrewRole: "SHOTCRETE_OPERATOR",
  },
};

export const ORDERED_FACE_STAGES: FaceCycleStage[] = [
  "drilling",
  "charging_blasting",
  "mucking",
  "scaling_support",
  "shotcreting",
];

export interface FaceCycleConfig {
  stageDurations?: Partial<Record<FaceCycleStage, number>>;
  roundAdvanceMeters?: number; // Advance per completed round (typically 1.8m - 2.4m, default 2.0m)
  autoAdvance?: boolean; // Whether completing shotcrete automatically pushes advance forward
  enableCameraShake?: boolean; // Toggle blast camera impulse
  playbackSpeed?: number; // 1x, 2x, 4x, etc.
  baseChainageMeters?: number; // Starting chainage (e.g. 1200m -> STA 1+200)
}

export interface FaceCycleState {
  currentStage: FaceCycleStage;
  stageProgress: number; // 0.0 to 1.0 within current stage
  timeInStage: number; // elapsed seconds in current stage
  isPlaying: boolean;
  roundCount: number; // Total completed excavation rounds
  advanceMeters: number; // Canonical position along tunnel (0.0m to totalLength)
  isBlasting: boolean; // Instantaneous detonation window (0.4s)
  blastIntensity: number; // 0.0 to 1.0 (flash intensity & camera shake factor)
}
