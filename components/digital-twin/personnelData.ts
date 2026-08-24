export interface FilipinoPersonnel {
  id: string;
  name: string;
  nickname: string;
  role: string;
  department: "MANAGEMENT" | "CIVIL" | "ELECTRICAL" | "SAFETY" | "LOGISTICS" | "CAMP_SERVICES";
  skinTone: "LIGHT" | "MEDIUM" | "BRONZE" | "DEEP";
  gender: "MALE" | "FEMALE";
  hardhatColor: string;
  vestColor: string;
  hairStyle: "SHORT" | "POMPADOUR" | "PONYTAIL" | "CHEF_BANDANA" | "BALD";
  facialHair?: "NONE" | "MUSTACHE" | "BEARD" | "GOATEE" | "STUBBLE";
  hasGlasses?: boolean;
  avatarUrl: string;
  licenseNumber: string;
  currentTask: string;
  locationName: string;
  shift: string;
  yearsOfExp: number;
  originProvince: string;
}

export const FILIPINO_PERSONNEL_REGISTRY: Record<string, FilipinoPersonnel> = {
  "PM_DANILO_ROXAS": {
    id: "PM_DANILO_ROXAS",
    name: "Engr. Danilo T. Roxas",
    nickname: "Sir Danny",
    role: "Resident Project Manager & Civil Construction Head",
    department: "MANAGEMENT",
    skinTone: "MEDIUM",
    gender: "MALE",
    hardhatColor: "#FFFFFF",
    vestColor: "#0F766E", // Teal Management Vest
    hairStyle: "SHORT",
    facialHair: "MUSTACHE",
    hasGlasses: true,
    avatarUrl: "/images/personnel/pm_danilo_roxas.jpg",
    licenseNumber: "PRC Civil Eng. #0048291 • APEC Engineer",
    currentTask: "Directing Tuesday Safety Toolbox Meeting & Overseeing Penstock Alignment",
    locationName: "TEMFACIL Safety Stage / Executive Office",
    shift: "Day Shift (06:00 - 18:00)",
    yearsOfExp: 26,
    originProvince: "Batangas, Philippines",
  },
  "ENGR_MARIA_REYES": {
    id: "ENGR_MARIA_REYES",
    name: "Engr. Maria Clara S. Reyes",
    nickname: "Ma'am Clara",
    role: "Lead Electrical QA/QC & Substation Commissioning Engineer",
    department: "ELECTRICAL",
    skinTone: "LIGHT",
    gender: "FEMALE",
    hardhatColor: "#FFFFFF",
    vestColor: "#EA580C", // Orange High-Vis Vest
    hairStyle: "PONYTAIL",
    facialHair: "NONE",
    hasGlasses: true,
    avatarUrl: "/images/personnel/engr_maria_reyes.jpg",
    licenseNumber: "PRC Registered Electrical Eng. #0091834",
    currentTask: "Conducting insulation resistance & SF6 gas pressure verification on 69kV Circuit Breakers",
    locationName: "69kV Switchyard & Powerhouse Generator Floor",
    shift: "Day Shift (07:00 - 17:00)",
    yearsOfExp: 11,
    originProvince: "Pampanga, Philippines",
  },
  "FOREMAN_NONOY": {
    id: "FOREMAN_NONOY",
    name: "Rodrigo 'Nonoy' Macaraeg",
    nickname: "Kuya Nonoy",
    role: "Master Civil & Rebar Construction General Foreman",
    department: "CIVIL",
    skinTone: "DEEP",
    gender: "MALE",
    hardhatColor: "#16A34A", // Green Hardhat
    vestColor: "#EA580C", // Orange Safety Vest
    hairStyle: "SHORT",
    facialHair: "MUSTACHE",
    hasGlasses: false,
    avatarUrl: "/images/personnel/foreman_nonoy_macaraeg.jpg",
    licenseNumber: "TESDA Master Rebar & Formwork Assessor NC-III",
    currentTask: "Supervising structural slab rebar ties & concrete pour staging",
    locationName: "Main Powerhouse Structural Slab & Mountain Retaining Walls",
    shift: "Day Shift (06:30 - 17:30)",
    yearsOfExp: 19,
    originProvince: "Iloilo, Philippines",
  },
  "HSE_RAMON_SANTOS": {
    id: "HSE_RAMON_SANTOS",
    name: "Ramon B. Santos",
    nickname: "Officer Mon",
    role: "Senior Health, Safety & Environment (HSE) Lead Officer",
    department: "SAFETY",
    skinTone: "BRONZE",
    gender: "MALE",
    hardhatColor: "#FFFFFF",
    vestColor: "#EAB308", // Neon Yellow Safety Vest
    hairStyle: "SHORT",
    facialHair: "GOATEE",
    hasGlasses: false,
    avatarUrl: "/images/personnel/hse_ramon_santos.jpg",
    licenseNumber: "DOLE-OSHC Accredited Safety Practitioner (BOSH/COSH #39201)",
    currentTask: "Delivering daily critical high-risk hazard controls brief & checking fall protection gear",
    locationName: "TEMFACIL Compound Security Gate & Main Haul Road",
    shift: "Day Shift (06:00 - 18:00)",
    yearsOfExp: 14,
    originProvince: "Isabela, Philippines",
  },
  "GUARD_ROBERTO_DIZON": {
    id: "GUARD_ROBERTO_DIZON",
    name: "SG Roberto 'Bert' Dizon",
    nickname: "Chief Bert",
    role: "Senior Security Marshal & Compound Gate Commander",
    department: "SAFETY",
    skinTone: "BRONZE",
    gender: "MALE",
    hardhatColor: "#FFFFFF",
    vestColor: "#1E293B", // Navy Blue Security Uniform
    hairStyle: "SHORT",
    facialHair: "MUSTACHE",
    hasGlasses: false,
    avatarUrl: "/images/personnel/hse_ramon_santos.jpg",
    licenseNumber: "PNP-SOSIA Licensed Security Officer #SO-2017-09481 • DOLE OSH Practitioner",
    currentTask: "Conducting vehicle entry inspections, driver manifest verification & boom barrier gate clearance",
    locationName: "TEMFACIL Compound Main Security Guardhouse & Checkpoint",
    shift: "Day Shift (06:00 - 18:00)",
    yearsOfExp: 16,
    originProvince: "Bulacan, Philippines",
  },
  "CHEF_MANG_CARDO": {
    id: "CHEF_MANG_CARDO",
    name: "Ricardo 'Mang Cardo' Dizon",
    nickname: "Mang Cardo",
    role: "Camp Head Chef & Nutritional Logistics Supervisor",
    department: "CAMP_SERVICES",
    skinTone: "BRONZE",
    gender: "MALE",
    hardhatColor: "NONE",
    vestColor: "#FFFFFF", // White Apron
    hairStyle: "CHEF_BANDANA",
    facialHair: "MUSTACHE",
    hasGlasses: false,
    avatarUrl: "/images/personnel/chef_mang_cardo.jpg",
    licenseNumber: "TESDA Commercial Cookery NC-II • DOH Food Safety Cert",
    currentTask: "Cooking Chicken & Pork Adobo in giant kawali and simmering Sinigang for shift workers",
    locationName: "Workers' Barracks Central Kusina Pavilion",
    shift: "Morning Cook Shift (04:00 - 14:00)",
    yearsOfExp: 22,
    originProvince: "Pangasinan, Philippines",
  },
  "DRIVER_ERICK": {
    id: "DRIVER_ERICK",
    name: "Erick Dela Cruz",
    nickname: "Kuya Erick",
    role: "Heavy Mining Tipper & Aggregate Hauler Operator",
    department: "LOGISTICS",
    skinTone: "DEEP",
    gender: "MALE",
    hardhatColor: "#EAB308", // Yellow Hardhat
    vestColor: "#EA580C", // Bright Orange Vest
    hairStyle: "SHORT",
    facialHair: "STUBBLE",
    hasGlasses: false,
    avatarUrl: "/images/personnel/driver_erick_dela_cruz.jpg",
    licenseNumber: "LTO Professional Driver Lic (Restriction Code 8 Heavy Articulated)",
    currentTask: "Hauling crushed aggregate from Lower Quarry to TEMFACIL Material Depot",
    locationName: "Powerhouse Access Haul Road (Volvo 10-Wheeler Dump Truck #14)",
    shift: "Day Shift (06:00 - 18:00)",
    yearsOfExp: 13,
    originProvince: "Nueva Ecija, Philippines",
  },
  "TECH_JC_MORALES": {
    id: "TECH_JC_MORALES",
    name: "Juan Carlo 'JC' Morales",
    nickname: "JC",
    role: "Hydro Turbine & Hydro-Mechanical Commissioning Specialist",
    department: "ELECTRICAL",
    skinTone: "LIGHT",
    gender: "MALE",
    hardhatColor: "#0284C7", // Blue Hardhat
    vestColor: "#0284C7", // Blue Technical Vest
    hairStyle: "POMPADOUR",
    facialHair: "NONE",
    hasGlasses: true,
    avatarUrl: "/images/personnel/tech_jc_morales.jpg",
    licenseNumber: "PRC Mechanical Plant Specialist #0033190",
    currentTask: "Aligning Francis turbine shaft torque specs & digital transducer calibration",
    locationName: "Powerhouse Turbine & Generator Floor (EL. 182.00m)",
    shift: "Day Shift (07:00 - 17:00)",
    yearsOfExp: 7,
    originProvince: "Cebu, Philippines",
  },
};
