"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/refs */
import useSWR from "swr";
import { IncidentDispatchModal } from "./IncidentDispatchModal";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";

import Map, { MapRef, Source, Layer, Marker, NavigationControl, ScaleControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import * as turf from "@turf/turf";
import { toast } from "sonner";
import { Map as MapIcon, Camera, Layers, X, Search, Eye, EyeOff, ShieldAlert, Activity, Shield, Flame, Phone, MapPin, Waves, Navigation, Zap, CloudSun, Landmark, AlertTriangle } from "lucide-react";
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

const MUNICIPALITIES = [
  { name: "Tumauini", lat: 17.2736, lng: 121.8078 },
  { name: "Ilagan", lat: 17.1481, lng: 121.8903 },
  { name: "Cauayan", lat: 16.9297, lng: 121.7756 },
  { name: "Tuguegarao (Cagayan)", lat: 17.6133, lng: 121.7269 },
  { name: "Cabagan", lat: 17.4333, lng: 121.7667 },
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
  { id: "h1", lat: 17.28646, lon: 121.80575, tags: { name: "Tumauini Community Hospital", amenity: "hospital", "addr:street": "National Highway", "addr:city": "Tumauini" } },
  { id: "h2", lat: 17.13200, lon: 121.86889, tags: { name: "Gov. Faustino N. Dy, Sr. Memorial Hospital", amenity: "hospital", "addr:street": "Calamagui 2nd", "addr:city": "Ilagan City", phone: "+63-78-323-2009" } },
  { id: "h3", lat: 17.1426, lon: 121.8889, tags: { name: "Isabela Doctors General Hospital", amenity: "hospital", "addr:street": "National Highway", "addr:city": "Ilagan City", phone: "+63-78-624-0012" } },
  { id: "h4", lat: 16.91869, lon: 121.76858, tags: { name: "Cauayan District Hospital", amenity: "hospital", "addr:street": "Bucag", "addr:city": "Cauayan City" } }
];

const FALLBACK_POLICE: OSMElement[] = [
  { id: "p1", lat: 17.27487, lon: 121.80784, tags: { name: "Tumauini Police Station", amenity: "police", "addr:city": "Tumauini", phone: "117 / 911" } },
  { id: "p2", lat: 17.1275, lon: 121.8681, tags: { name: "Ilagan City Police Station", amenity: "police", "addr:city": "Ilagan City", phone: "+63-917-862-2345" } }
];

const FALLBACK_FIRE: OSMElement[] = [
  { id: "f1", lat: 17.2760, lon: 121.8055, tags: { name: "Tumauini Fire Station", amenity: "fire_station", "addr:city": "Tumauini", phone: "+63-78-323-0118" } },
  { id: "f2", lat: 17.1432, lon: 121.8873, tags: { name: "Ilagan Fire Station", amenity: "fire_station", "addr:city": "Ilagan City" } }
];

// --- Custom Pins using native React components (Mapbox GL JS) ---
export const SitePin = () => (
  <div className="relative flex items-center justify-center -translate-y-4">
    <div className="absolute w-8 h-8 rounded-full bg-flow-teal/20 animate-ping"></div>
    <div className="absolute w-5 h-5 rounded-full bg-flow-teal/40 animate-pulse"></div>
    <div className="w-3.5 h-3.5 rounded-full bg-[#1FB6A6] border-2 border-white shadow-md relative z-10"></div>
  </div>
);

export const SubstationPin = () => (
  <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-black/60 border border-signal-amber text-signal-amber shadow-lg relative -translate-y-3 -translate-x-3 pointer-events-auto cursor-pointer">
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  </div>
);

export const PagasaPin = () => (
  <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-black/60 border border-[#6A9ABA] text-[#6A9ABA] shadow-lg relative -translate-y-3 -translate-x-3 pointer-events-auto cursor-pointer">
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42-1.89-1.78-3.5-4-3.5a5.5 5.5 0 0 0-5.38 4.38A4 4 0 0 0 3 15.5 3.5 3.5 0 0 0 6.5 19z"></path>
    </svg>
  </div>
);

export const HospitalPin = () => (
  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white border border-signal-red text-signal-red shadow-lg relative -translate-y-3 -translate-x-3 pointer-events-auto cursor-pointer">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"></path>
    </svg>
  </div>
);

export const GovernmentPin = () => (
  <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-black/60 border border-[#8A9ABA] text-[#8A9ABA] shadow-lg relative -translate-y-3 -translate-x-3 pointer-events-auto cursor-pointer hover:bg-black/80 transition-all">
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v7M12 14v7M16 14v7"></path>
    </svg>
  </div>
);

export const PolicePin = () => (
  <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-black/60 border border-blue-500 text-blue-500 shadow-lg relative -translate-y-3 -translate-x-3 pointer-events-auto cursor-pointer">
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  </div>
);

export const FirePin = () => (
  <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-black/60 border border-red-500 text-red-500 shadow-lg relative -translate-y-3 -translate-x-3 pointer-events-auto cursor-pointer">
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
    </svg>
  </div>
);

export const LabelPin = ({ text }: { text: string }) => (
  <div className="bg-transparent border-none p-0 whitespace-nowrap relative -translate-x-1/2 -translate-y-1">
    <div className="text-[10px] font-bold text-white tracking-wide" style={{ textShadow: "0px 2px 4px rgba(0,0,0,0.9), 0px 0px 2px rgba(0,0,0,0.9), 0px 0px 8px rgba(0,0,0,0.8)" }}>{text}</div>
  </div>
);

export const MunicipalityPin = ({ name }: { name: string }) => (
  <div className="bg-transparent border-none p-0 whitespace-nowrap relative pointer-events-none -translate-x-1 -translate-y-2">
    <div className="flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full bg-white border border-black shadow-sm"></div>
      <span className="text-[9px] font-bold text-white drop-shadow-[0_1px_2.5px_rgba(0,0,0,0.95)]">{name}</span>
    </div>
  </div>
);


export function MapboxRegionalMap({
  setMapMode,
  projectId
}: {
  
  setMapMode: (mode: "2D" | "3D") => void;
  projectId: string;
}) {
  const mapRef = useRef<MapRef>(null);
  const [loading, setLoading] = useState(true);
  const [boundaryData, setBoundaryData] = useState<Record<string, unknown> | null>(null);
  const [rivers, setRivers] = useState<OSMElement[]>([]);
  const [roads, setRoads] = useState<OSMElement[]>([]);
  const [medical, setMedical] = useState<OSMElement[]>([]);
  const [government, setGovernment] = useState<OSMElement[]>([]);
  const [emergency, setEmergency] = useState<OSMElement[]>([]);
  const [powerLines, setPowerLines] = useState<OSMElement[]>([]);

  // Navigation / Search states
  const flyToMap = useCallback((lat: number, lng: number, zoom: number) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: zoom,
        pitch: 60,
        bearing: 30,
        duration: 2000
      });
    }
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Mouse / details states
  const latRef = useRef<HTMLSpanElement>(null);
  const lngRef = useRef<HTMLSpanElement>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const fetcher = (url: string) => fetch(url).then(res => res.json());
  const { data: incidents = [], mutate: mutateIncidents } = useSWR(`/api/incidents?projectId=${projectId}`, fetcher);
  const [selectedImage] = useState<string | null>(null);
  const [isEmergencyPanelExpanded, setIsEmergencyPanelExpanded] = useState(true);
  const [showEvacRings, setShowEvacRings] = useState(false);

  // Layers state
  const [layers, setLayers] = useState<Record<string, boolean>>({
    boundary: true,
    rivers: true,
    roads: true,
    power: true,
    weather: true,
    medical: true,
    government: true,
    emergency: true,
  });

  const toggleLayer = (layer: string) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

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
      setPowerLines(powerData?.elements || []);
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

  // Original suggestions logic has been moved and upgraded.
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
          
          // Clean common suffix terms to match e.g. "Tumauini MPS" with "Tumauini Police Station"
          const cleanName = (n: string) => n.replace(/station|hospital|police|fire|community|municipal|city|pnp|bfp|mps/g, "").trim();
          const fClean = cleanName(name);
          const mClean = cleanName(fallbackName);
          
          const nameMatch = 
            (fClean && mClean && (fClean.includes(mClean) || mClean.includes(fClean))) ||
            fallbackName.includes(name) ||
            name.includes(fallbackName);

          // Check if they are in the same local town area (within ~2.5km)
          const distanceMatch = 
            f.lat !== undefined && m.lat !== undefined && 
            Math.abs(f.lat - m.lat) < 0.025 &&
            (f.lon ?? f.lng ?? 0) !== 0 && (m.lon ?? m.lng ?? 0) !== 0 && 
            Math.abs((f.lon ?? f.lng ?? 0) - (m.lon ?? m.lng ?? 0)) < 0.025;

          return nameMatch || distanceMatch;
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
      hospitals: sortedHospitals.slice(0, 3),
      police: sortedPolice.slice(0, 2),
      fire: sortedFire.slice(0, 1),
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

  // Evacuation rings label coordinates (3 o'clock position = East = bearing 90)

  const selectNode = useCallback((node: OSMElement, category: string) => {
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
      flyToMap(lat, lon, 16); // Noticeable zoom-in for specific facilities
    }
  }, [fromPoint, flyToMap]);


  // Global Filtered suggestions for autocomplete
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    
    // Map everything into a standardized searchable array
    const allItems: any[] = [];
    // 0. Project Site (Santa Clara)
    allItems.push({
      id: `site-scic`,
      name: "Tumauini HEPP Project Site",
      category: "Project Headquarters",
      lat: SITE_LAT, lng: SITE_LNG, distance: 0,
      searchStr: `sta. clara scic santa clara tumauini hepp project site headquarters`,
      onClick: () => {
        flyToMap(SITE_LAT, SITE_LNG, 16);
        setSelectedItem({
          name: "Tumauini HEPP Site",
          category: "Project Infrastructure",
          address: "Tumauini, Isabela, Region II, Philippines",
          distance: "0.00 km",
          details: "Main project headquarters and staging area for Santa Clara International Corporation (SCIC).",
          lat: SITE_LAT, lng: SITE_LNG,
        });
      }
    });

    // 1. Municipalities
    MUNICIPALITIES.forEach(m => {
      const dist = turf.distance(fromPoint, turf.point([m.lng, m.lat]), { units: "kilometers" });
      allItems.push({
        id: `muni-${m.name}`,
        name: m.name,
        category: "Municipality",
        lat: m.lat, lng: m.lng, distance: dist,
        searchStr: `${m.name.toLowerCase()} municipality town city`,
        onClick: () => {
          flyToMap(m.lat, m.lng, 14);
          setSelectedItem({
            name: `${m.name} Center`,
            category: "Municipality Center",
            address: "Isabela Province, Region II, Philippines",
            distance: `${dist.toFixed(2)} km`,
            details: `Coordinate center for the municipality of ${m.name}. Located in the Cagayan Valley region.`,
            lat: m.lat, lng: m.lng,
          });
        }
      });
    });

    // 2. Hospitals
    emergencyLists.allHospitals.forEach((h: OSMElement) => {
      const lat = h.lat ?? 0;
      const lng = h.lon ?? h.lng ?? 0;
      if (!lat || !lng) return;
      const dist = turf.distance(fromPoint, turf.point([lng, lat]), { units: "kilometers" });
      allItems.push({
        id: `hosp-${h.id}`,
        name: h.tags?.name || "Hospital",
        category: "Hospital",
        lat, lng, distance: dist,
        searchStr: `${(h.tags?.name || "").toLowerCase()} hospital medical clinic health cvmc`,
        onClick: () => selectNode(h, "Medical Facility")
      });
    });

    // 3. Police
    emergencyLists.allPolice.forEach((p: OSMElement) => {
      const lat = p.lat ?? 0;
      const lng = p.lon ?? p.lng ?? 0;
      if (!lat || !lng) return;
      const dist = turf.distance(fromPoint, turf.point([lng, lat]), { units: "kilometers" });
      allItems.push({
        id: `pol-${p.id}`,
        name: p.tags?.name || "Police Station",
        category: "Police",
        lat, lng, distance: dist,
        searchStr: `${(p.tags?.name || "").toLowerCase()} police pnp station security`,
        onClick: () => selectNode(p, "Police Station")
      });
    });
    
    // 4. Fire
    emergencyLists.allFire.forEach((f: OSMElement) => {
      const lat = f.lat ?? 0;
      const lng = f.lon ?? f.lng ?? 0;
      if (!lat || !lng) return;
      const dist = turf.distance(fromPoint, turf.point([lng, lat]), { units: "kilometers" });
      allItems.push({
        id: `fire-${f.id}`,
        name: f.tags?.name || "Fire Station",
        category: "Fire",
        lat, lng, distance: dist,
        searchStr: `${(f.tags?.name || "").toLowerCase()} fire station bfp rescue`,
        onClick: () => selectNode(f, "Fire & Rescue Station")
      });
    });

    // 5. Government
    government.forEach((g: OSMElement) => {
      const lat = g.lat ?? 0;
      const lng = g.lon ?? g.lng ?? 0;
      if (!lat || !lng) return;
      const dist = turf.distance(fromPoint, turf.point([lng, lat]), { units: "kilometers" });
      allItems.push({
        id: `gov-${g.id}`,
        name: g.tags?.name || "Government Facility",
        category: "Government",
        lat, lng, distance: dist,
        searchStr: `${(g.tags?.name || "").toLowerCase()} government lgu hall capitol`,
        onClick: () => selectNode(g, "Government Facility")
      });
    });

    // 6. NGCP Substations
    NGCP_SUBSTATIONS.forEach(s => {
      const dist = turf.distance(fromPoint, turf.point([s.lng, s.lat]), { units: "kilometers" });
      allItems.push({
        id: `sub-${s.name}`,
        name: s.name,
        category: "Power Substation",
        lat: s.lat, lng: s.lng, distance: dist,
        searchStr: `${s.name.toLowerCase()} substation power ngcp grid`,
        onClick: () => {
          flyToMap(s.lat, s.lng, 15);
          setSelectedItem({
            name: s.name,
            category: "NGCP Grid Infrastructure",
            address: `Voltage Level: ${s.voltage}`,
            distance: `${dist.toFixed(2)} km`,
            details: "NGCP — National Grid Corporation of the Philippines.",
            lat: s.lat, lng: s.lng,
          });
        }
      });
    });

    // Tokenize query to support conversational searches like "nearest hospital near me"
    const stopWords = ["nearest", "near", "me", "closest", "where", "is", "the", "a", "an", "find", "show", "around"];
    const queryTokens = query.split(/\s+/).filter(token => token.length > 0 && !stopWords.includes(token));
    
    if (queryTokens.length === 0) return [];

    // Filter by query tokens (ALL meaningful tokens must match) and sort by distance
    const results = allItems.filter(item => {
      return queryTokens.every(token => item.searchStr.includes(token));
    });
    
    return results.sort((a, b) => a.distance - b.distance).slice(0, 15);
  }, [searchQuery, emergencyLists, government, fromPoint, selectNode, flyToMap]);


  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-[calc(100%+3rem)] -m-6 bg-bg-base overflow-hidden">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 pt-6 pb-4 border-b border-white/[0.04] bg-bg-panel/50 relative z-[1000]">
        <div>
          <div className="flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-flow-teal" />
            <h1 className="font-display text-xl font-bold tracking-tight text-text-primary">
              Isabela Regional Infrastructure Map
            </h1>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Geographic reference — Tumauini HEPP site context
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* SEARCH BOX */}
          <div ref={searchContainerRef} className="relative w-80">
            <div className="relative">
              <input
                type="text"
                placeholder="Search facilities, towns, categories..."
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
              <div className="absolute top-10 left-0 w-full z-[1000] border border-white/10 bg-black/95 rounded-xl shadow-2xl p-1 max-h-64 overflow-y-auto backdrop-blur-md">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.onClick();
                      setShowSuggestions(false);
                      setSearchQuery("");
                      toast.success(`Navigating to ${item.name}`);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 rounded-lg transition-colors flex flex-col gap-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white group-hover:text-flow-teal transition-colors truncate pr-2">{item.name}</span>
                      <span className="text-[9px] text-flow-teal font-mono shrink-0">{item.distance.toFixed(1)} km</span>
                    </div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider font-mono">{item.category}</span>
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
            <button className="flex items-center justify-center h-9 w-9 bg-black/40 border border-white/10 hover:border-white/20 text-text-muted hover:text-text-primary rounded-xl transition-all">
              <Camera className="h-4 w-4" />
            </button>
            <div className="absolute right-0 top-11 scale-95 opacity-0 pointer-events-none group-hover:scale-100 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-[1000] w-64 p-3 bg-black/95 border border-white/10 rounded-xl shadow-2xl text-[10px] text-text-muted backdrop-blur-md font-sans">
              <p className="font-bold text-text-primary mb-1">Export Map Reference</p>
              Use your browser&apos;s print function <kbd className="bg-white/10 px-1 rounded">Ctrl+P</kbd> to save this map as PDF for offline use during site emergencies.
            </div>
          </div>

          {/* MAP MODE TOGGLE */}
          <button
            onClick={() => setMapMode("2D")}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-white/10 bg-black/40 text-text-muted hover:text-text-primary hover:border-white/20 transition-all text-xs font-medium font-sans"
          >
            <Layers className="h-4 w-4" />
            Switch to 2D Map
          </button>
        </div>
      </div>

      {/* Custom styles for map loading background */}
      <style dangerouslySetInnerHTML={{ __html: `
        .map-loading-background {
          background-color: #263321;
          background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}} />

      {/* MAP VIEW CONTAINER */}
      <div className="relative w-full flex-1 overflow-hidden bg-[#1a1a1a]">
        {loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-black/80 backdrop-blur-md shadow-2xl">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-flow-teal border-t-transparent" />
            <span className="text-xs font-medium text-text-muted font-sans">
              Loading Geographic layers from Overpass Server...
            </span>
          </div>
        )}
        
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ""}
          initialViewState={{
            longitude: 121.9749251,
            latitude: 17.318823,
            zoom: 10,
            pitch: 60,
            bearing: 30
          }}
          mapStyle="mapbox://styles/mapbox/satellite-v9"
          terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
          style={{ width: "100%", height: "100%" }}
          onMouseMove={(e: any) => {
            if (latRef.current && lngRef.current) {
              latRef.current.innerText = e.lngLat.lat.toFixed(5);
              lngRef.current.innerText = e.lngLat.lng.toFixed(5);
            }
          }}
          onClick={(e: any) => {
            const features = e.features;
            if (!features || features.length === 0) {
              setSelectedItem(null);
            }
          }}
        >
          <NavigationControl position="bottom-right" />
          <ScaleControl position="bottom-right" />

          {/* Active Incident Dispatch Lines */}
          {(Array.isArray(incidents) ? incidents : []).filter((i: any) => i.status === "ACTIVE" && i.dispatchFacilityLat && i.dispatchFacilityLng).map((inc: any, i: number) => (
             <Source
                key={`inc-line-${inc.id}`}
                type="geojson"
                data={{
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates: [[121.9749251, 17.318823], [inc.dispatchFacilityLng, inc.dispatchFacilityLat]]
                  }
                } as any}
              >
                <Layer
                  id={`inc-line-layer-${inc.id}`}
                  type="line"
                  paint={{
                    "line-color": "#EF4444",
                    "line-width": 3,
                    "line-dasharray": [2, 2]
                  }}
                />
              </Source>
          ))}
          {/* Project Site */}
          <Marker longitude={121.9749251} latitude={17.318823} anchor="center">
            <SitePin />
          </Marker>
          <Marker longitude={121.9749251} latitude={17.318823} anchor="top" offset={[0, 10]}>
            <LabelPin text="TUMAUINI HEPP SITE" />
          </Marker>

          {/* 3D Terrain & Sky */}
          <Source
            id="mapbox-dem"
            type="raster-dem"
            url="mapbox://mapbox.mapbox-terrain-dem-v1"
            tileSize={512}
            maxzoom={14}
          />
          <Layer
            id="sky"
            type="sky"
            paint={{
              "sky-type": "atmosphere",
              "sky-atmosphere-sun": [0.0, 0.0],
              "sky-atmosphere-sun-intensity": 15
            }}
          />

          {/* Premium High-Resolution Google Satellite Layer */}
          <Source
            id="google-imagery"
            type="raster"
            tiles={['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}']}
            tileSize={256}
            maxzoom={22}
          />
          <Layer
            id="google-imagery-layer"
            type="raster"
            source="google-imagery"
          />

          {/* Transparent CARTO City/Country Labels */}
          <Source
            id="carto-labels"
            type="raster"
            tiles={['https://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png']}
            tileSize={256}
          />
          <Layer
            id="carto-labels-layer"
            type="raster"
            source="carto-labels"
          />

          {/* Boundaries */}
          {layers.boundary && boundaryData && !boundaryData.error && boundaryData.elements && (
            <Source type="geojson" data={boundaryData as any}>
              <Layer
                id="boundary-fill"
                type="fill"
                paint={{
                  "fill-color": "#4A5568",
                  "fill-opacity": 0.05
                }}
              />
              <Layer
                id="boundary-line"
                type="line"
                paint={{
                  "line-color": "#4A5568",
                  "line-width": 2,
                  "line-dasharray": [5, 5]
                }}
              />
            </Source>
          )}

          {/* Rivers */}
          {layers.rivers && rivers.length > 0 && (
            <Source
              type="geojson"
              data={{
                type: "FeatureCollection",
                features: rivers.map(r => ({
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates: r.geometry?.map(g => [g.lon, g.lat]) || []
                  },
                  properties: r
                }))
              } as any}
            >
              <Layer
                id="rivers-line"
                type="line"
                paint={{
                  "line-color": "#1FB6A6",
                  "line-width": 3,
                  "line-opacity": 0.6
                }}
              />
            </Source>
          )}

          {/* Roads */}
          {layers.roads && roads.length > 0 && (
            <Source
              type="geojson"
              data={{
                type: "FeatureCollection",
                features: roads.map(r => ({
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates: r.geometry?.map(g => [g.lon, g.lat]) || []
                  },
                  properties: r
                }))
              } as any}
            >
              <Layer
                id="roads-line"
                type="line"
                paint={{
                  "line-color": "#eab308",
                  "line-width": 2,
                  "line-opacity": 0.4
                }}
              />
            </Source>
          )}

          {/* Power Grid */}
          {layers.power && powerLines.length > 0 && (
            <Source
              type="geojson"
              data={{
                type: "FeatureCollection",
                features: powerLines.map(r => ({
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates: r.geometry?.map(g => [g.lon, g.lat]) || []
                  },
                  properties: r
                }))
              } as any}
            >
              <Layer
                id="power-line"
                type="line"
                paint={{
                  "line-color": "#f59e0b",
                  "line-width": 1.5,
                  "line-dasharray": [4, 4],
                  "line-opacity": 0.8
                }}
              />
            </Source>
          )}

          {/* Substations */}
          {layers.power && NGCP_SUBSTATIONS.map((s, i) => (
            <Marker key={`sub-${i}`} longitude={s.lng} latitude={s.lat} anchor="center">
              <div onClick={(e) => {
                e.stopPropagation();
                setSelectedItem({
                  name: s.name,
                  category: "Power Substation",
                  address: "NGCP Grid",
                  distance: turf.distance(turf.point([121.9749251, 17.318823]), turf.point([s.lng, s.lat]), { units: "kilometers" }).toFixed(2) + " km",
                  details: `Voltage: ${s.voltage}`
                });
                flyToMap(s.lat, s.lng, 16);
              }}>
                <SubstationPin />
              </div>
            </Marker>
          ))}

          {/* Medical */}
          {layers.medical && emergencyLists.hospitals.map((m, i) => (
            <Marker key={`med-${i}`} longitude={m.lon || 0} latitude={m.lat || 0} anchor="center">
              <div onClick={(e) => {
                e.stopPropagation();
                selectNode(m as any, "Hospital / Clinic");
              }}>
                <HospitalPin />
              </div>
            </Marker>
          ))}

          {/* Police */}
          {layers.emergency && emergencyLists.police.map((m, i) => (
            <Marker key={`pol-${i}`} longitude={m.lon || 0} latitude={m.lat || 0} anchor="center">
              <div onClick={(e) => {
                e.stopPropagation();
                selectNode(m as any, "Police Station");
              }}>
                <PolicePin />
              </div>
            </Marker>
          ))}

          {/* Fire */}
          {layers.emergency && emergencyLists.fire.map((m, i) => (
            <Marker key={`fire-${i}`} longitude={m.lon || 0} latitude={m.lat || 0} anchor="center">
              <div onClick={(e) => {
                e.stopPropagation();
                selectNode(m as any, "Fire Station");
              }}>
                <FirePin />
              </div>
            </Marker>
          ))}

          {/* Government (Unclustered) */}
          {layers.government && government.slice(0, 5).map((m, i) => (
            <Marker key={`gov-${i}`} longitude={m.lon || m.lng || 0} latitude={m.lat || 0} anchor="center">
              <div onClick={(e) => {
                e.stopPropagation();
                selectNode(m, "LGU / Government");
              }}>
                <GovernmentPin />
              </div>
            </Marker>
          ))}

          {/* Weather / PAGASA */}
          {layers.weather && PAGASA_STATIONS.map((s, i) => (
            <Marker key={`pagasa-${i}`} longitude={s.lng} latitude={s.lat} anchor="center">
              <div onClick={(e) => {
                e.stopPropagation();
                setSelectedItem({
                  name: s.name,
                  category: "Weather Station",
                  address: "PAGASA",
                  distance: turf.distance(turf.point([121.9749251, 17.318823]), turf.point([s.lng, s.lat]), { units: "kilometers" }).toFixed(2) + " km",
                  details: `Type: ${s.type}`
                });
                flyToMap(s.lat, s.lng, 16);
              }}>
                <PagasaPin />
              </div>
            </Marker>
          ))}
          
          {/* Municipalities */}
          {MUNICIPALITIES.map((m, i) => (
            <Marker key={`muni-${i}`} longitude={m.lng} latitude={m.lat} anchor="center">
              <MunicipalityPin name={m.name} />
            </Marker>
          ))}

        </Map>

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
