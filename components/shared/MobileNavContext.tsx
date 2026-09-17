"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";

interface MobileNavContextType {
  isOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;
}

const MobileNavContext = createContext<MobileNavContextType>({
  isOpen: false,
  openMobileNav: () => {},
  closeMobileNav: () => {},
  toggleMobileNav: () => {},
});

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

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
      }}
    >
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  return useContext(MobileNavContext);
}
