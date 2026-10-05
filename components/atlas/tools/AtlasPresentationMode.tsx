"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Pause, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SCICProject } from "@/lib/data/scicProjectsData";
import { completionYearOf } from "@/lib/atlas/projectFacts";

/**
 * Presentation mode: the map fills the screen and the flagship projects pass one after another,
 * each with a lower-third card. It is a convenience, never a track: the arrows and the dots jump
 * anywhere, touching the map pauses it, and Esc (or the X) leaves at once, exactly where you are.
 */

const DWELL_MS = 11000;

interface MapLike {
  on: (type: string, listener: (e: { originalEvent?: unknown }) => void) => unknown;
  off: (type: string, listener: (e: { originalEvent?: unknown }) => void) => unknown;
}

export interface AtlasPresentationModeProps {
  projects: SCICProject[];
  /** Selects the project and flies the camera to it */
  onShow: (id: string) => void;
  onExit: () => void;
  map?: MapLike | null;
}

export function AtlasPresentationMode({ projects, onShow, onExit, map }: AtlasPresentationModeProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progressKey, setProgressKey] = useState(0);
  const count = projects.length;
  const project = projects[Math.min(index, count - 1)];
  const onShowRef = useRef(onShow);
  useEffect(() => {
    onShowRef.current = onShow;
  }, [onShow]);

  const go = useCallback(
    (next: number) => {
      if (!count) return;
      setIndex(((next % count) + count) % count);
      setProgressKey((k) => k + 1);
    },
    [count]
  );

  // Fly to the project on screen
  const projectId = project?.id;
  useEffect(() => {
    if (projectId) onShowRef.current(projectId);
  }, [projectId]);

  // Advance while playing
  useEffect(() => {
    if (!playing || count < 2) return;
    const id = window.setTimeout(() => go(index + 1), DWELL_MS);
    return () => window.clearTimeout(id);
  }, [playing, index, count, go, progressKey]);

  // The user's own hand on the map pauses the show (camera moves we start carry no originalEvent)
  useEffect(() => {
    if (!map) return;
    const pause = (e: { originalEvent?: unknown }) => {
      if (e?.originalEvent) setPlaying(false);
    };
    map.on("dragstart", pause);
    map.on("zoomstart", pause);
    map.on("rotatestart", pause);
    return () => {
      map.off("dragstart", pause);
      map.off("zoomstart", pause);
      map.off("rotatestart", pause);
    };
  }, [map]);

  // Arrow keys and space (Esc is handled by the page, in its usual order)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  if (!project) return null;
  const year = completionYearOf(project);
  const facts = [
    project.metrics?.capacity,
    project.status === "COMPLETED" ? (year ? `Completed ${year}` : "Completed") : project.status === "ONGOING" ? "Under construction" : "Upcoming",
    project.client ? `Client: ${project.client}` : null,
  ].filter(Boolean) as string[];
  const photo = project.imageUrl && !/placeholder/.test(project.imageUrl) ? project.imageUrl : null;

  return (
    <div className="absolute inset-0 z-40 pointer-events-none" data-atlas-presentation>
      {/* soft cinema bars so the card reads on any basemap */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />

      <div className="absolute top-4 left-5 flex items-center gap-2 text-white/90">
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.7)]" />
        <span className="text-[11px] font-mono uppercase tracking-[0.22em]">SCIC National Project Atlas</span>
      </div>

      {/* Lower third */}
      <div className="absolute left-0 right-0 md:left-[158px] md:right-[190px] bottom-4 flex justify-center px-3">
        <div className="pointer-events-auto w-full max-w-3xl">
          <div
            key={project.id}
            className="flex items-stretch gap-4 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/12 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="hidden sm:block w-52 h-36 object-cover shrink-0" />
            )}
            <div className={cn("flex-1 min-w-0 py-3.5 pr-4", photo ? "pl-0" : "pl-5")}>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-300">
                {String(project.sector).replace(/_/g, " ")} · {index + 1} of {count}
              </p>
              <h2 className="mt-1 text-[22px] leading-tight font-semibold text-white truncate">{project.name}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-white/75 truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {[project.municipality, project.province, project.region].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {facts.map((f) => (
                  <span key={f} className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[11px] text-white/90 max-w-full truncate">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Transport */}
          <div className="mt-3 flex items-center gap-3">
            <button type="button" onClick={() => go(index - 1)} className="h-8 w-8 rounded-full bg-black/55 hover:bg-black/80 border border-white/15 text-white inline-flex items-center justify-center cursor-pointer" aria-label="Previous project">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setPlaying((p) => !p)} className="h-8 w-8 rounded-full bg-[#007B3E] hover:bg-[#006633] text-white inline-flex items-center justify-center cursor-pointer" aria-label={playing ? "Pause" : "Play"} title={playing ? "Pause (Space)" : "Play (Space)"}>
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 translate-x-px" />}
            </button>
            <button type="button" onClick={() => go(index + 1)} className="h-8 w-8 rounded-full bg-black/55 hover:bg-black/80 border border-white/15 text-white inline-flex items-center justify-center cursor-pointer" aria-label="Next project">
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="flex-1 flex items-center gap-1">
              {projects.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => go(i)}
                  className="group flex-1 h-4 flex items-center cursor-pointer"
                  aria-label={`Go to ${p.name}`}
                  title={p.name}
                >
                  <span className="relative block w-full h-[3px] rounded-full bg-white/25 overflow-hidden group-hover:bg-white/45 transition-colors">
                    {i < index && <span className="absolute inset-0 bg-white/80" />}
                    {i === index && (
                      <span
                        key={progressKey}
                        className="absolute inset-y-0 left-0 bg-emerald-400"
                        style={
                          playing
                            ? { animation: `atlas-present-progress ${DWELL_MS}ms linear forwards` }
                            : { width: "100%" }
                        }
                      />
                    )}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onExit}
              className="h-8 px-3 rounded-full bg-black/55 hover:bg-black/80 border border-white/15 text-white text-[11.5px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Leave presentation mode (Esc)"
            >
              <X className="h-3.5 w-3.5" /> Exit <kbd className="ml-0.5 px-1 rounded bg-white/15 text-[9px] font-mono">Esc</kbd>
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes atlas-present-progress { from { width: 0% } to { width: 100% } }`}</style>
    </div>
  );
}
