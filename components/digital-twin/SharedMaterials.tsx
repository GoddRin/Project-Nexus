/**
 * SharedMaterials.tsx
 *
 * Centralized PBR Material Palette for the Tumauini Digital Twin.
 * All materials are singleton THREE.MeshStandardMaterial instances shared
 * across PowerhouseGeometry, TemfacilFacility, and other scene modules
 * to minimize GPU memory and draw-call overhead.
 */

import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════════════════
// 🏗️ CONCRETE & MASONRY
// ═══════════════════════════════════════════════════════════════════════════
export const MAT_CONCRETE_PRIMARY = new THREE.MeshStandardMaterial({ color: "#9E9A90", roughness: 0.95, metalness: 0.0 });
export const MAT_CONCRETE_DARK = new THREE.MeshStandardMaterial({ color: "#5C5C5C", roughness: 0.96, metalness: 0.0 });
export const MAT_CONCRETE_LIGHT = new THREE.MeshStandardMaterial({ color: "#B8B3A8", roughness: 0.95, metalness: 0.0 });
export const MAT_CONCRETE_HEADER = new THREE.MeshStandardMaterial({ color: "#7E776E", roughness: 0.95, metalness: 0.0 });
export const MAT_CONCRETE_SLAB = new THREE.MeshStandardMaterial({ color: "#928E84", roughness: 0.95, metalness: 0.0 });
export const MAT_CONCRETE_SLAB_LIGHT = new THREE.MeshStandardMaterial({ color: "#C0BBB0", roughness: 0.95, metalness: 0.0 });
export const MAT_GRANITE_BASE = new THREE.MeshStandardMaterial({ color: "#6E6863", roughness: 0.92, metalness: 0.02 });

// ═══════════════════════════════════════════════════════════════════════════
// 🛣️ GROUND, DIRT ROAD & EARTH (Construction Site & Rainforest Terrain)
// ═══════════════════════════════════════════════════════════════════════════
export const MAT_ASPHALT_DARK = new THREE.MeshStandardMaterial({ color: "#2C2C2C", roughness: 0.95, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
export const MAT_DIRT_ROAD_HAUL = new THREE.MeshStandardMaterial({ color: "#8C6A43", roughness: 0.94, metalness: 0.02 });
export const MAT_DIRT_ROAD_RUTS = new THREE.MeshStandardMaterial({ color: "#6A4E2F", roughness: 0.96, metalness: 0.01 });
export const MAT_DIRT_SHOULDER_EMBANKMENT = new THREE.MeshStandardMaterial({ color: "#523C24", roughness: 0.98, metalness: 0.01 });
export const MAT_DIRT_WALKWAY_TRAIL = new THREE.MeshStandardMaterial({ color: "#9E7D58", roughness: 0.92, metalness: 0.02 });
export const MAT_LOG_BARRIER = new THREE.MeshStandardMaterial({ color: "#45321F", roughness: 0.9, metalness: 0.05 });
export const MAT_TIMBER_STAKE = new THREE.MeshStandardMaterial({ color: "#6B4F32", roughness: 0.85, metalness: 0.05 });
export const MAT_TIMBER_POLE = new THREE.MeshStandardMaterial({ color: "#543E28", roughness: 0.9, metalness: 0.05 });
export const MAT_SITE_FLOODLIGHT_BODY = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.4, metalness: 0.7 });
export const MAT_EARTH_BROWN_DUST = new THREE.MeshStandardMaterial({ color: "#8B7355", roughness: 0.95, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
export const MAT_EARTH_BROWN_DARK = new THREE.MeshStandardMaterial({ color: "#5C4033", roughness: 0.95, metalness: 0.0 });
export const MAT_PAVER_WALKWAY = new THREE.MeshStandardMaterial({ color: "#9C8B7A", roughness: 0.85, metalness: 0.02, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });

// ═══════════════════════════════════════════════════════════════════════════
// 🏭 STEEL & METAL
// ═══════════════════════════════════════════════════════════════════════════
export const MAT_STEEL_DARK = new THREE.MeshStandardMaterial({ color: "#1E293B", roughness: 0.4, metalness: 0.7 });
export const MAT_STEEL_FRAME = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.35, metalness: 0.75 });
export const MAT_STEEL_RAILING = new THREE.MeshStandardMaterial({ color: "#64748B", roughness: 0.3, metalness: 0.8 });
export const MAT_STEEL_BLUE = new THREE.MeshStandardMaterial({ color: "#1E3A5F", roughness: 0.35, metalness: 0.7 });
export const MAT_STEEL_FIN = new THREE.MeshStandardMaterial({ color: "#94A3B8", roughness: 0.25, metalness: 0.85 });
export const MAT_FOOD_STAINLESS_TRAY = new THREE.MeshStandardMaterial({ color: "#94A3B8", roughness: 0.55, metalness: 0.40 });
export const MAT_FOOD_STAINLESS_COUNTER = new THREE.MeshStandardMaterial({ color: "#94A3B8", roughness: 0.65, metalness: 0.35 });

