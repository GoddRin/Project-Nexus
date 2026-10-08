"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigation, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { PHILIPPINES_BOUNDS, useAtlasMap } from "@/components/atlas/AtlasMapContext";
import type { SCICProject } from "@/lib/data/scicProjectsData";
import {
  capacityMwOf, completionYearOf, shortLabelOf, timelineLine, underConstructionIn, verificationOf, type EraChapter,
} from "@/lib/atlas/projectFacts";
import { optimizedImage } from "@/lib/images/optimized";

/**
 * The timeline panel: a journey through the years of the portfolio.
 *
 * The pace: a year in which something was finished is a STOP. The camera travels there and stays
 * long enough to read the names and look at the photographs; a year with nothing on record simply
 * rolls past, and in a long quiet stretch the camera drifts back to the whole country so the view
 * never sits on the last place while the years go by. (At 2x everything takes half as long.)
 *
 * It is never a track: touching the map pauses it, the bars and the slider jump anywhere, and
 * "All years" leaves at once.
 */
const STOP_MS = 5200;
const STOP_EXTRA_MS = 1400; // for each further project finished that year (up to three more)
const QUIET_YEAR_MS = 850;
const TRAVEL_MS = 2600;

export interface AtlasTimelinePanelProps {
  year: number | null;
  onYearChange: (y: number | null) => void;
  minYear: number;
  maxYear: number;
  /** What is on the map now (after every filter, the year included) */
  projects: SCICProject[];
  allProjects: SCICProject[];
  chapters: EraChapter[];
  onSelectProject: (id: string) => void;
  /** Speaks a line in Atlas's voice (the narrated journey) */
  onNarrate?: (text: string) => void;
  /** Atlas is preparing or speaking a line: the journey waits for him to finish */
  speechBusy?: boolean;
  className?: string;
}

