import React from "react";
import { Metadata } from "next";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { ProjectsMapWrapper } from "./ProjectsMapWrapper";

export const metadata: Metadata = {
  title: "SCIC National Project Atlas | Project Nexus",
  description:
    "High-resolution interactive GIS map of Sta. Clara International Corporation projects across the Philippines, featuring radar beacons, real-time metrics, and site intelligence.",
};

export default function ProjectsMapPage() {
  return (
    <div className="-mx-2 sm:-mx-3.5 md:-mx-4">
      {/* Executive Geographic Intelligence Platform */}
      <ProjectsMapWrapper />
    </div>
  );
}
