"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  User,
  LogOut,
  X,
  Eye,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HydroPowerLogo } from "./HydroPowerLogo";
import { SafetyStreak } from "./SafetyStreak";
import { useMobileNav } from "./MobileNavContext";
import {
  VISITOR_PILLARS,
  ADMIN_CORE_NAV_ITEMS,
  ADMIN_ACCORDION_GROUPS,
  isNavItemActive,
  type NavItem,
} from "./navigationConfig";

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
  const { isOpen, closeMobileNav, viewAsVisitor, toggleViewAsVisitor } =
    useMobileNav();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { signOut } = useClerk();
  const [signingOut, setSigningOut] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    operations: true,
    resources: false,
    admin: false,
  });

  const isAdminUser = role === "ADMINISTRATOR";
  const isVisitorMode = !isAdminUser || viewAsVisitor;

  const navItems: NavItem[] = isVisitorMode
    ? VISITOR_PILLARS
    : ADMIN_CORE_NAV_ITEMS;

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const checkActive = (item: NavItem) => isNavItemActive(item, pathname);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9990] md:hidden">
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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-bg-panel border border-border-hairline overflow-hidden shadow-sm p-1">
                  <HydroPowerLogo className="h-full w-full" size={40} />
                </div>
                <div className="min-w-0">
                  <span className="font-display text-[10px] font-bold tracking-wider uppercase text-scic-green dark:text-scic-green-energy">
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
            <div className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar">
              {/* Primary Navigation Items */}
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const active = checkActive(item);
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
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active
                            ? "text-scic-green dark:text-emerald-400"
                            : "text-text-muted"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate">{item.label}</span>
                        {isVisitorMode && item.description && (
                          <span className="block truncate text-[10px] font-normal text-text-muted">
                            {item.description}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </nav>

              {/* AI Assistant & Knowledge Hub Quick Access in Visitor Mode */}
              {isVisitorMode && (
                <div className="pt-2 border-t border-border-hairline">
                  <Link
                    href="/dashboard/assistant"
                    onClick={closeMobileNav}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 min-h-[44px]",
                      pathname.startsWith("/dashboard/assistant") ||
                        pathname.startsWith("/dashboard/knowledge-base") ||
                        pathname.startsWith("/dashboard/documents")
                        ? "bg-scic-green/15 text-scic-green dark:text-emerald-400 font-semibold shadow-sm border border-scic-green/30"
                        : "text-text-secondary hover:bg-muted/60 hover:text-text-primary"
                    )}
                  >
                    <Sparkles className="h-4 w-4 shrink-0 text-scic-green dark:text-emerald-400" />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate">AI Assistant</span>
                      <span className="block truncate text-[10px] font-normal text-text-muted">
                        Nexus AI Guide, Knowledge Base & Documents
                      </span>
                    </div>
                  </Link>
                </div>
              )}

              {/* Operations, Resources & Admin Accordion Groups (Only in Full Admin Mode) */}
              {!isVisitorMode && (
                <div className="space-y-3 pt-2 border-t border-border-hairline">
                  {ADMIN_ACCORDION_GROUPS.map((group) => {
                    const isExpanded = expandedGroups[group.id];
                    const hasActiveChild = group.items.some((item) =>
                      checkActive(item)
                    );

                    return (
                      <div key={group.id} className="space-y-1">
                        <button
                          onClick={() => toggleGroup(group.id)}
                          className={cn(
                            "flex w-full items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors min-h-[38px]",
                            hasActiveChild
                              ? "text-scic-green dark:text-emerald-400"
                              : "text-text-muted hover:text-text-primary"
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
                              const active = checkActive(item);
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
                                  <Icon
                                    className={cn(
                                      "h-3.5 w-3.5 shrink-0",
                                      active
                                        ? "text-scic-green dark:text-emerald-400"
                                        : "text-text-muted"
                                    )}
                                  />
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
              )}

              {/* Site safety board: days since the last lost-time accident */}
              <div className="pt-2">
                <SafetyStreak variant={isVisitorMode ? "minimal" : "drawer"} />
              </div>
            </div>

            {/* Drawer Footer: Admin View Switch, User Profile & Sign Out */}
            <div className="border-t border-border-hairline p-3 bg-muted/30 space-y-2">
              {isAdminUser && (
                <button
                  type="button"
                  onClick={toggleViewAsVisitor}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold border transition-colors",
                    viewAsVisitor
                      ? "bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      : "bg-scic-green/10 text-scic-green dark:text-emerald-400 border-scic-green/25"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {viewAsVisitor ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <ShieldCheck className="h-3.5 w-3.5" />
                    )}
                    <span>{viewAsVisitor ? "Visitor View" : "Admin View"}</span>
                  </span>
                  <span className="rounded bg-black/10 dark:bg-white/10 px-1.5 py-0.5 font-mono text-[9px] uppercase">
                    Switch
                  </span>
                </button>
              )}

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
                      {userEmail || (isVisitorMode ? "visitor" : role.toLowerCase())}
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
    </AnimatePresence>,
    document.body
  );
}
