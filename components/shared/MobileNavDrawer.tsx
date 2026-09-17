"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Box,
  Ticket,
  Package,
  BookOpen,
  FileText,
  ChevronDown,
  User,
  ClipboardList,
  ClipboardCheck,
  TrendingUp,
  Wrench,
  LogOut,
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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StaClaraLogo } from "./StaClaraLogo";
import { useMobileNav } from "./MobileNavContext";

const CORE_NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Digital Twin", href: "/digital-twin", icon: Box },
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

interface MobileNavDrawerProps {
  userName?: string;
  userEmail?: string;
  role?: string;
}

export function MobileNavDrawer({
  userName = "Site Admin",
  userEmail = "",
  role = "EMPLOYEE",
}: MobileNavDrawerProps) {
  const { isOpen, closeMobileNav } = useMobileNav();
  const pathname = usePathname();
  const { signOut } = useClerk();
  const [signingOut, setSigningOut] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    operations: true,
    resources: false,
    admin: false,
  });

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isItemActive = (href: string) => {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  };

  const navItems = [
    ...CORE_NAV_ITEMS,
    ...(role === "ADMINISTRATOR"
      ? [{ label: "Settings", href: "/dashboard/settings", icon: Settings }]
      : []),
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeMobileNav}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Slide-out Off-Canvas Drawer */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 w-[84%] max-w-xs bg-card border-r border-border-hairline shadow-2xl flex flex-col z-10 select-none overflow-hidden"
          >
            {/* Header: SCIC Logo & Project Badge */}
            <div className="flex items-center justify-between border-b border-border-hairline p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#0B131B] border border-border-hairline overflow-hidden shadow-sm p-1">
                  <StaClaraLogo className="h-full w-full" />
                </div>
                <div className="min-w-0">
                  <span className="font-display text-[10px] font-bold tracking-wider uppercase text-scic-blue dark:text-scic-cyan">
                    STA. CLARA INTL
                  </span>
                  <p className="truncate font-display text-sm font-bold text-text-primary leading-tight">
                    Tumauini HEPP
                  </p>
                  <p className="truncate font-mono text-[10px] text-text-muted">
                    Client: PHPC · 11.3 MW
                  </p>
                </div>
              </div>

              <button
                onClick={closeMobileNav}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-muted/80 border border-border-hairline transition-colors"
                title="Close Navigation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Navigation Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Primary Navigation Items */}
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const active = isItemActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobileNav}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 min-h-[44px]",
                        active
                          ? "bg-scic-green/15 text-scic-green dark:text-emerald-400 font-semibold shadow-sm border border-scic-green/30"
                          : "text-text-secondary hover:bg-muted/60 hover:text-text-primary"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-scic-green dark:text-emerald-400" : "text-text-muted")} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Operations, Resources & Admin Accordion Groups */}
              <div className="space-y-3 pt-2 border-t border-border-hairline">
                {ACCORDION_GROUPS.map((group) => {
                  const isExpanded = expandedGroups[group.id];
                  const hasActiveChild = group.items.some((item) => isItemActive(item.href));

                  return (
                    <div key={group.id} className="space-y-1">
                      <button
                        onClick={() => toggleGroup(group.id)}
                        className={cn(
                          "flex w-full items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors min-h-[38px]",
                          hasActiveChild ? "text-scic-green dark:text-emerald-400" : "text-text-muted hover:text-text-primary"
                        )}
                      >
                        <span>{group.title}</span>
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-200 text-text-muted",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </button>

                      {isExpanded && (
                        <div className="pl-2 space-y-0.5 animate-in slide-in-from-top-2 duration-150">
                          {group.items.map((item) => {
                            const active = isItemActive(item.href);
                            const Icon = item.icon;

                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={closeMobileNav}
                                className={cn(
                                  "flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all min-h-[40px]",
                                  active
                                    ? "bg-scic-green/15 text-scic-green dark:text-emerald-400 font-semibold border border-scic-green/30"
                                    : "text-text-muted hover:bg-muted/60 hover:text-text-primary"
                                )}
                              >
                                <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-scic-green dark:text-emerald-400" : "text-text-muted")} />
                                <span className="truncate">{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* SCIC Safety Hours Milestone Pill */}
              <div className="pt-2">
                <div className="flex items-center gap-2.5 rounded-xl border border-scic-green/30 bg-emerald-500/10 dark:bg-emerald-950/40 p-3 text-scic-green dark:text-emerald-400">
                  <Shield className="h-4 w-4 shrink-0 text-scic-green dark:text-emerald-400" />
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold leading-none text-text-primary dark:text-white">
                      1,420,500 HRS
                    </p>
                    <p className="mt-0.5 text-[10px] text-text-muted">
                      Safe Man-Hours · LTI Free
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer: User Profile & Sign Out */}
            <div className="border-t border-border-hairline p-3 bg-muted/30">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted border border-border-hairline">
                    <User className="h-4 w-4 text-text-muted" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-text-primary">
                      {userName}
                    </p>
                    <p className="truncate font-mono text-[10px] text-text-muted">
                      {userEmail || role.toLowerCase()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    setSigningOut(true);
                    await signOut({ redirectUrl: "/sign-in" });
                  }}
                  disabled={signingOut}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-text-muted hover:text-alert-red hover:bg-alert-red/10 border border-border-hairline transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
