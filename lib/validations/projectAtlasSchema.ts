import { z } from "zod";

// ============================================================
// Controlled Project Categories (Data-Driven Taxonomy)
// ============================================================
export const PROJECT_CATEGORIES = {
  HYDROPOWER: {
    id: "HYDROPOWER",
    label: "Hydropower & Renewable Energy",
    shortLabel: "Hydropower",
    color: "#10A51D",
    twBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    twText: "text-emerald-600 dark:text-emerald-400",
    twBorder: "border-emerald-500/30",
    icon: "Zap",
    description: "Run-of-river hydro plants, high-head penstocks, and water-driven turbine generation.",
  },
  WIND_POWER: {
    id: "WIND_POWER",
    label: "Wind Power & Clean Aerogenerators",
    shortLabel: "Wind Power",
    color: "#06B6D4",
    twBg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    twText: "text-cyan-600 dark:text-cyan-400",
    twBorder: "border-cyan-500/30",
    icon: "Wind",
    description: "Utility-scale onshore and offshore wind farms, turbine generator foundations, and heavy crane erection pads.",
  },
  WATER_RESOURCES: {
    id: "WATER_RESOURCES",
    label: "Water Utilities, Treatment & Reservoirs",
    shortLabel: "Water Resources",
    color: "#00A3E0",
    twBg: "bg-sky-500/10 dark:bg-sky-500/20",
    twText: "text-sky-600 dark:text-sky-400",
    twBorder: "border-sky-500/30",
    icon: "Waves",
    description: "Municipal water treatment plants, river intakes, reservoirs, and conveyance pipelines.",
  },
  ROADS_HIGHWAYS: {
    id: "ROADS_HIGHWAYS",
    label: "Highways, Expressways & Roads",
    shortLabel: "Roads & Highways",
    color: "#F59E0B",
    twBg: "bg-amber-500/10 dark:bg-amber-500/20",
    twText: "text-amber-600 dark:text-amber-400",
    twBorder: "border-amber-500/30",
    icon: "Navigation",
    description: "Arterial expressways, heavy rock excavations, and strategic agricultural highways.",
  },
  BRIDGES: {
    id: "BRIDGES",
    label: "Major Bridges & Flyovers",
    shortLabel: "Bridges",
    color: "#EC4899",
    twBg: "bg-pink-500/10 dark:bg-pink-500/20",
    twText: "text-pink-600 dark:text-pink-400",
    twBorder: "border-pink-500/30",
    icon: "Layers",
    description: "Long-span vehicular bridges, river crossings, and elevated grade separations.",
  },
  RAIL_TRANSIT: {
    id: "RAIL_TRANSIT",
    label: "Railways & Mass Transit",
    shortLabel: "Rail & Transit",
    color: "#8B5CF6",
    twBg: "bg-purple-500/10 dark:bg-purple-500/20",
    twText: "text-purple-600 dark:text-purple-400",
    twBorder: "border-purple-500/30",
    icon: "Train",
    description: "Elevated commuter rail viaducts, heavy bored piling, and passenger terminals.",
  },
  BUILDINGS: {
    id: "BUILDINGS",
    label: "Commercial & Institutional Buildings",
    shortLabel: "Buildings",
    color: "#6366F1",
    twBg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    twText: "text-indigo-600 dark:text-indigo-400",
    twBorder: "border-indigo-500/30",
    icon: "Building",
    description: "Corporate towers, specialized technical buildings, and campus facilities.",
  },
  INDUSTRIAL: {
    id: "INDUSTRIAL",
    label: "Industrial & Manufacturing Facilities",
    shortLabel: "Industrial",
    color: "#14B8A6",
    twBg: "bg-teal-500/10 dark:bg-teal-500/20",
    twText: "text-teal-600 dark:text-teal-400",
    twBorder: "border-teal-500/30",
    icon: "Factory",
    description: "Manufacturing complexes, logistics depots, and heavy industrial processing facilities.",
  },
  ENERGY_GRID: {
    id: "ENERGY_GRID",
    label: "Power Generation & Grid Substations",
    shortLabel: "Energy & Grid",
    color: "#3B82F6",
    twBg: "bg-blue-500/10 dark:bg-blue-500/20",
    twText: "text-blue-600 dark:text-blue-400",
    twBorder: "border-blue-500/30",
    icon: "Cpu",
    description: "Thermal generation plants, high-voltage switchyards (500kV/230kV), and BESS installations.",
  },
  MINING_TUNNELING: {
    id: "MINING_TUNNELING",
    label: "Mining & Heavy Underground Tunneling",
    shortLabel: "Mining & Tunnels",
    color: "#EF4444",
    twBg: "bg-rose-500/10 dark:bg-rose-500/20",
    twText: "text-rose-600 dark:text-rose-400",
    twBorder: "border-rose-500/30",
    icon: "Layers",
    description: "Deep subterranean rock tunneling, drill-and-blast excavation, and tailing containment.",
  },
  OTHER: {
    id: "OTHER",
    label: "Specialized Infrastructure & Heavy Civil",
    shortLabel: "Specialized Civil",
    color: "#64748B",
    twBg: "bg-slate-500/10 dark:bg-slate-500/20",
    twText: "text-slate-600 dark:text-slate-400",
    twBorder: "border-slate-500/30",
    icon: "Compass",
    description: "Site development, slope stabilization, maritime structures, and specialized civil works.",
  },
} as const;

