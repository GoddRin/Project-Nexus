"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getWorkspaceSubNavForPath } from "./navigationConfig";
import { useMobileNav } from "./MobileNavContext";

interface WorkspaceSubNavProps {
  role?: string;
  className?: string;
}

/**
 * Editorial Sub-Navigation Strip
 * Provides flat, typographic, non-linear tab switching within consolidated hubs
 * (Overview, Geospatial & Weather Atlas, AI & Knowledge Hub) without "AI slop" pill boxes.
 */
export function WorkspaceSubNav({
  role = "EMPLOYEE",
  className,
}: WorkspaceSubNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { viewAsVisitor } = useMobileNav();

  const isAdminUser = role === "ADMINISTRATOR";
  const isVisitorMode = !isAdminUser || viewAsVisitor;

  const activeGroup = getWorkspaceSubNavForPath(pathname);

  // Keyboard shortcuts Alt+1..5 to switch tabs within the active workspace hub
  useEffect(() => {
    if (!activeGroup) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const idx = parseInt(e.key, 10) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < activeGroup.items.length) {
        e.preventDefault();
        router.push(activeGroup.items[idx].href);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeGroup, router]);

  if (!activeGroup) return null;

  // In Full Admin Mode (where the left sidebar is open), show the sub-nav on the
  // Geospatial Atlas and Weather & Hydro hubs so admins can hop between views in 1 click.
  // In Visitor Mode (where the left sidebar is gone), show it for all consolidated hubs.
  if (
    !isVisitorMode &&
    activeGroup.id !== "atlas-gis-hub" &&
    activeGroup.id !== "weather-hydro-hub"
  ) {
    return null;
  }

  const isSubItemActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    if (href === "/dashboard/weather") {
      return pathname === "/dashboard/weather";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isFullBleedAtlas = activeGroup.id === "atlas-gis-hub";

  return (
    <div
      className={cn(
        "mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border-hairline pb-0 print:hidden select-none",
        className,
        isFullBleedAtlas && "!max-w-none !w-auto -mx-2 sm:-mx-3.5 md:-mx-4 -mt-2 md:-mt-3.5 mb-2"
      )}
    >
      {/* Left: Editorial Section Eyebrow */}
      <div className={cn("hidden sm:flex items-center gap-2 pb-2.5", isFullBleedAtlas && "pb-1.5")}>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
          {activeGroup.title}
        </span>
      </div>

      {/* Right / Main: Flat Editorial Underline Tabs */}
      <nav
        aria-label={`${activeGroup.title} views`}
        className="flex flex-1 sm:flex-initial items-center gap-4 sm:gap-5 overflow-x-auto no-scrollbar"
      >
        {activeGroup.items.map((item, idx) => {
          const active = isSubItemActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              title={`${item.label} (Alt+${idx + 1})`}
              className={cn(
                "relative flex items-center gap-1.5 pb-2.5 text-xs font-display tracking-tight whitespace-nowrap transition-colors duration-150",
                isFullBleedAtlas && "pb-1.5",
                active
                  ? "text-text-primary font-semibold"
                  : "text-text-muted hover:text-text-primary font-medium"
              )}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-colors",
                  active
                    ? "text-scic-green dark:text-emerald-400"
                    : "text-text-muted/70"
                )}
              />
              <span className="hidden md:inline">{item.label}</span>
              <span className="md:hidden">{item.shortLabel || item.label}</span>
              {item.badge && (
                <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
                  <span className="h-1 w-1 rounded-full bg-red-500 mr-1 animate-pulse" />
                  {item.badge}
                </span>
              )}

              <span
                className={cn(
                  "hidden lg:inline-flex ml-0.5 font-mono text-[9px]",
                  active ? "text-scic-green dark:text-emerald-400" : "text-text-muted/50"
                )}
              >
                /{idx + 1}
              </span>

              {active && (
                <motion.span
                  layoutId="workspace-subnav-editorial-line"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-scic-green dark:bg-emerald-400"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
