"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  MessageSquare,
  ShieldAlert,
  FileText,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Download,
  ChevronDown,
  ChevronUp,
  Compass,
  Radio,
  Info,
  X,
} from "lucide-react";
import BroadcastSatelliteIcon from "@/components/weather/icons/BroadcastSatelliteIcon";
import { cn } from "@/lib/utils";
import { PagasaSignalData } from "@/lib/weather/pagasa";
import { RiverStation, DamStatus } from "@/lib/weather/riverbasin";
import {
  generateTyphoonAnnouncement,
  AnnouncementChannel,
  GeneratedAnnouncement,
  StormBase,
} from "@/lib/weather/announcementGenerator";

interface TyphoonAnnouncementWidgetProps {
  storm?: StormBase;
  pagasaSignals?: PagasaSignalData;
  siteWindSpeed: number;
  sitePressure: number;
  isInsidePar: boolean;
  riverStations?: RiverStation[];
  damStatus?: DamStatus[];
  className?: string;
  defaultMinimized?: boolean;
  defaultHidden?: boolean;
}

export default function TyphoonAnnouncementWidget({
  storm,
  pagasaSignals,
  siteWindSpeed,
  sitePressure,
  isInsidePar,
  riverStations,
  damStatus,
  className,
  defaultMinimized = true,
  defaultHidden = true,
}: TyphoonAnnouncementWidgetProps) {
  // Minimized and hidden by default per user specification
  const [isMinimized, setIsMinimized] = useState<boolean>(defaultMinimized);
  const [isDismissed, setIsDismissed] = useState<boolean>(defaultHidden);
  const [selectedChannel, setSelectedChannel] = useState<AnnouncementChannel>("viber_staff");
  const [copied, setCopied] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Generate dynamic grounded announcement
  const announcement: GeneratedAnnouncement = useMemo(() => {
    return generateTyphoonAnnouncement({
      storm,
      pagasaSignals,
      siteWindSpeedKph: siteWindSpeed,
      sitePressureHpa: sitePressure,
      isInsidePar,
      riverStations,
      damStatus,
    });
  }, [storm, pagasaSignals, siteWindSpeed, sitePressure, isInsidePar, riverStations, damStatus]);

  // Current active text based on selected channel
  const activeText = useMemo(() => {
    switch (selectedChannel) {
      case "viber_staff":
        return announcement.viberStaffText;
      case "site_hse":
        return announcement.siteHseText;
      case "executive_client":
        return announcement.executiveClientText;
      default:
        return announcement.viberStaffText;
    }
  }, [selectedChannel, announcement]);

  // Handle Clipboard Copy
  const handleCopy = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(activeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy announcement to clipboard:", err);
    }
  };

  // Handle Download as File
  const handleDownload = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const blob = new Blob([activeText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateTag = new Date().toISOString().slice(0, 10);
      const stormSlug = storm?.name?.toLowerCase() || "weather-bulletin";
      link.href = url;
      link.download = `SCIC-THEPP-${stormSlug}-${selectedChannel}-${dateTag}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download announcement:", err);
    }
  };

  // Handle Web Speech Synthesis Voice Readout
  const handleToggleVoice = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Speech synthesis is not supported on this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    // Prepare speech text: humanized version of the announcement
    const textToSpeak = `Sta. Clara International Corporation weather bulletin for the Tumauini Hydroelectric Power Project, 11.3 megawatts, in Barangay Antagan Uno, Tumauini, Isabela. ${announcement.summary} Worksite directives: ${announcement.recommendedActions.join(". ")}`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current = utterance;

    // Pick warm natural Philippine or US English voice if available
    try {
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          (v.lang.includes("PH") || v.lang.includes("en-PH") || v.name.includes("Natural") || v.name.includes("Jenny") || v.name.includes("US")) &&
          !v.lang.includes("GB") &&
          !v.lang.includes("AU")
      );
      if (preferred) {
        utterance.voice = preferred;
        utterance.lang = preferred.lang;
      }
    } catch {}

    utterance.rate = 0.94;
    utterance.pitch = 0.98;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Theme styling based on threat level
  const threatBorder =
    announcement.threatLevel === "RED"
      ? "border-red-500/40 bg-red-50/90 dark:bg-red-950/15 shadow-red-950/10"
      : announcement.threatLevel === "ORANGE"
      ? "border-amber-500/40 bg-amber-50/90 dark:bg-amber-950/15 shadow-amber-950/10"
      : announcement.threatLevel === "YELLOW"
      ? "border-yellow-500/30 bg-yellow-50/90 dark:bg-yellow-950/10 shadow-yellow-950/10"
      : announcement.threatLevel === "FAIR_DISTANT"
      ? "border-sky-500/25 bg-sky-50/90 dark:bg-sky-950/15 shadow-sky-950/10"
      : "border-emerald-500/30 bg-emerald-50/90 dark:bg-emerald-950/15 shadow-emerald-950/10";

  const threatBadgeBg =
    announcement.threatLevel === "RED"
      ? "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40 animate-pulse"
      : announcement.threatLevel === "ORANGE"
      ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40"
      : announcement.threatLevel === "YELLOW"
      ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/40"
      : announcement.threatLevel === "FAIR_DISTANT"
      ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30"
      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";

  if (isDismissed) {
    return (
      <div
        className={cn(
          "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-100/90 dark:bg-black/20 border border-slate-200 dark:border-white/10 backdrop-blur-md transition-all shadow-xs",
          className
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={cn("text-[9px] font-bold font-mono px-2 py-0.5 rounded-full uppercase tracking-wider border shrink-0", threatBadgeBg)}>
            {announcement.threatBadge}
          </span>
          <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px] truncate">
            Tumauini HEPP (11.3 MW) Weather Announcement hidden
          </span>
        </div>
        <button
          onClick={() => setIsDismissed(false)}
          className="text-xs font-mono text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:underline px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-400/20 transition-colors cursor-pointer shrink-0 ml-2 font-medium"
        >
          Show Announcement
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full rounded-2xl border backdrop-blur-xl transition-all duration-300 relative overflow-hidden",
        threatBorder,
        className
      )}
    >
      {/* Ambient gradient top line */}
      <div
        className={cn(
          "absolute top-0 inset-x-0 h-1",
          announcement.threatLevel === "RED"
            ? "bg-gradient-to-r from-red-600 via-rose-500 to-amber-500"
            : announcement.threatLevel === "ORANGE"
            ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500"
            : announcement.threatLevel === "YELLOW"
            ? "bg-gradient-to-r from-yellow-500 via-emerald-400 to-teal-500"
            : announcement.threatLevel === "FAIR_DISTANT"
            ? "bg-gradient-to-r from-sky-500 via-teal-400 to-emerald-400"
            : "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300"
        )}
      />

      {/* ─── Compact Header Row (Always Visible) ────────────────── */}
      <div
        onClick={() => setIsMinimized(!isMinimized)}
        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 border",
              announcement.threatLevel === "RED"
                ? "bg-red-500/20 border-red-500/40 text-red-500 dark:text-red-400"
                : announcement.threatLevel === "ORANGE"
                ? "bg-amber-500/20 border-amber-500/40 text-amber-500 dark:text-amber-400"
                : announcement.threatLevel === "FAIR_DISTANT"
                ? "bg-sky-500/20 border-sky-500/40 text-sky-600 dark:text-sky-300"
                : "bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
            )}
          >
            {announcement.threatLevel === "RED" || announcement.threatLevel === "ORANGE" ? (
              <ShieldAlert className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            ) : (
              <Radio className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("text-[9px] font-bold font-mono px-2 py-0.5 rounded-full uppercase tracking-wider border", threatBadgeBg)}>
                {announcement.threatBadge}
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hidden md:inline">
                Tumauini HEPP (11.3 MW)
              </span>
            </div>

            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate mt-0.5">
              {announcement.summary}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopy}
            title="Copy announcement for communication channels"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer shadow-xs",
              copied
                ? "bg-emerald-500 text-black border border-emerald-400"
                : "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/30"
            )}
            aria-label="Copy announcement text"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-black" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy Text</span>
              </>
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/60 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 transition-colors cursor-pointer"
            aria-label={isMinimized ? "Expand announcement" : "Minimize announcement"}
          >
            <span className="hidden sm:inline">{isMinimized ? "Show Announcement" : "Hide"}</span>
            {isMinimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsDismissed(true);
            }}
            title="Dismiss / Hide this announcement bar"
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/60 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 transition-colors cursor-pointer"
            aria-label="Hide announcement bar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Expandable Full Announcement Body ───────────────────── */}
      {!isMinimized && (
        <div className="p-4 sm:p-5 pt-0 border-t border-slate-200/80 dark:border-white/10 space-y-3.5">
          {/* Real-Time Grounded Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
            <div className="p-2.5 rounded-xl bg-white/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/5 shadow-xs">
              <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 block font-mono">System & Category</span>
              <span className="text-xs font-semibold text-slate-900 dark:text-white font-mono mt-0.5 block truncate">
                {announcement.keyMetrics.category} {announcement.keyMetrics.stormName}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/5 shadow-xs">
              <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 block font-mono">Distance to Worksite</span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                {announcement.keyMetrics.cpaDistance} (CPA)
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/5 shadow-xs">
              <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 block font-mono">Local Worksite Wind</span>
              <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 font-mono mt-0.5 block">
                {announcement.keyMetrics.siteWind} (Fair)
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/70 dark:bg-black/20 border border-slate-200/80 dark:border-white/5 shadow-xs">
              <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 block font-mono">Pinacanauan River</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono mt-0.5 block truncate">
                {announcement.keyMetrics.riverStatus}
              </span>
            </div>
          </div>

          {/* Channel Tabs */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/60 dark:bg-black/30 border border-slate-300/80 dark:border-white/10 overflow-x-auto">
              <button
                onClick={() => setSelectedChannel("viber_staff")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer shrink-0",
                  selectedChannel === "viber_staff"
                    ? "bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Group Chat Broadcast</span>
              </button>

              <button
                onClick={() => setSelectedChannel("site_hse")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer shrink-0",
                  selectedChannel === "site_hse"
                    ? "bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Site Operations & Safety</span>
              </button>

              <button
                onClick={() => setSelectedChannel("executive_client")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer shrink-0",
                  selectedChannel === "executive_client"
                    ? "bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Executive & Client Memo</span>
              </button>
            </div>

            {/* Quick Readout & Download Actions */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <button
                onClick={handleToggleVoice}
                title={isSpeaking ? "Stop Voice Briefing" : "Listen to Audio Briefing"}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer border",
                  isSpeaking
                    ? "bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black border-emerald-500 font-bold"
                    : "bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-slate-300 dark:border-white/10 shadow-xs"
                )}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Listen</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownload}
                title="Download formatted text memo"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Memo (.txt)</span>
              </button>

              <a
                href="#tv-news-desk"
                title="Jump to Philippine Weather Broadcast Desk"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-red-700 dark:text-slate-200 hover:text-red-800 dark:hover:text-white bg-red-500/10 hover:bg-red-500/20 dark:bg-red-600/15 dark:hover:bg-red-600/25 border border-red-500/30 transition-all cursor-pointer group"
              >
                <BroadcastSatelliteIcon size={14} animated={true} className="text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform" />
                <span>Broadcast Desk</span>
              </a>
            </div>
          </div>

          {/* Announcement Text Box */}
          <div className="relative rounded-xl border border-slate-300/80 dark:border-white/10 bg-slate-950 text-slate-100 dark:bg-[#061017]/95 p-4 font-mono text-xs leading-relaxed shadow-inner overflow-hidden">
            <pre className="whitespace-pre-wrap font-sans text-xs text-slate-200 selection:bg-emerald-500 selection:text-black">
              {activeText}
            </pre>
          </div>

          {/* Footer Attribution */}
          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-flow-teal shrink-0" />
              <span>Grounded in verified PAGASA bulletins, JTWC tracks, and Tumauini GloFAS river telemetry.</span>
            </span>
            <span className="text-slate-500 text-[10px] hidden sm:inline">
              Tumauini HEPP (11.3 MW) · Sta. Clara International Corporation
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
