"use client";

import React, { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { onUiSoundsChange, setUiSoundsEnabled, uiSoundsEnabled } from "@/lib/ui/sounds";
import { cn } from "@/lib/utils";

/** Interface sounds on/off (off by default). */
export function SoundToggle({ className }: { className?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(uiSoundsEnabled());
    return onUiSoundsChange(setOn);
  }, []);
  return (
    <button
      type="button"
      onClick={() => setUiSoundsEnabled(!on)}
      aria-pressed={on}
      aria-label={on ? "Turn interface sounds off" : "Turn interface sounds on"}
      title={on ? "Interface sounds: on" : "Interface sounds: off"}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-xl border border-border-hairline bg-black/[0.03] dark:bg-white/[0.03] text-text-muted hover:text-text-primary transition-colors cursor-pointer",
        on && "text-scic-green dark:text-scic-green",
        className
      )}
    >
      {on ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}
