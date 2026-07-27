"use client";

import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function SignInPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <div className="flex justify-center">
      <SignIn
        appearance={{
          theme: isDark ? dark : undefined,
          variables: {
            colorPrimary: "#1FB6A6",
            borderRadius: "0.75rem",
            fontFamily: "'IBM Plex Sans', sans-serif",
            ...(isDark
              ? {
                  colorBackground: "#121C21",
                  colorInput: "#182329",
                  colorInputForeground: "#EDEFF1",
                  colorForeground: "#EDEFF1",
                  colorMutedForeground: "#7C8B91",
                  colorBorder: "rgba(255, 255, 255, 0.12)",
                }
              : {
                  colorBackground: "#FFFFFF",
                  colorInput: "#F8FAFC",
                  colorInputForeground: "#0F172A",
                  colorForeground: "#0F172A",
                  colorMutedForeground: "#64748B",
                  colorBorder: "#E2E8F0",
                }),
          },
          elements: {
            card: isDark
              ? "shadow-xl border border-white/10 bg-[#121C21]"
              : "shadow-xl border border-slate-200/80 bg-white",
            headerTitle: "font-display",
            headerSubtitle: isDark ? "text-slate-400" : "text-slate-500",
            formFieldLabel: isDark ? "text-slate-300" : "text-slate-700",
            formButtonPrimary:
              "bg-flow-teal hover:bg-flow-teal/90 text-white font-medium",
            footerActionLink: "text-flow-teal hover:text-flow-teal/80 font-medium",
            socialButtonsBlockButton: isDark
              ? "!bg-white/[0.08] !border !border-white/[0.12] hover:!bg-white/[0.14] !text-white !transition-all"
              : "!bg-slate-50 !border !border-slate-200 hover:!bg-slate-100 !text-slate-800 !transition-all",
            socialButtonsBlockButtonText: isDark
              ? "!text-white !font-medium"
              : "!text-slate-800 !font-medium",
          },
        }}
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