export type ProjectCategoryId = keyof typeof PROJECT_CATEGORIES;
export const ProjectCategoryEnum = z.enum([
  "HYDROPOWER",
  "WIND_POWER",
  "WATER_RESOURCES",
  "ROADS_HIGHWAYS",
  "BRIDGES",
  "RAIL_TRANSIT",
  "BUILDINGS",
  "INDUSTRIAL",
  "ENERGY_GRID",
  "MINING_TUNNELING",
  "OTHER",
]);

// ============================================================
// Controlled Project Statuses
// ============================================================
export const PROJECT_STATUSES = {
  PLANNING: {
    id: "PLANNING",
    label: "Planning",
    badgeLabel: "Planning Stage",
    color: "#A855F7",
    twBg: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    isPulse: false,
  },
  UPCOMING: {
    id: "UPCOMING",
    label: "Upcoming",
    badgeLabel: "Upcoming / Mobilization",
    color: "#F59E0B",
    twBg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    isPulse: false,
  },
  ONGOING: {
    id: "ONGOING",
    label: "Ongoing",
    badgeLabel: "Active Construction",
    color: "#10B981",
    twBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    isPulse: true,
  },
  COMPLETED: {
    id: "COMPLETED",
    label: "Completed",
    badgeLabel: "Commissioned / Delivered",
    color: "#0284C7",
    twBg: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    isPulse: false,
  },
  ON_HOLD: {
    id: "ON_HOLD",
    label: "On Hold",
    badgeLabel: "Suspended / On Hold",
    color: "#64748B",
    twBg: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    isPulse: false,
  },
} as const;

export type ProjectStatusId = keyof typeof PROJECT_STATUSES;
export const ProjectStatusEnum = z.enum([
  "PLANNING",
  "UPCOMING",
  "ONGOING",
  "COMPLETED",
  "ON_HOLD",
]);

// Island Groups (Canonical Philippine Island Groups: Luzon, Visayas, Mindanao)
export const IslandGroupEnum = z
  .enum(["LUZON", "VISAYAS", "MINDANAO"])
  .or(z.literal("MIMAROPA").transform(() => "LUZON" as const));
export type IslandGroupId = "LUZON" | "VISAYAS" | "MINDANAO";

// ============================================================
// ============================================================
// Atlas Geographic Validation Envelope
// Latitude: ~4.0° N to ~22.0° N
// Longitude: ~116.0° E to ~128.0° E
// Note: This is an Atlas geographic validation envelope, not the exact Philippine territorial boundary.
// ============================================================
export const PH_LAT_MIN = 4.0;
export const PH_LAT_MAX = 22.0;
export const PH_LNG_MIN = 116.0;
export const PH_LNG_MAX = 128.0;

