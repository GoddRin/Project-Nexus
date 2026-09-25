"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Globe } from "lucide-react";

const ScicNationalMapClient = dynamic(
  () => import("./ScicNationalMapClient"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center rounded-2xl border border-white/10 bg-[#08121E] shadow-2xl">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Globe className="h-8 w-8 animate-spin" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-flow-teal opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-flow-teal" />
            </span>
          </div>
          <div>
            <h3 className="text-base font-bold font-display text-white">
              Initializing Philippine Geospatial Matrix
            </h3>
            <p className="mt-1 text-xs font-mono text-slate-400 max-w-sm">
              Connecting to GIS tile layers, rendering radar beacons, and calibrating geodetic project coordinates...
            </p>
          </div>
        </div>
      </div>
    ),
  }
);

export function ProjectsMapWrapper() {
  return <ScicNationalMapClient />;
}
