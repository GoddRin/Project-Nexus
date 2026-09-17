"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Box, MapPin, CloudLightning, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileNav } from "./MobileNavContext";

interface BottomTab {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  isAction?: boolean;
}

const BOTTOM_TABS: BottomTab[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Digital Twin", href: "/digital-twin", icon: Box },
  { label: "Site Map", href: "/dashboard/sitemap", icon: MapPin },
  { label: "Weather", href: "/dashboard/weather", icon: CloudLightning },
  { label: "Menu", icon: Menu, isAction: true },
];

export function MobileBottomBar() {
  const pathname = usePathname();
  const { isOpen, toggleMobileNav } = useMobileNav();

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#080E14]/90 backdrop-blur-lg border-t border-black/[0.08] dark:border-white/[0.08] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)] px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] transition-colors print:hidden"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {BOTTOM_TABS.map((tab) => {
          const Icon = tab.icon;

          if (tab.isAction) {
            return (
              <button
                key={tab.label}
                type="button"
                onClick={toggleMobileNav}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 min-h-[44px]",
                  isOpen
                    ? "text-scic-blue dark:text-scic-cyan font-semibold"
                    : "text-text-muted hover:text-text-primary active:scale-95"
                )}
                aria-label="Toggle navigation drawer"
                aria-expanded={isOpen}
              >
                <div
                  className={cn(
                    "p-1 rounded-lg transition-colors",
                    isOpen && "bg-scic-blue/10 dark:bg-scic-cyan/10"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 font-medium">{tab.label}</span>
              </button>
            );
          }

          const isActive =
            tab.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(tab.href || "___none___");

          return (
            <Link
              key={tab.label}
              href={tab.href!}
              prefetch={true}
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 min-h-[44px]",
                isActive
                  ? "text-scic-blue dark:text-scic-cyan font-semibold"
                  : "text-text-muted hover:text-text-primary active:scale-95"
              )}
            >
              <div
                className={cn(
                  "p-1 rounded-lg transition-colors",
                  isActive && "bg-scic-blue/10 dark:bg-scic-cyan/10"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
