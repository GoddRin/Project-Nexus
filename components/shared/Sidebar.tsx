"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  User,
  LogOut,
  Eye,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HydroPowerLogo } from "./HydroPowerLogo";
import { SafetyStreak } from "./SafetyStreak";
import {
  VISITOR_PILLARS,
  ADMIN_CORE_NAV_ITEMS,
  ADMIN_ACCORDION_GROUPS,
  isNavItemActive,
  type NavItem,
} from "./navigationConfig";
import { useMobileNav } from "./MobileNavContext";

interface SidebarProps {
  userName?: string;
  userEmail?: string;
  role?: string;
}

export function Sidebar({
  userName = "Visitor",
  userEmail = "",
  role = "EMPLOYEE",
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { viewAsVisitor, toggleViewAsVisitor } = useMobileNav();

  const isAdminUser = role === "ADMINISTRATOR";
  // Apply minimalist Visitor Sidebar to everyone who is NOT an ADMINISTRATOR,
  // or when an ADMINISTRATOR toggles "View as Visitor" on.
  const isVisitorMode = !isAdminUser || viewAsVisitor;

  const primaryNavItems: NavItem[] = isVisitorMode
    ? VISITOR_PILLARS
    : ADMIN_CORE_NAV_ITEMS;

  // pendingHref: the href we navigated to optimistically (before pathname updates)
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Keyboard shortcut: Ctrl+B / Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    if (isVisitorMode) return;
    const target = pendingHref ?? pathname;
    const newExpanded = { ...expandedGroups };
    let changed = false;
    ADMIN_ACCORDION_GROUPS.forEach((g) => {
      if (g.items.some((item) => isNavItemActive(item, target))) {
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
  }, [pathname, pendingHref, isVisitorMode]);

  const toggleGroup = (id: string) => {
    if (collapsed) return;
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  function handleNavClick(href: string) {
    setPendingHref(href);
  }

  function checkActive(item: NavItem): boolean {
    const target = pendingHref ?? pathname;
    return isNavItemActive(item, target);
  }

  // Editorial Top Masthead Architecture:
  // In Visitor Mode, the left sidebar completely disappears so Maps, 3D Digital Twin,
  // and Dashboards get 100% full-width screen real estate.
  if (isVisitorMode) {
    return null;
  }

  return (
    <aside
      className={cn(
        "hidden md:flex h-screen flex-col border-r border-border-hairline bg-gradient-to-b from-scic-navy/[0.03] to-transparent dark:from-bg-panel dark:to-bg-base shell-blur transition-[width] duration-200 ease-in-out print:hidden select-none",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* SCIC Corporate & Project Header + Integrated Rail Collapse Trigger */}
      <div className="border-b border-border-hairline p-2.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              collapsed ? setCollapsed(false) : setProjectOpen(!projectOpen)
            }
            className={cn(
              "flex flex-1 min-w-0 items-center gap-2.5 rounded-xl p-1.5 text-left transition-all duration-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]",
              collapsed && "justify-center"
            )}
            title={
              collapsed
                ? "Expand sidebar (Ctrl+B)"
                : "Tumauini HEPP · Client: PHPC · 11.3 MW"
            }
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white dark:bg-bg-panel border border-border-hairline overflow-hidden shadow-xs p-1">
              <HydroPowerLogo className="h-full w-full" size={36} />
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-display text-[9px] font-bold tracking-wider uppercase text-scic-green dark:text-scic-green-energy">
                      STA. CLARA INTL
                    </span>
                  </div>
                  <p className="truncate font-display text-xs font-bold text-text-primary leading-tight">
                    Tumauini HEPP
                  </p>
                  <p className="truncate font-mono text-[10px] text-text-muted leading-tight mt-0.5">
                    PHPC · 11.3 MW
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 flex-shrink-0 text-text-muted transition-transform duration-200",
                    projectOpen && "rotate-180"
                  )}
                />
              </>
            )}
          </button>

          {/* Top-Right Collapse Trigger (Linear / Vercel style) */}
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.06] hover:text-text-primary"
              title="Collapse sidebar (Ctrl+B)"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Collapsed state expand button */}
        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="mt-1.5 flex h-7 w-full items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.06] hover:text-text-primary"
            title="Expand sidebar (Ctrl+B)"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Project dropdown */}
        <AnimatePresence>
          {projectOpen && !collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] p-2">
                <p className="px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-text-muted">
                  Active Site
                </p>
                <div className="mt-1 flex items-center justify-between gap-2 rounded-lg bg-flow-teal/10 border border-flow-teal/20 px-2.5 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-flow-teal shadow-[0_0_8px_var(--color-flow-teal)]" />
                    <span className="truncate text-xs font-semibold text-text-primary">
                      Tumauini HEPP
                    </span>
                  </div>
                  <span className="font-mono text-[9px] font-bold text-flow-teal">
                    11.3 MW
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation (Zero Ugly Native Scrollbar via .no-scrollbar) */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 no-scrollbar">
        <div className="space-y-4">
          {!collapsed && isVisitorMode && (
            <div className="px-2.5">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-text-muted/75">
                Workspace
              </p>
            </div>
          )}

          {/* Core / Visitor Pillar Navigation */}
          <ul className="space-y-1">
            {primaryNavItems.map((item) => {
              const active = checkActive(item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={true}
                    onClick={() => handleNavClick(item.href)}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150",
                      collapsed && "justify-center px-0 py-2.5",
                      active
                        ? "bg-scic-green/15 text-scic-green dark:text-emerald-400 font-semibold shadow-2xs border border-scic-green/30"
                        : "text-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-text-primary border border-transparent"
                    )}
                    title={
                      item.description
                        ? `${item.label} — ${item.description}`
                        : item.label
                    }
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 flex-shrink-0 transition-[color] duration-150",
                        active
                          ? "text-scic-green dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,165,29,0.35)]"
                          : "text-text-muted group-hover:text-text-primary"
                      )}
                    />
                    {!collapsed && (
                      <div className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate leading-snug",
                            active ? "font-semibold" : "font-medium"
                          )}
                        >
                          {item.label}
                        </span>
                        {isVisitorMode && item.description && (
                          <span className="block truncate text-[10px] font-normal text-text-muted/80 leading-tight mt-0.5">
                            {item.description}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Accordion Groups — Only shown in Full Admin Mode */}
          {!isVisitorMode && (
            <>
              <div className="my-2 border-t border-black/[0.06] dark:border-white/[0.06]" />

              <div className="space-y-1.5">
                {ADMIN_ACCORDION_GROUPS.map((group) => {
                  const isExpanded = expandedGroups[group.id];
                  const isActiveGroup = group.items.some((item) =>
                    checkActive(item)
                  );

                  return (
                    <div key={group.id} className="flex flex-col">
                      <button
                        onClick={() => toggleGroup(group.id)}
                        className={cn(
                          "flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors rounded-lg",
                          collapsed && "hidden",
                          isActiveGroup
                            ? "text-scic-green dark:text-emerald-400"
                            : "text-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
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
                            initial={
                              collapsed ? false : { height: 0, opacity: 0 }
                            }
                            animate={{ height: "auto", opacity: 1 }}
                            exit={
                              collapsed ? undefined : { height: 0, opacity: 0 }
                            }
                            transition={{ duration: 0.2 }}
                            className={cn(
                              "space-y-0.5 overflow-hidden",
                              !collapsed &&
                                "mt-1 pl-2 border-l border-black/[0.06] dark:border-white/[0.06] ml-4"
                            )}
                          >
                            {group.items.map((item) => {
                              const active = checkActive(item);
                              const Icon = item.icon;

                              return (
                                <li key={item.href}>
                                  <Link
                                    href={item.href}
                                    prefetch={true}
                                    onClick={() => handleNavClick(item.href)}
                                    className={cn(
                                      "group flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs transition-all duration-150",
                                      collapsed && "justify-center px-0 py-2",
                                      active
                                        ? "bg-scic-green/15 text-scic-green dark:text-emerald-400 border border-scic-green/30 shadow-2xs font-semibold"
                                        : "text-text-secondary dark:text-text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-text-primary border border-transparent font-normal"
                                    )}
                                    title={item.label}
                                  >
                                    <Icon
                                      className={cn(
                                        "h-3.5 w-3.5 flex-shrink-0 transition-colors duration-150",
                                        active
                                          ? "text-scic-green dark:text-emerald-400"
                                          : "text-text-muted group-hover:text-text-primary"
                                      )}
                                    />
                                    {!collapsed && (
                                      <span className="truncate">
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
            </>
          )}
        </div>
      </nav>

      {/* Compact Footer Chrome: Micro-Safety Pill + Admin Switcher + Single-Row User Profile */}
      <div className="border-t border-border-hairline p-2.5 space-y-2">
        {/* Site Safety Streak: Single-line micro-pill in Visitor Mode (or compact ring when collapsed) */}
        {collapsed ? (
          <SafetyStreak variant="compact" />
        ) : isVisitorMode ? (
          <SafetyStreak variant="minimal" />
        ) : (
          <SafetyStreak variant="minimal" />
        )}

        {/* 1-Click Admin <-> Visitor View Switcher (Visible only to ADMINISTRATOR accounts) */}
        {isAdminUser && (
          <button
            type="button"
            onClick={toggleViewAsVisitor}
            className={cn(
              "flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all duration-150 border",
              collapsed ? "justify-center px-2" : "justify-between",
              viewAsVisitor
                ? "bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                : "bg-scic-green/10 text-scic-green dark:text-emerald-400 border-scic-green/25 hover:bg-scic-green/15"
            )}
            title={
              viewAsVisitor
                ? "Currently previewing Visitor View. Click to return to Full Admin View."
                : "Currently in Full Admin View. Click to preview Minimalist Visitor View."
            }
          >
            <span className="flex items-center gap-2 min-w-0">
              {viewAsVisitor ? (
                <Eye className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              {!collapsed && (
                <span className="truncate">
                  {viewAsVisitor ? "Visitor View" : "Admin View"}
                </span>
              )}
            </span>
            {!collapsed && (
              <span className="rounded-md bg-black/10 dark:bg-white/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider">
                Switch
              </span>
            )}
          </button>
        )}

        {/* Unified Single-Row User Profile + Inline Sign Out */}
        <div
          className={cn(
            "flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 bg-black/[0.025] dark:bg-white/[0.03] border border-border-hairline/60",
            collapsed && "flex-col justify-center px-1.5 py-2 gap-1.5"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2.5 min-w-0",
              collapsed && "justify-center"
            )}
          >
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-scic-blue/10 dark:bg-scic-cyan/10 border border-scic-blue/20 dark:border-scic-cyan/20 text-xs font-semibold text-scic-blue dark:text-scic-cyan">
              <User className="h-3.5 w-3.5" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-semibold text-text-primary leading-tight">
                    {userName}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 rounded px-1 py-0.2 font-mono text-[8px] font-bold uppercase tracking-wider",
                      isVisitorMode
                        ? "bg-slate-500/15 text-text-muted"
                        : "bg-scic-green/15 text-scic-green dark:text-emerald-400"
                    )}
                  >
                    {isVisitorMode ? "Visitor" : "Admin"}
                  </span>
                </div>
                {userEmail && (
                  <p className="truncate font-mono text-[10px] text-text-muted leading-tight mt-0.5">
                    {userEmail}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Inline Sign Out Icon Button */}
          <button
            type="button"
            onClick={async () => {
              setSigningOut(true);
              await signOut({ redirectUrl: "/sign-in" });
            }}
            disabled={signingOut}
            className={cn(
              "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-text-muted transition-all duration-150 hover:bg-signal-red/12 hover:text-signal-red",
              signingOut && "opacity-50 pointer-events-none"
            )}
            title={signingOut ? "Signing out…" : "Sign out"}
            aria-label="Sign out"
          >
            <LogOut
              className={cn("h-3.5 w-3.5", signingOut && "animate-spin")}
            />
          </button>
        </div>
      </div>
    </aside>
  );
}