export function AtlasTimelinePanel({
  year, onYearChange, minYear, maxYear, projects, allProjects, chapters, onSelectProject, onNarrate, speechBusy, className,
}: AtlasTimelinePanelProps) {
  const { mapInstance } = useAtlasMap();
  const [playing, setPlaying] = useState(false);
  const [fast, setFast] = useState(false);
  const [follow, setFollow] = useState(true);
  const [narrate, setNarrate] = useState(false);
  const [recording, setRecording] = useState(false);
  const busyRef = useRef(!!speechBusy);
  useEffect(() => {
    busyRef.current = !!speechBusy;
  }, [speechBusy]);

  // What the records say about each year
  const perYear = useMemo(() => {
    const m = new Map<number, SCICProject[]>();
    for (const p of allProjects) {
      const y = completionYearOf(p);
      if (y !== null) m.set(y, [...(m.get(y) || []), p]);
    }
    return m;
  }, [allProjects]);
  const onMap = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);
  const years = useMemo(() => Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i), [minYear, maxYear]);
  const peak = useMemo(() => Math.max(1, ...years.map((y) => perYear.get(y)?.length || 0)), [years, perYear]);
  const undated = useMemo(() => allProjects.filter((p) => p.status === "COMPLETED" && completionYearOf(p) === null).length, [allProjects]);
  const builtThatYear = useMemo(() => (year === null ? [] : perYear.get(year) || []), [perYear, year]);
  const shown = year ?? maxYear;
  const running = useMemo(() => {
    let done = 0;
    let mw = 0;
    for (const [y, list] of perYear) {
      if (y > shown) continue;
      done += list.length;
      for (const p of list) if (verificationOf(p) !== "unconfirmed") mw += capacityMwOf(p) || 0;
    }
    return { done, mw };
  }, [perYear, shown]);
  const building = useMemo(
    () => (year === null || year >= maxYear ? [] : projects.filter((p) => underConstructionIn(p, year, maxYear))),
    [projects, year, maxYear]
  );
  const chapter = chapters.find((c) => shown >= c.from && shown <= c.to) || null;

  // ── The journey: one step per year on screen (move the camera, speak if asked, wait, go on) ──
  const zoomedInRef = useRef(false);
  const optionsRef = useRef({ follow, fast, narrate });
  useEffect(() => {
    optionsRef.current = { follow, fast, narrate };
  }, [follow, fast, narrate]);
  useEffect(() => {
    if (!playing || year === null) return;
    const { follow: doFollow, fast: isFast, narrate: doNarrate } = optionsRef.current;
    const speed = isFast ? 2 : 1;
    const here = (perYear.get(year) || []).filter((p) => onMap.has(p.id));
    const atEnd = year >= maxYear;

    try {
      if (mapInstance && doFollow) {
        if (here.length && !atEnd) {
          const lngs = here.map((p) => p.coordinates.lng);
          const lats = here.map((p) => p.coordinates.lat);
          mapInstance.fitBounds(
            [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
            { padding: { top: 150, bottom: 330, left: 130, right: 230 }, maxZoom: here.length === 1 ? 8.6 : 7.8, duration: TRAVEL_MS / speed, curve: 1.25 }
          );
          zoomedInRef.current = true;
        } else if (zoomedInRef.current) {
          const nextStop = years.find((y) => y > year && (perYear.get(y) || []).some((p) => onMap.has(p.id)));
          if (atEnd || nextStop === undefined || nextStop - year >= 2) {
            mapInstance.fitBounds(PHILIPPINES_BOUNDS, { padding: 60, duration: (atEnd ? 2600 : 3200) / speed, curve: 1.1 });
            zoomedInRef.current = false;
          }
        }
      }
    } catch {
      // a camera move is a nicety: never let it stop the timeline
    }

    // (names in A-Z order: the same sentence the voice clips were prepared from)
    if (here.length && doNarrate && onNarrate) {
      onNarrate(timelineLine(year, here.map((p) => p.name).sort((m, n) => m.localeCompare(n, undefined, { sensitivity: "base" }))));
    }

    if (atEnd) {
      const end = window.setTimeout(() => setPlaying(false), 1800);
      return () => window.clearTimeout(end);
    }
    const dwell = here.length ? (STOP_MS + STOP_EXTRA_MS * Math.min(here.length - 1, 3)) / speed : QUIET_YEAR_MS / speed;
    let timer = 0;
    let waited = 0;
    const advance = () => {
      // a narrated stop waits for Atlas to finish his sentence (within reason)
      if (doNarrate && here.length && busyRef.current && waited < 14000) {
        waited += 300;
        timer = window.setTimeout(advance, 300);
        return;
      }
      onYearChange(year + 1);
    };
    timer = window.setTimeout(advance, dwell);
    return () => window.clearTimeout(timer);
  }, [playing, year, maxYear, perYear, onMap, years, mapInstance, onNarrate, onYearChange]);

  // Your own hand on the map pauses the journey (camera moves we start carry no originalEvent)
  useEffect(() => {
    if (!mapInstance || !playing) return;
    const pause = (e: { originalEvent?: unknown }) => {
      if (e?.originalEvent) setPlaying(false);
    };
    mapInstance.on("dragstart", pause);
    mapInstance.on("zoomstart", pause);
    mapInstance.on("rotatestart", pause);
    return () => {
      mapInstance.off("dragstart", pause);
      mapInstance.off("zoomstart", pause);
      mapInstance.off("rotatestart", pause);
    };
  }, [mapInstance, playing]);

  const start = () => {
    if (year === null || year >= maxYear) onYearChange(minYear);
    zoomedInRef.current = false;
    setPlaying(true);
  };

  // ── Recording: the journey as a video file (the map, with the year and the names burnt in) ──
  const captionRef = useRef({ year: "", names: "", chapter: "" });
  useEffect(() => {
    captionRef.current = {
      year: String(year ?? ""),
      names: builtThatYear.map((p) => shortLabelOf(p.name, 46)).slice(0, 4).join("   ·   "),
      chapter: chapter ? `${chapter.from} to ${chapter.to >= maxYear ? "today" : chapter.to}  ·  ${chapter.title}` : "",
    };
  }, [year, builtThatYear, chapter, maxYear]);
  const recorderRef = useRef<{ stop: () => void } | null>(null);
  const startRecording = () => {
    if (!mapInstance || typeof MediaRecorder === "undefined") return;
    const W = 1280;
    const H = 720;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const draw = () => {
      // (drawn inside the map's own render event: a WebGL canvas can only be copied then)
      const src = mapInstance.getCanvas();
      const scale = Math.max(W / src.width, H / src.height);
      const sw = W / scale;
      const sh = H / scale;
      ctx.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, W, H);
      const shade = ctx.createLinearGradient(0, H - 230, 0, H);
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(1, "rgba(0,0,0,0.78)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, H - 230, W, 230);
      const c = captionRef.current;
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.font = "600 96px system-ui, sans-serif";
      ctx.fillText(c.year, 48, H - 96);
      ctx.font = "600 15px system-ui, sans-serif";
      ctx.fillStyle = "rgba(110,231,183,0.95)";
      ctx.fillText("SCIC NATIONAL PROJECT ATLAS" + (c.chapter ? "   ·   " + c.chapter.toUpperCase() : ""), 52, H - 190);
      ctx.font = "500 22px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillText(c.names, 52, H - 50, W - 104);
    };
    const type = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t)) || "";
    const recorder = new MediaRecorder(canvas.captureStream(30), type ? { mimeType: type, videoBitsPerSecond: 6_000_000 } : undefined);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob(chunks, { type: "video/webm" }));
      a.download = `scic-atlas-journey-${minYear}-${maxYear}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    };
    mapInstance.on("render", draw);
    const keepAlive = window.setInterval(() => mapInstance.triggerRepaint(), 40);
    recorderRef.current = {
      stop: () => {
        window.clearInterval(keepAlive);
        mapInstance.off("render", draw);
        if (recorder.state !== "inactive") recorder.stop();
        recorderRef.current = null;
      },
    };
    recorder.start(500);
    setRecording(true);
    onYearChange(minYear);
    zoomedInRef.current = false;
    setPlaying(true);
  };
  const stopJourney = () => {
    setPlaying(false);
    if (recorderRef.current) {
      recorderRef.current.stop();
      setRecording(false);
    }
  };
  // the recording ends with the journey, and on leaving the panel
  useEffect(() => {
    if (playing || !recorderRef.current) return;
    recorderRef.current.stop();
    setRecording(false);
  }, [playing]);
  useEffect(() => () => recorderRef.current?.stop(), []);

  const chip = "h-8 min-w-8 px-2 rounded-full text-[10.5px] font-medium inline-flex items-center justify-center gap-1 transition-colors cursor-pointer";
  const chipOn = "bg-[#007B3E]/12 text-[#007B3E] dark:text-emerald-300 ring-1 ring-[#007B3E]/30";
  const chipOff = "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10";
  return (
    <div className={cn(className, "p-4")} role="group" aria-label="Portfolio timeline">
      <div className="flex items-end justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 truncate">
            {chapter && year !== null ? `${chapter.from} to ${chapter.to >= maxYear ? "today" : chapter.to} · ${chapter.title}` : "Portfolio timeline"}
          </p>
          <p className="mt-1 flex items-baseline gap-2 text-slate-900 dark:text-white">
            <span key={shown} className="text-[28px] leading-none font-semibold tabular-nums animate-in fade-in slide-in-from-bottom-1 duration-500">
              {year ?? "All years"}
            </span>
            <span className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">{projects.length} on the map</span>
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={() => setFollow((v) => !v)} aria-pressed={follow} className={cn(chip, follow ? chipOn : chipOff)} title="Follow: while playing, the camera travels to where each year's works were finished. Touching the map pauses.">
            <Navigation className="h-3.5 w-3.5" />
          </button>
          {onNarrate && (
            <button type="button" onClick={() => setNarrate((v) => !v)} aria-pressed={narrate} className={cn(chip, narrate ? chipOn : chipOff)} title="Narration: Atlas says each year and what was finished in it, and the journey waits for him">
              {narrate ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
          )}
          <button type="button" onClick={() => setFast((v) => !v)} aria-pressed={fast} className={cn(chip, "tabular-nums", fast ? chipOn : chipOff)} title="Playback speed">
            {fast ? "2x" : "1x"}
          </button>
          <button
            type="button"
            onClick={() => (recording ? stopJourney() : startRecording())}
            aria-pressed={recording}
            className={cn(chip, recording ? "bg-rose-500/15 text-rose-500 ring-1 ring-rose-500/40" : chipOff)}
            title={recording ? "Stop and save the video" : "Record the journey as a video file (it plays from the first year and saves at the end)"}
          >
            <span className={cn("h-2.5 w-2.5 rounded-full", recording ? "bg-rose-500 animate-pulse" : "bg-rose-500/80")} />
            {recording && <span>REC</span>}
          </button>
          <button
            type="button"
            onClick={() => (playing ? stopJourney() : start())}
            className="h-9 w-9 rounded-full bg-[#007B3E] hover:bg-[#006633] text-white inline-flex items-center justify-center transition-colors cursor-pointer shadow-[0_6px_18px_-6px_rgba(0,123,62,0.8)]"
            title={playing ? "Pause" : "Play through the years"}
            aria-label={playing ? "Pause" : "Play through the years"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
          </button>
          <button
            type="button"
            onClick={() => {
              stopJourney();
              onYearChange(null);
            }}
            className={cn(chip, "h-9 px-2.5 text-[11px]", chipOff)}
            title="Leave the timeline: show every year again"
          >
            <RotateCcw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">All years</span>
          </button>
        </div>
      </div>

      {/* Running totals up to the year on screen (dated completions only; megawatts are the
          plants' ratings, not Sta. Clara's share of the work) */}
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
        <span>
          <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{running.done}</span> completed by {shown === maxYear ? "today" : shown}
        </span>
        {running.mw > 0 && (
          <span title="The rated size of the power plants worked on, not Sta. Clara's share of the work">
            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{Math.round(running.mw).toLocaleString("en-US")} MW</span> of power plants worked on
          </span>
        )}
        {building.length > 0 && (
          <span title={building.map((p) => p.name).join("\n")}>
            <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-300">{building.length}</span> under construction
          </span>
        )}
      </div>

      {/* Completions per year: the bars are the track, click one to go there. The strip beneath
          marks the eras. */}
      <div className="flex items-end gap-[2px] h-11" role="list" aria-label="Completions per year">
        {years.map((y) => {
          const n = perYear.get(y)?.length || 0;
          const past = y <= shown;
          const here = year === y;
          return (
            <button
              key={y}
              type="button"
              role="listitem"
              onClick={() => {
                stopJourney();
                onYearChange(y);
              }}
              title={`${y}: ${n ? `${n} completed` : "no completion on record"}`}
              aria-label={`${y}: ${n} completed`}
              className="group relative flex-1 h-full flex items-end cursor-pointer"
            >
              <span
                className={cn(
                  "block w-full rounded-t-[3px] transition-all duration-500",
                  here ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" : past ? "bg-[#007B3E] group-hover:bg-emerald-500" : "bg-slate-300 dark:bg-white/15 group-hover:bg-slate-400 dark:group-hover:bg-white/30"
                )}
                style={{ height: n ? `${18 + (n / peak) * 82}%` : "6%" }}
              />
            </button>
          );
        })}
      </div>
      {chapters.length > 1 && (
        <div className="mt-1 flex gap-[2px]" aria-hidden>
          {chapters.map((c) => (
            <span
              key={c.from}
              title={`${c.from} to ${c.to >= maxYear ? "today" : c.to}: ${c.title}`}
              className={cn("h-[3px] rounded-full transition-colors duration-500", chapter === c && year !== null ? "bg-emerald-400" : "bg-slate-300 dark:bg-white/20")}
              style={{ flex: c.to - c.from + 1 }}
            />
          ))}
        </div>
      )}
      <input
        type="range"
        min={minYear}
        max={maxYear}
        step={1}
        value={shown}
        onChange={(e) => {
          stopJourney();
          onYearChange(Number(e.target.value));
        }}
        aria-label="Year"
        className="mt-1 w-full accent-[#007B3E] cursor-pointer"
      />
      <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-0.5">
        <span>{minYear}</span>
        <span>{Math.round((minYear + maxYear) / 2)}</span>
        <span>Today</span>
      </div>

      {/* The year's works: photographs to look back on (click one to open it) */}
      {year !== null && builtThatYear.length > 0 ? (
        <div key={year} className="mt-2 flex gap-2 overflow-x-auto scic-scrollbar pb-1 animate-in fade-in slide-in-from-bottom-2 duration-700">
          {builtThatYear.map((p) => {
            const photo = p.imageUrl && !/placeholder|logo/.test(p.imageUrl) ? p.imageUrl : null;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  stopJourney();
                  onSelectProject(p.id);
                }}
                title={`Open ${p.name}`}
                className="group shrink-0 w-[168px] rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-left hover:border-emerald-500/60 transition-colors cursor-pointer"
              >
                <span className="atlas-skeleton block h-[72px] w-full overflow-hidden bg-slate-200 dark:bg-white/5">
                  {photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={optimizedImage(photo, 384)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  )}
                </span>
                <span className="block px-2 py-1.5">
                  <span className="block text-[11px] font-semibold leading-tight text-slate-900 dark:text-white line-clamp-2">{shortLabelOf(p.name, 52)}</span>
                  <span className="block mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {[p.metrics?.capacity, p.province].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-2 min-h-[30px] text-[11.5px] leading-snug text-slate-600 dark:text-slate-300 line-clamp-2">
          {year === null
            ? `Press play to travel from ${minYear} to today: the camera goes to each year's works and stays a while. Completed works appear in the year they were finished.${undated ? ` ${undated} completed works have no published date and stay on the map throughout.` : ""}`
            : year >= maxYear
              ? "Today: everything completed so far, plus the works now under way."
              : building.length
                ? `Under construction in ${year}: ${building.slice(0, 3).map((p) => shortLabelOf(p.name, 40)).join(" · ")}`
                : `No completion on record for ${year}.`}
        </div>
      )}
    </div>
  );
}
