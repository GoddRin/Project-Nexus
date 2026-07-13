"use client";

import dynamic from "next/dynamic";

const RegionalMapClient = dynamic(
  () => import("./RegionalMapClient"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[700px] w-full items-center justify-center rounded-2xl border border-border-hairline bg-bg-panel/50 backdrop-blur-md">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-flow-teal border-t-transparent" />
          <span className="text-sm font-medium text-text-muted">Loading regional map...</span>
        </div>
      </div>
    ),
  }
);

export default function RegionalMapPage() {
  return <RegionalMapClient />;
}
