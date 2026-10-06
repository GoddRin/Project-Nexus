"use client";

import React, { useEffect, useLayoutEffect } from "react";
import { BrandLogo } from "@/components/shared/BrandLogo";

const SEEN_KEY = "nexus-intro-seen";
/** mark in (0.68 s) + wipe (0.9 s to 1.52 s): the cover is gone by 1.6 s */
const TOTAL_MS = 1600;
const SKIP_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;

/**
 * Decides whether to play, shows the cover, and arranges its removal: after 1.6 s, or at once on
 * any click, key, wheel, touch or scroll. Plain DOM code on purpose: on a hard load it runs from
 * an inline script before the first paint and before React has hydrated, so the cover is there
 * from frame one, never flashes for a returning user, and can be skipped immediately.
 */
function playIntro(): void {
  try {
    const root = document.documentElement;
    if (root.getAttribute("data-nexus-intro") === "play") return; // already playing
    if (sessionStorage.getItem(SEEN_KEY) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.setAttribute("data-nexus-intro", "play");
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      root.removeAttribute("data-nexus-intro");
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        // private window: it may simply play again next load
      }
      SKIP_EVENTS.forEach((e) => window.removeEventListener(e, finish, true));
    };
    SKIP_EVENTS.forEach((e) => window.addEventListener(e, finish, { capture: true, passive: true }));
    window.setTimeout(finish, TOTAL_MS);
  } catch {
    // storage unavailable: no intro
  }
}

/** The same routine as text, for the inline script (kept in step with playIntro above) */
const BOOT = `(function(){try{var d=document.documentElement,k=${JSON.stringify(SEEN_KEY)},ev=${JSON.stringify(SKIP_EVENTS)};if(d.getAttribute("data-nexus-intro")==="play")return;if(sessionStorage.getItem(k)||matchMedia("(prefers-reduced-motion: reduce)").matches)return;d.setAttribute("data-nexus-intro","play");var done=false;function f(){if(done)return;done=true;d.removeAttribute("data-nexus-intro");try{sessionStorage.setItem(k,"1")}catch(e){}ev.forEach(function(e){removeEventListener(e,f,true)})}ev.forEach(function(e){addEventListener(e,f,{capture:true,passive:true})});setTimeout(f,${TOTAL_MS})}catch(e){}})()`;

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * The opening of Nexus Home: the SCIC mark fades and scales in on the page colour, then a brand
 * "water ribbon" sweeps left to right and wipes the cover away. Once per browser session, at
 * most 1.6 s, and it never holds the page: any click, key, wheel, touch or scroll removes it at
 * once, it takes no focus, and with reduced motion it does not appear at all. The animation is
 * CSS (the Nexus Home block in globals.css).
 */
export function IntroOverlay() {
  // Arriving by in-app navigation (an inline script does not run then): decide before paint
  useIsoLayoutEffect(() => {
    // (no cleanup: the routine always clears itself within 1.6 s, also after leaving the page)
    playIntro();
  }, []);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      <div className="home-intro" aria-hidden>
        <div className="home-intro-mark flex flex-col items-center gap-4">
          <BrandLogo variant="mark" height={72} priority />
          <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-text-muted">Project Nexus</span>
        </div>
      </div>
      <div className="home-intro-ribbon" aria-hidden />
    </>
  );
}
