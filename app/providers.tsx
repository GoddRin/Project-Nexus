"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "sonner";
import { useTheme } from "next-themes";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

function ThemeAwareComponents({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <ClerkProvider
        appearance={{
          theme: dark,
          variables: {
            colorPrimary: "#1FB6A6",
            colorBackground: "#0B1418",
            colorForeground: "#EDEFF1",
            fontFamily: "'IBM Plex Sans', sans-serif",
          },
        }}
      >
        {children}
      </ClerkProvider>
    );
  }

  return (
    <ClerkProvider
      appearance={{
        theme: resolvedTheme === "dark" ? dark : undefined,
        variables: {
          colorPrimary: "#1FB6A6",
          fontFamily: "'IBM Plex Sans', sans-serif",
          ...(resolvedTheme === "dark" ? {
            colorBackground: "#0B1418",
            colorForeground: "#EDEFF1",
          } : {
            colorBackground: "#F8FAFC",
            colorForeground: "#0F172A",
          })
        },
      }}
    >
      {children}
      <Toaster theme={resolvedTheme === "dark" ? "dark" : "light"} position="top-right" richColors />
    </ClerkProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeAwareComponents>
        {children}
      </ThemeAwareComponents>
    </NextThemesProvider>
  );
}
