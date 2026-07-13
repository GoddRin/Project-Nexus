"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Bell, Check, Clock, Ticket, Shield, Wrench, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { getRecentNotifications, NotificationItem } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

interface TopBarProps {
 className?: string;
}

/**
 * TopBar — Elevated Glass: frosted top bar with cmd+k search trigger and notification bell.
 */
export function TopBar({ className }: TopBarProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [lastReadAt, setLastReadAt] = useState<number>(0);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Fetch notifications and initialize read state
  useEffect(() => {
    const storedLastRead = localStorage.getItem("nexus_last_read_notifications");
    if (storedLastRead) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastReadAt(parseInt(storedLastRead, 10));
    }

    getRecentNotifications().then(data => {
      setNotifications(data);
    });
  }, []);

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Determine if there are unread notifications
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
      case "TICKET": return <Ticket className="h-4 w-4 text-flow-teal" />;
      case "MAINTENANCE": return <Wrench className="h-4 w-4 text-signal-amber" />;
      case "VISITOR": return <Shield className="h-4 w-4 text-brand-green" />;
      default: return <Info className="h-4 w-4 text-text-primary" />;
    }
  };
 return (
  <header
  className={cn(
  "flex h-14 items-center justify-between border-b border-border-hairline bg-gradient-to-r dark:from-white/[0.03] dark:to-white/[0.01] from-black/[0.03] to-black/[0.01] shell-blur px-6",
  className
  )}
  >
  {/* Search trigger */}
  <button
  className="group relative flex h-9 w-72 items-center gap-2.5 rounded-xl dark:bg-white/[0.04] bg-black/[0.04] px-3.5 text-sm text-text-muted border border-border-hairline shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_8px_rgba(0,0,0,0.05)] transition-[background-color,border-color,color,box-shadow] duration-200 dark:hover:bg-white/[0.07] hover:bg-black/[0.07] hover:text-text-primary"
  onClick={() => {
  // cmd+k modal will be wired up in a later phase
  }}
  >
  <Search className="h-4 w-4 flex-shrink-0 text-text-muted transition-all duration-300 group-hover:scale-110 group-hover:text-flow-teal" />
  <span className="hidden truncate sm:inline">Search across Project Nexus...</span>
  <div className="absolute right-2 flex h-5 items-center gap-0.5 rounded-md dark:bg-white/[0.06] bg-black/[0.06] px-1.5 font-mono text-[10px] font-medium text-text-muted border border-border-hairline transition-colors group-hover:text-text-primary">
  <span>Ctrl</span>
  <span className="ml-0.5">K</span>
  </div>
  </button>

  {/* Right section */}
  <div className="flex items-center gap-2">
  <ThemeToggle />
  {/* Notifications */}
        <div className="relative" ref={popoverRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-xl border border-border-hairline transition-[background-color,border-color,color] duration-200 hover:text-text-primary",
              isOpen
                ? "bg-white text-text-primary dark:bg-white/[0.08] dark:text-white border border-black/[0.08] dark:border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.1)]"
                : "dark:bg-white/[0.03] bg-black/[0.03] text-text-muted dark:hover:bg-white/[0.07] hover:bg-black/[0.07]"
            )}
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {/* Notification badge dot */}
            {hasUnread && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-signal-amber shadow-[0_0_8px_rgba(232,163,61,0.5)]" />
            )}
          </button>

          {/* Popover Menu */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white/90 dark:bg-bg-panel/90 shell-blur shadow-2xl z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] px-4 py-3">
                  <h3 className="font-semibold text-text-primary">Notifications</h3>
                  {hasUnread && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1.5 text-xs font-medium text-flow-teal hover:text-flow-teal/80 transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <Bell className="h-8 w-8 text-text-muted/50 mb-3" />
                      <p className="text-sm font-medium text-text-primary">All caught up!</p>
                      <p className="text-xs text-text-muted mt-1">No recent activities found.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                      {notifications.map((notif) => {
                        const isUnread = new Date(notif.timestamp).getTime() > lastReadAt;
                        
                        return (
                          <li
                            key={notif.id}
                            className={cn(
                              "flex gap-4 p-4 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]",
                              isUnread ? "bg-black/[0.01] dark:bg-white/[0.01]" : "opacity-80"
                            )}
                          >
                            <div className="mt-1 flex-shrink-0">
                              <div className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full border shadow-sm",
                                isUnread 
                                  ? "bg-white dark:bg-black border-black/[0.08] dark:border-white/[0.08]" 
                                  : "bg-black/[0.02] dark:bg-white/[0.02] border-transparent"
                              )}>
                                {getIconForType(notif.type)}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={cn(
                                  "text-sm truncate",
                                  isUnread ? "font-semibold text-text-primary" : "font-medium text-text-primary/80"
                                )}>
                                  {notif.title}
                                </p>
                                {isUnread && (
                                  <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-signal-amber mt-1.5" />
                                )}
                              </div>
                              <p className="text-xs text-text-muted mt-0.5 line-clamp-2 leading-relaxed">
                                {notif.description}
                              </p>
                              <div className="flex items-center gap-1.5 mt-2 text-[10px] font-medium text-text-muted/80">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                
                {notifications.length > 0 && (
                  <div className="border-t border-black/[0.06] dark:border-white/[0.06] p-2 bg-black/[0.01] dark:bg-white/[0.01]">
                    <button 
                      onClick={() => setIsOpen(false)}
                      className="w-full rounded-lg py-2 text-xs font-medium text-text-muted hover:text-text-primary hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                    >
                      Close Menu
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
  </div>
  </header>
 );
}
