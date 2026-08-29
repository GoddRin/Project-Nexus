"use client";

import React from "react";
import Image from "next/image";
import { FILIPINO_PERSONNEL_REGISTRY, FilipinoPersonnel } from "./personnelData";
import { MapPin, Navigation, FileText, X, Briefcase, Clock } from "lucide-react";

interface PersonnelInfoCardProps {
  personnelId: string | null;
  onClose: () => void;
  onLocate: (id: string) => void;
  onOpenDossier: (id: string) => void;
}

export function PersonnelInfoCard({
  personnelId,
  onClose,
  onLocate,
  onOpenDossier,
}: PersonnelInfoCardProps) {
  if (!personnelId) return null;
  const person: FilipinoPersonnel | undefined = FILIPINO_PERSONNEL_REGISTRY[personnelId];
  if (!person) return null;

  const getDeptBadgeStyle = (dept: FilipinoPersonnel["department"]) => {
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
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-200 pointer-events-auto">
      <div className="relative bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden text-slate-100 p-5 space-y-4 ring-1 ring-cyan-500/20">
        {/* Subtle glowing accent top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-400 to-blue-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-7 h-7 flex items-center justify-center rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700 transition"
          title="Dismiss Personnel Card"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Header: Photo + Name + Position */}
        <div className="flex items-start gap-3.5 pr-6">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-cyan-500/40 shadow-lg shrink-0 bg-slate-950">
            <Image
              src={person.avatarUrl}
              alt={person.name}
              fill
              unoptimized
              className="object-cover"
            />
            <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getDeptBadgeStyle(
                  person.department
                )}`}
              >
                {person.department.replace("_", " ")}
              </span>
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                ● Active On-Duty
              </span>
            </div>

            <h3 className="text-base font-extrabold text-white tracking-tight truncate">
              {person.name}
            </h3>

            <div className="text-xs font-semibold text-cyan-300 leading-snug">
              {person.role}
            </div>
          </div>
        </div>

        {/* Short Role Description Box */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/90 flex items-center gap-1.5">
            <Briefcase className="w-3 h-3 text-cyan-400" />
            <span>Role in Company & Operations</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            {person.roleDescription}
          </p>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-950/40 border border-slate-800/60 p-2.5 rounded-lg space-y-0.5">
            <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-cyan-400" />
              <span>Assigned Location</span>
            </div>
            <div className="text-[11px] text-slate-200 font-medium truncate" title={person.locationName}>
              {person.locationName}
            </div>
          </div>

          <div className="bg-slate-950/40 border border-slate-800/60 p-2.5 rounded-lg space-y-0.5">
            <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Shift & Experience</span>
            </div>
            <div className="text-[11px] text-slate-200 font-medium truncate">
              {person.yearsOfExp} Yrs Exp · Day Shift
            </div>
          </div>
        </div>

        {/* Current Live Task Banner */}
        <div className="bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-lg flex items-start gap-2">
          <span className="text-emerald-400 text-xs mt-0.5">⚡</span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Current Live Site Task
            </div>
            <div className="text-[11px] text-emerald-200/90 font-medium leading-snug">
              {person.currentTask}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={() => onLocate(person.id)}
            className="px-3 py-2 rounded-xl bg-cyan-600/30 hover:bg-cyan-500/40 border border-cyan-400/50 hover:border-cyan-300 text-cyan-200 hover:text-white font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
          >
            <Navigation className="w-3.5 h-3.5 text-cyan-300" />
            <span>Fly in 3D</span>
          </button>

          <button
            onClick={() => onOpenDossier(person.id)}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
          >
            <FileText className="w-3.5 h-3.5 text-slate-300" />
            <span>Full Dossier</span>
          </button>
        </div>
      </div>
    </div>
  );
}
