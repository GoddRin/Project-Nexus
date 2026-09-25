"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import * as maplibregl from "maplibre-gl";
import { useTheme } from "next-themes";

export type AtlasBaseStyle = "DARK" | "LIGHT" | "SATELLITE";
export type AtlasIslandPreset =
  | "PHILIPPINES"
  | "LUZON"
  | "VISAYAS"
  | "MINDANAO"
  | "PALAWAN";

export interface AtlasViewport {
  center: [number, number]; // [longitude, latitude]
  zoom: number;
  bearing: number;
  pitch: number;
}

// Authoritative Philippine Archipelagic Geographic Bounds: [[west, south], [east, north]]
export const PHILIPPINES_BOUNDS: [[number, number], [number, number]] = [
  [116.5, 4.5], // Southwest (Tawi-Tawi / Kalayaan extent)
  [127.0, 21.2], // Northeast (Batanes / Eastern Luzon extent)
];

// Island Presets with Bounding Boxes: [[minLng, minLat], [maxLng, maxLat]]
export const ISLAND_PRESET_BOUNDS: Record<
  AtlasIslandPreset,
  [[number, number], [number, number]]
> = {
  PHILIPPINES: PHILIPPINES_BOUNDS,
  LUZON: [
    [119.5, 12.5],
    [124.5, 19.2],
  ],
  VISAYAS: [
    [121.2, 9.2],
    [126.0, 12.8],
  ],
  MINDANAO: [
    [121.5, 5.4],
    [126.8, 10.2],
  ],
  PALAWAN: [
    [116.8, 8.2],
    [120.2, 12.5],
  ],
};

export interface AtlasMapContextValue {
  selectedProjectId: string | null;
  viewport: AtlasViewport;
  mapStyle: AtlasBaseStyle;
  isFullscreen: boolean;
  mapInstance: maplibregl.Map | null;

  // Actions
  selectProject: (projectId: string | null) => void;
  flyToProject: (target: {
    coordinates?: { lat: number; lng: number };
    latitude?: number;
    longitude?: number;
    id?: string;
    zoom?: number;
    pitch?: number;
    bearing?: number;
  }) => void;
  resetToNationalView: () => void;
  setIslandPreset: (preset: AtlasIslandPreset) => void;
  setMapStyle: (style: AtlasBaseStyle) => void;
  toggleFullscreen: () => void;
  registerMapInstance: (map: maplibregl.Map | null) => void;
  updateViewportState: (vp: Partial<AtlasViewport>) => void;

  // GIS Layers & Measurement (Phase 8)
  activeGisLayers: Set<string>;
  toggleGisLayer: (layerId: string) => void;
  isMeasuring: boolean;
  setIsMeasuring: (measuring: boolean) => void;
  zoomToBounds: (
    bounds: [[number, number], [number, number]],
    options?: { padding?: any; maxZoom?: number }
  ) => void;
}

const AtlasMapContext = createContext<AtlasMapContextValue | null>(null);

export interface AtlasMapProviderProps {
  children: ReactNode;
  initialSelectedProjectId?: string | null;
  initialStyle?: AtlasBaseStyle;
  mapContainerRef?: React.RefObject<HTMLDivElement | null>;
  isSidebarOpen?: boolean;
}

