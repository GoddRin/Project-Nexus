"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";

interface MobileNavContextType {
  isOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;
  role: string;
  isAdminUser: boolean;
  isVisitorMode: boolean;
  viewAsVisitor: boolean;
  setViewAsVisitor: (value: boolean) => void;
  toggleViewAsVisitor: () => void;
}

const MobileNavContext = createContext<MobileNavContextType>({
  isOpen: false,
  openMobileNav: () => {},
  closeMobileNav: () => {},
  toggleMobileNav: () => {},
  role: "EMPLOYEE",
  isAdminUser: false,
  isVisitorMode: true,
  viewAsVisitor: false,
  setViewAsVisitor: () => {},
  toggleViewAsVisitor: () => {},
});

const VISITOR_PREVIEW_STORAGE_KEY = "nexus_view_as_visitor";

export function MobileNavProvider({
  children,
  role = "EMPLOYEE",
}: {
  children: React.ReactNode;
  role?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewAsVisitor, setViewAsVisitorState] = useState(false);
  const pathname = usePathname();

  const isAdminUser = role === "ADMINISTRATOR";
  const isVisitorMode = !isAdminUser || viewAsVisitor;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VISITOR_PREVIEW_STORAGE_KEY);
      if (saved === "true") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setViewAsVisitorState(true);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const setViewAsVisitor = useCallback((value: boolean) => {
    setViewAsVisitorState(value);
    try {
      localStorage.setItem(VISITOR_PREVIEW_STORAGE_KEY, String(value));
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const toggleViewAsVisitor = useCallback(() => {
    setViewAsVisitorState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(VISITOR_PREVIEW_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage access errors
      }
      return next;
    });
  }, []);

  const openMobileNav = useCallback(() => setIsOpen(true), []);
  const closeMobileNav = useCallback(() => setIsOpen(false), []);
  const toggleMobileNav = useCallback(() => setIsOpen((prev) => !prev), []);

  // Close mobile drawer whenever the user navigates to a different route
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <MobileNavContext.Provider
      value={{
        isOpen,
        openMobileNav,
        closeMobileNav,
        toggleMobileNav,
        role,
        isAdminUser,
        isVisitorMode,
        viewAsVisitor,
        setViewAsVisitor,
        toggleViewAsVisitor,
      }}
    >
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  return useContext(MobileNavContext);
}
