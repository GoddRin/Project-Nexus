"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface HydroPowerLogoProps {
  className?: string;
  size?: number;
  priority?: boolean;
}

/**
 * HydroElectric Power Symbol Logo
 * Seamlessly adapts between Light and Dark modes with high-contrast,
 * ultra-vibrant clean energy hydro-turbine / wave & lightning symbol.
 */
export function HydroPowerLogo({
  className,
  size = 32,
  priority = false,
}: HydroPowerLogoProps) {
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden shrink-0", className)}>
      <Image
        src="/logo.png"
        alt="Tumauini HEPP Hydroelectric Power Symbol"
        width={size * 2}
        height={size * 2}
        className="h-full w-full object-contain dark:hidden"
        priority={priority}
      />
      <Image
        src="/logo-dark.png"
        alt="Tumauini HEPP Hydroelectric Power Symbol"
        width={size * 2}
        height={size * 2}
        className="hidden h-full w-full object-contain dark:block"
        priority={priority}
      />
    </div>
  );
}
