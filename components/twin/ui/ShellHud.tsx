"use client";

/**
 * Stand-in controls for the scene shell (P01b): overview, places, time. Enough to drive the camera
 * and the clock by hand; P13a replaces all of it with the real interface.
 */
import Link from "next/link";
import { Home } from "lucide-react";
import { CAMERA_PLACES } from "../data/site";
import { cameraApi, hasPlaces } from "../engine/camera";
import type { RendererBackend } from "../engine/renderer";
import { clock, formatClock } from "../sim/clock";
import { TIERS, WEATHER_STATES, twinActions, useTwin, type Tier, type WeatherState } from "../state/store";

const card =
  "pointer-events-auto rounded-xl border border-border-hairline bg-card/95 shadow-xl backdrop-blur-md dark:border-white/15 dark:bg-[#0B1013]/90";
const field =
  "h-8 cursor-pointer rounded-lg border border-border-hairline bg-bg-panel px-2.5 text-xs font-medium text-text-primary shadow-2xs outline-none transition-colors [color-scheme:light] hover:border-scic-green/50 hover:bg-bg-panel-raised focus-visible:border-scic-green focus-visible:ring-2 focus-visible:ring-scic-green/25 dark:border-white/15 dark:bg-[#131F1C] dark:[color-scheme:dark] dark:hover:border-scic-green/50 dark:hover:bg-[#1B2A26] [&_option]:bg-bg-panel [&_option]:text-text-primary dark:[&_option]:bg-[#0D1614] dark:[&_option]:text-[#F2F6F4]";

export function ShellHud({ backend }: { backend: RendererBackend | null }) {
  const place = useTwin((s) => s.camera.place);
  const location = useTwin((s) => s.location);
  const live = useTwin((s) => s.clock.mode === "live");
  const time = useTwin((s) => formatClock(s.clock.minutes));
  const tier = useTwin((s) => s.quality.tier);
  const auto = useTwin((s) => s.quality.auto);
  const weather = useTwin((s) => s.weather.state);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-2.5 sm:p-4">
      <div className={`${card} flex flex-wrap items-center gap-2 self-start px-3 py-2`}>
        <div className="mr-1">
          <p className="font-display text-sm font-semibold leading-tight tracking-tight text-text-primary">Twin v2</p>
          <p className="font-mono text-[10px] leading-tight text-text-muted">
            Scene shell{backend ? ` · ${backend === "webgpu" ? "WebGPU" : "WebGL2"}` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={() => cameraApi.overview()}
          title="Back to the site overview (Esc)"
          className="flex h-8 items-center gap-1.5 rounded-lg border border-scic-green/40 bg-scic-green/10 px-2.5 text-xs font-medium text-scic-green transition-colors hover:bg-scic-green/20"
        >
          <Home className="h-3.5 w-3.5" />
          Overview
        </button>

        {hasPlaces(location) && (
          <select
            aria-label="Go to a place"
            className={`${field} max-w-[11rem]`}
            value={place ?? ""}
            onChange={(e) => {
              if (e.target.value) cameraApi.flyTo(e.target.value);
              e.target.blur();
            }}
          >
            <option value="">Go to a place…</option>
            {CAMERA_PLACES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        )}

        <input
          type="time"
          aria-label="Time of day on site"
          className={`${field} font-mono`}
          value={time}
          onChange={(e) => {
            const [h, m] = e.target.value.split(":").map(Number);
            if (Number.isFinite(h) && Number.isFinite(m)) clock.setManual(h * 60 + m, 0);
          }}
        />
        <button
          type="button"
          onClick={() => clock.setLive()}
          aria-pressed={live}
          title="Follow the real time on site (Asia/Manila)"
          className={`h-8 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
            live
              ? "border-scic-green/40 bg-scic-green/10 text-scic-green"
              : "border-border-hairline bg-bg-panel text-text-secondary hover:border-scic-green/50 hover:bg-bg-panel-raised hover:text-text-primary dark:border-white/15 dark:bg-[#131F1C] dark:hover:bg-[#1B2A26]"
          }`}
        >
          Live
        </button>

        <select
          aria-label="Weather (simulated)"
          title="Weather. Simulated: it is set here, not read from the site."
          className={field}
          value={weather}
          onChange={(e) => {
            twinActions.setWeather(e.target.value as WeatherState, "simulated");
            e.target.blur();
          }}
        >
          {WEATHER_STATES.map((w) => (
            <option key={w} value={w}>
              Simulated: {w}
            </option>
          ))}
        </select>

        <select
          aria-label="Picture quality"
          title="Picture quality. Auto picks a level for this device."
          className={field}
          value={auto ? "auto" : tier}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "auto") twinActions.setQuality(tier, true);
            else twinActions.setQuality(value as Tier, false);
            e.target.blur();
          }}
        >
          <option value="auto">Quality: auto ({tier})</option>
          {TIERS.map((t) => (
            <option key={t} value={t}>
              Quality: {t}
            </option>
          ))}
        </select>

        <Link href="/digital-twin" className="px-1 text-xs text-text-secondary underline-offset-2 hover:text-text-primary hover:underline">
          Current twin
        </Link>
      </div>

      <p className={`${card} hidden self-start px-3 py-1.5 font-mono text-[10px] text-text-secondary md:block`}>
        Drag: orbit · Right-drag: pan · Scroll: zoom to cursor · Double-click: focus · WASD / arrows: move · Q / E: down / up · Shift: faster · Esc: overview
      </p>
    </div>
  );
}