// Coordinate Validator
export const LatitudeSchema = z
  .number({ message: "Latitude is required" })
  .min(-90, "Latitude must be >= -90")
  .max(90, "Latitude must be <= 90")
  .refine(
    (lat) => lat >= PH_LAT_MIN && lat <= PH_LAT_MAX,
    `Latitude outside Atlas geographic validation envelope (${PH_LAT_MIN}°N - ${PH_LAT_MAX}°N)`
  );

export const LongitudeSchema = z
  .number({ message: "Longitude is required" })
  .min(-180, "Longitude must be >= -180")
  .max(180, "Longitude must be <= 180")
  .refine(
    (lng) => lng >= PH_LNG_MIN && lng <= PH_LNG_MAX,
    `Longitude outside Atlas geographic validation envelope (${PH_LNG_MIN}°E - ${PH_LNG_MAX}°E)`
  );

/**
 * Image Path validator supporting full URLs (HTTP/HTTPS) or relative paths (/project-images/...)
 */
export const ImagePathSchema = z
  .string()
  .refine(
    (val) =>
      val.startsWith("http://") ||
      val.startsWith("https://") ||
      val.startsWith("/") ||
      val.startsWith("project-images/"),
    "Image must be a valid HTTPS URL or relative project-images path"
  );

/**
 * Helper to generate a URL-friendly, lowercase kebab-case slug from a project name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "") // remove invalid characters
    .replace(/[\s_]+/g, "-") // collapse spaces and underscores to single hyphen
    .replace(/-+/g, "-") // collapse consecutive hyphens
    .replace(/^-+|-+$/g, ""); // trim leading and trailing hyphens
}

// ============================================================
// Project Input & Mutation Schema
// ============================================================
export const ProjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Project name must be at least 3 characters").max(200),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case (e.g. tumauini-hepp)"),
  projectCode: z.string().max(50).optional().nullable(),
  category: ProjectCategoryEnum.default("HYDROPOWER"),
  status: ProjectStatusEnum.default("ONGOING"),
  description: z.string().max(4000).optional().nullable(),
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
  islandGroup: IslandGroupEnum.default("LUZON"),
  region: z.string().min(2, "Region is required").max(100),
  province: z.string().min(2, "Province is required").max(100),
  municipality: z.string().min(2, "Municipality is required").max(100),
  barangay: z.string().max(100).optional().nullable(),
  locationDescription: z.string().max(500).optional().nullable(),
  capacity: z.string().max(100).optional().nullable(),
  projectStartDate: z.coerce.date().optional().nullable(),
  projectEndDate: z.coerce.date().optional().nullable(),
  client: z.string().max(200).optional().nullable(),
  projectValue: z.string().max(100).optional().nullable(),
  featuredImage: ImagePathSchema.optional().nullable(),
  gallery: z.array(ImagePathSchema).default([]),
  boundaryGeometry: z.record(z.string(), z.any()).optional().nullable(),
  leadPMName: z.string().max(150).optional().nullable(),
  leadPMRole: z.string().max(150).optional().nullable(),
  leadPMDivision: z.string().max(150).optional().nullable(),
  leadPMLicense: z.string().max(100).optional().nullable(),
  leadPMContact: z.string().email("Valid email required").optional().nullable(),
  engineeringScope: z.array(z.string()).default([]),
  keyMilestones: z
    .array(
      z.object({
        date: z.string(),
        title: z.string(),
        status: z.enum(["ACHIEVED", "IN_PROGRESS", "SCHEDULED"]),
      })
    )
    .optional()
    .nullable(),
  metrics: z.record(z.string(), z.any()).optional().nullable(),
  featured: z.boolean().default(false),
  targetCodDate: z.coerce.date().optional().nullable(),
});

export type ProjectInput = z.infer<typeof ProjectSchema>;

// Creation Schema
export const ProjectCreateSchema = ProjectSchema.omit({ id: true });
export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>;

// Update Schema with Optimistic Concurrency check
export const ProjectUpdateSchema = ProjectSchema.partial().extend({
  lastKnownUpdatedAt: z.string().optional(),
});
export type ProjectUpdateInput = z.infer<typeof ProjectUpdateSchema>;

// ============================================================
// Geographic Query & Filter Parameters Schema (Public)
// ============================================================
export const ProjectFilterSchema = z.object({
  category: ProjectCategoryEnum.or(z.literal("ALL")).optional().default("ALL"),
  status: ProjectStatusEnum.or(z.literal("ALL")).optional().default("ALL"),
  islandGroup: IslandGroupEnum.or(z.literal("ALL")).optional().default("ALL"),
  region: z.string().optional(),
  province: z.string().optional(),
  search: z.string().optional(),
  featuredOnly: z.coerce.boolean().optional(),
  // Spatial Bounding Box Filter: [minLat, minLng, maxLat, maxLng]
  bounds: z
    .tuple([
      z.coerce.number().min(-90).max(90), // south
      z.coerce.number().min(-180).max(180), // west
      z.coerce.number().min(-90).max(90), // north
      z.coerce.number().min(-180).max(180), // east
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export type ProjectFilterParams = z.input<typeof ProjectFilterSchema>;
export type ProjectFilterOutput = z.output<typeof ProjectFilterSchema>;

// ============================================================
// Admin Filter & Pagination Schema
// ============================================================
export const ProjectAdminFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(25),
  search: z.string().optional(),
  category: ProjectCategoryEnum.or(z.literal("ALL")).optional().default("ALL"),
  status: ProjectStatusEnum.or(z.literal("ALL")).optional().default("ALL"),
  islandGroup: IslandGroupEnum.or(z.literal("ALL")).optional().default("ALL"),
  region: z.string().optional(),
  sortBy: z
    .enum(["name", "projectCode", "category", "status", "region", "updatedAt", "createdAt"])
    .default("name"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
  includeDeleted: z.coerce.boolean().default(false),
});

export type ProjectAdminFilterParams = z.input<typeof ProjectAdminFilterSchema>;
export type ProjectAdminFilterOutput = z.output<typeof ProjectAdminFilterSchema>;

// ============================================================
// DTOs (Public vs Admin Separation)
// ============================================================

/**
 * Public Project DTO: Returned to map & directory viewers.
 * Excludes createdById, updatedById, deletedById, deletedAt, and audit logs.
 */
