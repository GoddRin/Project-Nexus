"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import {
 LayoutDashboard,
 Ticket,
 Package,
 BookOpen,
 FileText,
 ChevronLeft,
 ChevronDown,
 User,
 ClipboardList,
 TrendingUp,
 Wrench,
 LogOut,
 Shield,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StaClaraLogo } from "@/components/shared/StaClaraLogo";

const CORE_NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Site Map", href: "/dashboard/sitemap", icon: MapPin },
  { label: "Progress", href: "/dashboard/progress", icon: TrendingUp },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Project Intelligence", href: "/dashboard/intelligence", icon: Zap },
  { label: "AI Assistant", href: "/dashboard/assistant", icon: Sparkles },
];

const ACCORDION_GROUPS = [
  {
    id: "operations",
    title: "Operations",
    items: [
      { label: "Daily Reports", href: "/dashboard/reports", icon: ClipboardList },
      { label: "Tickets", href: "/dashboard/tickets", icon: Ticket },
      { label: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
      { label: "Weather", href: "/dashboard/weather", icon: CloudLightning },
      { label: "Philippines Monitor", href: "/dashboard/weather/philippines", icon: Globe },
      { label: "Regional Map", href: "/dashboard/regional-map", icon: Map },
    ],
  },
  {
    id: "resources",
    title: "Resources",
    items: [
      { label: "Inventory", href: "/dashboard/inventory", icon: Package },
      { label: "Assets", href: "/dashboard/assets", icon: Package },
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
    ],
  },
];

interface SidebarProps {
 userName?: string;
 userEmail?: string;
 role?: string;
}

export function Sidebar({ userName = "Site Admin", userEmail = "", role = "EMPLOYEE" }: SidebarProps) {
 const [collapsed, setCollapsed] = useState(false);
 const [projectOpen, setProjectOpen] = useState(false);
 const [signingOut, setSigningOut] = useState(false);
 const pathname = usePathname();
 const router = useRouter();
 const { signOut } = useClerk();

 const navItems = [
   ...CORE_NAV_ITEMS,
   ...(role === "ADMINISTRATOR"
     ? [{ label: "Settings", href: "/dashboard/settings", icon: Settings }]
     : []),
 ];

 // pendingHref: the href we navigated to optimistically (before pathname updates)
 const [pendingHref, setPendingHref] = useState<string | null>(null);
 const [, startTransition] = useTransition();

 const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

 useEffect(() => {
   const target = pendingHref ?? pathname;
   const newExpanded = { ...expandedGroups };
   let changed = false;
   ACCORDION_GROUPS.forEach(g => {
     if (g.items.some(item => target === item.href || (item.href !== "/dashboard" && target.startsWith(item.href)))) {
       if (!newExpanded[g.id]) {
         newExpanded[g.id] = true;
         changed = true;
       }
     }
   });
    if (changed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedGroups(newExpanded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, pendingHref]);

 const toggleGroup = (id: string) => {
   if (collapsed) return; // Disallow toggling when collapsed
   setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
 };

 function handleNavClick(href: string) {
 // Snap the active highlight immediately, before the server responds
 setPendingHref(href);
 startTransition(() => {
 router.push(href);
 });
 }

 // Resolve which item is "active" — prefer the optimistic pending href
 function isItemActive(href: string): boolean {
 const target = pendingHref ?? pathname;
 return target === href || (href !== "/dashboard" && target.startsWith(href));
 }

 // Once navigation settles, clear pending so pathname takes over again
 // (pendingHref matches pathname → they agree → no visual difference)

 return (
  <aside
    className={cn(
      "flex h-screen flex-col border-r border-black/[0.06] dark:border-white/[0.06] bg-gradient-to-b from-black/[0.02] to-transparent dark:from-white/[0.04] dark:to-white/[0.01] shell-blur transition-[width] duration-200 ease-in-out",
      collapsed ? "w-16" : "max-md:w-16 md:w-60"
    )}
  >
 {/* Project Switcher */}
  <div className="border-b border-black/[0.06] dark:border-white/[0.06] p-3">
    <button
      onClick={() => !collapsed && setProjectOpen(!projectOpen)}
      className={cn(
        "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-[background-color] duration-150 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]",
        collapsed ? "justify-center" : "max-md:justify-center"
      )}
 >
 <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-green/15 shadow-[0_0_12px_rgba(1,119,11,0.2),inset_0_1px_0_rgba(255,255,255,0.05)] border border-brand-green/25">
 <StaClaraLogo className="h-5 w-5 text-brand-green drop-shadow-[0_0_8px_var(--color-brand-green)]" />
 </div>
 {!collapsed && (
 <>
 <div className="min-w-0 flex-1 max-md:hidden">
 <p className="truncate font-display text-xs font-semibold text-text-primary">
 Tumauini HEPP
 </p>
 <p className="truncate font-mono text-[10px] text-text-muted">
 11.3 MW · Run-of-river
 </p>
 </div>
 <ChevronDown
 className={cn(
 "h-3.5 w-3.5 flex-shrink-0 text-text-muted transition-transform duration-150 max-md:hidden",
 projectOpen && "rotate-180"
 )}
 />
 </>
 )}
 </button>

 {/* Project dropdown */}
 <AnimatePresence>
 {projectOpen && !collapsed && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: "auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.15 }}
 className="overflow-hidden max-md:hidden"
 >
    <div className="mt-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] p-2">
      <p className="px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-text-muted">
 Projects
 </p>
 <div className="mt-1 flex items-center gap-2 rounded-lg bg-flow-teal/10 border border-flow-teal/20 px-2 py-1.5">
 <div className="h-1.5 w-1.5 rounded-full bg-flow-teal shadow-[0_0_8px_var(--color-flow-teal)]" />
 <span className="text-xs font-medium text-text-primary">
 Tumauini HEPP
 </span>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 {/* Navigation */}
 <nav className="flex-1 overflow-y-auto p-2">
  <div className="space-y-4">
    {/* Core Navigation */}
    <ul className="space-y-1">
      {navItems.map((item) => {
        const active = isItemActive(item.href);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              prefetch={true}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(item.href);
              }}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-[background-color,border-color,color] duration-150",
                collapsed ? "justify-center px-0" : "max-md:justify-center max-md:px-0",
                active
                  ? "bg-white text-text-primary dark:bg-white/[0.08] dark:text-white border border-black/[0.08] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.2)]"
                  : "text-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-text-primary border border-transparent"
              )}
              title={item.label}
            >
              <Icon
                className={cn(
                  "h-4.5 w-4.5 flex-shrink-0 transition-[color] duration-150",
                  active ? "text-flow-teal drop-shadow-[0_0_10px_rgba(31,182,166,0.5)]" : "text-text-muted group-hover:text-text-primary"
                )}
              />
              {!collapsed && (
                <span className={cn("truncate max-md:hidden", active ? "font-semibold" : "font-normal")}>
                  {item.label}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>

    <div className="my-2 border-t border-black/[0.06] dark:border-white/[0.06]" />

    {/* Accordion Groups */}
    <div className="space-y-2">
      {ACCORDION_GROUPS.map((group) => {
        const isExpanded = expandedGroups[group.id];
        const isActiveGroup = group.items.some(item => isItemActive(item.href));

        return (
          <div key={group.id} className="flex flex-col">
            <button
              onClick={() => toggleGroup(group.id)}
              className={cn(
                "flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors rounded-lg",
                collapsed ? "hidden" : "max-md:hidden",
                isActiveGroup ? "text-flow-teal" : "text-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
              )}
            >
              <span>{group.title}</span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  isExpanded ? "rotate-180" : ""
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {(isExpanded || collapsed) && (
                <motion.ul
                  initial={collapsed ? false : { height: 0, opacity: 0 }}
                  animate={collapsed ? { height: "auto", opacity: 1 } : { height: "auto", opacity: 1 }}
                  exit={collapsed ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "space-y-1 overflow-hidden",
                    !collapsed && "mt-1 pl-2 border-l border-black/[0.06] dark:border-white/[0.06] ml-4"
                  )}
                >
                  {group.items.map((item) => {
                    const active = isItemActive(item.href);
                    const Icon = item.icon;

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          prefetch={true}
                          onClick={(e) => {
                            e.preventDefault();
                            handleNavClick(item.href);
                          }}
                          className={cn(
                            "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-[background-color,border-color,color] duration-150",
                            collapsed ? "justify-center px-0 py-2.5" : "max-md:justify-center max-md:px-0",
                            active
                              ? "bg-white text-text-primary dark:bg-white/[0.08] dark:text-white border border-black/[0.08] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.2)]"
                              : "text-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-text-primary border border-transparent"
                          )}
                          title={item.label}
                        >
                          <Icon
                            className={cn(
                              "h-4.5 w-4.5 flex-shrink-0 transition-[color] duration-150",
                              active ? "text-flow-teal drop-shadow-[0_0_10px_rgba(31,182,166,0.5)]" : "text-text-muted group-hover:text-text-primary"
                            )}
                          />
                          {!collapsed && (
                            <span className={cn("truncate max-md:hidden", active ? "font-semibold" : "font-normal")}>
                              {item.label}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  </div>
 </nav>

 {/* User menu & collapse toggle */}
  <div className="border-t border-black/[0.06] dark:border-white/[0.06] p-2">
    {/* User */}
 <div
 className={cn(
 "flex items-center gap-2.5 rounded-xl px-2.5 py-2",
 collapsed ? "justify-center px-2" : "max-md:justify-center max-md:px-2"
 )}
 >
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-black/[0.04] dark:bg-white/[0.06] ring-1 ring-black/[0.06] dark:ring-white/[0.08] text-xs font-medium text-text-muted">
        <User className="h-3.5 w-3.5" />
 </div>
 {!collapsed && (
 <div className="min-w-0 flex-1 max-md:hidden">
 <p className="truncate text-xs font-semibold text-text-primary">
 {userName}
 </p>
 {userEmail && (
 <p className="truncate font-mono text-[10px] text-text-muted">
 {userEmail}
 </p>
 )}
 </div>
 )}
 </div>

 {/* Sign out */}
 <button
 onClick={async () => {
 setSigningOut(true);
 await signOut({ redirectUrl: "/sign-in" });
 }}
 disabled={signingOut}
 className={cn(
 "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs text-text-muted transition-all duration-150 hover:bg-signal-red/10 hover:text-signal-red",
 collapsed ? "justify-center px-2" : "max-md:justify-center max-md:px-2",
 signingOut && "opacity-50 pointer-events-none"
 )}
 title="Sign out"
 >
 <LogOut className={cn("h-4 w-4 flex-shrink-0", signingOut && "animate-spin")} />
 {!collapsed && <span className="max-md:hidden">{signingOut ? "Signing out…" : "Sign out"}</span>}
 </button>

 {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex h-8 w-full items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-text-primary max-md:hidden"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
 <ChevronLeft
 className={cn(
 "h-4 w-4 transition-transform duration-200",
 collapsed && "rotate-180"
 )}
 />
 {!collapsed && <span>Collapse</span>}
 </button>
 </div>
 </aside>
 );
}