// ═══════════════════════════════════════════════════════════════════════════
// 🏠 ROOFING
// ═══════════════════════════════════════════════════════════════════════════
export const MAT_ROOF_BLUE = new THREE.MeshStandardMaterial({ color: "#1E3A8A", roughness: 0.85, metalness: 0.02 });
export const MAT_ROOF_CORRUGATED = new THREE.MeshStandardMaterial({ color: "#1D407E", roughness: 0.82, metalness: 0.02 });
export const MAT_ROOF_CAP = new THREE.MeshStandardMaterial({ color: "#172554", roughness: 0.8, metalness: 0.05 });
export const MAT_ROOF_FASCIA = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.85, metalness: 0.02 });

// ═══════════════════════════════════════════════════════════════════════════
// 🪟 GLASS & TRANSPARENCY
// ═══════════════════════════════════════════════════════════════════════════
export const MAT_GLASS_BLUE = new THREE.MeshStandardMaterial({ color: "#1E3A5F", roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.5 });
export const MAT_GLASS_CLEAR = new THREE.MeshStandardMaterial({ color: "#E2E8F0", roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35 });
export const MAT_GLASS_FRAME = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.3, metalness: 0.6 });

// ═══════════════════════════════════════════════════════════════════════════
// ⚡ ELECTRICAL & INSULATORS
// ═══════════════════════════════════════════════════════════════════════════
export const MAT_INSULATOR_AMBER = new THREE.MeshStandardMaterial({ color: "#D97706", roughness: 0.4, metalness: 0.1 });
export const MAT_INSULATOR_CYAN = new THREE.MeshStandardMaterial({ color: "#06B6D4", roughness: 0.3, metalness: 0.1 });

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 PAINT & SIGNAGE
// ═══════════════════════════════════════════════════════════════════════════
export const MAT_WHITE_PAINT = new THREE.MeshStandardMaterial({ color: "#D4D0C7", roughness: 0.95, metalness: 0.0 });
export const MAT_YELLOW_SAFETY = new THREE.MeshStandardMaterial({ color: "#FACC15", roughness: 0.5, metalness: 0.05 });
export const MAT_SIGNBOARD_TEAL = new THREE.MeshStandardMaterial({ color: "#0D9488", roughness: 0.4, metalness: 0.1 });
export const MAT_RED_BOOTH = new THREE.MeshStandardMaterial({ color: "#DC2626", roughness: 0.5, metalness: 0.05 });

// ═══════════════════════════════════════════════════════════════════════════
// 💧 WATER
// ═══════════════════════════════════════════════════════════════════════════
export const MAT_CANAL_WATER = new THREE.MeshStandardMaterial({ color: "#1E6091", roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.7 });

// ═══════════════════════════════════════════════════════════════════════════
// 🌿 ORGANIC & TIMBER
// ═══════════════════════════════════════════════════════════════════════════
export const MAT_BAMBOO_TIMBER = new THREE.MeshStandardMaterial({ color: "#D4A76A", roughness: 0.75, metalness: 0.0 });

