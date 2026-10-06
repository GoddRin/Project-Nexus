/**
 * Plain names for the Project Atlas categories and statuses, as Nexus Home prints them.
 * (The Atlas has its own longer labels in components/atlas/AtlasTokens.ts; that file pulls in
 * the map, so the front page keeps this short list of its own.)
 */
export const SECTOR_LABEL: Record<string, string> = {
  HYDROPOWER: "Hydropower",
  WIND_POWER: "Wind power",
  SOLAR_POWER: "Solar power",
  ENERGY_GRID: "Power plants and grid",
  WATER_RESOURCES: "Water and wastewater",
  ROADS_HIGHWAYS: "Roads and expressways",
  BRIDGES: "Bridges",
  RAIL_TRANSIT: "Rail",
  BUILDINGS: "Buildings",
  INDUSTRIAL: "Industrial",
  MINING_TUNNELING: "Mining and tunnelling",
};

export const sectorLabel = (category: string) =>
  SECTOR_LABEL[category] ?? category.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** The three groups the front page sorts every status into */
export type StatusGroup = "ONGOING" | "COMPLETED" | "UPCOMING";
export const STATUS_GROUPS: { key: StatusGroup; label: string }[] = [
  { key: "ONGOING", label: "Ongoing" },
  { key: "COMPLETED", label: "Completed" },
  { key: "UPCOMING", label: "Upcoming" },
];

export function statusGroup(status: string): StatusGroup {
  if (status === "ONGOING" || status === "ACTIVE") return "ONGOING";
  if (status === "COMPLETED") return "COMPLETED";
  return "UPCOMING";
}
export const statusLabel = (status: string) => STATUS_GROUPS.find((g) => g.key === statusGroup(status))!.label;
