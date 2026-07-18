"use client";

import { useState } from "react";
import { LeafletRegionalMap } from "./LeafletRegionalMap";
import { MapboxRegionalMap } from "./MapboxRegionalMap";

export default function RegionalMapClient({ projectId }: { projectId: string }) {
  const [mapMode, setMapMode] = useState<"2D" | "3D">("2D");

  return (
    <>
      {mapMode === "2D" ? (
        <LeafletRegionalMap setMapMode={setMapMode} projectId={projectId} />
      ) : (
        <MapboxRegionalMap setMapMode={setMapMode} projectId={projectId} />
      )}
    </>
  );
}