export interface PublicProjectDTO {
  id: string;
  name: string;
  slug: string;
  projectCode: string | null;
  category: ProjectCategoryId;
  status: ProjectStatusId;
  description: string | null;
  latitude: number;
  longitude: number;
  islandGroup: string | null;
  region: string;
  province: string;
  municipality: string;
  barangay: string | null;
  locationDescription: string | null;
  capacity: string | null;
  client: string | null;
  projectValue: string | null;
  featuredImage: string | null;
  gallery: string[];
  boundaryGeometry?: any | null;
  leadPMName: string | null;
  leadPMRole: string | null;
  leadPMDivision: string | null;
  leadPMLicense: string | null;
  leadPMContact: string | null;
  engineeringScope: string[];
  keyMilestones: any[];
  metrics: Record<string, any>;
  featured: boolean;
  targetCodDate: string | null;
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  completionYear?: number | null;
}

export interface UserSummaryDTO {
  id: string;
  name: string;
  email: string;
}

export interface ProjectAuditSummaryDTO {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  diff: Record<string, any> | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

/**
 * Admin Project DTO: Returned to authorized managers and administrators.
 * Includes audit fields, timestamps, user references, and recent audit logs.
 */
export interface AdminProjectDTO extends PublicProjectDTO {
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  createdBy?: UserSummaryDTO | null;
  updatedById: string | null;
  updatedBy?: UserSummaryDTO | null;
  deletedAt: string | null;
  deletedById: string | null;
  deletedBy?: UserSummaryDTO | null;
  recentAuditLogs?: ProjectAuditSummaryDTO[];
}