// ═══════════════════════════════════════════════════════════════════════════
// 🍲 CANTEEN & FOOD
// ═══════════════════════════════════════════════════════════════════════════
export const MAT_CANTEEN_GREEN_MESH = new THREE.MeshStandardMaterial({
  color: "#16A34A",
  roughness: 0.4,
  metalness: 0.2,
  transparent: true,
  opacity: 0.35,
  side: THREE.DoubleSide,
  depthWrite: false,
});
export const MAT_CANTEEN_GREEN_WALL = new THREE.MeshStandardMaterial({ color: "#166534", roughness: 0.7, metalness: 0.05 });
export const MAT_ADOBO = new THREE.MeshStandardMaterial({ color: "#6B4423", roughness: 0.85, metalness: 0.0 });
export const MAT_GARLIC_RICE = new THREE.MeshStandardMaterial({ color: "#FEF3C7", roughness: 0.9, metalness: 0.0 });
export const MAT_CHROME = new THREE.MeshStandardMaterial({ color: "#E2E8F0", roughness: 0.1, metalness: 0.95 });
export const MAT_CARABAO_HIDE = new THREE.MeshStandardMaterial({ color: "#2B2D2F", roughness: 0.85, metalness: 0.05 });
export const MAT_HORN_GREY = new THREE.MeshStandardMaterial({ color: "#4B4845", roughness: 0.6, metalness: 0.1 });
export const MAT_HORNBILL_BEAK = new THREE.MeshStandardMaterial({ color: "#DC2626", roughness: 0.3, metalness: 0.1 });
export const MAT_EAGLE_FEATHER = new THREE.MeshStandardMaterial({ color: "#3B2219", roughness: 0.8, metalness: 0.05 });
export const MAT_EAGLE_CREST = new THREE.MeshStandardMaterial({ color: "#D4C5B9", roughness: 0.75, metalness: 0.0 });

// ═══════════════════════════════════════════════════════════════════════════
// 🧑‍🔧 WORKER PPE & UNIFORMS
// ═══════════════════════════════════════════════════════════════════════════
export const MAT_WORKER_VEST_GREEN = new THREE.MeshStandardMaterial({ color: "#22C55E", roughness: 0.5, metalness: 0.05 });
export const MAT_WORKER_VEST_ORANGE = new THREE.MeshStandardMaterial({ color: "#F97316", roughness: 0.5, metalness: 0.05 });
export const MAT_WORKER_VEST_AMBER = new THREE.MeshStandardMaterial({ color: "#F59E0B", roughness: 0.5, metalness: 0.05 });
export const MAT_WORKER_VEST_ROYAL = new THREE.MeshStandardMaterial({ color: "#2563EB", roughness: 0.5, metalness: 0.05 });
export const MAT_WORKER_HARDHAT_YELLOW = new THREE.MeshStandardMaterial({ color: "#FACC15", roughness: 0.4, metalness: 0.05 });
export const MAT_WORKER_HARDHAT_WHITE = new THREE.MeshStandardMaterial({ color: "#F8FAFC", roughness: 0.4, metalness: 0.05 });

export const MAT_SHIRT_LONG_GREEN = new THREE.MeshStandardMaterial({ color: "#15803D", roughness: 0.7, metalness: 0.0 });
export const MAT_SHIRT_LIGHT_BLUE = new THREE.MeshStandardMaterial({ color: "#7DD3FC", roughness: 0.6, metalness: 0.0 });
export const MAT_SHIRT_BLAZER_NAVY = new THREE.MeshStandardMaterial({ color: "#1E293B", roughness: 0.65, metalness: 0.05 });
export const MAT_SHIRT_SLATE_ADMIN = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.65, metalness: 0.0 });
export const MAT_WORKER_VEST_BLUE = new THREE.MeshStandardMaterial({ color: "#0284C7", roughness: 0.5, metalness: 0.05 });

export const MAT_WORKER_VEST_NAVY = new THREE.MeshStandardMaterial({ color: "#1E3A8A", roughness: 0.55, metalness: 0.05 });
export const MAT_WORKER_VEST_DARK = new THREE.MeshStandardMaterial({ color: "#1E293B", roughness: 0.6, metalness: 0.05 });
export const MAT_WORKER_HARDHAT_GREEN = new THREE.MeshStandardMaterial({ color: "#16A34A", roughness: 0.4, metalness: 0.05 });
export const MAT_WORKER_HARDHAT_BLUE = new THREE.MeshStandardMaterial({ color: "#0284C7", roughness: 0.4, metalness: 0.05 });
export const MAT_WORKER_HARDHAT_RED = new THREE.MeshStandardMaterial({ color: "#DC2626", roughness: 0.4, metalness: 0.05 });
export const MAT_SKIN_TONE = new THREE.MeshStandardMaterial({ color: "#C68E65", roughness: 0.65, metalness: 0.0 });

