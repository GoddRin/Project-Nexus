"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import useSWR from "swr";
import { IncidentDispatchModal } from "./IncidentDispatchModal";

import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Circle,
  GeoJSON,
  ScaleControl,
  ZoomControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as turf from "@turf/turf";
import { toast } from "sonner";
import {
  AlertTriangle,
  Map,
  Map as MapIcon,
  Layers,
  MapPin,
  Waves,
  Navigation,
  Zap,
  CloudSun,
  Activity,
  Landmark,
  ShieldAlert,
  Camera,
  X,
  Search,
  Eye,
  EyeOff,
  Flame,
  Shield,
  Phone,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Interfaces for items ---
interface SelectedItem {
  name: string;
  category: string;
  address?: string;
  distance: string;
  details?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  lon?: number;
  id?: string | number;
}

interface OSMElement {
  id: string | number;
  type?: string;
  lat?: number;
  lon?: number;
  lng?: number;
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
}

// --- Hardcoded coordinates ---
const SITE_LAT = 17.318823;
const SITE_LNG = 121.9749251;

// Bounds to perfectly frame both the HEPP site and Tumauini town proper
// regardless of the screen aspect ratio or print orientation.
const VIEW_BOUNDS: [[number, number], [number, number]] = [
  [17.2400, 121.7600], // Southwest corner
  [17.3500, 122.0200], // Northeast corner
];

const MUNICIPALITIES = [
  { name: "Tumauini", lat: 17.2736, lng: 121.8078 },
  { name: "Ilagan", lat: 17.1481, lng: 121.8903 },
  { name: "Cauayan", lat: 16.9297, lng: 121.7756 },
  { name: "Tuguegarao (Cagayan)", lat: 17.6133, lng: 121.7269 },
  { name: "Cabagan", lat: 17.4194, lng: 121.7733 },
  { name: "Burgos", lat: 17.0872, lng: 122.0628 },
  { name: "Roxas", lat: 17.1186, lng: 121.6214 },
  { name: "San Pablo", lat: 17.4589, lng: 121.8156 },
  { name: "Delfin Albano", lat: 17.3061, lng: 121.7336 },
  { name: "Dinapigue", lat: 16.5333, lng: 122.3333 },
  { name: "Palanan", lat: 17.0644, lng: 122.4278 },
  { name: "San Mariano", lat: 16.9806, lng: 122.0125 },
];

const NGCP_SUBSTATIONS = [
  { name: "Tuguegarao Substation", lat: 17.6133, lng: 121.7269, voltage: "230kV" },
  { name: "Ilagan Substation", lat: 17.1500, lng: 121.8750, voltage: "69kV" },
  { name: "Cauayan Substation", lat: 16.9200, lng: 121.7700, voltage: "115/69kV" },
  { name: "San Mateo Substation", lat: 16.8833, lng: 121.5833, voltage: "69kV" },
];

const PAGASA_STATIONS = [
  { name: "Tuguegarao City Station", lat: 17.6473, lng: 121.7311, type: "Class 1 Synoptic Station" },
  { name: "Ilagan City Station", lat: 17.1481, lng: 121.8903, type: "Cooperative Station" },
  { name: "Cauayan City Station", lat: 16.9297, lng: 121.7756, type: "Cooperative Station" },
  { name: "Tumauini Reference Point", lat: 17.0667, lng: 121.8000, type: "Climatological Station Reference" },
];

// --- Fallback Emergency Data in case Overpass is offline ---
const FALLBACK_HOSPITALS: OSMElement[] = [
  { id: "cvmc", lat: 17.65658, lon: 121.74712, tags: { name: "Cagayan Valley Medical Center (CVMC)", amenity: "hospital", "addr:street": "Regional Government Center, Carig Sur", "addr:city": "Tuguegarao City", phone: "+63-78-304-1810" } },
  { id: "st-paul", lat: 17.61409, lon: 121.70744, tags: { name: "St. Paul Hospital Tuguegarao", amenity: "hospital", "addr:street": "Luna Street Extension, Ugac Norte", "addr:city": "Tuguegarao City", phone: "+63-78-844-2234" } },
  { id: "h1", lat: 17.28646, lon: 121.80575, tags: { name: "Tumauini Community Hospital", amenity: "hospital", "addr:street": "National Highway", "addr:city": "Tumauini" } },
  { id: "h2", lat: 17.13200, lon: 121.86889, tags: { name: "Gov. Faustino N. Dy, Sr. Memorial Hospital", amenity: "hospital", "addr:street": "Calamagui 2nd", "addr:city": "Ilagan City", phone: "+63-78-323-2009" } },
  { id: "h3", lat: 17.14890, lon: 121.88940, tags: { name: "Isabela Doctors General Hospital", amenity: "hospital", "addr:street": "Baligatan", "addr:city": "Ilagan City", phone: "+63-78-624-0012" } },
  { id: "h4", lat: 16.91869, lon: 121.76858, tags: { name: "Cauayan District Hospital", amenity: "hospital", "addr:street": "Rosemarie Reyes St.", "addr:city": "Cauayan City" } }
];

const FALLBACK_POLICE: OSMElement[] = [
  { id: "p1", lat: 17.2735, lon: 121.8075, tags: { name: "Tumauini Police Station", amenity: "police", "addr:city": "Tumauini", phone: "117 / 911" } },
  { id: "p2", lat: 17.1481, lon: 121.8903, tags: { name: "Ilagan City Police Station", amenity: "police", "addr:city": "Ilagan City", phone: "+63-917-862-2345" } }
];

const FALLBACK_FIRE: OSMElement[] = [
  { id: "f1", lat: 17.2738, lon: 121.8080, tags: { name: "Tumauini Fire Station", amenity: "fire_station", "addr:city": "Tumauini", phone: "+63-78-323-0118" } },
  { id: "f2", lat: 17.1485, lon: 121.8910, tags: { name: "Ilagan Fire Station", amenity: "fire_station", "addr:city": "Ilagan City" } }
];

// --- Custom Pins using Leaflet DivIcon ---
const createSiteIcon = () =>
  L.divIcon({
    className: "custom-site-pin",
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 rounded-full bg-flow-teal/20 animate-ping"></div>
        <div class="absolute w-5 h-5 rounded-full bg-flow-teal/40 animate-pulse"></div>
        <div class="w-3.5 h-3.5 rounded-full bg-[#1FB6A6] border-2 border-white shadow-md"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const createSubstationIcon = () =>
  L.divIcon({
    className: "custom-substation-pin",
    html: `
      <div class="flex items-center justify-center w-6 h-6 rounded-lg bg-black/60 border border-signal-amber text-signal-amber shadow-lg">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const createPagasaIcon = () =>
  L.divIcon({
    className: "custom-pagasa-pin",
    html: `
      <div class="flex items-center justify-center w-6 h-6 rounded-lg bg-black/60 border border-[#6A9ABA] text-[#6A9ABA] shadow-lg">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42-1.89-1.78-3.5-4-3.5a5.5 5.5 0 0 0-5.38 4.38A4 4 0 0 0 3 15.5 3.5 3.5 0 0 0 6.5 19z"></path>
        </svg>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const createHospitalIcon = () =>
  L.divIcon({
    className: "custom-hospital-pin",
    html: `
      <div class="flex items-center justify-center w-6 h-6 rounded-full bg-white border border-signal-red text-signal-red shadow-lg">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"></path>
        </svg>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const createGovernmentIcon = () =>
  L.divIcon({
    className: "custom-gov-pin",
    html: `
      <div class="flex items-center justify-center w-6 h-6 rounded-lg bg-black/60 border border-[#8A9ABA] text-[#8A9ABA] shadow-lg">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v7M12 14v7M16 14v7"></path>
        </svg>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const createPoliceIcon = () =>
  L.divIcon({
    className: "custom-police-pin",
    html: `
      <div class="flex items-center justify-center w-6 h-6 rounded-lg bg-black/60 border border-blue-500 text-blue-500 shadow-lg">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const createFireIcon = () =>
  L.divIcon({
    className: "custom-fire-pin",
    html: `
      <div class="flex items-center justify-center w-6 h-6 rounded-lg bg-black/60 border border-red-500 text-red-500 shadow-lg">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
        </svg>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const createAmbulanceIcon = () =>
  L.divIcon({
    className: "custom-ambulance-pin",
    html: `
      <div class="flex items-center justify-center w-6 h-6 rounded-lg bg-black/60 border border-orange-500 text-orange-500 shadow-lg">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="3" width="15" height="13"></rect>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
          <circle cx="5.5" cy="18.5" r="2.5"></circle>
          <circle cx="18.5" cy="18.5" r="2.5"></circle>
        </svg>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const createLabelIcon = (text: string) =>
  L.divIcon({
    className: "bg-transparent border-none p-0 whitespace-nowrap",
    html: `<div class="text-[10px] font-bold text-white tracking-wide" style="text-shadow: 0px 2px 4px rgba(0,0,0,0.9), 0px 0px 2px rgba(0,0,0,0.9), 0px 0px 8px rgba(0,0,0,0.8);">${text}</div>`,
    iconAnchor: [0, 6],
  });

const createMunicipalityIcon = (name: string) =>
  L.divIcon({
    className: "bg-transparent border-none p-0 whitespace-nowrap pointer-events-none",
    html: `
      <div class="flex items-center gap-1.5">
        <div class="w-1.5 h-1.5 rounded-full bg-white border border-black shadow-sm"></div>
        <span class="text-[10px] font-bold text-white tracking-wide" style="text-shadow: 0px 2px 4px rgba(0,0,0,0.9), 0px 0px 2px rgba(0,0,0,0.9);">${name}</span>
      </div>
    `,
    iconSize: [120, 20],
    iconAnchor: [3, 10],
  });

// --- Map click tracker helper component ---
function MapEventsTracker({ onMapClick }: { onMapClick: () => void }) {
  const map = useMap();
  useEffect(() => {
    map.on("click", () => {
      onMapClick();
    });
    return () => {
      map.off("click");
    };
  }, [map, onMapClick]);
  return null;
}

// --- Isolated Mouse Coordinates Display (Prevents full app re-rendering on mouse move) ---
function MapMouseCoordinates() {
  const map = useMap();
  const [coords, setCoords] = useState({ lat: SITE_LAT, lng: SITE_LNG });

  useEffect(() => {
    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    };
    map.on("mousemove", handleMouseMove);
    return () => {
      map.off("mousemove", handleMouseMove);
    };
  }, [map]);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[999] px-4 py-1.5 bg-black/80 border border-white/10 rounded-full shadow-lg backdrop-blur-sm text-[10px] text-text-muted font-mono tracking-wider flex items-center gap-3">
      <span className="flex items-center gap-1">
        <span className="text-flow-teal font-sans">LAT:</span> {coords.lat.toFixed(5)}
      </span>
      <span className="text-white/10">|</span>
      <span className="flex items-center gap-1">
        <span className="text-flow-teal font-sans">LON:</span> {coords.lng.toFixed(5)}
      </span>
    </div>
  );
}

// --- Map recenter helper ---
function MapRecenter({ center, zoom }: { center: [number, number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 12, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

export function LeafletRegionalMap({
  setMapMode,
  projectId
}: {
  mapMode?: "2D" | "3D";
  setMapMode: (mode: "2D" | "3D") => void;
  projectId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [boundaryData, setBoundaryData] = useState<Record<string, unknown> | null>(null);
  const [rivers, setRivers] = useState<OSMElement[]>([]);
  const [roads, setRoads] = useState<OSMElement[]>([]);
  const [medical, setMedical] = useState<OSMElement[]>([]);
  const [government, setGovernment] = useState<OSMElement[]>([]);
  const [emergency, setEmergency] = useState<OSMElement[]>([]);

  // Navigation / Search states
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Mouse / details states

  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const fetcher = (url: string) => fetch(url).then(res => res.json());
  const { data: incidents = [], mutate: mutateIncidents } = useSWR(`/api/incidents?projectId=${projectId}`, fetcher);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showEvacRings, setShowEvacRings] = useState(false);
  const [isEmergencyPanelExpanded, setIsEmergencyPanelExpanded] = useState(true);

  // Layers state
  const [layers, setLayers] = useState<Record<string, boolean>>({
    boundary: false,
    rivers: false,
    roads: false,
    power: true,
    weather: true,
    medical: true,
    government: true,
    emergency: true,
  });

  // Fetch all layers in parallel
  useEffect(() => {
    let active = true;

    Promise.all([
      fetch("/api/regional-map/boundary").then((r) => r.json()).catch(() => null),
      fetch("/api/regional-map/rivers").then((r) => r.json()).catch(() => null),
      fetch("/api/regional-map/roads").then((r) => r.json()).catch(() => null),
      fetch("/api/regional-map/medical").then((r) => r.json()).catch(() => null),
      fetch("/api/regional-map/government").then((r) => r.json()).catch(() => null),
      fetch("/api/regional-map/emergency").then((r) => r.json()).catch(() => null),
      fetch("/api/regional-map/power").then((r) => r.json()).catch(() => null),
    ]).then(([boundary, riversData, roadsData, medicalData, govData, emergencyData, powerData]) => {
      if (!active) return;

      const failedLayers: string[] = [];
      if (!boundary || boundary.error) failedLayers.push("Provincial Boundary");
      if (!riversData || riversData.error) failedLayers.push("Rivers");
      if (!roadsData || roadsData.error) failedLayers.push("Roads");
      if (!medicalData || medicalData.error) failedLayers.push("Hospitals & Medical");
      if (!govData || govData.error) failedLayers.push("LGU & Government");
      if (!emergencyData || emergencyData.error) failedLayers.push("Emergency Services");
      if (!powerData || powerData.error) failedLayers.push("Power Grid");

      if (failedLayers.length > 0) {
        toast.error("Some map layers unavailable", {
          description: `Failed to load: ${failedLayers.join(", ")}`,
        });
      }

      setBoundaryData(boundary);
      setRivers(riversData?.elements || []);
      setRoads(roadsData?.elements || []);
      setMedical(medicalData?.elements || []);
      setGovernment(govData?.elements || []);
      setEmergency(emergencyData?.elements || []);
      setLoading(false);
    });

    // Close search dropdown on click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      active = false;
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Calculate distances using turf and find nearest emergency resources
  const fromPoint = useMemo(() => turf.point([SITE_LNG, SITE_LAT]), []);

  const emergencyLists = useMemo(() => {
    // Helper to merge fallback data with fetched OSM data to ensure local features are always present
    const mergeData = (fetched: OSMElement[], fallbacks: OSMElement[]) => {
      const merged = [...fallbacks];
      fetched.forEach((f) => {
        const name = f.tags?.name?.toLowerCase() || "";
        const exists = merged.some((m) => {
          const fallbackName = m.tags?.name?.toLowerCase() || "";
          return (
            fallbackName.includes(name) ||
            name.includes(fallbackName) ||
            (f.lat !== undefined && m.lat !== undefined && Math.abs(f.lat - m.lat) < 0.005 &&
             (f.lon ?? f.lng ?? 0) !== 0 && (m.lon ?? m.lng ?? 0) !== 0 && 
             Math.abs((f.lon ?? f.lng ?? 0) - (m.lon ?? m.lng ?? 0)) < 0.005)
          );
        });
        if (!exists) {
          merged.push(f);
        }
      });
      return merged;
    };

    // 1. Hospitals / clinics
    const resolvedHospitals = mergeData(medical, FALLBACK_HOSPITALS);
    const sortedHospitals = resolvedHospitals
      .map((h) => {
        const dist = turf.distance(fromPoint, turf.point([h.lon ?? h.lng ?? 0, h.lat ?? 0]), { units: "kilometers" });
        return {
          id: h.id,
          name: h.tags?.name || "Unnamed Hospital/Clinic",
          distance: dist,
          lat: h.lat ?? 0,
          lon: h.lon ?? h.lng ?? 0,
          tags: h.tags,
        };
      })
      .sort((a, b) => a.distance - b.distance);

    // 2. Police
    const policeNodes = emergency.filter((p) => p.tags?.amenity === "police");
    const resolvedPolice = mergeData(policeNodes, FALLBACK_POLICE);
    const sortedPolice = resolvedPolice
      .map((p) => {
        const dist = turf.distance(fromPoint, turf.point([p.lon ?? p.lng ?? 0, p.lat ?? 0]), { units: "kilometers" });
        return {
          id: p.id,
          name: p.tags?.name || "Police Station",
          distance: dist,
          lat: p.lat ?? 0,
          lon: p.lon ?? p.lng ?? 0,
          tags: p.tags,
        };
      })
      .sort((a, b) => a.distance - b.distance);

    // 3. Fire Stations
    const fireNodes = emergency.filter((f) => f.tags?.amenity === "fire_station");
    const resolvedFire = mergeData(fireNodes, FALLBACK_FIRE);
    const sortedFire = resolvedFire
      .map((f) => {
        const dist = turf.distance(fromPoint, turf.point([f.lon ?? f.lng ?? 0, f.lat ?? 0]), { units: "kilometers" });
        return {
          id: f.id,
          name: f.tags?.name || "Fire Station",
          distance: dist,
          lat: f.lat ?? 0,
          lon: f.lon ?? f.lng ?? 0,
          tags: f.tags,
        };
      })
      .sort((a, b) => a.distance - b.distance);

    return {
      hospitals: sortedHospitals.slice(0, 5),
      police: sortedPolice.slice(0, 3),
      fire: sortedFire.slice(0, 2),
      allHospitals: resolvedHospitals,
      allPolice: resolvedPolice,
      allFire: resolvedFire,
      counts: {
        hospitals: resolvedHospitals.length,
        police: resolvedPolice.length,
        fire: resolvedFire.length,
      },
    };
  }, [medical, emergency, fromPoint]);

  // Filtered suggestions for autocomplete
  const suggestions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return [];
    
    const results: Array<{ name: string; lat: number; lng: number; type: string; category: string; icon?: React.ReactNode; tags?: Record<string, string> }> = [];

    // 1. Municipalities
    MUNICIPALITIES.forEach((m) => {
      if (m.name.toLowerCase().includes(query)) {
        results.push({ name: m.name, lat: m.lat, lng: m.lng, type: "Municipality", category: "municipality" });
      }
    });

    // 2. Intent-based matching ("Hospitals", "Police", "Fire")
    if (query.includes("hospital") || query.includes("medical") || query.includes("clinic")) {
      emergencyLists.allHospitals.slice(0, 5).forEach((m) => {
        if (m.lat && (m.lon || m.lng)) {
          results.push({ name: m.tags?.name || "Hospital", lat: m.lat, lng: (m.lon ?? m.lng) as number, type: "Hospital", category: "medical", tags: m.tags, icon: <Activity className="h-3 w-3 text-signal-red" /> });
        }
      });
    }
    if (query.includes("police")) {
      emergencyLists.allPolice.slice(0, 5).forEach((m) => {
        if (m.lat && (m.lon || m.lng)) {
          results.push({ name: m.tags?.name || "Police Station", lat: m.lat, lng: (m.lon ?? m.lng) as number, type: "Police Station", category: "police", tags: m.tags, icon: <Shield className="h-3 w-3 text-blue-500" /> });
        }
      });
    }
    if (query.includes("fire")) {
      emergencyLists.allFire.slice(0, 5).forEach((m) => {
        if (m.lat && (m.lon || m.lng)) {
          results.push({ name: m.tags?.name || "Fire Station", lat: m.lat, lng: (m.lon ?? m.lng) as number, type: "Fire Station", category: "fire", tags: m.tags, icon: <Flame className="h-3 w-3 text-orange-500" /> });
        }
      });
    }

    // 3. Exact facility name matching
    emergencyLists.allHospitals.forEach(m => {
      const n = m.tags?.name?.toLowerCase() || "";
      if (n.includes(query) && !results.some(r => r.name.toLowerCase() === n)) {
        results.push({ name: m.tags?.name || "Hospital", lat: m.lat as number, lng: (m.lon ?? m.lng) as number, type: "Hospital", category: "medical", tags: m.tags, icon: <Activity className="h-3 w-3 text-signal-red" /> });
      }
    });
    
    [...emergencyLists.allPolice, ...emergencyLists.allFire].forEach(m => {
      const n = m.tags?.name?.toLowerCase() || "";
      if (n.includes(query) && !results.some(r => r.name.toLowerCase() === n)) {
        const isPolice = m.tags?.amenity === "police";
        const isFire = m.tags?.amenity === "fire_station";
        const type = isPolice ? "Police Station" : isFire ? "Fire Station" : "Emergency Service";
        const icon = isPolice ? <Shield className="h-3 w-3 text-blue-500" /> : <Flame className="h-3 w-3 text-orange-500" />;
        results.push({ name: m.tags?.name || "Service", lat: m.lat as number, lng: (m.lon ?? m.lng) as number, type, category: "emergency", tags: m.tags, icon });
      }
    });

    return results.slice(0, 8); // Max 8 suggestions
  }, [searchQuery, emergencyLists]);

  // Evacuation rings label coordinates (3 o'clock position = East = bearing 90)
  const ringLabels = useMemo(() => {
    const dest5 = turf.destination(fromPoint, 5, 90, { units: "kilometers" });
    const dest15 = turf.destination(fromPoint, 15, 90, { units: "kilometers" });
    const dest30 = turf.destination(fromPoint, 30, 90, { units: "kilometers" });

    return {
      ring5: [dest5.geometry.coordinates[1], dest5.geometry.coordinates[0]] as [number, number],
      ring15: [dest15.geometry.coordinates[1], dest15.geometry.coordinates[0]] as [number, number],
      ring30: [dest30.geometry.coordinates[1], dest30.geometry.coordinates[0]] as [number, number],
    };
  }, [fromPoint]);

  const selectNode = (node: OSMElement, category: string) => {
    const name = node.tags?.name || `Unnamed ${category}`;
    const lat = node.lat ?? 0;
    const lon = node.lon ?? node.lng ?? 0;
    const dist = turf.distance(fromPoint, turf.point([lon, lat]), { units: "kilometers" });
    const addressParts = [
      node.tags?.["addr:street"],
      node.tags?.["addr:barangay"],
      node.tags?.["addr:city"] || node.tags?.["addr:municipality"],
    ].filter(Boolean);

    setSelectedItem({
      name,
      category,
      address: addressParts.join(", ") || node.tags?.["addr:full"] || "Address details not in database",
      distance: `${dist.toFixed(2)} km`,
      phone: node.tags?.phone || node.tags?.["contact:phone"] || "N/A",
      details: node.tags?.amenity ? `Amenity tag: ${node.tags.amenity}` : `Type: LGU Infrastructure`,
    });

    if (lat && lon) {
      setMapCenter([lat, lon]);
      setMapZoom(16);
    }

    setSelectedImage(null);
    const searchQuery = encodeURIComponent(name + " " + (addressParts.join(" ") || ""));
    fetch(`/api/place-image?query=${searchQuery}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.imageUrl) setSelectedImage(data.imageUrl);
      })
      .catch(() => {});
  };

  const toggleLayer = (layer: string) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] w-[calc(100%+3rem)] -m-6 bg-bg-base overflow-hidden items-center justify-center backdrop-blur-md">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-flow-teal border-t-transparent" />
          <span className="text-sm font-medium text-text-muted font-sans">
            Loading Geographic layers from Overpass Server...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-[calc(100%+3rem)] -m-6 bg-bg-base overflow-hidden print-map-container">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 pt-6 pb-4 border-b border-white/[0.04] bg-bg-panel/50 relative z-[1000] print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-flow-teal" />
            <h1 className="font-display text-xl font-bold tracking-tight text-text-primary">
              Isabela Regional Infrastructure Map
            </h1>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Geographic reference &mdash; Tumauini HEPP site context
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* SEARCH BOX */}
          <div ref={searchContainerRef} className="relative w-64">
            <div className="relative">
              <input
                type="text"
                placeholder="Search municipality..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full h-9 pl-9 pr-8 text-xs bg-black/60 border border-white/10 rounded-xl text-text-primary focus:outline-none focus:border-flow-teal transition-colors font-sans"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 hover:text-text-primary text-text-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-10 left-0 w-full z-[1000] border border-white/10 bg-black/95 rounded-xl shadow-2xl p-1 max-h-48 overflow-y-auto backdrop-blur-md">
                {suggestions.map((m, idx) => (
                  <button
                    key={`${m.name}-${idx}`}
                    onClick={() => {
                      setMapCenter([m.lat, m.lng]);
                      setMapZoom(m.type === "Municipality" ? 12 : 16);
                      setSearchQuery(m.name);
                      setShowSuggestions(false);
                      
                      if (m.type !== "Municipality") {
                        // Trigger info panel & image fetch for searched facilities
                        const mockNode: OSMElement = {
                          id: `search-${m.name}`,
                          lat: m.lat,
                          lng: m.lng,
                          tags: m.tags || { name: m.name }
                        };
                        selectNode(mockNode, m.type);
                      } else {
                        toast.success(`Panning map to ${m.name}`);
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-white/5 rounded-lg transition-colors flex flex-col font-sans"
                  >
                    <div className="flex items-center gap-2">
                      {m.icon || <MapPin className="h-3 w-3" />}
                      <span className="font-bold text-text-primary">{m.name}</span>
                    </div>
                    {m.type !== "Municipality" && (
                      <span className="text-[10px] opacity-70 ml-5 text-flow-teal">{m.type}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* EVACUATION RINGS TOGGLE BUTTON */}
          <button
            onClick={() => setShowEvacRings(!showEvacRings)}
            className={cn(
              "flex items-center gap-1.5 px-3 h-9 rounded-xl border text-xs font-medium transition-all duration-300 font-sans",
              showEvacRings
                ? "bg-signal-red/10 border-signal-red/30 text-signal-red shadow-[0_0_8px_rgba(239,68,68,0.2)]"
                : "bg-black/40 border-white/10 text-text-muted hover:text-text-primary hover:border-white/20"
            )}
          >
            {showEvacRings ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            Evacuation Rings
          </button>

          {/* MAP EXPORT HINT BUTTON */}
          <div className="relative group">
            <button 
              onClick={() => window.print()}
              className="flex items-center justify-center h-9 w-9 bg-black/40 border border-white/10 hover:border-white/20 text-text-muted hover:text-text-primary rounded-xl transition-all"
            >
              <Camera className="h-4 w-4" />
            </button>
            <div className="absolute right-0 top-11 scale-95 opacity-0 pointer-events-none group-hover:scale-100 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-[1000] w-64 p-3 bg-black/95 border border-white/10 rounded-xl shadow-2xl text-[10px] text-text-muted backdrop-blur-md font-sans">
              <p className="font-bold text-text-primary mb-1">Export Map Reference</p>
              Use your browser&apos;s print function <kbd className="bg-white/10 px-1 rounded">Ctrl+P</kbd> to save this map as PDF for offline use during site emergencies.
            </div>
          </div>

          {/* MAP MODE TOGGLE */}
          <button
            onClick={() => setMapMode("3D")}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-white/10 bg-black/40 text-text-muted hover:text-text-primary hover:border-white/20 transition-all text-xs font-medium font-sans"
          >
            <Layers className="h-4 w-4" />
            Switch to 3D Map
          </button>
        </div>
      </div>

      {/* MAP VIEW CONTAINER */}
      <div className="relative w-full flex-1 overflow-hidden bg-[#1E293B] z-0">
        {/* MAP COMPONENT */}
        <MapContainer
          bounds={VIEW_BOUNDS}
          scrollWheelZoom={true}
          className="w-full h-full"
          style={{ background: "#1E293B" }}
          attributionControl={false}
          preferCanvas={true}
          zoomControl={false}
        >
          {/* Controls */}
          <ZoomControl position="bottomright" />
          
          {/* Active Incident Dispatch Lines */}
          {(Array.isArray(incidents) ? incidents : []).filter((i: any) => i.status === "ACTIVE" && i.dispatchFacilityLat && i.dispatchFacilityLng).map((inc: any) => (
            <Fragment key={inc.id}>
              <Polyline
                positions={[[SITE_LAT, SITE_LNG], [inc.dispatchFacilityLat, inc.dispatchFacilityLng]]}
                pathOptions={{ color: "#EF4444", weight: 3, dashArray: "10, 10" }}
              />
              <Marker position={[inc.dispatchFacilityLat, inc.dispatchFacilityLng]} icon={L.divIcon({ className: "bg-transparent", html: `<div class="h-6 w-6 rounded-full bg-red-500/20 animate-ping border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div>`, iconSize: [24, 24], iconAnchor: [12, 12] })} />
            </Fragment>
          ))}
          {/* Helper components for events and recentering */}
          <MapEventsTracker onMapClick={() => setSelectedItem(null)} />
          <MapMouseCoordinates />
          <MapRecenter center={mapCenter} zoom={mapZoom} />
          {/* Premium High-Resolution Satellite Base Layer */}
          <TileLayer
            attribution="&copy; Google Maps"
            url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
            maxNativeZoom={21}
            maxZoom={24}
          />
          {/* Transparent Country & City Labels Overlay */}
          <TileLayer
            attribution="&copy; CARTO"
            url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
          />



          <ScaleControl position="bottomright" imperial={false} />

          {/* LAYER 1: Primary Site Marker (HEPP) */}
          <Marker position={[SITE_LAT, SITE_LNG]} icon={createSiteIcon()}>
            <Circle
              center={[SITE_LAT, SITE_LNG]}
              radius={10000} // 10km buffer
              pathOptions={{
                color: "#1FB6A6",
                dashArray: "5 5",
                fillColor: "#1FB6A6",
                fillOpacity: 0.05,
                weight: 1.5,
              }}
            />
          </Marker>

          {/* LAYER 2: Provincial Boundary */}
          {layers.boundary && boundaryData && (
            <GeoJSON
              data={boundaryData as unknown as import("geojson").GeoJsonObject}
              pathOptions={{
                color: "#E2E8F0",
                weight: 2,
                opacity: 0.3,
                dashArray: "10 10",
                fillOpacity: 0, // Removed fill to prevent Leaflet viewport clipping artifacts during panning
              }}
            />
          )}

          {/* LAYER 3: Rivers and Watershed */}
          {layers.rivers &&
            rivers.map((way: OSMElement) => {
              if (!way.geometry) return null;
              const positions = way.geometry.map((pt) => [pt.lat, pt.lon] as [number, number]);
              const name = way.tags?.name || "";
              const lowerName = name.toLowerCase();
              const isMajor = lowerName.includes("cagayan") || lowerName.includes("pinacanauan") || lowerName.includes("magat") || lowerName.includes("ilagan") || lowerName.includes("siffu");
              const isStream = way.tags?.waterway === "stream";

              const eventHandlers = {
                click: (e: L.LeafletMouseEvent) => {
                  L.DomEvent.stopPropagation(e);
                  const midIdx = Math.floor((way.geometry?.length || 0) / 2);
                  const midPt = way.geometry?.[midIdx];
                  if (!midPt) return;
                  const dist = turf.distance(fromPoint, turf.point([midPt.lon, midPt.lat]), { units: "kilometers" });
                  setSelectedItem({
                    name: name || "Unnamed River Segment",
                    category: isMajor ? "Major River System" : "Waterway / Stream",
                    address: "Isabela Province Watershed Area",
                    distance: `${dist.toFixed(2)} km`,
                    details: `Osm ID: ${way.id}
Major River: ${isMajor ? "YES" : "NO"}`,
                  });
                },
              };

              return (
                <Fragment key={way.id}>
                  {/* Outer Water Glow / Depth (Realistic river styling) */}
                  <Polyline
                    positions={positions}
                    pathOptions={{
                      color: "#0369A1", // Deep water base
                      weight: isMajor ? 8 : (isStream ? 3 : 5),
                      opacity: 0.3,
                      lineCap: "round",
                      lineJoin: "round"
                    }}
                    eventHandlers={eventHandlers}
                  />
                  {/* Inner Surface Water */}
                  <Polyline
                    positions={positions}
                    pathOptions={{
                      color: isMajor ? "#38BDF8" : (isStream ? "#0EA5E9" : "#0284C7"), // Vibrant surface water
                      weight: isMajor ? 3 : (isStream ? 1 : 2),
                      opacity: 0.9,
                      lineCap: "round",
                      lineJoin: "round"
                    }}
                    interactive={false} // Only need the outer line to catch clicks
                  />
                </Fragment>
              );
            })}

          {/* LAYER 3 Special: Permanent labels for Major Rivers */}
          {layers.rivers &&
            (() => {
              const labeledPoints: { name: string; pt: { lat: number; lon: number } }[] = [];
              
              return rivers
                .filter((way: OSMElement) => {
                  const n = (way.tags?.name || "").toLowerCase();
                  if (!(n.includes("cagayan") || n.includes("pinacanauan") || n.includes("magat") || n.includes("ilagan") || n.includes("siffu"))) return false;
                  if ((way.geometry?.length || 0) < 10) return false; // Must be at least 10 points long
                  
                  const midIdx = Math.floor((way.geometry?.length || 0) / 2);
                  const pt = way.geometry?.[midIdx];
                  if (!pt) return false;

                  // Check if we already have a label for this river within 15km
                  const isTooClose = labeledPoints.some(
                    (l) => l.name === n && turf.distance(turf.point([l.pt.lon, l.pt.lat]), turf.point([pt.lon, pt.lat]), { units: "kilometers" }) < 15
                  );
                  if (isTooClose) return false;

                  labeledPoints.push({ name: n, pt });
                  return true;
                })
                .map((way: OSMElement, idx: number) => {
                  const midIdx = Math.floor((way.geometry?.length || 0) / 2);
                  const pt = way.geometry?.[midIdx];
                  if (!pt) return null;
                  const rName = way.tags?.name || "River";
                  return (
                    <Marker
                      key={`river-lbl-${way.id}-${idx}`}
                      position={[pt.lat, pt.lon]}
                      icon={createLabelIcon(rName)}
                      interactive={false}
                    />
                  );
                });
            })()}

          {/* LAYER 4: Roads & Access */}
          {layers.roads &&
            roads.map((way: OSMElement) => {
              if (!way.geometry) return null;
              
              const highway = way.tags?.highway || "unclassified";
              const isMain = ["primary", "trunk", "motorway"].includes(highway);
              const isSecondary = highway === "secondary";
              
              // Hide completely minor/residential roads to reduce extreme map clutter
              if (!isMain && !isSecondary) return null;

              const positions = way.geometry.map((pt) => [pt.lat, pt.lon] as [number, number]);

              return (
                <Polyline
                  key={way.id}
                  positions={positions}
                  pathOptions={{
                    color: isMain ? "#94A3B8" : "#475569", // Pale slate/steel for major roads, darker slate for secondary
                    weight: isMain ? 2.5 : 1.2,
                    opacity: isMain ? 0.8 : 0.4,
                  }}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e);
                      const midIdx = Math.floor((way.geometry?.length || 0) / 2);
                      const midPt = way.geometry?.[midIdx];
                      if (!midPt) return;
                      const dist = turf.distance(fromPoint, turf.point([midPt.lon, midPt.lat]), { units: "kilometers" });
                      setSelectedItem({
                        name: way.tags?.name || "Unnamed Highway Segment",
                        category: "Roads & Access",
                        address: `Highway Class: ${highway.toUpperCase()}`,
                        distance: `${dist.toFixed(2)} km`,
                        details: `Osm ID: ${way.id} | Access route within operations region.`,
                      });
                    },
                  }}
                />
              );
            })}

          {/* LAYER 5: Power Transmission (Substations & Lines) */}
          {layers.power && (
            <>
              {/* Actual NGCP Power Lines - Disabled due to extremely poor quality and inaccurate OpenStreetMap volunteer data */}
              {/* The map now relies entirely on the precise, topographically-aware hardcoded backbone below. */}
              
              {/* Hardcoded NGCP Northern Luzon Backbone (Tuguegarao -> Cauayan) */}
              <Polyline
                positions={[
                  [17.6133, 121.7269],  // Tuguegarao Substation
                  [17.5800, 121.7400],  // Routing east of river near Penablanca
                  [17.5400, 121.7500],  // Following highway corridor (Iguig)
                  [17.4800, 121.7550],  // Amulung Highway segment
                  [17.4194, 121.7733],  // Cabagan
                  [17.3500, 121.7900],  // San Pablo
                  [17.2736, 121.8078],  // Tumauini (HEPP Injection Tap)
                  [17.2200, 121.8300],  // Routing southeast along highway
                  [17.1500, 121.8750],  // Ilagan Substation
                  [17.0200, 121.8300],  // Naguilian corridor
                  [16.9200, 121.7700],  // Cauayan Substation
                ]}
                pathOptions={{ color: "#E8A33D", dashArray: "5 8", weight: 2.5, opacity: 0.9 }}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    setSelectedItem({
                      name: "NGCP Northern Luzon Backbone",
                      category: "Power Transmission",
                      address: "Tuguegarao - Tumauini - Ilagan - Cauayan",
                      distance: "Regional Grid",
                      details: "The primary high-voltage transmission artery of the Northern Luzon Grid. The Tumauini HEPP injects power into this line to supply Tuguegarao and southern municipalities.",
                    });
                  },
                }}
              />

              {/* Plant to closest grid hub (Tumauini Center Tap) */}
              <Polyline
                positions={[
                  [SITE_LAT, SITE_LNG], // Tumauini HEPP Site (Start)
                  [17.3200, 121.9500],  // Following Pinacanauan River gorge
                  [17.3000, 121.8900],  // Exiting mountain terrain
                  [17.2800, 121.8300],  // Entering plains
                  [17.2736, 121.8078],  // Tumauini Grid Tap (Injection into NGCP Backbone)
                ]}
                pathOptions={{ color: "#FDE047", weight: 3.5, opacity: 1 }} // Bright solid yellow
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    setSelectedItem({
                      name: "Future 69kV HEPP Transmission Line",
                      category: "Power Transmission",
                      address: "Tumauini HEPP to Tumauini NGCP Tap",
                      distance: `${turf.distance(fromPoint, turf.point([121.8078, 17.2736]), { units: "kilometers" }).toFixed(2)} km line length`,
                      details: "Projected 69kV transmission route connecting the Tumauini Hydroelectric Power Plant directly into the main Northern Luzon Grid backbone to supply power north to Tuguegarao and south to Ilagan.",
                    });
                  },
                }}
              />

              {/* Substations pins */}
              {NGCP_SUBSTATIONS.map((sub) => (
                <Marker
                  key={sub.name}
                  position={[sub.lat, sub.lng]}
                  icon={createSubstationIcon()}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e);
                      const dist = turf.distance(fromPoint, turf.point([sub.lng, sub.lat]), { units: "kilometers" });
                      setSelectedItem({
                        name: sub.name,
                        category: "NGCP Grid Infrastructure",
                        address: `Voltage Level: ${sub.voltage}`,
                        distance: `${dist.toFixed(2)} km`,
                        details: "NGCP ΓÇö National Grid Corporation of the Philippines. Critical transmission node in operations area.",
                      });
                    },
                  }}
                />
              ))}
            </>
          )}

          {/* LAYER 6: PAGASA Weather Stations */}
          {layers.weather &&
            PAGASA_STATIONS.map((st) => (
              <Marker
                key={st.name}
                position={[st.lat, st.lng]}
                icon={createPagasaIcon()}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    const dist = turf.distance(fromPoint, turf.point([st.lng, st.lat]), { units: "kilometers" });
                    setSelectedItem({
                      name: st.name,
                      category: "PAGASA Weather Station",
                      address: st.type,
                      distance: `${dist.toFixed(2)} km`,
                      details: "Philippine Atmospheric, Geophysical and Astronomical Services Administration. Meteorological monitoring hub. Real-time bulletins at bagong.pagasa.dost.gov.ph",
                    });
                  },
                }}
              />
            ))}

          {/* Municipalities Layer */}
          {MUNICIPALITIES.map((m) => (
            <Marker
              key={`muni-${m.name}`}
              position={[m.lat, m.lng]}
              icon={createMunicipalityIcon(m.name)}
              interactive={true}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  const dist = turf.distance(fromPoint, turf.point([m.lng, m.lat]), { units: "kilometers" });
                  setSelectedItem({
                    name: `${m.name} Center`,
                    category: "Municipality Center",
                    address: "Isabela Province, Region II, Philippines",
                    distance: `${dist.toFixed(2)} km`,
                    details: `Coordinate center for the municipality of ${m.name}. Located in the Cagayan Valley region.`,
                  });
                  setMapCenter([m.lat, m.lng]);
                  setMapZoom(12);
                },
              }}
            />
          ))}

          {/* LAYER 7: Hospitals & Medical */}
          {layers.medical &&
            emergencyLists.hospitals.map((node) => (
              <Marker
                key={node.id}
                position={[node.lat ?? 0, (node.lon ?? 0)]}
                icon={createHospitalIcon()}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    selectNode(node, "Medical Facility");
                  },
                }}
              />
            ))}

          {/* LAYER 8: LGU Offices & Government */}
          {layers.government &&
            (() => {
              // Find the top 5 nearest LGU government centers to reduce map clutter
              const nearestLGU = [...government]
                .map((node) => {
                  const dist = turf.distance(fromPoint, turf.point([node.lon ?? node.lng ?? 0, node.lat ?? 0]), { units: "kilometers" });
                  return { node, dist };
                })
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 5)
                .map(item => item.node);

              return nearestLGU.map((node: OSMElement) => (
                <Marker
                  key={node.id}
                  position={[node.lat ?? 0, node.lon ?? 0]}
                  icon={createGovernmentIcon()}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e);
                      selectNode(node, "LGU Government Center");
                    },
                  }}
                />
              ));
            })()}

          {/* LAYER 9: Emergency Services */}
          {layers.emergency &&
            [...emergencyLists.police, ...emergencyLists.fire].map((node) => {
              const isPolice = node.tags?.amenity === "police";
              const isFire = node.tags?.amenity === "fire_station";
              const icon = isPolice ? createPoliceIcon() : isFire ? createFireIcon() : createAmbulanceIcon();
              const categoryName = isPolice ? "Law Enforcement (Police)" : isFire ? "Fire & Rescue Station" : "Emergency Ambulance";

              return (
                <Marker
                  key={node.id}
                  position={[node.lat ?? 0, node.lon ?? 0]}
                  icon={icon}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e);
                      selectNode(node, categoryName);
                    },
                  }}
                />
              );
            })}

          {/* SITE EVACUATION RINGS */}
          {showEvacRings && (
            <>
              {/* 5km Ring */}
              <Circle
                center={[SITE_LAT, SITE_LNG]}
                radius={5000}
                pathOptions={{
                  color: "#EF4444",
                  dashArray: "3 6",
                  fillColor: "#EF4444",
                  fillOpacity: 0.15,
                  weight: 1.5,
                }}
              />
              <Marker position={ringLabels.ring5} icon={createLabelIcon("5km - Immediate Evacuation Zone")} interactive={false} />

              {/* 15km Ring */}
              <Circle
                center={[SITE_LAT, SITE_LNG]}
                radius={15000}
                pathOptions={{
                  color: "#F59E0B",
                  dashArray: "3 6",
                  fillColor: "#F59E0B",
                  fillOpacity: 0.08,
                  weight: 1.5,
                }}
              />
              <Marker position={ringLabels.ring15} icon={createLabelIcon("15km - Extended Response Zone")} interactive={false} />

              {/* 30km Ring */}
              <Circle
                center={[SITE_LAT, SITE_LNG]}
                radius={30000}
                pathOptions={{
                  color: "#1FB6A6",
                  dashArray: "3 6",
                  fillColor: "#1FB6A6",
                  fillOpacity: 0.05,
                  weight: 1.5,
                }}
              />
              <Marker position={ringLabels.ring30} icon={createLabelIcon("30km - Regional Coordination Zone")} interactive={false} />
            </>
          )}
        </MapContainer>

        {/* FLOATING PANEL: NEAREST EMERGENCY SERVICES */}
        {layers.emergency && (
          <div
            className={cn(
              "absolute top-4 left-4 z-[999] w-80 border border-white/10 bg-black/85 backdrop-blur-md rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden font-sans print:hidden",
              !isEmergencyPanelExpanded && "h-11"
            )}
          >
            <div
              className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.04] transition-colors"
              onClick={() => setIsEmergencyPanelExpanded(!isEmergencyPanelExpanded)}
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-signal-red animate-pulse" />
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Nearest Emergency Services
                </span>
              </div>
              <button className="text-text-muted hover:text-text-primary transition-colors text-[10px] font-mono">
                {isEmergencyPanelExpanded ? "COLLAPSE" : "EXPAND"}
              </button>
            </div>

            {isEmergencyPanelExpanded && (
              <div className="p-4 space-y-4 max-h-[min(320px,calc(100vh-480px))] overflow-y-auto custom-scrollbar">
                {/* Hospitals Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#E8A33D] uppercase tracking-wider">
                    <Activity className="h-3 w-3" /> Hospitals (Medical)
                  </div>
                  {emergencyLists.hospitals.length === 0 ? (
                    <p className="text-[10px] text-text-muted italic">No hospitals detected</p>
                  ) : (
                    emergencyLists.hospitals.map((h) => (
                      <div
                        key={h.id}
                        onClick={() => selectNode(h, "Medical Facility")}
                        className="flex items-start gap-2.5 p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.02] hover:border-white/10 cursor-pointer transition-all duration-200"
                      >
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-white text-signal-red mt-0.5 shrink-0">
                          <span className="font-bold text-xs">+</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text-primary truncate">{h.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-muted font-mono">
                            <span>{h.distance.toFixed(1)} km from site</span>
                            <span className="text-flow-teal bg-flow-teal/10 px-1.5 py-0.2 rounded font-sans scale-90">HOSPITAL</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Police Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#85B9D0] uppercase tracking-wider">
                    <Shield className="h-3 w-3" /> Police Stations
                  </div>
                  {emergencyLists.police.length === 0 ? (
                    <p className="text-[10px] text-text-muted italic">No police stations detected</p>
                  ) : (
                    emergencyLists.police.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => selectNode(p, "Law Enforcement (Police)")}
                        className="flex items-start gap-2.5 p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.02] hover:border-white/10 cursor-pointer transition-all duration-200"
                      >
                        <Shield className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text-primary truncate">{p.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-muted font-mono">
                            <span>{p.distance.toFixed(1)} km from site</span>
                            <span className="text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded font-sans scale-90">POLICE</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Fire Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#E57373] uppercase tracking-wider">
                    <Flame className="h-3 w-3" /> Fire Station
                  </div>
                  {emergencyLists.fire.length === 0 ? (
                    <p className="text-[10px] text-text-muted italic">No fire stations detected</p>
                  ) : (
                    emergencyLists.fire.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => selectNode(f, "Fire & Rescue Station")}
                        className="flex items-start gap-2.5 p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.02] hover:border-white/10 cursor-pointer transition-all duration-200"
                      >
                        <Flame className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text-primary truncate">{f.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-muted font-mono">
                            <span>{f.distance.toFixed(1)} km from site</span>
                            <span className="text-red-400 bg-red-500/10 px-1.5 py-0.2 rounded font-sans scale-90">FIRE</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FLOATING PANEL: MINI INFO PANEL (BOTTOM LEFT) */}
        <div className="absolute bottom-6 left-6 z-[999] w-80 border border-white/10 bg-black/90 backdrop-blur-md rounded-2xl shadow-2xl p-4 font-sans text-xs print:hidden">
          {selectedItem ? (
            <div className="space-y-3 relative animate-in fade-in slide-in-from-bottom-2 duration-200">
              {selectedImage && (
                <div className="relative w-full h-32 rounded-lg overflow-hidden mb-2 border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedImage} alt={selectedItem.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                </div>
              )}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-0 right-0 text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="space-y-1">
                <span className="rounded bg-flow-teal/10 border border-flow-teal/20 text-flow-teal px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                  {selectedItem.category}
                </span>
                <h4 className="font-bold text-text-primary text-sm pt-1.5 leading-snug">
                  {selectedItem.name}
                </h4>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-white/5 font-mono text-[10px] text-text-muted">
                {selectedItem.address && (
                  <p>
                    <span className="text-text-muted/60 font-sans">Loc:</span> {selectedItem.address}
                  </p>
                )}
                <p>
                  <span className="text-text-muted/60 font-sans">Dist:</span>{" "}
                  <span className="text-flow-teal font-bold">{selectedItem.distance}</span> from Tumauini site
                </p>
                {selectedItem.phone && selectedItem.phone !== "N/A" && (
                  <p className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-flow-teal shrink-0" />
                    <span>{selectedItem.phone}</span>
                  </p>
                )}
              </div>

              {selectedItem.details && (
                <p className="text-[10px] text-text-muted italic leading-relaxed pt-1 font-sans">
                  {selectedItem.details}
                </p>
              )}
              
              {(selectedItem.category.includes("Hospital") || selectedItem.category.includes("Police") || selectedItem.category.includes("Fire") || selectedItem.category.includes("Medical") || selectedItem.category.includes("Law Enforcement")) && (
                <button
                  onClick={() => setShowDispatchModal(true)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600/20 text-red-500 border border-red-500/20 px-4 py-2 text-xs font-semibold hover:bg-red-600 hover:text-white hover:border-red-600 transition-all"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Dispatch Incident
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 text-center text-text-muted">
              <MapPin className="h-6 w-6 text-text-muted/40 mb-1.5 animate-bounce" />
              <p className="font-medium text-xs">Click any marker or line to view details</p>
              <p className="text-[10px] text-text-muted/60 mt-0.5">Boundary, Rivers, Roads, Substation layers selectable</p>
            </div>
          )}
        </div>

        {/* FLOATING PANEL: LAYER TOGGLE CONTROLS (TOP RIGHT) */}
        <div className="absolute top-4 right-4 z-[999] max-w-sm border border-white/10 bg-black/85 backdrop-blur-md rounded-2xl shadow-2xl p-4 font-sans print:hidden">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/[0.04]">
            <Layers className="h-4 w-4 text-flow-teal" />
            <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Regional Layers
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {/* Site Location (Always On) */}
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-flow-teal/10 border border-flow-teal/20 text-flow-teal font-bold shrink-0">
              <MapPin className="h-3.5 w-3.5" />
              <span>HEPP Site (Static)</span>
            </div>

            {/* Boundary */}
            <button
              onClick={() => toggleLayer("boundary")}
              className={cn(
                "flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all",
                layers.boundary
                  ? "bg-white/5 border-white/15 text-text-primary"
                  : "bg-transparent border-white/5 text-text-muted hover:border-white/10"
              )}
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span>Boundary ({boundaryData ? "OK" : "NO"})</span>
            </button>

            {/* Rivers */}
            <button
              onClick={() => toggleLayer("rivers")}
              className={cn(
                "flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all",
                layers.rivers
                  ? "bg-white/5 border-white/15 text-text-primary"
                  : "bg-transparent border-white/5 text-text-muted hover:border-white/10"
              )}
            >
              <Waves className="h-3.5 w-3.5 text-blue-400" />
              <span>Rivers ({rivers.length})</span>
            </button>

            {/* Roads */}
            <button
              onClick={() => toggleLayer("roads")}
              className={cn(
                "flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all",
                layers.roads
                  ? "bg-white/5 border-white/15 text-text-primary"
                  : "bg-transparent border-white/5 text-text-muted hover:border-white/10"
              )}
            >
              <Navigation className="h-3.5 w-3.5 text-[#8A7A4A]" />
              <span>Roads ({roads.filter(w => ["primary", "trunk", "motorway", "secondary"].includes(w.tags?.highway || "")).length})</span>
            </button>

            {/* Power */}
            <button
              onClick={() => toggleLayer("power")}
              className={cn(
                "flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all",
                layers.power
                  ? "bg-white/5 border-white/15 text-text-primary"
                  : "bg-transparent border-white/5 text-text-muted hover:border-white/10"
              )}
            >
              <Zap className="h-3.5 w-3.5 text-signal-amber" />
              <span>NGCP Power Grid</span>
            </button>

            {/* Weather */}
            <button
              onClick={() => toggleLayer("weather")}
              className={cn(
                "flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all",
                layers.weather
                  ? "bg-white/5 border-white/15 text-text-primary"
                  : "bg-transparent border-white/5 text-text-muted hover:border-white/10"
              )}
            >
              <CloudSun className="h-3.5 w-3.5 text-[#6A9ABA]" />
              <span>PAGASA Stations</span>
            </button>

            {/* Medical */}
            <button
              onClick={() => toggleLayer("medical")}
              className={cn(
                "flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all",
                layers.medical
                  ? "bg-white/5 border-white/15 text-text-primary"
                  : "bg-transparent border-white/5 text-text-muted hover:border-white/10"
              )}
            >
              <Activity className="h-3.5 w-3.5 text-signal-red" />
              <span>Hospitals ({emergencyLists.allHospitals.length})</span>
            </button>

            {/* Government */}
            <button
              onClick={() => toggleLayer("government")}
              className={cn(
                "flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all",
                layers.government
                  ? "bg-white/5 border-white/15 text-text-primary"
                  : "bg-transparent border-white/5 text-text-muted hover:border-white/10"
              )}
            >
              <Landmark className="h-3.5 w-3.5 text-[#8A9ABA]" />
              <span>Government ({government.length})</span>
            </button>

            {/* Emergency */}
            <button
              onClick={() => toggleLayer("emergency")}
              className={cn(
                "flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all",
                layers.emergency
                  ? "bg-white/5 border-white/15 text-text-primary"
                  : "bg-transparent border-white/5 text-text-muted hover:border-white/10"
              )}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-signal-red" />
              <span>Emergency ({emergencyLists.allPolice.length + emergencyLists.allFire.length})</span>
            </button>
          </div>
        </div>

        {/* DISPATCH MODAL */}
        {showDispatchModal && selectedItem && (
          <IncidentDispatchModal 
            projectId={projectId}
            facilityName={selectedItem.name || ""}
            facilityLat={selectedItem.lat || 0}
            facilityLng={selectedItem.lon ?? selectedItem.lng ?? 0}
            facilityOsmId={selectedItem.id?.toString()}
            onClose={() => setShowDispatchModal(false)}
            onDispatched={() => {
              mutateIncidents();
              setShowDispatchModal(false);
            }}
          />
        )}
      </div>

    </div>
  );
}
