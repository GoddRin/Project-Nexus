"use client";

import React from "react";
import Link from "next/link";
import {
  Box,
  Globe,
  MapPin,
  BarChart3,
  Sparkles,
  CloudLightning,
  ArrowUpRight,
} from "lucide-react";
import { useMobileNav } from "@/components/shared/MobileNavContext";

interface RoleAwareDashboardLayoutProps {
  role?: string;
  completionWidget: React.ReactNode;
  weatherWidget: React.ReactNode;
  adminTicketsWidget: React.ReactNode;
  adminOnSiteWidget: React.ReactNode;
  adminActivityWidget: React.ReactNode;
  adminAnnouncementsWidget: React.ReactNode;
  adminQuickAccessWidget: React.ReactNode;
}

const VISITOR_EXPLORER_CARDS = [
  {
    eyebrow: "01 / 3D SIMULATION",
    title: "Interactive Digital Twin",
    description:
      "Explore the 11.3 MW powerhouse, intake weir, headrace penstock, and electro-mechanical turbine hall in real-time 3D.",
    href: "/digital-twin",
    cta: "Launch 3D Plant",
    icon: Box,
  },
  {
    eyebrow: "02 / GEOSPATIAL ATLAS",
    title: "SCIC National & Regional GIS",
    description:
      "Navigate Sta. Clara International's Philippine project portfolio, Cagayan Valley watershed terrain, and live radar.",
    href: "/dashboard/projects-map",
    cta: "Open GIS Atlas",
    icon: Globe,
  },
  {
    eyebrow: "03 / SITE ZONES",
    title: "2D Interactive Site Map",
    description:
      "Inspect engineering work fronts, civil structures, access roads, and field photography across Antagan Uno.",
    href: "/dashboard/sitemap",
    cta: "Explore Site Map",
    icon: MapPin,
  },
  {
    eyebrow: "04 / TELEMETRY & S-CURVE",
    title: "Progress & Analytics",
    description:
      "Review civil, electro-mechanical, and transmission line completion curves alongside commissioning milestones.",
    href: "/dashboard/analytics",
    cta: "View Telemetry",
    icon: BarChart3,
  },
  {
    eyebrow: "05 / METEOROLOGY",
    title: "PH Storm & Hydro Monitor",
    description:
      "Track PAGASA tropical cyclone bulletins, Pinacanauan River head levels, and shift-aware site weather.",
    href: "/dashboard/weather/philippines",
    cta: "Open Weather Monitor",
    icon: CloudLightning,
  },
  {
    eyebrow: "06 / PROJECT INTELLIGENCE",
    title: "Nexus AI Engineering Guide",
    description:
      "Ask technical questions about plant specifications, turbine ratings, and documented engineering standards.",
    href: "/dashboard/assistant",
    cta: "Ask Nexus AI",
    icon: Sparkles,
  },
];

export function RoleAwareDashboardContent({
  role = "EMPLOYEE",
  completionWidget,
  weatherWidget,
  adminTicketsWidget,
  adminOnSiteWidget,
  adminActivityWidget,
  adminAnnouncementsWidget,
  adminQuickAccessWidget,
}: RoleAwareDashboardLayoutProps) {
  const { viewAsVisitor } = useMobileNav();
  const isAdminUser = role === "ADMINISTRATOR";
  const isVisitorMode = !isAdminUser || viewAsVisitor;

  if (!isVisitorMode) {
    return (
      <div className="relative z-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-2">{completionWidget}</div>
        <div className="col-span-1">{adminTicketsWidget}</div>
        <div className="col-span-1">{adminOnSiteWidget}</div>
        <div className="col-span-1">{weatherWidget}</div>
        <div className="col-span-1 md:col-span-2 lg:col-span-1">
          {adminActivityWidget}
        </div>
        <div className="col-span-1 md:col-span-2 lg:col-span-3">
          {adminAnnouncementsWidget}
        </div>
        <div className="col-span-1 md:col-span-2 lg:col-span-3">
          {adminQuickAccessWidget}
        </div>
        <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-2">
          <Link
            href="/dashboard/analytics"
            className="inline-flex items-center gap-2 text-xs font-bold text-scic-blue dark:text-scic-cyan hover:underline transition-colors"
          >
            Comprehensive Project Telemetry & Advanced S-Curve Analytics{" "}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // Minimalist Editorial Visitor Dashboard:
  // Cleanly pairs the flagship Project Completion + Live Site Weather telemetry
  // with an architectural 6-card Explorer Grid (zero back-office ticket/guard clutter).
  return (
    <div className="relative z-10 space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">{completionWidget}</div>
        <div className="lg:col-span-1">{weatherWidget}</div>
      </div>

      {/* Editorial Explorer Directory */}
      <div className="pt-2">
        <div className="mb-3 flex items-center justify-between border-b border-border-hairline pb-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
            Interactive Plant & Portfolio Systems
          </span>
          <span className="font-mono text-[10px] text-text-muted">
            Tumauini HEPP · 11.3 MW
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {VISITOR_EXPLORER_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group flex flex-col justify-between rounded-xl border border-border-hairline bg-white/80 dark:bg-bg-panel/70 p-4 transition-all duration-150 hover:border-scic-green/45 dark:hover:border-emerald-500/40 hover:bg-white dark:hover:bg-bg-panel"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-scic-green dark:text-emerald-400">
                      {card.eyebrow}
                    </span>
                    <Icon className="h-4 w-4 text-text-muted transition-colors group-hover:text-scic-green dark:group-hover:text-emerald-400" />
                  </div>
                  <h3 className="mt-2 font-display text-sm font-bold tracking-tight text-text-primary group-hover:text-scic-green dark:group-hover:text-emerald-400 transition-colors">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-xs text-text-muted leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-2.5 text-[11px] font-semibold text-text-primary group-hover:text-scic-green dark:group-hover:text-emerald-400">
                  <span>{card.cta}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
