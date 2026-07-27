"use client";

import React, { useState, Component, ReactNode } from "react";
import { LeafletRegionalMap } from "./LeafletRegionalMap";
import { MapboxRegionalMap } from "./MapboxRegionalMap";
import { AlertTriangle, Map, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  onFallback2D: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class MapErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("3D Map rendering error caught by Error Boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="relative flex h-screen w-full flex-col items-center justify-center bg-[#0B1418] p-6 text-center">
          <div className="w-full max-w-lg rounded-2xl border border-amber-500/20 bg-black/60 p-6 backdrop-blur-xl shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h2 className="font-display text-lg font-bold text-white">
              3D Map Initialization Notice
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              The 3D Mapbox engine encountered a setup requirement (such as a missing API token). You can seamlessly switch to the high-performance 2D GIS map or retry 3D mode.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => this.props.onFallback2D()}
                className="flex items-center gap-2 rounded-xl bg-flow-teal px-4 py-2 text-xs font-semibold text-black transition-all hover:bg-flow-teal/90 shadow-md"
              >
                <Map className="h-4 w-4" />
                Switch to 2D GIS Map
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                }}
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4" />
                Retry 3D Map
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function RegionalMapClient({ projectId }: { projectId: string }) {
  const [mapMode, setMapMode] = useState<"2D" | "3D">("2D");

  return (
    <>
      {mapMode === "2D" ? (
        <LeafletRegionalMap setMapMode={setMapMode} projectId={projectId} />
      ) : (
        <MapErrorBoundary onFallback2D={() => setMapMode("2D")}>
          <MapboxRegionalMap setMapMode={setMapMode} projectId={projectId} />
        </MapErrorBoundary>
      )}
    </>
  );
}
