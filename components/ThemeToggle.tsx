"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-9 w-9 rounded-md bg-white/5" />;
  }

  return (
    <button
      onClick={(e) => {
        const next = resolvedTheme === "dark" ? "light" : "dark";
        const doc = document as Document & { startViewTransition?: (update: () => void) => { finished: Promise<void> } };
        // without View Transitions, or under reduced motion, the theme simply changes
        if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setTheme(next);
          return;
        }
        const r = e.currentTarget.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const root = document.documentElement;
        root.style.setProperty("--theme-wipe-x", `${x}px`);
        root.style.setProperty("--theme-wipe-y", `${y}px`);
        root.style.setProperty("--theme-wipe-r", `${Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))}px`);
        root.setAttribute("data-theme-wipe", "");
        const done = () => root.removeAttribute("data-theme-wipe");
        try {
          doc.startViewTransition(() => flushSync(() => setTheme(next))).finished.then(done, done);
        } catch {
          done();
          setTheme(next);
        }
      }}
      className="inline-flex items-center justify-center rounded-md h-9 w-9 text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-flow-teal"
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-[1.2rem] w-[1.2rem] transition-all" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] transition-all" />
      )}
    </button>
  );
}
