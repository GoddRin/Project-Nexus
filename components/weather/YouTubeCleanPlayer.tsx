"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Check,
  ChevronRight,
  Radio,
} from "lucide-react";
import { TyphoonNewsVideo } from "@/lib/weather/news/tvNewsTypes";
import { NetworkBadgeIcon } from "./icons/NetworkBadges";
import { cn } from "@/lib/utils";

interface YouTubeCleanPlayerProps {
  video: TyphoonNewsVideo;
  className?: string;
  onEnded?: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${m}:${pad(s)}`;
}

const QUALITY_OPTIONS = [
  { key: "auto", label: "Auto (Recommended)", badge: "DASH" },
  { key: "highres", label: "4K Ultra HD (2160p)", badge: "4K" },
  { key: "hd1440", label: "2K QHD (1440p)", badge: "2K" },
  { key: "hd1080", label: "1080p Full HD", badge: "HD" },
  { key: "hd720", label: "720p HD", badge: "HD" },
  { key: "large", label: "480p SD", badge: "SD" },
  { key: "medium", label: "360p", badge: "SD" },
  { key: "small", label: "240p", badge: "Low" },
];

const SPEED_OPTIONS = [
  { value: 0.5, label: "0.5x" },
  { value: 0.75, label: "0.75x" },
  { value: 1.0, label: "1x (Normal)" },
  { value: 1.25, label: "1.25x" },
  { value: 1.5, label: "1.5x" },
  { value: 2.0, label: "2x" },
];

export default function YouTubeCleanPlayer({
  video,
  className,
  onEnded,
}: YouTubeCleanPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const playerIdRef = useRef<string>(`yt-player-${Math.random().toString(36).substring(2, 9)}`);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qualityToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadedFraction, setLoadedFraction] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const [centerAnimation, setCenterAnimation] = useState<"play" | "pause" | "rw" | "ff" | null>(null);
  const [qualityToast, setQualityToast] = useState<string | null>(null);

  // Settings Menu Popover State
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"menu" | "quality" | "speed">("menu");
  const [selectedQuality, setSelectedQuality] = useState<string>("auto");
  const [selectedSpeed, setSelectedSpeed] = useState<number>(1.0);

  // Trigger feedback icon pulse in video center
  const triggerCenterAnimation = (type: "play" | "pause" | "rw" | "ff") => {
    setCenterAnimation(type);
    setTimeout(() => {
      setCenterAnimation(null);
    }, 550);
  };

  // Schedule auto-hide of controls after 2.8s of inactivity
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying && !isScrubbing && !showSettings) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2800);
    }
  }, [isPlaying, isScrubbing, showSettings]);

  // Dual-Driver Command Dispatcher: sends via direct postMessage AND YT.Player API
  const sendCommand = useCallback((func: string, args: any[] = []) => {
    // 1. PostMessage to Iframe Window
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func: func,
            args: args,
          }),
          "*"
        );
      } catch (err) {
        console.warn("[YouTubeCleanPlayer] postMessage error:", err);
      }
    }

    // 2. YT.Player API fallback
    if (playerRef.current && typeof playerRef.current[func] === "function") {
      try {
        playerRef.current[func](...args);
      } catch {
        // Fallback already covered by postMessage
      }
    }
  }, []);

  // Initialize YT.Player on iframe element
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const bindPlayer = () => {
      if (!window.YT || !window.YT.Player || !iframeRef.current) return;
      try {
        playerRef.current = new window.YT.Player(iframeRef.current, {
          events: {
            onReady: (event: any) => {
              setIsPlayerReady(true);
              try {
                const dur = event.target.getDuration();
                if (dur && !isNaN(dur) && dur > 0) setDuration(dur);
                event.target.playVideo();
                setIsPlaying(true);
              } catch (e) {
                console.warn("[YouTubeCleanPlayer] Autoplay delayed:", e);
              }
            },
            onStateChange: (event: any) => {
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
              if (event.data === 1) {
                setIsPlaying(true);
              } else if (event.data === 2) {
                setIsPlaying(false);
                setShowControls(true);
              } else if (event.data === 0) {
                setIsPlaying(false);
                setShowControls(true);
                if (onEnded) onEnded();
              }
            },
          },
        });
      } catch (err) {
        console.warn("[YouTubeCleanPlayer] Could not bind YT.Player instance:", err);
      }
    };

    if (window.YT && window.YT.Player) {
      bindPlayer();
    } else {
      const prevHandler = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevHandler) prevHandler();
        bindPlayer();
      };
    }

    return () => {
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [video.id, onEnded]);

  // Listen to native YouTube postMessage infoDelivery events
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        if (!e.data || typeof e.data !== "string") return;
        const data = JSON.parse(e.data);
        if (data.event === "infoDelivery" && data.info) {
          const info = data.info;
          if (typeof info.currentTime === "number" && !isScrubbing) {
            setCurrentTime(info.currentTime);
          }
          if (typeof info.duration === "number" && info.duration > 0) {
            setDuration(info.duration);
          }
          if (typeof info.playerState === "number") {
            if (info.playerState === 1) setIsPlaying(true);
            else if (info.playerState === 2) setIsPlaying(false);
            else if (info.playerState === 0) {
              setIsPlaying(false);
              if (onEnded) onEnded();
            }
          }
          if (typeof info.videoLoadedFraction === "number") {
            setLoadedFraction(info.videoLoadedFraction);
          }
        }
      } catch {
        // Non-JSON or third-party message
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isScrubbing, onEnded]);

  // High-frequency playback position synchronizer (300ms fallback)
  useEffect(() => {
    syncIntervalRef.current = setInterval(() => {
      if (playerRef.current && isPlayerReady && !isScrubbing) {
        try {
          if (typeof playerRef.current.getCurrentTime === "function") {
            const cur = playerRef.current.getCurrentTime() || 0;
            if (cur > 0) setCurrentTime(cur);
          }
          if (typeof playerRef.current.getDuration === "function") {
            const dur = playerRef.current.getDuration() || 0;
            if (dur && !isNaN(dur) && dur > 0) {
              setDuration(dur);
            }
          }
          if (typeof playerRef.current.getVideoLoadedFraction === "function") {
            const frac = playerRef.current.getVideoLoadedFraction() || 0;
            setLoadedFraction(frac);
          }
        } catch {
          // Ignore
        }
      }
    }, 300);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [isPlayerReady, isScrubbing]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Transport Control Actions
  const togglePlayPause = () => {
    if (isPlaying) {
      sendCommand("pauseVideo");
      setIsPlaying(false);
      triggerCenterAnimation("pause");
    } else {
      sendCommand("playVideo");
      setIsPlaying(true);
      triggerCenterAnimation("play");
    }
    resetHideTimer();
  };

  const skipSeconds = (delta: number) => {
    const cur = currentTime;
    const target = Math.max(0, Math.min(duration || 99999, cur + delta));
    setCurrentTime(target);
    sendCommand("seekTo", [target, true]);
    triggerCenterAnimation(delta > 0 ? "ff" : "rw");
    resetHideTimer();
  };

  const handleSeek = (newTime: number) => {
    const target = Math.max(0, Math.min(duration || 99999, newTime));
    setCurrentTime(target);
    sendCommand("seekTo", [target, true]);
    resetHideTimer();
  };

  const handleVolumeChange = (newVol: number) => {
    sendCommand("setVolume", [newVol]);
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      sendCommand("unMute");
      setIsMuted(false);
    } else if (newVol === 0 && !isMuted) {
      sendCommand("mute");
      setIsMuted(true);
    }
    resetHideTimer();
  };

  const toggleMute = () => {
    if (isMuted) {
      sendCommand("unMute");
      setIsMuted(false);
      if (volume === 0) {
        sendCommand("setVolume", [50]);
        setVolume(50);
      }
    } else {
      sendCommand("mute");
      setIsMuted(true);
    }
    resetHideTimer();
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
      resetHideTimer();
    } catch (err) {
      console.warn("toggleFullscreen error:", err);
    }
  };

  const handleSelectQuality = (qualityKey: string) => {
    setSelectedQuality(qualityKey);
    sendCommand("setPlaybackQuality", [qualityKey]);
    sendCommand("setPlaybackQualityRange", [qualityKey, qualityKey]);

    // Force DASH manifest buffer reload at requested resolution
    try {
      if (playerRef.current && typeof playerRef.current.loadVideoById === "function") {
        const cur = playerRef.current.getCurrentTime ? playerRef.current.getCurrentTime() : currentTime;
        playerRef.current.loadVideoById({
          videoId: video.id,
          startSeconds: cur,
          suggestedQuality: qualityKey,
        });
      }
    } catch {
      // Handled by postMessage
    }

    const opt = QUALITY_OPTIONS.find((q) => q.key === qualityKey);
    const label = opt?.label || qualityKey;

    if (qualityToastTimerRef.current) clearTimeout(qualityToastTimerRef.current);
    if (qualityKey === "highres" || qualityKey === "hd1440") {
      setQualityToast(`Targeting ${label} • Broadcaster source master upscaled`);
    } else if (qualityKey === "auto") {
      setQualityToast("Auto Quality • Dynamically adapting to network bandwidth");
    } else {
      setQualityToast(`Resolution set to ${label}`);
    }

    qualityToastTimerRef.current = setTimeout(() => {
      setQualityToast(null);
    }, 3200);

    setShowSettings(false);
    resetHideTimer();
  };

  const handleSelectSpeed = (speedValue: number) => {
    setSelectedSpeed(speedValue);
    sendCommand("setPlaybackRate", [speedValue]);
    setShowSettings(false);
    resetHideTimer();
  };

  // Keyboard controls when container is focused
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      togglePlayPause();
    } else if (e.key === "ArrowLeft" || e.key === "j") {
      e.preventDefault();
      skipSeconds(-10);
    } else if (e.key === "ArrowRight" || e.key === "l") {
      e.preventDefault();
      skipSeconds(10);
    } else if (e.key === "f") {
      e.preventDefault();
      toggleFullscreen();
    } else if (e.key === "m") {
      e.preventDefault();
      toggleMute();
    }
  };

  // Mouse Scrubber Handlers
  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || duration <= 0) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pct * duration);
    setHoverX(pct * 100);

    if (isScrubbing) {
      handleSeek(pct * duration);
    }
  };

  const handleScrubberMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || duration <= 0) return;
    setIsScrubbing(true);
    const rect = scrubberRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    handleSeek(pct * duration);

    const onWindowMouseMove = (moveEvent: MouseEvent) => {
      if (!scrubberRef.current) return;
      const r = scrubberRef.current.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (moveEvent.clientX - r.left) / r.width));
      handleSeek(p * duration);
    };

    const onWindowMouseUp = () => {
      setIsScrubbing(false);
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
      resetHideTimer();
    };

    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
  };

  // Mobile Touch Scrubber Handlers
  const handleScrubberTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || duration <= 0) return;
    setIsScrubbing(true);
    setShowControls(true);
    const touch = e.touches[0];
    const rect = scrubberRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    setHoverTime(pct * duration);
    setHoverX(pct * 100);
    handleSeek(pct * duration);
  };

  const handleScrubberTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || duration <= 0) return;
    const touch = e.touches[0];
    const rect = scrubberRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    setHoverTime(pct * duration);
    setHoverX(pct * 100);
    handleSeek(pct * duration);
  };

  const handleScrubberTouchEnd = () => {
    setIsScrubbing(false);
    setHoverTime(null);
    resetHideTimer();
  };

  // YouTube dynamic scene preview image selection
  const sceneThumbnailUrl = useMemo(() => {
    if (hoverTime === null || duration <= 0) return video.thumbnailUrl;
    const pct = hoverTime / duration;
    if (pct < 0.33) {
      return `https://img.youtube.com/vi/${video.id}/1.jpg`;
    } else if (pct < 0.66) {
      return `https://img.youtube.com/vi/${video.id}/2.jpg`;
    } else {
      return `https://img.youtube.com/vi/${video.id}/3.jpg`;
    }
  }, [hoverTime, duration, video.id, video.thumbnailUrl]);

  const playedPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const loadedPct = loadedFraction * 100;
  const isLiveStream = video.isLive || duration <= 0;

  // Active Quality Label for display pill
  const activeQualityLabel = useMemo(() => {
    const match = QUALITY_OPTIONS.find((q) => q.key === selectedQuality);
    return match ? match.label.replace(" (Recommended)", "") : "1080p HD";
  }, [selectedQuality]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseMove={resetHideTimer}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
        if (isPlaying && !isScrubbing && !showSettings) setShowControls(false);
      }}
      className={cn(
        "relative aspect-video rounded-2xl overflow-hidden bg-black select-none outline-none group/player",
        isFullscreen ? "rounded-none w-screen h-screen fixed inset-0 z-[99999]" : "",
        className
      )}
    >
      {/* 1. Underlying YouTube Iframe Container */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-300"
        style={{
          filter:
            selectedQuality === "highres" || selectedQuality === "hd1440" || selectedQuality === "hd1080"
              ? "contrast(1.05) saturate(1.06) brightness(1.01)"
              : selectedQuality === "small" || selectedQuality === "medium"
              ? "contrast(0.95)"
              : "none",
        }}
      >
        <iframe
          ref={iframeRef}
          id={playerIdRef.current}
          src={`https://www.youtube-nocookie.com/embed/${video.id}?enablejsapi=1&autoplay=1&controls=0&disablekb=1&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&fs=0&origin=${typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : ""}`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="w-full h-full border-0 pointer-events-none"
        />
      </div>

      {/* Dynamic Quality Adjustment Toast Alert */}
      {qualityToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-sky-400/30 text-white font-mono text-xs flex items-center gap-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>{qualityToast}</span>
        </div>
      )}

      {/* 2. Top Vignette & Header Information (Fades with controls) */}
      <div
        className={cn(
          "absolute top-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent z-20 pointer-events-none transition-opacity duration-300 flex items-center justify-between",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="flex items-center gap-2.5 max-w-[75%] sm:max-w-[80%]">
          <span className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono tracking-wider uppercase bg-black/70 text-white border border-white/20 backdrop-blur-md flex items-center gap-2 shrink-0 shadow-xs">
            <NetworkBadgeIcon channelId={video.channelId} size={15} />
            <span className="hidden xs:inline">{video.channelName}</span>
          </span>
          <h4 className="text-white text-xs sm:text-sm font-semibold truncate drop-shadow-md">
            {video.title}
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {isLiveStream ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600/90 text-white font-mono text-[10px] font-bold tracking-wider uppercase shadow-md">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              <span>LIVE</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/90 text-[10px] font-mono border border-white/15">
              {activeQualityLabel}
            </span>
          )}
        </div>
      </div>

      {/* 3. Transparent Click Surface over video to Play/Pause & Double-Click Skip */}
      <div
        onClick={togglePlayPause}
        onDoubleClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          if (e.clientX - rect.left < rect.width / 2) {
            skipSeconds(-10);
          } else {
            skipSeconds(10);
          }
        }}
        className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center"
      >
        {/* Animated Center Ripple Feedback Icon (Play / Pause / Rewind / Fast-Forward) */}
        {centerAnimation && (
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-black/75 backdrop-blur-md border border-white/30 text-white flex items-center justify-center animate-ping opacity-90 shadow-2xl pointer-events-none">
            {centerAnimation === "play" && <Play className="h-8 w-8 fill-white translate-x-1" />}
            {centerAnimation === "pause" && <Pause className="h-8 w-8 fill-white" />}
            {centerAnimation === "rw" && <RotateCcw className="h-8 w-8 text-white" />}
            {centerAnimation === "ff" && <RotateCw className="h-8 w-8 text-white" />}
          </div>
        )}
      </div>

      {/* 4. Settings Popup Dialog (Quality & Playback Speed) */}
      {showSettings && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-3 sm:right-6 bottom-16 z-40 w-64 rounded-2xl bg-black/90 backdrop-blur-xl border border-white/20 p-3 shadow-2xl text-white font-mono text-xs animate-in fade-in zoom-in-95 duration-150"
        >
          {settingsTab === "menu" ? (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 pb-1.5 mb-1">
                Player Settings
              </div>
              <button
                type="button"
                onClick={() => setSettingsTab("quality")}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-left"
              >
                <span>Quality</span>
                <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                  <span>{activeQualityLabel}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab("speed")}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-left"
              >
                <span>Playback Speed</span>
                <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                  <span>{selectedSpeed === 1.0 ? "Normal" : `${selectedSpeed}x`}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </button>
            </div>
          ) : settingsTab === "quality" ? (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setSettingsTab("menu")}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white mb-2 cursor-pointer"
              >
                <span>← Back</span>
              </button>
              <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 pb-1.5 mb-1 flex items-center justify-between">
                <span>Video Resolution</span>
                <span className="text-[10px] text-sky-400/90 font-mono">Max 1080p Source</span>
              </div>
              <div className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-slate-300 leading-relaxed mb-1.5">
                <span className="text-sky-400 font-semibold">ℹ️ Note:</span> DOST-PAGASA & TV news broadcast in up to 1080p HD. Higher tiers apply edge contrast enhancement.
              </div>
              {QUALITY_OPTIONS.map((q) => (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => handleSelectQuality(q.key)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(selectedQuality === q.key ? "font-bold text-sky-400" : "text-white")}>
                      {q.label}
                    </span>
                    {q.badge && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-white/10 text-slate-300 border border-white/10">
                        {q.badge}
                      </span>
                    )}
                  </div>
                  {selectedQuality === q.key && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setSettingsTab("menu")}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white mb-2 cursor-pointer"
              >
                <span>← Back</span>
              </button>
              <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 pb-1.5 mb-1">
                Playback Speed
              </div>
              {SPEED_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleSelectSpeed(s.value)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-left"
                >
                  <span className={cn(selectedSpeed === s.value && "font-bold text-sky-400")}>
                    {s.label}
                  </span>
                  {selectedSpeed === s.value && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Next-Gen YouTube-Style Control Bar Overlay */}
      <div
        className={cn(
          "absolute bottom-0 inset-x-0 z-30 pt-8 pb-3 px-3 sm:px-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent transition-all duration-300",
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        {/* A. High-Precision YouTube Seek Scrubber Bar */}
        {!isLiveStream && (
          <div
            ref={scrubberRef}
            onMouseMove={handleScrubberMouseMove}
            onMouseDown={handleScrubberMouseDown}
            onMouseLeave={() => setHoverTime(null)}
            onTouchStart={handleScrubberTouchStart}
            onTouchMove={handleScrubberTouchMove}
            onTouchEnd={handleScrubberTouchEnd}
            className="relative w-full h-5 mb-2 cursor-pointer flex items-center group/scrub py-2 touch-none"
          >
            {/* YouTube-Style Hover Scene Thumbnail Preview Card */}
            {hoverTime !== null && duration > 0 && (
              <div
                style={{
                  left: `${Math.max(12, Math.min(88, hoverX))}%`,
                }}
                className="absolute -top-28 -translate-x-1/2 flex flex-col items-center pointer-events-none z-40 animate-in fade-in duration-100"
              >
                <div className="w-36 h-20 sm:w-40 sm:h-22.5 rounded-xl overflow-hidden border-2 border-white/60 shadow-2xl bg-black relative">
                  <img
                    src={sceneThumbnailUrl}
                    alt={`Preview at ${formatTime(hoverTime)}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = video.thumbnailUrl;
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-white font-mono text-[10px] font-bold border border-white/20">
                    {formatTime(hoverTime)}
                  </span>
                </div>
                <div className="w-2.5 h-2.5 bg-black rotate-45 border-r border-b border-white/40 -mt-1 shadow-md" />
              </div>
            )}

            {/* Base Background Track */}
            <div className="w-full h-1 group-hover/scrub:h-1.5 rounded-full bg-white/25 overflow-hidden transition-all duration-150 relative">
              {/* Loaded / Buffered Bar */}
              <div
                style={{ width: `${loadedPct}%` }}
                className="absolute inset-y-0 left-0 bg-white/40 rounded-full transition-all duration-200"
              />
              {/* Played Crimson Progress Bar */}
              <div
                style={{ width: `${playedPct}%` }}
                className="absolute inset-y-0 left-0 bg-red-600 rounded-full"
              />
            </div>

            {/* Scrubber Playhead Thumb (Dot) */}
            <div
              style={{ left: `${playedPct}%` }}
              className="absolute -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-red-600 border border-white shadow-md scale-0 group-hover/scrub:scale-100 transition-transform duration-150 pointer-events-none"
            />
          </div>
        )}

        {/* B. Transport Buttons Row (YouTube Style) */}
        <div className="flex items-center justify-between text-white gap-2">
          {/* Left Controls: Play/Pause, -10s, +10s, Volume, Time */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-white/15 text-white transition-colors cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 sm:h-5 sm:w-5 fill-white" />
              ) : (
                <Play className="h-5 w-5 sm:h-5 sm:w-5 fill-white translate-x-0.5" />
              )}
            </button>

            {/* Replay 10 Seconds */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                skipSeconds(-10);
              }}
              title="Rewind 10 seconds (J / Left Arrow)"
              className="p-1.5 sm:p-2 rounded-xl hover:bg-white/15 text-slate-200 hover:text-white transition-colors cursor-pointer relative"
            >
              <RotateCcw className="h-4 w-4 sm:h-4 sm:w-4" />
              <span className="text-[8px] font-mono absolute -bottom-0.5 inset-x-0 text-center font-bold">
                10
              </span>
            </button>

            {/* Skip 10 Seconds */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                skipSeconds(10);
              }}
              title="Skip 10 seconds (L / Right Arrow)"
              className="p-1.5 sm:p-2 rounded-xl hover:bg-white/15 text-slate-200 hover:text-white transition-colors cursor-pointer relative"
            >
              <RotateCw className="h-4 w-4 sm:h-4 sm:w-4" />
              <span className="text-[8px] font-mono absolute -bottom-0.5 inset-x-0 text-center font-bold">
                10
              </span>
            </button>

            {/* Volume Control with Expandable Slider */}
            <div className="flex items-center gap-1 group/vol">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                title={isMuted ? "Unmute (M)" : "Mute (M)"}
                className="p-1.5 sm:p-2 rounded-xl hover:bg-white/15 text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                ) : volume < 50 ? (
                  <Volume1 className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="w-0 group-hover/vol:w-16 sm:group-hover/vol:w-20 transition-all duration-200 accent-red-600 h-1 cursor-pointer opacity-0 group-hover/vol:opacity-100"
              />
            </div>

            {/* Timestamp Display */}
            <div className="text-[11px] sm:text-xs font-mono text-slate-300 ml-1">
              {isLiveStream ? (
                <span className="flex items-center gap-1.5 text-red-400 font-bold uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span>LIVE BROADCAST</span>
                </span>
              ) : (
                <span>
                  <span className="text-white font-medium">{formatTime(currentTime)}</span>
                  <span className="mx-1 text-slate-500">/</span>
                  <span className="text-slate-400">{formatTime(duration)}</span>
                </span>
              )}
            </div>
          </div>

          {/* Right Controls: Quality Selector, Settings Cog & Fullscreen Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quality & Speed Settings Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSettings(!showSettings);
                setSettingsTab("menu");
              }}
              title="Settings (Resolution & Playback Speed)"
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-[10px] font-mono border border-white/15 transition-all cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-bold">{activeQualityLabel}</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              title={isFullscreen ? "Exit Fullscreen (F)" : "Full screen (F)"}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-white/15 text-slate-200 hover:text-white transition-colors cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Maximize className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
