"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Play,
  Pause,
  Share2,
  Check,
  ShieldCheck,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  Radio,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
} from "lucide-react";
import {
  TyphoonNewsVideo,
  TyphoonNewsFeedResponse,
  NewsChannelId,
  StormThreatLevel,
} from "@/lib/weather/news/tvNewsTypes";
import BroadcastSatelliteIcon from "./icons/BroadcastSatelliteIcon";
import { NetworkBadgeIcon } from "./icons/NetworkBadges";
import YouTubeCleanPlayer from "./YouTubeCleanPlayer";
import { cn } from "@/lib/utils";

interface TyphoonNewsDeskWidgetProps {
  className?: string;
  defaultForceExpand?: boolean;
}

const CHANNELS: { id: NewsChannelId; label: string; network: string; color: string }[] = [
  { id: "pagasa", label: "DOST-PAGASA", network: "State Meteorological Authority", color: "from-blue-600 to-cyan-600" },
  { id: "gma", label: "GMA News", network: "24 Oras / IMReady", color: "from-red-600 to-amber-600" },
  { id: "abscbn", label: "ABS-CBN News", network: "TV Patrol / ANC", color: "from-emerald-600 to-teal-600" },
  { id: "tv5", label: "TV5 / News5", network: "Frontline Pilipinas", color: "from-orange-600 to-yellow-600" },
  { id: "all", label: "All Bulletins", network: "Unified Chronological Feed", color: "from-indigo-600 to-purple-600" },
];