export const MAT_SCRUBS_TEAL = new THREE.MeshStandardMaterial({ color: "#0D9488", roughness: 0.6, metalness: 0.0 });
export const MAT_SHIRT_ROYAL_HR = new THREE.MeshStandardMaterial({ color: "#1D4ED8", roughness: 0.6, metalness: 0.0 });
export const MAT_SHIRT_ROSE_HR = new THREE.MeshStandardMaterial({ color: "#E11D48", roughness: 0.6, metalness: 0.0 });
export const MAT_BLOUSE_PASTEL_PINK = new THREE.MeshStandardMaterial({ color: "#F472B6", roughness: 0.6, metalness: 0.0 });
export const MAT_FACE_LIPS_FEMALE = new THREE.MeshStandardMaterial({ color: "#DB2777", roughness: 0.5, metalness: 0.0 });
export const MAT_FACE_BLUSH = new THREE.MeshStandardMaterial({ color: "#FDA4AF", roughness: 0.7, metalness: 0.0 });
export const MAT_PEARL_EARRING = new THREE.MeshStandardMaterial({ color: "#F8FAFC", roughness: 0.1, metalness: 0.9 });
export const MAT_GOLD_ACCENT = new THREE.MeshStandardMaterial({ color: "#EAB308", roughness: 0.2, metalness: 0.85 });
export const MAT_HAIR_TIE_PINK = new THREE.MeshStandardMaterial({ color: "#EC4899", roughness: 0.5, metalness: 0.0 });
export const MAT_LANYARD_TEAL = new THREE.MeshStandardMaterial({ color: "#0F766E", roughness: 0.6, metalness: 0.0 });
export const MAT_ID_BADGE_WHITE = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.4, metalness: 0.1 });

export const MAT_PANTS_JEANS = new THREE.MeshStandardMaterial({ color: "#1E3A8A", roughness: 0.75, metalness: 0.0 });
export const MAT_PANTS_SLATE = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.7, metalness: 0.0 });
export const MAT_PANTS_CHARCOAL_OFFICE = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.7, metalness: 0.0 });
export const MAT_PANTS_CARGO_GREY = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.75, metalness: 0.0 });
export const MAT_PANTS_JOGGING_BLACK = new THREE.MeshStandardMaterial({ color: "#0F172A", roughness: 0.8, metalness: 0.0 });
export const MAT_PANTS_KHAKI = new THREE.MeshStandardMaterial({ color: "#A89F81", roughness: 0.75, metalness: 0.0 });


export const MAT_HAIR_BROWN = new THREE.MeshStandardMaterial({ color: "#451A03", roughness: 0.85, metalness: 0.05 });
export const MAT_HAIR_AUBURN = new THREE.MeshStandardMaterial({ color: "#78350F", roughness: 0.85, metalness: 0.05 });
export const MAT_HAIR_GREY = new THREE.MeshStandardMaterial({ color: "#94A3B8", roughness: 0.8, metalness: 0.05 });

// ═══════════════════════════════════════════════════════════════════════════
// 🚗 VEHICLES & ACCESSORIES
// ═══════════════════════════════════════════════════════════════════════════
export const MAT_VEHICLE_WHITE = new THREE.MeshStandardMaterial({ color: "#F8FAFC", roughness: 0.3, metalness: 0.4 });
export const MAT_VEHICLE_RED = new THREE.MeshStandardMaterial({ color: "#DC2626", roughness: 0.35, metalness: 0.3 });
export const MAT_VEHICLE_SLATE = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.4, metalness: 0.3 });
export const MAT_VEHICLE_CHASSIS = new THREE.MeshStandardMaterial({ color: "#0F172A", roughness: 0.5, metalness: 0.6 });
export const MAT_TIRE_RUBBER = new THREE.MeshStandardMaterial({ color: "#18181B", roughness: 0.9, metalness: 0.0 });
export const MAT_HEADLIGHT_ON = new THREE.MeshStandardMaterial({ color: "#FEF08A", emissive: new THREE.Color("#FEF08A"), emissiveIntensity: 4.5 });
export const MAT_HEADLIGHT_OFF = new THREE.MeshStandardMaterial({ color: "#64748B", roughness: 0.2, metalness: 0.8 });

