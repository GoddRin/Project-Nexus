import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  /** "wordmark" = swirl + STA. CLARA INTERNATIONAL CORPORATION, "mark" = swirl only */
  variant?: "wordmark" | "mark";
  /** Rendered height in px (width follows the artwork's aspect ratio) */
  height?: number;
  className?: string;
  priority?: boolean;
}

const ART = {
  wordmark: { w: 426, h: 65, green: "/scic-wordmark-green.png", white: "/scic-wordmark-white.png" },
  mark: { w: 77, h: 64, green: "/scic-mark-green.png", white: "/scic-mark-white.png" },
} as const;

/**
 * Official Sta. Clara International Corporation logo.
 * Brand green on light surfaces, reversed white on dark surfaces — never a white plate on dark.
 */
export function BrandLogo({ variant = "wordmark", height = 24, className, priority = false }: BrandLogoProps) {
  const art = ART[variant];
  const width = Math.round((art.w / art.h) * height);
  const common = { width, height, priority } as const;
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)} style={{ height }}>
      <Image {...common} src={art.green} alt="Sta. Clara International Corporation" className="block h-full w-auto dark:hidden" />
      <Image {...common} src={art.white} alt="" className="hidden h-full w-auto dark:block" aria-hidden />
    </span>
  );
}