export default function TyphoonNewsDeskWidget({
  className,
  defaultForceExpand,
}: TyphoonNewsDeskWidgetProps) {
  const [feed, setFeed] = useState<TyphoonNewsFeedResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedChannel, setSelectedChannel] = useState<NewsChannelId>("pagasa");
  const [activeVideo, setActiveVideo] = useState<TyphoonNewsVideo | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyPortalLink = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${window.location.pathname}#tv-news-desk`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
  };

  // Fetch News Feed from API (supports seamless background polling)
  const fetchNews = async (force = false, isBackground = false) => {
    if (!isBackground) {
      if (force) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);
    }

    try {
      const res = await fetch(`/api/weather/news${force ? "?force=true" : ""}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data: TyphoonNewsFeedResponse = await res.json();
      setFeed(data);

      // Smart dynamic expansion:
      if (defaultForceExpand !== undefined) {
        setIsExpanded(defaultForceExpand);
      } else if (data.hasStormInPar || data.threatLevel === "RED" || data.threatLevel === "ORANGE") {
        setIsExpanded(true);
      }

      // Set or update active video without interrupting ongoing user playback
      setActiveVideo((prev) => {
        if (!prev) return data.featuredVideo || data.latestBulletins[0] || null;
        if (force && !isBackground) return data.featuredVideo || data.latestBulletins[0] || null;
        return prev;
      });
    } catch (err) {
      if (!isBackground) {
        console.error("[News Desk Widget] Error loading feeds:", err);
        setError("Unable to load latest TV news feeds. Please try refreshing.");
      }
    } finally {
      if (!isBackground) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchNews(false);

    // Dynamic background polling based on storm threat level:
    // Every 60s in RED/ORANGE cyclone alerts; every 2.5 minutes in NORMAL/YELLOW watch
    const pollIntervalMs =
      feed?.threatLevel === "RED" || feed?.threatLevel === "ORANGE"
        ? 60 * 1000
        : 150 * 1000;

    const intervalId = setInterval(() => {
      fetchNews(true, true);
    }, pollIntervalMs);

    // Refresh immediately when user returns to this browser tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchNews(true, true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [feed?.threatLevel]);

  // Filter video strip based on selected tab
  const displayedVideos: TyphoonNewsVideo[] = useMemo(() => {
    if (!feed) return [];
    if (selectedChannel === "all") {
      return feed.latestBulletins;
    }
    const channelList = feed.channels[selectedChannel as Exclude<NewsChannelId, "all">] || [];
    return channelList;
  }, [feed, selectedChannel]);

  const currentChannelConfig = useMemo(() => {
    return CHANNELS.find((c) => c.id === selectedChannel);
  }, [selectedChannel]);

  // Threat badge styling & radar aura
  const threatConfig = useMemo(() => {
    const level: StormThreatLevel = feed?.threatLevel || "NORMAL";
    switch (level) {
      case "RED":
        return {
          label: "SEVERE TYPHOON BROADCAST UPLINK",
          badgeBg: "bg-red-50 text-red-700 border-red-300 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/40",
          cardBorder: "border-red-300 dark:border-red-500/40 shadow-xl shadow-red-500/10",
          glowDot: "bg-red-500 animate-ping",
          cadenceText: "Live satellite update every 1-2 hours",
        };
      case "ORANGE":
        return {
          label: "ACTIVE CYCLONE WITHIN PAR",
          badgeBg: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40",
          cardBorder: "border-amber-300 dark:border-amber-500/35 shadow-lg shadow-amber-500/10",
          glowDot: "bg-amber-500 animate-pulse",
          cadenceText: "Updating every 3 hours (PAGASA Bulletin Cycle)",
        };
      case "YELLOW":
        return {
          label: "MONSOON & STORM WATCH",
          badgeBg: "bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/40",
          cardBorder: "border-yellow-300 dark:border-yellow-500/30 shadow-md shadow-yellow-500/5",
          glowDot: "bg-yellow-500",
          cadenceText: "Refreshes every 4-6 hours",
        };
      default:
        return {
          label: "PAR WEATHER SATELLITE (CALM)",
          badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40",
          cardBorder: "border-slate-200 dark:border-white/10 shadow-md",
          glowDot: "bg-emerald-500",
          cadenceText: "Refreshes every 6-12 hours",
        };
    }
  }, [feed?.threatLevel]);

  // Build clean embed URL with controls=0 (removes YouTube bottom bar & logo entirely)
  const cleanEmbedUrl = useMemo(() => {
    if (!activeVideo) return "";
    return `https://www.youtube-nocookie.com/embed/${activeVideo.id}?autoplay=1&controls=0&disablekb=1&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&enablejsapi=1${isMuted ? "&mute=1" : ""}`;
  }, [activeVideo, isMuted]);

  return (
    <div
      className={cn(
        "rounded-3xl transition-all duration-500 overflow-hidden",
        "bg-white/95 dark:bg-[#070F1B]/95 backdrop-blur-2xl border shadow-xl",
        threatConfig.cardBorder,
        className
      )}
    >
      {/* 1. Header Accordion Bar — Next-Level Satellite Radar Command Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between gap-3 cursor-pointer select-none border-b border-slate-200/80 dark:border-white/10 hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors relative group"
      >
        <div className="flex items-center gap-3.5 sm:gap-4 flex-wrap">
          {/* Orbital Doppler Radar Emblem */}
          <div className="relative flex items-center justify-center p-2 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 dark:from-slate-900 dark:to-black border border-slate-700 dark:border-white/15 shadow-inner">
            <BroadcastSatelliteIcon
              size={30}
              threatLevel={feed?.threatLevel}
              animated={true}
              className="text-white"
            />
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3.5 flex-wrap">
            <h2 className="text-sm sm:text-base font-bold font-display uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>Philippine Weather Broadcast Desk</span>
            </h2>

            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider border shrink-0",
                threatConfig.badgeBg
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", threatConfig.glowDot)} />
              {threatConfig.label}
            </span>

            {/* Subtle Minimalist Telecast Status Indicator */}
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0">
              <Sparkles className="w-3 h-3 text-sky-500" />
              <span>4 Networks Synced</span>
            </span>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fetchNews(true);
            }}
            disabled={isRefreshing || isLoading}
            title="Refresh news broadcasts"
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-sky-500 dark:text-sky-400")} />
            <span className="hidden sm:inline">Check Feeds</span>
          </button>

          <div className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </div>

      {/* 2. Expanded Body */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-5">
          {/* Metadata & Status Ribbon */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-100/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 text-xs font-mono text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2 flex-wrap">
              <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <span>{threatConfig.cadenceText}</span>
              {feed?.activeStormName && (
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  • Monitoring TC {feed.activeStormName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {feed?.cachedAt && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Verified: {new Date(feed.cachedAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila" })} PHT
                </span>
              )}
              {feed?.isPAGASAFallbackForecast && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-medium">
                  Daily Forecast Mode
                </span>
              )}
            </div>
          </div>

          {/* Network Channel Filter Tabs with Custom Brand Badges */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CHANNELS.map((ch) => {
              const isSelected = selectedChannel === ch.id;
              const count =
                ch.id === "all"
                  ? feed?.latestBulletins.length || 0
                  : feed?.channels[ch.id as Exclude<NewsChannelId, "all">]?.length || 0;

              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    setSelectedChannel(ch.id);
                    const channelList =
                      ch.id === "all"
                        ? feed?.latestBulletins || []
                        : feed?.channels[ch.id as Exclude<NewsChannelId, "all">] || [];
                    if (channelList.length > 0) {
                      setActiveVideo(channelList[0]);
                      setIsPlaying(false);
                    }
                  }}
                  className={cn(
                    "px-3.5 py-2 rounded-2xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0 border",
                    isSelected
                      ? "bg-slate-900 text-white dark:bg-gradient-to-r dark:from-white dark:to-slate-200 dark:text-slate-950 border-slate-900 dark:border-white shadow-md font-bold"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80 dark:bg-white/[0.03] dark:text-slate-300 dark:border-white/10 dark:hover:bg-white/[0.08]"
                  )}
                >
                  <NetworkBadgeIcon channelId={ch.id} size={16} />
                  <span>{ch.label}</span>
                  <span
                    className={cn(
                      "px-2 py-0.2 rounded-full text-[10px] font-mono",
                      isSelected
                        ? "bg-slate-800 text-white dark:bg-slate-900 dark:text-white font-bold"
                        : "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 3. Main Stage: Studio Monitor Bezel or Network Empty State */}
          {selectedChannel !== "all" && displayedVideos.length === 0 ? (
            <div className="p-8 sm:p-12 text-center rounded-3xl bg-white/[0.02] border border-dashed border-white/15 flex flex-col items-center justify-center space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
                <BroadcastSatelliteIcon
                  size={40}
                  threatLevel={feed?.threatLevel}
                  animated={false}
                  className="text-cyan-400 opacity-80"
                />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-white font-display">
                  No Active Typhoon Broadcasts from {currentChannelConfig?.label}
                </h3>
                <p className="text-xs text-slate-400 font-mono leading-relaxed">
                  Commercial television feeds strictly filter for verified storm bulletins and meteorological warnings. General political, crime, or entertainment stories are automatically excluded.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedChannel("pagasa");
                  if (feed?.channels.pagasa.length) {
                    setActiveVideo(feed.channels.pagasa[0]);
                    setIsPlaying(false);
                  }
                }}
                className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-mono text-xs font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <NetworkBadgeIcon channelId="pagasa" size={16} />
                <span>Switch to DOST-PAGASA Bulletins ({feed?.channels.pagasa.length || 0})</span>
              </button>
            </div>
          ) : activeVideo ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Studio Monitor Bezel Chassis */}
              <div className="lg:col-span-8 rounded-3xl bg-[#03070E] border border-white/15 p-2 sm:p-3 relative shadow-2xl overflow-hidden group">
                {/* Monitor Top Status Strip */}
                <div className="flex items-center justify-between px-3 py-2 bg-black/60 backdrop-blur-md rounded-t-xl border-b border-white/10 text-[11px] font-mono mb-2">
                  <div className="flex items-center gap-2.5">
                    {/* Live Audio Equalizer VU Meter */}
                    {activeVideo.isLive ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-600/20 border border-red-500/30 text-red-400 font-bold uppercase tracking-wider text-[10px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                        <span>LIVE ON-AIR</span>
                        <div className="flex items-end gap-0.5 h-3 ml-1">
                          <span className="w-0.5 h-2 bg-red-400 animate-pulse" />
                          <span className="w-0.5 h-3 bg-red-400 animate-bounce" />
                          <span className="w-0.5 h-1.5 bg-red-400 animate-pulse" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-400 font-bold uppercase tracking-wider text-[10px]">
                        <Radio className="w-3 h-3 text-sky-400 shrink-0" />
                        <span>{activeVideo.isPAGASABriefing ? "OFFICIAL BRIEFING" : "RECORDED FORECAST"}</span>
                      </div>
                    )}

                    <span className="text-white font-semibold truncate max-w-[200px] sm:max-w-xs">
                      {activeVideo.channelName}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="hidden sm:inline-flex text-slate-400">
                      TC: {activeVideo.timeAgo}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold text-[10px]">
                      1080p HD
                    </span>
                  </div>
                </div>

                {/* 16:9 Video Display Container with Custom YouTubeCleanPlayer */}
                {isPlaying ? (
                  <YouTubeCleanPlayer video={activeVideo} className="border border-white/10 shadow-inner" />
                ) : (
                  /* High-Resolution Thumbnail Facade */
                  <div
                    onClick={() => setIsPlaying(true)}
                    className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-inner cursor-pointer flex items-center justify-center group/thumb"
                  >
                      {/* Video Thumbnail */}
                      <img
                        src={activeVideo.thumbnailUrl}
                        alt={activeVideo.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-700 brightness-90 group-hover/thumb:brightness-100"
                      />

                      {/* Vignette Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/30" />

                      {/* High-Tech Glowing Play Button */}
                      <div className="relative z-10 flex flex-col items-center gap-3 group-hover/thumb:scale-110 transition-transform duration-300">
                        <div className="relative flex items-center justify-center">
                          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.6)] border-2 border-white/40">
                            <Play className="h-8 w-8 sm:h-9 sm:w-9 fill-white translate-x-1" />
                          </div>
                          <span className="absolute -inset-2 rounded-full border border-red-500/40 animate-ping opacity-75" />
                        </div>

                        <span className="text-xs font-mono font-bold tracking-wider uppercase text-white bg-black/75 px-3.5 py-1.5 rounded-full border border-white/20 backdrop-blur-md">
                          {activeVideo.isLive ? "Stream Live Broadcast" : "Watch Bulletin"}
                        </span>
                      </div>

                      {/* Top Source Badge */}
                      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                        <span className="px-3 py-1 rounded-xl text-xs font-bold font-mono tracking-wider uppercase bg-black/80 text-white border border-white/20 backdrop-blur-md flex items-center gap-2">
                          <NetworkBadgeIcon channelId={activeVideo.channelId} size={15} />
                          <span>{activeVideo.channelName}</span>
                        </span>
                      </div>

                      {/* Bottom Headline Bar */}
                      <div className="absolute bottom-3 left-3 right-3 z-10">
                        <h3 className="text-white text-xs sm:text-sm font-bold line-clamp-2 drop-shadow-md">
                          {activeVideo.title}
                        </h3>
                        <p className="text-white/70 text-[11px] font-mono mt-1">
                          {activeVideo.timeAgo} • Verified Philippine Broadcast
                        </p>
                      </div>
                    </div>
                  )}
              </div>

              {/* Right Stage: Broadcast Detail Card & Quick Actions */}
              <div className="lg:col-span-4 flex flex-col justify-between h-full p-4 sm:p-5 rounded-3xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Now In News Desk
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                      {activeVideo.timeAgo}
                    </span>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-3">
                    {activeVideo.title}
                  </h4>

                  {/* Channel Tag */}
                  <div className="mt-4 flex items-center gap-2.5 p-2 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 shadow-2xs">
                    <NetworkBadgeIcon channelId={activeVideo.channelId} size={20} />
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {activeVideo.channelName}
                    </span>
                  </div>

                  {/* Matched Keywords Tags */}
                  {activeVideo.matchedKeywords.length > 0 && (
                    <div className="mt-4">
                      <span className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400 block mb-1.5">
                        Matched Meteorological Topics:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeVideo.matchedKeywords.map((kw, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-mono uppercase bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Native In-Portal Share & Verified Station Telemetry */}
                <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleCopyPortalLink}
                    className="w-full py-2.5 px-3 rounded-2xl border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white text-xs font-mono font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Portal Broadcast Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
                        <span>Share Portal Broadcast</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1 font-mono">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Station Feed: Verified Internal</span>
                    </span>
                    <span>SCIC Operations</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center rounded-3xl bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10">
              <BroadcastSatelliteIcon size={36} threatLevel="NORMAL" className="mx-auto mb-3 opacity-60 text-cyan-500 dark:text-cyan-400" />
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {isLoading ? "Retrieving broadcast feeds from YouTube..." : "No recent broadcast matching this category."}
              </p>
            </div>
          )}

          {/* 4. Horizontal Strip of Recent Bulletins */}
          {displayedVideos.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300 font-mono flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Recent Broadcasts & Bulletins ({displayedVideos.length})</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
                  Click to switch active stream
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {displayedVideos.slice(0, 8).map((vid) => {
                  const isActive = activeVideo?.id === vid.id;

                  return (
                    <div
                      key={vid.id}
                      onClick={() => {
                        setActiveVideo(vid);
                        setIsPlaying(false);
                      }}
                      className={cn(
                        "group p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5",
                        isActive
                          ? "bg-red-500/10 dark:bg-white/10 border-red-500/60 ring-1 ring-red-500/50 shadow-md"
                          : "bg-slate-50/80 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-100 dark:hover:bg-white/[0.06] shadow-xs"
                      )}
                    >
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60">
                        <img
                          src={vid.thumbnailUrl}
                          alt={vid.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                          <div className="h-8 w-8 rounded-full bg-red-600 text-white flex items-center justify-center opacity-85 group-hover:opacity-100 shadow-md">
                            <Play className="h-3.5 w-3.5 fill-white translate-x-0.5" />
                          </div>
                        </div>

                        <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded text-[9px] font-mono bg-black/80 text-white font-medium backdrop-blur-xs">
                          {vid.timeAgo}
                        </span>
                      </div>

                      <div>
                        <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug group-hover:text-black dark:group-hover:text-white transition-colors">
                          {vid.title}
                        </h5>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <NetworkBadgeIcon channelId={vid.channelId} size={12} />
                            <span>{vid.channelId === "pagasa" ? "DOST-PAGASA" : vid.channelName}</span>
                          </span>
                          {isActive && (
                            <span className="text-red-500 dark:text-red-400 font-bold uppercase tracking-wider text-[9px]">
                              Active
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
