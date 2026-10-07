"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { HERO_SLIDE_SECONDS, type HeroImage } from "@/lib/home/heroImages";
import { atlasHref } from "@/lib/home/links";

/**
 * The hero's photographs: a cross-fade every nine seconds with a slow Ken Burns push-in on the
 * one in front. Only the first photograph is in the server HTML (the page's LCP image, loaded
 * with priority); the others are requested one ahead of when they are needed. It rests while the
 * hero is off-screen or the tab is hidden, shows a single still photograph on phones and under
 * reduced motion, and names the place in a caption that links to the project on the Atlas.
 */
export function HeroSlideshow({ images }: { images: HeroImage[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  // slides that have been asked for so far (kept mounted so a fade never shows a blank frame)
  const [loaded, setLoaded] = useState<number[]>([0]);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el || images.length < 2) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(max-width: 767px)").matches;
    if (still) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- motion is decided from the device, after mount
    setAnimate(true);

    let onScreen = true;
    let timer = 0;
    const running = () => onScreen && document.visibilityState === "visible";
    const preload = (i: number) => setLoaded((l) => (l.includes(i) ? l : [...l, i]));
    const tick = () => {
      if (!running()) return;
      setIndex((i) => {
        const next = (i + 1) % images.length;
        preload((next + 1) % images.length);
        return next;
      });
    };
    const start = () => {
      window.clearInterval(timer);
      if (running()) timer = window.setInterval(tick, HERO_SLIDE_SECONDS * 1000);
      if (running()) el.removeAttribute("data-paused");
      else el.setAttribute("data-paused", "true");
    };
    // the second photograph is fetched once the page has settled
    const warm = window.setTimeout(() => preload(1), 2500);
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      start();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", start);
    start();
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(warm);
      io.disconnect();
      document.removeEventListener("visibilitychange", start);
    };
  }, [images.length]);

  const current = images[index];
  return (
    <div ref={root} className="absolute inset-0 overflow-hidden">
      {images.map((img, i) =>
        loaded.includes(i) ? (
          <div key={img.src} className="home-hero-photo absolute inset-0" style={{ opacity: i === index ? 1 : 0 }} aria-hidden={i !== index}>
            <Image
              // restart the push-in each time this photograph comes to the front
              key={animate && i === index ? `${img.src}-${index}-on` : img.src}
              src={img.src}
              alt={i === index ? img.alt : ""}
              fill
              priority={i === 0}
              sizes="(max-width: 1536px) 100vw, 1280px"
              quality={90}
              className={animate && i === index ? "home-kenburns object-cover" : "object-cover"}
              style={{ objectPosition: img.focus }}
            />
          </div>
        ) : null
      )}
      <Link
        href={atlasHref(current.slug)}
        key={current.src}
        className="home-chip absolute bottom-4 right-4 z-[3] hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-text-primary animate-in fade-in duration-700 md:inline-flex"
        title={`Open ${current.project} on the National Map`}
      >
        <MapPin className="h-3.5 w-3.5 text-scic-green dark:text-scic-green-bright" aria-hidden />
        {current.project} <span className="text-text-muted">· {current.location}</span>
      </Link>
    </div>
  );
}
