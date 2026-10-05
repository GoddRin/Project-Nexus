"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Check, Clock3, Columns3, Copy, Download, Keyboard, Link2, MoreHorizontal, Presentation, Save, Star, Trash2, Users, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AtlasTimelinePanel } from "@/components/atlas/tools/AtlasTimelinePanel";
import type { EraChapter } from "@/lib/atlas/projectFacts";
import type { SCICProject } from "@/lib/data/scicProjectsData";
import {
  VERIFICATION_LABEL, capacityMwOf, completionYearOf, projectsToCsv, readSavedViews, verificationOf, writeSavedViews, type SavedView,
} from "@/lib/atlas/projectFacts";

/**
 * The map's tool dock: a quiet row of tools along the bottom of the map.
 *
 *   Timeline   drag through the years and watch the portfolio build up (1996 -> today)
 *   Compare    up to three projects side by side
 *   Starred    your own short list (kept in this browser)
 *   Clients    narrow the map to one client
 *   More       saved views and share link, export to a spreadsheet, presentation mode, shortcuts
 *
 * Nothing here is modal: every panel closes with Esc or a click on its button, and the map stays
 * live underneath (AGENTS.md: Atlas is never a slideshow the user is locked into).
 */

export type DockPanel = "timeline" | "compare" | "views" | "clients" | "help" | "more" | null;

export interface AtlasToolDockProps {
  /** What is on the map now (after every filter) */
  projects: SCICProject[];
  /** The whole portfolio (for the timeline's range and the client list) */
  allProjects: SCICProject[];
  panel: DockPanel;
  onPanelChange: (p: DockPanel) => void;
  year: number | null;
  onYearChange: (y: number | null) => void;
  yearBounds: [number, number];
  starredIds: string[];
  starredOnly: boolean;
  onToggleStarredOnly: () => void;
  onToggleStar: (id: string) => void;
  client: string | null;
  onClientChange: (c: string | null) => void;
  compareIds: string[];
  onToggleCompare: (id: string) => void;
  onClearCompare: () => void;
  onSelectProject: (id: string) => void;
  onPresent: () => void;
  /** The project panel is open over the right of the map: sit in what is still visible */
  besidePanel?: boolean;
  /** The portfolio's eras, for the timeline */
  chapters: EraChapter[];
  onNarrate?: (text: string) => void;
  speechBusy?: boolean;
  className?: string;
}

const SHORTCUTS: Array<[string, string]> = [
  ["/", "Ask Atlas a question"],
  ["T", "Timeline: travel through the years"],
  ["C", "Compare projects"],
  ["S", "Star the open project"],
  ["V", "Saved views and share link"],
  ["P", "Presentation mode"],
  ["F", "Focus mode (map only)"],
  ["?", "This list"],
  ["Esc", "Close, step back, then return to the national view"],
];

