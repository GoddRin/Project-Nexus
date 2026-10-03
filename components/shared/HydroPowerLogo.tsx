"use client";

import { BrandLogo } from "./BrandLogo";
import { cn } from "@/lib/utils";

interface HydroPowerLogoProps {
  className?: string;
  size?: number;
  priority?: boolean;
}

/**
 * App mark: the official Sta. Clara swirl (brand green on light, reversed white on dark).
 * Kept under its old name so every existing call site picks up the official logo.
 */
export function HydroPowerLogo({ className, size = 32, priority = false }: HydroPowerLogoProps) {
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden shrink-0", className)}>
      <BrandLogo variant="mark" height={Math.round(size * 0.62)} priority={priority} />
    </div>
  );
}
