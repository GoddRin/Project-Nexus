"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const UNITS = [
  { key: "days", label: "Days", ms: 86_400_000, digits: 2 },
  { key: "hours", label: "Hours", ms: 3_600_000, digits: 2 },
  { key: "minutes", label: "Min", ms: 60_000, digits: 2 },
  { key: "seconds", label: "Sec", ms: 1000, digits: 2 },
] as const;

/** One split-flap digit: it flips each time its value changes (the keyed span re-runs the animation) */
function Flap({ char }: { char: string }) {
  return (
    <span className="home-flip h-10 w-7 font-mono text-xl font-semibold tabular-nums sm:h-14 sm:w-10 sm:text-[2rem]">
      <span key={char}>{char}</span>
    </span>
  );
}

/**
 * Counts down to a date, in days, hours, minutes and seconds, on split-flap digits. Once the
 * date has passed it says how long ago instead. The clock starts in the browser (the server
 * prints dashes), so the first paint never disagrees with the reader's own time.
 */
export function FlipCountdown({ target, className }: { target: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  const end = new Date(target).getTime();
  const left = now === null ? null : end - now;
  if (left !== null && left <= 0) {
    const days = Math.floor(-left / 86_400_000);
    return (
      <p className={cn("font-mono text-sm text-text-secondary", className)}>
        {days === 0 ? "The target date is today." : `The target date passed ${days} day${days === 1 ? "" : "s"} ago.`}
      </p>
    );
  }
  const total = left ?? 0;
  // each unit shows what is left after the larger ones (days are not capped)
  const parts = UNITS.map((u, i) => {
    const value = Math.floor((i === 0 ? total : total % UNITS[i - 1].ms) / u.ms);
    return { ...u, text: left === null ? "--" : String(value).padStart(u.digits, "0") };
  });
  const spoken = left === null ? "" : `${parts[0].text} days, ${parts[1].text} hours, ${parts[2].text} minutes`;
  return (
    <div className={cn("flex items-start gap-1 sm:gap-3", className)} role="timer" aria-label={spoken ? `Time to the target date: ${spoken}` : "Time to the target date"}>
      {parts.map((p, i) => (
        <React.Fragment key={p.key}>
          {i > 0 && (
            <span aria-hidden className="pt-1.5 font-mono text-lg font-semibold text-text-muted sm:pt-3 sm:text-2xl">
              :
            </span>
          )}
          <div aria-hidden className="flex flex-col items-center gap-1.5">
            <div className="flex gap-0.5 sm:gap-1">
              {p.text.split("").map((char, n) => (
                <Flap key={n} char={char} />
              ))}
            </div>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">{p.label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
