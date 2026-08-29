"use client";

import React, { useState } from "react";
import Image from "next/image";
import { FILIPINO_PERSONNEL_REGISTRY, FilipinoPersonnel } from "./personnelData";
import { MapPin, Navigation, Crosshair, Sparkles, Briefcase } from "lucide-react";

interface PersonnelProfileModalProps {
  selectedPersonnelId?: string | null;
  onClose: () => void;
  onSelectPersonnel?: (id: string) => void;
  onLocatePersonnel?: (id: string) => void;
}

export function PersonnelProfileModal({
  selectedPersonnelId,
  onClose,
  onSelectPersonnel,
  onLocatePersonnel,
}: PersonnelProfileModalProps) {
  const allPersonnel = Object.values(FILIPINO_PERSONNEL_REGISTRY);
  const [activeId, setActiveId] = useState<string>(
    selectedPersonnelId && FILIPINO_PERSONNEL_REGISTRY[selectedPersonnelId]
      ? selectedPersonnelId
      : allPersonnel[0]?.id || "PM_ROMEO_SESE"
  );

  const currentPerson: FilipinoPersonnel =
    FILIPINO_PERSONNEL_REGISTRY[activeId] || allPersonnel[0];

  const handleLocate = (idToLocate: string = currentPerson.id) => {
    if (onLocatePersonnel) {
      onLocatePersonnel(idToLocate);
    }
  };

  const getDeptColor = (dept: FilipinoPersonnel["department"]) => {
    switch (dept) {
      case "MANAGEMENT":
        return "bg-teal-500/20 text-teal-300 border-teal-500/40";
      case "ELECTRICAL":
        return "bg-sky-500/20 text-sky-300 border-sky-500/40";
      case "CIVIL":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "SAFETY":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "CAMP_SERVICES":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "LOGISTICS":
        return "bg-orange-500/20 text-orange-300 border-orange-500/40";
      case "QA_QC":
        return "bg-indigo-500/20 text-indigo-300 border-indigo-500/40";
      case "ENGINEERING":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
      case "ADMIN_HR":
        return "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40";
      case "MEDICAL":
        return "bg-red-500/20 text-red-300 border-red-500/40";
      case "IT_SYSTEMS":
        return "bg-blue-500/20 text-blue-300 border-blue-500/40";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/40";
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col md:flex-row max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700 transition"
          title="Close Modal"
        >
          ✕
        </button>

        {/* Left Side: Workforce Roster Selector */}
        <div className="w-full md:w-72 bg-slate-950/80 border-r border-slate-800/80 p-4 flex flex-col overflow-y-auto">
          <div className="pb-3 border-b border-slate-800 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Site Workforce Roster</span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                {allPersonnel.length} Active
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Filipino Engineers, Foremen & Staff
            </p>
          </div>

          <div className="space-y-1.5 flex-1 pr-1">
            {allPersonnel.map((p) => {
              const isSelected = p.id === currentPerson.id;
              return (
                <div
                  key={p.id}
                  className={`group relative w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition ${
                    isSelected
                      ? "bg-sky-950/70 border border-sky-500/50 shadow-sm"
                      : "hover:bg-slate-800/50 border border-transparent"
                  }`}
                >
                  <button
                    onClick={() => {
                      setActiveId(p.id);
                      if (onSelectPersonnel) onSelectPersonnel(p.id);
                    }}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                  >
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-700 shrink-0 bg-slate-900">
                      <Image
                        src={p.avatarUrl}
                        alt={p.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate text-slate-200 group-hover:text-white">
                        {p.nickname}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {p.role}
                      </div>
                    </div>
                  </button>

                  {/* Direct Fly-to Button on Roster Row */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveId(p.id);
                      handleLocate(p.id);
                    }}
                    className="opacity-60 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-600 hover:text-white text-slate-400 border border-slate-700 hover:border-cyan-400 transition shrink-0"
                    title={`Fly to ${p.nickname} on 3D site`}
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Selected Personnel In-Depth Career & Profile Dossier */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col">
          {/* Header with Photo and Core Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-5 border-b border-slate-800">
            {/* Clickable Profile Photo with hover badge */}
            <div
              onClick={() => handleLocate()}
              className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-sky-500/40 hover:border-cyan-400 shadow-xl shrink-0 group cursor-pointer transition-all transform hover:scale-[1.02] bg-slate-900"
              title="Click to fly to this personnel in 3D Site Twin"
            >
              <Image
                src={currentPerson.avatarUrl}
                alt={currentPerson.name}
                fill
                unoptimized
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/20 transition-colors flex items-center justify-center">
                <Crosshair className="w-8 h-8 text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md animate-pulse" />
              </div>
              <div className="absolute bottom-1.5 left-1.5 right-1.5 text-center">
                <span className="text-[9px] font-mono uppercase bg-black/70 text-slate-300 px-1.5 py-0.5 rounded border border-slate-600/40 backdrop-blur-sm group-hover:border-cyan-400 group-hover:text-cyan-200">
                  Active On-Duty
                </span>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getDeptColor(
                    currentPerson.department
                  )}`}
                >
                  {currentPerson.department.replace("_", " ")}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                  ● Verified Personnel
                </span>
              </div>

              <h2 className="text-xl font-extrabold text-white tracking-tight">
                {currentPerson.name}
              </h2>
              <div className="text-sm font-medium text-sky-400">
                {currentPerson.role}
              </div>
              <div className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-3 pt-0.5">
                <span>📍 {currentPerson.originProvince}</span>
                <span>⏱️ {currentPerson.yearsOfExp} Yrs Experience</span>
              </div>

              {/* Short Description for Role in Company */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 text-left">
                <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 mb-1">
                  <Briefcase className="w-3 h-3 text-cyan-400" />
                  <span>Company Role & Operational Responsibilities</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentPerson.roleDescription}
                </p>
              </div>

              {/* 🎯 Primary Direct Action CTA: Fly to Personnel in 3D */}
              <div className="pt-1 flex justify-center sm:justify-start">
                <button
                  onClick={() => handleLocate()}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600/30 via-teal-600/30 to-blue-600/30 hover:from-cyan-500/40 hover:via-teal-500/40 hover:to-blue-500/40 border border-cyan-400/60 hover:border-cyan-300 text-cyan-200 hover:text-white font-mono text-xs font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-cyan-950/60 transition-all transform hover:scale-[1.02] active:scale-[0.98] group"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
                  </span>
                  <Navigation className="w-3.5 h-3.5 text-cyan-300 group-hover:rotate-12 transition-transform" />
                  <span>FLY TO CHARACTER IN 3D SITE</span>
                  <span className="text-[11px] text-cyan-300/80 group-hover:translate-x-1 transition-transform">
                    ➔
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 flex-1">
            <div className="bg-slate-950/50 border border-slate-800/80 p-3.5 rounded-xl space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Official License & Safety Accreditation
              </div>
              <div className="text-xs font-mono text-amber-300 font-semibold">
                {currentPerson.licenseNumber}
              </div>
            </div>

            <div className="bg-slate-950/50 border border-slate-800/80 p-3.5 rounded-xl space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Designated Shift & Schedule
              </div>
              <div className="text-xs text-slate-200">
                {currentPerson.shift}
              </div>
            </div>

            <div className="bg-slate-950/50 border border-slate-800/80 p-3.5 rounded-xl space-y-1 sm:col-span-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Current Live Site Mission & Task
              </div>
              <div className="text-xs text-emerald-300 font-medium">
                ⚡ {currentPerson.currentTask}
              </div>
            </div>


            {/* Interactive Assigned Workstation / Facility Location Card */}
            <div
              onClick={() => handleLocate()}
              className="bg-slate-950/60 border border-slate-800/90 hover:border-cyan-500/50 hover:bg-slate-900/80 p-3.5 rounded-xl space-y-1.5 sm:col-span-2 cursor-pointer transition-all group relative overflow-hidden"
              title="Click to fly directly to this workstation in 3D"
            >
              <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Assigned Workstation / Facility Location</span>
                </div>
                <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1 opacity-80 group-hover:opacity-100">
                  <span>Fly to location</span>
                  <span className="group-hover:translate-x-1 transition-transform">➔</span>
                </span>
              </div>
              <div className="text-xs text-slate-300 flex items-center gap-2">
                <span className="font-medium text-slate-100 group-hover:text-cyan-200 transition-colors">
                  {currentPerson.locationName}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Tumauini Hydro Electric Power Plant Project (HEPP)</span>
            <span className="text-slate-400 font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>SCIC Digital Twin Telemetry</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