export function AtlasMapProvider({
  children,
  initialSelectedProjectId = null,
  initialStyle = "DARK",
  mapContainerRef,
  isSidebarOpen = true,
}: AtlasMapProviderProps) {
  const { resolvedTheme } = useTheme();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialSelectedProjectId
  );
  const [mapStyle, setMapStyleState] = useState<AtlasBaseStyle>(
    resolvedTheme === "light" ? "LIGHT" : initialStyle
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Automatically synchronize map cartography style with system theme
  useEffect(() => {
    if (!resolvedTheme) return;
    if (resolvedTheme === "light") {
      setMapStyleState((prev) => (prev === "SATELLITE" ? "SATELLITE" : "LIGHT"));
    } else {
      setMapStyleState((prev) => (prev === "SATELLITE" ? "SATELLITE" : "DARK"));
    }
  }, [resolvedTheme]);

  // Phase 8: GIS Layers (immutable Set) & Measurement Mode
  const [activeGisLayers, setActiveGisLayers] = useState<Set<string>>(
    () => new Set(["projects"])
  );
  const [isMeasuring, setIsMeasuring] = useState(false);

  const toggleGisLayer = useCallback((layerId: string) => {
    setActiveGisLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  }, []);

  const [viewport, setViewport] = useState<AtlasViewport>({
    center: [121.774, 12.8797],
    zoom: 5.8,
    bearing: 0,
    pitch: 0,
  });

  const mapInstanceRef = useRef<maplibregl.Map | null>(null);

  const registerMapInstance = useCallback((map: maplibregl.Map | null) => {
    mapInstanceRef.current = map;
  }, []);

  const updateViewportState = useCallback((vp: Partial<AtlasViewport>) => {
    setViewport((prev) => ({ ...prev, ...vp }));
  }, []);

  // Responsive padding calculation for fitBounds
  const getResponsivePadding = useCallback(() => {
    if (typeof window === "undefined") {
      return { top: 60, bottom: 60, left: 60, right: 60 };
    }
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      return {
        top: 60,
        bottom: 120, // Space for bottom sheet
        left: 24,
        right: 24,
      };
    }
    return {
      top: 60,
      bottom: 60,
      left: 60, // MapLibre canvas is inside its own container, padding is internal
      right: 60,
    };
  }, []);

  // Selection Action
  const selectProject = useCallback((projectId: string | null) => {
    setSelectedProjectId(projectId);
  }, []);

  // Fly to project coordinates smoothly
  const flyToProject = useCallback(
    (target: {
      coordinates?: { lat: number; lng: number };
      latitude?: number;
      longitude?: number;
      id?: string;
      zoom?: number;
      pitch?: number;
      bearing?: number;
    }) => {
      if (target.id) {
        setSelectedProjectId(target.id);
      }

      const map = mapInstanceRef.current;
      if (!map) return;

      const lng = target.longitude ?? target.coordinates?.lng;
      const lat = target.latitude ?? target.coordinates?.lat;

      if (lng != null && lat != null) {
        const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
        map.flyTo({
          center: [lng, lat],
          zoom: target.zoom ?? Math.max(map.getZoom(), 13.5),
          bearing: target.bearing ?? 0,
          pitch: target.pitch ?? 0,
          duration: 1400,
          essential: true,
          padding: isDesktop ? { top: 0, bottom: 0, left: 0, right: 430 } : undefined,
        });
      }
    },
    []
  );

  // Reset to National View with responsive padding
  const resetToNationalView = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const padding = getResponsivePadding();
    map.fitBounds(PHILIPPINES_BOUNDS, {
      padding,
      bearing: 0,
      pitch: 0,
      duration: 1400,
      essential: true,
    });
  }, [getResponsivePadding]);

  // Jump to Island Preset
  const setIslandPreset = useCallback(
    (preset: AtlasIslandPreset) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const bounds = ISLAND_PRESET_BOUNDS[preset] || PHILIPPINES_BOUNDS;
      const padding = getResponsivePadding();

      map.fitBounds(bounds, {
        padding,
        bearing: 0,
        pitch: 0,
        duration: 1400,
        essential: true,
      });
    },
    [getResponsivePadding]
  );

  // Switch Map Style
  const setMapStyle = useCallback((style: AtlasBaseStyle) => {
    setMapStyleState(style);
  }, []);

  // Toggle Fullscreen (HTML5 Fullscreen API)
  const toggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;

    const targetElement = mapContainerRef?.current || document.documentElement;

    if (!document.fullscreenElement) {
      targetElement
        .requestFullscreen?.()
        .then(() => setIsFullscreen(true))
        .catch((err) => {
          console.warn("Fullscreen request error:", err);
        });
    } else {
      document
        .exitFullscreen?.()
        .then(() => setIsFullscreen(false))
        .catch((err) => {
          console.warn("Exit fullscreen error:", err);
        });
    }
  }, [mapContainerRef]);

  // Listen to fullscreen changes to update state and trigger map resize
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsFullscreen(isFs);

      // Trigger map resize on next tick
      setTimeout(() => {
        mapInstanceRef.current?.resize();
      }, 100);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Zoom to arbitrary geographic bounds (for regional & provincial extents)
  const zoomToBounds = useCallback(
    (
      bounds: [[number, number], [number, number]],
      options?: { padding?: any; maxZoom?: number }
    ) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const padding = options?.padding || getResponsivePadding();
      map.fitBounds(bounds, {
        padding,
        maxZoom: options?.maxZoom ?? 14.5,
        duration: 1400,
        essential: true,
      });
    },
    [getResponsivePadding]
  );

  const value = useMemo<AtlasMapContextValue>(
    () => ({
      selectedProjectId,
      viewport,
      mapStyle,
      isFullscreen,
      mapInstance: mapInstanceRef.current,
      selectProject,
      flyToProject,
      resetToNationalView,
      setIslandPreset,
      setMapStyle,
      toggleFullscreen,
      registerMapInstance,
      updateViewportState,
      activeGisLayers,
      toggleGisLayer,
      isMeasuring,
      setIsMeasuring,
      zoomToBounds,
    }),
    [
      selectedProjectId,
      viewport,
      mapStyle,
      isFullscreen,
      selectProject,
      flyToProject,
      resetToNationalView,
      setIslandPreset,
      setMapStyle,
      toggleFullscreen,
      registerMapInstance,
      updateViewportState,
      activeGisLayers,
      toggleGisLayer,
      isMeasuring,
      setIsMeasuring,
      zoomToBounds,
    ]
  );

  return (
    <AtlasMapContext.Provider value={value}>{children}</AtlasMapContext.Provider>
  );
}

export function useAtlasMap(): AtlasMapContextValue {
  const context = useContext(AtlasMapContext);
  if (!context) {
    throw new Error("useAtlasMap must be used within an AtlasMapProvider");
  }
  return context;
}

export function useOptionalAtlasMap(): AtlasMapContextValue | null {
  return useContext(AtlasMapContext);
}
