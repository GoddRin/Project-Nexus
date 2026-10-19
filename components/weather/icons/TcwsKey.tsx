import React from "react";
import { cn } from "@/lib/utils";

// PAGASA Tropical Cyclone Wind Signal colours (No. 1 to 5).
const TCWS_LEVELS = [
  { level: 1, color: "#5ECCFF", wind: "39-61 km/h" },
  { level: 2, color: "#FACC15", wind: "62-88 km/h" },
  { level: 3, color: "#F97316", wind: "89-117 km/h" },
  { level: 4, color: "#EF4444", wind: "118-184 km/h" },
  { level: 5, color: "#A21CAF", wind: "185+ km/h" },
];

interface TcwsKeyProps {
  /** Highest hoisted signal; omit when all signals are lifted. */
  activeLevel?: number;
  className?: string;
}

export default function TcwsKey({ activeLevel, className }: TcwsKeyProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} aria-label="TCWS signal key">
      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">TCWS</span>
      {TCWS_LEVELS.map(({ level, color, wind }) => (
        <span
          key={level}
          title={`Signal No. ${level} (${wind})`}
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold font-mono text-slate-950",
            activeLevel === level ? "ring-2 ring-offset-1 ring-offset-transparent ring-white" : activeLevel ? "opacity-30" : "opacity-60"
          )}
          style={{ backgroundColor: color }}
        >
          {level}
        </span>
      ))}
      <span className="text-[10px] font-mono text-text-muted">{activeLevel ? `Signal No. ${activeLevel} raised` : "All lifted"}</span>
    </div>
  );
}