function DockButton({
  active, onClick, title, children, badge,
}: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode; badge?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        "relative h-9 px-2.5 rounded-xl inline-flex items-center gap-1.5 text-[11px] font-medium transition-all duration-200 cursor-pointer",
        "active:scale-[0.96]",
        active
          ? "bg-[#007B3E] text-white shadow-[0_6px_18px_-6px_rgba(0,123,62,0.7)]"
          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.07]"
      )}
    >
      {children}
      {badge ? (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-[9px] font-bold text-white flex items-center justify-center shadow">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

const panelShell =
  "pointer-events-auto w-full max-w-[640px] rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-atlas-panel/95 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200";

export function AtlasToolDock(props: AtlasToolDockProps) {
  const {
    projects, allProjects, panel, onPanelChange, year, onYearChange, yearBounds, starredIds, starredOnly, onToggleStarredOnly,
    client, onClientChange, compareIds, onToggleCompare, onClearCompare, onSelectProject, onPresent, besidePanel, chapters, onNarrate, speechBusy, className,
  } = props;
  const toggle = (p: Exclude<DockPanel, null>) => onPanelChange(panel === p ? null : p);
  const [minYear, maxYear] = yearBounds;

  // ── Clients ──
  const clients = useMemo(() => {
    const count = new Map<string, number>();
    for (const p of allProjects) if (p.client) count.set(p.client, (count.get(p.client) || 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [allProjects]);
  const [clientQuery, setClientQuery] = useState("");

  // ── Saved views ──
  const [viewsVersion, setViewsVersion] = useState(0);
  const [viewName, setViewName] = useState("");
  const [copied, setCopied] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- viewsVersion re-reads after a save or delete
  const views = useMemo<SavedView[]>(() => (panel === "views" ? readSavedViews() : []), [panel, viewsVersion]);
  const setViews = (next: SavedView[]) => {
    writeSavedViews(next);
    setViewsVersion((v) => v + 1);
  };
  const saveView = () => {
    const name = viewName.trim() || `View ${views.length + 1}`;
    const next = [{ name, query: window.location.search.replace(/^\?/, ""), savedAt: Date.now() }, ...views.filter((v) => v.name !== name)];
    setViews(next);
    setViewName("");
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  // ── Export ──
  const exportCsv = () => {
    const blob = new Blob([projectsToCsv(projects)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `scic-project-atlas-${projects.length}-projects-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const compared = compareIds.map((id) => allProjects.find((p) => p.id === id)).filter(Boolean) as SCICProject[];

  // Esc closes the open panel first, and nothing else (it runs before the page's own Esc steps)
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onPanelChange(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [panel, onPanelChange]);

  // (the navigator stands at the right foot of the map: panels keep clear of him)
  const sideOffset = besidePanel ? "md:right-[380px] lg:right-[410px] xl:right-[430px]" : "right-[190px]";

  return (
    <>
      {/* Panels: centred over the visible map, just above the dock */}
      {panel && (
        <div className={cn("pointer-events-none absolute bottom-[68px] left-0 z-30 hidden md:flex justify-center px-3 transition-[right] duration-300", sideOffset)} data-atlas-tool-panel={panel}>

        {/* ── Timeline ── */}
        {panel === "timeline" && (
          <AtlasTimelinePanel
            className={panelShell}
            year={year}
            onYearChange={onYearChange}
            minYear={minYear}
            maxYear={maxYear}
            projects={projects}
            allProjects={allProjects}
            chapters={chapters}
            onSelectProject={onSelectProject}
            onNarrate={onNarrate}
            speechBusy={speechBusy}
          />
        )}

        {/* ── Compare ── */}
        {panel === "compare" && (
          <div className={cn(panelShell, "p-3 max-w-[760px]")} role="group" aria-label="Compare projects">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Compare ({compared.length}/3)</p>
              {compared.length > 0 && (
                <button type="button" onClick={onClearCompare} className="text-[11px] text-slate-500 hover:text-rose-600 inline-flex items-center gap-1 cursor-pointer">
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
            {compared.length === 0 ? (
              <p className="px-1 pb-2 text-[12px] text-slate-600 dark:text-slate-300">
                Open a project, then press the <span className="font-semibold">Compare</span> button at the top of its panel. Add up to three.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11.5px] border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <th className="w-24" />
                      {compared.map((p) => (
                        <th key={p.id} className="text-left align-bottom px-2 pb-2 min-w-[150px]">
                          <button type="button" onClick={() => onSelectProject(p.id)} className="text-left font-semibold text-slate-900 dark:text-white hover:text-[#007B3E] dark:hover:text-emerald-400 leading-snug cursor-pointer">
                            {p.name}
                          </button>
                          <button type="button" onClick={() => onToggleCompare(p.id)} className="ml-1 align-middle text-slate-400 hover:text-rose-500 cursor-pointer" aria-label={`Remove ${p.name}`}>
                            <X className="inline h-3 w-3" />
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        ["Category", (p: SCICProject) => String(p.sector).replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())],
                        ["Status", (p: SCICProject) => p.status.charAt(0) + p.status.slice(1).toLowerCase()],
                        ["Location", (p: SCICProject) => [p.municipality, p.province].filter(Boolean).join(", ")],
                        ["Region", (p: SCICProject) => p.region],
                        ["Capacity / size", (p: SCICProject) => p.metrics?.capacity || "Not on record"],
                        ["Megawatts", (p: SCICProject) => { const mw = capacityMwOf(p); return mw === null ? "—" : `${mw.toLocaleString("en-US", { maximumFractionDigits: 1 })} MW`; }],
                        ["Client", (p: SCICProject) => p.client || "Not on record"],
                        ["Completed", (p: SCICProject) => completionYearOf(p) ?? (p.status === "COMPLETED" ? "Date not published" : "—")],
                        ["Record", (p: SCICProject) => VERIFICATION_LABEL[verificationOf(p)].label],
                      ] as Array<[string, (p: SCICProject) => React.ReactNode]>
                    ).map(([label, get], i) => (
                      <tr key={label} className={i % 2 ? "" : "bg-slate-50/70 dark:bg-white/[0.03]"}>
                        <td className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 rounded-l-lg">{label}</td>
                        {compared.map((p, k) => (
                          <td key={p.id} className={cn("px-2 py-1.5 text-slate-800 dark:text-slate-100", k === compared.length - 1 && "rounded-r-lg")}>
                            {get(p)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Clients ── */}
        {panel === "clients" && (
          <div className={cn(panelShell, "p-3 max-w-[460px]")} role="group" aria-label="Filter by client">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Clients ({clients.length} verified)</p>
              {client && (
                <button type="button" onClick={() => onClientChange(null)} className="text-[11px] text-slate-500 hover:text-rose-600 inline-flex items-center gap-1 cursor-pointer">
                  <X className="h-3 w-3" /> Show all clients
                </button>
              )}
            </div>
            <input
              value={clientQuery}
              onChange={(e) => setClientQuery(e.target.value)}
              placeholder="Find a client…"
              className="w-full h-8 px-2.5 mb-2 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-[12px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#007B3E]/40"
            />
            <ul className="max-h-56 overflow-y-auto scic-scrollbar space-y-0.5">
              {clients
                .filter(([name]) => name.toLowerCase().includes(clientQuery.trim().toLowerCase()))
                .map(([name, n]) => (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => onClientChange(client === name ? null : name)}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg text-left text-[12px] transition-colors cursor-pointer",
                        client === name ? "bg-[#007B3E]/10 text-[#007B3E] dark:text-emerald-300" : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                      )}
                    >
                      <span className="truncate">{name}</span>
                      <span className="shrink-0 font-mono text-[10px] text-slate-500 dark:text-slate-400">{n}</span>
                    </button>
                  </li>
                ))}
            </ul>
            <p className="mt-2 px-1 text-[10.5px] text-slate-500 dark:text-slate-400">Only clients confirmed from a published source are listed.</p>
          </div>
        )}

        {/* ── Views ── */}
        {panel === "views" && (
          <div className={cn(panelShell, "p-3 max-w-[460px]")} role="group" aria-label="Saved views">
            <p className="px-1 mb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Views</p>
            <div className="flex gap-1.5 mb-2">
              <input
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveView()}
                placeholder="Name this view (e.g. Hydro in Mindanao)"
                className="flex-1 h-8 px-2.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-[12px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#007B3E]/40"
              />
              <button type="button" onClick={saveView} className="h-8 px-3 rounded-lg bg-[#007B3E] hover:bg-[#006633] text-white text-[11.5px] font-medium inline-flex items-center gap-1.5 cursor-pointer">
                <Save className="h-3.5 w-3.5" /> Save
              </button>
              <button type="button" onClick={copyLink} className="h-8 px-3 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-[11.5px] font-medium inline-flex items-center gap-1.5 cursor-pointer" title="Copy a link to exactly this view">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy link"}
              </button>
            </div>
            {views.length === 0 ? (
              <p className="px-1 pb-1 text-[12px] text-slate-600 dark:text-slate-300">
                Set the filters you want, then save them here. The address bar always holds a link to what you see.
              </p>
            ) : (
              <ul className="max-h-48 overflow-y-auto scic-scrollbar space-y-0.5">
                {views.map((v) => (
                  <li key={v.name} className="flex items-center gap-1">
                    <a
                      href={`${typeof window !== "undefined" ? window.location.pathname : ""}${v.query ? `?${v.query}` : ""}`}
                      className="flex-1 min-w-0 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                    >
                      <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{v.name}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const next = views.filter((x) => x.name !== v.name);
                        setViews(next);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer"
                      aria-label={`Delete view ${v.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── More ── */}
        {panel === "more" && (
          <div className={cn(panelShell, "p-1.5 max-w-[320px]")} role="menu" aria-label="More tools">
            {(
              [
                [Link2, "Saved views and share link", "V", () => onPanelChange("views")],
                [Download, `Export ${projects.length} ${projects.length === 1 ? "project" : "projects"} to a spreadsheet`, "", () => { exportCsv(); onPanelChange(null); }],
                [Presentation, "Presentation mode", "P", onPresent],
                [Keyboard, "Keyboard shortcuts", "?", () => onPanelChange("help")],
              ] as Array<[typeof Link2, string, string, () => void]>
            ).map(([Icon, label, key, run]) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                onClick={run}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors cursor-pointer"
              >
                <Icon className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                <span className="flex-1 truncate">{label}</span>
                {key && <kbd className="shrink-0 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 font-mono text-[10px]">{key}</kbd>}
              </button>
            ))}
          </div>
        )}

        {/* ── Shortcuts ── */}
        {panel === "help" && (
          <div className={cn(panelShell, "p-3 max-w-[400px]")} role="group" aria-label="Keyboard shortcuts">
            <p className="px-1 mb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Keyboard shortcuts</p>
            <ul className="space-y-1">
              {SHORTCUTS.map(([key, what]) => (
                <li key={key} className="flex items-center justify-between gap-4 px-1 text-[12px] text-slate-700 dark:text-slate-200">
                  <span>{what}</span>
                  <kbd className="shrink-0 min-w-[26px] text-center px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 font-mono text-[10.5px]">{key}</kbd>
                </li>
              ))}
            </ul>
          </div>
        )}

        </div>
      )}

      {/* The dock sits between the legend (left) and the navigator (right) and sizes itself to
          the room it has (a container query): icons only on a narrow map, labels on a wide one,
          and it steps aside when the strip is too thin to hold it. */}
      <div
        className={cn(
          "@container pointer-events-none absolute bottom-3 left-[158px] z-30 hidden md:flex justify-center transition-[right] duration-300",
          besidePanel ? "md:right-[570px] lg:right-[600px] xl:right-[620px]" : "right-[196px]",
          className
        )}
        data-atlas-tool-dock
      >
        <div className="pointer-events-auto hidden @[200px]:flex items-center gap-0.5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-atlas-panel/90 backdrop-blur-xl shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)]">
          <DockButton active={panel === "timeline" || year !== null} onClick={() => toggle("timeline")} title="Timeline: travel through the years (T)">
            <Clock3 className="h-4 w-4" />
            <span className="hidden @[620px]:inline">{year !== null ? year : "Timeline"}</span>
          </DockButton>
          <DockButton active={panel === "compare"} onClick={() => toggle("compare")} title="Compare projects (C)" badge={compareIds.length || undefined}>
            <Columns3 className="h-4 w-4" />
            <span className="hidden @[620px]:inline">Compare</span>
          </DockButton>
          <DockButton active={starredOnly} onClick={onToggleStarredOnly} title={starredOnly ? "Showing starred projects only: click to show all" : "Show only your starred projects"} badge={starredIds.length || undefined}>
            <Star className={cn("h-4 w-4", starredOnly && "fill-current")} />
            <span className="hidden @[620px]:inline">Starred</span>
          </DockButton>
          <DockButton active={panel === "clients" || !!client} onClick={() => toggle("clients")} title="Filter by client">
            <Users className="h-4 w-4" />
            <span className="hidden @[620px]:inline max-w-[110px] truncate">{client ? client.split(/[,(/]/)[0].trim() : "Clients"}</span>
          </DockButton>
          <span className="mx-0.5 h-5 w-px bg-slate-200 dark:bg-white/10" />
          <DockButton active={panel === "more" || panel === "views" || panel === "help"} onClick={() => onPanelChange(panel === "more" || panel === "views" || panel === "help" ? null : "more")} title="More: saved views, share link, export, presentation, shortcuts">
            <MoreHorizontal className="h-4 w-4" />
            <span className="hidden @[620px]:inline">More</span>
          </DockButton>
        </div>
      </div>
    </>
  );
}
