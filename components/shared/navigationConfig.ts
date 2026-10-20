import type { ComponentType } from "react";
import {
  LayoutDashboard,
  House,
  Box,
  Ticket,
  Package,
  BookOpen,
  FileText,
  ClipboardList,
  ClipboardCheck,
  TrendingUp,
  Wrench,
  Shield,
  ShieldAlert,
  CloudLightning,
  Server,
  BarChart3,
  MapPin,
  Cpu,
  Sparkles,
  Globe,
  Zap,
  Settings,
  Map,
  Boxes,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
  /** Additional route prefixes that should mark this pillar as active */
  matchPrefixes?: string[];
  /** Exact routes that should mark this pillar as active */
  matchExact?: string[];
}

export interface AccordionNavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

export interface WorkspaceSubNavGroup {
  id: string;
  title: string;
  subtitle?: string;
  /** If true, only display this sub-nav in Admin mode (or when directly visiting the route) */
  adminOnly?: boolean;
  items: {
    label: string;
    shortLabel?: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

/**
 * 1. MINIMALIST VISITOR PILLARS (6 High-Signal Destinations, Zero Accordion Clutter)
 * Applied automatically to all non-ADMINISTRATOR accounts (GUEST, EMPLOYEE, etc.)
 * and to ADMINISTRATOR accounts when "View as Visitor" is toggled on.
 */
export const VISITOR_PILLARS: NavItem[] = [
  {
    label: "Home",
    href: "/home",
    icon: House,
    description: "Executive Front Page & Newsroom",
    matchPrefixes: ["/home"],
  },
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Command Center, Progress & Analytics",
    matchExact: ["/dashboard"],
    matchPrefixes: [
      "/dashboard/progress",
      "/dashboard/analytics",
      "/dashboard/intelligence",
    ],
  },
  {
    label: "Digital Twin",
    href: "/digital-twin",
    icon: Box,
    description: "Interactive 3D Hydroelectric Plant",
    matchPrefixes: ["/digital-twin", "/dashboard/digital-twin"],
  },
  {
    label: "Project Atlas",
    href: "/dashboard/projects-map",
    icon: Globe,
    description: "National Portfolio & Regional GIS Terrain",
    matchPrefixes: [
      "/dashboard/projects-map",
      "/dashboard/projects",
      "/dashboard/regional-map",
    ],
  },
  {
    label: "Site Map",
    href: "/dashboard/sitemap",
    icon: MapPin,
    description: "2D Interactive Site Locations",
    matchPrefixes: ["/dashboard/sitemap"],
  },
  {
    label: "PH Storm Monitor",
    href: "/dashboard/weather/philippines",
    icon: CloudLightning,
    description: "Philippines Typhoon Monitor & Site Weather / Hydro",
    matchPrefixes: ["/dashboard/weather"],
  },
];

/**
 * 2. WORKSPACE SUB-NAVIGATION GROUPS
 * Renders a sleek horizontal segmented pill bar at the top of grouped workspaces
 * so visitors and admins can switch between related views without sidebar clutter.
 */
export const WORKSPACE_SUB_NAVS: WorkspaceSubNavGroup[] = [
  {
    id: "overview-hub",
    title: "Project Overview",
    items: [
      { label: "Command Center", shortLabel: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Construction Progress", shortLabel: "Progress", href: "/dashboard/progress", icon: TrendingUp },
      { label: "S-Curve & Analytics", shortLabel: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
      { label: "Project Intelligence", shortLabel: "Intelligence", href: "/dashboard/intelligence", icon: Zap },
    ],
  },
  {
    id: "atlas-gis-hub",
    title: "Geospatial Atlas",
    items: [
      { label: "SCIC National Map", shortLabel: "National Map", href: "/dashboard/projects-map", icon: Globe },
      { label: "Regional Terrain", shortLabel: "Regional Map", href: "/dashboard/regional-map", icon: Map },
    ],
  },
  {
    id: "weather-hydro-hub",
    title: "PH Storm & Site Hydro Monitor",
    items: [
      { label: "PH Storm Monitor", shortLabel: "PH Monitor", href: "/dashboard/weather/philippines", icon: Globe },
      { label: "Site Weather & Hydro", shortLabel: "Site Weather", href: "/dashboard/weather", icon: CloudLightning },
    ],
  },
  {
    id: "knowledge-ai-hub",
    title: "AI & Knowledge Hub",
    items: [
      { label: "AI Assistant", shortLabel: "AI Guide", href: "/dashboard/assistant", icon: Sparkles },
      { label: "Knowledge Base", shortLabel: "Knowledge Base", href: "/dashboard/knowledge-base", icon: BookOpen },
      { label: "Controlled Documents", shortLabel: "Documents", href: "/dashboard/documents", icon: FileText },
    ],
  },
  {
    id: "operations-hub",
    title: "Site Operations",
    adminOnly: true,
    items: [
      { label: "Tickets", href: "/dashboard/tickets", icon: Ticket },
      { label: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
      { label: "Daily Reports", href: "/dashboard/reports", icon: ClipboardList },
      { label: "Safety Logs", href: "/dashboard/daily-logs", icon: ClipboardCheck },
      { label: "Incidents", href: "/dashboard/incidents", icon: ShieldAlert },
    ],
  },
  {
    id: "resources-hub",
    title: "Plant Resources",
    adminOnly: true,
    items: [
      { label: "Equipment", href: "/dashboard/equipment", icon: Cpu },
      { label: "Fixed Assets", href: "/dashboard/assets", icon: Boxes },
      { label: "Inventory", href: "/dashboard/inventory", icon: Package },
      { label: "Site Network", href: "/dashboard/network", icon: Server },
    ],
  },
];

/**
 * 3. FULL ADMIN NAVIGATION (When role === "ADMINISTRATOR" and NOT previewing as Visitor)
 */
export const ADMIN_CORE_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/home", icon: House },
  { label: "Command Center", href: "/dashboard", icon: LayoutDashboard },
  { label: "Digital Twin", href: "/digital-twin", icon: Box },
  { label: "SCIC National Map", href: "/dashboard/projects-map", icon: Globe },
  { label: "Site Map", href: "/dashboard/sitemap", icon: MapPin },
  { label: "Progress", href: "/dashboard/progress", icon: TrendingUp },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Project Intelligence", href: "/dashboard/intelligence", icon: Zap },
  { label: "AI Assistant", href: "/dashboard/assistant", icon: Sparkles },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export const ADMIN_ACCORDION_GROUPS: AccordionNavGroup[] = [
  {
    id: "operations",
    title: "Operations",
    items: [
      { label: "Daily Reports", href: "/dashboard/reports", icon: ClipboardList },
      { label: "Daily Safety Logs", href: "/dashboard/daily-logs", icon: ClipboardCheck },
      { label: "Tickets", href: "/dashboard/tickets", icon: Ticket },
      { label: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
      { label: "Weather", href: "/dashboard/weather", icon: CloudLightning },
      { label: "Philippines Monitor", href: "/dashboard/weather/philippines", icon: Globe },
      { label: "Regional Map", href: "/dashboard/regional-map", icon: Map },
      { label: "Incidents", href: "/dashboard/incidents", icon: ShieldAlert },
    ],
  },
  {
    id: "resources",
    title: "Resources",
    items: [
      { label: "Inventory", href: "/dashboard/inventory", icon: Package },
      { label: "Assets", href: "/dashboard/assets", icon: Boxes },
      { label: "Equipment", href: "/dashboard/equipment", icon: Cpu },
    ],
  },
  {
    id: "admin",
    title: "Information & Admin",
    items: [
      { label: "Documents", href: "/dashboard/documents", icon: FileText },
      { label: "Knowledge Base", href: "/dashboard/knowledge-base", icon: BookOpen },
      { label: "Visitors", href: "/dashboard/visitors", icon: Shield },
      { label: "Network", href: "/dashboard/network", icon: Server },
      { label: "Project Atlas Admin", href: "/dashboard/projects-admin", icon: Settings },
    ],
  },
];

/**
 * Helper: Determine if a navigation item or Visitor Pillar is active for a given pathname
 */
export function isNavItemActive(item: NavItem, targetPath: string): boolean {
  if (item.matchExact?.includes(targetPath)) {
    return true;
  }
  if (item.matchPrefixes && item.matchPrefixes.length > 0) {
    // Prevent `/dashboard/projects-admin` from matching `/dashboard/projects`
    if (targetPath.startsWith("/dashboard/projects-admin")) {
      return item.href === "/dashboard/projects-admin";
    }
    return item.matchPrefixes.some(
      (prefix) => targetPath === prefix || targetPath.startsWith(`${prefix}/`)
    );
  }
  if (item.href === "/dashboard") {
    return targetPath === "/dashboard";
  }
  // Exact match or sub-route match (e.g. /dashboard/tickets/new matches /dashboard/tickets)
  if (item.href === "/dashboard/weather") {
    return targetPath === "/dashboard/weather";
  }
  return targetPath === item.href || targetPath.startsWith(`${item.href}/`);
}

/**
 * Helper: Resolve which WorkspaceSubNavGroup applies to the current pathname
 */
export function getWorkspaceSubNavForPath(pathname: string): WorkspaceSubNavGroup | null {
  for (const group of WORKSPACE_SUB_NAVS) {
    const matches = group.items.some((sub) => {
      if (sub.href === "/dashboard") {
        return pathname === "/dashboard";
      }
      if (sub.href === "/dashboard/weather") {
        return pathname === "/dashboard/weather";
      }
      return pathname === sub.href || pathname.startsWith(`${sub.href}/`);
    });
    if (matches) return group;
  }
  return null;
}