export const MAT_GALLON_ROYAL_BLUE = new THREE.MeshStandardMaterial({ color: "#1D4ED8", roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 });
export const MAT_GALLON_COBALT_SOLID = new THREE.MeshStandardMaterial({ color: "#1E40AF", roughness: 0.3, metalness: 0.2 });
export const MAT_GALLON_CAP_WHITE = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.4, metalness: 0.0 });
export const MAT_GALLON_SPIGOT_RED = new THREE.MeshStandardMaterial({ color: "#DC2626", roughness: 0.4, metalness: 0.0 });
export const MAT_SAFETY_RED = new THREE.MeshStandardMaterial({ color: "#DC2626", roughness: 0.4, metalness: 0.1 });
export const MAT_ROAD_LINE_YELLOW = new THREE.MeshStandardMaterial({ color: "#FACC15", roughness: 0.8, metalness: 0.0 });
export const MAT_ROAD_LINE_WHITE = new THREE.MeshStandardMaterial({ color: "#F8FAFC", roughness: 0.8, metalness: 0.0 });
export const MAT_BRAKELIGHT_ON = new THREE.MeshStandardMaterial({ color: "#EF4444", emissive: new THREE.Color("#EF4444"), emissiveIntensity: 4.0 });

// ═══════════════════════════════════════════════════════════════════════════
// 🧑 SKIN TONES & FACIAL FEATURES
// ═══════════════════════════════════════════════════════════════════════════
export const MAT_SKIN_LIGHT = new THREE.MeshStandardMaterial({ color: "#E8B796", roughness: 0.65, metalness: 0.0 });
export const MAT_SKIN_MEDIUM = new THREE.MeshStandardMaterial({ color: "#C68E65", roughness: 0.65, metalness: 0.0 });
export const MAT_SKIN_BRONZE = new THREE.MeshStandardMaterial({ color: "#A0714D", roughness: 0.65, metalness: 0.0 });
export const MAT_SKIN_DEEP = new THREE.MeshStandardMaterial({ color: "#6D4C36", roughness: 0.65, metalness: 0.0 });

export const MAT_HAIR_BLACK = new THREE.MeshStandardMaterial({ color: "#1C1917", roughness: 0.85, metalness: 0.05 });
export const MAT_FACE_EYE_PUPIL = new THREE.MeshStandardMaterial({ color: "#0F172A", roughness: 0.2, metalness: 0.0 });
export const MAT_FACE_EYE_IRIS = new THREE.MeshStandardMaterial({ color: "#38200E", roughness: 0.3, metalness: 0.0 });
export const MAT_FACE_EYE_WHITE = new THREE.MeshStandardMaterial({ color: "#F8FAFC", roughness: 0.25, metalness: 0.0 });
export const MAT_FACE_EYEBROW = new THREE.MeshStandardMaterial({ color: "#1C1917", roughness: 0.85, metalness: 0.0 });
export const MAT_FACE_EYEBROW_GREY = new THREE.MeshStandardMaterial({ color: "#64748B", roughness: 0.85, metalness: 0.0 });
export const MAT_FACE_LIPS = new THREE.MeshStandardMaterial({ color: "#B46A55", roughness: 0.6, metalness: 0.0 });
export const MAT_FACE_LIPS_MALE = new THREE.MeshStandardMaterial({ color: "#A86250", roughness: 0.65, metalness: 0.0 });
export const MAT_MUSTACHE_BLACK = new THREE.MeshStandardMaterial({ color: "#18181B", roughness: 0.9, metalness: 0.0 });
export const MAT_MUSTACHE_SALT_PEPPER = new THREE.MeshStandardMaterial({ color: "#52525B", roughness: 0.9, metalness: 0.0 });
export const MAT_STUBBLE_SHADOW = new THREE.MeshStandardMaterial({ color: "#27272A", roughness: 0.95, metalness: 0.0, transparent: true, opacity: 0.45 });
export const MAT_SAFETY_GLASSES_LENS = new THREE.MeshStandardMaterial({ color: "#38BDF8", roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.55 });

