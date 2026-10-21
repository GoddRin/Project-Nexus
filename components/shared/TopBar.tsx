"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
  Search,
  Bell,
  Check,
  Clock,
  Ticket,
  Shield,
  Wrench,
  Info,
  Menu,
  User,
  LogOut,
  Eye,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import type { NotificationItem } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SoundToggle } from "./SoundToggle";
import { useMobileNav } from "./MobileNavContext";
import { HydroPowerLogo } from "./HydroPowerLogo";
import { GlobalSearchModal } from "./GlobalSearchModal";
import { SafetyStreak } from "./SafetyStreak";
import { VISITOR_PILLARS, isNavItemActive } from "./navigationConfig";

interface TopBarProps {
  className?: string;
  role?: string;
  userName?: string;
  userEmail?: string;
}

/**
 * TopBar & SCIC Editorial Masthead
 * - In Visitor Mode: Acts as the unified 56px Editorial Top Masthead (Rivian / Palantir style)
 *   housing brand identity, 6 typographic navigation pillars with 2px active baseline,
 *   safety micro-pill, search, AI assistant quick-access, and user profile popover — zero left sidebar required.
 * - In Admin Mode: Acts as the command bar alongside the persistent Admin Sidebar.
 */
export function TopBar({
  className,
  role = "EMPLOYEE",
  userName = "Visitor",
  userEmail = "",
}: TopBarProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { toggleMobileNav, viewAsVisitor, toggleViewAsVisitor } = useMobileNav();

  const isAdminUser = role === "ADMINISTRATOR";
  const isVisitorMode = !isAdminUser || viewAsVisitor;
  const isAiHubActive =
    pathname.startsWith("/dashboard/assistant") ||
    pathname.startsWith("/dashboard/knowledge-base") ||
    pathname.startsWith("/dashboard/documents");

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [lastReadAt, setLastReadAt] = useState<number>(0);

  const popoverRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Global keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch notifications and initialize read state
  useEffect(() => {
    const storedLastRead = localStorage.getItem("nexus_last_read_notifications");
    if (storedLastRead) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastReadAt(parseInt(storedLastRead, 10));
    }

    fetch("/api/notifications", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setNotifications(data);
      })
      .catch((err) => {
        console.error("Error loading notifications:", err);
      });
  }, []);

  // Handle clicking outside popovers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }
    if (isOpen || isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isUserMenuOpen]);

  const hasUnread = notifications.some(
    (n) => new Date(n.timestamp).getTime() > lastReadAt
  );

  const handleMarkAllRead = () => {
    const now = Date.now();
    setLastReadAt(now);
    localStorage.setItem("nexus_last_read_notifications", now.toString());
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "TICKET":
        return <Ticket className="h-4 w-4 text-flow-teal" />;
      case "MAINTENANCE":
        return <Wrench className="h-4 w-4 text-signal-amber" />;
      case "VISITOR":
        return <Shield className="h-4 w-4 text-brand-green" />;
      default:
        return <Info className="h-4 w-4 text-text-primary" />;
    }
  };

  return (
    <header
      className={cn(
        "relative z-30 h-14 shrink-0 border-b border-border-hairline bg-white/95 dark:bg-bg-panel/95 backdrop-blur-md print:hidden select-none",
        className
      )}
    >
      <div
        className={cn(
          "flex h-full w-full items-center justify-between px-3.5 sm:px-5 md:px-6",
          (pathname.startsWith("/dashboard/projects-map") || pathname.startsWith("/dashboard/regional-map"))
            ? "px-2 sm:px-3 md:px-3"
            : isVisitorMode && "mx-auto max-w-[1680px]"
        )}
      >
        {/* Left: Mobile Drawer Trigger + Executive Brand Identity Badge */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 shrink-0">
          <button
            type="button"
            onClick={toggleMobileNav}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-border-hairline bg-black/[0.02] dark:bg-white/[0.03] text-text-muted hover:text-text-primary active:scale-95 transition-all shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Brand Lockup: Clean Unbordered Brand Identity */}
          <Link
            href="/home"
            className={cn(
              "flex items-center gap-2.5 group shrink-0 transition-all duration-150",
              !isVisitorMode && "md:hidden"
            )}
            title="Tumauini HEPP · Sta. Clara International Corporation"
          >
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-white dark:bg-bg-panel border border-border-hairline p-1 shadow-2xs overflow-hidden shrink-0 transition-transform duration-150 group-hover:scale-[1.03]">
              <HydroPowerLogo className="h-full w-full" size={32} priority />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-xs sm:text-[13px] tracking-tight text-text-primary leading-none truncate">
                  Tumauini HEPP
                </span>
                <span className="hidden sm:inline-block rounded bg-black/[0.04] dark:bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9px] font-semibold text-text-muted leading-none">
                  11.3 MW
                </span>
              </div>
              <span className="font-mono text-[9px] font-bold text-scic-green dark:text-emerald-400 uppercase tracking-[0.14em] leading-none mt-1 truncate">
                Sta. Clara Intl
              </span>
            </div>
          </Link>



        {/* In Admin Mode (where left sidebar already has Brand), show wide Search + River Ticker on the left */}
        {!isVisitorMode && (
          <>
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="group relative flex h-8 w-8 sm:w-56 md:w-64 items-center justify-center sm:justify-start gap-2 rounded-lg dark:bg-white/[0.03] bg-black/[0.03] px-0 sm:px-3 text-xs text-text-muted border border-border-hairline transition-all duration-150 dark:hover:bg-white/[0.06] hover:bg-black/[0.06] hover:text-text-primary"
              title="Search Tumauini HEPP (Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5 flex-shrink-0 text-text-muted group-hover:text-scic-green dark:group-hover:text-emerald-400" />
              <span className="hidden truncate sm:inline font-medium">
                Search Tumauini HEPP...
              </span>
              <kbd className="absolute right-2 hidden sm:inline-flex h-4.5 items-center rounded bg-black/[0.05] dark:bg-white/[0.06] px-1.5 font-mono text-[9px] font-semibold text-text-muted border border-border-hairline">
                Ctrl K
              </kbd>
            </button>

            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-scic-blue/5 dark:bg-scic-cyan/5 border border-scic-blue/15 dark:border-scic-cyan/15 text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-semibold text-text-primary">
                Pinacanauan River
              </span>
              <span className="text-text-muted">·</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                Normal Head
              </span>
            </div>
          </>
        )}
      </div>

      {/* Center: Symmetrical Navigation Dock (Desktop Visitor Masthead Mode) */}
      {isVisitorMode && (
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex h-full items-stretch gap-0.5 lg:gap-1.5 shrink-0"
        >
          {VISITOR_PILLARS.map((item) => {
            const active = isNavItemActive(item, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                title={
                  item.description
                    ? `${item.label} — ${item.description}`
                    : item.label
                }
                className={cn(
                  "relative flex h-full items-center gap-1.5 px-2.5 lg:px-3.5 font-display text-xs lg:text-[13px] tracking-tight transition-colors duration-150 whitespace-nowrap shrink-0",
                  active
                    ? "text-text-primary font-semibold"
                    : "text-text-muted hover:text-text-primary font-medium"
                )}
              >
                <Icon
                  className={cn(
                    "hidden xl:block h-3.5 w-3.5 shrink-0 transition-colors",
                    active
                      ? "text-scic-green dark:text-emerald-400"
                      : "text-text-muted/70"
                  )}
                />
                <span>{item.label}</span>

                {/* Sharp 2px Editorial Bottom Baseline Indicator */}
                {active && (
                  <motion.span
                    layoutId="editorial-masthead-baseline"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-scic-green dark:bg-emerald-400"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Right: Precision Instrument Cluster */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Compact Search Trigger in Visitor Masthead Mode */}
        {isVisitorMode && (
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex h-8 items-center gap-2 rounded-lg border border-border-hairline bg-black/[0.02] dark:bg-white/[0.03] px-2.5 text-xs text-text-muted transition-colors hover:border-text-muted/40 hover:text-text-primary whitespace-nowrap shrink-0"
            title="Search Tumauini HEPP (Ctrl+K)"
            aria-label="Search"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden 2xl:inline text-[11px] font-medium">
              Search
            </span>
            <kbd className="hidden lg:inline-flex items-center font-mono text-[9px] font-semibold text-text-muted/80">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Nexus AI Assistant & Knowledge Hub Quick-Launch Pill */}
        <Link
          href="/dashboard/assistant"
          prefetch={true}
          title="AI Assistant — Nexus AI Guide & Knowledge Hub"
          aria-label="AI Assistant"
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium transition-colors duration-150 whitespace-nowrap shrink-0",
            isAiHubActive
              ? "border-scic-green/40 bg-scic-green/12 text-scic-green dark:text-emerald-400 font-semibold"
              : "border-border-hairline bg-black/[0.02] dark:bg-white/[0.03] text-text-muted hover:border-scic-green/40 hover:text-text-primary"
          )}
        >
          <Sparkles
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              isAiHubActive
                ? "text-scic-green dark:text-emerald-400"
                : "text-scic-green/80 dark:text-emerald-400/80"
            )}
          />
          <span className="hidden xl:inline whitespace-nowrap">AI Assistant</span>
        </Link>

        {/* Site Safety Micro-Pill in Visitor Masthead Mode */}
        {isVisitorMode && (
          <SafetyStreak variant="masthead" className="hidden sm:block" />
        )}



        <SoundToggle className="hidden sm:flex" />
        <ThemeToggle />

        {/* Notifications Bell */}
        <div className="relative" ref={popoverRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "relative flex h-8 w-8 items-center justify-center rounded-lg border border-border-hairline transition-colors duration-150 hover:text-text-primary",
              isOpen
                ? "bg-white text-text-primary dark:bg-white/[0.08] dark:text-white"
                : "dark:bg-white/[0.03] bg-black/[0.02] text-text-muted dark:hover:bg-white/[0.06] hover:bg-black/[0.05]"
            )}
            title="Notifications"
          >
            <Bell className="h-3.5 w-3.5" />
            {hasUnread && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-signal-amber" />
            )}
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.14 }}
                className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border-hairline bg-white/95 dark:bg-bg-panel/95 backdrop-blur-md shadow-2xl z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-border-hairline px-4 py-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono">
                    Notifications
                  </h3>
                  {hasUnread && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-xs font-medium text-flow-teal hover:underline"
                    >
                      <Check className="h-3 w-3" />
                      Mark read
                    </button>
                  )}
                </div>

                <div className="max-h-[55vh] overflow-y-auto overscroll-contain no-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                      <Bell className="h-6 w-6 text-text-muted/40 mb-2" />
                      <p className="text-xs font-semibold text-text-primary">
                        All caught up
                      </p>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        No recent site notifications.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border-subtle">
                      {notifications.map((notif) => {
                        const isUnread =
                          new Date(notif.timestamp).getTime() > lastReadAt;
                        return (
                          <li
                            key={notif.id}
                            className={cn(
                              "flex gap-3 p-3.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]",
                              !isUnread && "opacity-75"
                            )}
                          >
                            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border-hairline bg-black/[0.02] dark:bg-white/[0.03]">
                              {getIconForType(notif.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-semibold text-text-primary truncate">
                                  {notif.title}
                                </p>
                                {isUnread && (
                                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal-amber mt-1" />
                                )}
                              </div>
                              <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2">
                                {notif.description}
                              </p>
                              <div className="flex items-center gap-1 mt-1.5 text-[10px] font-mono text-text-muted">
                                <Clock className="h-2.5 w-2.5" />
                                {formatDistanceToNow(new Date(notif.timestamp), {
                                  addSuffix: true,
                                })}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile Popover Menu (Essential in Visitor Masthead Mode since Left Sidebar is hidden) */}
        {isVisitorMode && (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="flex h-8 items-center gap-2 rounded-lg border border-border-hairline bg-black/[0.02] dark:bg-white/[0.03] px-2 text-xs font-medium text-text-primary transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
              title={`${userName}${userEmail ? ` (${userEmail})` : ""}`}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded bg-scic-green/15 text-scic-green dark:text-emerald-400">
                <User className="h-3 w-3" />
              </div>
              <span className="hidden lg:inline max-w-[96px] truncate font-medium text-xs">
                {userName}
              </span>
            </button>

            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-border-hairline bg-white/95 dark:bg-bg-panel/95 p-2 shadow-2xl backdrop-blur-md z-50"
                >
                  <div className="border-b border-border-hairline px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-bold text-text-primary">
                        {userName}
                      </p>
                      <span className="rounded bg-black/[0.05] dark:bg-white/[0.08] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-text-muted">
                        Visitor
                      </span>
                    </div>
                    {userEmail && (
                      <p className="mt-0.5 truncate font-mono text-[10px] text-text-muted">
                        {userEmail}
                      </p>
                    )}
                  </div>

                  {isAdminUser && (
                    <button
                      type="button"
                      onClick={() => {
                        toggleViewAsVisitor();
                        setIsUserMenuOpen(false);
                      }}
                      className="mt-1 flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-scic-green dark:text-emerald-400 hover:bg-scic-green/10 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Switch to Admin View
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      setSigningOut(true);
                      await signOut({ redirectUrl: "/sign-in" });
                    }}
                    disabled={signingOut}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted hover:bg-signal-red/10 hover:text-signal-red transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>{signingOut ? "Signing out…" : "Sign out"}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      </div>

      {/* Global Command / Search Palette Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </header>
  );
}
