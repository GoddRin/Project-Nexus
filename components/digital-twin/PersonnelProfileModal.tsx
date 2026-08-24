"use client";

import React, { useState } from "react";
import Image from "next/image";
import { FILIPINO_PERSONNEL_REGISTRY, FilipinoPersonnel } from "./personnelData";

interface PersonnelProfileModalProps {
  selectedPersonnelId?: string | null;
  onClose: () => void;
  onSelectPersonnel?: (id: string) => void;
}

export function PersonnelProfileModal({
  selectedPersonnelId,
  onClose,
  onSelectPersonnel,
}: PersonnelProfileModalProps) {
  const allPersonnel = Object.values(FILIPINO_PERSONNEL_REGISTRY);
  const [activeId, setActiveId] = useState<string>(
    selectedPersonnelId && FILIPINO_PERSONNEL_REGISTRY[selectedPersonnelId]
      ? selectedPersonnelId
      : allPersonnel[0]?.id || "PM_DANILO_ROXAS"
  );

  const currentPerson: FilipinoPersonnel =
    FILIPINO_PERSONNEL_REGISTRY[activeId] || allPersonnel[0];

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
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/40";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col md:flex-row max-h-[90vh]">
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Site Workforce Roster
            </h3>
            <p className="text-[11px] text-slate-500">
              Filipino Engineers, Foremen & Staff
            </p>
          </div>

          <div className="space-y-1.5 flex-1">
            {allPersonnel.map((p) => {
              const isSelected = p.id === currentPerson.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveId(p.id);
                    if (onSelectPersonnel) onSelectPersonnel(p.id);
                  }}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition ${
                    isSelected
                      ? "bg-sky-950/70 border border-sky-500/50 shadow-sm"
                      : "hover:bg-slate-800/50 border border-transparent"
                  }`}
                >
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-700 shrink-0">
                    <Image
                      src={p.avatarUrl}
                      alt={p.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate text-slate-200">
                      {p.nickname}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {p.role}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Selected Personnel In-Depth Career & Profile Dossier */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col">
          {/* Header with Photo and Core Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-5 border-b border-slate-800">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-sky-500/40 shadow-xl shrink-0 group">
              <Image
                src={currentPerson.avatarUrl}
                alt={currentPerson.name}
                fill
                className="object-cover"
                sizes="128px"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-1.5 left-1.5 right-1.5 text-center">
                <span className="text-[9px] font-mono uppercase bg-black/60 text-slate-300 px-1.5 py-0.5 rounded border border-slate-600/40 backdrop-blur-sm">
                  Active On-Duty
                </span>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getDeptColor(
                    currentPerson.department
                  )}`}
                >
                  {currentPerson.department.replace("_", " ")}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                  ● Verified Filipino Personnel
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

            <div className="bg-slate-950/50 border border-slate-800/80 p-3.5 rounded-xl space-y-1 sm:col-span-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Assigned Workstation / Facility Location
              </div>
              <div className="text-xs text-slate-300">
                📌 {currentPerson.locationName}
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Tumauini Hydro Electric Power Plant Project (HEPP)</span>
            <span className="text-slate-400 font-mono">SCIC Digital Twin</span>
          </div>
        </div>
      </div>
    </div>
  );
}