// ═══════════════════════════════════════════════════════════════════════════
// 🩳 NIGHTTIME BARRACKS INDOOR ATTIRE ("PAMBAHAY"), LEISURE & NIGHT LIFE
// ═══════════════════════════════════════════════════════════════════════════
export const MAT_SANDO_WHITE = new THREE.MeshStandardMaterial({ color: "#F8FAFC", roughness: 0.8, metalness: 0.0 });
export const MAT_SANDO_GREY = new THREE.MeshStandardMaterial({ color: "#64748B", roughness: 0.8, metalness: 0.0 });
export const MAT_SANDO_RED = new THREE.MeshStandardMaterial({ color: "#DC2626", roughness: 0.75, metalness: 0.0 });
export const MAT_SANDO_BLACK = new THREE.MeshStandardMaterial({ color: "#1E293B", roughness: 0.8, metalness: 0.0 });

export const MAT_SHORTS_BASKETBALL_BLUE = new THREE.MeshStandardMaterial({ color: "#1D4ED8", roughness: 0.65, metalness: 0.05 });
export const MAT_SHORTS_DENIM = new THREE.MeshStandardMaterial({ color: "#2563EB", roughness: 0.85, metalness: 0.0 });
export const MAT_SHORTS_CARGO = new THREE.MeshStandardMaterial({ color: "#A89F81", roughness: 0.85, metalness: 0.0 });
export const MAT_PAJAMA_PLAID = new THREE.MeshStandardMaterial({ color: "#047857", roughness: 0.8, metalness: 0.0 });
export const MAT_PAJAMA_GREY = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.85, metalness: 0.0 });
export const MAT_TSINELAS_RUBBER = new THREE.MeshStandardMaterial({ color: "#0284C7", roughness: 0.7, metalness: 0.0 });
export const MAT_TSINELAS_RED = new THREE.MeshStandardMaterial({ color: "#DC2626", roughness: 0.7, metalness: 0.0 });

export const MAT_PHONE_BODY = new THREE.MeshStandardMaterial({ color: "#0F172A", roughness: 0.2, metalness: 0.8 });
export const MAT_PHONE_SCREEN_GLOW = new THREE.MeshStandardMaterial({ color: "#E0F2FE", emissive: new THREE.Color("#38BDF8"), emissiveIntensity: 3.5, roughness: 0.1 });
export const MAT_CIGARETTE_TIP_GLOW = new THREE.MeshStandardMaterial({ color: "#F87171", emissive: new THREE.Color("#EF4444"), emissiveIntensity: 4.5, roughness: 0.2 });
export const MAT_CIGARETTE_BODY = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.7, metalness: 0.0 });
export const MAT_CIGARETTE_FILTER = new THREE.MeshStandardMaterial({ color: "#D97706", roughness: 0.8, metalness: 0.0 });

export const MAT_MONOBLOC_STOOL_BLUE = new THREE.MeshStandardMaterial({ color: "#0284C7", roughness: 0.5, metalness: 0.05 });
export const MAT_MONOBLOC_STOOL_RED = new THREE.MeshStandardMaterial({ color: "#DC2626", roughness: 0.5, metalness: 0.05 });
export const MAT_MONOBLOC_STOOL_GREEN = new THREE.MeshStandardMaterial({ color: "#16A34A", roughness: 0.5, metalness: 0.05 });

export const MAT_BATYA_PLASTIC = new THREE.MeshStandardMaterial({ color: "#059669", roughness: 0.45, metalness: 0.05 });
export const MAT_SOAP_SUDS = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.3, transparent: true, opacity: 0.85 });
export const MAT_THERMOS_FLASK = new THREE.MeshStandardMaterial({ color: "#DC2626", roughness: 0.3, metalness: 0.7 });
export const MAT_COFFEE_MUG = new THREE.MeshStandardMaterial({ color: "#F8FAFC", roughness: 0.4, metalness: 0.1 });

// 🥩 FRESH FILIPINO KITCHEN INGREDIENTS & CLEAVER
export const MAT_RAW_PORK_BELLY = new THREE.MeshStandardMaterial({ color: "#F43F5E", roughness: 0.45, metalness: 0.05 });
export const MAT_RAW_PORK_FAT = new THREE.MeshStandardMaterial({ color: "#FFF1F2", roughness: 0.40, metalness: 0.05 });
export const MAT_SAYOTE_GREEN = new THREE.MeshStandardMaterial({ color: "#84CC16", roughness: 0.50, metalness: 0.02 });
export const MAT_KALABASA_ORANGE = new THREE.MeshStandardMaterial({ color: "#EA580C", roughness: 0.55, metalness: 0.02 });
export const MAT_KALABASA_SKIN = new THREE.MeshStandardMaterial({ color: "#15803D", roughness: 0.60, metalness: 0.02 });
export const MAT_ONION_RED = new THREE.MeshStandardMaterial({ color: "#9D174D", roughness: 0.40, metalness: 0.05 });
export const MAT_GARLIC_CLOVE = new THREE.MeshStandardMaterial({ color: "#FEF9C3", roughness: 0.50, metalness: 0.0 });
export const MAT_GINGER_ROOT = new THREE.MeshStandardMaterial({ color: "#D97706", roughness: 0.65, metalness: 0.0 });
export const MAT_CLEAVER_BLADE = new THREE.MeshStandardMaterial({ color: "#E2E8F0", roughness: 0.15, metalness: 0.95 });
export const MAT_WOOD_HANDLE = new THREE.MeshStandardMaterial({ color: "#78350F", roughness: 0.70, metalness: 0.05 });

// 🦅 SIERRA MADRE RUFOUS HORNBILL (KALAW) PBR FEATHERING
export const MAT_HORNBILL_RUFOUS = new THREE.MeshStandardMaterial({ color: "#83210C", roughness: 0.75, metalness: 0.05 });
export const MAT_HORNBILL_CASQUE = new THREE.MeshStandardMaterial({ color: "#DC2626", roughness: 0.35, metalness: 0.15 });
export const MAT_HORNBILL_BEAK_TIP = new THREE.MeshStandardMaterial({ color: "#FACC15", roughness: 0.40, metalness: 0.10 });
export const MAT_HORNBILL_WING_BLACK = new THREE.MeshStandardMaterial({ color: "#18181B", roughness: 0.70, metalness: 0.10 });
export const MAT_HORNBILL_TAIL_WHITE = new THREE.MeshStandardMaterial({ color: "#F8FAFC", roughness: 0.80, metalness: 0.0 });
export const MAT_HORNBILL_ORBITAL = new THREE.MeshStandardMaterial({ color: "#FDE047", roughness: 0.50, metalness: 0.0 });
export const MAT_HORNBILL_TALON = new THREE.MeshStandardMaterial({ color: "#27272A", roughness: 0.90, metalness: 0.05 });

// 🔬 CIVIL QA/QC SCHMIDT REBOUND HAMMER & GAUGES
export const MAT_SCHMIDT_HAMMER_CHROME = new THREE.MeshStandardMaterial({ color: "#E2E8F0", roughness: 0.20, metalness: 0.85 });
export const MAT_SCHMIDT_HAMMER_RED = new THREE.MeshStandardMaterial({ color: "#EF4444", roughness: 0.45, metalness: 0.10 });

// ⚡ SITE ELECTRICAL DISTRIBUTION, GENSET & ROADSIDE UTILITY POLES
export const MAT_GENSET_YELLOW = new THREE.MeshStandardMaterial({ color: "#EAB308", roughness: 0.35, metalness: 0.25 });
export const MAT_GENSET_DARK = new THREE.MeshStandardMaterial({ color: "#0F172A", roughness: 0.60, metalness: 0.50 });
export const MAT_GENSET_RADIATOR = new THREE.MeshStandardMaterial({ color: "#18181B", roughness: 0.85, metalness: 0.20 });
export const MAT_INSULATOR_CERAMIC = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.20, metalness: 0.60 });
export const MAT_STREETLIGHT_HEAD = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.40, metalness: 0.70 });
export const MAT_STREETLIGHT_LENS = new THREE.MeshStandardMaterial({ color: "#FEF08A", emissive: new THREE.Color("#FDE047"), emissiveIntensity: 1.5, roughness: 0.1 });
export const MAT_TRANSFORMER_CAN = new THREE.MeshStandardMaterial({ color: "#64748B", roughness: 0.45, metalness: 0.40 });
export const MAT_CONDUIT_METALLIC = new THREE.MeshStandardMaterial({ color: "#94A3B8", roughness: 0.30, metalness: 0.80 });
